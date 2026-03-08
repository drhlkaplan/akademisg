
-- 1. Fix Security Definer Views: Switch both views to security_invoker = on
ALTER VIEW public.questions_for_students SET (security_invoker = on);
ALTER VIEW public.public_certificates SET (security_invoker = on);

-- Grant anon SELECT on public_certificates (it's a public verification view)
GRANT SELECT ON public.public_certificates TO anon;
GRANT SELECT ON public.public_certificates TO authenticated;

-- 2. Fix firm data exposure: Replace open SELECT policy with restricted one
DROP POLICY IF EXISTS "Anyone can view active firms" ON public.firms;

CREATE POLICY "Users can view own firm"
ON public.firms
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.firm_id = firms.id
  )
  OR is_admin(auth.uid())
);

-- 3. Fix group self-join privilege escalation: Remove user self-join INSERT policy
DROP POLICY IF EXISTS "Users can join groups" ON public.users_to_groups;
