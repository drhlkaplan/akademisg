CREATE TABLE public.lead_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  name text NOT NULL,
  company_name text,
  email text NOT NULL,
  phone text,
  subject text,
  employee_count text,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.lead_submissions TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.lead_submissions TO authenticated;
GRANT ALL ON public.lead_submissions TO service_role;
ALTER TABLE public.lead_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit leads" ON public.lead_submissions FOR INSERT TO anon, authenticated
WITH CHECK (source IN ('contact','corporate') AND length(name) BETWEEN 1 AND 100 AND length(email) BETWEEN 3 AND 255
  AND coalesce(length(message),0) <= 1000 AND coalesce(length(company_name),0) <= 100 AND coalesce(length(phone),0) <= 20
  AND coalesce(length(employee_count),0) <= 10 AND coalesce(length(subject),0) <= 30 AND status = 'new');
CREATE POLICY "Admins read leads" ON public.lead_submissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update leads" ON public.lead_submissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete leads" ON public.lead_submissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));