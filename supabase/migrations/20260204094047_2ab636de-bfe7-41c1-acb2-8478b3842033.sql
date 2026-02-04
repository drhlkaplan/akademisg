-- =============================================
-- İSG EĞİTİM PLATFORMU VERİTABANI ŞEMASI
-- =============================================

-- 1. ENUM TİPLERİ
-- =============================================

-- Kullanıcı rolleri
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'company_admin', 'student');

-- Tehlike sınıfları
CREATE TYPE public.danger_class AS ENUM ('low', 'medium', 'high');

-- Kayıt durumları
CREATE TYPE public.enrollment_status AS ENUM ('pending', 'active', 'completed', 'failed', 'expired');

-- Sınav durumları
CREATE TYPE public.exam_status AS ENUM ('not_started', 'in_progress', 'completed', 'passed', 'failed');

-- Soru tipleri
CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'true_false');

-- =============================================
-- 2. ANA TABLOLAR
-- =============================================

-- Firmalar
CREATE TABLE public.firms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tax_number TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    sector TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kullanıcı profilleri
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    tc_identity TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kullanıcı rolleri (ayrı tablo - güvenlik için)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Kurs kategorileri (tehlike sınıfları)
CREATE TABLE public.course_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    danger_class danger_class NOT NULL,
    required_hours INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Kurslar
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.course_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- SCORM paketleri
CREATE TABLE public.scorm_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    scorm_version TEXT DEFAULT '1.2',
    package_url TEXT NOT NULL,
    entry_point TEXT DEFAULT 'index.html',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Kayıtlar (enrollments)
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL,
    status enrollment_status DEFAULT 'pending',
    progress_percent INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, course_id)
);

-- Ders ilerleme takibi
CREATE TABLE public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE CASCADE NOT NULL,
    scorm_package_id UUID REFERENCES public.scorm_packages(id) ON DELETE CASCADE,
    lesson_location TEXT,
    suspend_data TEXT,
    total_time INTEGER DEFAULT 0,
    score_raw DECIMAL(5,2),
    score_min DECIMAL(5,2),
    score_max DECIMAL(5,2),
    lesson_status TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sınavlar
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    exam_type TEXT DEFAULT 'final', -- 'pre_test' veya 'final'
    duration_minutes INTEGER DEFAULT 60,
    passing_score INTEGER DEFAULT 70,
    max_attempts INTEGER DEFAULT 3,
    randomize_questions BOOLEAN DEFAULT true,
    question_count INTEGER DEFAULT 20,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sorular
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type question_type DEFAULT 'multiple_choice',
    options JSONB, -- ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı"]
    correct_answer TEXT NOT NULL,
    points INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sınav sonuçları
CREATE TABLE public.exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE CASCADE NOT NULL,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    status exam_status DEFAULT 'completed',
    answers JSONB, -- Kullanıcı cevapları
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ DEFAULT now(),
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sertifikalar
CREATE TABLE public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    certificate_number TEXT UNIQUE NOT NULL,
    holder_name TEXT NOT NULL,
    holder_tc TEXT,
    course_title TEXT NOT NULL,
    danger_class danger_class,
    duration_hours INTEGER,
    issue_date TIMESTAMPTZ DEFAULT now(),
    expiry_date TIMESTAMPTZ,
    pdf_url TEXT,
    qr_code TEXT,
    is_valid BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sistem logları
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 3. ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- =============================================

-- RLS'i etkinleştir
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorm_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Rol kontrol fonksiyonu (SECURITY DEFINER - RLS bypass)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Admin veya süper admin kontrolü
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role IN ('admin', 'super_admin')
    )
$$;

-- PROFILES POLİTİKALARI
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- USER_ROLES POLİTİKALARI
CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- FIRMS POLİTİKALARI
CREATE POLICY "Anyone can view active firms"
    ON public.firms FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Admins can manage firms"
    ON public.firms FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- COURSE_CATEGORIES POLİTİKALARI
CREATE POLICY "Anyone can view categories"
    ON public.course_categories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage categories"
    ON public.course_categories FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- COURSES POLİTİKALARI
CREATE POLICY "Anyone can view active courses"
    ON public.courses FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Admins can manage courses"
    ON public.courses FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- SCORM_PACKAGES POLİTİKALARI
CREATE POLICY "Enrolled users can view packages"
    ON public.scorm_packages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.course_id = scorm_packages.course_id
            AND e.user_id = auth.uid()
            AND e.status IN ('active', 'completed')
        )
        OR public.is_admin(auth.uid())
    );

CREATE POLICY "Admins can manage packages"
    ON public.scorm_packages FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- ENROLLMENTS POLİTİKALARI
