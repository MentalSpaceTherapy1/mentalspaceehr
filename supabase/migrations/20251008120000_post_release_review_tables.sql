-- Post-Release Review System
-- Implements automated tracking and enforcement of 72-hour post-release reviews

-- Table: releases
-- Tracks all production releases
CREATE TABLE public.releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Release Information
  version_number TEXT NOT NULL,
  release_type TEXT NOT NULL CHECK (release_type IN ('major', 'minor', 'patch', 'hotfix')),

  -- Deployment Details
  deployed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deployed_by UUID NOT NULL REFERENCES public.profiles(id),
  deployment_duration_minutes INTEGER,

  -- Git Information
  git_commit_hash TEXT NOT NULL,
  git_branch TEXT NOT NULL,
  git_tag TEXT,

  -- Release Notes
  release_notes TEXT,
  breaking_changes TEXT[],
  feature_list TEXT[],
  bug_fixes TEXT[],

  -- Rollback Information
  was_rolled_back BOOLEAN DEFAULT FALSE,
  rollback_at TIMESTAMP WITH TIME ZONE,
  rollback_reason TEXT,

  -- Review Status
  review_scheduled_at TIMESTAMP WITH TIME ZONE,
  review_completed_at TIMESTAMP WITH TIME ZONE,
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'scheduled', 'completed', 'overdue')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for releases
CREATE INDEX idx_releases_deployed_at ON public.releases(deployed_at DESC);
CREATE INDEX idx_releases_review_status ON public.releases(review_status);
CREATE INDEX idx_releases_version ON public.releases(version_number);

-- Table: release_metrics
-- Automated metrics collection at 24h, 48h, 72h intervals
CREATE TABLE public.release_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,

  -- Timing
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  hours_since_deployment INTEGER NOT NULL CHECK (hours_since_deployment IN (24, 48, 72)),

  -- Error Metrics
  error_count_24h INTEGER,
  error_rate_percentage DECIMAL(5, 2),
  error_rate_change_percentage DECIMAL(5, 2),
  critical_errors INTEGER,

  -- Performance Metrics
  avg_response_time_ms INTEGER,
  p95_response_time_ms INTEGER,
  p99_response_time_ms INTEGER,
  response_time_change_percentage DECIMAL(5, 2),

  -- Database Metrics
  avg_query_time_ms DECIMAL(10, 2),
  slow_query_count INTEGER,
  database_connection_errors INTEGER,

  -- User Metrics
  daily_active_users INTEGER,
  avg_session_duration_minutes DECIMAL(10, 2),
  user_retention_rate DECIMAL(5, 2),

  -- Business Metrics
  appointments_created INTEGER,
  notes_saved INTEGER,
  claims_submitted INTEGER,
  portal_logins INTEGER,
  payments_processed INTEGER,

  -- Support Metrics
  support_tickets_opened INTEGER,
  critical_support_tickets INTEGER,
  avg_ticket_resolution_time_hours DECIMAL(10, 2),

  -- Comparison to Baseline
  business_metrics_comparison JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(release_id, hours_since_deployment)
);

-- Indexes for release_metrics
CREATE INDEX idx_release_metrics_release_id ON public.release_metrics(release_id);
CREATE INDEX idx_release_metrics_captured_at ON public.release_metrics(captured_at DESC);

