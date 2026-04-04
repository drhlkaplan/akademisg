
-- Function: auto-assign topic4 pack when firm sector/hazard changes
CREATE OR REPLACE FUNCTION public.auto_assign_topic4_on_firm_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack_id uuid;
BEGIN
  -- Only proceed if sector_id or hazard_class_new changed
  IF (NEW.sector_id IS DISTINCT FROM OLD.sector_id) OR (NEW.hazard_class_new IS DISTINCT FROM OLD.hazard_class_new) THEN
    -- Find matching topic4 pack
    SELECT id INTO v_pack_id
    FROM topic4_sector_packs
    WHERE sector_id = NEW.sector_id
      AND hazard_class = NEW.hazard_class_new
      AND is_active = true
    LIMIT 1;

    -- If found and not already assigned, create assignment
    IF v_pack_id IS NOT NULL THEN
      INSERT INTO company_topic4_assignments (firm_id, topic4_pack_id, is_active)
      VALUES (NEW.id, v_pack_id, true)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on firms update
DROP TRIGGER IF EXISTS trg_auto_assign_topic4 ON firms;
CREATE TRIGGER trg_auto_assign_topic4
  AFTER UPDATE ON firms
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_topic4_on_firm_update();
