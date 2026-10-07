CREATE TABLE public.certificate_trainers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('isg_uzmani','isyeri_hekimi','isveren_vekili')),
  full_name text NOT NULL,
  title text,
  certificate_no text,
  phone text,
  email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificate_trainers TO authenticated;
GRANT ALL ON public.certificate_trainers TO service_role;
ALTER TABLE public.certificate_trainers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage trainers" ON public.certificate_trainers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_certificate_trainers_updated BEFORE UPDATE ON public.certificate_trainers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.certificate_templates ADD COLUMN IF NOT EXISTS employer_name text;