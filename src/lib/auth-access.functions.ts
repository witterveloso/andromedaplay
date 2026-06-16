import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findUserByEmail(supabaseAdmin: any, email: string) {
  const normalized = normalizeEmail(email);
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const found = list.users.find((u: any) => normalizeEmail(u.email ?? "") === normalized);
    if (found) return found;
    if (list.users.length < perPage) break;
    page++;
    if (page > 20) break;
  }
  return null;
}

function isExpired(expiresAt: string | null | undefined) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}

async function enrollExistingStudent(
  supabaseAdmin: any,
  params: { userId: string; courseId: string; fullName: string; expiresAt?: string | null; createdBy: string | null },
) {
  await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: params.userId, role: "student" as any }, { onConflict: "user_id,role" });

  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name")
    .eq("id", params.userId)
    .maybeSingle();
  if (!prof) {
    await supabaseAdmin.from("profiles").insert({ id: params.userId, full_name: params.fullName });
  } else if (!prof.full_name) {
    await supabaseAdmin.from("profiles").update({ full_name: params.fullName }).eq("id", params.userId);
  }

  const { error: enrErr } = await supabaseAdmin
    .from("enrollments")
    .upsert(
      {
        course_id: params.courseId,
        student_id: params.userId,
        status: "active",
        expires_at: params.expiresAt ?? null,
        created_by: params.createdBy,
      },
      { onConflict: "course_id,student_id" },
    );
  if (enrErr) throw new Error(enrErr.message);
}

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
    const email = normalizeEmail(data.email);

    const { data: invitations, error: invErr } = await supabaseAdmin
      .from("course_invitations")
      .select("id, status, expires_at")
      .eq("email", email)
      .order("created_at", { ascending: false });
    if (invErr) throw new Error(invErr.message);

    const activePending = (invitations ?? []).filter(
      (inv: any) => inv.status === "pending" && !isExpired(inv.expires_at),
    );
    if (!activePending.length) {
      if ((invitations ?? []).some((inv: any) => inv.status === "pending" && isExpired(inv.expires_at))) {
        throw new Error("Seu convite existe, mas o prazo expirou. Fale com o responsável pelo curso para liberar novamente.");
      }
      if ((invitations ?? []).some((inv: any) => inv.status === "cancelled")) {
        throw new Error("Seu convite foi cancelado. Fale com o responsável pelo curso para uma nova liberação.");
      }
      if ((invitations ?? []).some((inv: any) => inv.status === "used")) {
        throw new Error("Este convite já foi usado. Faça login ou recupere sua senha.");
      }
      throw new Error(
        "Este e-mail ainda não foi liberado para acesso. Verifique se digitou corretamente ou fale com o responsável pelo curso.",
      );
    }

    const exists = await findUserByEmail(supabaseAdmin, email);
    if (exists) {
      throw new Error("Já existe uma conta com este e-mail. Faça login ou recupere sua senha.");
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "Falha ao criar conta");

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: created.user.id, full_name: data.full_name }, { onConflict: "id" });

    const { data: claimed, error: claimErr } = await supabaseAdmin.rpc("claim_invitations_for_user", {
      _user_id: created.user.id,
      _email: email,
    });
    if (claimErr) throw new Error(claimErr.message);
    if (!claimed) throw new Error("Não foi possível ativar o convite. Fale com o responsável pelo curso.");

    return { ok: true, claimed };
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
  cohort: z.string().trim().max(120).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
});

