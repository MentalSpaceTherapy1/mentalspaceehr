-- Create portal_resources table for resource library
CREATE TABLE IF NOT EXISTS portal_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  resource_type text NOT NULL CHECK (resource_type IN ('Article', 'Video', 'Worksheet', 'Audio', 'Link', 'PDF', 'Document')),
  category text NOT NULL,
  tags text[] DEFAULT '{}',
  file_path text,
  external_url text,
  thumbnail_url text,
  content_summary text,
  estimated_read_time integer,
  is_public boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  view_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT resource_has_content CHECK (
    (file_path IS NOT NULL) OR (external_url IS NOT NULL)
  )
);

-- Create portal_progress_entries table
CREATE TABLE IF NOT EXISTS portal_progress_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('Mood', 'Sleep', 'Anxiety', 'Medication', 'Exercise', 'Custom')),
  entry_date date NOT NULL,
  entry_time time,
  value numeric,
  scale_min numeric DEFAULT 0,
  scale_max numeric DEFAULT 10,
  notes text,
  tags text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  UNIQUE(client_id, entry_type, entry_date)
);

-- Create portal_notifications table (enhanced)
CREATE TABLE IF NOT EXISTS portal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN (
    'Appointment', 'Message', 'Form', 'Resource', 'Document', 'Reminder', 'Alert'
  )),
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  action_url text,
  action_label text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE portal_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portal_resources
CREATE POLICY "Staff can manage resources"
ON portal_resources
FOR ALL
USING (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'supervisor'))
WITH CHECK (has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Clients can view public resources"
ON portal_resources
FOR SELECT
USING (
  is_public = true 
  OR EXISTS (
    SELECT 1 FROM client_resource_assignments
    WHERE client_resource_assignments.resource_id = portal_resources.id
    AND client_resource_assignments.client_id IN (
      SELECT id FROM clients WHERE portal_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Staff can view all resources"
ON portal_resources
FOR SELECT
USING (
  has_role(auth.uid(), 'administrator')
  OR has_role(auth.uid(), 'supervisor')
  OR has_role(auth.uid(), 'therapist')
);

-- RLS Policies for portal_progress_entries
CREATE POLICY "Clients can manage their progress entries"
ON portal_progress_entries
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = portal_progress_entries.client_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = portal_progress_entries.client_id
  )
);

CREATE POLICY "Clinicians can view client progress"
ON portal_progress_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = portal_progress_entries.client_id
    AND (
      clients.primary_therapist_id = auth.uid()
      OR clients.psychiatrist_id = auth.uid()
      OR clients.case_manager_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
      OR has_role(auth.uid(), 'supervisor')
    )
  )
);

-- RLS Policies for portal_notifications
CREATE POLICY "Clients can view their notifications"
ON portal_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = portal_notifications.client_id
  )
);

CREATE POLICY "Clients can update their notifications"
ON portal_notifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = portal_notifications.client_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = portal_notifications.client_id
  )
);

CREATE POLICY "Staff can manage notifications"
ON portal_notifications
FOR ALL
USING (
  has_role(auth.uid(), 'administrator')
  OR has_role(auth.uid(), 'front_desk')
  OR EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = portal_notifications.client_id
    AND (
      clients.primary_therapist_id = auth.uid()
      OR clients.psychiatrist_id = auth.uid()
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'administrator')
  OR has_role(auth.uid(), 'front_desk')
  OR EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = portal_notifications.client_id
    AND (
      clients.primary_therapist_id = auth.uid()
      OR clients.psychiatrist_id = auth.uid()
    )
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_portal_resources_category ON portal_resources(category);
CREATE INDEX IF NOT EXISTS idx_portal_resources_type ON portal_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_portal_resources_public ON portal_resources(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_progress_entries_client_date ON portal_progress_entries(client_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_progress_entries_type ON portal_progress_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_notifications_client_unread ON portal_notifications(client_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON portal_notifications(created_at DESC);

-- Create triggers for updated_at
CREATE TRIGGER update_portal_resources_updated_at
  BEFORE UPDATE ON portal_resources
  FOR EACH ROW
  EXECUTE FUNCTION update_portal_forms_updated_at();

CREATE TRIGGER update_portal_progress_updated_at
  BEFORE UPDATE ON portal_progress_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_portal_forms_updated_at();