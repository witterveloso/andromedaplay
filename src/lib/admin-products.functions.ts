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
        "id, slug, title, description, status, is_for_sale, price_cents, currency, cover_url, logo_url, accent_color, cover_fit, cover_position, external_checkout_url, sales_headline, sales_subheadline, sales_description, sales_hero_url, sales_bullets, access_duration_days",
      )
      .order("title");
    if (error) throw new Error(error.message);
    return { courses: data ?? [] };
  });

const productPatchSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens")
    .optional(),
  description: z.string().max(10000).nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  is_for_sale: z.boolean().optional(),
  price_cents: z.number().int().min(0).nullable().optional(),
  currency: z.string().min(2).max(10).optional(),
  cover_url: z.string().url().nullable().optional().or(z.literal("")),
  logo_url: z.string().url().nullable().optional().or(z.literal("")),
  accent_color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use hex, ex.: #04060F")
    .nullable()
    .optional()
    .or(z.literal("")),
  external_checkout_url: z.string().url().nullable().optional().or(z.literal("")),
  sales_headline: z.string().max(500).nullable().optional(),
  sales_subheadline: z.string().max(500).nullable().optional(),
  sales_description: z.string().max(10000).nullable().optional(),
  sales_hero_url: z.string().url().nullable().optional().or(z.literal("")),
  sales_video_url: z.string().url().nullable().optional().or(z.literal("")),
  sales_bullets: z.array(z.string().max(500)).max(20).optional(),
  access_duration_days: z.number().int().min(0).nullable().optional(),
  cover_fit: z.enum(["cover", "contain"]).optional(),
  cover_position: z.enum(["center", "top", "bottom", "left", "right"]).optional(),
});

function normalizeEmptyToNull(patch: Record<string, any>) {
  for (const k of [
    "cover_url",
    "logo_url",
    "accent_color",
    "external_checkout_url",
    "sales_hero_url",
    "sales_video_url",
  ]) {
    if (patch[k] === "") patch[k] = null;
  }
  return patch;
}

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    productPatchSchema.extend({ course_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { course_id, ...patch } = data;
    normalizeEmptyToNull(patch);
    const { error } = await supabaseAdmin
      .from("courses")
      .update(patch as any)
      .eq("id", course_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    productPatchSchema
      .extend({
        title: z.string().min(1).max(255),
        slug: z
          .string()
          .min(1)
          .max(120)
          .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, any> = { ...data };
    normalizeEmptyToNull(patch);
    if (patch.status == null) patch.status = "draft";
    if (patch.is_for_sale == null) patch.is_for_sale = false;
    if (patch.currency == null) patch.currency = "BRL";
    patch.created_by = context.userId;
    patch.course_type = "video";
    const { data: row, error } = await supabaseAdmin
      .from("courses")
      .insert(patch as any)
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);
    return { course: row };
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
