-- ============================================================================
-- AdvancedMD Integration - Phase 3: Electronic Claim Submission
-- ============================================================================

-- Add Appealed status to claims
ALTER TABLE advancedmd_claims
DROP CONSTRAINT IF EXISTS advancedmd_claims_claim_status_check;

ALTER TABLE advancedmd_claims
ADD CONSTRAINT advancedmd_claims_claim_status_check
CHECK (claim_status IN ('Draft', 'Ready', 'Submitted', 'Accepted', 'Rejected', 'In Process', 'Paid', 'Denied', 'Appealed', 'Void'));

-- Add EDI submission tracking
ALTER TABLE advancedmd_claims
ADD COLUMN IF NOT EXISTS edi_file_id TEXT,
ADD COLUMN IF NOT EXISTS edi_submission_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS edi_acknowledgment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS edi_acknowledgment_status TEXT,
ADD COLUMN IF NOT EXISTS clearinghouse_status TEXT,
ADD COLUMN IF NOT EXISTS last_status_check TIMESTAMPTZ;

-- Create EDI Batch Files table
CREATE TABLE IF NOT EXISTS advancedmd_edi_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT UNIQUE NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('837P', '835', '277')),
  file_path TEXT,
  file_content TEXT,

  -- Batch metadata
  total_claims INTEGER NOT NULL DEFAULT 0,
  total_billed_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Submission info
  submission_date TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),

  -- Status
  batch_status TEXT NOT NULL CHECK (batch_status IN ('Draft', 'Ready', 'Submitted', 'Acknowledged', 'Accepted', 'Rejected', 'Processed')),

  -- Response tracking
  acknowledgment_date TIMESTAMPTZ,
  acknowledgment_code TEXT,
  acknowledgment_message TEXT,

  -- Clearinghouse
  clearinghouse_name TEXT,
  clearinghouse_batch_id TEXT,

  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link claims to batches
CREATE TABLE IF NOT EXISTS advancedmd_batch_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES advancedmd_edi_batches(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES advancedmd_claims(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (batch_id, claim_id)
);

-- Claim Appeal History
CREATE TABLE IF NOT EXISTS advancedmd_claim_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES advancedmd_claims(id) ON DELETE CASCADE,
  appeal_number INTEGER NOT NULL,
  appeal_date DATE NOT NULL,
  appeal_reason TEXT NOT NULL,
  supporting_documentation JSONB,

  -- Status
  appeal_status TEXT NOT NULL CHECK (appeal_status IN ('Filed', 'Under Review', 'Approved', 'Denied', 'Withdrawn')),
  decision_date DATE,
  decision_reason TEXT,
  decision_amount DECIMAL(10, 2),

  -- Tracking
  filed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claim Corrections History
CREATE TABLE IF NOT EXISTS advancedmd_claim_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_claim_id UUID NOT NULL REFERENCES advancedmd_claims(id) ON DELETE CASCADE,
  corrected_claim_id UUID REFERENCES advancedmd_claims(id) ON DELETE SET NULL,
  correction_reason TEXT NOT NULL,
  changes_made JSONB NOT NULL,
  corrected_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CPT Code Library (for validation and pricing)
CREATE TABLE IF NOT EXISTS cpt_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  default_price DECIMAL(10, 2),
  time_based BOOLEAN DEFAULT FALSE,
  add_on_code BOOLEAN DEFAULT FALSE,
  prior_auth_required BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  effective_date DATE,
  termination_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ICD-10 Code Library (for validation)
CREATE TABLE IF NOT EXISTS icd10_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  active BOOLEAN DEFAULT TRUE,
  effective_date DATE,
  termination_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Denial Codes Reference
CREATE TABLE IF NOT EXISTS denial_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('correctable', 'appealable', 'final')),
  description TEXT NOT NULL,
  action_required TEXT NOT NULL,
  common_resolution TEXT,
  avg_resolution_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_claims_edi_file_id ON advancedmd_claims(edi_file_id);
CREATE INDEX IF NOT EXISTS idx_claims_last_status_check ON advancedmd_claims(last_status_check);
CREATE INDEX IF NOT EXISTS idx_claims_clearinghouse_status ON advancedmd_claims(clearinghouse_status);

CREATE INDEX IF NOT EXISTS idx_edi_batches_batch_id ON advancedmd_edi_batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_edi_batches_batch_status ON advancedmd_edi_batches(batch_status);
CREATE INDEX IF NOT EXISTS idx_edi_batches_submission_date ON advancedmd_edi_batches(submission_date DESC);

