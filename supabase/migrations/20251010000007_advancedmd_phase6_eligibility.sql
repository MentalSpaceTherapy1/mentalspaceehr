-- AdvancedMD Phase 6: Insurance Eligibility Verification & Benefits Check
-- This migration creates the database schema for real-time and batch eligibility verification

-- Eligibility verification requests table
CREATE TABLE IF NOT EXISTS advancedmd_eligibility_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE NOT NULL,
  patient_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  insurance_id UUID REFERENCES client_insurance(id) ON DELETE SET NULL,

  -- Request details
  verification_type TEXT NOT NULL CHECK (verification_type IN ('real_time', 'batch')),
  service_type TEXT NOT NULL, -- Medical care, Mental health, etc.
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Request status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'error')),

  -- Response details
  payer_name TEXT,
  payer_id TEXT,
  subscriber_id TEXT,
  group_number TEXT,

  -- Eligibility status
  is_eligible BOOLEAN,
  eligibility_status TEXT, -- Active, Inactive, etc.
  effective_date DATE,
  termination_date DATE,

  -- Coverage details (JSONB for flexibility)
  coverage_details JSONB DEFAULT '{}', -- Deductibles, copays, coinsurance, out-of-pocket max
  plan_details JSONB DEFAULT '{}', -- Plan name, type, network status
  service_limitations JSONB DEFAULT '[]', -- Array of limitations

  -- Raw EDI data
  x12_request TEXT, -- 270 transaction
  x12_response TEXT, -- 271 transaction

  -- Error handling
  error_message TEXT,
  error_code TEXT,

  -- Metadata
  verification_source TEXT DEFAULT 'advancedmd', -- Source of verification
  response_received_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Batch eligibility jobs table
CREATE TABLE IF NOT EXISTS advancedmd_eligibility_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT UNIQUE NOT NULL,

  -- Batch details
  batch_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  total_patients INTEGER NOT NULL DEFAULT 0,
  processed_count INTEGER NOT NULL DEFAULT 0,
  successful_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Results
  result_summary JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link table for batch jobs and requests
