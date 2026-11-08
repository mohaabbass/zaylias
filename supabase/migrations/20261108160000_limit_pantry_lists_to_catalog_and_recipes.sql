DROP POLICY IF EXISTS pantry_list_items_insert
  ON public.pantry_list_items;

DROP INDEX IF EXISTS public.pantry_list_items_product_unique;

ALTER TABLE public.pantry_list_items
  DROP CONSTRAINT IF EXISTS pantry_list_items_one_source;
ALTER TABLE public.pantry_list_items
  DROP COLUMN IF EXISTS product_id;
ALTER TABLE public.pantry_list_items
  ADD CONSTRAINT pantry_list_items_one_source CHECK (
    num_nonnulls(catalog_product_id, recipe_id) = 1
  );

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
