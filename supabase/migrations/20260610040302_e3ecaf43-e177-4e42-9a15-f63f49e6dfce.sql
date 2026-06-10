GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

DROP POLICY IF EXISTS "Usuários podem criar o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem criar o próprio perfil"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem atualizar o próprio perfil"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem ver o próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem ver o próprio perfil"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);