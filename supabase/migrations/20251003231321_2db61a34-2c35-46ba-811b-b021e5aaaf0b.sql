-- Drop ALL triggers that might be trying to update updated_at
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
DROP TRIGGER IF EXISTS set_updated_at ON public.appointments;
DROP TRIGGER IF EXISTS handle_updated_at ON public.appointments;

-- Ensure our correct trigger exists
DROP TRIGGER IF EXISTS update_appointments_last_modified ON public.appointments;

CREATE TRIGGER update_appointments_last_modified
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_last_modified_column();