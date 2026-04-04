
-- Drop the overly broad ALL policy for trainers
DROP POLICY IF EXISTS "Trainers can manage attendance for own sessions" ON public.face_to_face_attendance;

-- Create specific SELECT policy for trainers
CREATE POLICY "Trainers can view attendance for own sessions"
ON public.face_to_face_attendance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM face_to_face_sessions s
    WHERE s.id = face_to_face_attendance.session_id AND s.trainer_id = auth.uid()
  )
);

-- Create specific INSERT policy for trainers
CREATE POLICY "Trainers can insert attendance for own sessions"
ON public.face_to_face_attendance
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM face_to_face_sessions s
    WHERE s.id = face_to_face_attendance.session_id AND s.trainer_id = auth.uid()
  )
);

-- Create a SECURITY DEFINER function for trainer attendance updates
-- This prevents trainers from setting admin_verified
CREATE OR REPLACE FUNCTION public.trainer_update_attendance(
  _attendance_id uuid,
  _status attendance_status_enum DEFAULT NULL,
  _check_in_time timestamptz DEFAULT NULL,
  _check_out_time timestamptz DEFAULT NULL,
  _duration_minutes integer DEFAULT NULL,
  _trainer_verified boolean DEFAULT NULL,
  _notes text DEFAULT NULL,
  _verification_method text DEFAULT NULL,
  _end_of_session_ack boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _session_trainer_id uuid;
BEGIN
  -- Verify the caller is the trainer for this attendance's session
  SELECT s.trainer_id INTO _session_trainer_id
  FROM face_to_face_attendance fa
  JOIN face_to_face_sessions s ON s.id = fa.session_id
  WHERE fa.id = _attendance_id;

  IF _session_trainer_id IS NULL OR _session_trainer_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: not the trainer for this session';
  END IF;

  -- Update only allowed fields (explicitly NOT admin_verified)
  UPDATE face_to_face_attendance
  SET
    status = COALESCE(_status, status),
    check_in_time = COALESCE(_check_in_time, check_in_time),
    check_out_time = COALESCE(_check_out_time, check_out_time),
    duration_minutes = COALESCE(_duration_minutes, duration_minutes),
    trainer_verified = COALESCE(_trainer_verified, trainer_verified),
    notes = COALESCE(_notes, notes),
    verification_method = COALESCE(_verification_method, verification_method),
    end_of_session_ack = COALESCE(_end_of_session_ack, end_of_session_ack),
    updated_at = now()
  WHERE id = _attendance_id;
END;
$$;
