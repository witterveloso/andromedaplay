
-- Pre-authorized access invitations for student self-signup
CREATE TABLE public.course_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','cancelled')),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX course_invitations_email_course_pending_uq
  ON public.course_invitations (lower(email), course_id)
  WHERE status = 'pending';

CREATE INDEX course_invitations_email_idx ON public.course_invitations (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_invitations TO authenticated;
GRANT ALL ON public.course_invitations TO service_role;

ALTER TABLE public.course_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all invitations"
  ON public.course_invitations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Experts manage invitations for their courses"
  ON public.course_invitations FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.courses c
            WHERE c.id = course_invitations.course_id AND c.expert_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.courses c
            WHERE c.id = course_invitations.course_id AND c.expert_id = auth.uid())
  );

CREATE TRIGGER course_invitations_updated_at
  BEFORE UPDATE ON public.course_invitations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Claim all pending invitations matching a user's email: creates enrollments + ensures student role.
CREATE OR REPLACE FUNCTION public.claim_invitations_for_user(_user_id uuid, _email text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_inv record;
BEGIN
  IF _user_id IS NULL OR _email IS NULL OR length(trim(_email)) = 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;

  FOR v_inv IN
    SELECT * FROM public.course_invitations
    WHERE lower(email) = lower(_email) AND status = 'pending'
  LOOP
    INSERT INTO public.enrollments (course_id, student_id, status, expires_at, created_by)
    VALUES (v_inv.course_id, _user_id, 'active', v_inv.expires_at, COALESCE(v_inv.created_by, _user_id))
    ON CONFLICT (course_id, student_id) DO UPDATE
      SET status = 'active',
          expires_at = EXCLUDED.expires_at;

    UPDATE public.course_invitations
       SET status = 'accepted', accepted_at = now(), accepted_by = _user_id
     WHERE id = v_inv.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_invitations_for_user(uuid, text) TO service_role;

-- Check if a given email has any pending invitation (used pre-signup)
CREATE OR REPLACE FUNCTION public.email_has_pending_invitation(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_invitations
    WHERE lower(email) = lower(_email) AND status = 'pending'
  )
$$;

GRANT EXECUTE ON FUNCTION public.email_has_pending_invitation(text) TO service_role, authenticated, anon;
