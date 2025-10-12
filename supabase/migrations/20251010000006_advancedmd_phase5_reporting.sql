-- ============================================================================
-- AdvancedMD Integration - Phase 5: Reporting & Analytics
-- ============================================================================

-- Create reports tracking table
CREATE TABLE IF NOT EXISTS advancedmd_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN (
    'claims_aging',
    'payer_performance',
    'provider_productivity',
    'revenue_cycle',
    'ar_aging',
    'collection_metrics',
    'denial_analysis',
    'payment_trends'
  )),
  report_name TEXT NOT NULL,
  report_parameters JSONB,
  report_data JSONB,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  date_range_start DATE,
  date_range_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create scheduled reports table
CREATE TABLE IF NOT EXISTS advancedmd_scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  report_name TEXT NOT NULL,
  schedule_frequency TEXT NOT NULL CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
  schedule_day INTEGER, -- Day of week (1-7) or day of month (1-31)
  recipients TEXT[], -- Email addresses
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Analytics Views
-- ============================================================================

-- Claims Aging Report View
CREATE OR REPLACE VIEW claims_aging_report AS
SELECT
  c.id,
  c.claim_id,
  c.client_id,
  cl.first_name || ' ' || cl.last_name AS patient_name,
  c.statement_from_date AS service_date,
  c.submission_date,
  c.billed_amount,
  c.paid_amount,
  (c.billed_amount - COALESCE(c.paid_amount, 0)) AS balance,
  c.claim_status,
  ci.insurance_company AS payer_name,
  EXTRACT(DAY FROM (NOW() - c.submission_date)) AS days_outstanding,
  CASE
    WHEN EXTRACT(DAY FROM (NOW() - c.submission_date)) <= 30 THEN '0-30'
    WHEN EXTRACT(DAY FROM (NOW() - c.submission_date)) <= 60 THEN '31-60'
    WHEN EXTRACT(DAY FROM (NOW() - c.submission_date)) <= 90 THEN '61-90'
    WHEN EXTRACT(DAY FROM (NOW() - c.submission_date)) <= 120 THEN '91-120'
    ELSE '120+'
  END AS aging_bucket
FROM advancedmd_claims c
LEFT JOIN clients cl ON c.client_id = cl.id
LEFT JOIN client_insurance ci ON c.insurance_id = ci.id
WHERE c.claim_status NOT IN ('Paid', 'Void')
  AND c.submission_date IS NOT NULL;

-- Payer Performance View
CREATE OR REPLACE VIEW payer_performance_report AS
SELECT
  ci.insurance_company AS payer_name,
  c.insurance_id AS payer_id,
  COUNT(DISTINCT c.id) AS total_claims,
  COUNT(DISTINCT CASE WHEN c.claim_status = 'Paid' THEN c.id END) AS paid_claims,
  COUNT(DISTINCT CASE WHEN c.claim_status = 'Denied' THEN c.id END) AS denied_claims,
  COUNT(DISTINCT CASE WHEN c.claim_status = 'Rejected' THEN c.id END) AS rejected_claims,
  SUM(c.billed_amount) AS total_billed,
  SUM(c.paid_amount) AS total_paid,
  ROUND((SUM(c.paid_amount) / NULLIF(SUM(c.billed_amount), 0) * 100), 2) AS collection_rate,
  ROUND((COUNT(DISTINCT CASE WHEN c.claim_status = 'Denied' THEN c.id END)::DECIMAL / NULLIF(COUNT(DISTINCT c.id), 0) * 100), 2) AS denial_rate,
  AVG(CASE
    WHEN c.paid_date IS NOT NULL AND c.submission_date IS NOT NULL
    THEN EXTRACT(DAY FROM (c.paid_date::TIMESTAMPTZ - c.submission_date::TIMESTAMPTZ))
  END) AS avg_days_to_payment,
  MIN(c.submission_date) AS first_claim_date,
  MAX(c.submission_date) AS last_claim_date
FROM advancedmd_claims c
LEFT JOIN client_insurance ci ON c.insurance_id = ci.id
WHERE c.submission_date IS NOT NULL
GROUP BY ci.insurance_company, c.insurance_id;

