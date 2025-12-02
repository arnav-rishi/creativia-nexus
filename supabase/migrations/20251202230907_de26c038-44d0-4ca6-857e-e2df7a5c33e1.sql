-- Create atomic credit deduction function with proper locking
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id uuid,
  p_amount integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
BEGIN
  -- Lock row and check balance atomically
  SELECT balance INTO v_balance
  FROM credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN false;
  END IF;
  
  -- Deduct credits atomically
  UPDATE credits
  SET 
    balance = balance - p_amount,
    total_spent = total_spent + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN true;
END;
$$;