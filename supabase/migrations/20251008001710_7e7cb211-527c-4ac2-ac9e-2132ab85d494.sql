-- Add SMS tracking fields to reminder_logs table
ALTER TABLE public.reminder_logs 
ADD COLUMN IF NOT EXISTS external_id text,
ADD COLUMN IF NOT EXISTS delivery_status text;