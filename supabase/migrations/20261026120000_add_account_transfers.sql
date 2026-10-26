CREATE OR REPLACE FUNCTION public.transfer_between_accounts(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric
)
RETURNS TABLE (account_id uuid, account_balance text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF p_from_account_id IS NULL
    OR p_to_account_id IS NULL
    OR p_from_account_id = p_to_account_id
    OR p_amount IS NULL
    OR p_amount <= 0
  THEN
    RAISE EXCEPTION 'A positive amount and two different accounts are required'
      USING ERRCODE = '22023';
  END IF;

  PERFORM account.id
  FROM public.accounts AS account
  WHERE account.id IN (p_from_account_id, p_to_account_id)
    AND account.user_id = auth.uid()
  ORDER BY account.id
  FOR UPDATE;

  IF (
    SELECT count(*)
    FROM public.accounts AS account
    WHERE account.id IN (p_from_account_id, p_to_account_id)
      AND account.user_id = auth.uid()
  ) <> 2 THEN
    RAISE EXCEPTION 'One or both accounts are unavailable'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.accounts
  SET balance = balance - p_amount
  WHERE id = p_from_account_id
    AND user_id = auth.uid();

  UPDATE public.accounts
  SET balance = balance + p_amount
  WHERE id = p_to_account_id
    AND user_id = auth.uid();

  RETURN QUERY
  SELECT account.id, account.balance::text
  FROM public.accounts AS account
  WHERE account.id IN (p_from_account_id, p_to_account_id)
    AND account.user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_between_accounts(uuid, uuid, numeric)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_between_accounts(uuid, uuid, numeric)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