-- Table: post_release_reviews
-- Records of completed post-release review meetings
CREATE TABLE public.post_release_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,

  -- Review Meeting
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  conducted_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,

  -- Participants
  participants UUID[] NOT NULL,
  facilitator_id UUID NOT NULL REFERENCES public.profiles(id),

  -- Review Findings
  overall_status TEXT NOT NULL CHECK (overall_status IN ('success', 'success_with_issues', 'partial_failure', 'failure')),
  deployment_quality_score INTEGER CHECK (deployment_quality_score BETWEEN 1 AND 10),

  -- Defect Analysis
  defects_found INTEGER DEFAULT 0,
  critical_defects INTEGER DEFAULT 0,
  high_priority_defects INTEGER DEFAULT 0,
  defects_resolved INTEGER DEFAULT 0,

  -- Performance Assessment
  performance_rating TEXT CHECK (performance_rating IN ('excellent', 'good', 'acceptable', 'poor')),
  performance_notes TEXT,

  -- User Impact Assessment
  user_impact_rating TEXT CHECK (user_impact_rating IN ('none', 'minimal', 'moderate', 'significant')),
  user_impact_description TEXT,

  -- What Went Well
  successes TEXT[],

  -- What Went Wrong
  issues TEXT[],
  root_causes TEXT[],

  -- Lessons Learned
  lessons_learned TEXT[],

  -- Action Items (stored as JSONB array)
  action_items JSONB,

  -- Recommendations
  process_improvements TEXT[],
  technical_improvements TEXT[],

  -- Follow-up
  requires_followup_review BOOLEAN DEFAULT FALSE,
  followup_review_date TIMESTAMP WITH TIME ZONE,

  -- Documentation
  meeting_notes TEXT,
  attachments TEXT[],

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for post_release_reviews
CREATE INDEX idx_post_release_reviews_release_id ON public.post_release_reviews(release_id);
CREATE INDEX idx_post_release_reviews_scheduled_at ON public.post_release_reviews(scheduled_at DESC);
CREATE INDEX idx_post_release_reviews_status ON public.post_release_reviews(overall_status);

-- Table: release_stakeholders
-- Defines who should be notified and invited to reviews
CREATE TABLE public.release_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('release_manager', 'engineering_lead', 'qa_lead', 'operations_manager', 'product_owner', 'database_administrator', 'security_lead')),

  -- Notification Preferences
  notify_on_deployment BOOLEAN DEFAULT TRUE,
  notify_on_review BOOLEAN DEFAULT TRUE,
  notify_on_rollback BOOLEAN DEFAULT TRUE,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(profile_id, role)
);

-- Indexes for release_stakeholders
CREATE INDEX idx_release_stakeholders_profile_id ON public.release_stakeholders(profile_id);
CREATE INDEX idx_release_stakeholders_active ON public.release_stakeholders(is_active);

-- Enable RLS on all tables
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_release_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_stakeholders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for releases
CREATE POLICY "Administrators can view all releases"
ON public.releases
FOR SELECT
USING (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Release managers can view all releases"
ON public.releases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.release_stakeholders
    WHERE profile_id = auth.uid()
    AND is_active = TRUE
  )
);

