ALTER TABLE public.workplace_change_records
  ADD COLUMN IF NOT EXISTS previous_sector_id uuid REFERENCES public.sectors(id),
  ADD COLUMN IF NOT EXISTS new_sector_id uuid REFERENCES public.sectors(id);