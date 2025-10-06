-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Billing staff can manage all claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Clinicians can view claims for their clients" ON public.insurance_claims;

-- Drop and recreate the insurance_claims table with all required columns
DROP TABLE IF EXISTS public.insurance_claims CASCADE;

CREATE TABLE public.insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL,
  
  -- Claim Information
  claim_type TEXT NOT NULL CHECK (claim_type IN ('Primary', 'Secondary', 'Tertiary')),
  claim_status TEXT NOT NULL DEFAULT 'Draft' CHECK (claim_status IN ('Draft', 'Ready to Bill', 'Submitted', 'Accepted', 'Rejected', 'Paid', 'Denied', 'Pending')),
  
  -- Dates
  claim_created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  claim_submitted_date TIMESTAMP WITH TIME ZONE,
  claim_received_date TIMESTAMP WITH TIME ZONE,
  claim_processed_date TIMESTAMP WITH TIME ZONE,
  claim_paid_date TIMESTAMP WITH TIME ZONE,
  
  -- Payer Information
  payer_id TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  payer_address JSONB,
  
  -- Billing Provider
  billing_provider_id UUID NOT NULL,
  billing_provider_npi TEXT NOT NULL,
  billing_provider_tax_id TEXT NOT NULL,
  
  -- Totals
  total_charge_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  
  -- Diagnoses
  diagnoses JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Prior Authorization
  prior_auth_required BOOLEAN DEFAULT false,
  prior_auth_number TEXT,
  
  -- Electronic Filing
  clearinghouse_id TEXT,
  claim_control_number TEXT,
  payer_claim_number TEXT,
  
  -- Submission
  submission_method TEXT CHECK (submission_method IN ('Electronic', 'Paper', 'Portal')),
  batch_id TEXT,
  
  -- Adjudication
  allowed_amount NUMERIC(10, 2),
  paid_amount NUMERIC(10, 2),
  adjustment_amount NUMERIC(10, 2),
  deductible_amount NUMERIC(10, 2),
  coinsurance_amount NUMERIC(10, 2),
  copay_amount NUMERIC(10, 2),
  client_responsibility NUMERIC(10, 2),
  
  -- Remittance
  era_received BOOLEAN DEFAULT false,
  era_date TIMESTAMP WITH TIME ZONE,
  eob_received BOOLEAN DEFAULT false,
  eob_date TIMESTAMP WITH TIME ZONE,
  
  check_number TEXT,
  check_amount NUMERIC(10, 2),
  check_date DATE,
  
  -- Denials & Appeals
  denial_codes TEXT[],
  denial_reasons TEXT[],
  
  appeal_required BOOLEAN DEFAULT false,
  appeal_deadline DATE,
  appeal_filed BOOLEAN DEFAULT false,
  appeal_date DATE,
  appeal_outcome TEXT CHECK (appeal_outcome IN ('Approved', 'Denied', 'Pending')),
  
  -- Corrections
  corrected_claim_id UUID,
  original_claim_id UUID,
  
  -- Notes
  billing_notes TEXT,
  
  -- Audit
  created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID,
  last_modified TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_modified_by UUID
);

-- Enable RLS
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Billing staff can manage all claims"
ON public.insurance_claims
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'administrator'::app_role) OR 
  has_role(auth.uid(), 'billing_staff'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'administrator'::app_role) OR 
  has_role(auth.uid(), 'billing_staff'::app_role)
);

CREATE POLICY "Clinicians can view claims for their clients"
ON public.insurance_claims
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = insurance_claims.client_id
    AND (
      clients.primary_therapist_id = auth.uid() OR
      clients.psychiatrist_id = auth.uid() OR
      has_role(auth.uid(), 'supervisor'::app_role)
    )
  )
);

-- Trigger to update last_modified
CREATE OR REPLACE FUNCTION update_insurance_claims_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified = NOW();
  NEW.last_modified_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_insurance_claims_modified_trigger
BEFORE UPDATE ON public.insurance_claims
FOR EACH ROW
EXECUTE FUNCTION update_insurance_claims_modified();

-- Recreate foreign key for claim_line_items
ALTER TABLE public.claim_line_items
DROP CONSTRAINT IF EXISTS claim_line_items_claim_id_fkey;

ALTER TABLE public.claim_line_items
ADD CONSTRAINT claim_line_items_claim_id_fkey
FOREIGN KEY (claim_id) REFERENCES public.insurance_claims(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_insurance_claims_client_id ON public.insurance_claims(client_id);
CREATE INDEX idx_insurance_claims_status ON public.insurance_claims(claim_status);
CREATE INDEX idx_insurance_claims_billing_provider ON public.insurance_claims(billing_provider_id);
CREATE INDEX idx_insurance_claims_payer ON public.insurance_claims(payer_id);