
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS card_aspect_video text NOT NULL DEFAULT '16:9',
  ADD COLUMN IF NOT EXISTS card_aspect_community text NOT NULL DEFAULT '2:3',
  ADD COLUMN IF NOT EXISTS card_aspect_custom text,
  ADD COLUMN IF NOT EXISTS featured_format text NOT NULL DEFAULT 'banner';
