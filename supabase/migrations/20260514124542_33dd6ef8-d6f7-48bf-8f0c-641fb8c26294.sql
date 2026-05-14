UPDATE storage.buckets SET public = true WHERE id = 'topic4-content';

DROP POLICY IF EXISTS "Authenticated read topic4-content" ON storage.objects;
CREATE POLICY "Public read topic4-content"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'topic4-content');