-- Drop the old cancellation reason constraint
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_cancellation_reason_check;

-- Add new constraint with all cancellation reasons used in the application
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_cancellation_reason_check 
CHECK (
  cancellation_reason IS NULL OR 
  cancellation_reason IN (
    'Client Request',
    'Client No Show',
    'Provider Cancellation',
    'Emergency',
    'Insurance Issue',
    'Weather',
    'No Transportation',
    'Transportation Issue',
    'Illness',
    'Schedule Conflict',
    'Feeling Better',
    'Financial Reasons',
    'Other'
  )
);