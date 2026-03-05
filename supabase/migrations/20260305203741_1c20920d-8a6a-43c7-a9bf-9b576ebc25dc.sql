
-- Fix security definer view: set to SECURITY INVOKER (default for views, but explicit)
ALTER VIEW public.questions_for_students SET (security_invoker = on);
