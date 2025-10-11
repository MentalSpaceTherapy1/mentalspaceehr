-- ============================================================================
-- AdvancedMD Integration - Phase 4: ERA (835) Processing & Payment Posting
-- ============================================================================

-- ERA Files table (835 EDI files from payers)
CREATE TABLE IF NOT EXISTS advancedmd_era_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- File info
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_content TEXT,
  file_size INTEGER,

  -- EDI metadata
  interchange_control_number TEXT,
  transaction_control_number TEXT,

  -- Payer info
  payer_id TEXT,
  payer_name TEXT,
  payer_address JSONB,

  -- Payment info
  payment_method TEXT CHECK (payment_method IN ('ACH', 'Check', 'Wire', 'Credit Card', 'Other')),
  payment_amount DECIMAL(10, 2),
  payment_date DATE,
  check_eft_number TEXT,

  -- Processing status
  processing_status TEXT NOT NULL CHECK (processing_status IN ('Uploaded', 'Parsing', 'Parsed', 'Posting', 'Posted', 'Error', 'Partially Posted')),
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,

  -- Metrics
  total_claims INTEGER DEFAULT 0,
  total_service_lines INTEGER DEFAULT 0,
  claims_posted INTEGER DEFAULT 0,
  claims_failed INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Audit
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ERA Claim Details (individual claims in ERA file)
CREATE TABLE IF NOT EXISTS advancedmd_era_claim_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  era_file_id UUID NOT NULL REFERENCES advancedmd_era_files(id) ON DELETE CASCADE,

  -- Link to our claim
  claim_id UUID REFERENCES advancedmd_claims(id) ON DELETE SET NULL,

  -- Payer's claim info
  payer_claim_control_number TEXT,
  patient_control_number TEXT,

  -- Patient info from ERA
  patient_first_name TEXT,
  patient_last_name TEXT,
  patient_id TEXT,

  -- Claim amounts
  claim_billed_amount DECIMAL(10, 2),
  claim_allowed_amount DECIMAL(10, 2),
  claim_paid_amount DECIMAL(10, 2),
  claim_patient_responsibility DECIMAL(10, 2),

  -- Claim status
  claim_status_code TEXT,
  claim_status_description TEXT,

  -- Posting status
  posting_status TEXT NOT NULL CHECK (posting_status IN ('Pending', 'Posted', 'Error', 'Manual Review')),
  posted_at TIMESTAMPTZ,
  posting_error TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ERA Service Line Details (individual service lines in ERA)
CREATE TABLE IF NOT EXISTS advancedmd_era_service_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  era_claim_detail_id UUID NOT NULL REFERENCES advancedmd_era_claim_details(id) ON DELETE CASCADE,

  -- Service info
  service_date DATE,
  procedure_code TEXT,
  procedure_modifier TEXT[],

  -- Amounts
  billed_amount DECIMAL(10, 2),
  allowed_amount DECIMAL(10, 2),
  paid_amount DECIMAL(10, 2),
  patient_responsibility DECIMAL(10, 2),

  -- Units
  billed_units DECIMAL(10, 2),
  paid_units DECIMAL(10, 2),

  -- Adjustments
  contractual_adjustment DECIMAL(10, 2) DEFAULT 0,
  deductible DECIMAL(10, 2) DEFAULT 0,
  copay DECIMAL(10, 2) DEFAULT 0,
  coinsurance DECIMAL(10, 2) DEFAULT 0,

  -- Adjustment codes (CARC/RARC)
  adjustment_codes JSONB,

  -- Remark codes
  remark_codes TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Postings (record of payments applied to claims)
CREATE TABLE IF NOT EXISTS advancedmd_payment_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to ERA
  era_file_id UUID REFERENCES advancedmd_era_files(id) ON DELETE SET NULL,
  era_claim_detail_id UUID REFERENCES advancedmd_era_claim_details(id) ON DELETE SET NULL,

  -- Link to our claim
  claim_id UUID NOT NULL REFERENCES advancedmd_claims(id) ON DELETE CASCADE,

  -- Payment info
  payment_date DATE NOT NULL,
  payment_method TEXT,
  check_eft_number TEXT,

  -- Amounts
  payment_amount DECIMAL(10, 2) NOT NULL,
  allowed_amount DECIMAL(10, 2),
  billed_amount DECIMAL(10, 2),

  -- Adjustments
  contractual_adjustment DECIMAL(10, 2) DEFAULT 0,
  deductible DECIMAL(10, 2) DEFAULT 0,
  copay DECIMAL(10, 2) DEFAULT 0,
  coinsurance DECIMAL(10, 2) DEFAULT 0,
  other_adjustments DECIMAL(10, 2) DEFAULT 0,

  -- Patient responsibility
  patient_responsibility DECIMAL(10, 2) DEFAULT 0,

  -- Posting type
  posting_type TEXT NOT NULL CHECK (posting_type IN ('Insurance Payment', 'Patient Payment', 'Adjustment', 'Refund', 'Write-off')),

  -- Status
  posting_status TEXT NOT NULL CHECK (posting_status IN ('Posted', 'Pending', 'Reversed')),
  reversal_reason TEXT,
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES auth.users(id),

  -- Notes
  notes TEXT,

  -- Audit
  posted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Adjustments (detailed breakdown of adjustments)
