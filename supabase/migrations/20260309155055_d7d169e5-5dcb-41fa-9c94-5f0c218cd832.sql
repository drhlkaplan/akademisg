
CREATE OR REPLACE FUNCTION public.complete_enrollment(_enrollment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _owner_id uuid;
  _course_id uuid;
  _current_status enrollment_status;
  _all_lessons integer;
  _completed_lessons integer;
BEGIN
  SELECT user_id, course_id, status INTO _owner_id, _course_id, _current_status
  FROM enrollments WHERE id = _enrollment_id;

  IF _owner_id IS NULL OR _owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _current_status NOT IN ('pending', 'active') THEN
    RAISE EXCEPTION 'Enrollment already finalized';
  END IF;

  -- Verify all active lessons are actually completed
  SELECT count(*) INTO _all_lessons
  FROM lessons WHERE course_id = _course_id AND is_active = true;

  SELECT count(*) INTO _completed_lessons
  FROM lesson_progress lp
  JOIN lessons l ON l.id = lp.lesson_id
  WHERE lp.enrollment_id = _enrollment_id
    AND l.course_id = _course_id
    AND l.is_active = true
    AND lp.lesson_status IN ('completed', 'passed');

  IF _completed_lessons < _all_lessons THEN
    RAISE EXCEPTION 'Not all lessons completed';
  END IF;

  UPDATE enrollments
  SET status = 'completed',
      progress_percent = 100,
      completed_at = now(),
      updated_at = now()
  WHERE id = _enrollment_id;
END;
$$;
