import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito ao administrador");
}

const createExpertInput = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(72),
  display_name: z.string().trim().min(1).max(120),
});

export const createExpert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createExpertInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { role: "expert", full_name: data.display_name },
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "Falha ao criar usuário");

    const uid = created.user.id;

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: "expert" as any });
    if (roleErr && !roleErr.message.includes("duplicate")) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error(roleErr.message);
    }

    const { error: expErr } = await supabaseAdmin
      .from("experts")
      .insert({
        id: uid,
        display_name: data.display_name,
        email: data.email,
        status: "active",
        created_by: context.userId,
      });
    if (expErr) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error(expErr.message);
    }

    return { id: uid };
  });

const setStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "paused", "blocked"]),
  reason: z.string().max(500).optional(),
});

export const setExpertStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setStatusInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch = {
      status: data.status,
      paused_at: data.status === "paused" ? new Date().toISOString() : null,
      paused_reason: data.status === "paused" ? (data.reason ?? null) : null,
      blocked_at: data.status === "blocked" ? new Date().toISOString() : null,
    };

    const { error } = await supabaseAdmin.from("experts").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const deleteExpertInput = z.object({ id: z.string().uuid() });

export const deleteExpert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteExpertInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
