-- Add incident-to billing eligibility tracking to supervision_relationships
ALTER TABLE public.supervision_relationships
ADD COLUMN can_bill_incident_to BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN incident_to_start_date DATE,
ADD COLUMN incident_to_requirements_verified JSONB DEFAULT '{
  "verifiedBy": null,
  "verifiedDate": null,
  "verificationNotes": ""
}'::jsonb;

-- Add index for performance
CREATE INDEX idx_supervision_relationships_incident_to 
ON public.supervision_relationships(can_bill_incident_to, incident_to_start_date);

-- Comment on columns
COMMENT ON COLUMN public.supervision_relationships.can_bill_incident_to IS 'Indicates if supervisee is qualified to provide services under incident-to billing';
COMMENT ON COLUMN public.supervision_relationships.incident_to_start_date IS 'Date when supervisee became eligible for incident-to billing';
COMMENT ON COLUMN public.supervision_relationships.incident_to_requirements_verified IS 'JSON object tracking who verified incident-to eligibility and when';