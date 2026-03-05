
-- 1. Create a view for students that excludes correct_answer
CREATE VIEW public.questions_for_students AS
SELECT id, exam_id, question_text, question_type, options, points
FROM public.questions;

-- Grant access
GRANT SELECT ON public.questions_for_students TO authenticated;
GRANT SELECT ON public.questions_for_students TO anon;

-- 2. Remove the student INSERT policy on exam_results
DROP POLICY IF EXISTS "Users can insert own results" ON public.exam_results;

-- 3. Restrict enrollment UPDATE policy: students can only update progress-related fields
DROP POLICY IF EXISTS "Users can update own enrollment progress" ON public.enrollments;

CREATE POLICY "Users can update own enrollment progress"
ON public.enrollments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status IN ('pending', 'active')
);
