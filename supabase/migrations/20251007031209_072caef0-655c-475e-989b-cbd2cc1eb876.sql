-- Create termination_notes table
CREATE TABLE IF NOT EXISTS termination_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  clinician_id UUID NOT NULL REFERENCES profiles(id),
  termination_date DATE NOT NULL,
  last_session_date DATE,
  total_sessions_completed INTEGER,
  termination_type TEXT NOT NULL CHECK (termination_type IN ('Successful Completion', 'Mutual Agreement', 'Client Request', 'Clinician Recommendation', 'Administrative', 'No Show/Non-compliance', 'Transfer of Care', 'Other')),
  termination_reason TEXT NOT NULL,
  treatment_summary TEXT,
  presenting_problems TEXT,
  progress_achieved TEXT,
  goals_status TEXT,
  current_functioning TEXT,
  final_assessment TEXT,
  final_diagnoses JSONB DEFAULT '[]'::jsonb,
  medications_at_termination TEXT,
  recommendations TEXT,
  referrals_provided TEXT,
  referral_contacts JSONB DEFAULT '[]'::jsonb,
  discharge_plan TEXT,
  follow_up_instructions TEXT,
  relapse_prevention_plan TEXT,
  crisis_plan TEXT,
  prognosis TEXT,
  client_strengths TEXT,
  barriers_addressed TEXT,
  outstanding_issues TEXT,
  billing_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending Signature', 'Signed', 'Locked', 'Amended')),
  signed_by UUID REFERENCES profiles(id),
  signed_date TIMESTAMP WITH TIME ZONE,
  cosigned_by UUID REFERENCES profiles(id),
  cosigned_date TIMESTAMP WITH TIME ZONE,
  locked BOOLEAN DEFAULT FALSE,
  locked_date TIMESTAMP WITH TIME ZONE,
  locked_by UUID REFERENCES profiles(id),
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_modified_by UUID REFERENCES profiles(id)
);

-- Enable RLS on termination_notes
ALTER TABLE termination_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for termination_notes
CREATE POLICY "Clinicians can view termination notes for their clients"
ON termination_notes FOR SELECT
USING (
  clinician_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = termination_notes.client_id
    AND (
      clients.primary_therapist_id = auth.uid() OR
      clients.psychiatrist_id = auth.uid() OR
      clients.case_manager_id = auth.uid() OR
      has_role(auth.uid(), 'administrator') OR
      has_role(auth.uid(), 'supervisor')
    )
  )
);

CREATE POLICY "Clinicians can create termination notes"
ON termination_notes FOR INSERT
WITH CHECK (
  clinician_id = auth.uid() OR
  has_role(auth.uid(), 'administrator')
);

CREATE POLICY "Clinicians can update unlocked termination notes"
ON termination_notes FOR UPDATE
USING (
  (clinician_id = auth.uid() OR has_role(auth.uid(), 'administrator'))
  AND locked = FALSE
)
WITH CHECK (
  (clinician_id = auth.uid() OR has_role(auth.uid(), 'administrator'))
  AND locked = FALSE
);

-- Add indexes for performance
CREATE INDEX idx_termination_notes_client ON termination_notes(client_id, termination_date DESC);
CREATE INDEX idx_termination_notes_clinician ON termination_notes(clinician_id, termination_date DESC);
CREATE INDEX idx_termination_notes_status ON termination_notes(status, locked);

-- Add indexes for portal_form_assignments (performance improvement)
CREATE INDEX IF NOT EXISTS idx_portal_form_assignments_client_status 
ON portal_form_assignments(client_id, status, due_date);

-- Add index for clinical_notes (if not exists)
CREATE INDEX IF NOT EXISTS idx_clinical_notes_type_client 
ON clinical_notes(note_type, client_id, date_of_service DESC);