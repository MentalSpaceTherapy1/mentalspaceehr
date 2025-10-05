-- Add telehealth_settings to practice_settings table
ALTER TABLE public.practice_settings 
ADD COLUMN IF NOT EXISTS telehealth_settings JSONB DEFAULT jsonb_build_object(
  'enforce_state_licensure', false,
  'require_bandwidth_test', true,
  'auto_record_sessions', false,
  'session_timeout_minutes', 120,
  'consent_renewal_reminder_days', 30,
  'max_participants', 10
);