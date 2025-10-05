-- Add portal management columns to practice_settings
ALTER TABLE public.practice_settings
ADD COLUMN IF NOT EXISTS portal_email_templates jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS portal_settings jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.practice_settings.portal_email_templates IS 'Email templates for portal invitations and password resets';
COMMENT ON COLUMN public.practice_settings.portal_settings IS 'Security and configuration settings for client portal';
