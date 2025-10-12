-- ================================================================
-- BASE SCHEMA FOUNDATION FOR MENTALSPACE EHR
-- ================================================================
-- Creates all base tables, types, functions, and roles needed
-- for migrations to run successfully
-- ================================================================

-- Create PostgreSQL roles for RLS policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END$$;

-- Enable RLS
ALTER DATABASE mentalspaceehr SET row_security = on;

-- Create enums
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM (
    'administrator',
    'clinician',
    'supervisor',
    'billing_staff',
    'support_staff',
    'client'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE note_type AS ENUM (
    'progress_note',
    'intake_note',
    'discharge_summary',
    'treatment_plan',
    'assessment',
    'miscellaneous'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE note_format AS ENUM (
    'soap',
    'dap',
    'birp',
    'narrative',
    'girp'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id
    AND role::TEXT = role_name
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create profiles table (base for all users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role app_role NOT NULL,
  organization_id UUID,
  practice_id UUID,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sign_in_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Basic RLS policy for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR has_role(auth.uid(), 'administrator'));

-- Create practice_settings table
CREATE TABLE IF NOT EXISTS public.practice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  npi TEXT,
  tax_id TEXT,
  settings JSONB DEFAULT '{}',
  telehealth_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default practice settings
INSERT INTO public.practice_settings (
  id,
  practice_name,
  settings
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'MentalSpace EHR',
  '{}'
) ON CONFLICT (id) DO NOTHING;

-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  ssn_last_four TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  primary_clinician_id UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_primary_clinician_id ON public.clients(primary_clinician_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  clinician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',
  appointment_type TEXT,
  notes TEXT,
  is_telehealth BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinician_id ON public.appointments(clinician_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON public.appointments(start_time);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create note_templates table
CREATE TABLE IF NOT EXISTS public.note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  note_type note_type NOT NULL,
  note_format note_format NOT NULL,
  template_structure JSONB NOT NULL,
  ai_prompts JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;

-- Create clinical_notes table
CREATE TABLE IF NOT EXISTS public.clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  clinician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  note_type note_type NOT NULL,
  note_format note_format NOT NULL,
  content JSONB NOT NULL,
  is_signed BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_client_id ON public.clinical_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_clinician_id ON public.clinical_notes(clinician_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_appointment_id ON public.clinical_notes(appointment_id);

ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon, service_role;

COMMENT ON TABLE public.profiles IS 'User profiles synced with Cognito';
COMMENT ON TABLE public.clients IS 'Client/patient records';
COMMENT ON TABLE public.appointments IS 'Appointment scheduling';
COMMENT ON TABLE public.clinical_notes IS 'Clinical documentation';
