DELETE FROM public.scorm_runtime_data;
DELETE FROM public.scorm_scos;
UPDATE public.lessons SET scorm_package_id = NULL WHERE scorm_package_id IS NOT NULL;
DELETE FROM public.lesson_progress WHERE scorm_package_id IS NOT NULL;
DELETE FROM public.scorm_packages;