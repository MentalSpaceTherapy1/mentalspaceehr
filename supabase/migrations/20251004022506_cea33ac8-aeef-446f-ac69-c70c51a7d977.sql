-- Create audit logging table for AI requests
CREATE TABLE IF NOT EXISTS public.ai_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL, -- 'transcription', 'note_generation', 'suggestion', 'risk_assessment'
  model_used TEXT NOT NULL,
  input_length INTEGER,
  output_length INTEGER,
  processing_time_ms INTEGER,
  confidence_score NUMERIC(3,2),
  anonymized_input_hash TEXT, -- Hash of anonymized input for auditing
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_request_logs ENABLE ROW LEVEL SECURITY;

-- Administrators can view all logs
CREATE POLICY "Administrators can view AI logs"
  ON public.ai_request_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'administrator'::app_role));

-- System can insert logs
CREATE POLICY "System can insert AI logs"
  ON public.ai_request_logs
  FOR INSERT
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_ai_request_logs_user_created ON public.ai_request_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_request_logs_type ON public.ai_request_logs(request_type, created_at DESC);

-- Create note feedback table
CREATE TABLE IF NOT EXISTS public.note_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES public.clinical_notes(id) ON DELETE CASCADE NOT NULL,
  clinician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  rating INTEGER CHECK (rating IN (-1, 1)), -- -1 for thumbs down, 1 for thumbs up
  feedback_text TEXT,
  edit_distance INTEGER, -- Number of characters changed from AI version
  ai_sections_kept JSONB, -- Track which AI sections were kept unchanged
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.note_feedback ENABLE ROW LEVEL SECURITY;

-- Clinicians can insert feedback for their notes
CREATE POLICY "Clinicians can insert feedback"
  ON public.note_feedback
  FOR INSERT
  WITH CHECK (clinician_id = auth.uid());

-- Users can view feedback for accessible notes
CREATE POLICY "Users can view feedback for accessible notes"
  ON public.note_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clinical_notes
      WHERE clinical_notes.id = note_feedback.note_id
        AND (
          clinical_notes.clinician_id = auth.uid()
          OR has_role(auth.uid(), 'administrator'::app_role)
          OR has_role(auth.uid(), 'supervisor'::app_role)
        )
    )
  );

-- Create BAA tracking table
CREATE TABLE IF NOT EXISTS public.ai_provider_baa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL UNIQUE,
  baa_signed BOOLEAN NOT NULL DEFAULT false,
  baa_signed_date DATE,
  baa_expiration_date DATE,
  baa_document_url TEXT,
  contact_email TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_provider_baa ENABLE ROW LEVEL SECURITY;

-- Administrators can manage BAA records
CREATE POLICY "Administrators can manage BAA records"
  ON public.ai_provider_baa
  FOR ALL
  USING (has_role(auth.uid(), 'administrator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

-- All authenticated users can view active BAAs
CREATE POLICY "Users can view active BAAs"
  ON public.ai_provider_baa
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Insert default BAA records for known providers
INSERT INTO public.ai_provider_baa (provider_name, baa_signed, baa_signed_date, notes)
VALUES 
  ('Lovable AI', true, CURRENT_DATE, 'Built-in HIPAA-compliant AI service'),
  ('OpenAI', false, NULL, 'Requires BAA for HIPAA compliance')
ON CONFLICT (provider_name) DO NOTHING;

-- Add enhanced risk assessment fields to clinical_notes
ALTER TABLE public.clinical_notes
ADD COLUMN IF NOT EXISTS risk_severity TEXT CHECK (risk_severity IN ('none', 'low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS safety_plan_triggered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS safety_plan_id UUID REFERENCES public.clinical_notes(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_clinical_notes_risk_severity ON public.clinical_notes(risk_severity, date_of_service DESC);