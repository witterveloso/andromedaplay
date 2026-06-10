CREATE POLICY "profiles_visible_for_community"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.community_posts p WHERE p.author_id = profiles.id)
  OR EXISTS (SELECT 1 FROM public.community_comments c WHERE c.author_id = profiles.id)
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.expert_id = profiles.id)
);