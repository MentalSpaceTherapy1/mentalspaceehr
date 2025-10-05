-- Create compliance rules table
CREATE TABLE public.compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id TEXT NOT NULL UNIQUE,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('Documentation Timeliness', 'Signature Required', 'Supervisor Review', 'Other')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Rule Parameters
  days_allowed_for_documentation INTEGER NOT NULL DEFAULT 3,
  lockout_day TEXT NOT NULL DEFAULT 'Sunday',
  lockout_time TIME NOT NULL DEFAULT '23:59:59',
  grace_period_hours INTEGER DEFAULT 0,
  
  -- Notifications
  send_warning_notifications BOOLEAN NOT NULL DEFAULT true,
  warning_days_before_due INTEGER[] DEFAULT ARRAY[2, 1, 0],
  
  -- Actions
  automatic_locking BOOLEAN NOT NULL DEFAULT true,
  require_approval_to_unlock BOOLEAN NOT NULL DEFAULT true,
  
  -- Exceptions
  allow_exceptions BOOLEAN DEFAULT false,
  exception_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create compliance status table
CREATE TABLE public.note_compliance_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  note_type TEXT NOT NULL CHECK (note_type IN ('clinical_note', 'intake_assessment', 'treatment_plan', 'progress_note', 'contact_note', 'consultation_note', 'cancellation_note', 'miscellaneous_note')),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  clinician_id UUID NOT NULL,
  session_date DATE NOT NULL,
  due_date DATE NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'On Time' CHECK (status IN ('On Time', 'Due Soon', 'Overdue', 'Late', 'Locked')),
  days_until_due INTEGER,
  days_overdue INTEGER,
  
  -- Lock Status
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_date TIMESTAMP WITH TIME ZONE,
  lock_reason TEXT,
  
  -- Unlock Request
  unlock_requested BOOLEAN NOT NULL DEFAULT false,
  unlock_request_date TIMESTAMP WITH TIME ZONE,
  unlock_request_reason TEXT,
  unlock_requester_id UUID REFERENCES auth.users(id),
  unlock_approver_id UUID REFERENCES auth.users(id),
  unlock_approved BOOLEAN,
  unlock_approved_date TIMESTAMP WITH TIME ZONE,
  unlock_denied_reason TEXT,
  unlock_expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(note_id, note_type)
);

-- Create compliance warnings table
CREATE TABLE public.compliance_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_status_id UUID NOT NULL REFERENCES public.note_compliance_status(id) ON DELETE CASCADE,
  warning_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  warning_type TEXT NOT NULL CHECK (warning_type IN ('Email', 'SMS', 'Dashboard Alert')),
  delivered BOOLEAN NOT NULL DEFAULT false,
  delivery_date TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unlock requests table for tracking
CREATE TABLE public.unlock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_status_id UUID NOT NULL REFERENCES public.note_compliance_status(id) ON DELETE CASCADE,
  note_id UUID NOT NULL,
  note_type TEXT NOT NULL,
  
  requester_id UUID NOT NULL REFERENCES auth.users(id),
  request_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  request_reason TEXT NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Denied', 'Expired')),
  
  reviewer_id UUID REFERENCES auth.users(id),
  reviewed_date TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_compliance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlock_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for compliance_rules
CREATE POLICY "Administrators can manage compliance rules"
  ON public.compliance_rules
  FOR ALL
  USING (has_role(auth.uid(), 'administrator'))
  WITH CHECK (has_role(auth.uid(), 'administrator'));

CREATE POLICY "All authenticated users can view compliance rules"
  ON public.compliance_rules
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for note_compliance_status
CREATE POLICY "Clinicians can view their own compliance status"
  ON public.note_compliance_status
  FOR SELECT
  USING (
    clinician_id = auth.uid() OR 
    has_role(auth.uid(), 'administrator') OR 
    has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "System can manage compliance status"
  ON public.note_compliance_status
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for compliance_warnings
CREATE POLICY "Users can view their own warnings"
  ON public.compliance_warnings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.note_compliance_status ncs
      WHERE ncs.id = compliance_warnings.compliance_status_id
      AND (ncs.clinician_id = auth.uid() OR has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'supervisor'))
    )
  );

