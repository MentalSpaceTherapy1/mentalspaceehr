-- Create incident_to_billing table for comprehensive incident-to billing documentation
CREATE TABLE public.incident_to_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  session_id UUID REFERENCES public.telehealth_sessions(id) ON DELETE SET NULL,
  note_id UUID NOT NULL REFERENCES public.clinical_notes(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Provider Relationships
  supervising_provider_id UUID NOT NULL, -- the licensed provider (references profiles)
  rendering_provider_id UUID NOT NULL, -- the associate/supervisee (references profiles)
  
  -- Requirements Checklist (5 requirements must be met)
  requirements_met JSONB NOT NULL DEFAULT '{
    "initialServiceByProvider": false,
    "establishedPlanOfCare": false,
    "providerAvailableForSupervision": false,
    "clientEstablished": false,
    "superviseeQualified": false
  }'::jsonb,
  
  -- Provider Attestation (structured attestation data)
  provider_attestation JSONB NOT NULL DEFAULT '{
    "wasAvailableForSupervision": false,
    "locationOfProvider": "",
    "establishedTreatmentPlan": false,
    "serviceProvidedPerPlan": false,
    "attested": false,
    "attestationDate": null,
    "attestationSignature": ""
  }'::jsonb,
  
  -- Billing Information
  billed_under_provider_id UUID NOT NULL, -- should match supervising_provider_id
  billing_compliant BOOLEAN NOT NULL DEFAULT false,
  compliance_check_date TIMESTAMP WITH TIME ZONE,
  
  -- Documentation
  documentation_complete BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  
  -- Ensure billing is under the supervising provider
  CONSTRAINT billed_under_matches_supervisor CHECK (billed_under_provider_id = supervising_provider_id)
);

-- Enable RLS
ALTER TABLE public.incident_to_billing ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Administrators can manage all incident-to records
CREATE POLICY "Administrators can manage incident-to billing"
ON public.incident_to_billing
FOR ALL
USING (has_role(auth.uid(), 'administrator'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

-- Supervisors can manage their own incident-to records
CREATE POLICY "Supervisors can manage their incident-to records"
ON public.incident_to_billing
FOR ALL
USING (
  supervising_provider_id = auth.uid() 
  OR has_role(auth.uid(), 'supervisor'::app_role)
)
WITH CHECK (
  supervising_provider_id = auth.uid()
  OR has_role(auth.uid(), 'supervisor'::app_role)
);

-- Supervisees can view their incident-to records
CREATE POLICY "Supervisees can view their incident-to records"
ON public.incident_to_billing
FOR SELECT
USING (rendering_provider_id = auth.uid());

-- Billing staff can view all incident-to records
CREATE POLICY "Billing staff can view incident-to records"
ON public.incident_to_billing
FOR SELECT
USING (has_role(auth.uid(), 'billing_staff'::app_role));

-- Performance Indexes
CREATE INDEX idx_incident_to_billing_note_id ON public.incident_to_billing(note_id);
CREATE INDEX idx_incident_to_billing_client_id ON public.incident_to_billing(client_id);
CREATE INDEX idx_incident_to_billing_supervising_provider ON public.incident_to_billing(supervising_provider_id);
CREATE INDEX idx_incident_to_billing_rendering_provider ON public.incident_to_billing(rendering_provider_id);
CREATE INDEX idx_incident_to_billing_compliance ON public.incident_to_billing(billing_compliant, compliance_check_date);
CREATE INDEX idx_incident_to_billing_created_at ON public.incident_to_billing(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_incident_to_billing_updated_at
BEFORE UPDATE ON public.incident_to_billing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comment on table
COMMENT ON TABLE public.incident_to_billing IS 'Tracks incident-to billing documentation with comprehensive compliance requirements and provider attestations';