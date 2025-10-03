-- Add group session support to appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS is_group_session BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_participants INTEGER,
ADD COLUMN IF NOT EXISTS current_participants INTEGER DEFAULT 1;

-- Create appointment_participants table for group sessions
CREATE TABLE IF NOT EXISTS public.appointment_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Confirmed',
  added_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  added_by UUID REFERENCES auth.users(id),
  notes TEXT,
  UNIQUE(appointment_id, client_id)
);

-- Enable RLS on appointment_participants
ALTER TABLE public.appointment_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for appointment_participants
CREATE POLICY "Authorized staff can manage participants"
ON public.appointment_participants
FOR ALL
USING (
  has_role(auth.uid(), 'administrator') OR
  has_role(auth.uid(), 'front_desk') OR
  EXISTS (
    SELECT 1 FROM public.appointments
    WHERE appointments.id = appointment_participants.appointment_id
    AND appointments.clinician_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'administrator') OR
  has_role(auth.uid(), 'front_desk') OR
  EXISTS (
    SELECT 1 FROM public.appointments
    WHERE appointments.id = appointment_participants.appointment_id
    AND appointments.clinician_id = auth.uid()
  )
);

CREATE POLICY "Users can view participants for accessible appointments"
ON public.appointment_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments
    WHERE appointments.id = appointment_participants.appointment_id
    AND (
      appointments.clinician_id = auth.uid() OR
      has_role(auth.uid(), 'administrator') OR
      has_role(auth.uid(), 'supervisor') OR
      has_role(auth.uid(), 'front_desk')
    )
  )
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointment_participants_appointment_id 
ON public.appointment_participants(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_participants_client_id 
ON public.appointment_participants(client_id);

-- Add comment for documentation
COMMENT ON TABLE public.appointment_participants IS 'Tracks participants in group therapy sessions';