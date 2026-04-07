-- Drop the existing trainer INSERT policy
DROP POLICY IF EXISTS "Trainers can insert attendance for own sessions" ON public.face_to_face_attendance;

-- Recreate with enrollment check
CREATE POLICY "Trainers can insert attendance for own sessions"
  ON public.face_to_face_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM face_to_face_sessions s
      WHERE s.id = face_to_face_attendance.session_id
        AND s.trainer_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM enrollments e
      JOIN face_to_face_sessions s ON s.course_id = e.course_id
      WHERE s.id = face_to_face_attendance.session_id
        AND e.user_id = face_to_face_attendance.user_id
        AND e.status IN ('active', 'pending')
        AND e.deleted_at IS NULL
    )
  );