-- Provider Productivity View
CREATE OR REPLACE VIEW provider_productivity_report AS
SELECT
  p.id AS provider_id,
  p.first_name || ' ' || p.last_name AS provider_name,
  p.npi_number AS npi,
  DATE_TRUNC('month', c.statement_from_date) AS month,
  COUNT(DISTINCT c.id) AS claims_submitted,
  COUNT(DISTINCT c.client_id) AS unique_patients,
  SUM(c.billed_amount) AS total_billed,
  SUM(c.paid_amount) AS total_collected,
  ROUND((SUM(c.paid_amount) / NULLIF(SUM(c.billed_amount), 0) * 100), 2) AS collection_rate,
  AVG(c.billed_amount) AS avg_claim_amount,
  COUNT(DISTINCT sl.id) AS total_services,
  AVG(CASE
    WHEN c.paid_date IS NOT NULL AND c.statement_from_date IS NOT NULL
    THEN EXTRACT(DAY FROM (c.paid_date::TIMESTAMPTZ - c.statement_from_date::TIMESTAMPTZ))
  END) AS avg_days_to_payment
FROM profiles p
LEFT JOIN advancedmd_claims c ON p.id = c.rendering_provider_id
LEFT JOIN advancedmd_claim_service_lines sl ON c.id = sl.claim_id
WHERE c.statement_from_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY p.id, p.first_name, p.last_name, p.npi_number, DATE_TRUNC('month', c.statement_from_date);

-- Revenue Cycle Metrics View
CREATE OR REPLACE VIEW revenue_cycle_metrics AS
WITH monthly_data AS (
  SELECT
    DATE_TRUNC('month', c.statement_from_date) AS month,
    COUNT(DISTINCT c.id) AS claims_count,
    SUM(c.billed_amount) AS charges,
    SUM(c.paid_amount) AS collections,
    SUM(CASE WHEN c.claim_status = 'Denied' THEN c.billed_amount ELSE 0 END) AS denials,
    SUM(pp.contractual_adjustment) AS contractual_adjustments,
    AVG(CASE
      WHEN c.paid_date IS NOT NULL AND c.submission_date IS NOT NULL
      THEN EXTRACT(DAY FROM (c.paid_date::TIMESTAMPTZ - c.submission_date::TIMESTAMPTZ))
    END) AS avg_days_to_payment,
    AVG(CASE
      WHEN c.submission_date IS NOT NULL AND c.statement_from_date IS NOT NULL
      THEN EXTRACT(DAY FROM (c.submission_date::TIMESTAMPTZ - c.statement_from_date::TIMESTAMPTZ))
    END) AS avg_days_to_submission
  FROM advancedmd_claims c
  LEFT JOIN advancedmd_payment_postings pp ON c.id = pp.claim_id
  WHERE c.statement_from_date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', c.statement_from_date)
)
SELECT
  month,
  claims_count,
  charges,
  collections,
  denials,
  contractual_adjustments,
  ROUND((collections / NULLIF(charges, 0) * 100), 2) AS net_collection_rate,
  ROUND((denials / NULLIF(charges, 0) * 100), 2) AS denial_rate,
  ROUND(avg_days_to_payment, 1) AS avg_days_to_payment,
  ROUND(avg_days_to_submission, 1) AS avg_days_to_submission,
  charges - collections - contractual_adjustments AS outstanding_ar
FROM monthly_data
ORDER BY month DESC;

-- AR Aging Summary View
CREATE OR REPLACE VIEW ar_aging_summary AS
SELECT
  COUNT(DISTINCT c.id) AS total_claims,
  SUM(c.billed_amount - COALESCE(c.paid_amount, 0)) AS total_ar,
  SUM(CASE
    WHEN EXTRACT(DAY FROM (NOW() - c.submission_date)) <= 30
    THEN c.billed_amount - COALESCE(c.paid_amount, 0)
    ELSE 0
  END) AS ar_0_30,
  SUM(CASE
    WHEN EXTRACT(DAY FROM (NOW() - c.submission_date)) BETWEEN 31 AND 60
    THEN c.billed_amount - COALESCE(c.paid_amount, 0)
    ELSE 0
  END) AS ar_31_60,
  SUM(CASE
    WHEN EXTRACT(DAY FROM (NOW() - c.submission_date)) BETWEEN 61 AND 90
    THEN c.billed_amount - COALESCE(c.paid_amount, 0)
    ELSE 0
  END) AS ar_61_90,
  SUM(CASE
    WHEN EXTRACT(DAY FROM (NOW() - c.submission_date)) BETWEEN 91 AND 120
    THEN c.billed_amount - COALESCE(c.paid_amount, 0)
    ELSE 0
  END) AS ar_91_120,
  SUM(CASE
    WHEN EXTRACT(DAY FROM (NOW() - c.submission_date)) > 120
    THEN c.billed_amount - COALESCE(c.paid_amount, 0)
    ELSE 0
  END) AS ar_over_120,
  ROUND(AVG(EXTRACT(DAY FROM (NOW() - c.submission_date))), 1) AS avg_days_in_ar
