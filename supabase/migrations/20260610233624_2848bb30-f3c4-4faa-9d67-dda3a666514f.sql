
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS extra_info text;
ALTER TABLE public.lesson_materials ADD COLUMN IF NOT EXISTS material_type text NOT NULL DEFAULT 'link';
ALTER TABLE public.lesson_materials ADD COLUMN IF NOT EXISTS storage_path text;

DROP POLICY IF EXISTS "lesson_materials_admin_all" ON storage.objects;
CREATE POLICY "lesson_materials_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'lesson-materials' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'lesson-materials' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "lesson_materials_expert_manage_own" ON storage.objects;
CREATE POLICY "lesson_materials_expert_manage_own" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'lesson-materials'
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id::text = split_part(storage.objects.name, '/', 1)
        AND c.expert_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'lesson-materials'
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id::text = split_part(storage.objects.name, '/', 1)
        AND c.expert_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "lesson_materials_student_read" ON storage.objects;
CREATE POLICY "lesson_materials_student_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'lesson-materials'
    AND EXISTS (
      SELECT 1 FROM public.enrollments en
      WHERE en.student_id = auth.uid()
        AND en.course_id::text = split_part(storage.objects.name, '/', 1)
        AND en.status = 'active'
        AND (en.expires_at IS NULL OR en.expires_at > now())
    )
  );
