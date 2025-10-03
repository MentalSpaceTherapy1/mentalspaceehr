-- Fix appointments trigger to use last_modified instead of updated_at
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;

-- Create function to update last_modified column
CREATE OR REPLACE FUNCTION public.update_last_modified_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.last_modified = NOW();
  NEW.last_modified_by = auth.uid();
  RETURN NEW;
END;
$$;

-- Add trigger for last_modified on appointments
CREATE TRIGGER update_appointments_last_modified
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_last_modified_column();

-- Create appointment change logs table
CREATE TABLE public.appointment_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL CHECK (action IN ('create', 'update', 'reschedule', 'recurrence_update', 'status_change', 'cancel')),
  old_values jsonb,
  new_values jsonb,
  reason text
);

-- Enable RLS on appointment_change_logs
ALTER TABLE public.appointment_change_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Authorized staff can view change logs
CREATE POLICY "Authorized staff can view change logs"
ON public.appointment_change_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.appointments
    WHERE appointments.id = appointment_change_logs.appointment_id
    AND (
      appointments.clinician_id = auth.uid()
      OR has_role(auth.uid(), 'administrator'::app_role)
      OR has_role(auth.uid(), 'supervisor'::app_role)
      OR has_role(auth.uid(), 'front_desk'::app_role)
    )
  )
);

-- Create logging trigger function
CREATE OR REPLACE FUNCTION public.log_appointment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  change_action text;
  change_reason text;
BEGIN
  -- Determine action type
  IF (TG_OP = 'INSERT') THEN
    change_action := 'create';
    INSERT INTO public.appointment_change_logs (
      appointment_id,
      changed_by,
      action,
      new_values
    ) VALUES (
      NEW.id,
      auth.uid(),
      change_action,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Determine specific update action
    IF (OLD.status != NEW.status AND NEW.status = 'Cancelled') THEN
      change_action := 'cancel';
      change_reason := NEW.cancellation_reason;
    ELSIF (OLD.appointment_date != NEW.appointment_date OR OLD.start_time != NEW.start_time OR OLD.end_time != NEW.end_time) THEN
      change_action := 'reschedule';
    ELSIF (OLD.recurrence_pattern IS DISTINCT FROM NEW.recurrence_pattern) THEN
      change_action := 'recurrence_update';
    ELSIF (OLD.status != NEW.status) THEN
      change_action := 'status_change';
    ELSE
      change_action := 'update';
    END IF;
    
    INSERT INTO public.appointment_change_logs (
      appointment_id,
      changed_by,
      action,
      old_values,
      new_values,
      reason
    ) VALUES (
      NEW.id,
      auth.uid(),
      change_action,
      to_jsonb(OLD),
      to_jsonb(NEW),
      change_reason
    );
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add logging trigger to appointments
CREATE TRIGGER log_appointment_changes_trigger
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.log_appointment_changes();

-- Prevent appointment deletions
CREATE OR REPLACE FUNCTION public.prevent_appointment_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Deleting appointments is not allowed. Please cancel the appointment instead.';
END;
$$;

CREATE TRIGGER prevent_appointment_deletion_trigger
BEFORE DELETE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_appointment_deletion();