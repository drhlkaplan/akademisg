ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS audio_url text;
DROP FUNCTION IF EXISTS public.get_exam_questions_for_student(uuid);
CREATE FUNCTION public.get_exam_questions_for_student(_exam_id uuid)
RETURNS TABLE(id uuid, exam_id uuid, question_text text, question_type question_type, options jsonb, points integer, audio_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF NOT public.is_admin(auth.uid()) AND NOT EXISTS (
    SELECT 1 FROM exams e JOIN enrollments en ON en.course_id = e.course_id
    WHERE e.id = _exam_id AND en.user_id = auth.uid() AND en.deleted_at IS NULL
  ) THEN RAISE EXCEPTION 'Not enrolled'; END IF;
  RETURN QUERY SELECT q.id, q.exam_id, q.question_text, q.question_type, q.options, q.points, q.audio_url
    FROM questions q WHERE q.exam_id = _exam_id ORDER BY q.created_at;
END $$;
REVOKE ALL ON FUNCTION public.get_exam_questions_for_student(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_exam_questions_for_student(uuid) TO authenticated;
CREATE POLICY "Signed-in users read question audio" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'question-audio');