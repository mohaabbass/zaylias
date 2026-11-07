UPDATE public.expenses
SET category = 'Livsmedel'
WHERE category IN ('food', 'Mat', 'Food', 'Groceries');

UPDATE public.payments
SET category = 'Livsmedel'
WHERE category IN ('food', 'Mat', 'Food', 'Groceries');
