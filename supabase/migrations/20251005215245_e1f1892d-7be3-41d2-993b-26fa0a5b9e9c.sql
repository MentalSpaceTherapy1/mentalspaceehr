-- Core billing system tables for Phase 8

-- Create insurance companies table
CREATE TABLE IF NOT EXISTS public.insurance_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  payer_id TEXT UNIQUE,
  address JSONB,
  phone TEXT,
  fax TEXT,
  website TEXT,
  claims_address JSONB,
  electronic_claims_supported BOOLEAN DEFAULT true,
  era_supported BOOLEAN DEFAULT false,
  eligibility_supported BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ICD-10 codes table
CREATE TABLE IF NOT EXISTS public.icd_10_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  is_billable BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create charge entries table
CREATE TABLE IF NOT EXISTS public.charge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  appointment_id UUID REFERENCES public.appointments(id),
  note_id UUID REFERENCES public.clinical_notes(id),
  
  service_date DATE NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.profiles(id),
  supervising_provider_id UUID REFERENCES public.profiles(id),
  
  cpt_code TEXT NOT NULL,
  cpt_description TEXT NOT NULL,
  modifiers TEXT[],
  units INTEGER NOT NULL DEFAULT 1,
  
  diagnosis_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  place_of_service TEXT NOT NULL DEFAULT '11',
  location_id UUID,
  
  charge_amount NUMERIC(10,2) NOT NULL,
  allowed_amount NUMERIC(10,2),
  adjustment_amount NUMERIC(10,2) DEFAULT 0,
  payment_amount NUMERIC(10,2) DEFAULT 0,
  client_responsibility NUMERIC(10,2) DEFAULT 0,
  
  primary_insurance_id UUID REFERENCES public.client_insurance(id),
  secondary_insurance_id UUID REFERENCES public.client_insurance(id),
  
  charge_status TEXT NOT NULL DEFAULT 'Unbilled',
  
  claim_id UUID,
  claim_status TEXT,
  billed_date TIMESTAMPTZ,
  
  payments JSONB DEFAULT '[]'::jsonb,
  
  denial_code TEXT,
  denial_reason TEXT,
  appeal_filed BOOLEAN DEFAULT false,
  appeal_date TIMESTAMPTZ,
  
  write_off_amount NUMERIC(10,2),
  write_off_reason TEXT,
  write_off_date TIMESTAMPTZ,
  
  created_date TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_charge_status CHECK (charge_status IN ('Unbilled', 'Billed', 'Paid', 'Partially Paid', 'Denied', 'Write-off'))
);

-- Create claims table
CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number TEXT UNIQUE NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  
  primary_insurance_id UUID NOT NULL REFERENCES public.client_insurance(id),
  secondary_insurance_id UUID REFERENCES public.client_insurance(id),
  
  rendering_provider_id UUID NOT NULL REFERENCES public.profiles(id),
  billing_provider_id UUID NOT NULL REFERENCES public.profiles(id),
  supervising_provider_id UUID REFERENCES public.profiles(id),
  
  service_date_from DATE NOT NULL,
  service_date_to DATE NOT NULL,
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  total_charge_amount NUMERIC(10,2) NOT NULL,
  total_allowed_amount NUMERIC(10,2),
  total_paid_amount NUMERIC(10,2) DEFAULT 0,
  total_adjustment_amount NUMERIC(10,2) DEFAULT 0,
  patient_responsibility NUMERIC(10,2) DEFAULT 0,
  
  claim_status TEXT NOT NULL DEFAULT 'Draft',
  submission_method TEXT DEFAULT 'Electronic',
  
  submitted_date TIMESTAMPTZ,
  submitted_by UUID REFERENCES public.profiles(id),
  
  edi_batch_id TEXT,
  edi_control_number TEXT,
  clearinghouse_id TEXT,
  
  accepted_date TIMESTAMPTZ,
  adjudication_date TIMESTAMPTZ,
  paid_date TIMESTAMPTZ,
  
  denial_code TEXT,
  denial_reason TEXT,
  
  original_claim_id UUID REFERENCES public.insurance_claims(id),
  corrected_claim_id UUID REFERENCES public.insurance_claims(id),
  is_corrected_claim BOOLEAN DEFAULT false,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_claim_status CHECK (claim_status IN ('Draft', 'Ready to Submit', 'Submitted', 'Accepted', 'Rejected', 'Paid', 'Partially Paid', 'Denied', 'Appeal'))
);

