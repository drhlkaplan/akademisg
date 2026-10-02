CREATE OR REPLACE FUNCTION public.set_enrollment_firm_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.firm_id IS NULL THEN
    SELECT firm_id INTO NEW.firm_id FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_set_enrollment_firm_id ON public.enrollments;
CREATE TRIGGER trg_set_enrollment_firm_id BEFORE INSERT OR UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.set_enrollment_firm_id();
UPDATE public.enrollments e SET firm_id = p.firm_id FROM public.profiles p
WHERE e.user_id = p.user_id AND e.firm_id IS NULL AND p.firm_id IS NOT NULL;