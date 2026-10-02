CREATE OR REPLACE FUNCTION public.get_exam_questions_for_student(_exam_id uuid)
RETURNS TABLE(id uuid, exam_id uuid, question_text text, question_type question_type, options jsonb, points integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF NOT public.is_admin(auth.uid()) AND NOT EXISTS (
    SELECT 1 FROM exams e JOIN enrollments en ON en.course_id = e.course_id
    WHERE e.id = _exam_id AND en.user_id = auth.uid() AND en.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Not enrolled';
  END IF;
  RETURN QUERY SELECT q.id, q.exam_id, q.question_text, q.question_type, q.options, q.points
    FROM questions q WHERE q.exam_id = _exam_id ORDER BY q.created_at;
END $$;
REVOKE ALL ON FUNCTION public.get_exam_questions_for_student(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_exam_questions_for_student(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.redistribute_exam_points(_exam_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int; base int; rem int;
BEGIN
  SELECT count(*) INTO n FROM questions WHERE exam_id = _exam_id;
  IF n = 0 THEN RETURN; END IF;
  base := 100 / n; rem := 100 - base * n;
  UPDATE questions q SET points = base + CASE WHEN r.rn <= rem THEN 1 ELSE 0 END
  FROM (SELECT id, row_number() OVER (ORDER BY created_at, id) rn FROM questions WHERE exam_id = _exam_id) r
  WHERE q.id = r.id AND q.points IS DISTINCT FROM base + CASE WHEN r.rn <= rem THEN 1 ELSE 0 END;
END $$;
REVOKE ALL ON FUNCTION public.redistribute_exam_points(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_redistribute_exam_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NULL; END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN PERFORM public.redistribute_exam_points(NEW.exam_id); END IF;
  IF TG_OP IN ('DELETE','UPDATE') AND (TG_OP='DELETE' OR OLD.exam_id <> NEW.exam_id) THEN PERFORM public.redistribute_exam_points(OLD.exam_id); END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS questions_redistribute_points ON public.questions;
CREATE TRIGGER questions_redistribute_points AFTER INSERT OR DELETE OR UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.trg_redistribute_exam_points();

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT DISTINCT exam_id FROM public.questions LOOP PERFORM public.redistribute_exam_points(r.exam_id); END LOOP;
END $$;