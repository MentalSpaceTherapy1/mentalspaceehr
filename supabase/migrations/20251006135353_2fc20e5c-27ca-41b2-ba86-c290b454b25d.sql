-- Phase 10: Document Management & Advanced Features
-- Part 1: Document Library Categories

CREATE TABLE IF NOT EXISTS public.document_library_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES public.document_library_categories(id) ON DELETE CASCADE,
  icon TEXT,
  color TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Part 2: Document Library (Practice-wide templates)

CREATE TABLE IF NOT EXISTS public.document_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.document_library_categories(id) ON DELETE SET NULL,
  subcategory TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type TEXT,
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES public.document_library (id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  requires_signature BOOLEAN DEFAULT false,
  auto_assign_on_intake BOOLEAN DEFAULT false,
  target_client_types TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Part 3: Clinical Assessments (Standardized tools)

CREATE TABLE IF NOT EXISTS public.clinical_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_name TEXT NOT NULL,
  acronym TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- Depression, Anxiety, PTSD, Substance Use, etc.
  version TEXT DEFAULT '1.0',
  scoring_algorithm JSONB NOT NULL, -- Complete item definitions, scoring logic, interpretation
  total_items INTEGER NOT NULL,
  estimated_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT false, -- Distinguishes custom vs. pre-built
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(acronym, version)
);

-- Part 4: Assessment Administrations (Individual instances)

CREATE TABLE IF NOT EXISTS public.assessment_administrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.clinical_assessments(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  administered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  administration_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responses JSONB NOT NULL, -- Array of {item_id, response}
  raw_score NUMERIC,
  interpreted_severity TEXT, -- e.g., "Moderate Depression"
  interpretation_notes TEXT,
  clinical_recommendations TEXT,
  time_taken_seconds INTEGER,
  completion_status TEXT DEFAULT 'completed', -- completed, partial, abandoned
  administered_via TEXT DEFAULT 'In-Session', -- In-Session, Portal, Paper
  added_to_chart BOOLEAN DEFAULT false,
  chart_note_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Part 5: Assessment Score History (For trending)

CREATE TABLE IF NOT EXISTS public.assessment_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.clinical_assessments(id) ON DELETE CASCADE,
  administration_id UUID NOT NULL REFERENCES public.assessment_administrations(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  severity_level TEXT,
  administration_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Part 6: Custom Assessments (Practice-specific tools)

CREATE TABLE IF NOT EXISTS public.custom_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  items JSONB NOT NULL, -- Array of {id, text, response_type, points}
  scoring_rules JSONB NOT NULL,
  interpretation_ranges JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  practice_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Part 7: Create storage bucket for document library

INSERT INTO storage.buckets (id, name, public)
VALUES ('document-library', 'document-library', false)
ON CONFLICT (id) DO NOTHING;

-- Part 8: Indexes for performance

CREATE INDEX IF NOT EXISTS idx_document_library_category ON public.document_library(category_id);
CREATE INDEX IF NOT EXISTS idx_document_library_tags ON public.document_library USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_document_library_active ON public.document_library(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_assessment_administrations_client ON public.assessment_administrations(client_id);
CREATE INDEX IF NOT EXISTS idx_assessment_administrations_date ON public.assessment_administrations(administration_date DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_score_history_client ON public.assessment_score_history(client_id, assessment_id, administration_date DESC);

-- Part 9: RLS Policies

-- Document Library Categories
ALTER TABLE public.document_library_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view categories"
ON public.document_library_categories FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage categories"
ON public.document_library_categories FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrator'))
WITH CHECK (has_role(auth.uid(), 'administrator'));

-- Document Library
ALTER TABLE public.document_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view library documents"
ON public.document_library FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can manage library documents"
ON public.document_library FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrator'))
WITH CHECK (has_role(auth.uid(), 'administrator'));

-- Clinical Assessments
ALTER TABLE public.clinical_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view assessments"
ON public.clinical_assessments FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can manage assessments"
ON public.clinical_assessments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrator'))
WITH CHECK (has_role(auth.uid(), 'administrator'));

-- Assessment Administrations
ALTER TABLE public.assessment_administrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinicians can view their administrations"
ON public.assessment_administrations FOR SELECT
TO authenticated
USING (
  administered_by = auth.uid() OR
  has_role(auth.uid(), 'administrator') OR
  has_role(auth.uid(), 'supervisor') OR
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = assessment_administrations.client_id
    AND (
      clients.primary_therapist_id = auth.uid() OR
      clients.psychiatrist_id = auth.uid() OR
      clients.case_manager_id = auth.uid()
    )
  )
);

CREATE POLICY "Clinicians can create administrations"
ON public.assessment_administrations FOR INSERT
TO authenticated
WITH CHECK (
  administered_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = assessment_administrations.client_id
    AND (
      clients.primary_therapist_id = auth.uid() OR
      clients.psychiatrist_id = auth.uid() OR
      clients.case_manager_id = auth.uid() OR
      has_role(auth.uid(), 'administrator')
    )
  )
);

CREATE POLICY "Admins can manage all administrations"
ON public.assessment_administrations FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrator'))
WITH CHECK (has_role(auth.uid(), 'administrator'));

-- Assessment Score History
ALTER TABLE public.assessment_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinicians can view score history"
ON public.assessment_score_history FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'administrator') OR
  has_role(auth.uid(), 'supervisor') OR
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = assessment_score_history.client_id
    AND (
      clients.primary_therapist_id = auth.uid() OR
      clients.psychiatrist_id = auth.uid() OR
      clients.case_manager_id = auth.uid()
    )
  )
);

