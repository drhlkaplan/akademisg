-- Site settings: key/value with jsonb. Public read for non-sensitive sections; admin write.
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site_settings"
ON public.site_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can manage site_settings"
ON public.site_settings FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.site_settings (key, value) VALUES
  ('general', jsonb_build_object(
    'siteName', 'İSG Akademi',
    'siteDescription', 'İş Sağlığı ve Güvenliği Eğitim Platformu',
    'contactEmail', 'info@isgakademi.com',
    'contactPhone', '+90 (212) 555 00 00',
    'contactAddress', 'İstanbul, Türkiye',
    'maintenanceMode', false,
    'defaultLanguage', 'tr'
  )),
  ('notifications', jsonb_build_object(
    'emailOnEnrollment', true,
    'emailOnCertificate', true,
    'emailOnExamResult', true,
    'emailOnCourseComplete', true,
    'adminDailyDigest', false
  )),
  ('security', jsonb_build_object(
    'requireEmailVerification', true,
    'maxLoginAttempts', 5,
    'sessionTimeout', 60,
    'passwordMinLength', 8,
    'twoFactorEnabled', false
  )),
  ('footer', jsonb_build_object(
    'copyrightText', '© İSG Akademi. Tüm hakları saklıdır.',
    'tagline', 'İş Sağlığı ve Güvenliği eğitimlerinde güvenilir çözüm ortağınız. SCORM uyumlu, sertifikalı online eğitimler.'
  ))
ON CONFLICT (key) DO NOTHING;