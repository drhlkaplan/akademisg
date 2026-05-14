
CREATE TABLE public.group_topic4_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  topic4_pack_id uuid NOT NULL REFERENCES public.topic4_sector_packs(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  assigned_by uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (group_id, topic4_pack_id)
);

CREATE INDEX idx_group_topic4_group ON public.group_topic4_assignments(group_id) WHERE is_active = true;

ALTER TABLE public.group_topic4_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage group_topic4"
ON public.group_topic4_assignments FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Members can view own group_topic4"
ON public.group_topic4_assignments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.users_to_groups utg
  WHERE utg.group_id = group_topic4_assignments.group_id AND utg.user_id = auth.uid()
));

CREATE TRIGGER trg_group_topic4_updated
BEFORE UPDATE ON public.group_topic4_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
