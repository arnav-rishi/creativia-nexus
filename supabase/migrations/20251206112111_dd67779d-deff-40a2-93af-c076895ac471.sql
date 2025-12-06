-- Drop the overly permissive policy that exposes emails
DROP POLICY IF EXISTS "Public can view profiles for community" ON public.profiles;

-- Create a secure view that only exposes non-sensitive fields
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT id, username, full_name, avatar_url 
  FROM public.profiles;

-- Grant access to the view for all users
GRANT SELECT ON public.public_profiles TO anon, authenticated;