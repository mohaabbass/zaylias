ALTER TABLE public.recept
  ADD COLUMN IF NOT EXISTS main_ingredient text NOT NULL DEFAULT 'other'
  CHECK (
    main_ingredient IN (
      'chicken',
      'meat',
      'shrimp',
      'fish',
      'vegetarian',
      'other'
    )
  );