CREATE INDEX IF NOT EXISTS idx_batch_claims_batch_id ON advancedmd_batch_claims(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_claims_claim_id ON advancedmd_batch_claims(claim_id);

CREATE INDEX IF NOT EXISTS idx_claim_appeals_claim_id ON advancedmd_claim_appeals(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_appeals_appeal_status ON advancedmd_claim_appeals(appeal_status);
CREATE INDEX IF NOT EXISTS idx_claim_appeals_appeal_date ON advancedmd_claim_appeals(appeal_date DESC);

CREATE INDEX IF NOT EXISTS idx_claim_corrections_original_claim ON advancedmd_claim_corrections(original_claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_corrections_corrected_claim ON advancedmd_claim_corrections(corrected_claim_id);

CREATE INDEX IF NOT EXISTS idx_cpt_codes_code ON cpt_codes(code);
CREATE INDEX IF NOT EXISTS idx_cpt_codes_category ON cpt_codes(category);
CREATE INDEX IF NOT EXISTS idx_cpt_codes_active ON cpt_codes(active) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_icd10_codes_code ON icd10_codes(code);
CREATE INDEX IF NOT EXISTS idx_icd10_codes_category ON icd10_codes(category);
CREATE INDEX IF NOT EXISTS idx_icd10_codes_active ON icd10_codes(active) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_denial_codes_code ON denial_codes(code);
CREATE INDEX IF NOT EXISTS idx_denial_codes_category ON denial_codes(category);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE advancedmd_edi_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_batch_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_claim_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_claim_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpt_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE icd10_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE denial_codes ENABLE ROW LEVEL SECURITY;

-- EDI Batches: Staff can manage batches
CREATE POLICY "Staff can manage EDI batches" ON advancedmd_edi_batches
  FOR ALL USING (
    (public.has_role(auth.uid(), 'administrator') OR public.has_role(auth.uid(), 'billing_staff'))
  );

-- Batch Claims: Staff can manage
CREATE POLICY "Staff can manage batch claims" ON advancedmd_batch_claims
  FOR ALL USING (
    (public.has_role(auth.uid(), 'administrator') OR public.has_role(auth.uid(), 'billing_staff'))
  );

-- Appeals: Staff can manage appeals
CREATE POLICY "Staff can manage appeals" ON advancedmd_claim_appeals
  FOR ALL USING (
    (public.has_role(auth.uid(), 'administrator') OR public.has_role(auth.uid(), 'billing_staff'))
  );

-- Corrections: Staff can manage corrections
CREATE POLICY "Staff can manage corrections" ON advancedmd_claim_corrections
  FOR ALL USING (
    (public.has_role(auth.uid(), 'administrator') OR public.has_role(auth.uid(), 'billing_staff'))
  );

-- CPT Codes: Everyone can read, only admins can modify
CREATE POLICY "Anyone can read CPT codes" ON cpt_codes
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage CPT codes" ON cpt_codes
  FOR ALL USING (
    public.has_role(auth.uid(), 'administrator')
  );

-- ICD-10 Codes: Everyone can read, only admins can modify
CREATE POLICY "Anyone can read ICD-10 codes" ON icd10_codes
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage ICD-10 codes" ON icd10_codes
  FOR ALL USING (
    public.has_role(auth.uid(), 'administrator')
  );

-- Denial Codes: Everyone can read, only admins can modify
CREATE POLICY "Anyone can read denial codes" ON denial_codes
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage denial codes" ON denial_codes
  FOR ALL USING (
    public.has_role(auth.uid(), 'administrator')
  );

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS update_advancedmd_edi_batches_updated_at ON advancedmd_edi_batches;
CREATE TRIGGER update_advancedmd_edi_batches_updated_at
  BEFORE UPDATE ON advancedmd_edi_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_advancedmd_claim_appeals_updated_at ON advancedmd_claim_appeals;
CREATE TRIGGER update_advancedmd_claim_appeals_updated_at
  BEFORE UPDATE ON advancedmd_claim_appeals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cpt_codes_updated_at ON cpt_codes;
CREATE TRIGGER update_cpt_codes_updated_at
  BEFORE UPDATE ON cpt_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_icd10_codes_updated_at ON icd10_codes;
CREATE TRIGGER update_icd10_codes_updated_at
  BEFORE UPDATE ON icd10_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_denial_codes_updated_at ON denial_codes;
CREATE TRIGGER update_denial_codes_updated_at
  BEFORE UPDATE ON denial_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Views for Reporting
-- ============================================================================

-- Claims Dashboard View
CREATE OR REPLACE VIEW claims_dashboard_stats AS
SELECT
  COUNT(*) FILTER (WHERE claim_status = 'Draft') AS draft_count,
  COUNT(*) FILTER (WHERE claim_status = 'Submitted') AS submitted_count,
  COUNT(*) FILTER (WHERE claim_status = 'Accepted') AS accepted_count,
  COUNT(*) FILTER (WHERE claim_status = 'Rejected') AS rejected_count,
  COUNT(*) FILTER (WHERE claim_status = 'Paid') AS paid_count,
  COUNT(*) FILTER (WHERE claim_status = 'Denied') AS denied_count,
  COUNT(*) FILTER (WHERE claim_status = 'Appealed') AS appealed_count,
  SUM(billed_amount) AS total_billed,
  SUM(paid_amount) AS total_paid,
  AVG(CASE
    WHEN paid_date IS NOT NULL AND submission_date IS NOT NULL
    THEN EXTRACT(DAY FROM (paid_date - submission_date))
  END) AS avg_days_to_payment
FROM advancedmd_claims
WHERE submission_date > NOW() - INTERVAL '90 days';

-- Denial Analysis View
CREATE OR REPLACE VIEW denial_analysis AS
SELECT
  denial_code,
  COUNT(*) AS denial_count,
  SUM(billed_amount) AS total_denied_amount,
  AVG(billed_amount) AS avg_denied_amount,
  COUNT(*) FILTER (WHERE claim_status = 'Appealed') AS appeal_count
FROM advancedmd_claims
WHERE claim_status IN ('Denied', 'Appealed')
  AND submission_date > NOW() - INTERVAL '90 days'
GROUP BY denial_code
ORDER BY denial_count DESC;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE advancedmd_edi_batches IS 'EDI batch files for electronic claim submission (837P)';
COMMENT ON TABLE advancedmd_batch_claims IS 'Links claims to EDI batches';
COMMENT ON TABLE advancedmd_claim_appeals IS 'Appeal history for denied claims';
COMMENT ON TABLE advancedmd_claim_corrections IS 'Correction history linking original and corrected claims';
COMMENT ON TABLE cpt_codes IS 'CPT procedure code library for validation and pricing';
COMMENT ON TABLE icd10_codes IS 'ICD-10 diagnosis code library for validation';
COMMENT ON TABLE denial_codes IS 'Denial code reference with resolution guidance';
