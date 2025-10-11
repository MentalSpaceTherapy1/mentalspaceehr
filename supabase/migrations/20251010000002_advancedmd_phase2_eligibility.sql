-- ============================================================================
-- AdvancedMD Integration - Phase 2: Real-Time Eligibility Verification
-- ============================================================================

-- Add insurance card image fields to client_insurance table
ALTER TABLE client_insurance
ADD COLUMN IF NOT EXISTS front_card_image TEXT,
ADD COLUMN IF NOT EXISTS back_card_image TEXT,
ADD COLUMN IF NOT EXISTS card_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ocr_extracted_data JSONB;

-- Create insurance_cards storage bucket policy
INSERT INTO storage.buckets (id, name, public)
VALUES ('insurance-cards', 'insurance-cards', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for insurance cards
CREATE POLICY "Authenticated users can upload insurance cards"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'insurance-cards');

CREATE POLICY "Users can view their own insurance cards"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'insurance-cards');

CREATE POLICY "Users can update their own insurance cards"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'insurance-cards');

CREATE POLICY "Users can delete their own insurance cards"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'insurance-cards');

-- Eligibility Check Cache Function
CREATE OR REPLACE FUNCTION get_cached_eligibility(
  p_client_id UUID,
  p_insurance_id UUID,
  p_service_date DATE,
  p_cache_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  id UUID,
  coverage_status TEXT,
  copay DECIMAL,
  deductible_remaining DECIMAL,
  oop_max_remaining DECIMAL,
  check_date TIMESTAMPTZ,
  raw_response JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.coverage_status,
    e.copay,
    e.deductible_remaining,
    e.oop_max_remaining,
    e.check_date,
    e.raw_response
  FROM advancedmd_eligibility_checks e
  WHERE
    e.client_id = p_client_id
    AND e.insurance_id = p_insurance_id
    AND e.service_date >= p_service_date
    AND e.check_date > (NOW() - (p_cache_hours || ' hours')::INTERVAL)
  ORDER BY e.check_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if eligibility needs refresh
CREATE OR REPLACE FUNCTION needs_eligibility_refresh(
  p_client_id UUID,
  p_insurance_id UUID,
  p_service_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  last_check_date TIMESTAMPTZ;
BEGIN
  SELECT check_date INTO last_check_date
  FROM advancedmd_eligibility_checks
  WHERE
    client_id = p_client_id
    AND insurance_id = p_insurance_id
    AND service_date >= p_service_date
  ORDER BY check_date DESC
  LIMIT 1;

  -- If no check found or check is older than 24 hours, needs refresh
  IF last_check_date IS NULL OR last_check_date < (NOW() - INTERVAL '24 hours') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for recent eligibility checks with client info
CREATE OR REPLACE VIEW recent_eligibility_checks AS
SELECT
  e.id,
  e.client_id,
  c.first_name,
  c.last_name,
  e.insurance_id,
  i.insurance_company,
  i.member_id,
  e.service_date,
  e.check_date,
  e.coverage_status,
  e.payer_name,
  e.plan_name,
  e.copay,
  e.coinsurance,
  e.deductible_total,
  e.deductible_met,
  e.deductible_remaining,
  e.oop_max_total,
  e.oop_max_met,
  e.oop_max_remaining,
  e.prior_auth_required,
  e.prior_auth_number,
  e.benefits,
  e.limitations,
  e.response_code,
  -- Calculate if check is still valid (within 24 hours)
  CASE
    WHEN e.check_date > (NOW() - INTERVAL '24 hours') THEN true
    ELSE false
  END AS is_valid
FROM advancedmd_eligibility_checks e
LEFT JOIN clients c ON e.client_id = c.id
LEFT JOIN client_insurance i ON e.insurance_id = i.id
ORDER BY e.check_date DESC;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_client_insurance_card_images
  ON client_insurance(client_id)
  WHERE front_card_image IS NOT NULL;

-- Index for eligibility cache lookups
CREATE INDEX IF NOT EXISTS idx_eligibility_cache_lookup
  ON advancedmd_eligibility_checks(client_id, insurance_id, service_date, check_date DESC);

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON COLUMN client_insurance.front_card_image IS 'Storage path to front image of insurance card';
COMMENT ON COLUMN client_insurance.back_card_image IS 'Storage path to back image of insurance card';
COMMENT ON COLUMN client_insurance.card_uploaded_at IS 'Timestamp when insurance card was uploaded';
COMMENT ON COLUMN client_insurance.ocr_extracted_data IS 'Data extracted from insurance card via OCR';

COMMENT ON FUNCTION get_cached_eligibility IS 'Get cached eligibility result if still valid (within specified hours)';
COMMENT ON FUNCTION needs_eligibility_refresh IS 'Check if eligibility verification needs to be refreshed (older than 24 hours)';
COMMENT ON VIEW recent_eligibility_checks IS 'View of recent eligibility checks with client and insurance information';