CREATE TABLE IF NOT EXISTS advancedmd_payment_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_posting_id UUID NOT NULL REFERENCES advancedmd_payment_postings(id) ON DELETE CASCADE,
  era_service_line_id UUID REFERENCES advancedmd_era_service_lines(id) ON DELETE SET NULL,

  -- Adjustment info
  adjustment_group TEXT NOT NULL CHECK (adjustment_group IN ('CO', 'PR', 'OA', 'PI')),
  adjustment_code TEXT NOT NULL,
  adjustment_amount DECIMAL(10, 2) NOT NULL,
  adjustment_reason TEXT,

  -- Service line reference
  service_date DATE,
  procedure_code TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EOB (Explanation of Benefits) records
CREATE TABLE IF NOT EXISTS advancedmd_eobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to claim and ERA
  claim_id UUID NOT NULL REFERENCES advancedmd_claims(id) ON DELETE CASCADE,
  era_file_id UUID REFERENCES advancedmd_era_files(id) ON DELETE SET NULL,
  era_claim_detail_id UUID REFERENCES advancedmd_era_claim_details(id) ON DELETE SET NULL,

  -- EOB details
  eob_number TEXT UNIQUE NOT NULL,
  eob_date DATE NOT NULL,

  -- Patient info
  patient_name TEXT NOT NULL,
  patient_id TEXT,

  -- Provider info
  provider_name TEXT NOT NULL,
  provider_npi TEXT,

  -- Payer info
  payer_name TEXT NOT NULL,
  payer_id TEXT,

  -- Amounts
  total_billed DECIMAL(10, 2) NOT NULL,
  total_allowed DECIMAL(10, 2) NOT NULL,
  total_paid DECIMAL(10, 2) NOT NULL,
  total_patient_responsibility DECIMAL(10, 2) NOT NULL,

  -- Service lines (as JSONB for EOB)
  service_lines JSONB NOT NULL,

  -- Adjustments summary
  adjustments_summary JSONB,

  -- Remarks
  remarks TEXT,

  -- PDF generation
  pdf_path TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Status
  sent_to_patient BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,

  -- Audit
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient Statements
CREATE TABLE IF NOT EXISTS advancedmd_patient_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Patient/Client info
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Statement details
  statement_number TEXT UNIQUE NOT NULL,
  statement_date DATE NOT NULL,
  statement_period_start DATE NOT NULL,
  statement_period_end DATE NOT NULL,

  -- Amounts
  previous_balance DECIMAL(10, 2) DEFAULT 0,
  charges DECIMAL(10, 2) DEFAULT 0,
  payments DECIMAL(10, 2) DEFAULT 0,
  adjustments DECIMAL(10, 2) DEFAULT 0,
  current_balance DECIMAL(10, 2) NOT NULL,

  -- Aging buckets
  amount_0_30_days DECIMAL(10, 2) DEFAULT 0,
  amount_31_60_days DECIMAL(10, 2) DEFAULT 0,
  amount_61_90_days DECIMAL(10, 2) DEFAULT 0,
  amount_over_90_days DECIMAL(10, 2) DEFAULT 0,

  -- Statement lines (claims/payments)
  statement_lines JSONB NOT NULL,

  -- Messages
  custom_message TEXT,
  payment_instructions TEXT,

  -- Status
  statement_status TEXT NOT NULL CHECK (statement_status IN ('Draft', 'Generated', 'Sent', 'Paid', 'Void')),

  -- Delivery
  delivery_method TEXT CHECK (delivery_method IN ('Email', 'Mail', 'Patient Portal', 'In Person')),
  sent_at TIMESTAMPTZ,

  -- PDF
  pdf_path TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Payment tracking
  paid_date DATE,
  paid_amount DECIMAL(10, 2),

  -- Audit
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Reconciliation records
CREATE TABLE IF NOT EXISTS advancedmd_payment_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ERA reference
  era_file_id UUID NOT NULL REFERENCES advancedmd_era_files(id) ON DELETE CASCADE,

  -- Reconciliation info
  reconciliation_date DATE NOT NULL,
  reconciled_by UUID REFERENCES auth.users(id),

  -- Expected vs Actual
  expected_payment_amount DECIMAL(10, 2) NOT NULL,
  actual_payment_amount DECIMAL(10, 2) NOT NULL,
  variance_amount DECIMAL(10, 2) NOT NULL,

  -- Status
  reconciliation_status TEXT NOT NULL CHECK (reconciliation_status IN ('Balanced', 'Unbalanced', 'Under Review', 'Resolved')),

  -- Details
  discrepancies JSONB,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_era_files_processing_status ON advancedmd_era_files(processing_status);
