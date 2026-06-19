GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_enrolled(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_expert_active(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.email_has_pending_invitation(text) TO authenticated, anon;