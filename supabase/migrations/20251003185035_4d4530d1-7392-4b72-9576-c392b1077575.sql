-- Create insurance companies table for autocomplete/reference
CREATE TABLE public.insurance_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  phone text,
  claims_address jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create client insurance table
CREATE TABLE public.client_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Rank
  rank text NOT NULL CHECK (rank IN ('Primary', 'Secondary', 'Tertiary')),
  
  -- Insurance Details
  insurance_company text NOT NULL,
  insurance_company_id uuid REFERENCES public.insurance_companies(id),
  plan_name text NOT NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('PPO', 'HMO', 'EPO', 'POS', 'Medicare', 'Medicaid', 'Military', 'Other')),
  member_id text NOT NULL,
  group_number text,
  
  effective_date date NOT NULL,
  termination_date date,
  
  -- Subscriber Information
  subscriber_is_client boolean DEFAULT true,
  subscriber_first_name text,
  subscriber_last_name text,
  subscriber_dob date,
  subscriber_ssn text,
  relationship_to_subscriber text CHECK (relationship_to_subscriber IN ('Self', 'Spouse', 'Child', 'Other')),
  subscriber_address jsonb,
  subscriber_employer text,
  
  -- Plan Details
  customer_service_phone text NOT NULL,
  claims_address jsonb,
  precertification_phone text,
  provider_phone text,
  
  -- Coverage Information
  requires_referral boolean DEFAULT false,
  requires_prior_auth boolean DEFAULT false,
  mental_health_coverage boolean DEFAULT true,
  copay numeric(10,2),
  coinsurance numeric(5,2),
  deductible numeric(10,2),
  deductible_met numeric(10,2),
  out_of_pocket_max numeric(10,2),
  out_of_pocket_met numeric(10,2),
  
  -- Benefit Verification
  last_verification_date date,
  last_verified_by uuid REFERENCES public.profiles(id),
  verification_notes text,
  remaining_sessions_this_year integer,
  
  -- Card Images (base64 or storage URLs)
  front_card_image text,
  back_card_image text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  
  -- Ensure only one insurance per rank per client
  UNIQUE(client_id, rank)
);

-- Enable RLS
ALTER TABLE public.insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_insurance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for insurance_companies
CREATE POLICY "All authenticated users can view insurance companies"
  ON public.insurance_companies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators and billing staff can manage insurance companies"
  ON public.insurance_companies
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'billing_staff'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'billing_staff'::app_role));

-- RLS Policies for client_insurance
CREATE POLICY "Users can view insurance for accessible clients"
  ON public.client_insurance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_insurance.client_id
      AND (
        clients.primary_therapist_id = auth.uid()
        OR clients.psychiatrist_id = auth.uid()
        OR clients.case_manager_id = auth.uid()
        OR has_role(auth.uid(), 'administrator'::app_role)
        OR has_role(auth.uid(), 'supervisor'::app_role)
        OR has_role(auth.uid(), 'front_desk'::app_role)
        OR has_role(auth.uid(), 'billing_staff'::app_role)
      )
    )
  );

CREATE POLICY "Authorized staff can manage client insurance"
  ON public.client_insurance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_insurance.client_id
      AND (
        clients.primary_therapist_id = auth.uid()
        OR has_role(auth.uid(), 'administrator'::app_role)
        OR has_role(auth.uid(), 'front_desk'::app_role)
        OR has_role(auth.uid(), 'billing_staff'::app_role)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_insurance.client_id
      AND (
        clients.primary_therapist_id = auth.uid()
        OR has_role(auth.uid(), 'administrator'::app_role)
        OR has_role(auth.uid(), 'front_desk'::app_role)
        OR has_role(auth.uid(), 'billing_staff'::app_role)
      )
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_client_insurance_updated_at
  BEFORE UPDATE ON public.client_insurance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insurance_companies_updated_at
  BEFORE UPDATE ON public.insurance_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();