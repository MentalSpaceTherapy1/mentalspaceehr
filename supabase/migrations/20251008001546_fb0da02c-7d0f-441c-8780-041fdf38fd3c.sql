-- Add SMS consent to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS sms_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_opt_out_date timestamp with time zone;