CREATE INDEX IF NOT EXISTS idx_era_files_payment_date ON advancedmd_era_files(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_era_files_uploaded_by ON advancedmd_era_files(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_era_claim_details_era_file ON advancedmd_era_claim_details(era_file_id);
CREATE INDEX IF NOT EXISTS idx_era_claim_details_claim_id ON advancedmd_era_claim_details(claim_id);
CREATE INDEX IF NOT EXISTS idx_era_claim_details_posting_status ON advancedmd_era_claim_details(posting_status);
CREATE INDEX IF NOT EXISTS idx_era_claim_details_payer_claim ON advancedmd_era_claim_details(payer_claim_control_number);

CREATE INDEX IF NOT EXISTS idx_era_service_lines_claim_detail ON advancedmd_era_service_lines(era_claim_detail_id);
CREATE INDEX IF NOT EXISTS idx_era_service_lines_service_date ON advancedmd_era_service_lines(service_date DESC);
CREATE INDEX IF NOT EXISTS idx_era_service_lines_procedure_code ON advancedmd_era_service_lines(procedure_code);

CREATE INDEX IF NOT EXISTS idx_payment_postings_claim_id ON advancedmd_payment_postings(claim_id);
CREATE INDEX IF NOT EXISTS idx_payment_postings_era_file ON advancedmd_payment_postings(era_file_id);
CREATE INDEX IF NOT EXISTS idx_payment_postings_payment_date ON advancedmd_payment_postings(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payment_postings_posting_status ON advancedmd_payment_postings(posting_status);
CREATE INDEX IF NOT EXISTS idx_payment_postings_posted_by ON advancedmd_payment_postings(posted_by);

CREATE INDEX IF NOT EXISTS idx_payment_adjustments_posting_id ON advancedmd_payment_adjustments(payment_posting_id);
CREATE INDEX IF NOT EXISTS idx_payment_adjustments_adjustment_group ON advancedmd_payment_adjustments(adjustment_group);
CREATE INDEX IF NOT EXISTS idx_payment_adjustments_adjustment_code ON advancedmd_payment_adjustments(adjustment_code);

CREATE INDEX IF NOT EXISTS idx_eobs_claim_id ON advancedmd_eobs(claim_id);
CREATE INDEX IF NOT EXISTS idx_eobs_eob_date ON advancedmd_eobs(eob_date DESC);
CREATE INDEX IF NOT EXISTS idx_eobs_sent_to_patient ON advancedmd_eobs(sent_to_patient);

CREATE INDEX IF NOT EXISTS idx_patient_statements_client_id ON advancedmd_patient_statements(client_id);
CREATE INDEX IF NOT EXISTS idx_patient_statements_statement_date ON advancedmd_patient_statements(statement_date DESC);
CREATE INDEX IF NOT EXISTS idx_patient_statements_statement_status ON advancedmd_patient_statements(statement_status);
CREATE INDEX IF NOT EXISTS idx_patient_statements_sent_at ON advancedmd_patient_statements(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_era_file ON advancedmd_payment_reconciliation(era_file_id);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_status ON advancedmd_payment_reconciliation(reconciliation_status);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE advancedmd_era_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_era_claim_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_era_service_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_payment_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_payment_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_eobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_patient_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_payment_reconciliation ENABLE ROW LEVEL SECURITY;

-- ERA Files: Administrators and billing staff can manage
CREATE POLICY "Administrators and billing staff can manage ERA files" ON advancedmd_era_files
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  );

-- ERA Claim Details: Administrators and billing staff can manage
CREATE POLICY "Administrators and billing staff can manage ERA claim details" ON advancedmd_era_claim_details
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  );

-- ERA Service Lines: Administrators and billing staff can manage
CREATE POLICY "Administrators and billing staff can manage ERA service lines" ON advancedmd_era_service_lines
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  );

-- Payment Postings: Administrators and billing staff can manage
CREATE POLICY "Administrators and billing staff can manage payment postings" ON advancedmd_payment_postings
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  );

