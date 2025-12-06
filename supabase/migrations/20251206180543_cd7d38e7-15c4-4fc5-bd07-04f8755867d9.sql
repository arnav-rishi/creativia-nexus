-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Anyone can view likes" ON public.likes;

-- Create restrictive SELECT policy - users can only see their own likes
CREATE POLICY "Users can view own likes"
ON public.likes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a security definer function to get like counts without exposing user_ids
CREATE OR REPLACE FUNCTION public.get_like_count(p_generation_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.likes
  WHERE generation_id = p_generation_id;
$$;

-- Create a function to check if current user liked a generation
CREATE OR REPLACE FUNCTION public.has_user_liked(p_generation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.likes
    WHERE generation_id = p_generation_id
      AND user_id = auth.uid()
  );
$$;