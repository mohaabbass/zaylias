ALTER TABLE public.recept
  DROP CONSTRAINT IF EXISTS recept_main_ingredient_check;

ALTER TABLE public.recept
  ADD CONSTRAINT recept_main_ingredient_check
  CHECK (
    main_ingredient IN (
      'chicken',
      'meat',
      'minced_meat',
      'shrimp',
      'fish',
      'vegetarian',
      'other',
      'tofu'
    )
  );