-- Payment Adjustments: Administrators and billing staff can manage
CREATE POLICY "Administrators and billing staff can manage payment adjustments" ON advancedmd_payment_adjustments
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  );

-- EOBs: Administrators and billing staff can manage
CREATE POLICY "Administrators and billing staff can manage EOBs" ON advancedmd_eobs
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  );

-- Patient Statements: Administrators and billing staff can manage
CREATE POLICY "Administrators and billing staff can manage patient statements" ON advancedmd_patient_statements
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  );

-- Payment Reconciliation: Administrators and billing staff can manage
CREATE POLICY "Administrators and billing staff can manage payment reconciliation" ON advancedmd_payment_reconciliation
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  );

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE TRIGGER update_advancedmd_era_files_updated_at
  BEFORE UPDATE ON advancedmd_era_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advancedmd_era_claim_details_updated_at
  BEFORE UPDATE ON advancedmd_era_claim_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advancedmd_payment_postings_updated_at
  BEFORE UPDATE ON advancedmd_payment_postings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advancedmd_eobs_updated_at
  BEFORE UPDATE ON advancedmd_eobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advancedmd_patient_statements_updated_at
  BEFORE UPDATE ON advancedmd_patient_statements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advancedmd_payment_reconciliation_updated_at
  BEFORE UPDATE ON advancedmd_payment_reconciliation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Views for Reporting
-- ============================================================================

-- Payment Dashboard Stats
CREATE OR REPLACE VIEW payment_dashboard_stats AS
SELECT
  COUNT(DISTINCT era_file_id) AS total_era_files,
  COUNT(DISTINCT CASE WHEN posting_status = 'Posted' THEN claim_id END) AS claims_posted,
  SUM(CASE WHEN posting_status = 'Posted' THEN payment_amount ELSE 0 END) AS total_posted,
  AVG(CASE
    WHEN posting_status = 'Posted' AND created_at IS NOT NULL
    THEN EXTRACT(DAY FROM (created_at - payment_date))
  END) AS avg_posting_delay_days,
  COUNT(*) FILTER (WHERE posting_status = 'Pending') AS pending_postings,
  SUM(CASE WHEN posting_type = 'Insurance Payment' THEN payment_amount ELSE 0 END) AS insurance_payments,
  SUM(CASE WHEN posting_type = 'Patient Payment' THEN payment_amount ELSE 0 END) AS patient_payments
FROM advancedmd_payment_postings
WHERE payment_date > NOW() - INTERVAL '90 days';

-- Patient Balance Summary
CREATE OR REPLACE VIEW patient_balance_summary AS
SELECT
  c.id AS client_id,
  c.first_name,
  c.last_name,
  COALESCE(SUM(ac.billed_amount), 0) AS total_billed,
  COALESCE(SUM(pp.payment_amount), 0) AS total_paid,
  COALESCE(SUM(ac.billed_amount), 0) - COALESCE(SUM(pp.payment_amount), 0) AS outstanding_balance,
  COUNT(DISTINCT ac.id) FILTER (WHERE ac.claim_status != 'Paid') AS open_claims,
  MAX(pp.payment_date) AS last_payment_date
FROM clients c
LEFT JOIN advancedmd_claims ac ON c.id = ac.client_id
LEFT JOIN advancedmd_payment_postings pp ON ac.id = pp.claim_id
GROUP BY c.id, c.first_name, c.last_name
HAVING COALESCE(SUM(ac.billed_amount), 0) - COALESCE(SUM(pp.payment_amount), 0) > 0;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE advancedmd_era_files IS 'ERA (835) EDI files received from payers containing payment information';
COMMENT ON TABLE advancedmd_era_claim_details IS 'Individual claim details extracted from ERA files';
COMMENT ON TABLE advancedmd_era_service_lines IS 'Service line details from ERA files with adjustments';
COMMENT ON TABLE advancedmd_payment_postings IS 'Payment postings applied to claims from ERA or manual entry';
COMMENT ON TABLE advancedmd_payment_adjustments IS 'Detailed adjustment breakdown (CARC codes)';
COMMENT ON TABLE advancedmd_eobs IS 'Explanation of Benefits documents for patients';
COMMENT ON TABLE advancedmd_patient_statements IS 'Patient billing statements';
COMMENT ON TABLE advancedmd_payment_reconciliation IS 'Reconciliation records for ERA payments';
