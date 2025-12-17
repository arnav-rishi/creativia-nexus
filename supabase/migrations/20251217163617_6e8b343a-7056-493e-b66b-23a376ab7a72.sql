-- Drop the overly permissive policy that allows anyone to read all profile columns including email
DROP POLICY IF EXISTS "Allow public profile view access" ON public.profiles;