ALTER TABLE public.enrollments REPLICA IDENTITY FULL;
ALTER TABLE public.exam_results REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_results; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;