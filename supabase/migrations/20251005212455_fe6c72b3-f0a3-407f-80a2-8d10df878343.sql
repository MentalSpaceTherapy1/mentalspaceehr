-- Add last_password_change column to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'last_password_change'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_password_change TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create security_incidents table for breach detection
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  description TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  investigated BOOLEAN DEFAULT FALSE,
  investigated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  investigated_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

-- Administrators can view security incidents
CREATE POLICY "Administrators can view security incidents"
  ON public.security_incidents FOR SELECT
  USING (has_role(auth.uid(), 'administrator'));

-- System can insert security incidents
CREATE POLICY "System can insert security incidents"
  ON public.security_incidents FOR INSERT
  WITH CHECK (true);

-- Administrators can update incidents (for investigation)
CREATE POLICY "Administrators can update security incidents"
  ON public.security_incidents FOR UPDATE
  USING (has_role(auth.uid(), 'administrator'));

-- Create breach detection function
CREATE OR REPLACE FUNCTION public.detect_breach_indicators()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_count INTEGER;
BEGIN
  -- Detect unusual bulk PHI access (more than 50 records in 1 hour)
  SELECT COUNT(*) INTO access_count
  FROM portal_access_log 
  WHERE user_id = NEW.user_id 
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF access_count > 50 THEN
    INSERT INTO security_incidents (
      incident_type,
      severity,
      description,
      user_id,
      ip_address,
      detected_at
    ) VALUES (
      'Suspicious Access Pattern',
      'High',
      'Unusual bulk PHI access detected: ' || access_count || ' records in 1 hour',
      NEW.user_id,
      NEW.ip_address,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on portal_access_log
DROP TRIGGER IF EXISTS breach_detection_trigger ON public.portal_access_log;
CREATE TRIGGER breach_detection_trigger
AFTER INSERT ON public.portal_access_log
FOR EACH ROW
EXECUTE FUNCTION public.detect_breach_indicators();

-- Initialize last_password_change for existing users (set to account creation date)
UPDATE public.profiles
SET last_password_change = account_created_date
WHERE last_password_change IS NULL
AND account_created_date IS NOT NULL;