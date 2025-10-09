-- Phase 1: Enhanced Audit Logging System
-- Add indexes for efficient audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity 
ON audit_logs(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type 
ON audit_logs(action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource 
ON audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time
ON audit_logs(user_id, created_at DESC);

-- Add table for real-time audit alert rules
CREATE TABLE IF NOT EXISTS audit_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  threshold INTEGER NOT NULL, -- e.g., 50 for "50 PHI access in 1 hour"
  time_window_minutes INTEGER NOT NULL,
  alert_recipients UUID[] NOT NULL, -- user IDs to notify
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit_alert_rules
ALTER TABLE audit_alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alert rules"
ON audit_alert_rules
FOR ALL
USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "All users can view active alert rules"
ON audit_alert_rules
FOR SELECT
USING (is_active = true);

-- Create table for storing data quality check results
CREATE TABLE IF NOT EXISTS data_quality_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_date TIMESTAMPTZ NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dq_check_date ON data_quality_results(check_date DESC);

-- Enable RLS
ALTER TABLE data_quality_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view quality results"
ON data_quality_results
FOR SELECT
USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "System can insert quality results"
ON data_quality_results
FOR INSERT
WITH CHECK (true);

-- Function to check audit alert thresholds
CREATE OR REPLACE FUNCTION check_audit_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule RECORD;
  event_count INTEGER;
  admin_ids UUID[];
BEGIN
  -- Only check if this is a high-severity action
  IF NEW.severity NOT IN ('warning', 'critical') THEN
    RETURN NEW;
  END IF;
  
  -- Check all active alert rules matching this event
  FOR rule IN 
    SELECT * FROM audit_alert_rules 
    WHERE is_active = true 
    AND action_type = NEW.action_type
    AND resource_type = NEW.resource_type
    AND severity = NEW.severity
  LOOP
    -- Count events in time window
    SELECT COUNT(*) INTO event_count
    FROM audit_logs
    WHERE action_type = rule.action_type
    AND resource_type = rule.resource_type
    AND user_id = NEW.user_id
    AND created_at > NOW() - (rule.time_window_minutes || ' minutes')::INTERVAL;
    
    -- If threshold exceeded, create notification
    IF event_count >= rule.threshold THEN
      -- Get all administrators if no specific recipients
      IF array_length(rule.alert_recipients, 1) IS NULL OR array_length(rule.alert_recipients, 1) = 0 THEN
        SELECT array_agg(user_id) INTO admin_ids
        FROM user_roles
        WHERE role = 'administrator';
      ELSE
        admin_ids := rule.alert_recipients;
      END IF;
      
      -- Insert notification
      INSERT INTO notification_logs (
        notification_type,
        recipient_user_ids,
        subject,
        message,
        priority,
        sent_via,
        created_at
      ) VALUES (
        'security_alert',
        admin_ids,
        'Audit Alert: ' || rule.rule_name,
        format('User %s has triggered %s events in %s minutes (threshold: %s). Action: %s on %s',
          NEW.user_id, event_count, rule.time_window_minutes, rule.threshold,
          NEW.action_type, NEW.resource_type),
        'urgent',
        ARRAY['in_app', 'email'],
        NOW()
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger to check alerts on audit log insert
DROP TRIGGER IF EXISTS audit_alert_check ON audit_logs;
CREATE TRIGGER audit_alert_check
AFTER INSERT ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION check_audit_alerts();

-- Function to check excessive PHI access
CREATE OR REPLACE FUNCTION check_excessive_phi_access(
  hours INTEGER DEFAULT 1,
  threshold INTEGER DEFAULT 50
)
RETURNS TABLE (
  user_id UUID,
  access_count BIGINT,
  user_email TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    al.user_id,
    COUNT(*) as access_count,
    p.email as user_email
  FROM audit_logs al
  JOIN profiles p ON p.id = al.user_id
  WHERE al.action_type = 'phi_access'
  AND al.created_at > NOW() - (hours || ' hours')::INTERVAL
  GROUP BY al.user_id, p.email
  HAVING COUNT(*) > threshold
  ORDER BY access_count DESC;
$$;

-- Insert default alert rules
INSERT INTO audit_alert_rules (rule_name, action_type, resource_type, severity, threshold, time_window_minutes, alert_recipients)
VALUES 
  ('Excessive PHI Access', 'phi_access', 'client_chart', 'critical', 50, 60, ARRAY[]::UUID[]),
  ('Multiple Failed Login Attempts', 'authentication_attempt', 'user_management', 'warning', 5, 15, ARRAY[]::UUID[]),
  ('Unauthorized Admin Actions', 'admin_action', 'role_assignment', 'critical', 1, 1, ARRAY[]::UUID[]),
  ('Bulk Data Export', 'phi_access', 'client_chart', 'warning', 10, 5, ARRAY[]::UUID[])
ON CONFLICT DO NOTHING;