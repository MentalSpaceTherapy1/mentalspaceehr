-- Phase 4: ERA & Payment Posting

-- ERA files tracking
CREATE TABLE IF NOT EXISTS public.advancedmd_era_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  payer_id TEXT,
  check_number TEXT,
  check_date DATE,
  check_amount NUMERIC(12,2),
  total_claims INTEGER DEFAULT 0,
  processing_status TEXT NOT NULL DEFAULT 'Pending',
  uploaded_by UUID REFERENCES public.profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  raw_content TEXT,
  parsed_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ERA transactions (835 claim-level details)
CREATE TABLE IF NOT EXISTS public.advancedmd_era_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  era_file_id UUID NOT NULL REFERENCES public.advancedmd_era_files(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES public.advancedmd_claims(id),
  patient_id UUID REFERENCES public.clients(id),
  payer_claim_number TEXT,
  provider_claim_number TEXT,
  claim_status_code TEXT,
  claim_status_description TEXT,
  billed_amount NUMERIC(10,2),
  allowed_amount NUMERIC(10,2),
  paid_amount NUMERIC(10,2),
  patient_responsibility NUMERIC(10,2),
  adjustment_amount NUMERIC(10,2),
  adjustment_reason_codes JSONB,
  remark_codes JSONB,
  service_lines JSONB,
  service_date_from DATE,
  service_date_to DATE,
  processed_date DATE,
  check_number TEXT,
  posting_status TEXT NOT NULL DEFAULT 'Pending',
  posted_at TIMESTAMP WITH TIME ZONE,
  posted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payment postings
CREATE TABLE IF NOT EXISTS public.advancedmd_payment_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  era_transaction_id UUID REFERENCES public.advancedmd_era_transactions(id),
  charge_entry_id UUID REFERENCES public.charge_entries(id),
  patient_id UUID NOT NULL REFERENCES public.clients(id),
  payment_source TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  payment_date DATE NOT NULL,
  payment_amount NUMERIC(10,2) NOT NULL,
  adjustment_amount NUMERIC(10,2) DEFAULT 0,
  patient_responsibility NUMERIC(10,2) DEFAULT 0,
  check_number TEXT,
  reference_number TEXT,
  payment_method TEXT,
  posted_by UUID REFERENCES public.profiles(id),
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  posting_notes TEXT,
  reversal_status TEXT DEFAULT 'Active',
  reversed_at TIMESTAMP WITH TIME ZONE,
  reversed_by UUID REFERENCES public.profiles(id),
  reversal_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_advancedmd_era_files_payer ON public.advancedmd_era_files(payer_name);
CREATE INDEX IF NOT EXISTS idx_advancedmd_era_files_status ON public.advancedmd_era_files(processing_status);
CREATE INDEX IF NOT EXISTS idx_advancedmd_era_files_uploaded_at ON public.advancedmd_era_files(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_advancedmd_era_transactions_era_file ON public.advancedmd_era_transactions(era_file_id);
CREATE INDEX IF NOT EXISTS idx_advancedmd_era_transactions_claim ON public.advancedmd_era_transactions(claim_id);
CREATE INDEX IF NOT EXISTS idx_advancedmd_era_transactions_patient ON public.advancedmd_era_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_advancedmd_era_transactions_posting_status ON public.advancedmd_era_transactions(posting_status);
CREATE INDEX IF NOT EXISTS idx_advancedmd_payment_postings_era_transaction ON public.advancedmd_payment_postings(era_transaction_id);
CREATE INDEX IF NOT EXISTS idx_advancedmd_payment_postings_charge_entry ON public.advancedmd_payment_postings(charge_entry_id);
CREATE INDEX IF NOT EXISTS idx_advancedmd_payment_postings_patient ON public.advancedmd_payment_postings(patient_id);
CREATE INDEX IF NOT EXISTS idx_advancedmd_payment_postings_payment_date ON public.advancedmd_payment_postings(payment_date);
CREATE INDEX IF NOT EXISTS idx_advancedmd_payment_postings_reversal_status ON public.advancedmd_payment_postings(reversal_status);

-- RLS Policies
ALTER TABLE public.advancedmd_era_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advancedmd_era_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advancedmd_payment_postings ENABLE ROW LEVEL SECURITY;

-- ERA files policies
CREATE POLICY "Billing staff can view ERA files"
  ON public.advancedmd_era_files
  FOR SELECT
  USING (
    has_role(auth.uid(), 'administrator') OR
    has_role(auth.uid(), 'billing_staff')
  );

CREATE POLICY "Billing staff can upload ERA files"
  ON public.advancedmd_era_files
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'administrator') OR
    has_role(auth.uid(), 'billing_staff')
  );

CREATE POLICY "Billing staff can update ERA files"
  ON public.advancedmd_era_files
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'administrator') OR
    has_role(auth.uid(), 'billing_staff')
  );

-- ERA transactions policies
CREATE POLICY "Billing staff can view ERA transactions"
  ON public.advancedmd_era_transactions
  FOR SELECT
  USING (
    has_role(auth.uid(), 'administrator') OR
    has_role(auth.uid(), 'billing_staff') OR
    has_role(auth.uid(), 'front_desk')
  );

CREATE POLICY "Billing staff can manage ERA transactions"
  ON public.advancedmd_era_transactions
  FOR ALL
  USING (
    has_role(auth.uid(), 'administrator') OR
    has_role(auth.uid(), 'billing_staff')
  );

-- Payment postings policies
CREATE POLICY "Billing staff can view payment postings"
  ON public.advancedmd_payment_postings
  FOR SELECT
  USING (
    has_role(auth.uid(), 'administrator') OR
    has_role(auth.uid(), 'billing_staff') OR
    has_role(auth.uid(), 'front_desk')
  );

CREATE POLICY "Billing staff can create payment postings"
  ON public.advancedmd_payment_postings
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'administrator') OR
    has_role(auth.uid(), 'billing_staff')
  );

CREATE POLICY "Billing staff can update payment postings"
  ON public.advancedmd_payment_postings
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'administrator') OR
    has_role(auth.uid(), 'billing_staff')
  );

CREATE POLICY "Providers can view postings for their claims"
  ON public.advancedmd_payment_postings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM charge_entries
      WHERE charge_entries.id = advancedmd_payment_postings.charge_entry_id
      AND charge_entries.provider_id = auth.uid()
    )
  );