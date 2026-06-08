
CREATE POLICY "channels_expert_manage_own"
ON public.community_channels FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = community_channels.course_id AND c.expert_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = community_channels.course_id AND c.expert_id = auth.uid()));

CREATE POLICY "posts_expert_manage_own"
ON public.community_posts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = community_posts.course_id AND c.expert_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = community_posts.course_id AND c.expert_id = auth.uid()));

CREATE POLICY "materials_expert_manage_own"
ON public.lesson_materials FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id = l.module_id JOIN public.courses c ON c.id = m.course_id
  WHERE l.id = lesson_materials.lesson_id AND c.expert_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id = l.module_id JOIN public.courses c ON c.id = m.course_id
  WHERE l.id = lesson_materials.lesson_id AND c.expert_id = auth.uid()
));
