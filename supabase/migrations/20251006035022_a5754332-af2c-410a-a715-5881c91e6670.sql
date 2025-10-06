-- Fix appointments table RLS to allow clients to view their own appointments
DROP POLICY IF EXISTS "Users can view appointments they're involved in" ON appointments;

CREATE POLICY "Users can view appointments they're involved in" 
ON appointments 
FOR SELECT 
USING (
  (clinician_id = auth.uid()) 
  OR (client_id IN ( 
    SELECT clients.id
    FROM clients
    WHERE ((clients.primary_therapist_id = auth.uid()) 
      OR (clients.psychiatrist_id = auth.uid()) 
      OR (clients.case_manager_id = auth.uid()))
  )) 
  OR (client_id IN (
    SELECT clients.id
    FROM clients
    WHERE clients.portal_user_id = auth.uid()
  ))
  OR has_role(auth.uid(), 'administrator'::app_role) 
  OR has_role(auth.uid(), 'supervisor'::app_role) 
  OR has_role(auth.uid(), 'front_desk'::app_role)
);

-- Add policy for portal users to view profiles of their assigned clinicians  
DROP POLICY IF EXISTS "Portal users can view their clinician profiles" ON profiles;

CREATE POLICY "Portal users can view their clinician profiles" 
ON profiles 
FOR SELECT 
USING (
  (auth.uid() = id)
  OR has_role(auth.uid(), 'administrator'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR has_role(auth.uid(), 'front_desk'::app_role)
  OR EXISTS (
    SELECT 1
    FROM clients
    WHERE clients.portal_user_id = auth.uid()
    AND (
      profiles.id = clients.primary_therapist_id
      OR profiles.id = clients.psychiatrist_id
      OR profiles.id = clients.case_manager_id
    )
  )
);