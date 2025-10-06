-- Create custom_reports table
CREATE TABLE public.custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_name TEXT NOT NULL,
  report_category TEXT NOT NULL CHECK (report_category IN ('Clinical', 'Financial', 'Operational', 'Compliance', 'Custom')),
  
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Data Source
  data_source TEXT NOT NULL,
  
  -- Filters (JSONB array)
  filters JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Date Range
  date_range_type TEXT NOT NULL DEFAULT 'This Month',
  custom_date_range JSONB,
  
  -- Columns (JSONB array)
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Grouping
  group_by JSONB,
  
  -- Sorting
  sort_by TEXT,
  sort_direction TEXT DEFAULT 'asc' CHECK (sort_direction IN ('asc', 'desc')),
  
  -- Aggregations (JSONB array)
  aggregations JSONB,
  
  -- Visualization
  include_chart BOOLEAN NOT NULL DEFAULT false,
  chart_type TEXT CHECK (chart_type IN ('bar', 'line', 'pie', 'table')),
  
  -- Sharing
  is_shared BOOLEAN NOT NULL DEFAULT false,
  shared_with JSONB DEFAULT '[]'::jsonb,
  
  -- Scheduling
  is_scheduled BOOLEAN NOT NULL DEFAULT false,
  schedule_frequency TEXT CHECK (schedule_frequency IN ('Daily', 'Weekly', 'Monthly')),
  schedule_day_of_week TEXT,
  schedule_time TIME,
  send_to JSONB,
  
  last_run_date TIMESTAMP WITH TIME ZONE,
  last_run_by UUID REFERENCES public.profiles(id),
  
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on custom_reports
ALTER TABLE public.custom_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_reports
CREATE POLICY "Users can view their own reports and shared reports"
ON public.custom_reports
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() OR
  (is_shared = true AND auth.uid()::text = ANY(SELECT jsonb_array_elements_text(shared_with))) OR
  has_role(auth.uid(), 'administrator')
);

CREATE POLICY "Users can create their own reports"
ON public.custom_reports
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own reports"
ON public.custom_reports
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'administrator'));

CREATE POLICY "Users can delete their own reports"
ON public.custom_reports
FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'administrator'));

-- Create indexes
CREATE INDEX idx_custom_reports_created_by ON public.custom_reports(created_by);
CREATE INDEX idx_custom_reports_category ON public.custom_reports(report_category);
CREATE INDEX idx_custom_reports_shared ON public.custom_reports(is_shared);

-- Create report_runs table (for tracking report executions)
CREATE TABLE public.report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.custom_reports(id) ON DELETE CASCADE,
  
  run_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  run_by UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Parameters used
  date_range_start DATE,
  date_range_end DATE,
  filters_applied JSONB,
  
  -- Results
  row_count INTEGER,
  execution_time_ms INTEGER,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'Success' CHECK (status IN ('Success', 'Failed', 'Running')),
  error_message TEXT,
  
  -- Results cache (optional - for performance)
  results_cache JSONB
);

-- Enable RLS on report_runs
ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_runs
CREATE POLICY "Users can view their own report runs"
ON public.report_runs
FOR SELECT
TO authenticated
USING (
  run_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.custom_reports
    WHERE custom_reports.id = report_runs.report_id
    AND (custom_reports.created_by = auth.uid() OR has_role(auth.uid(), 'administrator'))
  )
);

CREATE POLICY "System can create report runs"
ON public.report_runs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_report_runs_report ON public.report_runs(report_id);
CREATE INDEX idx_report_runs_date ON public.report_runs(run_date);
CREATE INDEX idx_report_runs_user ON public.report_runs(run_by);