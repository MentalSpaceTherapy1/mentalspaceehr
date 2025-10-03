-- Create appointments table
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  clinician_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  
  -- Date/Time
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration integer NOT NULL, -- minutes
  timezone text NOT NULL DEFAULT 'America/New_York',
  
  -- Appointment Details
  appointment_type text NOT NULL CHECK (appointment_type IN (
    'Initial Evaluation', 'Individual Therapy', 'Couples Therapy', 'Family Therapy',
    'Group Therapy', 'Medication Management', 'Testing', 'Consultation', 'Crisis',
    'Telehealth', 'Other'
  )),
  service_location text NOT NULL CHECK (service_location IN (
    'Office', 'Telehealth', 'Home Visit', 'School', 'Other'
  )),
  office_location_id uuid REFERENCES public.practice_locations(id),
  room text,
  
  -- Status
  status text NOT NULL DEFAULT 'Scheduled' CHECK (status IN (
    'Scheduled', 'Confirmed', 'Checked In', 'In Session', 'Completed',
    'No Show', 'Cancelled', 'Rescheduled'
  )),
  status_updated_date timestamp with time zone DEFAULT now(),
  status_updated_by uuid REFERENCES public.profiles(id),
  
  -- Cancellation Details
  cancellation_date timestamp with time zone,
  cancellation_reason text CHECK (cancellation_reason IN (
    'Client Request', 'Provider Cancellation', 'Emergency', 'Insurance Issue',
    'Weather', 'Other'
  )),
  cancellation_notes text,
  cancelled_by uuid REFERENCES public.profiles(id),
  cancellation_fee_applied boolean DEFAULT false,
  
  -- No Show
  no_show_date timestamp with time zone,
  no_show_fee_applied boolean DEFAULT false,
  no_show_notes text,
  
  -- Check-in/Check-out
  checked_in_time timestamp with time zone,
  checked_in_by uuid REFERENCES public.profiles(id),
  checked_out_time timestamp with time zone,
  checked_out_by uuid REFERENCES public.profiles(id),
  actual_duration integer, -- minutes
  
  -- Billing
  cpt_code text,
  icd_codes text[],
  charge_amount numeric(10, 2),
  billing_status text NOT NULL DEFAULT 'Not Billed' CHECK (billing_status IN (
    'Not Billed', 'Pending', 'Billed', 'Paid', 'Denied'
  )),
  
  -- Reminders
  reminders_sent jsonb DEFAULT '{"emailSent": false, "smsSent": false}'::jsonb,
  
  -- Recurring Appointments
  is_recurring boolean DEFAULT false,
  recurrence_pattern jsonb,
  parent_recurrence_id uuid REFERENCES public.appointments(id),
  
  -- Notes
  appointment_notes text,
  client_notes text,
  
  -- Telehealth
  telehealth_link text,
  telehealth_platform text CHECK (telehealth_platform IN (
    'Internal', 'Zoom', 'Doxy.me', 'Other'
  )),
  
  -- Metadata
  created_date timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  last_modified timestamp with time zone DEFAULT now(),
  last_modified_by uuid REFERENCES public.profiles(id)
);

-- Create waitlist table
CREATE TABLE public.appointment_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  clinician_id uuid REFERENCES public.profiles(id),
  appointment_type text NOT NULL,
  preferred_days text[],
  preferred_times text[],
  notes text,
  priority text DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Contacted', 'Scheduled', 'Removed')),
  added_date timestamp with time zone DEFAULT now(),
  added_by uuid REFERENCES public.profiles(id),
  contacted_date timestamp with time zone,
  contacted_by uuid REFERENCES public.profiles(id),
  removed_date timestamp with time zone,
  removed_reason text
);

-- Create blocked times table for PTO, meetings, etc.
CREATE TABLE public.blocked_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_date date NOT NULL,
  start_time time NOT NULL,
  end_date date NOT NULL,
  end_time time NOT NULL,
  block_type text NOT NULL CHECK (block_type IN (
    'PTO', 'Meeting', 'Lunch', 'Training', 'Personal', 'Holiday', 'Other'
  )),
  notes text,
  is_recurring boolean DEFAULT false,
  recurrence_pattern jsonb,
  created_date timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- Create indexes for performance
CREATE INDEX idx_appointments_client ON public.appointments(client_id);
CREATE INDEX idx_appointments_clinician ON public.appointments(clinician_id);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_date_clinician ON public.appointments(appointment_date, clinician_id);
CREATE INDEX idx_waitlist_client ON public.appointment_waitlist(client_id);
CREATE INDEX idx_waitlist_status ON public.appointment_waitlist(status);
CREATE INDEX idx_blocked_times_clinician ON public.blocked_times(clinician_id);
CREATE INDEX idx_blocked_times_dates ON public.blocked_times(start_date, end_date);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_times ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointments
CREATE POLICY "Users can view appointments they're involved in"
  ON public.appointments FOR SELECT
  USING (
    clinician_id = auth.uid()
    OR client_id IN (
      SELECT id FROM public.clients
      WHERE primary_therapist_id = auth.uid()
        OR psychiatrist_id = auth.uid()
        OR case_manager_id = auth.uid()
    )
    OR has_role(auth.uid(), 'administrator')
    OR has_role(auth.uid(), 'supervisor')
    OR has_role(auth.uid(), 'front_desk')
  );

CREATE POLICY "Authorized staff can manage appointments"
  ON public.appointments FOR ALL
  USING (
    has_role(auth.uid(), 'administrator')
    OR has_role(auth.uid(), 'front_desk')
    OR clinician_id = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'administrator')
    OR has_role(auth.uid(), 'front_desk')
    OR clinician_id = auth.uid()
  );

-- RLS Policies for waitlist
CREATE POLICY "Users can view relevant waitlist entries"
  ON public.appointment_waitlist FOR SELECT
  USING (
    clinician_id = auth.uid()
    OR has_role(auth.uid(), 'administrator')
    OR has_role(auth.uid(), 'front_desk')
  );

CREATE POLICY "Authorized staff can manage waitlist"
  ON public.appointment_waitlist FOR ALL
  USING (
    has_role(auth.uid(), 'administrator')
    OR has_role(auth.uid(), 'front_desk')
  )
  WITH CHECK (
    has_role(auth.uid(), 'administrator')
    OR has_role(auth.uid(), 'front_desk')
  );

-- RLS Policies for blocked times
CREATE POLICY "Users can view blocked times"
  ON public.blocked_times FOR SELECT
  USING (
    clinician_id = auth.uid()
    OR has_role(auth.uid(), 'administrator')
    OR has_role(auth.uid(), 'front_desk')
  );

CREATE POLICY "Users can manage own blocked times"
  ON public.blocked_times FOR ALL
  USING (
    clinician_id = auth.uid()
    OR has_role(auth.uid(), 'administrator')
  )
  WITH CHECK (
    clinician_id = auth.uid()
    OR has_role(auth.uid(), 'administrator')
  );

-- Create trigger to update last_modified
CREATE TRIGGER update_appointments_modified
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to prevent double-booking
CREATE OR REPLACE FUNCTION public.check_appointment_conflict()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_appointment_conflicts
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_appointment_conflict();