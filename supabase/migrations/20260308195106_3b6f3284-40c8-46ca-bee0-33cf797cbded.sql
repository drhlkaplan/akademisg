INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-content', 'lesson-content', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload lesson content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-content'
  AND public.is_admin(auth.uid())
);

CREATE POLICY "Public can read lesson content"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lesson-content');

CREATE POLICY "Admins can delete lesson content"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lesson-content'
  AND public.is_admin(auth.uid())
);