-- 1) site_settings: split public vs admin-only
DROP POLICY IF EXISTS "Anyone can view site_settings" ON public.site_settings;

CREATE POLICY "Public can view non-sensitive site_settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (key IN ('general', 'footer'));

CREATE POLICY "Admins can view all site_settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 2) Public storage buckets: drop broad listing policies (direct public URLs still work)
DROP POLICY IF EXISTS "Public can read course covers" ON storage.objects;
DROP POLICY IF EXISTS "Public read topic4-content" ON storage.objects;

-- 3) Realtime: restrict realtime.messages to authenticated users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='realtime' AND tablename='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='realtime' AND tablename='messages' AND policyname='Authenticated users can use realtime'
    ) THEN
      EXECUTE 'CREATE POLICY "Authenticated users can use realtime" ON realtime.messages FOR SELECT TO authenticated USING (true)';
    END IF;
  END IF;
END $$;

-- 4) Firms: restrict full row access to admins/firm_admins; expose safe name lookup for employees
DROP POLICY IF EXISTS "Users can view own firm" ON public.firms;

CREATE POLICY "Admins and firm admins can view firms"
ON public.firms
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    public.is_admin(auth.uid())
    OR (
      public.has_role(auth.uid(), 'firm_admin'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.firm_id = firms.id
          AND p.deleted_at IS NULL
      )
    )
  )
);

-- Safe helper for regular employees to fetch limited firm info (name, branding)
CREATE OR REPLACE FUNCTION public.get_my_firm_basic()
RETURNS TABLE (
  id uuid,
  name text,
  logo_url text,
  primary_color text,
  secondary_color text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id, f.name, f.logo_url, f.primary_color, f.secondary_color
  FROM public.firms f
  JOIN public.profiles p ON p.firm_id = f.id
  WHERE p.user_id = auth.uid()
    AND p.deleted_at IS NULL
    AND f.deleted_at IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_firm_basic() TO authenticated;