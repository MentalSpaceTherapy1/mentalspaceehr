-- Increase participant limit to 16
ALTER TABLE public.telehealth_sessions 
ALTER COLUMN max_participants SET DEFAULT 16;

-- Update existing sessions to use new default
UPDATE public.telehealth_sessions 
SET max_participants = 16 
WHERE max_participants = 2;

-- Create bandwidth test table
CREATE TABLE public.session_bandwidth_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.telehealth_sessions(id),
  user_id UUID REFERENCES auth.users(id),
  test_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Test Results
  download_mbps NUMERIC,
  upload_mbps NUMERIC,
  test_duration_ms INTEGER,
  
  -- Quality Assessment
  quality_rating TEXT CHECK (quality_rating IN ('good', 'fair', 'poor')),
  recommended_video_quality TEXT,
  
  -- User Decision
  user_proceeded BOOLEAN,
  user_selected_quality TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.session_bandwidth_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own tests"
  ON public.session_bandwidth_tests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tests"
  ON public.session_bandwidth_tests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_bandwidth_tests;