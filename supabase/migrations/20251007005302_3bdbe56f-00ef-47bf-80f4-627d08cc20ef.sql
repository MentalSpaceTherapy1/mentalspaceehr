-- Create portal_form_templates table
CREATE TABLE IF NOT EXISTS portal_form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type text NOT NULL CHECK (form_type IN ('Intake', 'Consent', 'Assessment', 'Insurance Update', 'Feedback', 'Custom')),
  title text NOT NULL,
  description text,
  version integer NOT NULL DEFAULT 1,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  requires_signature boolean NOT NULL DEFAULT false,
  allow_partial_save boolean NOT NULL DEFAULT true,
  estimated_minutes integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create portal_form_assignments table
CREATE TABLE IF NOT EXISTS portal_form_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES portal_form_templates(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES auth.users(id),
  assigned_date timestamp with time zone NOT NULL DEFAULT now(),
  due_date timestamp with time zone,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  instructions text,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'started', 'completed', 'expired', 'cancelled')),
  status_updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  time_spent_seconds integer,
  saved_to_chart boolean NOT NULL DEFAULT false,
  chart_note_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create portal_form_responses table
CREATE TABLE IF NOT EXISTS portal_form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES portal_form_assignments(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  progress_percentage integer NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  started_at timestamp with time zone,
  last_saved_at timestamp with time zone,
  completed_at timestamp with time zone,
  client_signature text,
  signature_date timestamp with time zone,
  signature_ip text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  review_notes text,
  flagged_for_followup boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE portal_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_form_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_form_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Staff can manage form templates" ON portal_form_templates;
DROP POLICY IF EXISTS "All authenticated users can view active templates" ON portal_form_templates;
DROP POLICY IF EXISTS "Staff can manage form assignments" ON portal_form_assignments;
DROP POLICY IF EXISTS "Clients can view their assigned forms" ON portal_form_assignments;
DROP POLICY IF EXISTS "Clients can update their assignment status" ON portal_form_assignments;
DROP POLICY IF EXISTS "Staff can view all responses" ON portal_form_responses;
DROP POLICY IF EXISTS "Clients can manage their own responses" ON portal_form_responses;
DROP POLICY IF EXISTS "Staff can review responses" ON portal_form_responses;

-- RLS Policies for portal_form_templates
CREATE POLICY "Staff can manage form templates"
ON portal_form_templates
FOR ALL
USING (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'supervisor'))
WITH CHECK (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'supervisor'));

CREATE POLICY "All authenticated users can view active templates"
ON portal_form_templates
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- RLS Policies for portal_form_assignments
CREATE POLICY "Staff can manage form assignments"
ON portal_form_assignments
FOR ALL
USING (
  has_role(auth.uid(), 'administrator') 
  OR has_role(auth.uid(), 'front_desk')
  OR EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = portal_form_assignments.client_id
    AND (clients.primary_therapist_id = auth.uid() OR clients.psychiatrist_id = auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'administrator') 
  OR has_role(auth.uid(), 'front_desk')
  OR EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = portal_form_assignments.client_id
    AND (clients.primary_therapist_id = auth.uid() OR clients.psychiatrist_id = auth.uid())
  )
);

CREATE POLICY "Clients can view their assigned forms"
ON portal_form_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = portal_form_assignments.client_id
  )
);

CREATE POLICY "Clients can update their assignment status"
ON portal_form_assignments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = portal_form_assignments.client_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = portal_form_assignments.client_id
  )
);

-- RLS Policies for portal_form_responses
CREATE POLICY "Staff can view all responses"
ON portal_form_responses
FOR SELECT
USING (
  has_role(auth.uid(), 'administrator')
  OR has_role(auth.uid(), 'supervisor')
  OR EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = portal_form_responses.client_id
    AND (clients.primary_therapist_id = auth.uid() OR clients.psychiatrist_id = auth.uid())
  )
);

CREATE POLICY "Clients can manage their own responses"
ON portal_form_responses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = portal_form_responses.client_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = portal_form_responses.client_id
  )
);

CREATE POLICY "Staff can review responses"
ON portal_form_responses
FOR UPDATE
USING (
  has_role(auth.uid(), 'administrator')
  OR has_role(auth.uid(), 'supervisor')
  OR EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = portal_form_responses.client_id
    AND (clients.primary_therapist_id = auth.uid() OR clients.psychiatrist_id = auth.uid())
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_form_assignments_client ON portal_form_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_form_assignments_status ON portal_form_assignments(status);
CREATE INDEX IF NOT EXISTS idx_form_assignments_due_date ON portal_form_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_form_responses_assignment ON portal_form_responses(assignment_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_client ON portal_form_responses(client_id);

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_portal_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate triggers
DROP TRIGGER IF EXISTS update_form_templates_updated_at ON portal_form_templates;
CREATE TRIGGER update_form_templates_updated_at
  BEFORE UPDATE ON portal_form_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_portal_forms_updated_at();

DROP TRIGGER IF EXISTS update_form_assignments_updated_at ON portal_form_assignments;
CREATE TRIGGER update_form_assignments_updated_at
  BEFORE UPDATE ON portal_form_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_portal_forms_updated_at();

DROP TRIGGER IF EXISTS update_form_responses_updated_at ON portal_form_responses;
CREATE TRIGGER update_form_responses_updated_at
  BEFORE UPDATE ON portal_form_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_portal_forms_updated_at();