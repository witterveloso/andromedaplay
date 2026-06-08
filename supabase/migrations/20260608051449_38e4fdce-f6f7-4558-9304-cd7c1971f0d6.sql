
DROP POLICY IF EXISTS "Admins upload course-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins update course-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete course-assets" ON storage.objects;

CREATE POLICY "Authenticated upload course-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-assets'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'expert'))
);

CREATE POLICY "Authenticated update course-assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'course-assets'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'expert') OR owner = auth.uid())
);

CREATE POLICY "Authenticated delete course-assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'course-assets'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'expert') OR owner = auth.uid())
);
