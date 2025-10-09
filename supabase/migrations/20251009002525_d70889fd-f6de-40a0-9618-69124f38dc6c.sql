-- Create integration health logs table
CREATE TABLE IF NOT EXISTS public.integration_health_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  response_time_ms INTEGER NOT NULL,
  error_message TEXT,
  metadata JSONB,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_integration_health_logs_service ON public.integration_health_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_integration_health_logs_checked_at ON public.integration_health_logs(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_health_logs_status ON public.integration_health_logs(status);

-- Enable RLS
ALTER TABLE public.integration_health_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Administrators can view health logs"
  ON public.integration_health_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "System can insert health logs"
  ON public.integration_health_logs
  FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.integration_health_logs IS 'Stores integration health check results for system monitoring';
