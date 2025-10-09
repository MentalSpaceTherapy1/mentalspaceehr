-- Fix RLS policies on telehealth_sessions to allow portal clients to access sessions

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view sessions they're involved in" ON public.telehealth_sessions;
DROP POLICY IF EXISTS "Hosts can create sessions" ON public.telehealth_sessions;
DROP POLICY IF EXISTS "Participants can view sessions" ON public.telehealth_sessions;

-- Allow users to view sessions where they are the host
CREATE POLICY "Hosts can view their sessions"
ON public.telehealth_sessions
FOR SELECT
USING (host_id = auth.uid());

-- Allow portal clients to view sessions linked to their appointments
CREATE POLICY "Clients can view their appointment sessions"
ON public.telehealth_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.clients c ON c.id = a.client_id
    WHERE a.id = telehealth_sessions.appointment_id
      AND c.portal_user_id = auth.uid()
      AND c.portal_enabled = true
  )
);

-- Allow administrators and supervisors to view all sessions
CREATE POLICY "Admins can view all sessions"
ON public.telehealth_sessions
FOR SELECT
USING (
  has_role(auth.uid(), 'administrator'::app_role) OR
  has_role(auth.uid(), 'supervisor'::app_role)
);

-- Allow hosts (clinicians) to create sessions
CREATE POLICY "Hosts can create sessions"
ON public.telehealth_sessions
FOR INSERT
WITH CHECK (host_id = auth.uid());

-- Allow portal clients to create sessions for their own appointments
-- The host_id MUST be the appointment's clinician (prevents spoofing)
CREATE POLICY "Clients can create sessions for own appointments"
ON public.telehealth_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.clients c ON c.id = a.client_id
    WHERE a.id = appointment_id
      AND c.portal_user_id = auth.uid()
      AND c.portal_enabled = true
      AND host_id = a.clinician_id
  )
);

-- Allow hosts to update their own sessions
CREATE POLICY "Hosts can update their sessions"
ON public.telehealth_sessions
FOR UPDATE
USING (host_id = auth.uid());

-- Allow admins to update any session
CREATE POLICY "Admins can update sessions"
ON public.telehealth_sessions
FOR UPDATE
USING (
  has_role(auth.uid(), 'administrator'::app_role) OR
  has_role(auth.uid(), 'supervisor'::app_role)
);