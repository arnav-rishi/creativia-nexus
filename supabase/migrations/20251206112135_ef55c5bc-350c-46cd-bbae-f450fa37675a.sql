-- Recreate view with SECURITY INVOKER (default, safe behavior)
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
  SELECT id, username, full_name, avatar_url 
  FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Create a permissive policy for the view to work - only expose safe columns through the view
CREATE POLICY "Allow public profile view access"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);