-- Create telehealth_consents table
CREATE TABLE public.telehealth_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) NOT NULL,
  
  -- Consent Understanding Elements
  understood_limitations BOOLEAN DEFAULT false,
  understood_risks BOOLEAN DEFAULT false,
  understood_benefits BOOLEAN DEFAULT false,
  understood_alternatives BOOLEAN DEFAULT false,
  risks_acknowledged JSONB DEFAULT '[]'::jsonb,
  
  -- Emergency Procedures
  emergency_protocol_understood BOOLEAN DEFAULT false,
  emergency_contact_provided BOOLEAN DEFAULT false,
  emergency_contact JSONB,
  current_physical_location TEXT,
  local_emergency_number TEXT,
  
  -- Privacy & Security
  privacy_policy_reviewed BOOLEAN DEFAULT false,
  secure_platform_understood BOOLEAN DEFAULT false,
  confidentiality_limits_understood BOOLEAN DEFAULT false,
  
  -- State Licensure
  client_state_of_residence TEXT,
  clinician_licensed_in_state BOOLEAN DEFAULT false,
  clinician_id UUID REFERENCES profiles(id),
  
  -- Technical Requirements
  technical_requirements_understood BOOLEAN DEFAULT false,
  adequate_connection_confirmed BOOLEAN DEFAULT false,
  private_location_confirmed BOOLEAN DEFAULT false,
  
  -- Recording
  understands_recording_policy BOOLEAN DEFAULT false,
  consents_to_recording BOOLEAN DEFAULT false,
  
  -- Consent Status
  consent_given BOOLEAN DEFAULT false,
  consent_date TIMESTAMP,
  client_signature TEXT,
  
  -- Revocation
  can_revoke_consent BOOLEAN DEFAULT true,
  consent_revoked BOOLEAN DEFAULT false,
  revocation_date TIMESTAMP,
  revocation_reason TEXT,
  
  -- Renewal
  expiration_date DATE,
  renewal_notified BOOLEAN DEFAULT false,
  renewal_notification_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_telehealth_consents_client ON telehealth_consents(client_id);
CREATE INDEX idx_telehealth_consents_expiration ON telehealth_consents(expiration_date);
CREATE INDEX idx_telehealth_consents_active ON telehealth_consents(client_id, consent_given, consent_revoked);

-- RLS Policies
ALTER TABLE public.telehealth_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinicians can view consents for their clients"
  ON public.telehealth_consents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = telehealth_consents.client_id
      AND (
        clients.primary_therapist_id = auth.uid()
        OR clients.psychiatrist_id = auth.uid()
        OR clients.case_manager_id = auth.uid()
        OR has_role(auth.uid(), 'administrator'::app_role)
        OR has_role(auth.uid(), 'supervisor'::app_role)
      )
    )
  );

CREATE POLICY "Authorized staff can manage telehealth consents"
  ON public.telehealth_consents
  FOR ALL
  USING (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'front_desk'::app_role)
    OR EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = telehealth_consents.client_id
      AND (
        clients.primary_therapist_id = auth.uid()
        OR clients.psychiatrist_id = auth.uid()
      )
    )
  );

-- Add consent tracking to telehealth_sessions
ALTER TABLE public.telehealth_sessions
ADD COLUMN consent_id UUID REFERENCES telehealth_consents(id),
ADD COLUMN consent_verified BOOLEAN DEFAULT false,
ADD COLUMN consent_verification_date TIMESTAMP;

-- Add licensed_states to profiles for state licensure validation
ALTER TABLE public.profiles
ADD COLUMN licensed_states TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create licensure validation function
CREATE OR REPLACE FUNCTION validate_telehealth_licensure(
  _client_id UUID,
  _clinician_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM clients c
    JOIN profiles p ON p.id = _clinician_id
    WHERE c.id = _client_id
    AND c.state = ANY(p.licensed_states)
  );
END;
$$;

-- Create storage bucket for consent PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('telehealth-consents', 'telehealth-consents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for consent documents
CREATE POLICY "Authorized staff can view consent documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'telehealth-consents'
    AND (
      has_role(auth.uid(), 'administrator'::app_role)
      OR has_role(auth.uid(), 'supervisor'::app_role)
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Authorized staff can upload consent documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'telehealth-consents'
    AND (
      has_role(auth.uid(), 'administrator'::app_role)
      OR has_role(auth.uid(), 'front_desk'::app_role)
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );