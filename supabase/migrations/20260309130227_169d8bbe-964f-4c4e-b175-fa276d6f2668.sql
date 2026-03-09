-- Create storage bucket for firm assets (logos, favicons, backgrounds)
INSERT INTO storage.buckets (id, name, public)
VALUES ('firm-assets', 'firm-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to firm-assets (admins only via app logic)
CREATE POLICY "Admins can upload firm assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'firm-assets' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins can update firm assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'firm-assets' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "Admins can delete firm assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'firm-assets' AND
  public.is_admin(auth.uid())
);

CREATE POLICY "Anyone can view firm assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'firm-assets');