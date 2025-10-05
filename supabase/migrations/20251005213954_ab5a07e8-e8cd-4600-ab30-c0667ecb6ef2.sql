-- Allow clients to view their own portal record
CREATE POLICY "Clients can view their own portal record"
  ON public.clients
  FOR SELECT
  USING (portal_user_id = auth.uid());