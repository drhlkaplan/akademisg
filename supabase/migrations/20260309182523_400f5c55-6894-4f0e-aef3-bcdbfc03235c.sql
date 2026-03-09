
-- Drop the recursive policy
DROP POLICY IF EXISTS "Firm admins can view firm profiles" ON public.profiles;

-- Create a security definer function to check firm membership
CREATE OR REPLACE FUNCTION public.get_my_firm_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT firm_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Recreate policy using the function (avoids self-referencing profiles)
CREATE POLICY "Firm admins can view firm profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  firm_id IS NOT NULL
  AND firm_id = public.get_my_firm_id()
  AND public.has_role(auth.uid(), 'firm_admin')
);
