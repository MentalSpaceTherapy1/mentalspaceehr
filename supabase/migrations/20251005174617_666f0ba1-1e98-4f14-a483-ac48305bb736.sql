-- Add require_consent to telehealth_settings
UPDATE public.practice_settings 
SET telehealth_settings = jsonb_set(
  COALESCE(telehealth_settings, '{}'::jsonb),
  '{require_consent}',
  'true'::jsonb
)
WHERE telehealth_settings IS NOT NULL OR telehealth_settings IS NULL;