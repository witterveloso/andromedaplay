
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS cover_fit text NOT NULL DEFAULT 'cover',
  ADD COLUMN IF NOT EXISTS cover_position text NOT NULL DEFAULT 'center';

ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_cover_fit_check;
ALTER TABLE public.courses
  ADD CONSTRAINT courses_cover_fit_check CHECK (cover_fit IN ('cover', 'contain'));

ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_cover_position_check;
ALTER TABLE public.courses
  ADD CONSTRAINT courses_cover_position_check CHECK (cover_position IN ('center', 'top', 'bottom', 'left', 'right'));

UPDATE public.courses SET cover_fit = 'contain' WHERE slug IN ('prosperus', 'comunica-pascom');
