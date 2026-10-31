ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS transaction_date date;

UPDATE public.expenses
SET transaction_date = created_at::date
WHERE transaction_date IS NULL;

ALTER TABLE public.expenses
  ALTER COLUMN transaction_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN transaction_date SET NOT NULL;
