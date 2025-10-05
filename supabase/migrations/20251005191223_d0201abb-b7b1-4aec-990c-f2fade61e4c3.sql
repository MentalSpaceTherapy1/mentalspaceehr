-- ============================================
-- PHASE 7: CLIENT PORTAL DATABASE SCHEMA
-- ============================================

-- Add portal user link to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS portal_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS portal_invitation_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS portal_last_login TIMESTAMP WITH TIME ZONE;

-- Create index for portal user lookup
CREATE INDEX IF NOT EXISTS idx_clients_portal_user_id ON public.clients(portal_user_id);

-- Add 'client_user' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client_user';

-- ============================================
-- CLIENT PORTAL MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.client_portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  clinician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  parent_message_id UUID REFERENCES public.client_portal_messages(id) ON DELETE CASCADE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_portal_messages ENABLE ROW LEVEL SECURITY;

-- Clients can view their own messages
CREATE POLICY "Clients can view their own messages"
ON public.client_portal_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = client_portal_messages.client_id
  )
);

-- Clinicians can view messages for their clients
CREATE POLICY "Clinicians can view client messages"
ON public.client_portal_messages FOR SELECT
TO authenticated
USING (
  clinician_id = auth.uid() 
  OR has_role(auth.uid(), 'administrator')
  OR has_role(auth.uid(), 'supervisor')
);

-- Clients can send messages
CREATE POLICY "Clients can send messages"
ON public.client_portal_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = client_portal_messages.client_id
  )
  AND sender_id = auth.uid()
);

-- Clinicians can send messages to their clients
CREATE POLICY "Clinicians can send messages"
ON public.client_portal_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    clinician_id = auth.uid()
    OR has_role(auth.uid(), 'administrator')
  )
);

-- Users can update their own messages (mark as read)
CREATE POLICY "Users can update their received messages"
ON public.client_portal_messages FOR UPDATE
TO authenticated
USING (
  sender_id != auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.portal_user_id = auth.uid()
      AND clients.id = client_portal_messages.client_id
    )
    OR clinician_id = auth.uid()
  )
);

-- ============================================
-- CLIENT DOCUMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'intake_form',
    'consent_form',
    'assessment',
    'insurance_card',
    'identification',
    'other'
  )),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requires_signature BOOLEAN DEFAULT false,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signature_data TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'completed', 'archived')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Clients can view their own documents
CREATE POLICY "Clients can view their own documents"
ON public.client_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = client_documents.client_id
  )
);

-- Staff can view client documents
CREATE POLICY "Staff can view client documents"
ON public.client_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_documents.client_id
    AND (
      clients.primary_therapist_id = auth.uid()
      OR clients.psychiatrist_id = auth.uid()
      OR clients.case_manager_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
      OR has_role(auth.uid(), 'front_desk')
    )
  )
);

-- Clients can upload documents
CREATE POLICY "Clients can upload documents"
ON public.client_documents FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = client_documents.client_id
  )
  AND uploaded_by = auth.uid()
);

-- Staff can upload documents for clients
CREATE POLICY "Staff can upload client documents"
ON public.client_documents FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_documents.client_id
    AND (
      clients.primary_therapist_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
      OR has_role(auth.uid(), 'front_desk')
    )
  )
);

-- Clients can sign their documents
CREATE POLICY "Clients can sign documents"
ON public.client_documents FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = client_documents.client_id
  )
  AND requires_signature = true
);

-- ============================================
-- SYMPTOM TRACKERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.symptom_trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tracker_date DATE NOT NULL,
  mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 10),
  anxiety_rating INTEGER CHECK (anxiety_rating BETWEEN 1 AND 10),
  depression_rating INTEGER CHECK (depression_rating BETWEEN 1 AND 10),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
  sleep_hours NUMERIC(3,1),
  medication_taken BOOLEAN,
  symptoms JSONB DEFAULT '[]',
  notes TEXT,
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(client_id, tracker_date)
);

-- Enable RLS
ALTER TABLE public.symptom_trackers ENABLE ROW LEVEL SECURITY;

-- Clients can manage their own trackers
CREATE POLICY "Clients can manage their own trackers"
ON public.symptom_trackers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = symptom_trackers.client_id
  )
);

-- Clinicians can view client trackers
CREATE POLICY "Clinicians can view client trackers"
ON public.symptom_trackers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = symptom_trackers.client_id
    AND (
      clients.primary_therapist_id = auth.uid()
      OR clients.psychiatrist_id = auth.uid()
      OR clients.case_manager_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
      OR has_role(auth.uid(), 'supervisor')
    )
  )
);

-- ============================================
-- HOMEWORK ASSIGNMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.homework_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  clinician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT,
  due_date DATE,
  assigned_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'skipped')),
  completed_date TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  related_session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;

-- Clients can view and update their own homework
CREATE POLICY "Clients can manage their homework"
ON public.homework_assignments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = homework_assignments.client_id
  )
);

-- Clinicians can manage homework for their clients
CREATE POLICY "Clinicians can manage client homework"
ON public.homework_assignments FOR ALL
TO authenticated
USING (
  clinician_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = homework_assignments.client_id
    AND (
      clients.primary_therapist_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
      OR has_role(auth.uid(), 'supervisor')
    )
  )
);

