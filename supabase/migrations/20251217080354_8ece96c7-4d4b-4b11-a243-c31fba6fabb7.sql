-- Add job linkage to conversation_messages so reopened chats can reconcile in-flight generations
ALTER TABLE public.conversation_messages
ADD COLUMN IF NOT EXISTS job_id uuid;

-- Helpful index for fast lookups
CREATE INDEX IF NOT EXISTS idx_conversation_messages_job_id
ON public.conversation_messages (job_id);