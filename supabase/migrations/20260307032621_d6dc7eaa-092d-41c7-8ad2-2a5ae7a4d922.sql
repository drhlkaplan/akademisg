-- 1. Create a restricted view for public certificate verification (masks PII)
CREATE OR REPLACE VIEW public.public_certificates AS
  SELECT 
    certificate_number,
    course_title,
    danger_class,
    duration_hours,
    issue_date,
    is_valid,
    CASE 
      WHEN holder_tc IS NOT NULL AND LENGTH(holder_tc) >= 6 
      THEN SUBSTRING(holder_tc, 1, 3) || '*****' || RIGHT(holder_tc, 2)
      ELSE holder_tc
    END AS holder_tc_masked,
    SPLIT_PART(holder_name, ' ', 1) || ' ' || LEFT(REVERSE(SPLIT_PART(REVERSE(holder_name), ' ', 1)), 1) || '.' AS holder_name_short
  FROM public.certificates
  WHERE is_valid = true;

-- 2. Drop the anon policy that exposes raw PII
DROP POLICY IF EXISTS "Anyone can verify certificates by number" ON public.certificates;

-- 3. Grant anon SELECT on the safe view only
GRANT SELECT ON public.public_certificates TO anon;
GRANT SELECT ON public.public_certificates TO authenticated;