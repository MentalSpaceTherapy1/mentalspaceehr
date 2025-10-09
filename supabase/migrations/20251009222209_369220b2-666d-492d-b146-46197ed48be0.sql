-- Fix client portal appointment visibility
-- This migration enhances the RLS policy to explicitly check portal_enabled flag

-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Users can view appointments they're involved in" ON appointments;

-- Recreate the policy with explicit portal_enabled check
CREATE POLICY "Users can view appointments they're involved in"
ON appointments
FOR SELECT
USING (
  -- Portal user can see their own appointments (direct match on client's portal_user_id)
  (client_id IN (
    SELECT clients.id
    FROM clients
    WHERE clients.portal_user_id = auth.uid()
      AND clients.portal_enabled = true
  ))
  OR
  -- Clinician assigned to the appointment
  (clinician_id = auth.uid())
  OR
  -- Staff with appropriate roles
  (
    client_id IN (
      SELECT clients.id
      FROM clients
      WHERE clients.primary_therapist_id = auth.uid()
        OR clients.psychiatrist_id = auth.uid()
        OR clients.case_manager_id = auth.uid()
    )
  )
  OR
  has_role(auth.uid(), 'administrator'::app_role)
  OR
  has_role(auth.uid(), 'supervisor'::app_role)
  OR
  has_role(auth.uid(), 'front_desk'::app_role)
);

-- Add index for better portal_user_id lookup performance
CREATE INDEX IF NOT EXISTS idx_clients_portal_user_id ON clients(portal_user_id)
WHERE portal_user_id IS NOT NULL AND portal_enabled = true;

-- Add helpful comment
COMMENT ON POLICY "Users can view appointments they're involved in" ON appointments IS 
'Allows users to view appointments where they are the client (via portal_user_id with portal_enabled=true), assigned clinician, or staff with access';