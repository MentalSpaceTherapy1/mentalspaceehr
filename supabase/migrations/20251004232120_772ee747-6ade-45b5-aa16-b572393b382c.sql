-- Create tables for additional note types

-- Cancellation Notes
CREATE TABLE IF NOT EXISTS cancellation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  clinician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  
  cancellation_date DATE NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL,
  
  cancelled_by TEXT NOT NULL CHECK (cancelled_by IN ('Client', 'Clinician', 'Practice')),
  notice_given TEXT NOT NULL CHECK (notice_given IN ('More than 24 hours', 'Less than 24 hours', 'Same Day', 'No Show')),
  
  cancellation_reason TEXT NOT NULL,
  reason_details TEXT,
  
  fee_assessed BOOLEAN DEFAULT false,
  fee_amount NUMERIC(10,2),
  fee_waived BOOLEAN DEFAULT false,
  waiver_reason TEXT,
  
  clinical_concerns BOOLEAN DEFAULT false,
  concern_details TEXT,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_plan TEXT,
  
  rescheduled BOOLEAN DEFAULT false,
  new_appointment_date DATE,
  
  client_contacted BOOLEAN DEFAULT false,
  contact_method TEXT,
  contact_date DATE,
  contact_outcome TEXT,
  
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Signed', 'Locked')),
  signed_date TIMESTAMP WITH TIME ZONE,
  signed_by UUID REFERENCES auth.users(id),
  
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact Notes
CREATE TABLE IF NOT EXISTS contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  clinician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  contact_date DATE NOT NULL,
  contact_time TEXT NOT NULL,
  contact_duration INTEGER, -- minutes
  
  contact_type TEXT NOT NULL,
  contact_initiated_by TEXT NOT NULL,
  contact_purpose TEXT NOT NULL,
  
  contact_details TEXT NOT NULL,
  
  clinical_significance BOOLEAN DEFAULT false,
  risk_issues BOOLEAN DEFAULT false,
  risk_details TEXT,
  intervention_provided TEXT,
  
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_plan TEXT,
  
  collateral_contact JSONB DEFAULT '{"wasCollateral": false, "releaseOnFile": false}',
  
  billable BOOLEAN DEFAULT false,
  billing_code TEXT,
  
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Signed', 'Locked')),
  signed_date TIMESTAMP WITH TIME ZONE,
  signed_by UUID REFERENCES auth.users(id),
  
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consultation Notes
CREATE TABLE IF NOT EXISTS consultation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  clinician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  consultation_date DATE NOT NULL,
  consultation_type TEXT NOT NULL,
  
  consulting_with JSONB NOT NULL,
  
  consultation_reason TEXT NOT NULL,
  clinical_question TEXT NOT NULL,
  
  information_provided TEXT,
  information_received TEXT,
  
  recommendations TEXT,
  
  changes_to_treatment BOOLEAN DEFAULT false,
  treatment_changes TEXT,
  
  client_consent BOOLEAN DEFAULT false,
  
  follow_up_consultation BOOLEAN DEFAULT false,
  follow_up_plan TEXT,
  
  billable BOOLEAN DEFAULT false,
  billing_code TEXT,
  
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Signed', 'Locked')),
  signed_date TIMESTAMP WITH TIME ZONE,
  signed_by UUID REFERENCES auth.users(id),
  
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Miscellaneous Notes
CREATE TABLE IF NOT EXISTS miscellaneous_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  clinician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  note_date DATE NOT NULL,
  note_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  
  note_content TEXT NOT NULL,
  
  tags TEXT[],
  
  clinically_relevant BOOLEAN DEFAULT false,
  
  billable BOOLEAN DEFAULT false,
  billing_code TEXT,
  
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Signed', 'Locked')),
  signed_date TIMESTAMP WITH TIME ZONE,
  signed_by UUID REFERENCES auth.users(id),
  
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cancellation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE miscellaneous_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cancellation_notes
CREATE POLICY "Users can view cancellation notes for accessible clients"
  ON cancellation_notes FOR SELECT
  USING (
    clinician_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = cancellation_notes.client_id
      AND (
        clients.primary_therapist_id = auth.uid() OR
        clients.psychiatrist_id = auth.uid() OR
        clients.case_manager_id = auth.uid() OR
        has_role(auth.uid(), 'administrator'::app_role) OR
        has_role(auth.uid(), 'supervisor'::app_role)
      )
    )
  );

