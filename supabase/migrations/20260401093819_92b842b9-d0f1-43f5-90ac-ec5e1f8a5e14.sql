-- 1. Recreate questions_for_students view with security_invoker
DROP VIEW IF EXISTS public.questions_for_students;

CREATE VIEW public.questions_for_students
WITH (security_invoker = on) AS
SELECT id, exam_id, question_text, question_type, options, points
FROM public.questions;

-- 2. Fix SCORM storage policy - replace broad SELECT with enrollment-scoped
DROP POLICY IF EXISTS "Anyone can read SCORM packages" ON storage.objects;

CREATE POLICY "Enrolled users can read SCORM packages"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'scorm-packages'
    AND (
      is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.scorm_packages sp
        JOIN public.enrollments e ON e.course_id = sp.course_id
        WHERE storage.objects.name LIKE sp.package_url || '%'
          AND e.user_id = auth.uid()
          AND e.status IN ('active', 'completed')
          AND e.deleted_at IS NULL
      )
    )
  );

-- 3. Fix lesson-content storage policy - add enrollment scope  
DROP POLICY IF EXISTS "Authenticated users can read lesson content" ON storage.objects;

CREATE POLICY "Enrolled users can read lesson content"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'lesson-content'
    AND (
      is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.lessons l
        JOIN public.enrollments e ON e.course_id = l.course_id
        WHERE l.content_url LIKE '%' || storage.objects.name || '%'
          AND e.user_id = auth.uid()
          AND e.status IN ('active', 'completed')
          AND e.deleted_at IS NULL
      )
    )
  );

-- 4. Fix activity_logs INSERT policy - remove NULL user_id
DROP POLICY IF EXISTS "Users can insert own activity logs" ON public.activity_logs;

CREATE POLICY "Users can insert own activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5. Remove activity_logs from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.activity_logs;

-- 6. Add user-scoped SELECT on activity_logs for non-admins
CREATE POLICY "Users can view own activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);