
-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.training_type_enum AS ENUM (
    'ise_baslama', 'temel', 'tekrar', 'bilgi_yenileme',
    'ilave', 'ozel_grup', 'destek_elemani', 'calisan_temsilcisi'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.lesson_delivery_method AS ENUM (
    'scorm', 'bbb_live', 'face_to_face', 'hybrid'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.attendance_status_enum AS ENUM (
    'pending', 'attended', 'absent', 'late',
    'partially_attended', 'trainer_verified', 'admin_verified'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.f2f_session_status AS ENUM (
    'scheduled', 'in_progress', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.document_type_enum AS ENUM (
    'temel_egitim_belgesi', 'tekrar_egitim_belgesi',
    'ise_baslama_kaydi', 'bilgi_yenileme_kaydi',
    'yuz_yuze_katilim_tutanagi', 'faaliyet_raporu',
    'sinav_sonuc_belgesi'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.hazard_class_enum AS ENUM (
    'az_tehlikeli', 'tehlikeli', 'cok_tehlikeli'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- NEW TABLES
-- ============================================================

-- Training Types
CREATE TABLE IF NOT EXISTS public.training_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code training_type_enum NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  min_duration_hours NUMERIC,
  requires_exam BOOLEAN DEFAULT false,
  requires_face_to_face BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.training_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage training_types" ON public.training_types FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can view active training_types" ON public.training_types FOR SELECT TO authenticated USING (is_active = true);

-- Sectors
CREATE TABLE IF NOT EXISTS public.sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  default_hazard_class hazard_class_enum DEFAULT 'az_tehlikeli',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sectors" ON public.sectors FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can view active sectors" ON public.sectors FOR SELECT TO authenticated USING (is_active = true);

-- Sub-sectors
CREATE TABLE IF NOT EXISTS public.sub_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hazard_class_override hazard_class_enum,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sub_sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sub_sectors" ON public.sub_sectors FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can view sub_sectors" ON public.sub_sectors FOR SELECT TO authenticated USING (true);

-- Workplace Types
CREATE TABLE IF NOT EXISTS public.workplace_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sector_id UUID REFERENCES public.sectors(id),
  hazard_class hazard_class_enum NOT NULL DEFAULT 'az_tehlikeli',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.workplace_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage workplace_types" ON public.workplace_types FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can view workplace_types" ON public.workplace_types FOR SELECT TO authenticated USING (true);

-- Topic 4 Sector Packs
CREATE TABLE IF NOT EXISTS public.topic4_sector_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID REFERENCES public.sectors(id),
  hazard_class hazard_class_enum NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content_url TEXT,
  scorm_package_id UUID REFERENCES public.scorm_packages(id),
  duration_minutes INTEGER DEFAULT 120,
  key_hazards JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.topic4_sector_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage topic4_sector_packs" ON public.topic4_sector_packs FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can view active topic4_packs" ON public.topic4_sector_packs FOR SELECT TO authenticated USING (is_active = true);

-- Company Topic 4 Assignments
CREATE TABLE IF NOT EXISTS public.company_topic4_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  topic4_pack_id UUID NOT NULL REFERENCES public.topic4_sector_packs(id),
  custom_content_url TEXT,
  custom_risk_data JSONB,
  assigned_by UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(firm_id, topic4_pack_id)
);
ALTER TABLE public.company_topic4_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage company_topic4" ON public.company_topic4_assignments FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Firm admins can view own topic4" ON public.company_topic4_assignments FOR SELECT TO authenticated USING (firm_id = get_my_firm_id() AND has_role(auth.uid(), 'firm_admin'::app_role));

-- Course Template Rules
CREATE TABLE IF NOT EXISTS public.course_template_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  training_type training_type_enum NOT NULL,
  hazard_class hazard_class_enum NOT NULL,
  min_total_hours NUMERIC NOT NULL DEFAULT 8,
  min_topic4_hours NUMERIC NOT NULL DEFAULT 2,
  topic4_method lesson_delivery_method NOT NULL DEFAULT 'scorm',
  recurrence_months INTEGER,
  passing_score INTEGER DEFAULT 60,
  max_exam_attempts INTEGER DEFAULT 3,
  requires_pre_assessment BOOLEAN DEFAULT true,
  requires_final_assessment BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id)
);
ALTER TABLE public.course_template_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage course_template_rules" ON public.course_template_rules FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can view course_template_rules" ON public.course_template_rules FOR SELECT TO authenticated USING (true);

-- Lesson Method Rules
CREATE TABLE IF NOT EXISTS public.lesson_method_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  allowed_methods lesson_delivery_method[] NOT NULL DEFAULT '{scorm}',
  required_method lesson_delivery_method,
  topic_group INTEGER CHECK (topic_group BETWEEN 1 AND 4),
  min_duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lesson_id)
);
ALTER TABLE public.lesson_method_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lesson_method_rules" ON public.lesson_method_rules FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can view lesson_method_rules" ON public.lesson_method_rules FOR SELECT TO authenticated USING (true);

-- Face-to-Face Sessions
CREATE TABLE IF NOT EXISTS public.face_to_face_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id),
  course_id UUID REFERENCES public.courses(id),
  trainer_id UUID,
  firm_id UUID REFERENCES public.firms(id),
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT NOT NULL,
  capacity INTEGER DEFAULT 30,
  attendance_code TEXT,
  status f2f_session_status DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.face_to_face_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage f2f_sessions" ON public.face_to_face_sessions FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Trainers can view own f2f_sessions" ON public.face_to_face_sessions FOR SELECT TO authenticated USING (trainer_id = auth.uid());
