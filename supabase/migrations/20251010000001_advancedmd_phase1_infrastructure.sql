-- ============================================================================
-- AdvancedMD Integration - Phase 1: API Infrastructure
-- ============================================================================

-- Authentication Tokens Table
CREATE TABLE IF NOT EXISTS advancedmd_auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (environment)
);

-- API Audit Logs Table
CREATE TABLE IF NOT EXISTS advancedmd_api_logs (
  id UUID PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE')),
  request_body JSONB,
  response_body JSONB,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER,
  error_message TEXT,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate Limit Tracking Table
CREATE TABLE IF NOT EXISTS advancedmd_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('second', 'minute', 'hour', 'day')),
  request_count INTEGER NOT NULL DEFAULT 0,
  reset_time TIMESTAMPTZ NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (endpoint, period, environment)
);

-- Eligibility Check History Table
CREATE TABLE IF NOT EXISTS advancedmd_eligibility_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  insurance_id UUID REFERENCES client_insurance(id),
  service_date DATE NOT NULL,
  coverage_status TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  payer_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  group_number TEXT,
  plan_name TEXT,
  copay DECIMAL(10, 2),
  coinsurance DECIMAL(5, 2),
  deductible_total DECIMAL(10, 2),
  deductible_met DECIMAL(10, 2),
  deductible_remaining DECIMAL(10, 2),
  oop_max_total DECIMAL(10, 2),
  oop_max_met DECIMAL(10, 2),
  oop_max_remaining DECIMAL(10, 2),
  prior_auth_required BOOLEAN DEFAULT FALSE,
  prior_auth_number TEXT,
  benefits JSONB,
  limitations JSONB,
  check_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_code TEXT,
  raw_response JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claims Table
CREATE TABLE IF NOT EXISTS advancedmd_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id TEXT UNIQUE NOT NULL,
  claim_control_number TEXT,
  payer_claim_control_number TEXT,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('Original', 'Replacement', 'Void')),
  claim_status TEXT NOT NULL CHECK (claim_status IN ('Draft', 'Ready', 'Submitted', 'Accepted', 'Rejected', 'In Process', 'Paid', 'Denied', 'Appealed', 'Void')),

  -- Patient Information
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subscriber_id TEXT,

  -- Insurance Information
  insurance_id UUID REFERENCES client_insurance(id),

  -- Provider Information
  billing_provider_id UUID REFERENCES staff(id),
  rendering_provider_id UUID REFERENCES staff(id),
  service_facility_id TEXT,

  -- Service Information
  statement_from_date DATE NOT NULL,
  statement_to_date DATE NOT NULL,

  -- Financial
  billed_amount DECIMAL(10, 2) NOT NULL,
  allowed_amount DECIMAL(10, 2),
  paid_amount DECIMAL(10, 2),
  patient_responsibility DECIMAL(10, 2),

  -- Dates
  submission_date TIMESTAMPTZ,
  accepted_date TIMESTAMPTZ,
  paid_date TIMESTAMPTZ,

  -- Status Details
  clearinghouse_status TEXT,
  payer_status TEXT,
  denial_code TEXT,
  denial_reason TEXT,

  -- Additional Information
  notes TEXT,
  prior_auth_number TEXT,

  -- Raw Data
  raw_submission JSONB,
  raw_response JSONB,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claim Service Lines Table