-- Create claim line items table
CREATE TABLE IF NOT EXISTS public.claim_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
  charge_entry_id UUID NOT NULL REFERENCES public.charge_entries(id),
  line_number INTEGER NOT NULL,
  
  service_date DATE NOT NULL,
  place_of_service TEXT NOT NULL,
  
  cpt_code TEXT NOT NULL,
  modifiers TEXT[],
  units INTEGER NOT NULL,
  diagnosis_pointers INTEGER[] NOT NULL,
  
  charge_amount NUMERIC(10,2) NOT NULL,
  allowed_amount NUMERIC(10,2),
  paid_amount NUMERIC(10,2) DEFAULT 0,
  adjustment_amount NUMERIC(10,2) DEFAULT 0,
  
  line_status TEXT DEFAULT 'Pending',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(claim_id, line_number)
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.insurance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT UNIQUE NOT NULL,
  
  insurance_company_id UUID REFERENCES public.insurance_companies(id),
  insurance_id UUID REFERENCES public.client_insurance(id),
  
  payment_date DATE NOT NULL,
  check_number TEXT,
  check_amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Check',
  
  era_file_id TEXT,
  trace_number TEXT,
  
  posted_by UUID REFERENCES public.profiles(id),
  posted_date TIMESTAMPTZ DEFAULT now(),
  
  payment_status TEXT NOT NULL DEFAULT 'Unposted',
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('Unposted', 'Posted', 'Voided'))
);

-- Create payment line items table
CREATE TABLE IF NOT EXISTS public.payment_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.insurance_payments(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES public.insurance_claims(id),
  charge_entry_id UUID NOT NULL REFERENCES public.charge_entries(id),
  
  client_id UUID NOT NULL REFERENCES public.clients(id),
  
  charge_amount NUMERIC(10,2) NOT NULL,
  allowed_amount NUMERIC(10,2),
  paid_amount NUMERIC(10,2) NOT NULL,
  adjustment_amount NUMERIC(10,2) DEFAULT 0,
  deductible_amount NUMERIC(10,2) DEFAULT 0,
  coinsurance_amount NUMERIC(10,2) DEFAULT 0,
  copay_amount NUMERIC(10,2) DEFAULT 0,
  
  adjustment_codes JSONB DEFAULT '[]'::jsonb,
  
  remark_codes TEXT[],
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_charge_claim'
  ) THEN
    ALTER TABLE public.charge_entries 
    ADD CONSTRAINT fk_charge_claim 
    FOREIGN KEY (claim_id) REFERENCES public.insurance_claims(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icd_10_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_line_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "All users can view insurance companies" ON public.insurance_companies;
DROP POLICY IF EXISTS "Administrators can manage insurance companies" ON public.insurance_companies;
DROP POLICY IF EXISTS "All users can view ICD-10 codes" ON public.icd_10_codes;
DROP POLICY IF EXISTS "Administrators can manage ICD-10 codes" ON public.icd_10_codes;
DROP POLICY IF EXISTS "Billing staff can view all charges" ON public.charge_entries;
DROP POLICY IF EXISTS "Clinicians can view charges for their clients" ON public.charge_entries;
DROP POLICY IF EXISTS "Billing staff can manage charges" ON public.charge_entries;
DROP POLICY IF EXISTS "Billing staff can view all claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Clinicians can view claims for their clients" ON public.insurance_claims;
DROP POLICY IF EXISTS "Billing staff can manage claims" ON public.insurance_claims;
DROP POLICY IF EXISTS "Users can view line items for accessible claims" ON public.claim_line_items;
DROP POLICY IF EXISTS "Billing staff can manage line items" ON public.claim_line_items;
DROP POLICY IF EXISTS "Billing staff can view all payments" ON public.insurance_payments;
DROP POLICY IF EXISTS "Billing staff can manage payments" ON public.insurance_payments;
DROP POLICY IF EXISTS "Users can view payment line items for accessible payments" ON public.payment_line_items;
DROP POLICY IF EXISTS "Billing staff can manage payment line items" ON public.payment_line_items;

-- RLS Policies
CREATE POLICY "All users can view insurance companies"
  ON public.insurance_companies FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Administrators can manage insurance companies"
  ON public.insurance_companies FOR ALL
  USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "All users can view ICD-10 codes"
  ON public.icd_10_codes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Administrators can manage ICD-10 codes"
  ON public.icd_10_codes FOR ALL
  USING (has_role(auth.uid(), 'administrator'));

CREATE POLICY "Billing staff can view all charges"
  ON public.charge_entries FOR SELECT
  USING (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'billing_staff') OR has_role(auth.uid(), 'front_desk'));

