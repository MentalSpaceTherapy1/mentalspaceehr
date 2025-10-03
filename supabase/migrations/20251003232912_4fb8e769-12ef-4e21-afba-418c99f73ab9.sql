-- 1) Remove obsolete trigger if it exists
DROP TRIGGER IF EXISTS update_appointments_modified ON public.appointments;

-- 2) Allow authorized staff to insert change logs (defense-in-depth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'appointment_change_logs'
      AND policyname = 'Authorized staff can insert change logs'
  ) THEN
    CREATE POLICY "Authorized staff can insert change logs"
    ON public.appointment_change_logs
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.appointments a
        WHERE a.id = appointment_id
          AND (
            a.clinician_id = auth.uid()
            OR has_role(auth.uid(), 'administrator')
            OR has_role(auth.uid(), 'supervisor')
            OR has_role(auth.uid(), 'front_desk')
          )
      )
    );
  END IF;
END $$;