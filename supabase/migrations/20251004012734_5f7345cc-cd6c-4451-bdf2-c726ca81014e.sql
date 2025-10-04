-- Create enum for note types
CREATE TYPE note_type AS ENUM (
  'intake_assessment',
  'progress_note',
  'psychotherapy_note',
  'psychiatric_evaluation',
  'crisis_assessment',
  'discharge_summary',
  'treatment_plan',
  'supervision_note'
);

-- Create enum for note format
CREATE TYPE note_format AS ENUM ('SOAP', 'DAP', 'BIRP', 'GIRP', 'narrative');

-- Create enum for AI generation status
CREATE TYPE ai_generation_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'manual');

-- Create clinical_notes table
CREATE TABLE public.clinical_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Associations
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  clinician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.telehealth_sessions(id) ON DELETE SET NULL,
  
  -- Note metadata
  note_type note_type NOT NULL,
  note_format note_format NOT NULL DEFAULT 'SOAP',
  date_of_service DATE NOT NULL,
  session_duration_minutes INTEGER,
  
  -- AI generation tracking
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  ai_generation_status ai_generation_status DEFAULT 'manual',
  ai_confidence_score NUMERIC(3,2),
  ai_model_used TEXT,
  ai_processing_time_ms INTEGER,
  
  -- Note content (JSONB for flexible structure)
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- SOAP structure example in content:
  -- {
  --   "subjective": "Patient reports...",
  --   "objective": "Pt appeared...",
  --   "assessment": "Current symptoms...",
  --   "plan": "Continue therapy..."
  -- }
  
  -- Risk assessment
  risk_flags JSONB DEFAULT '[]'::jsonb,
  -- Example: ["suicidal_ideation", "homicidal_ideation", "substance_abuse"]
  
  safety_plan_updated BOOLEAN DEFAULT false,
  
  -- Clinical data
  diagnoses TEXT[],
  interventions TEXT[],
  medications_discussed TEXT[],
  
  -- Supervision and compliance
  requires_supervision BOOLEAN DEFAULT false,
  supervised_by UUID REFERENCES public.profiles(id),
  supervision_date TIMESTAMP WITH TIME ZONE,
  supervision_notes TEXT,
  
  locked BOOLEAN DEFAULT false,
  locked_date TIMESTAMP WITH TIME ZONE,
  locked_by UUID REFERENCES public.profiles(id),
  
  -- Billing
  cpt_codes TEXT[],
  billing_status TEXT DEFAULT 'not_billed',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id),
  
  -- Version control
  version INTEGER NOT NULL DEFAULT 1,
  
  CONSTRAINT valid_confidence_score CHECK (ai_confidence_score IS NULL OR (ai_confidence_score >= 0 AND ai_confidence_score <= 1))
);

-- Create note_versions table for version history
CREATE TABLE public.note_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.clinical_notes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  
  content JSONB NOT NULL,
  risk_flags JSONB,
  diagnoses TEXT[],
  interventions TEXT[],
  
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  change_summary TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  
  UNIQUE(note_id, version)
);

-- Create note_templates table
CREATE TABLE public.note_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  name TEXT NOT NULL,
  note_type note_type NOT NULL,
  note_format note_format NOT NULL,
  
  template_structure JSONB NOT NULL,
  -- Example structure:
  -- {
  --   "sections": [
  --     {"key": "subjective", "label": "Subjective", "placeholder": "Patient's reported concerns..."},
  --     {"key": "objective", "label": "Objective", "placeholder": "Observable presentation..."}
  --   ]
  -- }
  
  ai_prompts JSONB,
  -- AI-specific prompts for each section
  
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create ai_note_settings table
CREATE TABLE public.ai_note_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_id UUID,
  
  -- AI Provider settings
  enabled BOOLEAN NOT NULL DEFAULT false,
  provider TEXT NOT NULL DEFAULT 'lovable_ai',
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  
  -- Feature toggles
  voice_to_text_enabled BOOLEAN NOT NULL DEFAULT true,
  text_expansion_enabled BOOLEAN NOT NULL DEFAULT true,
  template_completion_enabled BOOLEAN NOT NULL DEFAULT true,
  suggestion_engine_enabled BOOLEAN NOT NULL DEFAULT true,
  risk_assessment_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Privacy settings
  data_sharing_consent BOOLEAN NOT NULL DEFAULT false,
  anonymize_before_sending BOOLEAN NOT NULL DEFAULT true,
  retain_ai_logs BOOLEAN NOT NULL DEFAULT false,
  retention_days INTEGER DEFAULT 90,
  
  -- Quality settings
  minimum_confidence_threshold NUMERIC(3,2) DEFAULT 0.7,
  auto_approve_high_confidence BOOLEAN DEFAULT false,
  require_clinician_review BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create session_transcripts table
