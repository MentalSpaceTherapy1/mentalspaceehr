-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_number TEXT UNIQUE NOT NULL,
  
  -- Personal Information
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  suffix TEXT,
  previous_names TEXT[],
  preferred_name TEXT,
  pronouns TEXT,
  
  -- Date of Birth
  date_of_birth DATE NOT NULL,
  
  -- Contact Information
  primary_phone TEXT NOT NULL,
  primary_phone_type TEXT CHECK (primary_phone_type IN ('Mobile', 'Home', 'Work')),
  secondary_phone TEXT,
  secondary_phone_type TEXT CHECK (secondary_phone_type IN ('Mobile', 'Home', 'Work')),
  email TEXT,
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('Phone', 'Email', 'Text', 'Portal')),
  okay_to_leave_message BOOLEAN DEFAULT false,
  
  -- Physical Address
  street1 TEXT NOT NULL,
  street2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  county TEXT,
  is_temporary_address BOOLEAN DEFAULT false,
  temporary_until DATE,
  
  -- Mailing Address (stored as JSONB if different)
  mailing_address JSONB,
  
  -- Demographics
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say')),
  gender_identity TEXT,
  sex_assigned_at_birth TEXT CHECK (sex_assigned_at_birth IN ('Male', 'Female', 'Intersex', 'Prefer not to say')),
  sexual_orientation TEXT,
  marital_status TEXT CHECK (marital_status IN ('Single', 'Married', 'Divorced', 'Widowed', 'Separated', 'Domestic Partnership', 'Other')),
  race TEXT[],
  ethnicity TEXT CHECK (ethnicity IN ('Hispanic or Latino', 'Not Hispanic or Latino', 'Prefer not to say')),
  
  -- Language
  primary_language TEXT DEFAULT 'English',
  other_languages_spoken TEXT[],
  needs_interpreter BOOLEAN DEFAULT false,
  interpreter_language TEXT,
  religion TEXT,
  
  -- Social Information
  education TEXT,
  employment_status TEXT,
  occupation TEXT,
  employer TEXT,
  living_arrangement TEXT,
  housing_status TEXT,
  
  -- Veteran Status
  is_veteran BOOLEAN DEFAULT false,
  military_branch TEXT,
  military_discharge_type TEXT,
  
  -- Legal Information
  legal_status TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_relationship TEXT,
  
  -- Guarantor (stored as JSONB for flexibility)
  guarantor JSONB,
  
  -- Medical Providers (stored as JSONB)
  primary_care_provider JSONB,
  referring_provider JSONB,
  preferred_pharmacy JSONB,
  
  -- Account Information
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Discharged', 'Deceased')),
  status_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  discharge_date TIMESTAMP WITH TIME ZONE,
  discharge_reason TEXT,
  deceased_date DATE,
  
  -- Assignment Information
  primary_therapist_id UUID REFERENCES auth.users(id),
  psychiatrist_id UUID REFERENCES auth.users(id),
  case_manager_id UUID REFERENCES auth.users(id),
  
  -- Consents (stored as JSONB)
  consents JSONB DEFAULT '{"treatmentConsent": false, "hipaaAcknowledgment": false, "releaseOfInformation": false, "electronicCommunication": false, "appointmentReminders": false, "photographyConsent": false}'::jsonb,
  
  -- Special Considerations
  special_needs TEXT,
  accessibility_needs TEXT[],
  allergy_alerts TEXT[],
  
  -- Previous System Info
  previous_mrn TEXT,
  previous_system_name TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create emergency_contacts table
CREATE TABLE public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  alternate_phone TEXT,
  email TEXT,
  address TEXT,
  is_primary BOOLEAN DEFAULT false,
  okay_to_discuss_health_info BOOLEAN DEFAULT false,
  okay_to_leave_message BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients
CREATE POLICY "Administrators can manage all clients"
  ON public.clients FOR ALL
  USING (has_role(auth.uid(), 'administrator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Therapists can view assigned clients"
  ON public.clients FOR SELECT
  USING (
    primary_therapist_id = auth.uid() 
    OR psychiatrist_id = auth.uid()
    OR case_manager_id = auth.uid()
    OR has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'supervisor'::app_role)
    OR has_role(auth.uid(), 'front_desk'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  );

CREATE POLICY "Therapists can update assigned clients"
  ON public.clients FOR UPDATE
  USING (
    primary_therapist_id = auth.uid() 
    OR has_role(auth.uid(), 'administrator'::app_role)
  );

CREATE POLICY "Authorized staff can create clients"
  ON public.clients FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'front_desk'::app_role)
  );

-- RLS Policies for emergency_contacts
CREATE POLICY "Users can view emergency contacts for accessible clients"
  ON public.emergency_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND (
        clients.primary_therapist_id = auth.uid()
        OR clients.psychiatrist_id = auth.uid()
        OR clients.case_manager_id = auth.uid()
        OR has_role(auth.uid(), 'administrator'::app_role)
        OR has_role(auth.uid(), 'supervisor'::app_role)
        OR has_role(auth.uid(), 'front_desk'::app_role)
      )
    )
  );

CREATE POLICY "Authorized staff can manage emergency contacts"
  ON public.emergency_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND (
        clients.primary_therapist_id = auth.uid()
        OR has_role(auth.uid(), 'administrator'::app_role)
        OR has_role(auth.uid(), 'front_desk'::app_role)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = emergency_contacts.client_id
      AND (
        clients.primary_therapist_id = auth.uid()
        OR has_role(auth.uid(), 'administrator'::app_role)
        OR has_role(auth.uid(), 'front_desk'::app_role)
      )
    )
  );

-- Create trigger for updating updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emergency_contacts_updated_at
  BEFORE UPDATE ON public.emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_clients_mrn ON public.clients(medical_record_number);
CREATE INDEX idx_clients_last_name ON public.clients(last_name);
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_primary_therapist ON public.clients(primary_therapist_id);
CREATE INDEX idx_clients_dob ON public.clients(date_of_birth);
CREATE INDEX idx_emergency_contacts_client_id ON public.emergency_contacts(client_id);

-- Function to generate unique MRN
CREATE OR REPLACE FUNCTION public.generate_mrn()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_mrn TEXT;
  mrn_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate MRN: MH + current year + random 6 digits
    new_mrn := 'MH' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if MRN already exists
    SELECT EXISTS(SELECT 1 FROM public.clients WHERE medical_record_number = new_mrn) INTO mrn_exists;
    
    -- If MRN doesn't exist, exit loop
    IF NOT mrn_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_mrn;
END;
$$;