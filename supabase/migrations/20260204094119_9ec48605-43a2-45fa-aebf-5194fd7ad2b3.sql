-- Güvenlik uyarılarını düzelt

-- 1. update_updated_at_column fonksiyonuna search_path ekle
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 2. handle_new_user fonksiyonuna search_path ekle
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Profil oluştur
    INSERT INTO public.profiles (user_id, first_name, last_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    
    -- Varsayılan rol ata (student)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student');
    
    RETURN NEW;
END;
$$;

-- 3. activity_logs insert politikasını daha güvenli hale getir
DROP POLICY IF EXISTS "System can insert logs" ON public.activity_logs;

CREATE POLICY "Users can insert own activity logs"
    ON public.activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);