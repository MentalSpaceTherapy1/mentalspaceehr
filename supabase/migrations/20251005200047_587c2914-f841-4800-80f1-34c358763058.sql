-- Add missing fields to client_portal_messages table
ALTER TABLE public.client_portal_messages
ADD COLUMN IF NOT EXISTS thread_id uuid,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Sent',
ADD COLUMN IF NOT EXISTS sent_date timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS requires_response boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS responded_to boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS response_message_id uuid,
ADD COLUMN IF NOT EXISTS added_to_chart boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS chart_note_id uuid,
ADD COLUMN IF NOT EXISTS encrypted boolean DEFAULT false;

-- Create message attachments table
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.client_portal_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  file_type text NOT NULL,
  file_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create progress trackers table
CREATE TABLE IF NOT EXISTS public.progress_trackers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tracker_type text NOT NULL,
  tracker_title text NOT NULL,
  assigned_by uuid NOT NULL,
  assigned_date timestamp with time zone DEFAULT now(),
  frequency text NOT NULL,
  symptoms jsonb,
  visible_to_client boolean DEFAULT true,
  shared_with_clinician boolean DEFAULT true,
  status text NOT NULL DEFAULT 'Active',
  chart_type text,
  chart_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create progress tracker entries table
CREATE TABLE IF NOT EXISTS public.progress_tracker_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id uuid NOT NULL REFERENCES public.progress_trackers(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  entry_time time,
  data jsonb NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_progress_trackers_client_id ON public.progress_trackers(client_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracker_entries_tracker_id ON public.progress_tracker_entries(tracker_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracker_entries_entry_date ON public.progress_tracker_entries(entry_date);

-- RLS Policies for message_attachments
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for their messages"
ON public.message_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_portal_messages
    WHERE id = message_attachments.message_id
    AND (
      EXISTS (SELECT 1 FROM clients WHERE portal_user_id = auth.uid() AND id = client_portal_messages.client_id)
      OR clinician_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
    )
  )
);

CREATE POLICY "Users can upload attachments to their messages"
ON public.message_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_portal_messages
    WHERE id = message_attachments.message_id
    AND (
      EXISTS (SELECT 1 FROM clients WHERE portal_user_id = auth.uid() AND id = client_portal_messages.client_id)
      OR clinician_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
    )
  )
);

-- RLS Policies for progress_trackers
ALTER TABLE public.progress_trackers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own trackers"
ON public.progress_trackers FOR SELECT
USING (
  EXISTS (SELECT 1 FROM clients WHERE portal_user_id = auth.uid() AND id = progress_trackers.client_id)
  AND visible_to_client = true
);

CREATE POLICY "Clinicians can view client trackers"
ON public.progress_trackers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE id = progress_trackers.client_id
    AND (
      primary_therapist_id = auth.uid()
      OR psychiatrist_id = auth.uid()
      OR case_manager_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
      OR has_role(auth.uid(), 'supervisor')
    )
  )
);

CREATE POLICY "Clinicians can create trackers"
ON public.progress_trackers FOR INSERT
WITH CHECK (
  assigned_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM clients
    WHERE id = progress_trackers.client_id
    AND (
      primary_therapist_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
    )
  )
);

CREATE POLICY "Clinicians can update trackers"
ON public.progress_trackers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE id = progress_trackers.client_id
    AND (
      primary_therapist_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
    )
  )
);

-- RLS Policies for progress_tracker_entries
ALTER TABLE public.progress_tracker_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view entries for their trackers"
ON public.progress_tracker_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM progress_trackers pt
    JOIN clients c ON c.id = pt.client_id
    WHERE pt.id = progress_tracker_entries.tracker_id
    AND c.portal_user_id = auth.uid()
    AND pt.visible_to_client = true
  )
);

CREATE POLICY "Clinicians can view client tracker entries"
ON public.progress_tracker_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM progress_trackers pt
    JOIN clients c ON c.id = pt.client_id
    WHERE pt.id = progress_tracker_entries.tracker_id
    AND (
      c.primary_therapist_id = auth.uid()
      OR c.psychiatrist_id = auth.uid()
      OR c.case_manager_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
      OR has_role(auth.uid(), 'supervisor')
    )
  )
);

CREATE POLICY "Clients can create entries for their trackers"
ON public.progress_tracker_entries FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM progress_trackers pt
    JOIN clients c ON c.id = pt.client_id
    WHERE pt.id = progress_tracker_entries.tracker_id
    AND c.portal_user_id = auth.uid()
    AND pt.status = 'Active'
  )
);

CREATE POLICY "Clients can update their entries"
ON public.progress_tracker_entries FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM progress_trackers pt
    JOIN clients c ON c.id = pt.client_id
    WHERE pt.id = progress_tracker_entries.tracker_id
    AND c.portal_user_id = auth.uid()
  )
);

-- Storage policies for message attachments
CREATE POLICY "Users can view their message attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND (
    EXISTS (
      SELECT 1 FROM clients
      WHERE portal_user_id = auth.uid()
      AND auth.uid()::text = (storage.foldername(name))[1]
    )
    OR has_role(auth.uid(), 'administrator')
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Triggers
CREATE TRIGGER update_progress_trackers_updated_at
BEFORE UPDATE ON public.progress_trackers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();