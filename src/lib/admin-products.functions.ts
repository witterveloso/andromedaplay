import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso restrito ao administrador");
}

export const listAdminProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("courses")
      .select(
        "id, slug, title, status, is_for_sale, price_cents, currency, sales_headline, sales_subheadline, sales_description, sales_hero_url, sales_bullets, access_duration_days",
      )
      .order("title");
    if (error) throw new Error(error.message);
    return { courses: data ?? [] };
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        course_id: z.string().uuid(),
        is_for_sale: z.boolean().optional(),
        price_cents: z.number().int().min(0).nullable().optional(),
        currency: z.string().min(2).max(10).optional(),
        sales_headline: z.string().max(500).nullable().optional(),
        sales_subheadline: z.string().max(500).nullable().optional(),
        sales_description: z.string().max(10000).nullable().optional(),
        sales_hero_url: z.string().url().nullable().optional().or(z.literal("")),
        sales_video_url: z.string().url().nullable().optional().or(z.literal("")),
        sales_bullets: z.array(z.string().max(500)).max(20).optional(),
        access_duration_days: z.number().int().min(0).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { course_id, ...patch } = data;
    // Normalize empty strings to null for URL fields
    if (patch.sales_hero_url === "") patch.sales_hero_url = null;
    if (patch.sales_video_url === "") patch.sales_video_url = null;
    const { error } = await supabaseAdmin.from("courses").update(patch as any).eq("id", course_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, status, buyer_email, buyer_name, amount_cents, currency, created_at, paid_at, course:courses(title, slug)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { orders: data ?? [] };
  });
