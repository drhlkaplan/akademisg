
-- 1) Add columns to topic4_sector_packs
ALTER TABLE public.topic4_sector_packs
  ADD COLUMN IF NOT EXISTS lesson_count integer,
  ADD COLUMN IF NOT EXISTS default_delivery_method text DEFAULT 'mixed';

-- Backfill lesson_count from duration_minutes (45 min = 1 ders)
UPDATE public.topic4_sector_packs
SET lesson_count = GREATEST(1, ROUND(duration_minutes::numeric / 45))
WHERE lesson_count IS NULL;

-- 2) New table for pack lesson contents
CREATE TABLE IF NOT EXISTS public.topic4_pack_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic4_pack_id uuid NOT NULL REFERENCES public.topic4_sector_packs(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  lesson_type text NOT NULL DEFAULT 'content', -- 'scorm' | 'content'
  content_type text NOT NULL DEFAULT 'html',   -- 'scorm' | 'html' | 'pdf' | 'pptx' | 'video'
  content_url text,
  scorm_package_id uuid REFERENCES public.scorm_packages(id) ON DELETE SET NULL,
  duration_lessons integer NOT NULL DEFAULT 1, -- 45-min units
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_topic4_pack_lessons_pack ON public.topic4_pack_lessons(topic4_pack_id, sort_order);

ALTER TABLE public.topic4_pack_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage topic4_pack_lessons" ON public.topic4_pack_lessons;
CREATE POLICY "Admins manage topic4_pack_lessons"
  ON public.topic4_pack_lessons FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read active pack lessons" ON public.topic4_pack_lessons;
CREATE POLICY "Authenticated read active pack lessons"
  ON public.topic4_pack_lessons FOR SELECT TO authenticated
  USING (is_active = true AND deleted_at IS NULL);

CREATE TRIGGER trg_topic4_pack_lessons_updated_at
  BEFORE UPDATE ON public.topic4_pack_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Storage bucket for pack contents
INSERT INTO storage.buckets (id, name, public)
VALUES ('topic4-content', 'topic4-content', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins manage topic4-content" ON storage.objects;
CREATE POLICY "Admins manage topic4-content"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'topic4-content' AND is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'topic4-content' AND is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read topic4-content" ON storage.objects;
CREATE POLICY "Authenticated read topic4-content"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'topic4-content');
