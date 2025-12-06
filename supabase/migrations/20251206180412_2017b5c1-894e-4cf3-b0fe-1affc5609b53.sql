-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;

-- Create proper permissive SELECT policy for authenticated users only
CREATE POLICY "Users can view own feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);