CREATE POLICY "Firm admins can view firm f2f_sessions" ON public.face_to_face_sessions FOR SELECT TO authenticated USING (firm_id = get_my_firm_id() AND has_role(auth.uid(), 'firm_admin'::app_role));
CREATE POLICY "Enrolled users can view f2f_sessions" ON public.face_to_face_sessions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN lessons l ON l.course_id = e.course_id
    WHERE l.id = face_to_face_sessions.lesson_id
    AND e.user_id = auth.uid()
    AND e.status IN ('active', 'pending')
  )
);

-- Face-to-Face Attendance
CREATE TABLE IF NOT EXISTS public.face_to_face_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.face_to_face_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  enrollment_id UUID REFERENCES public.enrollments(id),
  status attendance_status_enum DEFAULT 'pending',
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  trainer_verified BOOLEAN DEFAULT false,
  admin_verified BOOLEAN DEFAULT false,
  end_of_session_ack BOOLEAN DEFAULT false,
  verification_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);
ALTER TABLE public.face_to_face_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage f2f_attendance" ON public.face_to_face_attendance FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Trainers can manage attendance for own sessions" ON public.face_to_face_attendance FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM face_to_face_sessions s WHERE s.id = face_to_face_attendance.session_id AND s.trainer_id = auth.uid())
);
CREATE POLICY "Users can view own attendance" ON public.face_to_face_attendance FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Recurrence Rules
CREATE TABLE IF NOT EXISTS public.recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES public.enrollments(id),
  user_id UUID NOT NULL,
  course_id UUID REFERENCES public.courses(id),
  hazard_class hazard_class_enum NOT NULL,
  training_type training_type_enum NOT NULL DEFAULT 'temel',
  completed_at TIMESTAMPTZ,
  next_due_at TIMESTAMPTZ NOT NULL,
  recurrence_months INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.recurrence_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage recurrence_rules" ON public.recurrence_rules FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Users can view own recurrence" ON public.recurrence_rules FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Workplace Change Records
CREATE TABLE IF NOT EXISTS public.workplace_change_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  previous_firm_id UUID REFERENCES public.firms(id),
  new_firm_id UUID REFERENCES public.firms(id),
  previous_hazard_class hazard_class_enum,
  new_hazard_class hazard_class_enum,
  change_date DATE NOT NULL,
  requires_topic4_update BOOLEAN DEFAULT true,
  requires_ise_baslama BOOLEAN DEFAULT true,
  assigned_courses JSONB,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.workplace_change_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage workplace_changes" ON public.workplace_change_records FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Users can view own changes" ON public.workplace_change_records FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Absence Renewal Records
CREATE TABLE IF NOT EXISTS public.absence_renewal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  firm_id UUID REFERENCES public.firms(id),
  absence_start DATE NOT NULL,
  absence_end DATE NOT NULL,
  absence_days INTEGER,
  reason TEXT,
  requires_bilgi_yenileme BOOLEAN DEFAULT true,
  assigned_course_id UUID REFERENCES public.courses(id),
  status TEXT DEFAULT 'pending',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.absence_renewal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage absence_records" ON public.absence_renewal_records FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Users can view own absence" ON public.absence_renewal_records FOR SELECT TO authenticated USING (user_id = auth.uid());

-- FAQ Items
CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT DEFAULT 'genel',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage faq_items" ON public.faq_items FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can view active faq" ON public.faq_items FOR SELECT USING (is_active = true);

