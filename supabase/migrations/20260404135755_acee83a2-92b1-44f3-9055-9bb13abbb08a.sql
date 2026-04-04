-- 1. Fix attendance_code exposure: create a secure view for students
CREATE OR REPLACE VIEW public.f2f_sessions_student_view
WITH (security_invoker = on)
AS SELECT 
  id, lesson_id, course_id, firm_id, session_date, 
  start_time, end_time, location, status, capacity, 
  trainer_id, notes, created_at, updated_at
FROM public.face_to_face_sessions;

-- 2. Fix activity log tampering: create a SECURITY DEFINER RPC
CREATE OR REPLACE FUNCTION public.log_activity(
  _action text,
  _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate action is not empty
  IF _action IS NULL OR length(trim(_action)) = 0 THEN
    RAISE EXCEPTION 'Action is required';
  END IF;
  
  -- Truncate action to prevent abuse
  _action := left(trim(_action), 100);
  
  -- Truncate entity_type
  IF _entity_type IS NOT NULL THEN
    _entity_type := left(trim(_entity_type), 50);
  END IF;

  INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, _details);
END;
$$;

-- Remove the client-side INSERT policy that allows log tampering
DROP POLICY IF EXISTS "Users can insert own activity logs" ON public.activity_logs;