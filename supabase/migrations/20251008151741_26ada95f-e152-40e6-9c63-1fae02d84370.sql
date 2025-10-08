-- Ensure clinicians receive notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.appointment_notification_settings) THEN
    UPDATE public.appointment_notification_settings
    SET notify_recipients = (
      CASE
        WHEN EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(COALESCE(notify_recipients, '[]'::jsonb)) AS elem(value)
          WHERE value = 'clinician'
        ) THEN notify_recipients
        ELSE COALESCE(notify_recipients, '[]'::jsonb) || ' ["clinician"] '::jsonb
      END
    ),
    updated_at = now();
  ELSE
    INSERT INTO public.appointment_notification_settings (
      send_on_create, send_on_update, send_on_cancel, respect_client_preferences, notify_recipients
    ) VALUES (
      true, true, true, true, '["client","clinician"]'::jsonb
    );
  END IF;
END $$;