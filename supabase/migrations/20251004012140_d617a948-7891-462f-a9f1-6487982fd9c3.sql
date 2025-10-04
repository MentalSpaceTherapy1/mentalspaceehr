-- Create appointment_notification_settings table
CREATE TABLE public.appointment_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_id UUID,
  
  -- Enable/disable notifications by type
  send_on_create BOOLEAN NOT NULL DEFAULT true,
  send_on_update BOOLEAN NOT NULL DEFAULT true,
  send_on_cancel BOOLEAN NOT NULL DEFAULT true,
  
  -- Email templates
  created_subject TEXT NOT NULL DEFAULT 'Appointment Scheduled - {date}',
  created_template TEXT NOT NULL DEFAULT 'Dear {client_name}, your appointment has been scheduled for {date} at {time} with {clinician_name}.',
  
  updated_subject TEXT NOT NULL DEFAULT 'Appointment Updated - {date}',
  updated_template TEXT NOT NULL DEFAULT 'Dear {client_name}, your appointment has been updated. New date: {date} at {time} with {clinician_name}.',
  
  cancelled_subject TEXT NOT NULL DEFAULT 'Appointment Cancelled - {date}',
  cancelled_template TEXT NOT NULL DEFAULT 'Dear {client_name}, your appointment on {date} at {time} with {clinician_name} has been cancelled.',
  
  -- Include client preferences check
  respect_client_preferences BOOLEAN NOT NULL DEFAULT true,
  
  -- Notification recipients (jsonb array: ['client', 'clinician', 'staff'])
  notify_recipients JSONB NOT NULL DEFAULT '["client"]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.appointment_notification_settings ENABLE ROW LEVEL SECURITY;

-- Only administrators can manage notification settings
CREATE POLICY "Administrators can manage notification settings"
ON public.appointment_notification_settings
FOR ALL
USING (has_role(auth.uid(), 'administrator'))
WITH CHECK (has_role(auth.uid(), 'administrator'));

-- All authenticated users can view settings
CREATE POLICY "All users can view notification settings"
ON public.appointment_notification_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create trigger to update updated_at
CREATE TRIGGER update_appointment_notification_settings_updated_at
BEFORE UPDATE ON public.appointment_notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();