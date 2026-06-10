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

/* ============================================================
 * Admin destructive actions + maintenance
 * ============================================================ */

async function logAction(
  supabaseAdmin: any,
  ctx: { userId: string; email?: string | null },
  action: string,
  target_type: string | null,
  target_id: string | null,
  target_label: string | null,
  details: Record<string, any> = {},
) {
  try {
    await supabaseAdmin.from("admin_audit_logs").insert({
      actor_id: ctx.userId,
      actor_email: ctx.email ?? null,
      action,
      target_type,
      target_id,
      target_label,
      details,
    });
  } catch {
    // never block the destructive op due to log failure
  }
}

export const deleteCourse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ course_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("id, title, slug")
      .eq("id", data.course_id)
      .maybeSingle();
    if (!course) throw new Error("Curso não encontrado");

    const { error } = await supabaseAdmin.from("courses").delete().eq("id", data.course_id);
    if (error) throw new Error(error.message);

    await logAction(
      supabaseAdmin,
      { userId: context.userId, email: (context.claims as any)?.email },
      "course.delete",
      "course",
      course.id,
      course.title,
      { slug: course.slug },
    );
    return { ok: true };
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Guard: do not allow deleting admins/experts via student delete
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);
    const roleSet = new Set((roles ?? []).map((r: any) => r.role));
    if (roleSet.has("admin")) throw new Error("Não é permitido excluir um administrador por aqui");
    if (roleSet.has("expert")) throw new Error("Este usuário é um produtor. Exclua pelo módulo de produtores.");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", data.user_id)
      .maybeSingle();

    // Clean derived data explicitly (FKs to auth.users may not all cascade)
    await supabaseAdmin.from("enrollments").delete().eq("student_id", data.user_id);
    await supabaseAdmin.from("community_reactions").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("community_comments").delete().eq("author_id", data.user_id);
    await supabaseAdmin.from("community_posts").delete().eq("author_id", data.user_id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("profiles").delete().eq("id", data.user_id);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);

    await logAction(
      supabaseAdmin,
      { userId: context.userId, email: (context.claims as any)?.email },
      "student.delete",
      "user",
      data.user_id,
      profile?.full_name ?? null,
    );
    return { ok: true };
  });

export const cleanupDuplicateEnrollments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("enrollments")
      .select("id, course_id, student_id, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const seen = new Set<string>();
    const toDelete: string[] = [];
    for (const r of rows ?? []) {
      const key = `${r.course_id}::${r.student_id}`;
      if (seen.has(key)) toDelete.push(r.id);
      else seen.add(key);
    }
    if (toDelete.length) {
      const { error: delErr } = await supabaseAdmin.from("enrollments").delete().in("id", toDelete);
      if (delErr) throw new Error(delErr.message);
    }

    await logAction(
      supabaseAdmin,
      { userId: context.userId, email: (context.claims as any)?.email },
      "maintenance.dedupe_enrollments",
      null,
      null,
      null,
      { removed: toDelete.length },
    );
    return { removed: toDelete.length };
  });

export const detectDuplicates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: courses } = await supabaseAdmin
      .from("courses")
      .select("id, title, slug, course_type, expert_id, created_at")
      .order("created_at", { ascending: true });

    const courseBuckets: Record<string, any[]> = {};
    for (const c of courses ?? []) {
      const key = `${(c.title ?? "").trim().toLowerCase()}::${c.expert_id ?? ""}`;
      (courseBuckets[key] ??= []).push(c);
    }
    const duplicateCourses = Object.values(courseBuckets).filter((arr) => arr.length > 1);

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name");
    const emailsById: Record<string, string> = {};
    let page = 1;
    while (true) {
      const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      for (const u of usersPage?.users ?? []) emailsById[u.id] = (u.email ?? "").toLowerCase();
      if ((usersPage?.users.length ?? 0) < 1000) break;
      page++;
      if (page > 20) break;
    }
    const emailBuckets: Record<string, any[]> = {};
    for (const p of profiles ?? []) {
      const email = emailsById[p.id];
      if (!email) continue;
      (emailBuckets[email] ??= []).push({ id: p.id, full_name: p.full_name, email });
    }
    const duplicateUsers = Object.values(emailBuckets).filter((arr) => arr.length > 1);

    const { data: enrolls } = await supabaseAdmin
      .from("enrollments")
      .select("course_id, student_id");
    const enrollSeen = new Set<string>();
    let dupEnroll = 0;
    for (const e of enrolls ?? []) {
      const k = `${e.course_id}::${e.student_id}`;
      if (enrollSeen.has(k)) dupEnroll++;
      else enrollSeen.add(k);
    }

    return {
      duplicate_courses: duplicateCourses,
      duplicate_users: duplicateUsers,
      duplicate_enrollments: dupEnroll,
    };
  });

export const cleanupOrphans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Lessons whose course no longer exists, modules whose course no longer exists, etc.
    // Most of these are protected by ON DELETE CASCADE — this is a belt-and-suspenders pass.
    const { data: courses } = await supabaseAdmin.from("courses").select("id");
    const courseIds = new Set((courses ?? []).map((c: any) => c.id));

    const { data: modules } = await supabaseAdmin.from("modules").select("id, course_id");
    const orphanModules = (modules ?? []).filter((m: any) => !courseIds.has(m.course_id)).map((m: any) => m.id);

    const { data: lessons } = await supabaseAdmin.from("lessons").select("id, course_id, module_id");
    const moduleIds = new Set((modules ?? []).map((m: any) => m.id));
    const orphanLessons = (lessons ?? [])
      .filter((l: any) => !courseIds.has(l.course_id) || (l.module_id && !moduleIds.has(l.module_id)))
      .map((l: any) => l.id);

    if (orphanLessons.length)
      await supabaseAdmin.from("lessons").delete().in("id", orphanLessons);
    if (orphanModules.length)
      await supabaseAdmin.from("modules").delete().in("id", orphanModules);

    const removed = orphanLessons.length + orphanModules.length;
    await logAction(
      supabaseAdmin,
      { userId: context.userId, email: (context.claims as any)?.email },
      "maintenance.cleanup_orphans",
      null,
      null,
      null,
      { removed_lessons: orphanLessons.length, removed_modules: orphanModules.length },
    );
    return { removed, orphan_lessons: orphanLessons.length, orphan_modules: orphanModules.length };
  });

export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().min(1).max(500).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: logs, error } = await supabaseAdmin
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (error) throw new Error(error.message);
    return { logs: logs ?? [] };
  });
