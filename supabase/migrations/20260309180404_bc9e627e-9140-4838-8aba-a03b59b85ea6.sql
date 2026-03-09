CREATE POLICY "Firm admins can view firm profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles my_profile
    WHERE my_profile.user_id = auth.uid()
      AND my_profile.firm_id = profiles.firm_id
      AND my_profile.firm_id IS NOT NULL
      AND public.has_role(auth.uid(), 'firm_admin')
  )
);