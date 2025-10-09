-- Drop existing table if it exists with different schema
DROP TABLE IF EXISTS public.data_quality_results CASCADE;

-- Create data quality results table
CREATE TABLE public.data_quality_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  check_type TEXT NOT NULL CHECK (check_type IN ('completeness', 'validity', 'uniqueness', 'consistency', 'timeliness')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  violation_count INTEGER NOT NULL DEFAULT 0,
  threshold INTEGER,
  passed BOOLEAN NOT NULL,
  check_query TEXT NOT NULL,
  error_message TEXT,
  execution_time_ms INTEGER,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_dqr_table_name ON public.data_quality_results(table_name);
CREATE INDEX idx_dqr_checked_at ON public.data_quality_results(checked_at DESC);
CREATE INDEX idx_dqr_passed ON public.data_quality_results(passed);
CREATE INDEX idx_dqr_severity ON public.data_quality_results(severity);

-- Enable RLS
ALTER TABLE public.data_quality_results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Administrators can view data quality results"
  ON public.data_quality_results FOR SELECT
  USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "System can insert data quality results"
  ON public.data_quality_results FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.data_quality_results IS 'Stores results of automated data quality checks for monitoring and compliance';