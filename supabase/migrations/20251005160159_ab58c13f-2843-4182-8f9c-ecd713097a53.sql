-- Create session_connection_metrics table for historical tracking
CREATE TABLE IF NOT EXISTS public.session_connection_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.telehealth_sessions(id) ON DELETE CASCADE,
  participant_id UUID,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  packet_loss_percent NUMERIC(5,2),
  latency_ms INTEGER,
  jitter_ms NUMERIC(6,2),
  bandwidth_kbps INTEGER,
  connection_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_connection_metrics_session ON public.session_connection_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_connection_metrics_recorded ON public.session_connection_metrics(recorded_at DESC);

-- Enable RLS
ALTER TABLE public.session_connection_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view metrics for their sessions"
ON public.session_connection_metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.telehealth_sessions ts
    WHERE ts.id = session_connection_metrics.session_id
    AND (ts.host_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.session_participants sp
      WHERE sp.session_id = ts.id AND sp.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "System can insert metrics"
ON public.session_connection_metrics
FOR INSERT
WITH CHECK (true);

-- Add session timeout configuration to telehealth_sessions
ALTER TABLE public.telehealth_sessions 
ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS timeout_warning_shown BOOLEAN DEFAULT false;