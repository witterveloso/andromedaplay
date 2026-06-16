ALTER TABLE public.course_invitations
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS cohort text;

UPDATE public.course_invitations
SET email = lower(trim(email)),
    status = CASE WHEN status = 'accepted' THEN 'used' ELSE status END;

ALTER TABLE public.course_invitations
  DROP CONSTRAINT IF EXISTS course_invitations_status_check;

ALTER TABLE public.course_invitations
  ADD CONSTRAINT course_invitations_status_check
  CHECK (status IN ('pending','used','cancelled'));

DROP INDEX IF EXISTS course_invitations_email_course_pending_uq;
CREATE UNIQUE INDEX course_invitations_email_course_pending_uq
  ON public.course_invitations (lower(trim(email)), course_id)
  WHERE status = 'pending';

DROP INDEX IF EXISTS course_invitations_email_idx;
CREATE INDEX course_invitations_email_idx ON public.course_invitations (lower(trim(email)));
CREATE INDEX IF NOT EXISTS course_invitations_status_idx ON public.course_invitations (status);
CREATE INDEX IF NOT EXISTS course_invitations_created_by_idx ON public.course_invitations (created_by);

CREATE OR REPLACE FUNCTION public.claim_invitations_for_user(_user_id uuid, _email text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_inv record;
  v_email text := lower(trim(_email));
BEGIN
  IF _user_id IS NULL OR v_email IS NULL OR length(v_email) = 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;

  FOR v_inv IN
    SELECT * FROM public.course_invitations
    WHERE lower(trim(email)) = v_email
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > now())
  LOOP
    INSERT INTO public.enrollments (course_id, student_id, status, expires_at, created_by)
    VALUES (v_inv.course_id, _user_id, 'active', v_inv.expires_at, COALESCE(v_inv.created_by, _user_id))
    ON CONFLICT (course_id, student_id) DO UPDATE
      SET status = 'active',
          expires_at = EXCLUDED.expires_at;

    UPDATE public.course_invitations
       SET status = 'used', accepted_at = now(), accepted_by = _user_id
     WHERE id = v_inv.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_invitations_for_user(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.email_has_pending_invitation(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_invitations
    WHERE lower(trim(email)) = lower(trim(_email))
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

GRANT EXECUTE ON FUNCTION public.email_has_pending_invitation(text) TO service_role, authenticated, anon;