-- ============================================
-- JOURNAL ENTRIES
-- ============================================
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_title TEXT,
  entry_content TEXT NOT NULL,
  mood TEXT,
  is_shared_with_clinician BOOLEAN DEFAULT false,
  clinician_viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Clients can manage their own journal entries
CREATE POLICY "Clients can manage their journal"
ON public.journal_entries FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = journal_entries.client_id
  )
);

-- Clinicians can view shared journal entries
CREATE POLICY "Clinicians can view shared journal entries"
ON public.journal_entries FOR SELECT
TO authenticated
USING (
  is_shared_with_clinician = true
  AND EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = journal_entries.client_id
    AND (
      clients.primary_therapist_id = auth.uid()
      OR clients.psychiatrist_id = auth.uid()
      OR clients.case_manager_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
      OR has_role(auth.uid(), 'supervisor')
    )
  )
);

-- ============================================
-- EDUCATIONAL RESOURCES
-- ============================================
CREATE TABLE IF NOT EXISTS public.educational_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN (
    'article',
    'video',
    'worksheet',
    'exercise',
    'link',
    'document'
  )),
  url TEXT,
  file_path TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  target_conditions TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.educational_resources ENABLE ROW LEVEL SECURITY;

-- Public resources visible to all authenticated users
CREATE POLICY "Public resources visible to all"
ON public.educational_resources FOR SELECT
TO authenticated
USING (is_public = true);

-- Staff can manage resources
CREATE POLICY "Staff can manage resources"
ON public.educational_resources FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'administrator')
  OR has_role(auth.uid(), 'therapist')
  OR has_role(auth.uid(), 'supervisor')
);

-- ============================================
-- CLIENT RESOURCE ASSIGNMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.client_resource_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.educational_resources(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  UNIQUE(client_id, resource_id)
);

-- Enable RLS
ALTER TABLE public.client_resource_assignments ENABLE ROW LEVEL SECURITY;

-- Clients can view their assigned resources
CREATE POLICY "Clients can view assigned resources"
ON public.client_resource_assignments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = client_resource_assignments.client_id
  )
);

-- Clients can update viewing/completion status
CREATE POLICY "Clients can update resource status"
ON public.client_resource_assignments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = client_resource_assignments.client_id
  )
);

-- Clinicians can assign resources
CREATE POLICY "Clinicians can assign resources"
ON public.client_resource_assignments FOR INSERT
TO authenticated
WITH CHECK (
  assigned_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_resource_assignments.client_id
    AND (
      clients.primary_therapist_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
    )
  )
);

-- Clinicians can view assignments for their clients
CREATE POLICY "Clinicians can view client assignments"
ON public.client_resource_assignments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_resource_assignments.client_id
    AND (
      clients.primary_therapist_id = auth.uid()
      OR clients.psychiatrist_id = auth.uid()
      OR clients.case_manager_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
      OR has_role(auth.uid(), 'supervisor')
    )
  )
);

-- ============================================
-- PORTAL NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.portal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'appointment_reminder',
    'new_message',
    'new_document',
    'new_homework',
    'appointment_change',
    'system_message'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portal_notifications ENABLE ROW LEVEL SECURITY;

-- Clients can manage their notifications
CREATE POLICY "Clients can manage their notifications"
ON public.portal_notifications FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = portal_notifications.client_id
  )
);

-- System can create notifications
CREATE POLICY "System can create notifications"
ON public.portal_notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_portal_messages_client_id ON public.client_portal_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_clinician_id ON public.client_portal_messages(clinician_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_created_at ON public.client_portal_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON public.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_type ON public.client_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_client_documents_status ON public.client_documents(status);

CREATE INDEX IF NOT EXISTS idx_symptom_trackers_client_id ON public.symptom_trackers(client_id);
CREATE INDEX IF NOT EXISTS idx_symptom_trackers_date ON public.symptom_trackers(tracker_date DESC);

CREATE INDEX IF NOT EXISTS idx_homework_client_id ON public.homework_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_homework_status ON public.homework_assignments(status);
CREATE INDEX IF NOT EXISTS idx_homework_due_date ON public.homework_assignments(due_date);

CREATE INDEX IF NOT EXISTS idx_journal_client_id ON public.journal_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_date ON public.journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_shared ON public.journal_entries(is_shared_with_clinician) WHERE is_shared_with_clinician = true;

CREATE INDEX IF NOT EXISTS idx_resources_public ON public.educational_resources(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_resources_type ON public.educational_resources(resource_type);

CREATE INDEX IF NOT EXISTS idx_resource_assignments_client ON public.client_resource_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_resource ON public.client_resource_assignments(resource_id);

CREATE INDEX IF NOT EXISTS idx_portal_notifications_client_id ON public.portal_notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_notifications_unread ON public.portal_notifications(is_read) WHERE is_read = false;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_portal_messages_updated_at
  BEFORE UPDATE ON public.client_portal_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_documents_updated_at
  BEFORE UPDATE ON public.client_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_symptom_trackers_updated_at
  BEFORE UPDATE ON public.symptom_trackers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homework_updated_at
  BEFORE UPDATE ON public.homework_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journal_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON public.educational_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();