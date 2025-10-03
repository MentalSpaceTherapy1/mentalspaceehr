-- Fix search_path for prevent_appointment_deletion function
CREATE OR REPLACE FUNCTION public.prevent_appointment_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Deleting appointments is not allowed. Please cancel the appointment instead.';
END;
$$;