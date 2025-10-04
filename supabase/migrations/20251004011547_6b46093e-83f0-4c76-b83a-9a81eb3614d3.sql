-- Create appointment_notifications table for logging
CREATE TABLE public.appointment_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('created', 'updated', 'cancelled')),
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  resend_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.appointment_notifications ENABLE ROW LEVEL SECURITY;

-- Staff can view notification logs for appointments they can access
CREATE POLICY "Staff can view notification logs"
ON public.appointment_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments
    WHERE appointments.id = appointment_notifications.appointment_id
    AND (
      appointments.clinician_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
      OR has_role(auth.uid(), 'front_desk')
    )
  )
);

-- System can insert notification logs
CREATE POLICY "System can insert notification logs"
ON public.appointment_notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_appointment_notifications_appointment_id ON public.appointment_notifications(appointment_id);
CREATE INDEX idx_appointment_notifications_status ON public.appointment_notifications(status);