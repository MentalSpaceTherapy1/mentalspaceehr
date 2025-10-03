-- Fix search_path for check_appointment_conflict function by recreating it properly
DROP TRIGGER IF EXISTS prevent_appointment_conflicts ON public.appointments;
DROP FUNCTION IF EXISTS public.check_appointment_conflict();

CREATE OR REPLACE FUNCTION public.check_appointment_conflict()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for conflicts with existing appointments
  IF EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND clinician_id = NEW.clinician_id
      AND appointment_date = NEW.appointment_date
      AND status NOT IN ('Cancelled', 'No Show', 'Rescheduled')
      AND (
        (NEW.start_time >= start_time AND NEW.start_time < end_time)
        OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
        OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
      )
  ) THEN
    RAISE EXCEPTION 'Appointment conflict detected for this clinician at the specified time';
  END IF;
  
  -- Check for conflicts with blocked times
  IF EXISTS (
    SELECT 1 FROM public.blocked_times
    WHERE clinician_id = NEW.clinician_id
      AND NEW.appointment_date BETWEEN start_date AND end_date
      AND (
        (NEW.start_time >= start_time AND NEW.start_time < end_time)
        OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
        OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
      )
  ) THEN
    RAISE EXCEPTION 'Cannot schedule appointment during blocked time';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER prevent_appointment_conflicts
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_appointment_conflict();