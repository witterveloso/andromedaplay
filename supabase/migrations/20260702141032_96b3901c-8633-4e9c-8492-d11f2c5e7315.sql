
CREATE TABLE public.community_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX community_notes_user_post_unique
  ON public.community_notes(user_id, post_id)
  WHERE post_id IS NOT NULL;

CREATE INDEX community_notes_user_course_idx
  ON public.community_notes(user_id, course_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_notes TO authenticated;
GRANT ALL ON public.community_notes TO service_role;

ALTER TABLE public.community_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own notes"
  ON public.community_notes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_community_notes_updated_at
  BEFORE UPDATE ON public.community_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
