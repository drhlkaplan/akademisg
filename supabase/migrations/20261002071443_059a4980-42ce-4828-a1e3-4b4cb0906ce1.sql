CREATE OR REPLACE FUNCTION public.get_firm_branding_by_code(_code text)
RETURNS TABLE(id uuid, firm_code text, name text, logo_url text, primary_color text, secondary_color text, bg_color text, welcome_message text, login_bg_url text, footer_text text, custom_css text, favicon_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, f.firm_code, f.name, f.logo_url, f.primary_color, f.secondary_color, f.bg_color, f.welcome_message, f.login_bg_url, f.footer_text, f.custom_css, f.favicon_url
  FROM public.firms f
  WHERE upper(f.firm_code) = upper(trim(_code)) AND f.is_active = true AND f.deleted_at IS NULL
  LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.get_my_firm_branding()
RETURNS TABLE(id uuid, firm_code text, name text, logo_url text, primary_color text, secondary_color text, bg_color text, welcome_message text, login_bg_url text, footer_text text, custom_css text, favicon_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, f.firm_code, f.name, f.logo_url, f.primary_color, f.secondary_color, f.bg_color, f.welcome_message, f.login_bg_url, f.footer_text, f.custom_css, f.favicon_url
  FROM public.firms f JOIN public.profiles p ON p.firm_id = f.id
  WHERE p.user_id = auth.uid() AND p.deleted_at IS NULL AND f.is_active = true AND f.deleted_at IS NULL
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_firm_branding_by_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_firm_branding() TO authenticated;
DROP POLICY IF EXISTS "Admins and firm admins can view firms" ON public.firms;
CREATE POLICY "Admins and firm admins can view firms" ON public.firms FOR SELECT TO authenticated
USING (deleted_at IS NULL AND (is_admin(auth.uid()) OR ((has_role(auth.uid(),'firm_admin') OR has_role(auth.uid(),'company_admin')) AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.firm_id = firms.id AND p.deleted_at IS NULL))));