CREATE TABLE IF NOT EXISTS advancedmd_claim_service_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES advancedmd_claims(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  service_date DATE NOT NULL,
  place_of_service TEXT NOT NULL,
  cpt_code TEXT NOT NULL,
  modifiers TEXT[],
  units INTEGER NOT NULL DEFAULT 1,
  unit_charge DECIMAL(10, 2) NOT NULL,
  diagnosis_pointers INTEGER[] NOT NULL,

  -- Financial (from remittance)
  billed_amount DECIMAL(10, 2),
  allowed_amount DECIMAL(10, 2),
  paid_amount DECIMAL(10, 2),
  deductible_amount DECIMAL(10, 2),
  coinsurance_amount DECIMAL(10, 2),
  copay_amount DECIMAL(10, 2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (claim_id, line_number)
);

-- Claim Diagnoses Table
CREATE TABLE IF NOT EXISTS advancedmd_claim_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES advancedmd_claims(id) ON DELETE CASCADE,
  diagnosis_code TEXT NOT NULL,
  diagnosis_pointer INTEGER NOT NULL,
  diagnosis_type TEXT CHECK (diagnosis_type IN ('primary', 'secondary')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (claim_id, diagnosis_pointer)
);

-- Claim Status History Table
CREATE TABLE IF NOT EXISTS advancedmd_claim_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES advancedmd_claims(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  status_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Electronic Remittance Advice (ERA) Table
CREATE TABLE IF NOT EXISTS advancedmd_eras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  era_id TEXT UNIQUE NOT NULL,
  era_file_id TEXT NOT NULL,

  -- Payer Information
  payer_name TEXT NOT NULL,
  payer_id TEXT NOT NULL,

  -- Payment Information
  check_number TEXT NOT NULL,
  check_date DATE NOT NULL,
  check_amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CHK', 'ACH', 'EFT', 'WIRE')),

  -- Processing
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),

  -- Raw Data
  edi_835_content TEXT,
  raw_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ERA Claim Payments Table
CREATE TABLE IF NOT EXISTS advancedmd_era_claim_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  era_id UUID NOT NULL REFERENCES advancedmd_eras(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES advancedmd_claims(id),
  claim_control_number TEXT NOT NULL,
  payer_claim_control_number TEXT,

  -- Patient Information
  patient_name TEXT NOT NULL,
  patient_account_number TEXT,

  -- Financial
  billed_amount DECIMAL(10, 2) NOT NULL,
  allowed_amount DECIMAL(10, 2),
  paid_amount DECIMAL(10, 2) NOT NULL,
  patient_responsibility DECIMAL(10, 2) NOT NULL,

  -- Status
  claim_status TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient Sync Mapping Table
CREATE TABLE IF NOT EXISTS advancedmd_patient_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  advancedmd_patient_id TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('created', 'updated', 'duplicate_found', 'error')),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX idx_api_logs_created_at ON advancedmd_api_logs(created_at DESC);
CREATE INDEX idx_api_logs_endpoint ON advancedmd_api_logs(endpoint);
CREATE INDEX idx_api_logs_status_code ON advancedmd_api_logs(status_code);
CREATE INDEX idx_api_logs_environment ON advancedmd_api_logs(environment);

CREATE INDEX idx_eligibility_client_id ON advancedmd_eligibility_checks(client_id);
CREATE INDEX idx_eligibility_service_date ON advancedmd_eligibility_checks(service_date DESC);
CREATE INDEX idx_eligibility_check_date ON advancedmd_eligibility_checks(check_date DESC);

CREATE INDEX idx_claims_client_id ON advancedmd_claims(client_id);
CREATE INDEX idx_claims_claim_id ON advancedmd_claims(claim_id);
CREATE INDEX idx_claims_status ON advancedmd_claims(claim_status);
CREATE INDEX idx_claims_submission_date ON advancedmd_claims(submission_date DESC);
CREATE INDEX idx_claims_statement_from_date ON advancedmd_claims(statement_from_date DESC);

CREATE INDEX idx_claim_service_lines_claim_id ON advancedmd_claim_service_lines(claim_id);
CREATE INDEX idx_claim_service_lines_service_date ON advancedmd_claim_service_lines(service_date DESC);

CREATE INDEX idx_claim_diagnoses_claim_id ON advancedmd_claim_diagnoses(claim_id);

CREATE INDEX idx_claim_status_history_claim_id ON advancedmd_claim_status_history(claim_id);
CREATE INDEX idx_claim_status_history_status_date ON advancedmd_claim_status_history(status_date DESC);

CREATE INDEX idx_eras_check_date ON advancedmd_eras(check_date DESC);
CREATE INDEX idx_eras_processed ON advancedmd_eras(processed);
CREATE INDEX idx_eras_payer_id ON advancedmd_eras(payer_id);

CREATE INDEX idx_era_claim_payments_era_id ON advancedmd_era_claim_payments(era_id);
CREATE INDEX idx_era_claim_payments_claim_id ON advancedmd_era_claim_payments(claim_id);

CREATE INDEX idx_patient_mapping_client_id ON advancedmd_patient_mapping(client_id);
CREATE INDEX idx_patient_mapping_advancedmd_id ON advancedmd_patient_mapping(advancedmd_patient_id);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE advancedmd_auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_eligibility_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_claim_service_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_claim_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_claim_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_eras ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_era_claim_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_patient_mapping ENABLE ROW LEVEL SECURITY;

-- Auth tokens: Only service role can access
CREATE POLICY "Service role only" ON advancedmd_auth_tokens
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- API logs: Staff can view their own logs
CREATE POLICY "Staff can view API logs" ON advancedmd_api_logs
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM staff WHERE user_id = auth.uid())
  );

