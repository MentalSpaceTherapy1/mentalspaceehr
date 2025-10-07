-- ============================================================================
-- PHASE 2 SECURITY ENHANCEMENTS
-- Database-backed rate limiting and comprehensive audit logging
-- ============================================================================

-- ============================================================================
-- 1. RATE LIMITING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  operation TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  first_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  window_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, operation, window_expires_at)
);

-- Index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON public.rate_limits(window_expires_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_operation ON public.rate_limits(user_id, operation);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "System can manage rate limits"
ON public.rate_limits
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- ============================================================================
-- 2. AUDIT LOGGING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'phi_access', 'admin_action', 'data_modification', 'login', 'logout'
  resource_type TEXT NOT NULL, -- 'client_chart', 'user_management', 'settings', etc.
  resource_id UUID,
  action_description TEXT NOT NULL,
  action_details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Administrators can view all audit logs
CREATE POLICY "Administrators can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'administrator'::app_role));

-- Users can view their own audit logs (for transparency)
CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================================
-- 3. HELPER FUNCTIONS
-- ============================================================================

-- Function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_operation TEXT,
  p_max_attempts INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
  is_limited BOOLEAN,
  remaining_attempts INTEGER,
  reset_time TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_window_end TIMESTAMP WITH TIME ZONE;
BEGIN
  v_window_start := now();
  v_window_end := v_window_start + (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Try to find existing rate limit record
  SELECT * INTO v_record
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND operation = p_operation
    AND window_expires_at > now()
  ORDER BY window_expires_at DESC
  LIMIT 1;
  
  -- No existing record or expired - create new
  IF v_record IS NULL THEN
    INSERT INTO public.rate_limits (
      user_id, operation, attempt_count, first_attempt, 
      last_attempt, window_expires_at
    )
    VALUES (
      p_user_id, p_operation, 1, v_window_start,
      v_window_start, v_window_end
    );
    
    RETURN QUERY SELECT 
      false::BOOLEAN,
      (p_max_attempts - 1)::INTEGER,
      v_window_end;
    RETURN;
  END IF;
  
  -- Check if limit exceeded
  IF v_record.attempt_count >= p_max_attempts THEN
    RETURN QUERY SELECT 
      true::BOOLEAN,
      0::INTEGER,
      v_record.window_expires_at;
    RETURN;
  END IF;
  
  -- Increment attempt count
  UPDATE public.rate_limits
  SET 
    attempt_count = attempt_count + 1,
    last_attempt = now(),
    updated_at = now()
  WHERE id = v_record.id;
  
  RETURN QUERY SELECT 
    false::BOOLEAN,
    (p_max_attempts - v_record.attempt_count - 1)::INTEGER,
    v_record.window_expires_at;
END;
$$;

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_action_description TEXT,
  p_action_details JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id, action_type, resource_type, resource_id,
    action_description, action_details, severity
  )
  VALUES (
    p_user_id, p_action_type, p_resource_type, p_resource_id,
    p_action_description, p_action_details, p_severity
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function to cleanup expired rate limits
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_expires_at < now() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- ============================================================================
-- 4. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.rate_limits IS 
'Tracks rate limiting for security-sensitive operations. Automatically cleaned up by cron job.';

COMMENT ON TABLE public.audit_logs IS 
'Comprehensive audit trail for HIPAA compliance. Tracks all PHI access and administrative actions.';

COMMENT ON FUNCTION public.check_rate_limit IS 
'Checks and updates rate limit status for a user operation. Returns is_limited, remaining_attempts, and reset_time.';

COMMENT ON FUNCTION public.log_audit_event IS 
'Centralized function for logging audit events. Returns the audit log ID.';

COMMENT ON FUNCTION public.cleanup_expired_rate_limits IS 
'Removes expired rate limit records. Should be called periodically via cron.';