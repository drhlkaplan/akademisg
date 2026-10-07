ALTER TABLE public.firms ADD COLUMN sector_ids uuid[] NOT NULL DEFAULT '{}';

UPDATE public.firms SET sector_ids = ARRAY[sector_id] WHERE sector_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_firm_sectors()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF cardinality(NEW.sector_ids) = 0 AND NEW.sector_id IS NOT NULL THEN
      NEW.sector_ids := ARRAY[NEW.sector_id];
    ELSE
      NEW.sector_id := NEW.sector_ids[1];
    END IF;
  ELSIF NEW.sector_ids IS DISTINCT FROM OLD.sector_ids THEN
    NEW.sector_id := NEW.sector_ids[1];
  ELSIF NEW.sector_id IS DISTINCT FROM OLD.sector_id THEN
    IF NEW.sector_id IS NULL THEN
      NEW.sector_ids := '{}';
    ELSE
      NEW.sector_ids := ARRAY[NEW.sector_id] || array_remove(NEW.sector_ids, NEW.sector_id);
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(NEW.sector_ids) AS chosen(sector_id)
    WHERE chosen.sector_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.sectors s WHERE s.id = chosen.sector_id
    )
  ) THEN
    RAISE EXCEPTION 'Invalid firm sector selection';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_firm_sectors_before_write
BEFORE INSERT OR UPDATE OF sector_ids, sector_id ON public.firms
FOR EACH ROW EXECUTE FUNCTION public.sync_firm_sectors();