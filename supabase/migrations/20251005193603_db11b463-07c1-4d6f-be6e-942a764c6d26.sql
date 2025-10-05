-- Create portal form templates table
CREATE TABLE IF NOT EXISTS public.portal_form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type TEXT NOT NULL CHECK (form_type IN ('Intake', 'Consent', 'Assessment', 'Insurance Update', 'Feedback', 'Custom')),
  title TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Form structure stored as JSONB
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_signature BOOLEAN NOT NULL DEFAULT false,
  allow_partial_save BOOLEAN NOT NULL DEFAULT true,
  estimated_minutes INTEGER,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_sections CHECK (jsonb_typeof(sections) = 'array')
);

-- Create portal form assignments table
CREATE TABLE IF NOT EXISTS public.portal_form_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.portal_form_templates(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Assignment details
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  instructions TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'started', 'completed', 'expired', 'cancelled')),
  status_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Completion
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER,
  
  -- Integration
  saved_to_chart BOOLEAN NOT NULL DEFAULT false,
  chart_note_id UUID REFERENCES public.clinical_notes(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create portal form responses table
CREATE TABLE IF NOT EXISTS public.portal_form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.portal_form_assignments(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Response data stored as JSONB
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Progress tracking
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  started_at TIMESTAMP WITH TIME ZONE,
  last_saved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Signature
  client_signature TEXT,
  signature_date TIMESTAMP WITH TIME ZONE,
  signature_ip TEXT,
  
  -- Review
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  flagged_for_followup BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT one_response_per_assignment UNIQUE (assignment_id)
);

-- Create indexes for performance
CREATE INDEX idx_form_templates_active ON public.portal_form_templates(is_active, form_type);
CREATE INDEX idx_form_assignments_client ON public.portal_form_assignments(client_id, status);
CREATE INDEX idx_form_assignments_status ON public.portal_form_assignments(status, due_date);
CREATE INDEX idx_form_responses_assignment ON public.portal_form_responses(assignment_id);
CREATE INDEX idx_form_responses_client ON public.portal_form_responses(client_id);

-- Enable RLS
ALTER TABLE public.portal_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_form_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_form_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portal_form_templates
CREATE POLICY "Staff can view active templates"
  ON public.portal_form_templates
  FOR SELECT
  USING (
    is_active = true AND (
      has_role(auth.uid(), 'administrator') OR
      has_role(auth.uid(), 'supervisor') OR
      has_role(auth.uid(), 'therapist') OR
      has_role(auth.uid(), 'front_desk')
    )
  );

CREATE POLICY "Administrators can manage templates"
  ON public.portal_form_templates
  FOR ALL
  USING (has_role(auth.uid(), 'administrator'))
  WITH CHECK (has_role(auth.uid(), 'administrator'));

-- RLS Policies for portal_form_assignments
CREATE POLICY "Clients can view their own assignments"
  ON public.portal_form_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = portal_form_assignments.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view client assignments"
  ON public.portal_form_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = portal_form_assignments.client_id
      AND (
        clients.primary_therapist_id = auth.uid() OR
        clients.psychiatrist_id = auth.uid() OR
        clients.case_manager_id = auth.uid() OR
        has_role(auth.uid(), 'administrator') OR
        has_role(auth.uid(), 'supervisor') OR
        has_role(auth.uid(), 'front_desk')
      )
    )
  );

CREATE POLICY "Staff can create assignments"
  ON public.portal_form_assignments
  FOR INSERT
  WITH CHECK (
    assigned_by = auth.uid() AND (
      has_role(auth.uid(), 'administrator') OR
      has_role(auth.uid(), 'supervisor') OR
      has_role(auth.uid(), 'therapist') OR
      has_role(auth.uid(), 'front_desk')
    )
  );

CREATE POLICY "Staff can update assignments"
  ON public.portal_form_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = portal_form_assignments.client_id
      AND (
        clients.primary_therapist_id = auth.uid() OR
        has_role(auth.uid(), 'administrator') OR
        has_role(auth.uid(), 'supervisor')
      )
    )
  );

