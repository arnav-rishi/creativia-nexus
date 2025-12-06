-- Create likes table for community gallery
CREATE TABLE public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  generation_id uuid NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, generation_id)
);

-- Enable RLS
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Users can view all likes (to show like counts)
CREATE POLICY "Anyone can view likes"
ON public.likes
FOR SELECT
USING (true);

-- Authenticated users can insert their own likes
CREATE POLICY "Users can insert own likes"
ON public.likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes (unlike)
CREATE POLICY "Users can delete own likes"
ON public.likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_likes_generation_id ON public.likes(generation_id);
CREATE INDEX idx_likes_user_id ON public.likes(user_id);