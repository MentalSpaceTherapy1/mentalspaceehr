-- Add missing fields to client_insurance table
ALTER TABLE public.client_insurance
ADD COLUMN IF NOT EXISTS subscriber_ssn text,
ADD COLUMN IF NOT EXISTS front_card_image text,
ADD COLUMN IF NOT EXISTS back_card_image text;