-- RLS Policies for portal_form_responses
CREATE POLICY "Clients can view their own responses"
  ON public.portal_form_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = portal_form_responses.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create their own responses"
  ON public.portal_form_responses
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients
      WHERE portal_user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update their own incomplete responses"
  ON public.portal_form_responses
  FOR UPDATE
  USING (
    completed_at IS NULL AND
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = portal_form_responses.client_id
      AND clients.portal_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view client responses"
  ON public.portal_form_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = portal_form_responses.client_id
      AND (
        clients.primary_therapist_id = auth.uid() OR
        clients.psychiatrist_id = auth.uid() OR
        clients.case_manager_id = auth.uid() OR
        has_role(auth.uid(), 'administrator') OR
        has_role(auth.uid(), 'supervisor')
      )
    )
  );

CREATE POLICY "Staff can review responses"
  ON public.portal_form_responses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = portal_form_responses.client_id
      AND (
        clients.primary_therapist_id = auth.uid() OR
        has_role(auth.uid(), 'administrator') OR
        has_role(auth.uid(), 'supervisor')
      )
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portal_form_templates_updated_at
  BEFORE UPDATE ON public.portal_form_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portal_form_assignments_updated_at
  BEFORE UPDATE ON public.portal_form_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portal_form_responses_updated_at
  BEFORE UPDATE ON public.portal_form_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some default form templates
INSERT INTO public.portal_form_templates (form_type, title, description, requires_signature, sections) VALUES
(
  'Consent',
  'Telehealth Consent Form',
  'Consent for receiving mental health services via telehealth',
  true,
  '[
    {
      "id": "section-1",
      "title": "Understanding Telehealth",
      "order": 1,
      "description": "Please review the following information about telehealth services",
      "fields": [
        {
          "id": "field-1",
          "label": "I understand that telehealth services are delivered via secure video conferencing",
          "type": "checkbox",
          "required": true,
          "order": 1
        },
        {
          "id": "field-2",
          "label": "I understand the potential risks and benefits of telehealth",
          "type": "checkbox",
          "required": true,
          "order": 2
        }
      ]
    },
    {
      "id": "section-2",
      "title": "Emergency Procedures",
      "order": 2,
      "fields": [
        {
          "id": "field-3",
          "label": "I understand that in case of emergency, I should call 911 or go to the nearest emergency room",
          "type": "checkbox",
          "required": true,
          "order": 1
        },
        {
          "id": "field-4",
          "label": "Current physical location during sessions",
          "type": "text",
          "required": true,
          "order": 2,
          "validation": {
            "minLength": 5
          }
        }
      ]
    }
  ]'::jsonb
),
(
  'Assessment',
  'PHQ-9 Depression Screening',
  'Patient Health Questionnaire for depression assessment',
  false,
  '[
    {
      "id": "section-1",
      "title": "Over the last 2 weeks, how often have you been bothered by the following problems?",
      "order": 1,
      "fields": [
        {
          "id": "field-1",
          "label": "Little interest or pleasure in doing things",
          "type": "radio",
          "required": true,
          "order": 1,
          "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"]
        },
        {
          "id": "field-2",
          "label": "Feeling down, depressed, or hopeless",
          "type": "radio",
          "required": true,
          "order": 2,
          "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"]
        },
        {
          "id": "field-3",
          "label": "Trouble falling or staying asleep, or sleeping too much",
          "type": "radio",
          "required": true,
          "order": 3,
          "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"]
        }
      ]
    }
  ]'::jsonb
),
(
  'Intake',
  'New Client Intake Form',
  'Comprehensive intake questionnaire for new clients',
  true,
  '[
    {
      "id": "section-1",
      "title": "Personal Information",
      "order": 1,
      "fields": [
        {
          "id": "field-1",
          "label": "Preferred Name",
          "type": "text",
          "required": true,
          "order": 1
        },
        {
          "id": "field-2",
          "label": "Primary concerns bringing you to therapy",
          "type": "textarea",
          "required": true,
          "order": 2
        }
      ]
    },
    {
      "id": "section-2",
      "title": "Emergency Contact",
      "order": 2,
      "fields": [
        {
          "id": "field-3",
          "label": "Emergency contact name",
          "type": "text",
          "required": true,
          "order": 1
        },
        {
          "id": "field-4",
          "label": "Emergency contact phone",
          "type": "text",
          "required": true,
          "order": 2
        }
      ]
    }
  ]'::jsonb
);