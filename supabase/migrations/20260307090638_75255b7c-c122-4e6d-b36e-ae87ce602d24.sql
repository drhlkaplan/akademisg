-- Revoke anonymous access to questions_for_students view
REVOKE SELECT ON public.questions_for_students FROM anon;