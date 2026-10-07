CREATE TABLE public.firm_quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_no text NOT NULL UNIQUE,
  firm_id uuid REFERENCES public.firms(id),
  firm_name text NOT NULL,
  hazard_class text NOT NULL,
  usage_type text NOT NULL,
  employees integer NOT NULL,
  unit_price numeric NOT NULL,
  discount numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL,
  exchange_rate numeric NOT NULL,
  net_usd numeric NOT NULL,
  total_usd numeric NOT NULL,
  total_try numeric NOT NULL,
  valid_until date,
  notes text,
  status text NOT NULL DEFAULT 'sent',
  html text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.firm_quotes TO authenticated;
GRANT ALL ON public.firm_quotes TO service_role;
ALTER TABLE public.firm_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage quotes" ON public.firm_quotes FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER update_firm_quotes_updated_at BEFORE UPDATE ON public.firm_quotes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();