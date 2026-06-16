REVOKE EXECUTE ON FUNCTION public.email_has_pending_invitation(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_has_pending_invitation(text) TO service_role;