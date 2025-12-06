-- Add username column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN username text UNIQUE;

-- Add check constraint for username format (alphanumeric, underscore, period only, 3-30 chars)
ALTER TABLE public.profiles 
ADD CONSTRAINT username_format CHECK (
  username ~ '^[a-zA-Z0-9][a-zA-Z0-9_.]{1,28}[a-zA-Z0-9]$' OR 
  username ~ '^[a-zA-Z0-9]{3,30}$'
);

-- Create index for faster username lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Update the handle_new_user function to include username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create profile with username from metadata
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'username'
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