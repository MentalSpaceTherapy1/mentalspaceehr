-- Professional Telehealth Features
-- Persistent chat, waiting room queue, and enhanced session management

-- Session Messages Table (Persistent Chat)
CREATE TABLE IF NOT EXISTS public.session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL, -- telehealth_sessions.session_id
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'file')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_by UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_session_messages_session ON public.session_messages(session_id, created_at DESC);
CREATE INDEX idx_session_messages_user ON public.session_messages(user_id);

-- RLS Policies for session_messages
ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their sessions"
ON public.session_messages
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM session_participants sp
    WHERE sp.session_id = (
      SELECT id FROM telehealth_sessions ts
      WHERE ts.session_id = session_messages.session_id
    )
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages in their sessions"
ON public.session_messages
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM session_participants sp
    WHERE sp.session_id = (
      SELECT id FROM telehealth_sessions ts
      WHERE ts.session_id = session_messages.session_id
    )
    AND sp.user_id = auth.uid()
  )
);

-- Waiting Room Queue Table
CREATE TABLE IF NOT EXISTS public.waiting_room_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'admitted', 'denied', 'left')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  admitted_at TIMESTAMP WITH TIME ZONE,
  admitted_by UUID REFERENCES auth.users(id),
  denied_at TIMESTAMP WITH TIME ZONE,
  denied_by UUID REFERENCES auth.users(id),
  left_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_waiting_room_session ON public.waiting_room_queue(session_id, status);
CREATE INDEX idx_waiting_room_user ON public.waiting_room_queue(user_id);

-- RLS Policies for waiting_room_queue
ALTER TABLE public.waiting_room_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own waiting room entries"
ON public.waiting_room_queue
FOR SELECT
USING (
  user_id = auth.uid()
  OR admitted_by = auth.uid()
  OR denied_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM telehealth_sessions ts
    WHERE ts.session_id = waiting_room_queue.session_id
    AND ts.host_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own waiting room entries"
ON public.waiting_room_queue
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Hosts can update waiting room entries"
ON public.waiting_room_queue
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM telehealth_sessions ts
    WHERE ts.session_id = waiting_room_queue.session_id
    AND ts.host_id = auth.uid()
  )
);

-- Function to clean up old waiting room entries
CREATE OR REPLACE FUNCTION cleanup_old_waiting_room_entries()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM waiting_room_queue
  WHERE joined_at < now() - INTERVAL '24 hours';
END;
$$;

-- Function to clean up old chat messages (optional, for privacy)
CREATE OR REPLACE FUNCTION cleanup_old_session_messages()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete messages older than 90 days
  DELETE FROM session_messages
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$;

COMMENT ON TABLE public.session_messages IS 'Persistent chat messages for telehealth sessions';
COMMENT ON TABLE public.waiting_room_queue IS 'Queue for participants waiting to join telehealth sessions';
