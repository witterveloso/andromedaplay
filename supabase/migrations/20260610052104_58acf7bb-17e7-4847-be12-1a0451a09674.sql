
CREATE POLICY "Users can upload own avatar to course-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-assets'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can update own avatar in course-assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'course-assets'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can delete own avatar in course-assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'course-assets'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
