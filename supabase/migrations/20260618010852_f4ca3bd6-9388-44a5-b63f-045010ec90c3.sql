
CREATE OR REPLACE FUNCTION public.is_course_owner_or_admin(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = _course_id AND c.expert_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_access_post(_user_id uuid, _post_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_posts p
    WHERE p.id = _post_id AND (
      public.has_role(_user_id, 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = p.course_id AND c.expert_id = _user_id)
      OR public.is_enrolled(_user_id, p.course_id)
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_course_owner_or_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_post(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Autenticados veem publicações publicadas" ON public.community_posts;
CREATE POLICY "Enrolled, expert or admin read posts" ON public.community_posts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = community_posts.course_id AND c.expert_id = auth.uid())
  OR (status = 'published'::post_status AND public.is_enrolled(auth.uid(), course_id))
);

DROP POLICY IF EXISTS "Autenticados veem comentários" ON public.community_comments;
CREATE POLICY "Enrolled, expert or admin read comments" ON public.community_comments FOR SELECT TO authenticated
USING (public.can_access_post(auth.uid(), post_id));

DROP POLICY IF EXISTS "Autenticados veem reações" ON public.community_reactions;
CREATE POLICY "Enrolled, expert or admin read reactions" ON public.community_reactions FOR SELECT TO authenticated
USING (public.can_access_post(auth.uid(), post_id));

DROP POLICY IF EXISTS "Autenticados veem aulas publicadas" ON public.lessons;
CREATE POLICY "Free lessons or admin read" ON public.lessons FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (status = 'published'::lesson_status AND is_free = true
      AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = lessons.course_id AND c.status = 'published'::course_status))
);

DROP POLICY IF EXISTS "Autenticados veem materiais de aulas publicadas" ON public.lesson_materials;
CREATE POLICY "Enrolled, expert or admin read materials" ON public.lesson_materials FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE l.id = lesson_materials.lesson_id
      AND (c.expert_id = auth.uid()
           OR (l.status = 'published'::lesson_status AND public.is_enrolled(auth.uid(), c.id)))
  )
);

DROP POLICY IF EXISTS "Autenticados veem mensagens do chat" ON public.live_chat_messages;
CREATE POLICY "Enrolled, expert or admin read chat" ON public.live_chat_messages FOR SELECT TO authenticated
USING (public.can_access_post(auth.uid(), post_id));

DROP POLICY IF EXISTS "Usuários criam próprias mensagens" ON public.live_chat_messages;
CREATE POLICY "Enrolled users post chat" ON public.live_chat_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.can_access_post(auth.uid(), post_id));

DROP POLICY IF EXISTS "Experts manage invitations for their courses" ON public.course_invitations;
CREATE POLICY "Experts manage invitations they created" ON public.course_invitations FOR ALL TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_invitations.course_id AND c.expert_id = auth.uid())
)
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_invitations.course_id AND c.expert_id = auth.uid())
);

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_chat_topic_access" ON realtime.messages;
CREATE POLICY "live_chat_topic_access" ON realtime.messages FOR SELECT TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'live-chat:%' OR realtime.topic() LIKE 'live-presence:%'
      THEN public.can_access_post((select auth.uid()), NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid)
    WHEN realtime.topic() LIKE 'studio-mod:%'
      THEN EXISTS (
        SELECT 1 FROM public.community_posts p
        JOIN public.courses c ON c.id = p.course_id
        WHERE p.id = NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
          AND (c.expert_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'::app_role))
      )
    ELSE false
  END
);

DROP POLICY IF EXISTS "live_chat_topic_write" ON realtime.messages;
CREATE POLICY "live_chat_topic_write" ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() LIKE 'live-chat:%' OR realtime.topic() LIKE 'live-presence:%'
      THEN public.can_access_post((select auth.uid()), NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid)
    WHEN realtime.topic() LIKE 'studio-mod:%'
      THEN EXISTS (
        SELECT 1 FROM public.community_posts p
        JOIN public.courses c ON c.id = p.course_id
        WHERE p.id = NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
          AND (c.expert_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'::app_role))
      )
    ELSE false
  END
);

DROP POLICY IF EXISTS "lesson_assets_admin_all" ON storage.objects;
CREATE POLICY "lesson_assets_admin_all" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'lesson-assets' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'lesson-assets' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "lesson_assets_expert_manage_own" ON storage.objects;
CREATE POLICY "lesson_assets_expert_manage_own" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'lesson-assets'
  AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id::text = split_part(objects.name, '/', 1) AND c.expert_id = auth.uid())
)
WITH CHECK (
  bucket_id = 'lesson-assets'
  AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id::text = split_part(objects.name, '/', 1) AND c.expert_id = auth.uid())
);

DROP POLICY IF EXISTS "lesson_assets_student_read" ON storage.objects;
CREATE POLICY "lesson_assets_student_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lesson-assets'
  AND EXISTS (
    SELECT 1 FROM public.enrollments en
    WHERE en.student_id = auth.uid()
      AND en.course_id::text = split_part(objects.name, '/', 1)
      AND en.status = 'active'
      AND (en.expires_at IS NULL OR en.expires_at > now())
  )
);

DROP POLICY IF EXISTS "avatars_bucket_locked" ON storage.objects;
CREATE POLICY "avatars_bucket_locked" ON storage.objects FOR ALL TO authenticated, anon
USING (bucket_id = 'avatars' AND false)
WITH CHECK (bucket_id = 'avatars' AND false);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_enrolled(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_expert_active(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.email_has_pending_invitation(text) FROM anon, authenticated, public;
