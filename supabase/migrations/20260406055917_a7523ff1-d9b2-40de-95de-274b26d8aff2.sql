-- Add qr_token to sessions for secure QR-based attendance
ALTER TABLE public.face_to_face_sessions
ADD COLUMN IF NOT EXISTS qr_token uuid DEFAULT gen_random_uuid();

-- Add tracking fields to attendance
ALTER TABLE public.face_to_face_attendance
ADD COLUMN IF NOT EXISTS join_method text DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS ip_address text,
ADD COLUMN IF NOT EXISTS user_agent text;

-- Populate qr_token for existing sessions
UPDATE public.face_to_face_sessions SET qr_token = gen_random_uuid() WHERE qr_token IS NULL;

-- Create index on qr_token for fast lookup
CREATE INDEX IF NOT EXISTS idx_f2f_sessions_qr_token ON public.face_to_face_sessions(qr_token);

-- Auto-generate qr_token on new session creation
CREATE OR REPLACE FUNCTION public.auto_generate_qr_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.qr_token IS NULL THEN
    NEW.qr_token := gen_random_uuid();
  END IF;
  IF NEW.attendance_code IS NULL THEN
    NEW.attendance_code := upper(substr(md5(random()::text), 1, 6));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_qr_token ON public.face_to_face_sessions;
CREATE TRIGGER trg_auto_qr_token
BEFORE INSERT ON public.face_to_face_sessions
FOR EACH ROW EXECUTE FUNCTION public.auto_generate_qr_token();
