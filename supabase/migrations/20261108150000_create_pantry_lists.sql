CREATE TABLE IF NOT EXISTS public.pantry_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pantry_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.pantry_lists (id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.produkter (id) ON DELETE CASCADE,
  catalog_product_id uuid REFERENCES public.produkt_katalog (catalog_id) ON DELETE CASCADE,
  recipe_id uuid REFERENCES public.recept (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pantry_list_items_one_source CHECK (
    num_nonnulls(product_id, catalog_product_id, recipe_id) = 1
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS pantry_list_items_product_unique
  ON public.pantry_list_items (list_id, product_id)
  WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pantry_list_items_catalog_product_unique
  ON public.pantry_list_items (list_id, catalog_product_id)
  WHERE catalog_product_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pantry_list_items_recipe_unique
  ON public.pantry_list_items (list_id, recipe_id)
  WHERE recipe_id IS NOT NULL;

ALTER TABLE public.pantry_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pantry_lists_select ON public.pantry_lists;
CREATE POLICY pantry_lists_select
  ON public.pantry_lists
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS pantry_lists_insert ON public.pantry_lists;
CREATE POLICY pantry_lists_insert
  ON public.pantry_lists
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS pantry_lists_update ON public.pantry_lists;
CREATE POLICY pantry_lists_update
  ON public.pantry_lists
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS pantry_lists_delete ON public.pantry_lists;
CREATE POLICY pantry_lists_delete
  ON public.pantry_lists
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS pantry_list_items_select ON public.pantry_list_items;
CREATE POLICY pantry_list_items_select
  ON public.pantry_list_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pantry_lists
      WHERE pantry_lists.id = pantry_list_items.list_id
        AND pantry_lists.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS pantry_list_items_insert ON public.pantry_list_items;
CREATE POLICY pantry_list_items_insert
  ON public.pantry_list_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.pantry_lists
      WHERE pantry_lists.id = pantry_list_items.list_id
        AND pantry_lists.user_id = (SELECT auth.uid())
    )
    AND (
      product_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.produkter
        WHERE produkter.id = pantry_list_items.product_id
          AND produkter.user_id = (SELECT auth.uid())
      )
    )
    AND (
      catalog_product_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.produkt_katalog
        WHERE produkt_katalog.catalog_id = pantry_list_items.catalog_product_id
      )
    )
    AND (
      recipe_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.recept
        WHERE recept.id = pantry_list_items.recipe_id
          AND (recept.user_id IS NULL OR recept.user_id = (SELECT auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS pantry_list_items_delete ON public.pantry_list_items;
CREATE POLICY pantry_list_items_delete
  ON public.pantry_list_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pantry_lists
      WHERE pantry_lists.id = pantry_list_items.list_id
        AND pantry_lists.user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pantry_lists TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.pantry_list_items TO authenticated;
