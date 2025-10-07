-- Create clinician_schedules table
CREATE TABLE IF NOT EXISTS public.clinician_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Weekly Schedule (JSONB structure)
  weekly_schedule JSONB NOT NULL DEFAULT '{
    "monday": {"isWorkingDay": false, "shifts": [], "breakTimes": []},
    "tuesday": {"isWorkingDay": false, "shifts": [], "breakTimes": []},
    "wednesday": {"isWorkingDay": false, "shifts": [], "breakTimes": []},
    "thursday": {"isWorkingDay": false, "shifts": [], "breakTimes": []},
    "friday": {"isWorkingDay": false, "shifts": [], "breakTimes": []},
    "saturday": {"isWorkingDay": false, "shifts": [], "breakTimes": []},
    "sunday": {"isWorkingDay": false, "shifts": [], "breakTimes": []}
  }'::JSONB,
  
  -- Availability Settings
  accept_new_clients BOOLEAN DEFAULT true,
  max_appointments_per_day INTEGER,
  max_appointments_per_week INTEGER,
  buffer_time_between_appointments INTEGER DEFAULT 0, -- minutes
  
  -- Locations
  available_locations UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Effective Dates
  effective_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_end_date DATE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Ensure only one active schedule per clinician
  UNIQUE(clinician_id, effective_start_date)
);

-- Create schedule_exceptions table
CREATE TABLE IF NOT EXISTS public.schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Exception Details
  exception_type TEXT NOT NULL CHECK (exception_type IN (
    'Time Off', 'Holiday', 'Conference', 'Training', 'Modified Hours', 'Emergency', 'Other'
  )),
  
  -- Date/Time Range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN DEFAULT true,
  
  -- Reason and Notes
  reason TEXT NOT NULL,
  notes TEXT,
  
  -- Approval Workflow
  status TEXT NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested', 'Approved', 'Denied')),
  approved_by UUID REFERENCES auth.users(id),
  approval_date TIMESTAMP WITH TIME ZONE,
  denial_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Validation
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable RLS
ALTER TABLE public.clinician_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clinician_schedules
CREATE POLICY "Users can view their own schedule"
  ON public.clinician_schedules
  FOR SELECT
  USING (clinician_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'front_desk'::app_role));

CREATE POLICY "Users can manage their own schedule"
  ON public.clinician_schedules
  FOR ALL
  USING (clinician_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role))
  WITH CHECK (clinician_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role));

-- RLS Policies for schedule_exceptions
CREATE POLICY "Users can view their own exceptions"
  ON public.schedule_exceptions
  FOR SELECT
  USING (clinician_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Users can create their own exceptions"
  ON public.schedule_exceptions
  FOR INSERT
  WITH CHECK (clinician_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Users can update their own pending exceptions"
  ON public.schedule_exceptions
  FOR UPDATE
  USING (clinician_id = auth.uid() AND status = 'Requested')
  WITH CHECK (clinician_id = auth.uid() AND status = 'Requested');

CREATE POLICY "Admins can manage all exceptions"
  ON public.schedule_exceptions
  FOR ALL
  USING (has_role(auth.uid(), 'administrator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

-- Create function to validate appointment against schedule
CREATE OR REPLACE FUNCTION public.validate_appointment_schedule(
  p_clinician_id UUID,
  p_appointment_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS TABLE(
  is_valid BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_name TEXT;
  v_schedule JSONB;
  v_day_schedule JSONB;
  v_shift JSONB;
  v_is_working_day BOOLEAN;
  v_shift_found BOOLEAN := false;
  v_exception RECORD;
BEGIN
  -- Get day of week name
  v_day_name := lower(to_char(p_appointment_date, 'Day'));
  v_day_name := trim(v_day_name);
  
  -- Check for exceptions first
  SELECT * INTO v_exception
  FROM schedule_exceptions
  WHERE clinician_id = p_clinician_id
    AND p_appointment_date BETWEEN start_date AND end_date
    AND status = 'Approved'
    AND (all_day = true OR (p_start_time >= start_time AND p_end_time <= end_time))
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT false, 'Clinician has approved time off: ' || v_exception.reason;
    RETURN;
  END IF;
  
  -- Get clinician schedule
  SELECT weekly_schedule INTO v_schedule
  FROM clinician_schedules
  WHERE clinician_id = p_clinician_id
    AND p_appointment_date >= effective_start_date
    AND (effective_end_date IS NULL OR p_appointment_date <= effective_end_date)
  ORDER BY effective_start_date DESC
  LIMIT 1;
  
  -- If no schedule found, allow appointment (backward compatibility)
  IF v_schedule IS NULL THEN
    RETURN QUERY SELECT true, 'No schedule configured - allowing appointment'::TEXT;
    RETURN;
  END IF;
  
  -- Get day schedule
  v_day_schedule := v_schedule -> v_day_name;
  v_is_working_day := (v_day_schedule ->> 'isWorkingDay')::BOOLEAN;
  
  -- Check if working day
  IF NOT v_is_working_day THEN
    RETURN QUERY SELECT false, 'Clinician is not scheduled to work on ' || v_day_name || 's';
    RETURN;
  END IF;
  
  -- Check if time falls within any shift
  FOR v_shift IN SELECT * FROM jsonb_array_elements(v_day_schedule -> 'shifts')
  LOOP
    IF p_start_time >= (v_shift ->> 'startTime')::TIME 
       AND p_end_time <= (v_shift ->> 'endTime')::TIME THEN
      v_shift_found := true;
      EXIT;
    END IF;
  END LOOP;
  
  IF NOT v_shift_found THEN
    RETURN QUERY SELECT false, 'Appointment time is outside clinician working hours';
    RETURN;
  END IF;
  
  -- If we made it here, appointment is valid
  RETURN QUERY SELECT true, 'Appointment time is valid'::TEXT;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_clinician_schedules_clinician ON public.clinician_schedules(clinician_id);
CREATE INDEX idx_clinician_schedules_dates ON public.clinician_schedules(effective_start_date, effective_end_date);
CREATE INDEX idx_schedule_exceptions_clinician ON public.schedule_exceptions(clinician_id);
CREATE INDEX idx_schedule_exceptions_dates ON public.schedule_exceptions(start_date, end_date);
CREATE INDEX idx_schedule_exceptions_status ON public.schedule_exceptions(status);

-- Create updated_at trigger for clinician_schedules
CREATE TRIGGER update_clinician_schedules_updated_at
  BEFORE UPDATE ON public.clinician_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for schedule_exceptions
CREATE TRIGGER update_schedule_exceptions_updated_at
  BEFORE UPDATE ON public.schedule_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();