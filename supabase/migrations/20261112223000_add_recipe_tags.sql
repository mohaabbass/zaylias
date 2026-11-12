ALTER TABLE public.recept
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
