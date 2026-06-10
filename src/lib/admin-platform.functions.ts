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

/* ============================================================
 * Students directory (joins auth.users for emails)
 * ============================================================ */
export const listStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ search: z.string().max(255).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");
    if (roleErr) throw new Error(roleErr.message);

    const ids = (roles ?? []).map((r) => r.user_id);
    if (!ids.length) return { students: [] as any[] };

    const [{ data: profiles }, { data: enrolls }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, avatar_url, created_at").in("id", ids),
      supabaseAdmin.from("enrollments").select("student_id, status").in("student_id", ids),
    ]);

    // Fetch emails via auth admin listUsers (paged)
    const emailById: Record<string, string> = {};
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: usersPage, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      for (const u of usersPage.users) emailById[u.id] = u.email ?? "";
      if (usersPage.users.length < perPage) break;
      page++;
      if (page > 20) break; // safety
    }

    const countsByStudent: Record<string, { active: number; total: number }> = {};
    for (const e of enrolls ?? []) {
      const c = (countsByStudent[e.student_id] ??= { active: 0, total: 0 });
      c.total++;
      if (e.status === "active") c.active++;
    }

    let students = ids.map((id) => {
      const p = (profiles ?? []).find((x) => x.id === id);
      return {
        id,
        email: emailById[id] ?? "",
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        created_at: p?.created_at ?? null,
        active_enrollments: countsByStudent[id]?.active ?? 0,
        total_enrollments: countsByStudent[id]?.total ?? 0,
      };
    });

    const q = (data.search ?? "").trim().toLowerCase();
    if (q) {
      students = students.filter(
        (s) =>
          (s.email ?? "").toLowerCase().includes(q) ||
          (s.full_name ?? "").toLowerCase().includes(q),
      );
    }

    students.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return { students };
  });

/* ============================================================
 * Support lookup: full snapshot of a user by email
 * ============================================================ */
export const lookupUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email().max(255) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find user via paged listing
    let user: any = null;
    let page = 1;
    const perPage = 1000;
    while (!user) {
      const { data: pageData, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      user = pageData.users.find((u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase());
      if (user) break;
      if (pageData.users.length < perPage) break;
      page++;
      if (page > 20) break;
    }

    if (!user) return { user: null };

    const [{ data: profile }, { data: roles }, { data: enrollments }, { data: expert }, { data: ownedCourses }] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabaseAdmin.from("user_roles").select("role").eq("user_id", user.id),
        supabaseAdmin
          .from("enrollments")
          .select("id, status, created_at, expires_at, course:courses(id, title, slug, status, course_type, expert_id)")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("experts").select("*").eq("id", user.id).maybeSingle(),
        supabaseAdmin
          .from("courses")
          .select("id, title, slug, status, course_type, created_at")
          .eq("expert_id", user.id),
      ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
        created_at: user.created_at,
      },
      profile,
      roles: (roles ?? []).map((r) => r.role),
      enrollments: enrollments ?? [],
      expert,
      owned_courses: ownedCourses ?? [],
    };
  });

/* ============================================================
 * Access management: grant / revoke / status
 * ============================================================ */
export const grantAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        student_email: z.string().email().max(255),
        course_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // resolve student by email
    let student: any = null;
    let page = 1;
    const perPage = 1000;
    while (!student) {
      const { data: pageData, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      student = pageData.users.find((u) => (u.email ?? "").toLowerCase() === data.student_email.toLowerCase());
      if (student) break;
      if (pageData.users.length < perPage) break;
      page++;
      if (page > 20) break;
    }
    if (!student) throw new Error("Aluno não encontrado");

    // ensure student role
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: student.id, role: "student" as any })
      .then(() => {});

    const { error } = await supabaseAdmin
      .from("enrollments")
      .upsert(
        { student_id: student.id, course_id: data.course_id, status: "active", created_by: context.userId },
        { onConflict: "course_id,student_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true, student_id: student.id };
  });

export const revokeAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ enrollment_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("enrollments").delete().eq("id", data.enrollment_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAccessStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        enrollment_id: z.string().uuid(),
        status: z.enum(["active", "revoked"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("enrollments")
      .update({ status: data.status })
      .eq("id", data.enrollment_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
