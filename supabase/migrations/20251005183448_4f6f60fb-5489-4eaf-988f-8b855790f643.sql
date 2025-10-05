-- Create waiting rooms table
CREATE TABLE public.telehealth_waiting_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  session_id TEXT NOT NULL,
  
  client_arrived_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  clinician_notified BOOLEAN NOT NULL DEFAULT FALSE,
  notification_time TIMESTAMP WITH TIME ZONE,
  
  client_admitted_time TIMESTAMP WITH TIME ZONE,
  admitted_by_clinician UUID REFERENCES auth.users(id),
  
  client_timed_out BOOLEAN NOT NULL DEFAULT FALSE,
  timeout_time TIMESTAMP WITH TIME ZONE,
  
  status TEXT NOT NULL DEFAULT 'Waiting' CHECK (status IN ('Waiting', 'Admitted', 'Timed Out', 'Left')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create messages table for waiting room
CREATE TABLE public.waiting_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waiting_room_id UUID NOT NULL REFERENCES public.telehealth_waiting_rooms(id) ON DELETE CASCADE,
  message_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  from_clinician BOOLEAN NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.telehealth_waiting_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_room_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for waiting rooms
CREATE POLICY "Clients can view their own waiting room"
  ON public.telehealth_waiting_rooms
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE 
        primary_therapist_id = auth.uid() OR
        psychiatrist_id = auth.uid() OR
        case_manager_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id AND a.clinician_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'administrator'::app_role)
  );

CREATE POLICY "Clinicians can manage waiting rooms"
  ON public.telehealth_waiting_rooms
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id AND a.clinician_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'administrator'::app_role)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_id AND a.clinician_id = auth.uid()
    ) OR
    has_role(auth.uid(), 'administrator'::app_role)
  );

CREATE POLICY "System can insert waiting rooms"
  ON public.telehealth_waiting_rooms
  FOR INSERT
  WITH CHECK (true);

-- RLS policies for messages
CREATE POLICY "Participants can view messages"
  ON public.waiting_room_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.telehealth_waiting_rooms wr
      JOIN public.appointments a ON a.id = wr.appointment_id
      WHERE wr.id = waiting_room_id AND (
        a.clinician_id = auth.uid() OR
        a.client_id IN (
          SELECT id FROM public.clients WHERE 
            primary_therapist_id = auth.uid() OR
            psychiatrist_id = auth.uid() OR
            case_manager_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.waiting_room_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.telehealth_waiting_rooms wr
      JOIN public.appointments a ON a.id = wr.appointment_id
      WHERE wr.id = waiting_room_id AND (
        a.clinician_id = auth.uid() OR
        a.client_id IN (
          SELECT id FROM public.clients WHERE 
            primary_therapist_id = auth.uid() OR
            psychiatrist_id = auth.uid() OR
            case_manager_id = auth.uid()
        )
      )
    )
  );

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_waiting_room_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_waiting_room_updated_at
  BEFORE UPDATE ON public.telehealth_waiting_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_waiting_room_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.telehealth_waiting_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waiting_room_messages;