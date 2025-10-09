-- Create release metrics table
CREATE TABLE IF NOT EXISTS public.release_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id TEXT NOT NULL UNIQUE,
  release_date TIMESTAMP WITH TIME ZONE NOT NULL,
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deployment_metrics JSONB NOT NULL DEFAULT '{}',
  stability_metrics JSONB NOT NULL DEFAULT '{}',
  user_impact JSONB NOT NULL DEFAULT '{}',
  data_quality JSONB NOT NULL DEFAULT '{}',
  security JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_release_metrics_release_id ON public.release_metrics(release_id);
CREATE INDEX IF NOT EXISTS idx_release_metrics_release_date ON public.release_metrics(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_release_metrics_collected_at ON public.release_metrics(collected_at DESC);

-- Enable RLS
ALTER TABLE public.release_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Administrators can view release metrics"
  ON public.release_metrics FOR SELECT
  USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "System can insert release metrics"
  ON public.release_metrics FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.release_metrics IS 'Stores automated metrics collection for post-release reviews';