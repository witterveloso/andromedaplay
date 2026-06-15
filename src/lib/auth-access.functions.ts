import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ============================================================
 * PUBLIC: signup with invitation check
 * Anyone can call. Only succeeds if email is pre-authorized.
 * ============================================================ */
export const signupWithInvitation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(6).max(72),
        full_name: z.string().trim().min(1).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: allowed, error: checkErr } = await supabaseAdmin.rpc(
      "email_has_pending_invitation",
      { _email: data.email },
    );
    if (checkErr) throw new Error(checkErr.message);

    // Also allow if user already exists (e.g. previously enrolled) — re-creating an account is not allowed though.
    if (!allowed) {
      throw new Error(
        "Seu e-mail ainda não possui acesso liberado. Entre em contato com o responsável pelo curso.",
      );
    }

    // Reject if user already exists (they should log in instead).
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      const exists = list.users.find((u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase());
      if (exists) {
        throw new Error("Já existe uma conta com este e-mail. Faça login ou recupere sua senha.");
      }
      if (list.users.length < perPage) break;
      page++;
      if (page > 20) break;
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "Falha ao criar conta");

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: created.user.id, full_name: data.full_name }, { onConflict: "id" });

    const { error: claimErr } = await supabaseAdmin.rpc("claim_invitations_for_user", {
      _user_id: created.user.id,
      _email: data.email,
    });
    if (claimErr) throw new Error(claimErr.message);

    return { ok: true };
  });

/* ============================================================
 * INVITATIONS (producer / admin)
 * ============================================================ */
async function assertCanManageCourse(supabase: any, userId: string, courseId: string) {
  const { data: course } = await supabase
    .from("courses")
    .select("id, expert_id")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) throw new Error("Curso não encontrado");
  const { data: adminRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (course.expert_id !== userId && !adminRow) {
    throw new Error("Você não tem permissão para gerenciar este curso");
  }
}

const inviteInput = z.object({
  course_id: z.string().uuid(),
  email: z.string().trim().email().max(255),
  full_name: z.string().trim().min(1).max(120),
  expires_at: z.string().datetime().nullable().optional(),
});

export const createCourseInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inviteInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertCanManageCourse(context.supabase, context.userId, data.course_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // If a user already exists with this email, enroll directly instead of creating an invitation.
    let existingId: string | null = null;
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      const found = list.users.find((u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase());
      if (found) { existingId = found.id; break; }
      if (list.users.length < perPage) break;
      page++;
      if (page > 20) break;
    }

    if (existingId) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: existingId, role: "student" as any }, { onConflict: "user_id,role" });

      const { data: prof } = await supabaseAdmin
        .from("profiles").select("id, full_name").eq("id", existingId).maybeSingle();
      if (!prof) {
        await supabaseAdmin.from("profiles").insert({ id: existingId, full_name: data.full_name });
      } else if (!prof.full_name) {
        await supabaseAdmin.from("profiles").update({ full_name: data.full_name }).eq("id", existingId);
      }

      const { error: enrErr } = await supabaseAdmin
        .from("enrollments")
        .upsert(
          {
            course_id: data.course_id,
            student_id: existingId,
            status: "active",
            expires_at: data.expires_at ?? null,
            created_by: context.userId,
          },
          { onConflict: "course_id,student_id" },
        );
      if (enrErr) throw new Error(enrErr.message);
      return { ok: true, kind: "enrolled" as const };
    }

    // Pre-authorize via invitation
    const { error } = await supabaseAdmin
      .from("course_invitations")
      .upsert(
        {
          email: data.email.toLowerCase(),
          course_id: data.course_id,
          created_by: context.userId,
          expires_at: data.expires_at ?? null,
          status: "pending",
        },
        { onConflict: "email,course_id" },
      )
      .select();
    if (error && !/duplicate|unique/i.test(error.message)) throw new Error(error.message);

    return { ok: true, kind: "invited" as const };
  });

export const cancelCourseInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ invitation_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await supabaseAdmin
      .from("course_invitations").select("course_id").eq("id", data.invitation_id).maybeSingle();
    if (!inv) throw new Error("Convite não encontrado");
    await assertCanManageCourse(context.supabase, context.userId, inv.course_id);
    const { error } = await supabaseAdmin.from("course_invitations").delete().eq("id", data.invitation_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * Admin "send password reset"
 * ============================================================ */
export const sendPasswordResetForEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      email: z.string().trim().email().max(255),
      redirect_to: z.string().url().max(500),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Producer or admin only
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const set = new Set((roles ?? []).map((r: any) => r.role));
    if (!set.has("admin") && !set.has("expert")) {
      throw new Error("Sem permissão");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, {
      redirectTo: data.redirect_to,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
