-- Add missing fields to appointment_waitlist table
ALTER TABLE public.appointment_waitlist 
ADD COLUMN IF NOT EXISTS alternate_clinician_ids UUID[],
ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notified_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduled_appointment_id UUID REFERENCES public.appointments(id);

-- Update status enum to match requirements
ALTER TABLE public.appointment_waitlist 
ALTER COLUMN status TYPE TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_waitlist_active_priority 
ON public.appointment_waitlist(status, priority, added_date) 
WHERE status = 'Active';

-- Function to find matching appointment slots
CREATE OR REPLACE FUNCTION public.find_matching_slots(
  _waitlist_id UUID
)
RETURNS TABLE (
  appointment_date DATE,
  start_time TIME,
  end_time TIME,
  clinician_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function will be called by edge function to find available slots
  RETURN QUERY
  SELECT DISTINCT
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.clinician_id
  FROM appointments a
  INNER JOIN appointment_waitlist w ON w.id = _waitlist_id
  WHERE a.status = 'Cancelled'
    AND a.clinician_id = ANY(COALESCE(w.alternate_clinician_ids, ARRAY[]::UUID[]) || ARRAY[w.clinician_id])
    AND a.appointment_type = w.appointment_type
    AND EXTRACT(DOW FROM a.appointment_date)::TEXT = ANY(w.preferred_days)
    AND a.appointment_date > CURRENT_DATE
  ORDER BY a.appointment_date, a.start_time
  LIMIT 10;
END;
$$;