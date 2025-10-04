-- Create treatment_plans table
CREATE TABLE public.treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  clinician_id UUID NOT NULL,
  
  -- Plan Information
  plan_date DATE NOT NULL,
  effective_date DATE NOT NULL,
  review_date DATE NOT NULL,
  next_review_date DATE,
  
  -- Diagnoses stored as JSONB array
  diagnoses JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Problems stored as JSONB array
  problems JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Goals and objectives stored as JSONB array
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Treatment Modalities
  treatment_modalities JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Psychoeducation
  psychoeducation_topics TEXT[],
  
  -- Medication Plan
  medication_plan JSONB,
  
  -- Discharge Criteria
  discharge_criteria TEXT[],
  anticipated_discharge_date DATE,
  
  -- Barriers
  barriers_identified BOOLEAN DEFAULT false,
  barriers TEXT[],
  plan_to_address_barriers TEXT,
  
  -- Strengths and Resources
  client_strengths TEXT[],
  support_systems TEXT[],
  community_resources TEXT[],
  
  -- Progress Summary
  progress_summary TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Under Review', 'Updated', 'Completed', 'Inactive')),
  
  -- Signatures
  signed_date TIMESTAMP WITH TIME ZONE,
  signed_by UUID,
  digital_signature TEXT,
  
  client_agreement BOOLEAN DEFAULT false,
  client_signature_date TIMESTAMP WITH TIME ZONE,
  client_signature TEXT,
  
  -- Supervision
  requires_supervisor_cosign BOOLEAN DEFAULT false,
  supervisor_cosigned BOOLEAN DEFAULT false,
  supervisor_cosign_date TIMESTAMP WITH TIME ZONE,
  supervisor_id UUID,
  supervisor_signature TEXT,
  
  -- Metadata
  created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_modified TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_modified_by UUID,
  version_number INTEGER NOT NULL DEFAULT 1,
  previous_version_id UUID,
  
  CONSTRAINT fk_previous_version FOREIGN KEY (previous_version_id) REFERENCES public.treatment_plans(id)
);

-- Enable RLS
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Clinicians can view treatment plans for their clients"
ON public.treatment_plans
FOR SELECT
USING (
  clinician_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = treatment_plans.client_id
    AND (
      clients.primary_therapist_id = auth.uid() OR
      clients.psychiatrist_id = auth.uid() OR
      clients.case_manager_id = auth.uid()
    )
  ) OR
  has_role(auth.uid(), 'administrator'::app_role) OR
  has_role(auth.uid(), 'supervisor'::app_role) OR
  has_role(auth.uid(), 'front_desk'::app_role)
);

CREATE POLICY "Clinicians can create treatment plans"
ON public.treatment_plans
FOR INSERT
WITH CHECK (
  clinician_id = auth.uid() OR
  has_role(auth.uid(), 'administrator'::app_role)
);

CREATE POLICY "Clinicians can update their own treatment plans"
ON public.treatment_plans
FOR UPDATE
USING (
  clinician_id = auth.uid() OR
  has_role(auth.uid(), 'administrator'::app_role)
);

-- Create index for faster queries
CREATE INDEX idx_treatment_plans_client_id ON public.treatment_plans(client_id);
CREATE INDEX idx_treatment_plans_clinician_id ON public.treatment_plans(clinician_id);
CREATE INDEX idx_treatment_plans_status ON public.treatment_plans(status);

-- Create trigger for updating last_modified
CREATE TRIGGER update_treatment_plans_last_modified
BEFORE UPDATE ON public.treatment_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_last_modified_column();