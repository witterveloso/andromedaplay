
-- Allow expert role users to self-insert/update their experts row (id = auth.uid())
CREATE POLICY "experts_self_insert" ON public.experts
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND public.has_role(auth.uid(), 'expert'));

CREATE POLICY "experts_self_update" ON public.experts
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.experts TO authenticated;