CREATE TABLE IF NOT EXISTS advancedmd_eligibility_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES advancedmd_eligibility_batches(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES advancedmd_eligibility_requests(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(batch_id, request_id)
);

-- Eligibility alerts table (for expiring coverage, etc.)
CREATE TABLE IF NOT EXISTS advancedmd_eligibility_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  insurance_id UUID REFERENCES client_insurance(id) ON DELETE SET NULL,

  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('expiring_coverage', 'coverage_terminated', 'verification_failed', 'deductible_met', 'authorization_required')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,

  -- Status
  is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,

  -- Related data
  related_request_id UUID REFERENCES advancedmd_eligibility_requests(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_eligibility_requests_patient ON advancedmd_eligibility_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_requests_insurance ON advancedmd_eligibility_requests(insurance_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_requests_status ON advancedmd_eligibility_requests(status);
CREATE INDEX IF NOT EXISTS idx_eligibility_requests_requested_at ON advancedmd_eligibility_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_eligibility_batches_status ON advancedmd_eligibility_batches(status);
CREATE INDEX IF NOT EXISTS idx_eligibility_batches_scheduled ON advancedmd_eligibility_batches(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_eligibility_batch_items_batch ON advancedmd_eligibility_batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_alerts_patient ON advancedmd_eligibility_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_alerts_acknowledged ON advancedmd_eligibility_alerts(is_acknowledged) WHERE is_acknowledged = FALSE;

-- View: Active eligibility verifications
CREATE OR REPLACE VIEW active_eligibility_verifications AS
SELECT
  er.id,
  er.request_number,
  er.patient_id,
  p.first_name || ' ' || p.last_name AS patient_name,
  er.payer_name,
  er.subscriber_id,
  er.is_eligible,
  er.eligibility_status,
  er.effective_date,
  er.termination_date,
  er.verification_type,
  er.requested_at,
  er.status,
  EXTRACT(DAY FROM (er.termination_date::TIMESTAMPTZ - NOW())) AS days_until_termination
FROM advancedmd_eligibility_requests er
JOIN clients p ON er.patient_id = p.id
WHERE er.status = 'completed'
  AND er.is_eligible = TRUE
  AND (er.termination_date IS NULL OR er.termination_date >= CURRENT_DATE);

-- View: Eligibility verification summary by payer
CREATE OR REPLACE VIEW eligibility_verification_summary AS
SELECT
  payer_name,
  COUNT(*) AS total_verifications,
  COUNT(*) FILTER (WHERE is_eligible = TRUE) AS eligible_count,
  COUNT(*) FILTER (WHERE is_eligible = FALSE) AS ineligible_count,
  COUNT(*) FILTER (WHERE status = 'failed' OR status = 'error') AS failed_count,
  ROUND(
    (COUNT(*) FILTER (WHERE is_eligible = TRUE)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0) * 100),
    2
  ) AS eligibility_rate,
  AVG(EXTRACT(EPOCH FROM (response_received_at - requested_at)) / 60) AS avg_response_time_minutes
FROM advancedmd_eligibility_requests
WHERE requested_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY payer_name
ORDER BY total_verifications DESC;

-- View: Upcoming coverage expirations
CREATE OR REPLACE VIEW upcoming_coverage_expirations AS
SELECT
  er.patient_id,
  p.first_name || ' ' || p.last_name AS patient_name,
  er.payer_name,
  er.subscriber_id,
  er.termination_date,
  EXTRACT(DAY FROM (er.termination_date::TIMESTAMPTZ - NOW())) AS days_until_expiration,
  CASE
    WHEN er.termination_date <= CURRENT_DATE THEN 'Expired'
    WHEN er.termination_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'Expiring This Week'
    WHEN er.termination_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring This Month'
    ELSE 'Expiring Soon'
  END AS expiration_status
FROM advancedmd_eligibility_requests er
JOIN clients p ON er.patient_id = p.id
WHERE er.status = 'completed'
  AND er.is_eligible = TRUE
  AND er.termination_date IS NOT NULL
  AND er.termination_date <= CURRENT_DATE + INTERVAL '60 days'
  AND er.id IN (
    SELECT DISTINCT ON (patient_id) id
    FROM advancedmd_eligibility_requests
    WHERE status = 'completed'
    ORDER BY patient_id, requested_at DESC
  )
ORDER BY er.termination_date ASC;

-- Function: Get latest eligibility for patient
CREATE OR REPLACE FUNCTION get_latest_eligibility(p_patient_id UUID)
RETURNS TABLE (
  request_id UUID,
  request_number TEXT,
  payer_name TEXT,
  subscriber_id TEXT,
  is_eligible BOOLEAN,
  eligibility_status TEXT,
  effective_date DATE,
  termination_date DATE,
  coverage_details JSONB,
  plan_details JSONB,
  requested_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    er.id,
    er.request_number,
    er.payer_name,
    er.subscriber_id,
    er.is_eligible,
    er.eligibility_status,
    er.effective_date,
    er.termination_date,
    er.coverage_details,
    er.plan_details,
    er.requested_at,
    er.response_received_at
  FROM advancedmd_eligibility_requests er
  WHERE er.patient_id = p_patient_id
    AND er.status = 'completed'
  ORDER BY er.requested_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if eligibility needs refresh
CREATE OR REPLACE FUNCTION needs_eligibility_refresh(p_patient_id UUID, p_days_threshold INTEGER DEFAULT 30)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_verification_date TIMESTAMPTZ;
BEGIN
  SELECT MAX(requested_at)
  INTO v_last_verification_date
  FROM advancedmd_eligibility_requests
  WHERE patient_id = p_patient_id
    AND status = 'completed';

  IF v_last_verification_date IS NULL THEN
    RETURN TRUE; -- No verification exists
  END IF;

  IF v_last_verification_date < CURRENT_DATE - (p_days_threshold || ' days')::INTERVAL THEN
    RETURN TRUE; -- Last verification is older than threshold
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create eligibility alert
CREATE OR REPLACE FUNCTION create_eligibility_alert(
  p_patient_id UUID,
  p_insurance_id UUID,
  p_alert_type TEXT,
  p_severity TEXT,
  p_message TEXT,
  p_related_request_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO advancedmd_eligibility_alerts (
    patient_id,
    insurance_id,
    alert_type,
    severity,
    message,
    related_request_id
  ) VALUES (
    p_patient_id,
    p_insurance_id,
    p_alert_type,
    p_severity,
    p_message,
    p_related_request_id
  )
  RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_eligibility_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER eligibility_requests_updated_at
  BEFORE UPDATE ON advancedmd_eligibility_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_eligibility_updated_at();

CREATE TRIGGER eligibility_batches_updated_at
  BEFORE UPDATE ON advancedmd_eligibility_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_eligibility_updated_at();

CREATE TRIGGER eligibility_alerts_updated_at
  BEFORE UPDATE ON advancedmd_eligibility_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_eligibility_updated_at();

-- RLS Policies
ALTER TABLE advancedmd_eligibility_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_eligibility_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_eligibility_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_eligibility_alerts ENABLE ROW LEVEL SECURITY;

-- Administrators and billing staff can manage eligibility requests
CREATE POLICY "Billing staff can manage eligibility requests" ON advancedmd_eligibility_requests
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  );

-- Therapists can view eligibility for their patients
CREATE POLICY "Therapists can view patient eligibility" ON advancedmd_eligibility_requests
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'therapist'::app_role)
    AND patient_id IN (
      SELECT client_id FROM appointments WHERE clinician_id = auth.uid()
    )
  );

-- Administrators and billing staff can manage batches
CREATE POLICY "Billing staff can manage eligibility batches" ON advancedmd_eligibility_batches
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  );

-- Administrators and billing staff can manage batch items
CREATE POLICY "Billing staff can manage batch items" ON advancedmd_eligibility_batch_items
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  );

-- Staff can view eligibility alerts
CREATE POLICY "Staff can view eligibility alerts" ON advancedmd_eligibility_alerts
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
    OR has_role(auth.uid(), 'front_desk'::app_role)
  );

-- Administrators and billing staff can manage alerts
CREATE POLICY "Billing staff can manage eligibility alerts" ON advancedmd_eligibility_alerts
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  );

-- Comments
COMMENT ON TABLE advancedmd_eligibility_requests IS 'Real-time and batch eligibility verification requests with EDI 270/271 support';
COMMENT ON TABLE advancedmd_eligibility_batches IS 'Batch eligibility verification jobs for scheduled processing';
COMMENT ON TABLE advancedmd_eligibility_batch_items IS 'Individual requests within batch jobs';
COMMENT ON TABLE advancedmd_eligibility_alerts IS 'Automated alerts for eligibility issues and coverage changes';
COMMENT ON VIEW active_eligibility_verifications IS 'Currently active and eligible patient coverage';
COMMENT ON VIEW eligibility_verification_summary IS 'Verification statistics by payer';
COMMENT ON VIEW upcoming_coverage_expirations IS 'Patients with insurance coverage expiring soon';
