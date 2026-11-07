CREATE TABLE IF NOT EXISTS public.budget_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  periods jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(periods) = 'array'),
  selected_period_id text
);

ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own budget settings"
  ON public.budget_settings;
CREATE POLICY "Users can view their own budget settings"
  ON public.budget_settings
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own budget settings"
  ON public.budget_settings;
CREATE POLICY "Users can insert their own budget settings"
  ON public.budget_settings
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own budget settings"
  ON public.budget_settings;
CREATE POLICY "Users can update their own budget settings"
  ON public.budget_settings
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE ON public.budget_settings TO authenticated;
