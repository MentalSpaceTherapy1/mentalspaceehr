-- Extend client_documents table with advanced features
ALTER TABLE client_documents
ADD COLUMN IF NOT EXISTS document_category text,
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS uploaded_date timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS uploaded_method text DEFAULT 'User Upload',
ADD COLUMN IF NOT EXISTS document_source text DEFAULT 'Internal',
ADD COLUMN IF NOT EXISTS external_provider text,
ADD COLUMN IF NOT EXISTS document_date date,
ADD COLUMN IF NOT EXISTS signatures jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS shared_with_client boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_via_portal boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS client_viewed_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_embedded_form boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS form_responses jsonb,
ADD COLUMN IF NOT EXISTS version_number integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS previous_version_id uuid REFERENCES client_documents(id),
ADD COLUMN IF NOT EXISTS latest_version boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS ocr_processed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS extracted_text text,
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS viewed_by jsonb DEFAULT '[]'::jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_status ON client_documents(status);
CREATE INDEX IF NOT EXISTS idx_client_documents_document_type ON client_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_client_documents_latest_version ON client_documents(latest_version) WHERE latest_version = true;
CREATE INDEX IF NOT EXISTS idx_client_documents_tags ON client_documents USING GIN(tags);

-- Create document_templates table
CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_type text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_type text NOT NULL,
  category text,
  is_active boolean DEFAULT true,
  requires_client_signature boolean DEFAULT false,
  requires_clinician_signature boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on document_templates
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_templates
CREATE POLICY "Staff can view active templates"
  ON document_templates FOR SELECT
  TO authenticated
  USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Administrators can manage templates"
  ON document_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'administrator'))
  WITH CHECK (has_role(auth.uid(), 'administrator'));

-- Update existing client_documents RLS to include new fields
DROP POLICY IF EXISTS "Clients can view their own documents" ON client_documents;
CREATE POLICY "Clients can view their own documents"
  ON client_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.portal_user_id = auth.uid()
      AND clients.id = client_documents.client_id
      AND (client_documents.shared_with_client = true OR client_documents.shared_via_portal = true)
    )
  );

-- Function to track document views
CREATE OR REPLACE FUNCTION track_document_view(document_id uuid, viewer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_views jsonb;
BEGIN
  SELECT viewed_by INTO current_views
  FROM client_documents
  WHERE id = document_id;
  
  IF current_views IS NULL THEN
    current_views := '[]'::jsonb;
  END IF;
  
  UPDATE client_documents
  SET 
    viewed_by = current_views || jsonb_build_object(
      'userId', viewer_id,
      'viewedDate', now()
    ),
    client_viewed_date = CASE 
      WHEN EXISTS (SELECT 1 FROM clients WHERE portal_user_id = viewer_id)
      THEN now()
      ELSE client_viewed_date
    END
  WHERE id = document_id;
END;
$$;

-- Function to create new document version
CREATE OR REPLACE FUNCTION create_document_version(
  original_document_id uuid,
  new_file_path text,
  new_file_name text,
  new_file_size integer,
  uploaded_by_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_version_number integer;
  new_document_id uuid;
  original_document record;
BEGIN
  -- Get original document details
  SELECT * INTO original_document
  FROM client_documents
  WHERE id = original_document_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original document not found';
  END IF;
  
  -- Mark old version as not latest
  UPDATE client_documents
  SET latest_version = false
  WHERE id = original_document_id;
  
  -- Calculate new version number
  new_version_number := original_document.version_number + 1;
  
  -- Create new version
  INSERT INTO client_documents (
    client_id,
    title,
    description,
    document_type,
    document_category,
    file_path,
    file_name,
    file_size_bytes,
    mime_type,
    uploaded_by,
    uploaded_date,
    uploaded_method,
    document_source,
    document_date,
    version_number,
    previous_version_id,
    latest_version,
    status,
    tags
  ) VALUES (
    original_document.client_id,
    original_document.title,
    original_document.description,
    original_document.document_type,
    original_document.document_category,
    new_file_path,
    new_file_name,
    new_file_size,
    original_document.mime_type,
    uploaded_by_id,
    now(),
    'Version Upload',
    original_document.document_source,
    original_document.document_date,
    new_version_number,
    original_document_id,
    true,
    original_document.status,
    original_document.tags
  ) RETURNING id INTO new_document_id;
  
  RETURN new_document_id;
END;
$$;