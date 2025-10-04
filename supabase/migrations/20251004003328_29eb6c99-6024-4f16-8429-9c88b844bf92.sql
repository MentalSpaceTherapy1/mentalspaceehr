-- Create reminder settings table
CREATE TABLE IF NOT EXISTS public.reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID REFERENCES public.practice_settings(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  email_timing INTEGER[] DEFAULT ARRAY[24, 1],
  email_template TEXT DEFAULT 'Hi {client_name}, this is a reminder about your appointment with {clinician_name} on {date} at {time}. Location: {location}. {telehealth_link}',
  sms_enabled BOOLEAN DEFAULT false,
  sms_timing INTEGER[] DEFAULT ARRAY[24, 1],
  sms_template TEXT DEFAULT 'Reminder: Appointment with {clinician_name} on {date} at {time}. {telehealth_link}',
  require_confirmation BOOLEAN DEFAULT false,
  include_reschedule_link BOOLEAN DEFAULT true,
  include_cancel_link BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reminder logs table
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('email', 'sms')),
  hours_before INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'confirmed')),
  sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  error_message TEXT,
  recipient TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add confirmation columns to appointments if not exists
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS reminder_confirmed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_confirmation_token TEXT;

-- Create index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_lookup 
  ON public.appointments(appointment_date, start_time, status, reminder_confirmed)
  WHERE status IN ('Scheduled', 'Confirmed');

CREATE INDEX IF NOT EXISTS idx_reminder_logs_appointment 
  ON public.reminder_logs(appointment_id, reminder_type, hours_before);

-- Enable RLS
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reminder_settings
CREATE POLICY "Admins can manage reminder settings"
  ON public.reminder_settings
  FOR ALL
  USING (has_role(auth.uid(), 'administrator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "All authenticated users can view reminder settings"
  ON public.reminder_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for reminder_logs
CREATE POLICY "Staff can view reminder logs"
  ON public.reminder_logs
  FOR SELECT
  USING (
    has_role(auth.uid(), 'administrator'::app_role) OR
    has_role(auth.uid(), 'front_desk'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = reminder_logs.appointment_id
      AND appointments.clinician_id = auth.uid()
    )
  );

CREATE POLICY "System can insert reminder logs"
  ON public.reminder_logs
  FOR INSERT
  WITH CHECK (true);

-- Function to generate confirmation token
CREATE OR REPLACE FUNCTION public.generate_confirmation_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;

-- Insert default reminder settings if none exist
INSERT INTO public.reminder_settings (practice_id, enabled, email_enabled, sms_enabled)
SELECT id, true, true, false
FROM public.practice_settings
WHERE NOT EXISTS (SELECT 1 FROM public.reminder_settings LIMIT 1)
LIMIT 1;