CREATE POLICY "System can insert warnings"
  ON public.compliance_warnings
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for unlock_requests
CREATE POLICY "Users can view relevant unlock requests"
  ON public.unlock_requests
  FOR SELECT
  USING (
    requester_id = auth.uid() OR 
    reviewer_id = auth.uid() OR
    has_role(auth.uid(), 'administrator') OR 
    has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Clinicians can create unlock requests"
  ON public.unlock_requests
  FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Supervisors can update unlock requests"
  ON public.unlock_requests
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'administrator') OR 
    has_role(auth.uid(), 'supervisor')
  );

-- Create indexes for performance
CREATE INDEX idx_compliance_status_clinician ON public.note_compliance_status(clinician_id);
CREATE INDEX idx_compliance_status_session_date ON public.note_compliance_status(session_date);
CREATE INDEX idx_compliance_status_due_date ON public.note_compliance_status(due_date);
CREATE INDEX idx_compliance_status_status ON public.note_compliance_status(status);
CREATE INDEX idx_compliance_status_locked ON public.note_compliance_status(is_locked);
CREATE INDEX idx_unlock_requests_status ON public.unlock_requests(status);
CREATE INDEX idx_unlock_requests_requester ON public.unlock_requests(requester_id);
CREATE INDEX idx_unlock_requests_reviewer ON public.unlock_requests(reviewer_id);

-- Create function to calculate compliance status
CREATE OR REPLACE FUNCTION public.calculate_compliance_status(
  p_session_date DATE,
  p_days_allowed INTEGER DEFAULT 3
)
RETURNS TABLE (
  status TEXT,
  days_until_due INTEGER,
  days_overdue INTEGER,
  due_date DATE
) AS $$
DECLARE
  v_due_date DATE;
  v_days_diff INTEGER;
BEGIN
  -- Calculate due date (session_date + days_allowed)
  v_due_date := p_session_date + p_days_allowed;
  
  -- Calculate days difference
  v_days_diff := v_due_date - CURRENT_DATE;
  
  -- Determine status
  IF v_days_diff > 2 THEN
    RETURN QUERY SELECT 'On Time'::TEXT, v_days_diff, 0, v_due_date;
  ELSIF v_days_diff >= 0 THEN
    RETURN QUERY SELECT 'Due Soon'::TEXT, v_days_diff, 0, v_due_date;
  ELSIF v_days_diff >= -1 THEN
    RETURN QUERY SELECT 'Overdue'::TEXT, 0, ABS(v_days_diff), v_due_date;
  ELSE
    RETURN QUERY SELECT 'Late'::TEXT, 0, ABS(v_days_diff), v_due_date;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Insert default compliance rule
INSERT INTO public.compliance_rules (
  rule_id,
  rule_name,
  rule_type,
  is_active,
  days_allowed_for_documentation,
  lockout_day,
  lockout_time,
  send_warning_notifications,
  warning_days_before_due,
  automatic_locking,
  require_approval_to_unlock
) VALUES (
  'default_documentation_timeliness',
  'Default Documentation Timeliness Rule',
  'Documentation Timeliness',
  true,
  3,
  'Sunday',
  '23:59:59',
  true,
  ARRAY[2, 1, 0],
  true,
  true
);

COMMENT ON TABLE public.compliance_rules IS 'Stores compliance rules for documentation requirements';
COMMENT ON TABLE public.note_compliance_status IS 'Tracks compliance status of clinical notes';
COMMENT ON TABLE public.compliance_warnings IS 'Logs compliance warnings sent to clinicians';
COMMENT ON TABLE public.unlock_requests IS 'Tracks requests to unlock locked notes';