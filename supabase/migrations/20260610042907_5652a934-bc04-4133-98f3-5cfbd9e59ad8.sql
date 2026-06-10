
-- Auto-create default "Publicações" channel for community courses
CREATE OR REPLACE FUNCTION public.create_default_community_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.course_type = 'community' THEN
    INSERT INTO public.community_channels (course_id, name, position)
    VALUES (NEW.id, 'Publicações', 0)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_default_community_channel ON public.courses;
CREATE TRIGGER trg_create_default_community_channel
AFTER INSERT ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.create_default_community_channel();

-- Backfill: ensure every existing community course has at least one channel
INSERT INTO public.community_channels (course_id, name, position)
SELECT c.id, 'Publicações', 0
FROM public.courses c
WHERE c.course_type = 'community'
  AND NOT EXISTS (
    SELECT 1 FROM public.community_channels ch WHERE ch.course_id = c.id
  );
