-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view sessions they're involved in" ON public.telehealth_sessions;

-- Create a new policy that allows viewing if user is part of the appointment
CREATE POLICY "Users can view sessions they're involved in"
ON public.telehealth_sessions FOR SELECT
USING (
  host_id = auth.uid() 
  OR is_session_participant(auth.uid(), id)
  OR has_role(auth.uid(), 'administrator'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.appointments 
    WHERE appointments.id = telehealth_sessions.appointment_id 
    AND (appointments.clinician_id = auth.uid() OR appointments.client_id = auth.uid())
  )
);