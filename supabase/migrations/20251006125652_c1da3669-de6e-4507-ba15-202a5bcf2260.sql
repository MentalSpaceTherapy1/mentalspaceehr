-- Create payroll_sessions table
CREATE TABLE public.payroll_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id UUID NOT NULL REFERENCES public.profiles(id),
  
  session_date DATE NOT NULL,
  session_start_time TIME NOT NULL,
  session_end_time TIME NOT NULL,
  session_duration INTEGER NOT NULL, -- minutes
  
  client_id UUID NOT NULL REFERENCES public.clients(id),
  appointment_id UUID REFERENCES public.appointments(id),
  
  session_type TEXT NOT NULL CHECK (session_type IN ('Individual', 'Couples', 'Family', 'Group', 'Evaluation', 'Other')),
  
  -- Payroll
  payroll_rate NUMERIC NOT NULL,
  payroll_amount NUMERIC NOT NULL,
  
  -- If salaried
  is_salaried BOOLEAN NOT NULL DEFAULT false,
  count_toward_productivity BOOLEAN NOT NULL DEFAULT true,
  
  -- Status
  session_completed BOOLEAN NOT NULL DEFAULT false,
  note_completed BOOLEAN NOT NULL DEFAULT false,
  note_signed BOOLEAN NOT NULL DEFAULT false,
  approved_for_payroll BOOLEAN NOT NULL DEFAULT false,
  approved_date DATE,
  approved_by UUID REFERENCES public.profiles(id),
  
  -- Billing
  billed_amount NUMERIC,
  paid_amount NUMERIC,
  
  -- Payroll Period
  payroll_period_id UUID,
  payroll_period_start_date DATE NOT NULL,
  payroll_period_end_date DATE NOT NULL,
  
  -- Payment
  paid BOOLEAN NOT NULL DEFAULT false,
  payment_date DATE,
  payment_check_number TEXT,
  
  notes TEXT,
  
  created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on payroll_sessions
ALTER TABLE public.payroll_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payroll_sessions
CREATE POLICY "Clinicians can view their own payroll sessions"
ON public.payroll_sessions
FOR SELECT
TO authenticated
USING (
  clinician_id = auth.uid() OR
  has_role(auth.uid(), 'administrator') OR
  has_role(auth.uid(), 'supervisor')
);

CREATE POLICY "Administrators can manage all payroll sessions"
ON public.payroll_sessions
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'administrator')
)
WITH CHECK (
  has_role(auth.uid(), 'administrator')
);

CREATE POLICY "System can create payroll sessions"
ON public.payroll_sessions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_payroll_sessions_clinician ON public.payroll_sessions(clinician_id);
CREATE INDEX idx_payroll_sessions_date ON public.payroll_sessions(session_date);
CREATE INDEX idx_payroll_sessions_period ON public.payroll_sessions(payroll_period_start_date, payroll_period_end_date);
CREATE INDEX idx_payroll_sessions_approved ON public.payroll_sessions(approved_for_payroll);

-- Create payroll_summaries table
CREATE TABLE public.payroll_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id UUID NOT NULL REFERENCES public.profiles(id),
  
  payroll_period_id TEXT NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  
  -- Sessions
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_hours NUMERIC NOT NULL DEFAULT 0,
  
  -- Session Breakdown (JSONB)
  session_breakdown JSONB NOT NULL DEFAULT '{
    "individual": {"count": 0, "hours": 0},
    "couples": {"count": 0, "hours": 0},
    "family": {"count": 0, "hours": 0},
    "group": {"count": 0, "hours": 0},
    "evaluation": {"count": 0, "hours": 0}
  }'::jsonb,
  
  -- Earnings
  total_earnings NUMERIC NOT NULL DEFAULT 0,
  
  -- Adjustments
  bonuses NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  
  net_earnings NUMERIC NOT NULL DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending Approval', 'Approved', 'Paid')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_date DATE,
  
  -- Payment
  paid_date DATE,
  payment_method TEXT NOT NULL DEFAULT 'Check' CHECK (payment_method IN ('Check', 'Direct Deposit', 'Other')),
  check_number TEXT,
  
  generated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on payroll_summaries
ALTER TABLE public.payroll_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payroll_summaries
CREATE POLICY "Clinicians can view their own payroll summaries"
ON public.payroll_summaries
FOR SELECT
TO authenticated
USING (
  clinician_id = auth.uid() OR
  has_role(auth.uid(), 'administrator') OR
  has_role(auth.uid(), 'supervisor')
);

CREATE POLICY "Administrators can manage all payroll summaries"
ON public.payroll_summaries
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'administrator')
)
WITH CHECK (
  has_role(auth.uid(), 'administrator')
);

-- Create indexes
CREATE INDEX idx_payroll_summaries_clinician ON public.payroll_summaries(clinician_id);
CREATE INDEX idx_payroll_summaries_period ON public.payroll_summaries(period_start_date, period_end_date);
CREATE INDEX idx_payroll_summaries_status ON public.payroll_summaries(status);

-- Create unique constraint on clinician and period
CREATE UNIQUE INDEX idx_payroll_summaries_clinician_period ON public.payroll_summaries(clinician_id, payroll_period_id);