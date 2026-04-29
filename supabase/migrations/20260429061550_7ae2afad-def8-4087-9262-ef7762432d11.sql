-- Revoke EXECUTE from anon/authenticated on sensitive SECURITY DEFINER functions
-- These are only meant to be called by edge functions using the service role.
REVOKE EXECUTE ON FUNCTION public.get_email_by_tc(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.mask_tc_identity(text) FROM anon, authenticated, public;

-- Restrict SELECT on public storage buckets so clients cannot LIST objects.
-- GET by direct URL still works because that path uses the storage REST endpoint,
-- not the RLS-enforced object list. Limit SELECT (list) policy to admins only.
DROP POLICY IF EXISTS "Anyone can view firm assets" ON storage.objects;
CREATE POLICY "Admins can list firm assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'firm-assets' AND is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public can view SCORM public files" ON storage.objects;
CREATE POLICY "Admins can list SCORM public files"
ON storage.objects FOR SELECT
USING (bucket_id = 'scorm-public' AND is_admin(auth.uid()));