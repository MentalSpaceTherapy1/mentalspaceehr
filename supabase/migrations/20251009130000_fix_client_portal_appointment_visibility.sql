-- Fix client portal appointment visibility issue
-- Ensures clients can see appointments created by staff

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view appointments they're involved in" ON appointments;

-- Recreate with improved logic and explicit portal user check
CREATE POLICY "Users can view appointments they're involved in"
ON appointments
FOR SELECT
USING (
  -- Clinician can see their own appointments
  (clinician_id = auth.uid())
  -- OR clinician can see appointments for clients they manage
  OR (client_id IN (
    SELECT clients.id
    FROM clients
    WHERE ((clients.primary_therapist_id = auth.uid())
      OR (clients.psychiatrist_id = auth.uid())
      OR (clients.case_manager_id = auth.uid()))
  ))
  -- OR portal user can see their own appointments (direct match on client's portal_user_id)
  OR (client_id IN (
    SELECT clients.id
    FROM clients
    WHERE clients.portal_user_id = auth.uid()
      AND clients.portal_enabled = true
  ))
  -- OR admin/supervisor/front desk can see all appointments
  OR has_role(auth.uid(), 'administrator'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR has_role(auth.uid(), 'front_desk'::app_role)
);

-- Create an index to improve query performance for portal users
CREATE INDEX IF NOT EXISTS idx_clients_portal_user_id
ON clients(portal_user_id)
WHERE portal_user_id IS NOT NULL;

-- Add helpful comment
COMMENT ON POLICY "Users can view appointments they're involved in" ON appointments IS
'Allows users to view appointments where they are the clinician, manage the client, or are the portal user linked to the client';
