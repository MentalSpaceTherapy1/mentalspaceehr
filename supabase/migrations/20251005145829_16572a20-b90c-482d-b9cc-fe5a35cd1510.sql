-- Phase 5: Add incident-to billing fields to appointments table
ALTER TABLE public.appointments
ADD COLUMN is_incident_to BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN billed_under_provider_id UUID;

-- Add index for billing queries
CREATE INDEX idx_appointments_incident_to ON public.appointments(is_incident_to, billed_under_provider_id);

-- Phase 6: Create incident_to_audit_log table for comprehensive audit trail
CREATE TABLE public.incident_to_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  incident_to_billing_id UUID REFERENCES public.incident_to_billing(id) ON DELETE CASCADE,
  note_id UUID REFERENCES public.clinical_notes(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  
  -- Action tracking
  action_type TEXT NOT NULL, -- 'created', 'requirements_verified', 'compliance_check', 'attestation_signed', 'billing_submitted', 'modified', 'flagged'
  performed_by UUID NOT NULL,
  action_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Change details
  previous_values JSONB,
  new_values JSONB,
  change_reason TEXT,
  
  -- Compliance tracking
  compliance_status TEXT, -- 'compliant', 'non_compliant', 'warning'
  compliance_issues JSONB,
  
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incident_to_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit log
CREATE POLICY "Administrators can view all audit logs"
ON public.incident_to_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Supervisors can view their audit logs"
ON public.incident_to_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.incident_to_billing itb
    WHERE itb.id = incident_to_audit_log.incident_to_billing_id
    AND itb.supervising_provider_id = auth.uid()
  )
);

CREATE POLICY "System can insert audit logs"
ON public.incident_to_audit_log
FOR INSERT
WITH CHECK (true);

-- Indexes for audit log
CREATE INDEX idx_incident_to_audit_log_billing_id ON public.incident_to_audit_log(incident_to_billing_id);
CREATE INDEX idx_incident_to_audit_log_note_id ON public.incident_to_audit_log(note_id);
CREATE INDEX idx_incident_to_audit_log_performed_by ON public.incident_to_audit_log(performed_by);
CREATE INDEX idx_incident_to_audit_log_action_type ON public.incident_to_audit_log(action_type);
CREATE INDEX idx_incident_to_audit_log_timestamp ON public.incident_to_audit_log(action_timestamp DESC);

-- Comments
COMMENT ON TABLE public.incident_to_audit_log IS 'Comprehensive audit trail for all incident-to billing activities';
COMMENT ON COLUMN public.appointments.is_incident_to IS 'Indicates if this appointment was billed as incident-to';
COMMENT ON COLUMN public.appointments.billed_under_provider_id IS 'The provider ID under which this appointment was billed (for incident-to billing)';