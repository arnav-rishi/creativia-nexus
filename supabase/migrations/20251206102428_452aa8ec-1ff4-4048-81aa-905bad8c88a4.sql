-- Allow public read access to profiles for showing creator names in community gallery
CREATE POLICY "Public can view profiles for community"
ON public.profiles
FOR SELECT
USING (true);