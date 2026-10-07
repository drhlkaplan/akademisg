CREATE UNIQUE INDEX IF NOT EXISTS lesson_progress_enrollment_lesson_key ON public.lesson_progress (enrollment_id, lesson_id);
DROP INDEX IF EXISTS public.lesson_progress_enrollment_lesson_unique;

-- Backfill: completed pre-assessment lessons for enrollments that took the pre-test but have no progress row
INSERT INTO public.lesson_progress (enrollment_id, lesson_id, lesson_status, score_raw)
SELECT DISTINCT ON (er.enrollment_id, l.id) er.enrollment_id, l.id, 'completed', er.score
FROM public.exam_results er
JOIN public.exams e ON e.id = er.exam_id AND e.exam_type IN ('pre','pre_test')
JOIN public.enrollments en ON en.id = er.enrollment_id
JOIN public.lessons l ON l.exam_id = er.exam_id AND l.course_id = en.course_id AND l.is_active AND l.deleted_at IS NULL
WHERE NOT EXISTS (SELECT 1 FROM public.lesson_progress lp WHERE lp.enrollment_id = er.enrollment_id AND lp.lesson_id = l.id)
ORDER BY er.enrollment_id, l.id, er.created_at DESC
ON CONFLICT (enrollment_id, lesson_id) DO NOTHING;

UPDATE public.lesson_progress lp SET lesson_status = 'completed', updated_at = now()
FROM public.lessons l JOIN public.exams e ON e.id = l.exam_id AND e.exam_type IN ('pre','pre_test')
WHERE lp.lesson_id = l.id AND lp.lesson_status NOT IN ('completed','passed');