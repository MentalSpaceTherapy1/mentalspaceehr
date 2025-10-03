-- Create telehealth_sessions table
CREATE TABLE IF NOT EXISTS public.telehealth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  host_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  recording_enabled BOOLEAN DEFAULT false,
  recording_consent_given BOOLEAN DEFAULT false,
  recording_url TEXT,
  transcript_enabled BOOLEAN DEFAULT false,
  waiting_room_enabled BOOLEAN DEFAULT true,
  max_participants INTEGER DEFAULT 2,
  current_participant_count INTEGER DEFAULT 0,
  session_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create session_participants table
CREATE TABLE IF NOT EXISTS public.session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.telehealth_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  participant_name TEXT NOT NULL,
  participant_role TEXT NOT NULL CHECK (participant_role IN ('host', 'client', 'observer')),
  connection_state TEXT NOT NULL DEFAULT 'connecting' CHECK (connection_state IN ('connecting', 'connected', 'reconnecting', 'disconnected')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  device_fingerprint TEXT,
  ip_address TEXT,
  user_agent TEXT,
  connection_quality JSONB DEFAULT '{"packetLoss": 0, "latency": 0, "jitter": 0, "bandwidth": 0}'::jsonb,
  is_muted BOOLEAN DEFAULT false,
  is_video_enabled BOOLEAN DEFAULT true,
  is_screen_sharing BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create session_recordings table
CREATE TABLE IF NOT EXISTS public.session_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.telehealth_sessions(id) ON DELETE CASCADE,
  recording_url TEXT NOT NULL,
  encryption_key_id TEXT,
  file_size_bytes BIGINT,
  duration_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  stopped_at TIMESTAMP WITH TIME ZONE,
  consent_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  consent_ip_address TEXT NOT NULL,
  consent_user_agent TEXT NOT NULL,
  consent_device_fingerprint TEXT NOT NULL,
  consent_granted_by UUID NOT NULL,
  hipaa_compliant BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create session_transcriptions table
CREATE TABLE IF NOT EXISTS public.session_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.telehealth_sessions(id) ON DELETE CASCADE,
  recording_id UUID REFERENCES public.session_recordings(id) ON DELETE SET NULL,
  speaker_id UUID,
  speaker_role TEXT CHECK (speaker_role IN ('therapist', 'client', 'unknown')),
  transcript_text TEXT NOT NULL,
  confidence_score NUMERIC(3,2),
  timestamp_start TIMESTAMP WITH TIME ZONE NOT NULL,
  timestamp_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create waiting_room_queue table
CREATE TABLE IF NOT EXISTS public.waiting_room_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.telehealth_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'admitted', 'denied', 'left')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  admitted_at TIMESTAMP WITH TIME ZONE,
  admitted_by UUID,
  denied_at TIMESTAMP WITH TIME ZONE,
  denied_by UUID,
  denial_reason TEXT,
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create telehealth_security_events table
CREATE TABLE IF NOT EXISTS public.telehealth_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.telehealth_sessions(id) ON DELETE CASCADE,
  user_id UUID,
  event_type TEXT NOT NULL,
  event_description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telehealth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_room_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telehealth_security_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for telehealth_sessions
CREATE POLICY "Users can view sessions they're involved in"
  ON public.telehealth_sessions FOR SELECT
  USING (
    host_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.session_participants
      WHERE session_participants.session_id = telehealth_sessions.id
      AND session_participants.user_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'administrator'::app_role)
  );

CREATE POLICY "Hosts can create sessions"
  ON public.telehealth_sessions FOR INSERT
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Hosts and admins can update sessions"
  ON public.telehealth_sessions FOR UPDATE
  USING (host_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role));

-- RLS Policies for session_participants
CREATE POLICY "Users can view participants in their sessions"
  ON public.session_participants FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.telehealth_sessions
      WHERE telehealth_sessions.id = session_participants.session_id
      AND (telehealth_sessions.host_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role))
    )
  );

CREATE POLICY "Users can insert themselves as participants"
  ON public.session_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own participant record"
  ON public.session_participants FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for session_recordings
CREATE POLICY "Users can view recordings of their sessions"
  ON public.session_recordings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.telehealth_sessions ts
      JOIN public.session_participants sp ON sp.session_id = ts.id
      WHERE ts.id = session_recordings.session_id
      AND (ts.host_id = auth.uid() OR sp.user_id = auth.uid())
    ) OR
    has_role(auth.uid(), 'administrator'::app_role)
  );

CREATE POLICY "Hosts can create recordings"
  ON public.session_recordings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.telehealth_sessions
      WHERE telehealth_sessions.id = session_recordings.session_id
      AND telehealth_sessions.host_id = auth.uid()
    )
  );

-- RLS Policies for session_transcriptions
CREATE POLICY "Users can view transcriptions of their sessions"
  ON public.session_transcriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.telehealth_sessions ts
      JOIN public.session_participants sp ON sp.session_id = ts.id
      WHERE ts.id = session_transcriptions.session_id
      AND (ts.host_id = auth.uid() OR sp.user_id = auth.uid())
    ) OR
    has_role(auth.uid(), 'administrator'::app_role)
  );

CREATE POLICY "System can insert transcriptions"
  ON public.session_transcriptions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for waiting_room_queue
CREATE POLICY "Users can view waiting room for their sessions"
  ON public.waiting_room_queue FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.telehealth_sessions
      WHERE telehealth_sessions.id = waiting_room_queue.session_id
      AND telehealth_sessions.host_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'administrator'::app_role)
  );

CREATE POLICY "Users can join waiting room"
  ON public.waiting_room_queue FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Hosts can update waiting room entries"
  ON public.waiting_room_queue FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.telehealth_sessions
      WHERE telehealth_sessions.id = waiting_room_queue.session_id
      AND telehealth_sessions.host_id = auth.uid()
    )
  );

-- RLS Policies for telehealth_security_events
CREATE POLICY "Admins can view all security events"
  ON public.telehealth_security_events FOR SELECT
  USING (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Users can view own security events"
  ON public.telehealth_security_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can log security events"
  ON public.telehealth_security_events FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_telehealth_sessions_session_id ON public.telehealth_sessions(session_id);
CREATE INDEX idx_telehealth_sessions_appointment_id ON public.telehealth_sessions(appointment_id);
CREATE INDEX idx_telehealth_sessions_host_id ON public.telehealth_sessions(host_id);
CREATE INDEX idx_session_participants_session_id ON public.session_participants(session_id);
CREATE INDEX idx_session_participants_user_id ON public.session_participants(user_id);
CREATE INDEX idx_session_recordings_session_id ON public.session_recordings(session_id);
CREATE INDEX idx_session_transcriptions_session_id ON public.session_transcriptions(session_id);
CREATE INDEX idx_waiting_room_queue_session_id ON public.waiting_room_queue(session_id);
CREATE INDEX idx_telehealth_security_events_session_id ON public.telehealth_security_events(session_id);

-- Enable realtime for session management
ALTER PUBLICATION supabase_realtime ADD TABLE public.telehealth_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waiting_room_queue;

-- Create trigger for updating updated_at
CREATE TRIGGER update_telehealth_sessions_updated_at
  BEFORE UPDATE ON public.telehealth_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_participants_updated_at
  BEFORE UPDATE ON public.session_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();