
CREATE TABLE public.featured_moment_views (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  signature TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.featured_moment_views TO authenticated;
GRANT ALL ON public.featured_moment_views TO service_role;

ALTER TABLE public.featured_moment_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own featured views"
ON public.featured_moment_views FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
