-- Create practice_settings table
CREATE TABLE IF NOT EXISTS public.practice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_name TEXT NOT NULL,
  dba TEXT,
  tax_id TEXT NOT NULL,
  npi_number TEXT NOT NULL,
  main_phone_number TEXT NOT NULL,
  fax_number TEXT,
  email_address TEXT NOT NULL,
  website TEXT,
  
  -- Physical Address
  street1 TEXT NOT NULL,
  street2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  county TEXT,
  
  -- Billing Address (optional, if different)
  billing_street1 TEXT,
  billing_street2 TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_zip_code TEXT,
  
  -- Business Hours (stored as JSONB)
  office_hours JSONB NOT NULL DEFAULT '{
    "monday": {"open": "09:00", "close": "17:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "17:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "17:00", "closed": false},
    "thursday": {"open": "09:00", "close": "17:00", "closed": false},
    "friday": {"open": "09:00", "close": "17:00", "closed": false},
    "saturday": {"open": "09:00", "close": "17:00", "closed": true},
    "sunday": {"open": "09:00", "close": "17:00", "closed": true}
  }'::jsonb,
  
  -- Compliance Settings
  note_due_days INTEGER DEFAULT 3,
  note_lockout_day TEXT DEFAULT 'Sunday',
  note_lockout_time TIME DEFAULT '23:59:59',
  require_supervisor_cosign BOOLEAN DEFAULT true,
  allow_note_correction_after_lockout BOOLEAN DEFAULT false,
  documentation_grace_period INTEGER,
  
  -- Clinical Settings
  default_appointment_duration INTEGER DEFAULT 50,
  default_session_types TEXT[] DEFAULT ARRAY['Individual Therapy', 'Family Therapy', 'Group Therapy'],
  requires_insurance_auth BOOLEAN DEFAULT false,
  
  -- Branding
  logo TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#10B981',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: Only one practice settings record allowed
  CONSTRAINT single_practice_settings CHECK (id = gen_random_uuid())
);

-- Create practice_locations table
CREATE TABLE IF NOT EXISTS public.practice_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_name TEXT NOT NULL,
  street1 TEXT NOT NULL,
  street2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  place_of_service_code TEXT DEFAULT '11',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.practice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_locations ENABLE ROW LEVEL SECURITY;

-- Administrators can view practice settings
CREATE POLICY "Administrators can view practice settings"
ON public.practice_settings
FOR SELECT
USING (has_role(auth.uid(), 'administrator'));

-- Administrators can update practice settings
CREATE POLICY "Administrators can update practice settings"
ON public.practice_settings
FOR UPDATE
USING (has_role(auth.uid(), 'administrator'));

-- Administrators can insert practice settings (if none exist)
CREATE POLICY "Administrators can insert practice settings"
ON public.practice_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'administrator'));

-- All authenticated users can view practice settings (for display purposes)
CREATE POLICY "All users can view practice settings"
ON public.practice_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Administrators can manage locations
CREATE POLICY "Administrators can manage locations"
ON public.practice_locations
FOR ALL
USING (has_role(auth.uid(), 'administrator'))
WITH CHECK (has_role(auth.uid(), 'administrator'));

-- All authenticated users can view active locations
CREATE POLICY "All users can view active locations"
ON public.practice_locations
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Create triggers for updated_at
CREATE TRIGGER update_practice_settings_updated_at
BEFORE UPDATE ON public.practice_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_practice_locations_updated_at
BEFORE UPDATE ON public.practice_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_practice_locations_active ON public.practice_locations(is_active);
