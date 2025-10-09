-- Phase 4: Performance Monitoring and Analytics Schema

-- Performance metrics table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL, -- 'query', 'api', 'function', 'render'
  metric_name TEXT NOT NULL,
  execution_time_ms NUMERIC NOT NULL,
  resource_usage JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT valid_metric_type CHECK (metric_type IN ('query', 'api', 'function', 'render', 'network'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_perf_metrics_type ON public.performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_timestamp ON public.performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_name ON public.performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_slow ON public.performance_metrics(execution_time_ms DESC) 
  WHERE execution_time_ms > 500;

-- Clinical analytics cache table
CREATE TABLE IF NOT EXISTS public.clinical_analytics_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL, -- 'outcomes', 'utilization', 'quality', 'provider_performance'
  aggregation_period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metric_data JSONB NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_aggregation_period CHECK (aggregation_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly'))
);

-- Create unique index to prevent duplicate cache entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_cache_unique 
  ON public.clinical_analytics_cache(metric_type, aggregation_period, period_start, period_end);

-- Create index for retrieval
CREATE INDEX IF NOT EXISTS idx_analytics_cache_period ON public.clinical_analytics_cache(period_start DESC, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_calculated ON public.clinical_analytics_cache(calculated_at DESC);

-- System health metrics table
CREATE TABLE IF NOT EXISTS public.system_health_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Database metrics
  database_connections INTEGER,
  database_size_mb NUMERIC,
  table_sizes JSONB DEFAULT '{}',
  
  -- Performance metrics
  avg_query_time_ms NUMERIC,
  slow_query_count INTEGER DEFAULT 0,
  error_rate NUMERIC DEFAULT 0,
  
  -- Resource utilization
  cpu_usage_percent NUMERIC,
  memory_usage_percent NUMERIC,
  storage_usage_percent NUMERIC,
  
  -- Application metrics
  active_users INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  api_requests_per_minute INTEGER DEFAULT 0,
  
  -- Health status
  overall_health_score NUMERIC DEFAULT 100, -- 0-100
  health_status TEXT NOT NULL DEFAULT 'healthy', -- 'healthy', 'degraded', 'critical'
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT valid_health_status CHECK (health_status IN ('healthy', 'degraded', 'critical', 'unknown'))
);

-- Create indexes for system health
CREATE INDEX IF NOT EXISTS idx_system_health_timestamp ON public.system_health_metrics(metric_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON public.system_health_metrics(health_status) 
  WHERE health_status != 'healthy';

-- Slow query log table
CREATE TABLE IF NOT EXISTS public.slow_query_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_text TEXT NOT NULL,
  query_hash TEXT NOT NULL, -- Hash for grouping similar queries
  execution_time_ms NUMERIC NOT NULL,
  table_names TEXT[],
  user_id UUID REFERENCES auth.users(id),
  
  -- Query details
  query_plan JSONB,
  parameters JSONB,
  row_count INTEGER,
  
  -- Context
  endpoint TEXT,
  request_id TEXT,
  
  -- Timestamps
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Optimization
  optimization_suggested BOOLEAN DEFAULT false,
  optimization_notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_slow_query_hash ON public.slow_query_log(query_hash);
CREATE INDEX IF NOT EXISTS idx_slow_query_execution_time ON public.slow_query_log(execution_time_ms DESC);
CREATE INDEX IF NOT EXISTS idx_slow_query_timestamp ON public.slow_query_log(executed_at DESC);

-- KPI tracking table
CREATE TABLE IF NOT EXISTS public.kpi_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  snapshot_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  
  -- Patient metrics
  total_active_patients INTEGER DEFAULT 0,
  new_patients_count INTEGER DEFAULT 0,
  discharged_patients_count INTEGER DEFAULT 0,
  
  -- Appointment metrics
  total_appointments INTEGER DEFAULT 0,
  completed_appointments INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  cancellation_count INTEGER DEFAULT 0,
  utilization_rate NUMERIC DEFAULT 0,
  
  -- Clinical metrics
  total_sessions INTEGER DEFAULT 0,
  avg_phq9_score NUMERIC,
  avg_gad7_score NUMERIC,
  crisis_events INTEGER DEFAULT 0,
  
  -- Financial metrics
  total_revenue NUMERIC DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  collection_rate NUMERIC DEFAULT 0,
  
  -- Provider metrics
  active_providers INTEGER DEFAULT 0,
  avg_caseload NUMERIC DEFAULT 0,
  documentation_compliance_rate NUMERIC DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_snapshot_type CHECK (snapshot_type IN ('daily', 'weekly', 'monthly'))
);

-- Create unique constraint and indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_snapshot_unique ON public.kpi_snapshots(snapshot_date, snapshot_type);
CREATE INDEX IF NOT EXISTS idx_kpi_snapshot_date ON public.kpi_snapshots(snapshot_date DESC);

-- Enable RLS
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slow_query_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for performance_metrics
CREATE POLICY "Administrators can view performance metrics"
  ON public.performance_metrics FOR SELECT
  USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "System can insert performance metrics"
  ON public.performance_metrics FOR INSERT
  WITH CHECK (true);

-- RLS Policies for clinical_analytics_cache
CREATE POLICY "Administrators and supervisors can view analytics"
  ON public.clinical_analytics_cache FOR SELECT
  USING (
    has_role(auth.uid(), 'administrator') OR 
    has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "System can manage analytics cache"
  ON public.clinical_analytics_cache FOR ALL
  USING (has_role(auth.uid(), 'administrator'));

-- RLS Policies for system_health_metrics
CREATE POLICY "Administrators can view system health"
  ON public.system_health_metrics FOR SELECT
  USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "System can insert health metrics"
  ON public.system_health_metrics FOR INSERT
  WITH CHECK (true);

-- RLS Policies for slow_query_log
CREATE POLICY "Administrators can view slow queries"
  ON public.slow_query_log FOR SELECT
  USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "System can log slow queries"
  ON public.slow_query_log FOR INSERT
  WITH CHECK (true);

-- RLS Policies for kpi_snapshots
CREATE POLICY "Administrators and supervisors can view KPIs"
  ON public.kpi_snapshots FOR SELECT
  USING (
    has_role(auth.uid(), 'administrator') OR 
    has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "System can manage KPI snapshots"
  ON public.kpi_snapshots FOR ALL
  USING (has_role(auth.uid(), 'administrator'));

-- Add comments
COMMENT ON TABLE public.performance_metrics IS 'Tracks system performance metrics for monitoring and optimization';
COMMENT ON TABLE public.clinical_analytics_cache IS 'Cached analytics data for faster dashboard loading';
COMMENT ON TABLE public.system_health_metrics IS 'Overall system health and resource utilization metrics';
COMMENT ON TABLE public.slow_query_log IS 'Log of slow database queries for optimization';
COMMENT ON TABLE public.kpi_snapshots IS 'Daily/weekly/monthly snapshots of key performance indicators';