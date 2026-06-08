
CREATE POLICY "profiles_expert_read_enrolled_students" ON public.profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.student_id = profiles.id AND c.expert_id = auth.uid()
  ));
