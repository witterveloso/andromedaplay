
-- 1. Add 'expert' to app_role enum (not used in this migration's other statements)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'expert';

-- 2. Expert status enum
DO $$ BEGIN
  CREATE TYPE public.expert_status AS ENUM ('active','paused','blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Experts table
CREATE TABLE IF NOT EXISTS public.experts (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email text NOT NULL,
  status public.expert_status NOT NULL DEFAULT 'active',
  paused_reason text,
  paused_at timestamptz,
  blocked_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experts TO authenticated;
GRANT ALL ON public.experts TO service_role;
ALTER TABLE public.experts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "experts_admin_all" ON public.experts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "experts_self_read" ON public.experts
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE TRIGGER set_experts_updated_at
  BEFORE UPDATE ON public.experts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Add expert_id to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS expert_id uuid REFERENCES public.experts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_courses_expert ON public.courses(expert_id);

-- 5. Enrollments
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON public.enrollments(course_id);

CREATE POLICY "enrollments_admin_all" ON public.enrollments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "enrollments_student_read_own" ON public.enrollments
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "enrollments_expert_manage_own_course" ON public.enrollments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.expert_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.expert_id = auth.uid()));

CREATE TRIGGER set_enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Helper: is_expert_active
CREATE OR REPLACE FUNCTION public.is_expert_active(_expert_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.experts WHERE id = _expert_id AND status = 'active')
$$;

CREATE OR REPLACE FUNCTION public.is_enrolled(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE student_id = _user_id AND course_id = _course_id AND status = 'active'
  )
$$;

-- 7. Update handle_new_user to read role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  meta_role text;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  meta_role := NEW.raw_user_meta_data->>'role';

  IF meta_role = 'expert' THEN
    -- role assignment happens in the server fn (so we can also insert experts row),
    -- but ensure a fallback role is not assigned automatically
    NULL;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 8. Ensure trigger exists on auth.users (was missing per audit)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Update RLS on courses for new model
DROP POLICY IF EXISTS "courses_public_read" ON public.courses;
DROP POLICY IF EXISTS "courses_admin_all" ON public.courses;
DROP POLICY IF EXISTS "courses_read_published" ON public.courses;
DROP POLICY IF EXISTS "courses_admin_manage" ON public.courses;
DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view published" ON public.courses;

CREATE POLICY "courses_admin_all" ON public.courses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "courses_expert_manage_own" ON public.courses
  FOR ALL TO authenticated
  USING (expert_id = auth.uid())
  WITH CHECK (expert_id = auth.uid());

CREATE POLICY "courses_student_read_enrolled" ON public.courses
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND public.is_expert_active(expert_id)
    AND public.is_enrolled(auth.uid(), id)
  );

-- 10. Update RLS on modules
DROP POLICY IF EXISTS "modules_admin_all" ON public.modules;
DROP POLICY IF EXISTS "modules_read_published" ON public.modules;
DROP POLICY IF EXISTS "Admins manage modules" ON public.modules;
DROP POLICY IF EXISTS "Anyone can view modules of published" ON public.modules;

CREATE POLICY "modules_admin_all" ON public.modules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "modules_expert_manage_own" ON public.modules
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.expert_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.expert_id = auth.uid()));

CREATE POLICY "modules_student_read_enrolled" ON public.modules
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_id
      AND c.status = 'published'
      AND public.is_expert_active(c.expert_id)
      AND public.is_enrolled(auth.uid(), c.id)
  ));

-- 11. Update RLS on lessons
DROP POLICY IF EXISTS "lessons_admin_all" ON public.lessons;
DROP POLICY IF EXISTS "lessons_read_published" ON public.lessons;
DROP POLICY IF EXISTS "Admins manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "Anyone can view lessons of published" ON public.lessons;

CREATE POLICY "lessons_admin_all" ON public.lessons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "lessons_expert_manage_own" ON public.lessons
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = module_id AND c.expert_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = module_id AND c.expert_id = auth.uid()
  ));

CREATE POLICY "lessons_student_read_enrolled" ON public.lessons
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = module_id
      AND c.status = 'published'
      AND public.is_expert_active(c.expert_id)
      AND public.is_enrolled(auth.uid(), c.id)
  ));
