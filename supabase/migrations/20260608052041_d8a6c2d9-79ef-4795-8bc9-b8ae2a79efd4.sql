
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.community_channels ADD COLUMN IF NOT EXISTS icon_url text;
