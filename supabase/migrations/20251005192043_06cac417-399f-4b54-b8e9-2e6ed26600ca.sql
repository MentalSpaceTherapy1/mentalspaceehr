-- ============================================
-- PORTAL PREFERENCES & GUARDIAN RELATIONSHIPS
-- ============================================

-- Create portal preferences table
CREATE TABLE IF NOT EXISTS public.portal_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Notification preferences
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  appointment_reminders BOOLEAN DEFAULT true,
  billing_reminders BOOLEAN DEFAULT true,
  message_notifications BOOLEAN DEFAULT true,
  
  -- Communication preferences
  preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'sms', 'phone', 'portal')),
  reminder_hours_before INTEGER DEFAULT 24,
  
  -- Display preferences
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'America/New_York',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(client_id)
);

-- Enable RLS
ALTER TABLE public.portal_preferences ENABLE ROW LEVEL SECURITY;

-- Clients can manage their own preferences
CREATE POLICY "Clients can manage their own preferences"
ON public.portal_preferences FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = portal_preferences.client_id
  )
);

-- Staff can view client preferences
CREATE POLICY "Staff can view client preferences"
ON public.portal_preferences FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = portal_preferences.client_id
    AND (
      clients.primary_therapist_id = auth.uid()
      OR has_role(auth.uid(), 'administrator')
      OR has_role(auth.uid(), 'front_desk')
    )
  )
);

-- Create guardian relationships table
CREATE TABLE IF NOT EXISTS public.guardian_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  minor_client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'parent',
    'legal_guardian',
    'foster_parent',
    'custodial_grandparent',
    'other'
  )),
  
  -- Legal documentation
  legal_document_path TEXT,
  legal_document_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_date TIMESTAMP WITH TIME ZONE,
  
  -- Access permissions
  can_view_notes BOOLEAN DEFAULT false,
  can_schedule_appointments BOOLEAN DEFAULT true,
  can_view_billing BOOLEAN DEFAULT true,
  can_communicate_with_clinician BOOLEAN DEFAULT true,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_verification')),
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  UNIQUE(guardian_client_id, minor_client_id)
);

-- Enable RLS
ALTER TABLE public.guardian_relationships ENABLE ROW LEVEL SECURITY;

-- Guardians can view their relationships
CREATE POLICY "Guardians can view their relationships"
ON public.guardian_relationships FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = guardian_relationships.guardian_client_id
  )
);

-- Staff can manage guardian relationships
CREATE POLICY "Staff can manage guardian relationships"
ON public.guardian_relationships FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'administrator')
  OR has_role(auth.uid(), 'front_desk')
  OR EXISTS (
    SELECT 1 FROM public.clients
    WHERE (
      clients.id = guardian_relationships.guardian_client_id
      OR clients.id = guardian_relationships.minor_client_id
    )
    AND (
      clients.primary_therapist_id = auth.uid()
      OR has_role(auth.uid(), 'supervisor')
    )
  )
);

-- Create portal account security table
CREATE TABLE IF NOT EXISTS public.portal_account_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  portal_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- MFA settings
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_method TEXT CHECK (mfa_method IN ('sms', 'email', 'authenticator')),
  mfa_phone TEXT,
  mfa_secret TEXT,
  mfa_backup_codes TEXT[],
  
  -- Login tracking
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked_until TIMESTAMP WITH TIME ZONE,
  last_password_change TIMESTAMP WITH TIME ZONE,
  password_reset_token TEXT,
  password_reset_token_expires TIMESTAMP WITH TIME ZONE,
  
  -- Security questions (optional additional security)
  security_questions JSONB DEFAULT '[]',
  
  -- Session management
  max_concurrent_sessions INTEGER DEFAULT 3,
  active_session_tokens TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(client_id)
);

-- Enable RLS
ALTER TABLE public.portal_account_security ENABLE ROW LEVEL SECURITY;

-- Clients can view their own security settings
CREATE POLICY "Clients can view their own security"
ON public.portal_account_security FOR SELECT
TO authenticated
USING (
  portal_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = portal_account_security.client_id
  )
);

-- Clients can update their own security settings
CREATE POLICY "Clients can update their own security"
ON public.portal_account_security FOR UPDATE
TO authenticated
USING (
  portal_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = portal_account_security.client_id
  )
);

-- System and admins can manage security
CREATE POLICY "System can manage security"
ON public.portal_account_security FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'administrator')
);

-- Create portal access log table
CREATE TABLE IF NOT EXISTS public.portal_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  portal_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  success BOOLEAN DEFAULT true,
  failure_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portal_access_log ENABLE ROW LEVEL SECURITY;

-- Clients can view their own access logs
CREATE POLICY "Clients can view their own access logs"
ON public.portal_access_log FOR SELECT
TO authenticated
USING (
  portal_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.portal_user_id = auth.uid()
    AND clients.id = portal_access_log.client_id
  )
);

-- Admins can view all access logs
CREATE POLICY "Admins can view all access logs"
ON public.portal_access_log FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'administrator'));

-- System can insert access logs
CREATE POLICY "System can insert access logs"
ON public.portal_access_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_portal_preferences_client_id ON public.portal_preferences(client_id);
CREATE INDEX IF NOT EXISTS idx_guardian_relationships_guardian ON public.guardian_relationships(guardian_client_id);
CREATE INDEX IF NOT EXISTS idx_guardian_relationships_minor ON public.guardian_relationships(minor_client_id);
CREATE INDEX IF NOT EXISTS idx_guardian_relationships_status ON public.guardian_relationships(status);
CREATE INDEX IF NOT EXISTS idx_portal_security_client_id ON public.portal_account_security(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_security_user_id ON public.portal_account_security(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_access_log_client ON public.portal_access_log(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_access_log_created ON public.portal_access_log(created_at DESC);

-- Create triggers for updated_at
CREATE TRIGGER update_portal_preferences_updated_at
  BEFORE UPDATE ON public.portal_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guardian_relationships_updated_at
  BEFORE UPDATE ON public.guardian_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portal_security_updated_at
  BEFORE UPDATE ON public.portal_account_security
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();