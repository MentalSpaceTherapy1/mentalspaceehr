-- Create fee_schedules table
CREATE TABLE public.fee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_name TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('Standard', 'Insurance Contract', 'Sliding Scale', 'Custom')),
  
  effective_date DATE NOT NULL,
  end_date DATE,
  
  -- Insurance (if applicable)
  insurance_company_id UUID REFERENCES public.insurance_companies(id),
  insurance_company_name TEXT,
  contract_number TEXT,
  
  -- Fees (JSONB array)
  fees JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Defaults
  is_default_schedule BOOLEAN NOT NULL DEFAULT false,
  applicable_to TEXT NOT NULL CHECK (applicable_to IN ('All Clients', 'Specific Insurance', 'Self-Pay', 'Specific Group')),
  
  -- Audit
  created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on fee_schedules
ALTER TABLE public.fee_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fee_schedules
CREATE POLICY "Billing staff can manage fee schedules"
ON public.fee_schedules
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'administrator') OR 
  has_role(auth.uid(), 'billing_staff')
)
WITH CHECK (
  has_role(auth.uid(), 'administrator') OR 
  has_role(auth.uid(), 'billing_staff')
);

CREATE POLICY "All staff can view fee schedules"
ON public.fee_schedules
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Create index
CREATE INDEX idx_fee_schedules_insurance ON public.fee_schedules(insurance_company_id);
CREATE INDEX idx_fee_schedules_effective ON public.fee_schedules(effective_date);

-- Create eligibility_checks table
CREATE TABLE public.eligibility_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  insurance_id UUID NOT NULL REFERENCES public.client_insurance(id),
  
  check_date DATE NOT NULL,
  check_performed_by UUID REFERENCES public.profiles(id),
  
  -- Request
  service_date DATE NOT NULL,
  service_type TEXT NOT NULL,
  
  -- Response
  eligibility_status TEXT NOT NULL CHECK (eligibility_status IN ('Active', 'Inactive', 'Pending', 'Unknown')),
  
  -- Coverage Details (JSONB with nested structure)
  coverage_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Provider Network
  provider_in_network BOOLEAN NOT NULL DEFAULT false,
  provider_npi TEXT,
  
  -- Errors
  errors JSONB DEFAULT '[]'::jsonb,
  warning_messages JSONB DEFAULT '[]'::jsonb,
  
  -- Source
  source TEXT NOT NULL CHECK (source IN ('Manual', 'API', 'Phone', 'Portal')),
  
  -- Validity
  valid_until DATE NOT NULL,
  
  created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on eligibility_checks
ALTER TABLE public.eligibility_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for eligibility_checks
CREATE POLICY "Billing staff can manage eligibility checks"
ON public.eligibility_checks
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'administrator') OR 
  has_role(auth.uid(), 'billing_staff') OR
  has_role(auth.uid(), 'front_desk')
)
WITH CHECK (
  has_role(auth.uid(), 'administrator') OR 
  has_role(auth.uid(), 'billing_staff') OR
  has_role(auth.uid(), 'front_desk')
);

CREATE POLICY "Clinicians can view eligibility for their clients"
ON public.eligibility_checks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = eligibility_checks.client_id
    AND (
      clients.primary_therapist_id = auth.uid() OR
      clients.psychiatrist_id = auth.uid() OR
      clients.case_manager_id = auth.uid() OR
      has_role(auth.uid(), 'administrator') OR
      has_role(auth.uid(), 'supervisor') OR
      has_role(auth.uid(), 'billing_staff') OR
      has_role(auth.uid(), 'front_desk')
    )
  )
);

-- Create indexes
CREATE INDEX idx_eligibility_checks_client ON public.eligibility_checks(client_id);
CREATE INDEX idx_eligibility_checks_insurance ON public.eligibility_checks(insurance_id);
CREATE INDEX idx_eligibility_checks_date ON public.eligibility_checks(check_date);
CREATE INDEX idx_eligibility_checks_valid_until ON public.eligibility_checks(valid_until);