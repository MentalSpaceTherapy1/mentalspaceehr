-- Phase 3: Electronic Claim Submission

-- Claims table
CREATE TABLE IF NOT EXISTS public.advancedmd_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number TEXT UNIQUE NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.clients(id),
  provider_id UUID NOT NULL REFERENCES public.profiles(id),
  payer_id TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  claim_type TEXT NOT NULL DEFAULT '837P',
  billing_provider_id UUID REFERENCES public.profiles(id),
  claim_total_amount NUMERIC(10,2) NOT NULL,
  service_from_date DATE NOT NULL,
  service_to_date DATE NOT NULL,
  claim_status TEXT NOT NULL DEFAULT 'Draft',
  submission_method TEXT,
  submitted_date TIMESTAMP WITH TIME ZONE,
  accepted_date TIMESTAMP WITH TIME ZONE,
  rejected_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  paid_amount NUMERIC(10,2),
  adjustment_amount NUMERIC(10,2),
  patient_responsibility NUMERIC(10,2),
  rejection_reason TEXT,
  rejection_codes JSONB,
  clearinghouse_id UUID,
  clearinghouse_claim_id TEXT,
  payer_claim_id TEXT,
  service_lines JSONB NOT NULL,
  diagnoses JSONB NOT NULL,
  prior_auth_number TEXT,
  referral_number TEXT,
  claim_note TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_modified_by UUID REFERENCES public.profiles(id)
);

-- EDI batches for electronic submission
CREATE TABLE IF NOT EXISTS public.advancedmd_edi_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT UNIQUE NOT NULL,
  batch_type TEXT NOT NULL DEFAULT '837',
  clearinghouse_id UUID,
  total_claims INTEGER DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  batch_status TEXT NOT NULL DEFAULT 'Pending',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  edi_file_path TEXT,
  acknowledgment_file_path TEXT,
  control_number TEXT,
  interchange_id TEXT,
  error_messages JSONB
);

-- Batch claims junction table
CREATE TABLE IF NOT EXISTS public.advancedmd_batch_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.advancedmd_edi_batches(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES public.advancedmd_claims(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  claim_status TEXT NOT NULL DEFAULT 'Pending',
  error_codes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(batch_id, claim_id)
);

-- Claim appeals tracking
CREATE TABLE IF NOT EXISTS public.advancedmd_claim_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.advancedmd_claims(id) ON DELETE CASCADE,
  appeal_level INTEGER NOT NULL DEFAULT 1,
  appeal_date DATE NOT NULL,
  appeal_reason TEXT NOT NULL,
  supporting_documents JSONB,
  appeal_status TEXT NOT NULL DEFAULT 'Submitted',
  response_date DATE,
  response_description TEXT,
  outcome TEXT,
  appeal_amount NUMERIC(10,2),
  recovered_amount NUMERIC(10,2),
  filed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_advancedmd_claims_patient ON public.advancedmd_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_advancedmd_claims_provider ON public.advancedmd_claims(provider_id);
CREATE INDEX IF NOT EXISTS idx_advancedmd_claims_status ON public.advancedmd_claims(claim_status);
CREATE INDEX IF NOT EXISTS idx_advancedmd_claims_submitted_date ON public.advancedmd_claims(submitted_date);
CREATE INDEX IF NOT EXISTS idx_advancedmd_claims_claim_number ON public.advancedmd_claims(claim_number);
CREATE INDEX IF NOT EXISTS idx_advancedmd_edi_batches_status ON public.advancedmd_edi_batches(batch_status);
CREATE INDEX IF NOT EXISTS idx_advancedmd_edi_batches_batch_number ON public.advancedmd_edi_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_advancedmd_batch_claims_batch_id ON public.advancedmd_batch_claims(batch_id);
CREATE INDEX IF NOT EXISTS idx_advancedmd_batch_claims_claim_id ON public.advancedmd_batch_claims(claim_id);
CREATE INDEX IF NOT EXISTS idx_advancedmd_claim_appeals_claim_id ON public.advancedmd_claim_appeals(claim_id);
CREATE INDEX IF NOT EXISTS idx_advancedmd_claim_appeals_status ON public.advancedmd_claim_appeals(appeal_status);

-- RLS Policies
ALTER TABLE public.advancedmd_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advancedmd_edi_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advancedmd_batch_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advancedmd_claim_appeals ENABLE ROW LEVEL SECURITY;

-- Claims policies
CREATE POLICY "Billing staff can view claims"
  ON public.advancedmd_claims
  FOR SELECT
  USING (
    has_role(auth.uid(), 'administrator') OR
    has_role(auth.uid(), 'billing_staff') OR
    has_role(auth.uid(), 'front_desk')
  );

CREATE POLICY "Billing staff can create claims"
  ON public.advancedmd_claims
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'administrator') OR
    has_role(auth.uid(), 'billing_staff')
  );

CREATE POLICY "Billing staff can update claims"
  ON public.advancedmd_claims
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'administrator') OR
    has_role(auth.uid(), 'billing_staff')
  );

CREATE POLICY "Providers can view their own claims"
  ON public.advancedmd_claims
  FOR SELECT
  USING (provider_id = auth.uid());

-- EDI batches policies
CREATE POLICY "Billing staff can manage EDI batches"
  ON public.advancedmd_edi_batches
  FOR ALL
  USING (
    has_role(auth.uid(), 'administrator') OR
    has_role(auth.uid(), 'billing_staff')
  );

-- Batch claims policies
CREATE POLICY "Billing staff can manage batch claims"
  ON public.advancedmd_batch_claims
  FOR ALL
  USING (
    has_role(auth.uid(), 'administrator') OR
    has_role(auth.uid(), 'billing_staff')
  );

-- Claim appeals policies
CREATE POLICY "Billing staff can view appeals"
  ON public.advancedmd_claim_appeals
  FOR SELECT
  USING (
    has_role(auth.uid(), 'administrator') OR
    has_role(auth.uid(), 'billing_staff')
  );

CREATE POLICY "Billing staff can create appeals"
  ON public.advancedmd_claim_appeals
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'administrator') OR
    has_role(auth.uid(), 'billing_staff')
  );

CREATE POLICY "Billing staff can update appeals"
  ON public.advancedmd_claim_appeals
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'administrator') OR
    has_role(auth.uid(), 'billing_staff')
  );