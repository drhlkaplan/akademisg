
-- Helper: check if Topic 4 face-to-face attendance is satisfied for an enrollment
CREATE OR REPLACE FUNCTION public.check_topic4_f2f_completion(
  _enrollment_id uuid,
  _course_id uuid,
  _hazard_class hazard_class_enum
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _topic4_lesson RECORD;
  _has_attendance boolean;
BEGIN
  -- Only enforce for tehlikeli and cok_tehlikeli
  IF _hazard_class NOT IN ('tehlikeli', 'cok_tehlikeli') THEN
    RETURN true;
  END IF;

  -- Check each active Topic 4 lesson
  FOR _topic4_lesson IN
    SELECT l.id as lesson_id
    FROM lessons l
    WHERE l.course_id = _course_id
      AND l.topic_group = 4
      AND l.is_active = true
      AND l.deleted_at IS NULL
  LOOP
    -- Check if there's a face-to-face attendance record with status 'attended'
    SELECT EXISTS (
      SELECT 1
      FROM face_to_face_attendance fa
      JOIN face_to_face_sessions fs ON fs.id = fa.session_id
      WHERE fs.lesson_id = _topic4_lesson.lesson_id
        AND fa.enrollment_id = _enrollment_id
        AND fa.status = 'attended'
    ) INTO _has_attendance;

    IF NOT _has_attendance THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

-- Updated complete_enrollment with hybrid validation
CREATE OR REPLACE FUNCTION public.complete_enrollment(_enrollment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id uuid;
  _course_id uuid;
  _current_status enrollment_status;
  _all_lessons integer;
  _completed_lessons integer;
  _hazard_class hazard_class_enum;
  _training_type training_type_enum;
  _rule RECORD;
  _best_score numeric;
  _recurrence_months integer;
BEGIN
  SELECT user_id, course_id, status INTO _owner_id, _course_id, _current_status
  FROM enrollments WHERE id = _enrollment_id;

  IF _owner_id IS NULL OR _owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _current_status NOT IN ('pending', 'active') THEN
    RAISE EXCEPTION 'Enrollment already finalized';
  END IF;

  -- Get course hazard class and training type
  SELECT hazard_class_new, training_type INTO _hazard_class, _training_type
  FROM courses WHERE id = _course_id;

  -- Verify all active lessons are completed
  SELECT count(*) INTO _all_lessons
  FROM lessons WHERE course_id = _course_id AND is_active = true AND deleted_at IS NULL;

  SELECT count(*) INTO _completed_lessons
  FROM lesson_progress lp
  JOIN lessons l ON l.id = lp.lesson_id
  WHERE lp.enrollment_id = _enrollment_id
    AND l.course_id = _course_id
    AND l.is_active = true
    AND l.deleted_at IS NULL
    AND lp.lesson_status IN ('completed', 'passed');

  IF _completed_lessons < _all_lessons THEN
    RAISE EXCEPTION 'Not all lessons completed';
  END IF;

  -- Validate Topic 4 face-to-face attendance for hazardous classes
  IF _hazard_class IS NOT NULL THEN
    IF NOT check_topic4_f2f_completion(_enrollment_id, _course_id, _hazard_class) THEN
      RAISE EXCEPTION 'Topic 4 face-to-face attendance not completed for hazardous class';
    END IF;
  END IF;

  -- Check course template rules for exam requirements
  SELECT * INTO _rule
  FROM course_template_rules
  WHERE course_id = _course_id
  LIMIT 1;

  IF _rule IS NOT NULL AND _rule.requires_final_assessment = true THEN
    -- Check if final exam passed with minimum score
    SELECT MAX(er.score) INTO _best_score
    FROM exam_results er
    JOIN exams e ON e.id = er.exam_id
    WHERE e.course_id = _course_id
      AND er.enrollment_id = _enrollment_id
      AND er.user_id = _owner_id
      AND e.exam_type = 'final'
      AND e.deleted_at IS NULL;

    IF _best_score IS NULL OR _best_score < COALESCE(_rule.passing_score, 60) THEN
      RAISE EXCEPTION 'Final exam not passed with required score (min: %)', COALESCE(_rule.passing_score, 60);
    END IF;
  END IF;

  -- Complete the enrollment
  UPDATE enrollments
  SET status = 'completed',
      progress_percent = 100,
      completed_at = now(),
      updated_at = now()
  WHERE id = _enrollment_id;

  -- Auto-create recurrence rule based on hazard class
  IF _hazard_class IS NOT NULL AND _training_type IS NOT NULL THEN
    _recurrence_months := CASE
      WHEN _training_type IN ('temel', 'tekrar') THEN
        CASE _hazard_class
          WHEN 'az_tehlikeli' THEN 36
          WHEN 'tehlikeli' THEN 24
          WHEN 'cok_tehlikeli' THEN 12
          ELSE NULL
        END
      ELSE NULL
    END;

    IF _recurrence_months IS NOT NULL THEN
      INSERT INTO recurrence_rules (
        user_id, course_id, enrollment_id,
        hazard_class, training_type,
        recurrence_months, next_due_at, status
      )
      VALUES (
        _owner_id, _course_id, _enrollment_id,
        _hazard_class, _training_type,
        _recurrence_months,
        now() + (_recurrence_months || ' months')::interval,
        'active'
      )
      ON CONFLICT DO NOTHING;

      -- Also set recurrence_due_at on enrollment
      UPDATE enrollments
      SET recurrence_due_at = now() + (_recurrence_months || ' months')::interval
      WHERE id = _enrollment_id;
    END IF;
  END IF;
END;
$$;