CREATE POLICY "Users can view own enrollments"
    ON public.enrollments FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all enrollments"
    ON public.enrollments FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage enrollments"
    ON public.enrollments FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update own enrollment progress"
    ON public.enrollments FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- LESSON_PROGRESS POLİTİKALARI
CREATE POLICY "Users can manage own progress"
    ON public.lesson_progress FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.id = lesson_progress.enrollment_id
            AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all progress"
    ON public.lesson_progress FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- EXAMS POLİTİKALARI
CREATE POLICY "Enrolled users can view exams"
    ON public.exams FOR SELECT
    TO authenticated
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.course_id = exams.course_id
            AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage exams"
    ON public.exams FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- QUESTIONS POLİTİKALARI (sınav esnasında görünür)
CREATE POLICY "Users taking exam can view questions"
    ON public.questions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.exams ex
            JOIN public.enrollments e ON e.course_id = ex.course_id
            WHERE ex.id = questions.exam_id
            AND e.user_id = auth.uid()
            AND e.status = 'active'
        )
    );

CREATE POLICY "Admins can manage questions"
    ON public.questions FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- EXAM_RESULTS POLİTİKALARI
CREATE POLICY "Users can view own results"
    ON public.exam_results FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own results"
    ON public.exam_results FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all results"
    ON public.exam_results FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- CERTIFICATES POLİTİKALARI
CREATE POLICY "Users can view own certificates"
    ON public.certificates FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage certificates"
    ON public.certificates FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- Public sertifika doğrulama için
CREATE POLICY "Anyone can verify certificates by number"
    ON public.certificates FOR SELECT
    TO anon
    USING (is_valid = true);

-- ACTIVITY_LOGS POLİTİKALARI
CREATE POLICY "Admins can view logs"
    ON public.activity_logs FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert logs"
    ON public.activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- =============================================
-- 4. TRİGGERLAR
-- =============================================

-- updated_at trigger fonksiyonu
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tüm tablolara updated_at trigger ekle
CREATE TRIGGER update_firms_updated_at
    BEFORE UPDATE ON public.firms
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
    BEFORE UPDATE ON public.enrollments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at
    BEFORE UPDATE ON public.lesson_progress
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exams_updated_at
    BEFORE UPDATE ON public.exams
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Yeni kullanıcı için otomatik profil ve rol oluşturma
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Profil oluştur
    INSERT INTO public.profiles (user_id, first_name, last_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    
    -- Varsayılan rol ata (student)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 5. BAŞLANGIÇ VERİLERİ
-- =============================================

-- Tehlike sınıfı kategorileri
INSERT INTO public.course_categories (name, danger_class, required_hours, description) VALUES
('Az Tehlikeli İşler', 'low', 8, 'Ofis, perakende, eğitim gibi düşük riskli sektörler için temel İSG eğitimi.'),
('Tehlikeli İşler', 'medium', 12, 'İmalat, lojistik, gıda gibi orta riskli sektörler için kapsamlı İSG eğitimi.'),
('Çok Tehlikeli İşler', 'high', 16, 'Maden, inşaat, kimya gibi yüksek riskli sektörler için ileri düzey İSG eğitimi.');

-- Örnek kurslar
INSERT INTO public.courses (category_id, title, description, duration_minutes, is_active) VALUES
((SELECT id FROM public.course_categories WHERE danger_class = 'low'), 'Temel İş Sağlığı ve Güvenliği Eğitimi', 'İSG mevzuatı, risk değerlendirmesi ve temel güvenlik prensipleri.', 480, true),
((SELECT id FROM public.course_categories WHERE danger_class = 'low'), 'Ofis Ergonomisi ve İSG', 'Ergonomik çalışma ortamı, ekran başı çalışma ve stres yönetimi.', 240, true),
((SELECT id FROM public.course_categories WHERE danger_class = 'medium'), 'Makine Güvenliği ve Risk Değerlendirmesi', 'Makine koruyucuları, kilitleme/etiketleme prosedürleri ve bakım güvenliği.', 720, true),
((SELECT id FROM public.course_categories WHERE danger_class = 'medium'), 'Forklift Operatör Eğitimi', 'Forklift kullanım kuralları, yük taşıma güvenliği ve bakım prosedürleri.', 720, true),
((SELECT id FROM public.course_categories WHERE danger_class = 'high'), 'İnşaat Sektörü İSG Eğitimi', 'Yüksekte çalışma, kazı güvenliği, iskele kullanımı ve kişisel koruyucu donanım.', 960, true),
((SELECT id FROM public.course_categories WHERE danger_class = 'high'), 'Kimyasal Madde Güvenliği', 'MSDS okuma, kimyasal depolama, dökülme müdahalesi ve kişisel korunma.', 960, true);