FROM advancedmd_claims c
WHERE c.claim_status NOT IN ('Paid', 'Void')
  AND c.submission_date IS NOT NULL;

-- Collection Metrics View
CREATE OR REPLACE VIEW collection_metrics_report AS
WITH claim_metrics AS (
  SELECT
    DATE_TRUNC('month', pp.payment_date) AS month,
    COUNT(DISTINCT pp.claim_id) AS claims_with_payments,
    SUM(pp.payment_amount) AS total_collected,
    SUM(pp.contractual_adjustment) AS total_contractual_adj,
    SUM(pp.deductible) AS total_deductible,
    SUM(pp.copay) AS total_copay,
    SUM(pp.patient_responsibility) AS total_patient_resp,
    AVG(pp.payment_amount) AS avg_payment_amount,
    COUNT(DISTINCT CASE WHEN pp.posting_type = 'Insurance Payment' THEN pp.id END) AS insurance_payments_count,
    COUNT(DISTINCT CASE WHEN pp.posting_type = 'Patient Payment' THEN pp.id END) AS patient_payments_count
  FROM advancedmd_payment_postings pp
  WHERE pp.payment_date >= CURRENT_DATE - INTERVAL '12 months'
    AND pp.posting_status = 'Posted'
  GROUP BY DATE_TRUNC('month', pp.payment_date)
)
SELECT
  cm.month,
  cm.claims_with_payments,
  cm.total_collected,
  cm.total_contractual_adj,
  cm.total_deductible,
  cm.total_copay,
  cm.total_patient_resp,
  cm.avg_payment_amount,
  cm.insurance_payments_count,
  cm.patient_payments_count,
  ROUND((cm.total_collected / NULLIF(
    (SELECT SUM(billed_amount)
     FROM advancedmd_claims
     WHERE DATE_TRUNC('month', statement_from_date) = cm.month), 0) * 100), 2) AS collection_rate
FROM claim_metrics cm
ORDER BY cm.month DESC;

-- Denial Analysis by Reason View
CREATE OR REPLACE VIEW denial_analysis_by_reason AS
SELECT
  c.denial_code,
  dc.description AS denial_description,
  dc.category AS denial_category,
  COUNT(DISTINCT c.id) AS denial_count,
  SUM(c.billed_amount) AS total_denied_amount,
  AVG(c.billed_amount) AS avg_denied_amount,
  COUNT(DISTINCT ca.id) AS appeals_filed,
  COUNT(DISTINCT CASE WHEN ca.appeal_status = 'Approved' THEN ca.id END) AS appeals_approved,
  ROUND((COUNT(DISTINCT CASE WHEN ca.appeal_status = 'Approved' THEN ca.id END)::DECIMAL /
    NULLIF(COUNT(DISTINCT ca.id), 0) * 100), 2) AS appeal_success_rate,
  AVG(CASE
    WHEN ca.decision_date IS NOT NULL AND ca.appeal_date IS NOT NULL
    THEN EXTRACT(DAY FROM (ca.decision_date::TIMESTAMPTZ - ca.appeal_date::TIMESTAMPTZ))
  END) AS avg_appeal_days
FROM advancedmd_claims c
LEFT JOIN denial_codes dc ON c.denial_code = dc.code
LEFT JOIN advancedmd_claim_appeals ca ON c.id = ca.claim_id
WHERE c.claim_status IN ('Denied', 'Appealed')
GROUP BY c.denial_code, dc.description, dc.category
ORDER BY denial_count DESC;

-- ============================================================================
-- Reporting Functions
-- ============================================================================

