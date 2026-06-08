import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertExpertOwnsCourse(supabase: any, userId: string, courseId: string) {
  const { data, error } = await supabase
    .from("courses")
    .select("id, expert_id")
    .eq("id", courseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.expert_id !== userId) throw new Error("Você não é o dono deste curso");
}

async function assertExpertActive(adminClient: any, userId: string) {
  const { data, error } = await adminClient
    .from("experts")
    .select("status")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Expert não encontrado");
  if (data.status !== "active") throw new Error("Sua conta está pausada ou bloqueada");
}

const createStudentInput = z.object({
  course_id: z.string().uuid(),
  email: z.string().email().max(255),
  password: z.string().min(6).max(72),
  full_name: z.string().trim().min(1).max(120),
  expires_at: z.string().datetime().nullable().optional(),
});

export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createStudentInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertExpertActive(supabaseAdmin, context.userId);
    await assertExpertOwnsCourse(context.supabase, context.userId, data.course_id);

    // Try to find existing user by email
    let studentId: string | null = null;
    const { data: existingList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = existingList?.users?.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());

    if (existing) {
      studentId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.full_name },
      });
      if (createErr || !created.user) throw new Error(createErr?.message ?? "Falha ao criar aluno");
      studentId = created.user.id;
    }

    // Ensure profile row exists with the provided name (trigger may not be active)
    await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: studentId!, full_name: data.full_name },
        { onConflict: "id" }
      );

    // Ensure student role exists
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: studentId!, role: "student" as any }, { onConflict: "user_id,role" });

    // Create enrollment
    const { error: enrErr } = await supabaseAdmin
      .from("enrollments")
      .upsert(
        {
          course_id: data.course_id,
          student_id: studentId!,
          created_by: context.userId,
          status: "active",
          expires_at: data.expires_at ?? null,
        },
        { onConflict: "course_id,student_id" }
      );
    if (enrErr) throw new Error(enrErr.message);

    return { id: studentId };
  });

const removeStudentInput = z.object({
  course_id: z.string().uuid(),
  student_id: z.string().uuid(),
});

export const removeStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => removeStudentInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertExpertOwnsCourse(context.supabase, context.userId, data.course_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("enrollments")
      .delete()
      .eq("course_id", data.course_id)
      .eq("student_id", data.student_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const updateEnrollmentInput = z.object({
  course_id: z.string().uuid(),
  student_id: z.string().uuid(),
  status: z.enum(["active", "blocked"]).optional(),
  expires_at: z.string().datetime().nullable().optional(),
});

export const updateEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateEnrollmentInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertExpertOwnsCourse(context.supabase, context.userId, data.course_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { status?: string; expires_at?: string | null } = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.expires_at !== undefined) patch.expires_at = data.expires_at;
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await supabaseAdmin
      .from("enrollments")
      .update(patch)
      .eq("course_id", data.course_id)
      .eq("student_id", data.student_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
