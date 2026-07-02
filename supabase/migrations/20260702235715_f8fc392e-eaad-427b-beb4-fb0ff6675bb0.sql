
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS cover_fit text NOT NULL DEFAULT 'cover',
  ADD COLUMN IF NOT EXISTS cover_position text NOT NULL DEFAULT 'center';

DO $$ BEGIN
  ALTER TABLE public.courses
    ADD CONSTRAINT courses_cover_fit_check CHECK (cover_fit IN ('cover', 'contain'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.courses
    ADD CONSTRAINT courses_cover_position_check
    CHECK (cover_position IN ('center', 'top', 'bottom', 'left', 'right'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE public.courses SET cover_fit = 'contain'
WHERE slug IN ('prosperus', 'comunica-pascom');
