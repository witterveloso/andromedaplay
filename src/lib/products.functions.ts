import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/* ============================================================
 * Public catalog of products for sale (anon-readable)
 * ============================================================ */
function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      "id, slug, title, description, cover_url, logo_url, price_cents, currency, sales_headline, sales_subheadline, sales_hero_url",
    )
    .eq("is_for_sale", true)
    .eq("status", "published")
    .order("title");
  if (error) throw new Error(error.message);
  return { products: data ?? [] };
});

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(255) }).parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: row, error } = await supabase
      .from("courses")
      .select(
        "id, slug, title, description, cover_url, logo_url, price_cents, currency, sales_headline, sales_subheadline, sales_description, sales_hero_url, sales_video_url, sales_bullets, access_duration_days",
      )
      .eq("slug", data.slug)
      .eq("is_for_sale", true)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Produto não encontrado");
    return { product: row };
  });

/* ============================================================
 * Create Mercado Pago checkout preference (guest-friendly)
 * ============================================================ */
export const createCheckoutPreference = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        course_id: z.string().uuid(),
        buyer_email: z.string().email().max(255),
        buyer_name: z.string().min(1).max(255).optional(),
        origin: z.string().url().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) throw new Error("Pagamentos ainda não configurados. Tente novamente em instantes.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: course, error } = await supabaseAdmin
      .from("courses")
      .select("id, title, slug, price_cents, currency, is_for_sale, status")
      .eq("id", data.course_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!course || !course.is_for_sale || course.status !== "published")
      throw new Error("Produto indisponível");
    if (!course.price_cents || course.price_cents < 100)
      throw new Error("Produto sem preço configurado");

    // Try to attach to existing user if email matches an account
    let buyerId: string | null = null;
    try {
      let page = 1;
      const perPage = 1000;
      const target = data.buyer_email.toLowerCase();
      while (true) {
        const { data: pageData, error: lErr } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });
        if (lErr) break;
        const found = pageData.users.find((u) => (u.email ?? "").toLowerCase() === target);
        if (found) {
          buyerId = found.id;
          break;
        }
        if (pageData.users.length < perPage) break;
        page++;
        if (page > 20) break;
      }
    } catch {
      buyerId = null;
    }

    // Create order row first to get an id
    const { data: order, error: insErr } = await supabaseAdmin
      .from("orders")
      .insert({
        course_id: course.id,
        buyer_id: buyerId,
        buyer_email: data.buyer_email,
        buyer_name: data.buyer_name ?? null,
        amount_cents: course.price_cents,
        currency: course.currency ?? "BRL",
        status: "pending",
      })
      .select("id")
      .single();
    if (insErr || !order) throw new Error(insErr?.message ?? "Falha ao criar pedido");

    const origin = data.origin?.replace(/\/$/, "") ?? "";
    const backUrls = {
      success: `${origin}/checkout/sucesso?order=${order.id}`,
      pending: `${origin}/checkout/pendente?order=${order.id}`,
      failure: `${origin}/checkout/falhou?order=${order.id}`,
    };
    const notification_url = `${origin}/api/public/mp-webhook`;

    const prefBody = {
      items: [
        {
          id: course.id,
          title: course.title,
          quantity: 1,
          currency_id: course.currency ?? "BRL",
          unit_price: Number((course.price_cents / 100).toFixed(2)),
        },
      ],
      payer: { email: data.buyer_email, name: data.buyer_name ?? undefined },
      external_reference: order.id,
      back_urls: backUrls,
      auto_return: "approved",
      notification_url,
      metadata: { order_id: order.id, course_id: course.id, buyer_email: data.buyer_email },
    };

    const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(prefBody),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("MP preference create failed", resp.status, txt);
      throw new Error("Falha ao iniciar pagamento. Tente novamente.");
    }

    const pref = (await resp.json()) as {
      id: string;
      init_point?: string;
      sandbox_init_point?: string;
    };

    await supabaseAdmin
      .from("orders")
      .update({ mp_preference_id: pref.id })
      .eq("id", order.id);

    const checkoutUrl = pref.init_point ?? pref.sandbox_init_point;
    if (!checkoutUrl) throw new Error("Mercado Pago não retornou URL de checkout");

    return { order_id: order.id, checkout_url: checkoutUrl };
  });

/* ============================================================
 * Order lookup (used by post-checkout pages)
 * ============================================================ */
export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, status, buyer_email, buyer_id, course:courses(id, title, slug)")
      .eq("id", data.order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Pedido não encontrado");
    return { order };
  });