CREATE TABLE public.session_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  session_id UUID REFERENCES public.telehealth_sessions(id) ON DELETE CASCADE,
  note_id UUID REFERENCES public.clinical_notes(id) ON DELETE SET NULL,
  
  transcript_text TEXT NOT NULL,
  speaker_labels JSONB,
  -- {"segments": [{"speaker": "clinician", "text": "...", "timestamp": "00:01:23"}]}
  
  audio_quality_score NUMERIC(3,2),
  processing_status TEXT DEFAULT 'pending',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_note_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_transcripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clinical_notes
CREATE POLICY "Clinicians can view notes for their clients"
ON public.clinical_notes FOR SELECT
USING (
  clinician_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = clinical_notes.client_id
    AND (
      clients.primary_therapist_id = auth.uid() OR
      clients.psychiatrist_id = auth.uid() OR
      clients.case_manager_id = auth.uid()
    )
  ) OR
  has_role(auth.uid(), 'administrator') OR
  has_role(auth.uid(), 'supervisor')
);

CREATE POLICY "Clinicians can create notes for their clients"
ON public.clinical_notes FOR INSERT
WITH CHECK (
  clinician_id = auth.uid() OR
  has_role(auth.uid(), 'administrator')
);

CREATE POLICY "Clinicians can update their own unlocked notes"
ON public.clinical_notes FOR UPDATE
USING (
  clinician_id = auth.uid() AND
  locked = false
);

CREATE POLICY "Supervisors can update supervised notes"
ON public.clinical_notes FOR UPDATE
USING (
  has_role(auth.uid(), 'supervisor') AND
  supervised_by = auth.uid()
);

-- RLS Policies for note_versions
CREATE POLICY "Clinicians can view versions of accessible notes"
ON public.note_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinical_notes
    WHERE clinical_notes.id = note_versions.note_id
    AND (
      clinical_notes.clinician_id = auth.uid() OR
      has_role(auth.uid(), 'administrator') OR
      has_role(auth.uid(), 'supervisor')
    )
  )
);

CREATE POLICY "System can create note versions"
ON public.note_versions FOR INSERT
WITH CHECK (true);

-- RLS Policies for note_templates
CREATE POLICY "All clinicians can view active templates"
ON public.note_templates FOR SELECT
USING (is_active = true OR created_by = auth.uid());

CREATE POLICY "Clinicians can create templates"
ON public.note_templates FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creators can update their templates"
ON public.note_templates FOR UPDATE
USING (created_by = auth.uid());

-- RLS Policies for ai_note_settings
CREATE POLICY "Administrators can manage AI settings"
ON public.ai_note_settings FOR ALL
USING (has_role(auth.uid(), 'administrator'))
WITH CHECK (has_role(auth.uid(), 'administrator'));

CREATE POLICY "All users can view AI settings"
ON public.ai_note_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policies for session_transcripts
CREATE POLICY "Clinicians can view transcripts for their sessions"
ON public.session_transcripts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.telehealth_sessions ts
    WHERE ts.id = session_transcripts.session_id
    AND ts.host_id = auth.uid()
  ) OR
  has_role(auth.uid(), 'administrator')
);

-- Create indexes
CREATE INDEX idx_clinical_notes_client_id ON public.clinical_notes(client_id);
CREATE INDEX idx_clinical_notes_clinician_id ON public.clinical_notes(clinician_id);
CREATE INDEX idx_clinical_notes_date ON public.clinical_notes(date_of_service);
CREATE INDEX idx_clinical_notes_appointment_id ON public.clinical_notes(appointment_id);
CREATE INDEX idx_clinical_notes_session_id ON public.clinical_notes(session_id);
CREATE INDEX idx_note_versions_note_id ON public.note_versions(note_id);
CREATE INDEX idx_session_transcripts_session_id ON public.session_transcripts(session_id);

-- Create triggers
CREATE TRIGGER update_clinical_notes_updated_at
BEFORE UPDATE ON public.clinical_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_note_templates_updated_at
BEFORE UPDATE ON public.note_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_note_settings_updated_at
BEFORE UPDATE ON public.ai_note_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();