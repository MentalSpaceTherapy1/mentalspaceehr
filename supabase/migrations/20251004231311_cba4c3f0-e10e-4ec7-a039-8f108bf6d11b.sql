-- Add missing fields to treatment_plans table
ALTER TABLE treatment_plans 
  ADD COLUMN IF NOT EXISTS supervisor_signature TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_comments TEXT,
  ADD COLUMN IF NOT EXISTS client_signature TEXT,
  ADD COLUMN IF NOT EXISTS digital_signature TEXT;