CREATE POLICY "System can insert score history"
ON public.assessment_score_history FOR INSERT
TO authenticated
WITH CHECK (true);

-- Custom Assessments
ALTER TABLE public.custom_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view custom assessments"
ON public.custom_assessments FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Creators and admins can manage custom assessments"
ON public.custom_assessments FOR ALL
TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'administrator'))
WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'administrator'));

-- Storage policies for document-library bucket

CREATE POLICY "Staff can view library files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'document-library');

CREATE POLICY "Admins can upload library files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'document-library' AND
  has_role(auth.uid(), 'administrator')
);

CREATE POLICY "Admins can update library files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'document-library' AND has_role(auth.uid(), 'administrator'));

CREATE POLICY "Admins can delete library files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'document-library' AND has_role(auth.uid(), 'administrator'));

-- Part 10: Seed Pre-Built Clinical Assessments

-- PHQ-9 (Depression)
INSERT INTO public.clinical_assessments (assessment_name, acronym, description, category, total_items, estimated_minutes, scoring_algorithm) VALUES
('Patient Health Questionnaire-9', 'PHQ-9', 'Measures depression severity based on DSM-5 criteria', 'Depression', 9, 5, 
'{
  "items": [
    {"id": 1, "text": "Little interest or pleasure in doing things", "points": [0,1,2,3]},
    {"id": 2, "text": "Feeling down, depressed, or hopeless", "points": [0,1,2,3]},
    {"id": 3, "text": "Trouble falling or staying asleep, or sleeping too much", "points": [0,1,2,3]},
    {"id": 4, "text": "Feeling tired or having little energy", "points": [0,1,2,3]},
    {"id": 5, "text": "Poor appetite or overeating", "points": [0,1,2,3]},
    {"id": 6, "text": "Feeling bad about yourself or that you are a failure", "points": [0,1,2,3]},
    {"id": 7, "text": "Trouble concentrating on things", "points": [0,1,2,3]},
    {"id": 8, "text": "Moving or speaking slowly, or being fidgety/restless", "points": [0,1,2,3]},
    {"id": 9, "text": "Thoughts that you would be better off dead", "points": [0,1,2,3]}
  ],
  "response_options": [
    {"value": 0, "label": "Not at all"},
    {"value": 1, "label": "Several days"},
    {"value": 2, "label": "More than half the days"},
    {"value": 3, "label": "Nearly every day"}
  ],
  "scoring": {"type": "sum"},
  "interpretation": [
    {"range": [0,4], "severity": "None-minimal", "recommendation": "Monitor symptoms"},
    {"range": [5,9], "severity": "Mild", "recommendation": "Watchful waiting; repeat PHQ-9 at follow-up"},
    {"range": [10,14], "severity": "Moderate", "recommendation": "Treatment plan, considering counseling, follow-up and/or pharmacotherapy"},
    {"range": [15,19], "severity": "Moderately Severe", "recommendation": "Active treatment with pharmacotherapy and/or psychotherapy"},
    {"range": [20,27], "severity": "Severe", "recommendation": "Immediate initiation of pharmacotherapy and/or psychotherapy"}
  ]
}'::jsonb);

