-- Set require_consent to false by default (user request)
UPDATE public.practice_settings 
SET telehealth_settings = jsonb_set(
  COALESCE(telehealth_settings, '{}'::jsonb),
  '{require_consent}',
  'false'::jsonb
)
WHERE telehealth_settings IS NOT NULL OR telehealth_settings IS NULL;