-- Function to get claims aging breakdown
CREATE OR REPLACE FUNCTION get_claims_aging_breakdown(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  aging_bucket TEXT,
  claim_count BIGINT,
  total_amount DECIMAL,
  percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH aging_data AS (
    SELECT
      CASE
        WHEN EXTRACT(DAY FROM (NOW() - c.submission_date)) <= 30 THEN '0-30 days'
        WHEN EXTRACT(DAY FROM (NOW() - c.submission_date)) <= 60 THEN '31-60 days'
        WHEN EXTRACT(DAY FROM (NOW() - c.submission_date)) <= 90 THEN '61-90 days'
        WHEN EXTRACT(DAY FROM (NOW() - c.submission_date)) <= 120 THEN '91-120 days'
        ELSE '120+ days'
      END AS bucket,
      c.billed_amount - COALESCE(c.paid_amount, 0) AS balance
    FROM advancedmd_claims c
    WHERE c.claim_status NOT IN ('Paid', 'Void')
      AND c.submission_date IS NOT NULL
      AND (p_start_date IS NULL OR c.submission_date >= p_start_date)
      AND (p_end_date IS NULL OR c.submission_date <= p_end_date)
  ),
  totals AS (
    SELECT SUM(balance) AS total_balance FROM aging_data
  )
  SELECT
    bucket,
    COUNT(*)::BIGINT,
    SUM(balance)::DECIMAL,
    ROUND((SUM(balance) / NULLIF((SELECT total_balance FROM totals), 0) * 100), 2)::DECIMAL
  FROM aging_data
  GROUP BY bucket
  ORDER BY
    CASE bucket
      WHEN '0-30 days' THEN 1
      WHEN '31-60 days' THEN 2
      WHEN '61-90 days' THEN 3
      WHEN '91-120 days' THEN 4
      WHEN '120+ days' THEN 5
    END;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get top denial reasons
CREATE OR REPLACE FUNCTION get_top_denial_reasons(
  p_limit INTEGER DEFAULT 10,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  denial_code TEXT,
  denial_description TEXT,
  denial_count BIGINT,
  total_amount DECIMAL,
  avg_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.denial_code,
    dc.description,
    COUNT(DISTINCT c.id)::BIGINT,
    SUM(c.billed_amount)::DECIMAL,
    AVG(c.billed_amount)::DECIMAL
  FROM advancedmd_claims c
  LEFT JOIN denial_codes dc ON c.denial_code = dc.code
  WHERE c.claim_status IN ('Denied', 'Appealed')
    AND (p_start_date IS NULL OR c.submission_date >= p_start_date)
    AND (p_end_date IS NULL OR c.submission_date <= p_end_date)
  GROUP BY c.denial_code, dc.description
  ORDER BY COUNT(DISTINCT c.id) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_reports_report_type ON advancedmd_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON advancedmd_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_date_range ON advancedmd_reports(date_range_start, date_range_end);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON advancedmd_scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON advancedmd_scheduled_reports(is_active);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE advancedmd_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancedmd_scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Administrators and billing staff can manage reports
CREATE POLICY "Administrators and billing staff can manage reports" ON advancedmd_reports
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

-- Only administrators can manage scheduled reports
CREATE POLICY "Administrators can manage scheduled reports" ON advancedmd_scheduled_reports
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

-- ============================================================================
-- Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS update_advancedmd_scheduled_reports_updated_at ON advancedmd_scheduled_reports;
CREATE TRIGGER update_advancedmd_scheduled_reports_updated_at
  BEFORE UPDATE ON advancedmd_scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE advancedmd_reports IS 'Stores generated report data and metadata';
COMMENT ON TABLE advancedmd_scheduled_reports IS 'Configuration for scheduled report generation';
COMMENT ON VIEW claims_aging_report IS 'Claims aging analysis by days outstanding';
COMMENT ON VIEW payer_performance_report IS 'Payer-level performance metrics';
COMMENT ON VIEW provider_productivity_report IS 'Provider productivity and revenue metrics';
COMMENT ON VIEW revenue_cycle_metrics IS 'Monthly revenue cycle KPIs';
COMMENT ON VIEW ar_aging_summary IS 'Accounts receivable aging summary';
COMMENT ON VIEW collection_metrics_report IS 'Payment collection metrics over time';
COMMENT ON VIEW denial_analysis_by_reason IS 'Denial analysis grouped by reason code';
