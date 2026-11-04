ALTER TABLE public.lead_submissions
  ADD COLUMN IF NOT EXISTS notification_status text,
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

CREATE INDEX IF NOT EXISTS lead_submissions_email_created_idx
  ON public.lead_submissions (email, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_submissions_created_idx
  ON public.lead_submissions (created_at DESC);

GRANT ALL ON public.lead_submissions TO service_role;