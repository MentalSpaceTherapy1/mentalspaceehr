-- Phase 1: Enhanced Verification System
-- Add verification and status fields to supervision_sessions
ALTER TABLE public.supervision_sessions
ADD COLUMN verified_by_supervisor BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Verified', 'Disputed')),
ADD COLUMN dispute_reason TEXT;

-- Phase 2: Licensure Tracking
-- Add applies_to field for multi-licensure support
ALTER TABLE public.supervision_sessions
ADD COLUMN applies_to TEXT; -- which license requirement (e.g., 'LMSW', 'LCSW', 'LMHC')

-- Phase 3: Document Attachments
-- Create supervision_session_attachments table
CREATE TABLE public.supervision_session_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.supervision_sessions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  description TEXT
);

-- Enable RLS on attachments table
ALTER TABLE public.supervision_session_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attachments
CREATE POLICY "Users can view attachments for their supervision sessions"
ON public.supervision_session_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.supervision_sessions ss
    INNER JOIN public.supervision_relationships sr ON ss.relationship_id = sr.id
    WHERE ss.id = supervision_session_attachments.session_id
    AND (sr.supervisor_id = auth.uid() OR sr.supervisee_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role))
  )
);

CREATE POLICY "Supervisors and supervisees can upload attachments"
ON public.supervision_session_attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.supervision_sessions ss
    INNER JOIN public.supervision_relationships sr ON ss.relationship_id = sr.id
    WHERE ss.id = supervision_session_attachments.session_id
    AND (sr.supervisor_id = auth.uid() OR sr.supervisee_id = auth.uid())
  )
);

CREATE POLICY "Users can delete their own attachments"
ON public.supervision_session_attachments
FOR DELETE
USING (uploaded_by = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role));

-- Create storage bucket for supervision documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('supervision-documents', 'supervision-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for supervision documents
CREATE POLICY "Users can view their supervision documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'supervision-documents' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    has_role(auth.uid(), 'administrator'::app_role)
  )
);

CREATE POLICY "Users can upload their supervision documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'supervision-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their supervision documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'supervision-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their supervision documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'supervision-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);