-- Rate limits: Service role only
CREATE POLICY "Service role only" ON advancedmd_rate_limits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Eligibility checks: Staff can view/insert
CREATE POLICY "Staff can manage eligibility checks" ON advancedmd_eligibility_checks
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM staff WHERE user_id = auth.uid())
  );

-- Claims: Staff can view/manage claims
CREATE POLICY "Staff can manage claims" ON advancedmd_claims
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff can manage claim service lines" ON advancedmd_claim_service_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM advancedmd_claims c
      WHERE c.id = claim_id
      AND auth.uid() IN (SELECT id FROM staff WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Staff can manage claim diagnoses" ON advancedmd_claim_diagnoses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM advancedmd_claims c
      WHERE c.id = claim_id
      AND auth.uid() IN (SELECT id FROM staff WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Staff can view claim status history" ON advancedmd_claim_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM advancedmd_claims c
      WHERE c.id = claim_id
      AND auth.uid() IN (SELECT id FROM staff WHERE user_id = auth.uid())
    )
  );

-- ERAs: Staff can manage ERAs
CREATE POLICY "Staff can manage ERAs" ON advancedmd_eras
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff can manage ERA claim payments" ON advancedmd_era_claim_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM advancedmd_eras e
      WHERE e.id = era_id
      AND auth.uid() IN (SELECT id FROM staff WHERE user_id = auth.uid())
    )
  );

-- Patient mapping: Staff can view/manage mappings
CREATE POLICY "Staff can manage patient mapping" ON advancedmd_patient_mapping
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM staff WHERE user_id = auth.uid())
  );

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_advancedmd_auth_tokens_updated_at
  BEFORE UPDATE ON advancedmd_auth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advancedmd_rate_limits_updated_at
  BEFORE UPDATE ON advancedmd_rate_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advancedmd_eligibility_checks_updated_at
  BEFORE UPDATE ON advancedmd_eligibility_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advancedmd_claims_updated_at
  BEFORE UPDATE ON advancedmd_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advancedmd_claim_service_lines_updated_at
  BEFORE UPDATE ON advancedmd_claim_service_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advancedmd_eras_updated_at
  BEFORE UPDATE ON advancedmd_eras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advancedmd_era_claim_payments_updated_at
  BEFORE UPDATE ON advancedmd_era_claim_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advancedmd_patient_mapping_updated_at
  BEFORE UPDATE ON advancedmd_patient_mapping
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Trigger for Claim Status History
-- ============================================================================

CREATE OR REPLACE FUNCTION track_claim_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.claim_status IS DISTINCT FROM NEW.claim_status) THEN
    INSERT INTO advancedmd_claim_status_history (
      claim_id,
      previous_status,
      new_status,
      status_date,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.claim_status,
      NEW.claim_status,
      NOW(),
      NEW.updated_at
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_claim_status_changes_trigger
  AFTER UPDATE ON advancedmd_claims
  FOR EACH ROW EXECUTE FUNCTION track_claim_status_changes();
