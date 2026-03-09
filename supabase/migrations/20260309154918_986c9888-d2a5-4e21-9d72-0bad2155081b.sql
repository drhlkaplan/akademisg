
-- 1. Fix enrollments: restrict student UPDATE to safe fields only
DROP POLICY IF EXISTS "Users can update own enrollment progress" ON public.enrollments;

CREATE OR REPLACE FUNCTION public.update_enrollment_progress(
  _enrollment_id uuid,
  _progress_percent integer,
  _status text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _current_status enrollment_status;
  _owner_id uuid;
BEGIN
  SELECT user_id, status INTO _owner_id, _current_status
  FROM enrollments WHERE id = _enrollment_id;
  IF _owner_id IS NULL OR _owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF _current_status NOT IN ('pending', 'active') THEN
    RAISE EXCEPTION 'Cannot update a completed/failed/expired enrollment';
  END IF;
  IF _progress_percent < 0 OR _progress_percent > 100 THEN
    RAISE EXCEPTION 'Invalid progress value';
  END IF;
  IF _status IS NOT NULL AND _status NOT IN ('active') THEN
    RAISE EXCEPTION 'Invalid status transition';
  END IF;
  UPDATE enrollments
  SET progress_percent = _progress_percent,
      status = COALESCE(_status::enrollment_status, status),
      started_at = CASE WHEN started_at IS NULL THEN now() ELSE started_at END,
      updated_at = now()
  WHERE id = _enrollment_id;
END;
$$;

-- 2. Fix lesson_progress: remove INSERT/UPDATE/DELETE for students
DROP POLICY IF EXISTS "Users can manage own progress" ON public.lesson_progress;

CREATE POLICY "Users can view own progress"
ON public.lesson_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.id = lesson_progress.enrollment_id AND e.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.record_lesson_progress(
  _enrollment_id uuid,
  _lesson_id uuid,
  _lesson_status text,
  _score_raw numeric DEFAULT NULL,
  _lesson_location text DEFAULT NULL,
  _suspend_data text DEFAULT NULL,
  _total_time integer DEFAULT NULL,
  _scorm_package_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _owner_id uuid;
  _result_id uuid;
  _current_status text;
BEGIN
  SELECT user_id INTO _owner_id FROM enrollments WHERE id = _enrollment_id;
  IF _owner_id IS NULL OR _owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF _lesson_status NOT IN ('not attempted', 'incomplete', 'completed', 'passed', 'failed', 'browsed') THEN
    RAISE EXCEPTION 'Invalid lesson status';
  END IF;
  SELECT lesson_status INTO _current_status
  FROM lesson_progress
  WHERE enrollment_id = _enrollment_id AND lesson_id = _lesson_id;
  IF _current_status = 'completed' AND _lesson_status != 'completed' THEN
    _lesson_status := 'completed';
  END IF;
  INSERT INTO lesson_progress (
    enrollment_id, lesson_id, lesson_status, score_raw,
    lesson_location, suspend_data, total_time, scorm_package_id
  )
  VALUES (
    _enrollment_id, _lesson_id, _lesson_status, _score_raw,
    _lesson_location, _suspend_data, _total_time, _scorm_package_id
  )
  ON CONFLICT (enrollment_id, lesson_id)
  DO UPDATE SET
    lesson_status = EXCLUDED.lesson_status,
    score_raw = COALESCE(EXCLUDED.score_raw, lesson_progress.score_raw),
    lesson_location = COALESCE(EXCLUDED.lesson_location, lesson_progress.lesson_location),
    suspend_data = COALESCE(EXCLUDED.suspend_data, lesson_progress.suspend_data),
    total_time = COALESCE(EXCLUDED.total_time, lesson_progress.total_time),
    updated_at = now()
  RETURNING id INTO _result_id;
  RETURN _result_id;
END;
$$;

-- 3. Fix live_session_tracking: restrict student access
DROP POLICY IF EXISTS "Users can manage own tracking" ON public.live_session_tracking;

CREATE POLICY "Users can view own tracking"
ON public.live_session_tracking
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.join_live_session(
  _live_session_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _tracking_id uuid;
  _session_active boolean;
BEGIN
  SELECT is_active INTO _session_active
  FROM live_sessions WHERE id = _live_session_id;
  IF _session_active IS NULL OR _session_active = false THEN
    RAISE EXCEPTION 'Session not found or inactive';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM live_sessions ls
    JOIN lessons l ON l.id = ls.lesson_id
    JOIN enrollments e ON e.course_id = l.course_id
    WHERE ls.id = _live_session_id
      AND e.user_id = _user_id
      AND e.status IN ('active', 'pending')
  ) THEN
    RAISE EXCEPTION 'Not enrolled in this course';
  END IF;
  INSERT INTO live_session_tracking (live_session_id, user_id, joined_at)
  VALUES (_live_session_id, _user_id, now())
  RETURNING id INTO _tracking_id;
  RETURN _tracking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_live_session(
  _tracking_id uuid,
  _duration_seconds integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _owner_id uuid;
BEGIN
  SELECT user_id INTO _owner_id
  FROM live_session_tracking WHERE id = _tracking_id;
  IF _owner_id IS NULL OR _owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE live_session_tracking
  SET left_at = now(),
      duration_seconds = _duration_seconds
  WHERE id = _tracking_id;
END;
$$;