-- Homepage Content Blocks
CREATE TABLE IF NOT EXISTS public.homepage_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_type TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  content TEXT,
  image_url TEXT,
  cta_text TEXT,
  cta_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.homepage_content_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage homepage_blocks" ON public.homepage_content_blocks FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can view active blocks" ON public.homepage_content_blocks FOR SELECT USING (is_active = true);

-- Document Templates
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type document_type_enum NOT NULL,
  name TEXT NOT NULL,
  template_html TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage doc_templates" ON public.document_templates FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Anyone can view active doc_templates" ON public.document_templates FOR SELECT TO authenticated USING (is_active = true);

-- Generated Documents
CREATE TABLE IF NOT EXISTS public.generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type document_type_enum NOT NULL,
  template_id UUID REFERENCES public.document_templates(id),
  user_id UUID NOT NULL,
  enrollment_id UUID REFERENCES public.enrollments(id),
  firm_id UUID REFERENCES public.firms(id),
  document_data JSONB,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage generated_docs" ON public.generated_documents FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Users can view own docs" ON public.generated_documents FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Firm admins can view firm docs" ON public.generated_documents FOR SELECT TO authenticated USING (firm_id = get_my_firm_id() AND has_role(auth.uid(), 'firm_admin'::app_role));

-- Compliance Reports
CREATE TABLE IF NOT EXISTS public.compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES public.firms(id),
  report_type TEXT NOT NULL,
  generated_by UUID,
  report_data JSONB,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage compliance_reports" ON public.compliance_reports FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Firm admins can view own reports" ON public.compliance_reports FOR SELECT TO authenticated USING (firm_id = get_my_firm_id() AND has_role(auth.uid(), 'firm_admin'::app_role));

-- ============================================================
-- ALTER EXISTING TABLES
-- ============================================================

-- firms: add sector, hazard class, workplace type
ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS sector_id UUID REFERENCES public.sectors(id);
ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS hazard_class_new hazard_class_enum DEFAULT 'az_tehlikeli';
ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS workplace_type_id UUID REFERENCES public.workplace_types(id);
ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS risk_profile JSONB DEFAULT '{}'::jsonb;

-- lessons: add topic group and delivery method
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS topic_group INTEGER;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS delivery_method lesson_delivery_method DEFAULT 'scorm';

-- courses: add training type, hazard class, min hours, template flag
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS training_type training_type_enum DEFAULT 'temel';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS hazard_class_new hazard_class_enum;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS min_total_hours NUMERIC;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS legacy_regulation BOOLEAN DEFAULT false;

-- enrollments: add training type and recurrence due
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS training_type training_type_enum;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS recurrence_due_at TIMESTAMPTZ;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_sectors_code ON public.sectors(code);
CREATE INDEX IF NOT EXISTS idx_topic4_packs_sector ON public.topic4_sector_packs(sector_id);
CREATE INDEX IF NOT EXISTS idx_topic4_packs_hazard ON public.topic4_sector_packs(hazard_class);
CREATE INDEX IF NOT EXISTS idx_company_topic4_firm ON public.company_topic4_assignments(firm_id);
CREATE INDEX IF NOT EXISTS idx_f2f_sessions_lesson ON public.face_to_face_sessions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_f2f_sessions_firm ON public.face_to_face_sessions(firm_id);
CREATE INDEX IF NOT EXISTS idx_f2f_sessions_trainer ON public.face_to_face_sessions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_f2f_sessions_date ON public.face_to_face_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_f2f_attendance_session ON public.face_to_face_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_f2f_attendance_user ON public.face_to_face_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_user ON public.recurrence_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_due ON public.recurrence_rules(next_due_at);
CREATE INDEX IF NOT EXISTS idx_recurrence_status ON public.recurrence_rules(status);
CREATE INDEX IF NOT EXISTS idx_courses_training_type ON public.courses(training_type);
CREATE INDEX IF NOT EXISTS idx_courses_hazard_class ON public.courses(hazard_class_new);
CREATE INDEX IF NOT EXISTS idx_lessons_topic_group ON public.lessons(topic_group);
CREATE INDEX IF NOT EXISTS idx_lessons_delivery_method ON public.lessons(delivery_method);
CREATE INDEX IF NOT EXISTS idx_faq_category ON public.faq_items(category);
CREATE INDEX IF NOT EXISTS idx_faq_sort ON public.faq_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_workplace_changes_user ON public.workplace_change_records(user_id);
CREATE INDEX IF NOT EXISTS idx_absence_user ON public.absence_renewal_records(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_user ON public.generated_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_firm ON public.generated_documents(firm_id);
CREATE INDEX IF NOT EXISTS idx_compliance_firm ON public.compliance_reports(firm_id);