CREATE POLICY "Clinicians can view charges for their clients"
  ON public.charge_entries FOR SELECT
  USING (
    provider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = charge_entries.client_id
      AND (clients.primary_therapist_id = auth.uid() OR clients.psychiatrist_id = auth.uid())
    )
  );

CREATE POLICY "Billing staff can manage charges"
  ON public.charge_entries FOR ALL
  USING (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'billing_staff'))
  WITH CHECK (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'billing_staff'));

CREATE POLICY "Billing staff can view all claims"
  ON public.insurance_claims FOR SELECT
  USING (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'billing_staff') OR has_role(auth.uid(), 'front_desk'));

CREATE POLICY "Clinicians can view claims for their clients"
  ON public.insurance_claims FOR SELECT
  USING (
    rendering_provider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = insurance_claims.client_id
      AND (clients.primary_therapist_id = auth.uid() OR clients.psychiatrist_id = auth.uid())
    )
  );

CREATE POLICY "Billing staff can manage claims"
  ON public.insurance_claims FOR ALL
  USING (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'billing_staff'))
  WITH CHECK (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'billing_staff'));

CREATE POLICY "Users can view line items for accessible claims"
  ON public.claim_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.insurance_claims
      WHERE insurance_claims.id = claim_line_items.claim_id
    )
  );

CREATE POLICY "Billing staff can manage line items"
  ON public.claim_line_items FOR ALL
  USING (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'billing_staff'))
  WITH CHECK (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'billing_staff'));

CREATE POLICY "Billing staff can view all payments"
  ON public.insurance_payments FOR SELECT
  USING (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'billing_staff') OR has_role(auth.uid(), 'front_desk'));

CREATE POLICY "Billing staff can manage payments"
  ON public.insurance_payments FOR ALL
  USING (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'billing_staff'))
  WITH CHECK (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'billing_staff'));

CREATE POLICY "Users can view payment line items for accessible payments"
  ON public.payment_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.insurance_payments
      WHERE insurance_payments.id = payment_line_items.payment_id
    )
  );

CREATE POLICY "Billing staff can manage payment line items"
  ON public.payment_line_items FOR ALL
  USING (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'billing_staff'))
  WITH CHECK (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'billing_staff'));

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_charge_entries_client ON public.charge_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_charge_entries_provider ON public.charge_entries(provider_id);
CREATE INDEX IF NOT EXISTS idx_charge_entries_service_date ON public.charge_entries(service_date);
CREATE INDEX IF NOT EXISTS idx_charge_entries_status ON public.charge_entries(charge_status);

CREATE INDEX IF NOT EXISTS idx_claims_client ON public.insurance_claims(client_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.insurance_claims(claim_status);
CREATE INDEX IF NOT EXISTS idx_claims_service_dates ON public.insurance_claims(service_date_from, service_date_to);

CREATE INDEX IF NOT EXISTS idx_payments_date ON public.insurance_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_insurance ON public.insurance_payments(insurance_company_id);