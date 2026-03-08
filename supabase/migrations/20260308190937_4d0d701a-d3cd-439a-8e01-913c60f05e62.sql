-- Add branding columns to firms table
ALTER TABLE public.firms 
  ADD COLUMN IF NOT EXISTS firm_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#f97316',
  ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#1a2744',
  ADD COLUMN IF NOT EXISTS bg_color TEXT DEFAULT '#f8fafc',
  ADD COLUMN IF NOT EXISTS welcome_message TEXT DEFAULT 'Eğitimlerinize hoş geldiniz',
  ADD COLUMN IF NOT EXISTS login_bg_url TEXT,
  ADD COLUMN IF NOT EXISTS footer_text TEXT,
  ADD COLUMN IF NOT EXISTS custom_css TEXT,
  ADD COLUMN IF NOT EXISTS favicon_url TEXT;

-- Create a function to find email by TC kimlik
CREATE OR REPLACE FUNCTION public.get_email_by_tc(tc_no TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT u.email
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE p.tc_identity = tc_no
  LIMIT 1;
$$;