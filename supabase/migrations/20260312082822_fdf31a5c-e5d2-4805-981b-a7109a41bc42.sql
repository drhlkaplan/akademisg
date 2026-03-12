
-- xAPI Statements table for learning analytics (LRS)
CREATE TABLE public.xapi_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  verb text NOT NULL,
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  result jsonb DEFAULT NULL,
  context jsonb DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX idx_xapi_user_id ON public.xapi_statements(user_id);
CREATE INDEX idx_xapi_object_id ON public.xapi_statements(object_id);
CREATE INDEX idx_xapi_verb ON public.xapi_statements(verb);
CREATE INDEX idx_xapi_created_at ON public.xapi_statements(created_at DESC);

-- Enable RLS
ALTER TABLE public.xapi_statements ENABLE ROW LEVEL SECURITY;

-- Policies: users can insert their own statements, admins can view all
CREATE POLICY "Users can insert own xapi statements"
  ON public.xapi_statements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own xapi statements"
  ON public.xapi_statements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all xapi statements"
  ON public.xapi_statements FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