export const createCourseInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inviteInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertCanManageCourse(context.supabase, context.userId, data.course_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = normalizeEmail(data.email);

    const existing = await findUserByEmail(supabaseAdmin, email);
    if (existing) {
      await enrollExistingStudent(supabaseAdmin, {
        userId: existing.id,
        courseId: data.course_id,
        fullName: data.full_name,
        expiresAt: data.expires_at ?? null,
        createdBy: context.userId,
      });
      await supabaseAdmin
        .from("course_invitations")
        .update({ status: "used", accepted_at: new Date().toISOString(), accepted_by: existing.id })
        .eq("email", email)
        .eq("course_id", data.course_id)
        .eq("status", "pending");
      return { ok: true, kind: "enrolled" as const, message: "Aluno já possui conta. Acesso liberado com sucesso." };
    }

    const { data: current } = await supabaseAdmin
      .from("course_invitations")
      .select("id")
      .eq("email", email)
      .eq("course_id", data.course_id)
      .eq("status", "pending")
      .maybeSingle();

    const payload = {
      email,
      full_name: data.full_name,
      cohort: data.cohort ?? null,
      course_id: data.course_id,
      created_by: context.userId,
      expires_at: data.expires_at ?? null,
      status: "pending",
    };

    const { error } = current
      ? await supabaseAdmin.from("course_invitations").update(payload).eq("id", current.id)
      : await supabaseAdmin.from("course_invitations").insert(payload);
    if (error) throw new Error(error.message);

    return { ok: true, kind: "invited" as const, email };
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
    const { error } = await supabaseAdmin
      .from("course_invitations")
      .update({ status: "cancelled" })
      .eq("id", data.invitation_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reactivateCourseInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ invitation_id: z.string().uuid(), expires_at: z.string().datetime().nullable().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await supabaseAdmin
      .from("course_invitations")
      .select("id, course_id, email, full_name, expires_at")
      .eq("id", data.invitation_id)
      .maybeSingle();
    if (!inv) throw new Error("Convite não encontrado");
    await assertCanManageCourse(context.supabase, context.userId, inv.course_id);

    const existing = await findUserByEmail(supabaseAdmin, inv.email);
    if (existing) {
      await enrollExistingStudent(supabaseAdmin, {
        userId: existing.id,
        courseId: inv.course_id,
        fullName: inv.full_name ?? inv.email,
        expiresAt: data.expires_at ?? null,
        createdBy: context.userId,
      });
      const { error } = await supabaseAdmin
        .from("course_invitations")
        .update({ status: "used", accepted_at: new Date().toISOString(), accepted_by: existing.id })
        .eq("id", inv.id);
      if (error) throw new Error(error.message);
      return { ok: true, kind: "enrolled" as const, message: "Aluno já possui conta. Acesso liberado com sucesso." };
    }

    const { error } = await supabaseAdmin
      .from("course_invitations")
      .update({ status: "pending", expires_at: data.expires_at ?? null, accepted_at: null, accepted_by: null })
      .eq("id", inv.id);
    if (error) throw new Error(error.message);
    return { ok: true, kind: "invited" as const };
  });

export const updateCourseInvitationEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ invitation_id: z.string().uuid(), email: z.string().trim().email().max(255) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = normalizeEmail(data.email);
    const { data: inv } = await supabaseAdmin
      .from("course_invitations")
      .select("id, course_id, full_name, expires_at")
      .eq("id", data.invitation_id)
      .maybeSingle();
    if (!inv) throw new Error("Convite não encontrado");
    await assertCanManageCourse(context.supabase, context.userId, inv.course_id);

    const existing = await findUserByEmail(supabaseAdmin, email);
    if (existing) {
      await enrollExistingStudent(supabaseAdmin, {
        userId: existing.id,
        courseId: inv.course_id,
        fullName: inv.full_name ?? email,
        expiresAt: inv.expires_at ?? null,
        createdBy: context.userId,
      });
      const { error } = await supabaseAdmin
        .from("course_invitations")
        .update({ email, status: "used", accepted_at: new Date().toISOString(), accepted_by: existing.id })
        .eq("id", inv.id);
      if (error) throw new Error(error.message);
      return { ok: true, kind: "enrolled" as const, message: "Aluno já possui conta. Acesso liberado com sucesso." };
    }

    const { error } = await supabaseAdmin
      .from("course_invitations")
      .update({ email, status: "pending", accepted_at: null, accepted_by: null })
      .eq("id", inv.id);
    if (error) throw new Error(error.message);
    return { ok: true, kind: "updated" as const };
  });

export const listAdminInvitations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z.enum(["all", "pending", "used", "expired", "cancelled"]).optional(),
        course_id: z.string().uuid().optional().or(z.literal("all")),
        expert_id: z.string().uuid().optional().or(z.literal("all")),
        email: z.string().trim().max(255).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: adminRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRow) throw new Error("Acesso restrito ao administrador");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("course_invitations")
      .select("id, email, full_name, cohort, status, expires_at, created_at, course_id, created_by, courses(id, title, expert_id)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.course_id && data.course_id !== "all") query = query.eq("course_id", data.course_id);
    if (data.email) query = query.ilike("email", `%${normalizeEmail(data.email)}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const expertIds = Array.from(new Set((rows ?? []).map((r: any) => r.courses?.expert_id).filter(Boolean)));
    const { data: profiles } = expertIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", expertIds)
      : { data: [] };
    const byExpert = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));

    const mapped = (rows ?? []).map((r: any) => {
      const computed_status = r.status === "pending" && isExpired(r.expires_at) ? "expired" : r.status;
      return {
        ...r,
        computed_status,
        course: r.courses ? { ...r.courses, expert_name: byExpert.get(r.courses.expert_id) ?? null } : null,
      };
    });

    return {
      invitations: mapped.filter((r: any) => {
        if (data.expert_id && data.expert_id !== "all" && r.course?.expert_id !== data.expert_id) return false;
        if (data.status && data.status !== "all" && r.computed_status !== data.status) return false;
        return true;
      }),
    };
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
