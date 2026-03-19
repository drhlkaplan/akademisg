
-- ==========================================
-- 1. TC Kimlik Maskeleme Fonksiyonu
-- ==========================================
CREATE OR REPLACE FUNCTION public.mask_tc_identity(tc text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN tc IS NULL OR length(tc) < 5 THEN '***********'
    ELSE left(tc, 3) || '*****' || right(tc, 2)
  END;
$$;

-- ==========================================
-- 2. Soft Delete: deleted_at kolonları
-- ==========================================

-- profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- enrollments
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- firms
ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- exams
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- certificates
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- groups
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- ==========================================
-- 3. Soft Delete Helper Function
-- ==========================================
CREATE OR REPLACE FUNCTION public.soft_delete_record(_table_name text, _record_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;
  
  EXECUTE format('UPDATE public.%I SET deleted_at = now() WHERE id = %L', _table_name, _record_id);
END;
$$;

-- ==========================================
-- 4. Soft Delete RLS: Exclude deleted records for non-admins
-- ==========================================

-- Profiles: update existing view policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Firm admins can view firm profiles" ON public.profiles;
CREATE POLICY "Firm admins can view firm profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (firm_id IS NOT NULL AND firm_id = get_my_firm_id() AND has_role(auth.uid(), 'firm_admin'::app_role) AND deleted_at IS NULL);

-- Courses: update view policy
DROP POLICY IF EXISTS "Anyone can view active courses" ON public.courses;
CREATE POLICY "Anyone can view active courses" ON public.courses
  FOR SELECT TO authenticated
  USING (is_active = true AND deleted_at IS NULL);

-- Enrollments: update view policy
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
CREATE POLICY "Users can view own enrollments" ON public.enrollments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Firms: update view policy
DROP POLICY IF EXISTS "Users can view own firm" ON public.firms;
CREATE POLICY "Users can view own firm" ON public.firms
  FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.firm_id = firms.id)) OR is_admin(auth.uid()) AND deleted_at IS NULL);

-- Exams: update view policy
DROP POLICY IF EXISTS "Enrolled users can view exams" ON public.exams;
CREATE POLICY "Enrolled users can view exams" ON public.exams
  FOR SELECT TO authenticated
  USING (is_active = true AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = exams.course_id AND e.user_id = auth.uid()));

-- Lessons: update view policy
DROP POLICY IF EXISTS "Anyone can view active lessons" ON public.lessons;
CREATE POLICY "Anyone can view active lessons" ON public.lessons
  FOR SELECT TO authenticated
  USING (is_active = true AND deleted_at IS NULL);

-- Groups: update view policy
DROP POLICY IF EXISTS "Users can view own groups" ON public.groups;
CREATE POLICY "Users can view own groups" ON public.groups
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND EXISTS (SELECT 1 FROM users_to_groups utg WHERE utg.group_id = groups.id AND utg.user_id = auth.uid()));
