CREATE TABLE public.lesson_access_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  page_seconds integer NOT NULL DEFAULT 0,
  video_seconds integer NOT NULL DEFAULT 0,
  seen_by_owner boolean NOT NULL DEFAULT false
);
CREATE INDEX lesson_access_sessions_course_idx ON public.lesson_access_sessions(course_id, started_at DESC);
GRANT SELECT ON public.lesson_access_sessions TO authenticated;
GRANT ALL ON public.lesson_access_sessions TO service_role;
ALTER TABLE public.lesson_access_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and admins read lesson accesses" ON public.lesson_access_sessions
  FOR SELECT TO authenticated USING (public.is_course_owner_or_admin(auth.uid(), course_id) OR student_id = auth.uid());

CREATE OR REPLACE FUNCTION public.start_lesson_session(_lesson_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _course uuid; _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT course_id INTO _course FROM lessons WHERE id = _lesson_id;
  IF _course IS NULL THEN RAISE EXCEPTION 'lesson not found'; END IF;
  IF NOT public.is_enrolled(auth.uid(), _course) THEN RETURN NULL; END IF;
  INSERT INTO lesson_access_sessions(student_id, course_id, lesson_id)
  VALUES (auth.uid(), _course, _lesson_id) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.heartbeat_lesson_session(_session_id uuid, _page_add integer, _video_add integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE lesson_access_sessions
     SET page_seconds = page_seconds + LEAST(GREATEST(COALESCE(_page_add,0),0),120),
         video_seconds = video_seconds + LEAST(GREATEST(COALESCE(_video_add,0),0),120),
         last_seen_at = now()
   WHERE id = _session_id AND student_id = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.get_lesson_access_report(_course_id uuid DEFAULT NULL, _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(id uuid, started_at timestamptz, last_seen_at timestamptz, page_seconds integer, video_seconds integer, seen_by_owner boolean,
  course_id uuid, course_title text, lesson_id uuid, lesson_title text, student_id uuid, student_name text, student_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.started_at, s.last_seen_at, s.page_seconds, s.video_seconds, s.seen_by_owner,
         c.id, c.title, l.id, l.title, s.student_id, p.full_name, u.email::text
    FROM lesson_access_sessions s
    JOIN courses c ON c.id = s.course_id
    JOIN lessons l ON l.id = s.lesson_id
    LEFT JOIN profiles p ON p.id = s.student_id
    LEFT JOIN auth.users u ON u.id = s.student_id
   WHERE public.is_course_owner_or_admin(auth.uid(), s.course_id)
     AND (_course_id IS NULL OR s.course_id = _course_id)
     AND (_from IS NULL OR s.started_at >= _from)
     AND (_to IS NULL OR s.started_at < _to)
   ORDER BY s.started_at DESC
   LIMIT 2000
$$;

CREATE OR REPLACE FUNCTION public.count_unseen_lesson_accesses()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM lesson_access_sessions s
   WHERE NOT s.seen_by_owner AND public.is_course_owner_or_admin(auth.uid(), s.course_id)
$$;

CREATE OR REPLACE FUNCTION public.mark_lesson_accesses_seen()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE lesson_access_sessions s SET seen_by_owner = true
   WHERE NOT s.seen_by_owner AND public.is_course_owner_or_admin(auth.uid(), s.course_id)
$$;

REVOKE EXECUTE ON FUNCTION public.start_lesson_session(uuid), public.heartbeat_lesson_session(uuid,integer,integer),
  public.get_lesson_access_report(uuid,timestamptz,timestamptz), public.count_unseen_lesson_accesses(), public.mark_lesson_accesses_seen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_lesson_session(uuid), public.heartbeat_lesson_session(uuid,integer,integer),
  public.get_lesson_access_report(uuid,timestamptz,timestamptz), public.count_unseen_lesson_accesses(), public.mark_lesson_accesses_seen() TO authenticated;