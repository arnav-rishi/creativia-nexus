-- Update the handle_new_user function to give 100 credits instead of 50
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Create credits account with 100 free credits
  INSERT INTO public.credits (user_id, balance, total_purchased)
  VALUES (NEW.id, 100, 100);
  
  -- Record the bonus transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 100, 'bonus', 'Welcome bonus credits');
  
  RETURN NEW;
END;
$$;