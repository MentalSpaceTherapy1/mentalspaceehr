-- Session Messages Table (Persistent Chat)
CREATE TABLE IF NOT EXISTS public.session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'file')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_by UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_session_messages_session ON public.session_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_messages_user ON public.session_messages(user_id);

-- RLS Policies
ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their sessions" ON public.session_messages;
CREATE POLICY "Users can view messages in their sessions"
ON public.session_messages
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert messages in their sessions" ON public.session_messages;
CREATE POLICY "Users can insert messages in their sessions"
ON public.session_messages
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON public.session_messages TO authenticated;
GRANT ALL ON public.session_messages TO service_role;