CREATE OR REPLACE FUNCTION public.update_my_firm_branding(
  _logo_url text, _primary_color text, _secondary_color text, _bg_color text,
  _welcome_message text, _footer_text text, _login_bg_url text, _favicon_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _fid uuid;
BEGIN
  IF NOT (has_role(auth.uid(),'firm_admin') OR has_role(auth.uid(),'company_admin')) THEN
    RAISE EXCEPTION 'Yetkiniz yok';
  END IF;
  SELECT firm_id INTO _fid FROM profiles WHERE user_id = auth.uid() AND deleted_at IS NULL;
  IF _fid IS NULL THEN RAISE EXCEPTION 'Firma bulunamadı'; END IF;
  UPDATE firms SET logo_url=_logo_url, primary_color=_primary_color, secondary_color=_secondary_color,
    bg_color=_bg_color, welcome_message=_welcome_message, footer_text=_footer_text,
    login_bg_url=_login_bg_url, favicon_url=_favicon_url, updated_at=now()
  WHERE id=_fid;
END $$;
REVOKE EXECUTE ON FUNCTION public.update_my_firm_branding(text,text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_firm_branding(text,text,text,text,text,text,text,text) TO authenticated;

CREATE POLICY "Firm admins can upload own firm assets" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='firm-assets' AND (has_role(auth.uid(),'firm_admin') OR has_role(auth.uid(),'company_admin'))
  AND (storage.foldername(name))[1] = (SELECT firm_id::text FROM public.profiles WHERE user_id=auth.uid()));
CREATE POLICY "Firm admins can update own firm assets" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='firm-assets' AND (has_role(auth.uid(),'firm_admin') OR has_role(auth.uid(),'company_admin'))
  AND (storage.foldername(name))[1] = (SELECT firm_id::text FROM public.profiles WHERE user_id=auth.uid()));