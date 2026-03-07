
-- 1. Drop the student SELECT policy that exposes correct_answer
DROP POLICY IF EXISTS "Users taking exam can view questions" ON public.questions;

-- 2. Switch the view to SECURITY DEFINER so students can still read through it
ALTER VIEW public.questions_for_students SET (security_invoker = off);
