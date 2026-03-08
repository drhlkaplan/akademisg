
CREATE TABLE public.certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  header_text text DEFAULT 'İŞ SAĞLIĞI VE GÜVENLİĞİ EĞİTİM SERTİFİKASI',
  body_text text DEFAULT 'Bu belge, {holder_name} adlı kişinin {course_title} eğitimini başarıyla tamamladığını belgeler.',
  footer_text text DEFAULT 'Bu sertifika {issue_date} tarihinde düzenlenmiştir ve {expiry_date} tarihine kadar geçerlidir.',
  logo_url text,
  background_color text DEFAULT '#1a2744',
  accent_color text DEFAULT '#f97316',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage templates" ON public.certificate_templates
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view templates" ON public.certificate_templates
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.courses ADD COLUMN auto_certificate boolean DEFAULT true;
ALTER TABLE public.courses ADD COLUMN certificate_template_id uuid REFERENCES public.certificate_templates(id) ON DELETE SET NULL;

ALTER TABLE public.certificates ADD COLUMN template_id uuid REFERENCES public.certificate_templates(id) ON DELETE SET NULL;

INSERT INTO public.certificate_templates (name, description, is_default) VALUES
  ('Varsayılan ISG Sertifikası', 'Standart İSG eğitim sertifika şablonu', true);

CREATE TRIGGER update_certificate_templates_updated_at
  BEFORE UPDATE ON public.certificate_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
