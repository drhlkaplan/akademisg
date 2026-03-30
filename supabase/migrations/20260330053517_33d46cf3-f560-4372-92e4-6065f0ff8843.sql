
-- Fix 1: Fix firms RLS policy - add deleted_at IS NULL for all users
DROP POLICY IF EXISTS "Users can view own firm" ON public.firms;
CREATE POLICY "Users can view own firm" ON public.firms
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    is_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.firm_id = firms.id AND p.deleted_at IS NULL)
  )
);

-- Fix 2: Make lesson-content bucket private
UPDATE storage.buckets SET public = false WHERE id = 'lesson-content';

-- Fix 2b: Drop existing public read policy and add authenticated-only policy
DROP POLICY IF EXISTS "Public can read lesson content" ON storage.objects;
CREATE POLICY "Authenticated users can read lesson content"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'lesson-content');
