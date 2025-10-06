-- Create client-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for client-documents bucket
CREATE POLICY "Staff can view client documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'client-documents' AND
    (
      has_role(auth.uid(), 'administrator') OR
      has_role(auth.uid(), 'therapist') OR
      has_role(auth.uid(), 'supervisor') OR
      has_role(auth.uid(), 'front_desk') OR
      has_role(auth.uid(), 'associate_trainee')
    )
  );

CREATE POLICY "Staff can upload client documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents' AND
    (
      has_role(auth.uid(), 'administrator') OR
      has_role(auth.uid(), 'therapist') OR
      has_role(auth.uid(), 'supervisor') OR
      has_role(auth.uid(), 'front_desk') OR
      has_role(auth.uid(), 'associate_trainee')
    )
  );

CREATE POLICY "Staff can update client documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'client-documents' AND
    (
      has_role(auth.uid(), 'administrator') OR
      has_role(auth.uid(), 'therapist') OR
      has_role(auth.uid(), 'supervisor')
    )
  );

CREATE POLICY "Staff can delete client documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'client-documents' AND
    (
      has_role(auth.uid(), 'administrator') OR
      has_role(auth.uid(), 'supervisor')
    )
  );

-- Clients can view their own documents that are shared
CREATE POLICY "Clients can view shared documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'client-documents' AND
    EXISTS (
      SELECT 1 FROM client_documents cd
      JOIN clients c ON c.id = cd.client_id
      WHERE c.portal_user_id = auth.uid()
      AND cd.file_path = storage.objects.name
      AND (cd.shared_with_client = true OR cd.shared_via_portal = true)
    )
  );