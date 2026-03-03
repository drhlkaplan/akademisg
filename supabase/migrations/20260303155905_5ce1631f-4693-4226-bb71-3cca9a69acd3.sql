
-- Create storage bucket for SCORM packages
INSERT INTO storage.buckets (id, name, public) VALUES ('scorm-packages', 'scorm-packages', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to scorm-packages (admin only via app logic)
CREATE POLICY "Admins can upload SCORM packages" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'scorm-packages' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update SCORM packages" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'scorm-packages' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete SCORM packages" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'scorm-packages' AND public.is_admin(auth.uid()));

CREATE POLICY "Anyone can read SCORM packages" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'scorm-packages');

-- Add unique constraint on lesson_progress for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS lesson_progress_enrollment_lesson_unique 
ON public.lesson_progress (enrollment_id, lesson_id) 
WHERE lesson_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS lesson_progress_enrollment_scorm_unique 
ON public.lesson_progress (enrollment_id, scorm_package_id) 
WHERE scorm_package_id IS NOT NULL;
