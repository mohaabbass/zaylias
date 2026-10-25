ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS account_id uuid;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS account_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'accounts_id_user_id_unique'
      AND conrelid = 'public.accounts'::regclass
  ) THEN
    ALTER TABLE public.accounts
      ADD CONSTRAINT accounts_id_user_id_unique UNIQUE (id, user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expenses_account_owner_fkey'
      AND conrelid = 'public.expenses'::regclass
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_account_owner_fkey
      FOREIGN KEY (account_id, user_id)
      REFERENCES public.accounts (id, user_id)
      ON DELETE SET NULL (account_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payments_account_owner_fkey'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_account_owner_fkey
      FOREIGN KEY (account_id, user_id)
      REFERENCES public.accounts (id, user_id)
      ON DELETE SET NULL (account_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS expenses_account_user_id_idx
  ON public.expenses (account_id, user_id);

CREATE INDEX IF NOT EXISTS payments_account_user_id_idx
  ON public.payments (account_id, user_id);

CREATE OR REPLACE FUNCTION public.sync_account_balance_from_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.account_id IS NOT NULL THEN
    UPDATE public.accounts
    SET balance = balance - CASE
      WHEN OLD.type = 'income' THEN OLD.amount
      ELSE -OLD.amount
    END
    WHERE id = OLD.account_id
      AND user_id = OLD.user_id;
  END IF;

  IF TG_OP <> 'DELETE' AND NEW.account_id IS NOT NULL THEN
    UPDATE public.accounts
    SET balance = balance + CASE
      WHEN NEW.type = 'income' THEN NEW.amount
      ELSE -NEW.amount
    END
    WHERE id = NEW.account_id
      AND user_id = NEW.user_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS expenses_sync_account_balance ON public.expenses;

CREATE TRIGGER expenses_sync_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_account_balance_from_expense();
