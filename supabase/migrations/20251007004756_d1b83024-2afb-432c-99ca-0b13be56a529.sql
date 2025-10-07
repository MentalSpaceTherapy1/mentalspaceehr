-- Enhance clinical_assessments table with critical items
ALTER TABLE clinical_assessments
ADD COLUMN IF NOT EXISTS critical_items jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN clinical_assessments.critical_items IS 'Array of critical items with threshold and actions: [{itemId, threshold, action, notifyRoles}]';

-- Create assessment_critical_alerts table
CREATE TABLE IF NOT EXISTS assessment_critical_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  administration_id uuid NOT NULL REFERENCES assessment_administrations(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES clinical_assessments(id),
  client_id uuid NOT NULL REFERENCES clients(id),
  
  -- Critical item details
  critical_item_id text NOT NULL,
  item_text text NOT NULL,
  response_value jsonb NOT NULL,
  severity text NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  
  -- Alert status
  alert_status text NOT NULL DEFAULT 'Active' CHECK (alert_status IN ('Active', 'Acknowledged', 'Resolved', 'Escalated')),
  triggered_at timestamp with time zone NOT NULL DEFAULT now(),
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamp with time zone,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamp with time zone,
  
  -- Actions taken
  action_required text,
  actions_taken text,
  follow_up_notes text,
  
  -- Notifications
  notified_users jsonb DEFAULT '[]'::jsonb,
  notification_sent_at timestamp with time zone,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE assessment_critical_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_critical_alerts
CREATE POLICY "Clinicians can view alerts for their clients"
ON assessment_critical_alerts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = assessment_critical_alerts.client_id
    AND (
      clients.primary_therapist_id = auth.uid()
      OR clients.psychiatrist_id = auth.uid()
      OR clients.case_manager_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
      OR has_role(auth.uid(), 'supervisor')
    )
  )
);

CREATE POLICY "System can insert critical alerts"
ON assessment_critical_alerts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authorized users can update alerts"
ON assessment_critical_alerts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = assessment_critical_alerts.client_id
    AND (
      clients.primary_therapist_id = auth.uid()
      OR clients.psychiatrist_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
      OR has_role(auth.uid(), 'supervisor')
    )
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_critical_alerts_client ON assessment_critical_alerts(client_id);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_status ON assessment_critical_alerts(alert_status);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_triggered ON assessment_critical_alerts(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_critical_alerts_administration ON assessment_critical_alerts(administration_id);

-- Add portal assignment fields to assessment_administrations
ALTER TABLE assessment_administrations
ADD COLUMN IF NOT EXISTS assigned_via_portal boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS portal_assigned_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS portal_due_date timestamp with time zone;