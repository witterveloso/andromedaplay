
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_default_community_channel() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.claim_invitations_for_user(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_course_owner_or_admin(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_access_post(uuid, uuid) FROM anon, public;
