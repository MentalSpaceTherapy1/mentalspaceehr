-- Update RLS policy for portal users to view appointments more explicitly
DROP POLICY IF EXISTS "Users can view appointments they're involved in" ON public.appointments;

CREATE POLICY "Portal users can view their appointments" 
ON public.appointments 
FOR SELECT 
USING (
  -- Portal users can see their own appointments
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = appointments.client_id
    AND clients.portal_user_id = auth.uid()
  )
);

CREATE POLICY "Staff can view appointments" 
ON public.appointments 
FOR SELECT 
USING (
  -- Clinicians can see their own appointments
  clinician_id = auth.uid()
  OR
  -- Staff can see appointments for clients they manage
  client_id IN (
    SELECT clients.id FROM public.clients
    WHERE clients.primary_therapist_id = auth.uid()
    OR clients.psychiatrist_id = auth.uid()
    OR clients.case_manager_id = auth.uid()
  )
  OR
  -- Admins and supervisors can see all
  has_role(auth.uid(), 'administrator'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR has_role(auth.uid(), 'front_desk'::app_role)
);