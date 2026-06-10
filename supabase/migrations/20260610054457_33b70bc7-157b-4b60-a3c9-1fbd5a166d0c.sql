
-- Add multi-provider video fields to lessons (keep youtube_url for backwards compat)
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS video_provider text NOT NULL DEFAULT 'youtube',
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_id text,
  ADD COLUMN IF NOT EXISTS video_embed text;

ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_video_provider_check;

ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_video_provider_check
  CHECK (video_provider IN ('youtube','bunny','cloudflare','vimeo','mux','custom'));

-- Backfill existing YouTube lessons so the new player keeps working unchanged
UPDATE public.lessons
SET video_url = youtube_url
WHERE video_url IS NULL
  AND youtube_url IS NOT NULL;