-- GAD-7 (Anxiety)
INSERT INTO public.clinical_assessments (assessment_name, acronym, description, category, total_items, estimated_minutes, scoring_algorithm) VALUES
('Generalized Anxiety Disorder-7', 'GAD-7', 'Measures anxiety severity', 'Anxiety', 7, 5,
'{
  "items": [
    {"id": 1, "text": "Feeling nervous, anxious, or on edge", "points": [0,1,2,3]},
    {"id": 2, "text": "Not being able to stop or control worrying", "points": [0,1,2,3]},
    {"id": 3, "text": "Worrying too much about different things", "points": [0,1,2,3]},
    {"id": 4, "text": "Trouble relaxing", "points": [0,1,2,3]},
    {"id": 5, "text": "Being so restless that it is hard to sit still", "points": [0,1,2,3]},
    {"id": 6, "text": "Becoming easily annoyed or irritable", "points": [0,1,2,3]},
    {"id": 7, "text": "Feeling afraid, as if something awful might happen", "points": [0,1,2,3]}
  ],
  "response_options": [
    {"value": 0, "label": "Not at all"},
    {"value": 1, "label": "Several days"},
    {"value": 2, "label": "More than half the days"},
    {"value": 3, "label": "Nearly every day"}
  ],
  "scoring": {"type": "sum"},
  "interpretation": [
    {"range": [0,4], "severity": "Minimal", "recommendation": "Monitor symptoms"},
    {"range": [5,9], "severity": "Mild", "recommendation": "Watchful waiting; repeat GAD-7 at follow-up"},
    {"range": [10,14], "severity": "Moderate", "recommendation": "Probable anxiety disorder. Consider treatment"},
    {"range": [15,21], "severity": "Severe", "recommendation": "Active treatment warranted"}
  ]
}'::jsonb);

-- PCL-5 (PTSD)
INSERT INTO public.clinical_assessments (assessment_name, acronym, description, category, total_items, estimated_minutes, scoring_algorithm) VALUES
('PTSD Checklist for DSM-5', 'PCL-5', 'Measures PTSD symptoms based on DSM-5 criteria', 'PTSD', 20, 10,
'{
  "items": [
    {"id": 1, "text": "Repeated, disturbing, and unwanted memories of the stressful experience"},
    {"id": 2, "text": "Repeated, disturbing dreams of the stressful experience"},
    {"id": 3, "text": "Suddenly feeling or acting as if the stressful experience were actually happening again"},
    {"id": 4, "text": "Feeling very upset when something reminded you of the stressful experience"},
    {"id": 5, "text": "Having strong physical reactions when something reminded you"},
    {"id": 6, "text": "Avoiding memories, thoughts, or feelings related to the stressful experience"},
    {"id": 7, "text": "Avoiding external reminders of the stressful experience"},
    {"id": 8, "text": "Trouble remembering important parts of the stressful experience"},
    {"id": 9, "text": "Having strong negative beliefs about yourself, other people, or the world"},
    {"id": 10, "text": "Blaming yourself or someone else for the stressful experience"},
    {"id": 11, "text": "Having strong negative feelings such as fear, horror, anger, guilt, or shame"},
    {"id": 12, "text": "Loss of interest in activities that you used to enjoy"},
    {"id": 13, "text": "Feeling distant or cut off from other people"},
    {"id": 14, "text": "Trouble experiencing positive feelings"},
    {"id": 15, "text": "Irritable behavior, angry outbursts, or acting aggressively"},
    {"id": 16, "text": "Taking too many risks or doing things that could cause you harm"},
    {"id": 17, "text": "Being superalert or watchful or on guard"},
    {"id": 18, "text": "Feeling jumpy or easily startled"},
    {"id": 19, "text": "Having difficulty concentrating"},
    {"id": 20, "text": "Trouble falling or staying asleep"}
  ],
  "response_options": [
    {"value": 0, "label": "Not at all"},
    {"value": 1, "label": "A little bit"},
    {"value": 2, "label": "Moderately"},
    {"value": 3, "label": "Quite a bit"},
    {"value": 4, "label": "Extremely"}
  ],
  "scoring": {"type": "sum"},
  "interpretation": [
    {"range": [0,32], "severity": "Below threshold", "recommendation": "Monitor symptoms"},
    {"range": [33,80], "severity": "Probable PTSD", "recommendation": "Provisional PTSD diagnosis. Confirm with clinical interview"}
  ]
}'::jsonb);

-- Seed default categories
INSERT INTO public.document_library_categories (name, description, icon, color, display_order) VALUES
('Consent Forms', 'Informed consent and authorization documents', 'FileSignature', 'blue', 1),
('Client Handouts', 'Educational materials and resources', 'FileText', 'green', 2),
('Clinical Assessments', 'Standardized assessment tools', 'ClipboardList', 'purple', 3),
('Treatment Forms', 'Treatment plans and progress tracking', 'Clipboard', 'orange', 4),
('Administrative', 'Billing, insurance, and administrative documents', 'Building', 'gray', 5)
ON CONFLICT DO NOTHING;