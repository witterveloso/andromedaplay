
ALTER TABLE public.live_chat_messages
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_answered boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Usuários e admins apagam mensagens" ON public.live_chat_messages;
CREATE POLICY "Mods e autor apagam mensagens"
  ON public.live_chat_messages FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.community_posts p
      JOIN public.courses c ON c.id = p.course_id
      WHERE p.id = live_chat_messages.post_id AND c.expert_id = auth.uid()
    )
  );

CREATE POLICY "Mods atualizam mensagens"
  ON public.live_chat_messages FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.community_posts p
      JOIN public.courses c ON c.id = p.course_id
      WHERE p.id = live_chat_messages.post_id AND c.expert_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.community_posts p
      JOIN public.courses c ON c.id = p.course_id
      WHERE p.id = live_chat_messages.post_id AND c.expert_id = auth.uid()
    )
  );

ALTER TABLE public.live_chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
