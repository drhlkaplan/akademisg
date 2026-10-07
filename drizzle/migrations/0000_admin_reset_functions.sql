CREATE OR REPLACE FUNCTION public.admin_reset_enrollment(_enrollment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Yetkisiz'; END IF;
  DELETE FROM public.scorm_runtime_data WHERE enrollment_id = _enrollment_id;
  DELETE FROM public.lesson_progress WHERE enrollment_id = _enrollment_id;
  DELETE FROM public.exam_results WHERE enrollment_id = _enrollment_id;
  UPDATE public.certificates SET deleted_at = now(), is_valid = false
    WHERE enrollment_id = _enrollment_id AND deleted_at IS NULL;
  UPDATE public.enrollments SET progress_percent = 0, status = 'active',
    started_at = now(), completed_at = NULL, deleted_at = NULL, updated_at = now()
    WHERE id = _enrollment_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_reset_exam(_user_id uuid, _exam_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Yetkisiz'; END IF;
  DELETE FROM public.exam_results WHERE user_id = _user_id AND exam_id = _exam_id;
  DELETE FROM public.lesson_progress lp USING public.lessons l, public.enrollments e
    WHERE lp.lesson_id = l.id AND l.exam_id = _exam_id
      AND lp.enrollment_id = e.id AND e.user_id = _user_id;
END $$;

REVOKE ALL ON FUNCTION public.admin_reset_enrollment(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reset_exam(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_enrollment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_exam(uuid, uuid) TO authenticated;