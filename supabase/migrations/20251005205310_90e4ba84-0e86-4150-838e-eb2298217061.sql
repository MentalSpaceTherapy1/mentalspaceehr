-- Create storage bucket for client insurance card images
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-insurance-cards', 'client-insurance-cards', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for clients to upload their own insurance cards
CREATE POLICY "Clients can upload own insurance cards"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-insurance-cards' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM clients WHERE portal_user_id = auth.uid()
  )
);

-- RLS policy for clients to view their own insurance cards
CREATE POLICY "Clients can view own insurance cards"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-insurance-cards' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM clients WHERE portal_user_id = auth.uid()
  )
);

-- RLS policy for staff to view client insurance cards
CREATE POLICY "Staff can view client insurance cards"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-insurance-cards' AND
  (
    has_role(auth.uid(), 'administrator'::app_role) OR
    has_role(auth.uid(), 'billing_staff'::app_role) OR
    has_role(auth.uid(), 'front_desk'::app_role)
  )
);