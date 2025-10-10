
-- Drop the old constraint
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_telehealth_platform_check;

-- Add new constraint that includes Twilio
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_telehealth_platform_check 
CHECK (telehealth_platform IN ('Internal', 'Twilio', 'Zoom', 'Doxy.me', 'Other'));
