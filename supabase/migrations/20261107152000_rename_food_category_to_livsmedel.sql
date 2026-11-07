UPDATE public.expenses
SET category = 'groceries'
WHERE category IN ('food', 'Mat', 'Livsmedel', 'Food', 'Groceries');

UPDATE public.payments
SET category = 'groceries'
WHERE category IN ('food', 'Mat', 'Livsmedel', 'Food', 'Groceries');
