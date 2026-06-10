
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS featured_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_kind text,
  ADD COLUMN IF NOT EXISTS featured_title text,
  ADD COLUMN IF NOT EXISTS featured_description text,
  ADD COLUMN IF NOT EXISTS featured_image_url text,
  ADD COLUMN IF NOT EXISTS featured_cta_label text,
  ADD COLUMN IF NOT EXISTS featured_cta_url text;
