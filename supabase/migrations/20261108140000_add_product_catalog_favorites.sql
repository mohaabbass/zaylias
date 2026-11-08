CREATE TABLE IF NOT EXISTS public.favorit_produkt_katalog (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  catalog_id uuid NOT NULL
    REFERENCES public.produkt_katalog (catalog_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, catalog_id)
);

ALTER TABLE public.favorit_produkt_katalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS favorit_produkt_katalog_select
  ON public.favorit_produkt_katalog;
CREATE POLICY favorit_produkt_katalog_select
  ON public.favorit_produkt_katalog
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS favorit_produkt_katalog_insert
  ON public.favorit_produkt_katalog;
CREATE POLICY favorit_produkt_katalog_insert
  ON public.favorit_produkt_katalog
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS favorit_produkt_katalog_delete
  ON public.favorit_produkt_katalog;
CREATE POLICY favorit_produkt_katalog_delete
  ON public.favorit_produkt_katalog
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, DELETE
  ON TABLE public.favorit_produkt_katalog
  TO authenticated;
