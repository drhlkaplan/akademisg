
-- 1) Status enum
DO $$ BEGIN
  CREATE TYPE public.join_request_status AS ENUM ('pending','approved','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2) Table
CREATE TABLE IF NOT EXISTS public.course_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  firm_id uuid,
  course_id uuid NOT NULL,
  status public.join_request_status NOT NULL DEFAULT 'pending',
  note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS course_join_requests_pending_unique
  ON public.course_join_requests (user_id, course_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS course_join_requests_status_idx ON public.course_join_requests (status);
CREATE INDEX IF NOT EXISTS course_join_requests_firm_idx ON public.course_join_requests (firm_id);

-- 3) RLS
ALTER TABLE public.course_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own join requests"
  ON public.course_join_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own join requests"
  ON public.course_join_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Users can cancel own pending requests"
  ON public.course_join_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status IN ('pending','cancelled'));

CREATE POLICY "Firm admins can view firm join requests"
  ON public.course_join_requests FOR SELECT
  TO authenticated
  USING (firm_id IS NOT NULL AND firm_id = public.get_my_firm_id() AND public.has_role(auth.uid(), 'firm_admin'));

CREATE POLICY "Admins can manage join requests"
  ON public.course_join_requests FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 4) updated_at trigger
DROP TRIGGER IF EXISTS update_course_join_requests_updated_at ON public.course_join_requests;
CREATE TRIGGER update_course_join_requests_updated_at
  BEFORE UPDATE ON public.course_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Approve RPC -- creates enrollment if missing
CREATE OR REPLACE FUNCTION public.approve_join_request(_request_id uuid, _note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req RECORD;
  _enrollment_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT * INTO _req FROM public.course_join_requests WHERE id = _request_id FOR UPDATE;
  IF _req IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF _req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request is not pending';
  END IF;

  -- find existing enrollment (active or pending)
  SELECT id INTO _enrollment_id
  FROM public.enrollments
  WHERE user_id = _req.user_id AND course_id = _req.course_id AND deleted_at IS NULL
  LIMIT 1;

  IF _enrollment_id IS NULL THEN
    INSERT INTO public.enrollments (user_id, course_id, firm_id, status)
    VALUES (_req.user_id, _req.course_id, _req.firm_id, 'pending')
    RETURNING id INTO _enrollment_id;
  END IF;

  UPDATE public.course_join_requests
  SET status = 'approved',
      decided_by = auth.uid(),
      decided_at = now(),
      decision_note = _note,
      updated_at = now()
  WHERE id = _request_id;

  RETURN _enrollment_id;
END;
$$;

-- 6) Reject RPC
CREATE OR REPLACE FUNCTION public.reject_join_request(_request_id uuid, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE public.course_join_requests
  SET status = 'rejected',
      decided_by = auth.uid(),
      decided_at = now(),
      decision_note = _note,
      updated_at = now()
  WHERE id = _request_id AND status = 'pending';
END;
$$;
