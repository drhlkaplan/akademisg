
-- scorm_scos: Individual SCOs within a SCORM package
CREATE TABLE public.scorm_scos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.scorm_packages(id) ON DELETE CASCADE,
  identifier text NOT NULL,
  title text NOT NULL,
  launch_path text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  parameters text,
  scorm_type text DEFAULT 'sco',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.scorm_scos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage SCOs" ON public.scorm_scos
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Enrolled users can view SCOs" ON public.scorm_scos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.scorm_packages sp
    JOIN public.enrollments e ON e.course_id = sp.course_id
    WHERE sp.id = scorm_scos.package_id
      AND e.user_id = auth.uid()
      AND e.status IN ('active', 'completed')
  ));

CREATE INDEX idx_scorm_scos_package_id ON public.scorm_scos(package_id);

-- scorm_runtime_data: Granular CMI key/value storage
CREATE TABLE public.scorm_runtime_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  sco_id uuid REFERENCES public.scorm_scos(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  cmi_key text NOT NULL,
  cmi_value text,
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_scorm_runtime_unique 
ON public.scorm_runtime_data (enrollment_id, COALESCE(sco_id, '00000000-0000-0000-0000-000000000000'::uuid), lesson_id, cmi_key);

ALTER TABLE public.scorm_runtime_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all runtime data" ON public.scorm_runtime_data
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own runtime data" ON public.scorm_runtime_data
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = scorm_runtime_data.enrollment_id AND e.user_id = auth.uid()
  ));

CREATE INDEX idx_scorm_runtime_data_enrollment ON public.scorm_runtime_data(enrollment_id, lesson_id);

-- RPC for saving runtime data
CREATE OR REPLACE FUNCTION public.save_scorm_runtime_data(
  _enrollment_id uuid,
  _lesson_id uuid,
  _sco_id uuid DEFAULT NULL,
  _cmi_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _owner_id uuid;
  _key text;
  _value text;
BEGIN
  SELECT user_id INTO _owner_id FROM enrollments WHERE id = _enrollment_id;
  IF _owner_id IS NULL OR _owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  FOR _key, _value IN SELECT key, value::text FROM jsonb_each_text(_cmi_data)
  LOOP
    INSERT INTO scorm_runtime_data (enrollment_id, sco_id, lesson_id, cmi_key, cmi_value)
    VALUES (_enrollment_id, _sco_id, _lesson_id, _key, _value)
    ON CONFLICT (enrollment_id, COALESCE(sco_id, '00000000-0000-0000-0000-000000000000'::uuid), lesson_id, cmi_key)
    DO UPDATE SET cmi_value = EXCLUDED.cmi_value, updated_at = now();
  END LOOP;
END;
$$;

-- Add manifest_data column to scorm_packages
ALTER TABLE public.scorm_packages ADD COLUMN IF NOT EXISTS manifest_data jsonb;
