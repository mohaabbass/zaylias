ALTER TABLE public.produkt_katalog ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.produkt_katalog
  TO authenticated;

DROP POLICY IF EXISTS produkt_katalog_authenticated_select
  ON public.produkt_katalog;
CREATE POLICY produkt_katalog_authenticated_select
  ON public.produkt_katalog
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS produkt_katalog_authenticated_insert
  ON public.produkt_katalog;
CREATE POLICY produkt_katalog_authenticated_insert
  ON public.produkt_katalog
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS produkt_katalog_authenticated_update
  ON public.produkt_katalog;
CREATE POLICY produkt_katalog_authenticated_update
  ON public.produkt_katalog
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS produkt_katalog_authenticated_delete
  ON public.produkt_katalog;
CREATE POLICY produkt_katalog_authenticated_delete
  ON public.produkt_katalog
  FOR DELETE
  TO authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';
