-- Add sharing columns to generations table
ALTER TABLE public.generations
ADD COLUMN is_shared boolean DEFAULT false,
ADD COLUMN shared_at timestamp with time zone;

-- Create index for faster public gallery queries
CREATE INDEX idx_generations_shared ON public.generations (is_shared, shared_at DESC) WHERE is_shared = true;

-- Add RLS policy for public viewing of shared generations
CREATE POLICY "Anyone can view shared generations"
ON public.generations
FOR SELECT
USING (is_shared = true);

-- Add RLS policy for users to update their own generations (to share them)
CREATE POLICY "Users can update own generations"
ON public.generations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);