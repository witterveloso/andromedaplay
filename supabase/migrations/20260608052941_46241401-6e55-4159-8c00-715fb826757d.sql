-- Backfill profiles from existing auth users so Author/commenter names render
INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);