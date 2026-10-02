CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS TABLE(certificate_number text, course_title text, danger_class danger_class, duration_hours integer, issue_date timestamptz, holder_tc_masked text, holder_name_short text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.certificate_number, c.course_title, c.danger_class, c.duration_hours, c.issue_date,
    CASE WHEN c.holder_tc IS NOT NULL AND length(c.holder_tc) >= 6 THEN substring(c.holder_tc,1,3)||'*****'||right(c.holder_tc,2) ELSE NULL END,
    split_part(c.holder_name,' ',1)||' '||left(reverse(split_part(reverse(c.holder_name),' ',1)),1)||'.'
  FROM public.certificates c
  WHERE upper(c.certificate_number) = upper(trim(_code)) AND c.is_valid = true AND c.deleted_at IS NULL
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;