CREATE POLICY "Clinicians can create cancellation notes"
  ON cancellation_notes FOR INSERT
  WITH CHECK (clinician_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Clinicians can update their own cancellation notes"
  ON cancellation_notes FOR UPDATE
  USING (clinician_id = auth.uid() AND status != 'Locked')
  WITH CHECK (clinician_id = auth.uid() AND status != 'Locked');

-- RLS Policies for contact_notes
CREATE POLICY "Users can view contact notes for accessible clients"
  ON contact_notes FOR SELECT
  USING (
    clinician_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = contact_notes.client_id
      AND (
        clients.primary_therapist_id = auth.uid() OR
        clients.psychiatrist_id = auth.uid() OR
        clients.case_manager_id = auth.uid() OR
        has_role(auth.uid(), 'administrator'::app_role) OR
        has_role(auth.uid(), 'supervisor'::app_role)
      )
    )
  );

CREATE POLICY "Clinicians can create contact notes"
  ON contact_notes FOR INSERT
  WITH CHECK (clinician_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Clinicians can update their own contact notes"
  ON contact_notes FOR UPDATE
  USING (clinician_id = auth.uid() AND status != 'Locked')
  WITH CHECK (clinician_id = auth.uid() AND status != 'Locked');

-- RLS Policies for consultation_notes
CREATE POLICY "Users can view consultation notes for accessible clients"
  ON consultation_notes FOR SELECT
  USING (
    clinician_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = consultation_notes.client_id
      AND (
        clients.primary_therapist_id = auth.uid() OR
        clients.psychiatrist_id = auth.uid() OR
        clients.case_manager_id = auth.uid() OR
        has_role(auth.uid(), 'administrator'::app_role) OR
        has_role(auth.uid(), 'supervisor'::app_role)
      )
    )
  );

CREATE POLICY "Clinicians can create consultation notes"
  ON consultation_notes FOR INSERT
  WITH CHECK (clinician_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Clinicians can update their own consultation notes"
  ON consultation_notes FOR UPDATE
  USING (clinician_id = auth.uid() AND status != 'Locked')
  WITH CHECK (clinician_id = auth.uid() AND status != 'Locked');

-- RLS Policies for miscellaneous_notes
CREATE POLICY "Users can view miscellaneous notes for accessible clients"
  ON miscellaneous_notes FOR SELECT
  USING (
    clinician_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = miscellaneous_notes.client_id
      AND (
        clients.primary_therapist_id = auth.uid() OR
        clients.psychiatrist_id = auth.uid() OR
        clients.case_manager_id = auth.uid() OR
        has_role(auth.uid(), 'administrator'::app_role) OR
        has_role(auth.uid(), 'supervisor'::app_role)
      )
    )
  );

CREATE POLICY "Clinicians can create miscellaneous notes"
  ON miscellaneous_notes FOR INSERT
  WITH CHECK (clinician_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Clinicians can update their own miscellaneous notes"
  ON miscellaneous_notes FOR UPDATE
  USING (clinician_id = auth.uid() AND status != 'Locked')
  WITH CHECK (clinician_id = auth.uid() AND status != 'Locked');

-- Create indexes for performance
CREATE INDEX idx_cancellation_notes_client ON cancellation_notes(client_id);
CREATE INDEX idx_cancellation_notes_clinician ON cancellation_notes(clinician_id);
CREATE INDEX idx_cancellation_notes_status ON cancellation_notes(status);

CREATE INDEX idx_contact_notes_client ON contact_notes(client_id);
CREATE INDEX idx_contact_notes_clinician ON contact_notes(clinician_id);
CREATE INDEX idx_contact_notes_status ON contact_notes(status);

CREATE INDEX idx_consultation_notes_client ON consultation_notes(client_id);
CREATE INDEX idx_consultation_notes_clinician ON consultation_notes(clinician_id);
CREATE INDEX idx_consultation_notes_status ON consultation_notes(status);

CREATE INDEX idx_miscellaneous_notes_client ON miscellaneous_notes(client_id);
CREATE INDEX idx_miscellaneous_notes_clinician ON miscellaneous_notes(clinician_id);
CREATE INDEX idx_miscellaneous_notes_status ON miscellaneous_notes(status);