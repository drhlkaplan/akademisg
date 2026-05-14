
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100;
CREATE INDEX IF NOT EXISTS idx_courses_sort_order ON public.courses(sort_order) WHERE deleted_at IS NULL;

INSERT INTO storage.buckets (id, name, public)
VALUES ('course-covers', 'course-covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read course covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-covers');

CREATE POLICY "Admins can upload course covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-covers' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update course covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course-covers' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete course covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-covers' AND public.is_admin(auth.uid()));
