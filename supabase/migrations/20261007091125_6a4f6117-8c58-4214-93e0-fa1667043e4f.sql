ALTER TABLE public.certificate_templates
  ADD COLUMN IF NOT EXISTS layout text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_contact text,
  ADD COLUMN IF NOT EXISTS legal_text text,
  ADD COLUMN IF NOT EXISTS delivery_method text DEFAULT 'Uzaktan Eğitim',
  ADD COLUMN IF NOT EXISTS trainer1_name text,
  ADD COLUMN IF NOT EXISTS trainer1_title text,
  ADD COLUMN IF NOT EXISTS trainer2_name text,
  ADD COLUMN IF NOT EXISTS trainer2_title text,
  ADD COLUMN IF NOT EXISTS employer_title text DEFAULT 'İşveren',
  ADD COLUMN IF NOT EXISTS use_firm_logo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS topics jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title text;

CREATE OR REPLACE FUNCTION public.get_certificate_print_data(_certificate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  c record; e record; p record; f record; t record; co record;
  my_firm uuid;
BEGIN
  SELECT * INTO c FROM certificates WHERE id = _certificate_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO p FROM profiles WHERE user_id = c.user_id LIMIT 1;
  SELECT * INTO e FROM enrollments WHERE id = c.enrollment_id;

  IF NOT (auth.uid() = c.user_id OR public.is_admin(auth.uid())) THEN
    my_firm := public.get_my_firm_id();
    IF my_firm IS NULL OR my_firm IS DISTINCT FROM COALESCE(e.firm_id, p.firm_id)
       OR NOT (public.has_role(auth.uid(),'firm_admin') OR public.has_role(auth.uid(),'company_admin')) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  SELECT * INTO f FROM firms WHERE id = COALESCE(e.firm_id, p.firm_id);
  SELECT * INTO co FROM courses WHERE id = c.course_id;
  SELECT * INTO t FROM certificate_templates
   WHERE id = COALESCE(c.template_id, co.certificate_template_id)
      OR (c.template_id IS NULL AND co.certificate_template_id IS NULL AND is_default = true)
   ORDER BY (id = COALESCE(c.template_id, co.certificate_template_id)) DESC NULLS LAST
   LIMIT 1;

  RETURN jsonb_build_object(
    'certificate', to_jsonb(c),
    'holder', jsonb_build_object('first_name', p.first_name, 'last_name', p.last_name,
                                 'tc_identity', p.tc_identity, 'job_title', p.job_title),
    'enrollment', jsonb_build_object('started_at', COALESCE(e.started_at, e.created_at), 'completed_at', e.completed_at),
    'firm', CASE WHEN f.id IS NULL THEN NULL ELSE jsonb_build_object('name', f.name, 'logo_url', f.logo_url, 'address', f.address, 'phone', f.phone) END,
    'course', jsonb_build_object('title', co.title, 'duration_minutes', co.duration_minutes),
    'template', CASE WHEN t.id IS NULL THEN NULL ELSE to_jsonb(t) END
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_certificate_print_data(uuid) TO authenticated;