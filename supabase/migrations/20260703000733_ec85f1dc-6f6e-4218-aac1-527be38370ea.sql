
DROP INDEX IF EXISTS public.community_notes_user_post_unique;

ALTER TABLE public.community_notes
  ADD CONSTRAINT community_notes_user_post_unique UNIQUE (user_id, post_id);
