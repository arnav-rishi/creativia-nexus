-- Drop the overly permissive policy that exposes all user emails
DROP POLICY IF EXISTS "Allow public profile view access" ON profiles;