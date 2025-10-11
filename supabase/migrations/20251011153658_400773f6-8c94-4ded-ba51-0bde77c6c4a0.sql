-- ============================================
-- PHASE 6: ELIGIBILITY VERIFICATION SCHEMA
-- ============================================

-- Eligibility Requests Table
CREATE TABLE IF NOT EXISTS public.advancedmd_eligibility_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  insurance_id UUID REFERENCES public.client_insurance(id),
  request_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  requested_by UUID REFERENCES auth.users(id),
  service_type TEXT NOT NULL DEFAULT 'Mental Health',
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payer_name TEXT NOT NULL,
  member_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response_received_at TIMESTAMP WITH TIME ZONE,
  coverage_active BOOLEAN,
  coverage_details JSONB DEFAULT '{}',
  benefits JSONB DEFAULT '{}',
  limitations JSONB DEFAULT '{}',
  copay_amount NUMERIC,
  deductible_remaining NUMERIC,
  out_of_pocket_remaining NUMERIC,
  prior_auth_required BOOLEAN DEFAULT false,
  referral_required BOOLEAN DEFAULT false,
  effective_date DATE,
  termination_date DATE,
  error_message TEXT,
  raw_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Eligibility Batch Jobs Table
CREATE TABLE IF NOT EXISTS public.advancedmd_eligibility_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_patients INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Eligibility Batch Items Table
CREATE TABLE IF NOT EXISTS public.advancedmd_eligibility_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.advancedmd_eligibility_batches(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  insurance_id UUID REFERENCES public.client_insurance(id),
  eligibility_request_id UUID REFERENCES public.advancedmd_eligibility_requests(id),
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Eligibility Alerts Table
CREATE TABLE IF NOT EXISTS public.advancedmd_eligibility_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  eligibility_request_id UUID REFERENCES public.advancedmd_eligibility_requests(id),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Get Latest Eligibility Function
CREATE OR REPLACE FUNCTION public.get_latest_eligibility(p_patient_id UUID)
RETURNS TABLE (
  id UUID,
  request_date TIMESTAMP WITH TIME ZONE,
  status TEXT,
  coverage_active BOOLEAN,
  payer_name TEXT,
  coverage_details JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    er.id,
    er.request_date,
    er.status,
    er.coverage_active,
    er.payer_name,
    er.coverage_details
  FROM public.advancedmd_eligibility_requests er
  WHERE er.patient_id = p_patient_id
    AND er.status = 'completed'
  ORDER BY er.request_date DESC
  LIMIT 1;
END;
$$;

-- Check if Eligibility Needs Refresh Function
CREATE OR REPLACE FUNCTION public.needs_eligibility_refresh(
  p_patient_id UUID,
  p_days_threshold INTEGER DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_check_date TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT request_date INTO v_last_check_date
  FROM public.advancedmd_eligibility_requests
  WHERE patient_id = p_patient_id
    AND status = 'completed'
  ORDER BY request_date DESC
  LIMIT 1;
  
  IF v_last_check_date IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN (CURRENT_DATE - v_last_check_date::DATE) >= p_days_threshold;
END;
$$;

-- Create Eligibility Alert Function
CREATE OR REPLACE FUNCTION public.create_eligibility_alert(
  p_patient_id UUID,
  p_eligibility_request_id UUID,
  p_alert_type TEXT,
  p_severity TEXT,
  p_message TEXT,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO public.advancedmd_eligibility_alerts (
    patient_id,
    eligibility_request_id,
    alert_type,
    severity,
    message,
    details
  ) VALUES (
    p_patient_id,
    p_eligibility_request_id,
    p_alert_type,
    p_severity,
    p_message,
    p_details
  )
  RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$;

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_eligibility_requests_patient ON public.advancedmd_eligibility_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_requests_status ON public.advancedmd_eligibility_requests(status);
CREATE INDEX IF NOT EXISTS idx_eligibility_requests_date ON public.advancedmd_eligibility_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_eligibility_batches_status ON public.advancedmd_eligibility_batches(status);
CREATE INDEX IF NOT EXISTS idx_eligibility_batch_items_batch ON public.advancedmd_eligibility_batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_alerts_patient ON public.advancedmd_eligibility_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_alerts_acknowledged ON public.advancedmd_eligibility_alerts(acknowledged);

-- RLS Policies
ALTER TABLE public.advancedmd_eligibility_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advancedmd_eligibility_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advancedmd_eligibility_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advancedmd_eligibility_alerts ENABLE ROW LEVEL SECURITY;

-- Eligibility Requests Policies
CREATE POLICY "Billing staff can view eligibility requests" ON public.advancedmd_eligibility_requests
  FOR SELECT USING (
    has_role(auth.uid(), 'administrator') OR 
    has_role(auth.uid(), 'billing_staff') OR
    has_role(auth.uid(), 'front_desk') OR
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE id = advancedmd_eligibility_requests.patient_id 
        AND (primary_therapist_id = auth.uid() OR psychiatrist_id = auth.uid())
    )
  );

CREATE POLICY "Billing staff can create eligibility requests" ON public.advancedmd_eligibility_requests
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'administrator') OR 
    has_role(auth.uid(), 'billing_staff') OR
    has_role(auth.uid(), 'front_desk')
  );

CREATE POLICY "Billing staff can update eligibility requests" ON public.advancedmd_eligibility_requests
  FOR UPDATE USING (
    has_role(auth.uid(), 'administrator') OR 
    has_role(auth.uid(), 'billing_staff')
  );

-- Batch Jobs Policies
CREATE POLICY "Billing staff can manage batch jobs" ON public.advancedmd_eligibility_batches
  FOR ALL USING (
    has_role(auth.uid(), 'administrator') OR 
    has_role(auth.uid(), 'billing_staff')
  );

CREATE POLICY "Billing staff can manage batch items" ON public.advancedmd_eligibility_batch_items
  FOR ALL USING (
    has_role(auth.uid(), 'administrator') OR 
    has_role(auth.uid(), 'billing_staff')
  );

-- Alerts Policies
CREATE POLICY "Staff can view eligibility alerts" ON public.advancedmd_eligibility_alerts
  FOR SELECT USING (
    has_role(auth.uid(), 'administrator') OR 
    has_role(auth.uid(), 'billing_staff') OR
    has_role(auth.uid(), 'front_desk') OR
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE id = advancedmd_eligibility_alerts.patient_id 
        AND (primary_therapist_id = auth.uid() OR psychiatrist_id = auth.uid())
    )
  );

CREATE POLICY "Staff can acknowledge alerts" ON public.advancedmd_eligibility_alerts
  FOR UPDATE USING (
    has_role(auth.uid(), 'administrator') OR 
    has_role(auth.uid(), 'billing_staff') OR
    has_role(auth.uid(), 'front_desk')
  );

-- Grant permissions
GRANT ALL ON public.advancedmd_eligibility_requests TO authenticated;
GRANT ALL ON public.advancedmd_eligibility_batches TO authenticated;
GRANT ALL ON public.advancedmd_eligibility_batch_items TO authenticated;
GRANT ALL ON public.advancedmd_eligibility_alerts TO authenticated;