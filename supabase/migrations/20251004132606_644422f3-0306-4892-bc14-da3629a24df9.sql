-- Create service_codes table
CREATE TABLE IF NOT EXISTS public.service_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  default_modifiers TEXT,
  duration_minutes INTEGER,
  standard_rate NUMERIC(10, 2),
  is_addon BOOLEAN NOT NULL DEFAULT false,
  include_in_claims BOOLEAN NOT NULL DEFAULT true,
  is_default_for_type BOOLEAN NOT NULL DEFAULT false,
  time_units_billing TEXT NOT NULL DEFAULT 'per_session',
  time_units_minutes INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(code, default_modifiers)
);

-- Enable RLS
ALTER TABLE public.service_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view service codes"
ON public.service_codes
FOR SELECT
TO authenticated
USING (is_active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Administrators can manage service codes"
ON public.service_codes
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'administrator'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_service_codes_updated_at
BEFORE UPDATE ON public.service_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_service_codes_type ON public.service_codes(service_type);
CREATE INDEX idx_service_codes_code ON public.service_codes(code);
CREATE INDEX idx_service_codes_active ON public.service_codes(is_active);

-- Insert default service codes from the images
INSERT INTO public.service_codes (service_type, code, description, duration_minutes, standard_rate, default_modifiers, is_addon) VALUES
('Therapy Intake', '021701', 'Private Pay - Therapy Intake', 60, 100.00, NULL, false),
('Therapy Intake', '021702', 'Subscription Private Pay - Therapy Intake', 60, 75.00, NULL, false),
('Therapy Intake', '90791', 'Psychiatric Diagnostic Evaluation', NULL, 134.65, NULL, false),
('Therapy Intake', '96156', 'H&B Assessment or reassessment (60 minutes)', NULL, 134.00, NULL, false),
('Therapy Intake', '+90785', 'Interactive Complexity Add-on (Intake)', NULL, 18.00, NULL, true),
('Therapy Intake', '+90840', 'Crisis Intervention Add-On', NULL, 65.00, NULL, true),
('Therapy Session', '90834', 'Psychotherapy, 45 min', NULL, 78.70, NULL, false),
('Therapy Session', '021703', 'Private Pay - Therapy Session', 60, 100.00, NULL, false),
('Therapy Session', '021704', 'Subscription Private Pay - 30 Min Therapy Session', 30, 49.99, NULL, false),
('Therapy Session', '90832', 'EAP Individual Therapy 30 - 37 Minutes', 30, 60.00, 'HJ', false),
('Therapy Session', '90837', 'Psychotherapy, 60 min', 60, 133.58, NULL, false),
('Therapy Session', '90839', 'Psychotherapy Crisis', NULL, 145.00, NULL, false),
('Therapy Session', '90846', 'Family Therapy w/o Client', NULL, 104.00, NULL, false),
('Therapy Session', '90847', 'Family Therapy w/ Client', NULL, 110.00, NULL, false),
('Therapy Session', '90853', 'Group Therapy', 30, 40.00, 'HJ', false),
('Therapy Session', '96158', 'H&B Intervention individual, 30 minutes', 30, 60.00, NULL, false),
('Therapy Session', '99404', 'Therapy Session', 60, 133.00, NULL, false),
('Therapy Session', 'H0004', 'Family Counseling', NULL, NULL, NULL, false),
('Therapy Session', 'H2011', 'Crisis Intervention', NULL, 38.00, NULL, false),
('Therapy Session', 'H2014', 'Family Training', NULL, NULL, NULL, false),
('Therapy Session', 'H2015', 'Comprehensive Community Support Services CSS', NULL, NULL, NULL, false),
('Therapy Session', '+90785', 'Interactive Complexity Add-on (Session)', NULL, 18.00, NULL, true),
('Therapy Session', '+90840', 'Psychotherapy Crisis 30 Minutes Add-On', NULL, 65.00, NULL, true),
('Therapy Session', '+96159', 'H&B Intervention individual, add on 15 minutes', NULL, 20.00, NULL, true),
('Therapy Session', '+99354', 'Psychotherapy 30 Minutes After First Hour', NULL, 145.00, NULL, true),
('Therapy Session', '+99355', 'Psychotherapy 30 Minutes Add-On After 99354', NULL, 105.00, NULL, true),
('Group Therapy', '90853', 'Group Therapy', NULL, 35.35, NULL, false),
('Psychological Evaluation', '96136', 'Psychological test administration and scoring, first 30m', NULL, 46.67, NULL, false),
('Psychological Evaluation', '+96137', 'Psychological test administration and scoring, add 30m', NULL, 43.13, NULL, true),
('Consultation', '90000', 'Consultation - Coaching', NULL, 75.00, NULL, false),
('Consultation', '90001', 'Consultation Intake - Coaching', 60, NULL, NULL, false);