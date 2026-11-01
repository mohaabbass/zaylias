ALTER TABLE public.produkt_katalog
  ADD COLUMN IF NOT EXISTS catalog_id uuid;

UPDATE public.produkt_katalog
SET catalog_id = gen_random_uuid()
WHERE catalog_id IS NULL;

ALTER TABLE public.produkt_katalog
  ALTER COLUMN catalog_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN catalog_id SET NOT NULL;

DO $$
DECLARE
  primary_key_name text;
  primary_key_columns text[];
BEGIN
  SELECT
    constraint_row.conname,
    array_agg(attribute_row.attname ORDER BY key_column.ordinality)
  INTO primary_key_name, primary_key_columns
  FROM pg_constraint AS constraint_row
  JOIN LATERAL unnest(constraint_row.conkey)
    WITH ORDINALITY AS key_column(attnum, ordinality) ON true
  JOIN pg_attribute AS attribute_row
    ON attribute_row.attrelid = constraint_row.conrelid
    AND attribute_row.attnum = key_column.attnum
  WHERE constraint_row.conrelid = 'public.produkt_katalog'::regclass
    AND constraint_row.contype = 'p'
  GROUP BY constraint_row.conname;

  IF primary_key_name IS NOT NULL
    AND primary_key_columns @> ARRAY['streckkod']::text[] THEN
    EXECUTE format(
      'ALTER TABLE public.produkt_katalog DROP CONSTRAINT %I',
      primary_key_name
    );
    primary_key_name := NULL;
  END IF;

  IF primary_key_name IS NULL THEN
    ALTER TABLE public.produkt_katalog
      ADD CONSTRAINT produkt_katalog_pkey PRIMARY KEY (catalog_id);
  END IF;
END $$;

ALTER TABLE public.produkt_katalog
  ALTER COLUMN streckkod DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index AS index_row
    JOIN pg_attribute AS attribute_row
      ON attribute_row.attrelid = index_row.indrelid
      AND attribute_row.attnum = index_row.indkey[0]
    WHERE index_row.indrelid = 'public.produkt_katalog'::regclass
      AND index_row.indisunique
      AND index_row.indpred IS NULL
      AND index_row.indnkeyatts = 1
      AND attribute_row.attname = 'catalog_id'
  ) THEN
    CREATE UNIQUE INDEX produkt_katalog_catalog_id_key
      ON public.produkt_katalog (catalog_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_index AS index_row
    JOIN pg_attribute AS attribute_row
      ON attribute_row.attrelid = index_row.indrelid
      AND attribute_row.attnum = index_row.indkey[0]
    WHERE index_row.indrelid = 'public.produkt_katalog'::regclass
      AND index_row.indisunique
      AND index_row.indpred IS NULL
      AND index_row.indnkeyatts = 1
      AND attribute_row.attname = 'streckkod'
  ) THEN
    CREATE UNIQUE INDEX produkt_katalog_streckkod_key
      ON public.produkt_katalog (streckkod);
  END IF;
END $$;
