-- Add fields for user management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT FALSE;

-- Create user audit log table
CREATE TABLE IF NOT EXISTS public.user_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.user_audit_log ENABLE ROW LEVEL SECURITY;

-- Administrators can view all audit logs
CREATE POLICY "Administrators can view all audit logs"
ON public.user_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'administrator'));

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.user_audit_log
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_audit_log_user_id ON public.user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_created_at ON public.user_audit_log(created_at DESC);
