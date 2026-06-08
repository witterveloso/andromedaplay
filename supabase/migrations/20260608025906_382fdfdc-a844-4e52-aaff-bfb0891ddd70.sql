
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS is_live_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS live_ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS live_chat_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT,
  emoji TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_chat_messages TO authenticated;
GRANT ALL ON public.live_chat_messages TO service_role;

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem mensagens do chat"
  ON public.live_chat_messages FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Usuários criam próprias mensagens"
  ON public.live_chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários e admins apagam mensagens"
  ON public.live_chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_live_chat_messages_post ON public.live_chat_messages(post_id, created_at);
