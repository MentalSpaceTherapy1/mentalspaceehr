-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM (
  'administrator',
  'supervisor',
  'therapist',
  'billing_staff',
  'front_desk',
  'associate_trainee'
);

-- Create user profiles table with comprehensive fields
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Information
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  suffix TEXT,
  preferred_name TEXT,
  
  -- Professional Information
  title TEXT, -- PhD, PsyD, LCSW, LMFT, MD, etc.
  license_number TEXT,
  license_state TEXT,
  license_expiration_date DATE,
  npi_number TEXT,
  dea_number TEXT,
  taxonomy_code TEXT,
  
  -- Credentials
  credentials TEXT[], -- ['PhD', 'ABPP', etc.]
  specialties TEXT[], -- ['Child Psychology', 'Trauma', etc.]
  languages_spoken TEXT[],
  
  -- Supervision Information
  is_under_supervision BOOLEAN DEFAULT FALSE,
  supervision_start_date DATE,
  supervision_end_date DATE,
  required_supervision_hours INTEGER DEFAULT 0,
  completed_supervision_hours DECIMAL(10, 2) DEFAULT 0,
  
  -- For Supervisors
  is_supervisor BOOLEAN DEFAULT FALSE,
  supervision_licenses TEXT[], -- what licenses can they supervise
  
  -- Contact Information
  phone_number TEXT,
  office_extension TEXT,
  personal_email TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- Practice Settings
  default_office_location TEXT,
  available_for_scheduling BOOLEAN DEFAULT TRUE,
  accepts_new_patients BOOLEAN DEFAULT TRUE,
  
  -- Notification Preferences (stored as JSONB for flexibility)
  notification_preferences JSONB DEFAULT '{
    "emailNotifications": true,
    "smsNotifications": false,
    "appointmentReminders": true,
    "noteReminders": true,
    "supervisoryAlerts": true
  }'::jsonb,
  
  -- Billing Information
  default_rate DECIMAL(10, 2),
  hourly_payroll_rate DECIMAL(10, 2),
  tax_id TEXT,
  
  -- Account Status
  is_active BOOLEAN DEFAULT TRUE,
  account_created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_date TIMESTAMP WITH TIME ZONE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  
  -- Digital Signature
  digital_signature TEXT, -- base64 image
  signature_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table (separate for security - prevents privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create supervision relationships table
CREATE TABLE public.supervision_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  supervision_type TEXT, -- 'clinical', 'administrative', etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supervisee_id, supervisor_id, start_date)
);

-- Create login attempt tracking table for security
CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  attempt_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT FALSE,
  ip_address TEXT,
  user_agent TEXT,
  failure_reason TEXT
);

-- Create index for faster login attempt queries
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts(email, attempt_time DESC);
CREATE INDEX idx_supervision_relationships_supervisee ON public.supervision_relationships(supervisee_id);
CREATE INDEX idx_supervision_relationships_supervisor ON public.supervision_relationships(supervisor_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervision_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Create function to get user's roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF public.app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- RLS Policies for profiles table
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Administrators can view all profiles
CREATE POLICY "Administrators can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));

-- Supervisors can view their supervisees' profiles
CREATE POLICY "Supervisors can view supervisees profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.supervision_relationships
    WHERE supervisor_id = auth.uid()
    AND supervisee_id = profiles.id
    AND is_active = TRUE
  )
);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Administrators can update all profiles
CREATE POLICY "Administrators can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'))
WITH CHECK (public.has_role(auth.uid(), 'administrator'));

-- Administrators can insert profiles
CREATE POLICY "Administrators can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'administrator'));

-- RLS Policies for user_roles table
-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Administrators can view all roles
CREATE POLICY "Administrators can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));

-- Only administrators can insert/update/delete roles
CREATE POLICY "Administrators can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'))
WITH CHECK (public.has_role(auth.uid(), 'administrator'));

-- RLS Policies for supervision_relationships
-- Users can view relationships where they are supervisor or supervisee
CREATE POLICY "Users can view own supervision relationships"
ON public.supervision_relationships FOR SELECT
TO authenticated
USING (
  supervisor_id = auth.uid() OR 
  supervisee_id = auth.uid() OR
  public.has_role(auth.uid(), 'administrator')
);

-- Supervisors and admins can manage supervision relationships
CREATE POLICY "Supervisors and admins can manage relationships"
ON public.supervision_relationships FOR ALL
TO authenticated
USING (
  supervisor_id = auth.uid() OR 
  public.has_role(auth.uid(), 'administrator')
)
WITH CHECK (
  supervisor_id = auth.uid() OR 
  public.has_role(auth.uid(), 'administrator')
);

-- RLS Policies for login_attempts (admin only)
CREATE POLICY "Administrators can view login attempts"
ON public.login_attempts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "System can insert login attempts"
ON public.login_attempts FOR INSERT
TO authenticated
WITH CHECK (TRUE);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    account_created_date
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supervision_relationships_updated_at
  BEFORE UPDATE ON public.supervision_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();