CREATE POLICY "Administrators can manage releases"
ON public.releases
FOR ALL
USING (has_role(auth.uid(), 'administrator'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

-- RLS Policies for release_metrics
CREATE POLICY "Stakeholders can view release metrics"
ON public.release_metrics
FOR SELECT
USING (
  has_role(auth.uid(), 'administrator'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.release_stakeholders
    WHERE profile_id = auth.uid()
    AND is_active = TRUE
  )
);

CREATE POLICY "System can insert release metrics"
ON public.release_metrics
FOR INSERT
WITH CHECK (true);

-- RLS Policies for post_release_reviews
CREATE POLICY "Stakeholders can view reviews"
ON public.post_release_reviews
FOR SELECT
USING (
  has_role(auth.uid(), 'administrator'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.release_stakeholders
    WHERE profile_id = auth.uid()
    AND is_active = TRUE
  )
);

CREATE POLICY "Facilitators can create reviews"
ON public.post_release_reviews
FOR INSERT
WITH CHECK (
  facilitator_id = auth.uid()
  OR has_role(auth.uid(), 'administrator'::app_role)
);

CREATE POLICY "Facilitators can update their reviews"
ON public.post_release_reviews
FOR UPDATE
USING (
  facilitator_id = auth.uid()
  OR has_role(auth.uid(), 'administrator'::app_role)
)
WITH CHECK (
  facilitator_id = auth.uid()
  OR has_role(auth.uid(), 'administrator'::app_role)
);

-- RLS Policies for release_stakeholders
CREATE POLICY "Administrators can manage stakeholders"
ON public.release_stakeholders
FOR ALL
USING (has_role(auth.uid(), 'administrator'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Users can view stakeholder list"
ON public.release_stakeholders
FOR SELECT
USING (is_active = TRUE);

-- Function: Check for overdue reviews
CREATE OR REPLACE FUNCTION check_overdue_reviews()
RETURNS TRIGGER AS $$
BEGIN
  -- If review is scheduled but not completed, and scheduled time has passed by 24 hours
  IF NEW.review_status = 'scheduled'
     AND NEW.review_completed_at IS NULL
     AND NEW.review_scheduled_at < (NOW() - INTERVAL '24 hours')
  THEN
    NEW.review_status := 'overdue';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update review status to overdue
CREATE TRIGGER trigger_check_overdue_reviews
BEFORE UPDATE ON public.releases
FOR EACH ROW
EXECUTE FUNCTION check_overdue_reviews();

-- Function: Record release deployment (helper function)
CREATE OR REPLACE FUNCTION record_release_deployment(
  p_version_number TEXT,
  p_release_type TEXT,
  p_deployed_by UUID,
  p_git_commit_hash TEXT,
  p_git_branch TEXT,
  p_release_notes TEXT DEFAULT NULL,
  p_feature_list TEXT[] DEFAULT NULL,
  p_bug_fixes TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_release_id UUID;
BEGIN
  INSERT INTO public.releases (
    version_number,
    release_type,
    deployed_at,
    deployed_by,
    git_commit_hash,
    git_branch,
    release_notes,
    feature_list,
    bug_fixes
  ) VALUES (
    p_version_number,
    p_release_type,
    NOW(),
    p_deployed_by,
    p_git_commit_hash,
    p_git_branch,
    p_release_notes,
    p_feature_list,
    p_bug_fixes
  )
  RETURNING id INTO v_release_id;

  -- Log the deployment
  INSERT INTO public.audit_logs (
    user_id,
    action_type,
    resource_type,
    resource_id,
    action_description,
    severity
  ) VALUES (
    p_deployed_by,
    'configuration_change',
    'settings',
    v_release_id,
    'Deployed release ' || p_version_number || ' to production',
    'warning'
  );

  RETURN v_release_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Complete post-release review
CREATE OR REPLACE FUNCTION complete_post_release_review(
  p_release_id UUID,
  p_review_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update release status
  UPDATE public.releases
  SET
    review_completed_at = NOW(),
    review_status = 'completed',
    updated_at = NOW()
  WHERE id = p_release_id;

  -- Update review conducted_at
  UPDATE public.post_release_reviews
  SET
    conducted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_review_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE public.releases IS 'Tracks all production releases for post-release review process';
COMMENT ON TABLE public.release_metrics IS 'Automated metrics snapshots at 24h, 48h, and 72h post-deployment';
COMMENT ON TABLE public.post_release_reviews IS 'Records of completed post-release review meetings';
COMMENT ON TABLE public.release_stakeholders IS 'Stakeholders who should be notified and invited to release reviews';

COMMENT ON COLUMN public.releases.review_status IS 'pending: awaiting metrics, scheduled: review meeting set, completed: review done, overdue: past 72h deadline';
COMMENT ON COLUMN public.release_metrics.hours_since_deployment IS 'Must be 24, 48, or 72 hours after deployment';
COMMENT ON COLUMN public.post_release_reviews.deployment_quality_score IS 'Overall release quality score (1-10) based on rubric';
COMMENT ON COLUMN public.post_release_reviews.action_items IS 'Array of action items: [{ description, assignee_id, due_date, priority, status, category }]';
