ALTER TABLE public.live_chat_messages
  ADD COLUMN IF NOT EXISTS is_question boolean NOT NULL DEFAULT false;