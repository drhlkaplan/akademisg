
-- 1. Yeni enum: lesson_type
DO $$ BEGIN
    CREATE TYPE public.lesson_type AS ENUM ('scorm', 'exam', 'live', 'content');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. firm_admin rolünü app_role enum'a ekle
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'firm_admin';

-- 3. lessons tablosu
CREATE TABLE IF NOT EXISTS public.lessons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title text NOT NULL,
    type public.lesson_type NOT NULL DEFAULT 'content',
    sort_order integer NOT NULL DEFAULT 0,
    duration_minutes integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    scorm_package_id uuid REFERENCES public.scorm_packages(id) ON DELETE SET NULL,
    exam_id uuid REFERENCES public.exams(id) ON DELETE SET NULL,
    content_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_sort_order ON public.lessons(course_id, sort_order);

DROP TRIGGER IF EXISTS update_lessons_updated_at ON public.lessons;
CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON public.lessons
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- 4. groups tablosu
CREATE TABLE IF NOT EXISTS public.groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    group_key text NOT NULL UNIQUE,
    firm_id uuid REFERENCES public.firms(id) ON DELETE SET NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_groups_firm_id ON public.groups(firm_id);
CREATE INDEX IF NOT EXISTS idx_groups_group_key ON public.groups(group_key);

DROP TRIGGER IF EXISTS update_groups_updated_at ON public.groups;
CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON public.groups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- 5. users_to_groups tablosu
CREATE TABLE IF NOT EXISTS public.users_to_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_users_to_groups_user ON public.users_to_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_users_to_groups_group ON public.users_to_groups(group_id);

ALTER TABLE public.users_to_groups ENABLE ROW LEVEL SECURITY;

-- 6. group_courses tablosu
CREATE TABLE IF NOT EXISTS public.group_courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(group_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_group_courses_group ON public.group_courses(group_id);
CREATE INDEX IF NOT EXISTS idx_group_courses_course ON public.group_courses(course_id);

ALTER TABLE public.group_courses ENABLE ROW LEVEL SECURITY;

-- 7. live_sessions tablosu
CREATE TABLE IF NOT EXISTS public.live_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    room_url text NOT NULL,
    room_key text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_lesson ON public.live_sessions(lesson_id);

DROP TRIGGER IF EXISTS update_live_sessions_updated_at ON public.live_sessions;
CREATE TRIGGER update_live_sessions_updated_at
    BEFORE UPDATE ON public.live_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- 8. live_session_tracking tablosu
CREATE TABLE IF NOT EXISTS public.live_session_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    live_session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    joined_at timestamptz NOT NULL DEFAULT now(),
    left_at timestamptz,
    duration_seconds integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lst_session ON public.live_session_tracking(live_session_id);
CREATE INDEX IF NOT EXISTS idx_lst_user ON public.live_session_tracking(user_id);

ALTER TABLE public.live_session_tracking ENABLE ROW LEVEL SECURITY;

-- 9. lesson_progress tablosuna lesson_id ekle
ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.lesson_progress(lesson_id);

-- 10. RLS POLİTİKALARI (tüm tablolar oluşturulduktan sonra)

-- lessons
CREATE POLICY "Admins can manage lessons" ON public.lessons
    FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Anyone can view active lessons" ON public.lessons
    FOR SELECT TO authenticated USING (is_active = true);

-- groups
CREATE POLICY "Admins can manage groups" ON public.groups
    FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view own groups" ON public.groups
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users_to_groups utg WHERE utg.group_id = groups.id AND utg.user_id = auth.uid())
    );

-- users_to_groups
CREATE POLICY "Admins can manage user groups" ON public.users_to_groups
    FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view own group memberships" ON public.users_to_groups
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can join groups" ON public.users_to_groups
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- group_courses
CREATE POLICY "Admins can manage group courses" ON public.group_courses
    FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view own group courses" ON public.group_courses
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users_to_groups utg WHERE utg.group_id = group_courses.group_id AND utg.user_id = auth.uid())
    );

-- live_sessions
CREATE POLICY "Admins can manage live sessions" ON public.live_sessions
    FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Enrolled users can view active live sessions" ON public.live_sessions
    FOR SELECT TO authenticated USING (
        is_active = true AND EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.enrollments e ON e.course_id = l.course_id
            WHERE l.id = live_sessions.lesson_id AND e.user_id = auth.uid()
              AND e.status IN ('active', 'pending')
        )
    );

-- live_session_tracking
CREATE POLICY "Admins can manage tracking" ON public.live_session_tracking
    FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can manage own tracking" ON public.live_session_tracking
    FOR ALL TO authenticated USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
