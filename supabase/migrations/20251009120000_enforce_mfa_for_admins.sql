-- Enforce MFA for administrators and supervisors
-- This migration adds a trigger to ensure admins and supervisors have MFA enabled

-- Create function to check MFA requirement for privileged roles
CREATE OR REPLACE FUNCTION check_admin_mfa_requirement()
RETURNS trigger AS $$
BEGIN
  -- Check if user has administrator or supervisor role
  IF EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = NEW.id
    AND r.name IN ('administrator', 'supervisor')
    AND ur.is_active = true
  ) THEN
    -- Require MFA to be enabled
    IF NEW.mfa_enabled = false OR NEW.mfa_enabled IS NULL THEN
      RAISE EXCEPTION 'MFA is required for administrators and supervisors. Please enable MFA in your profile settings.'
        USING HINT = 'Navigate to Profile > MFA Setup to enable two-factor authentication';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS enforce_admin_mfa ON profiles;
CREATE TRIGGER enforce_admin_mfa
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_admin_mfa_requirement();

-- Also create trigger on user_roles to check when role is assigned
CREATE OR REPLACE FUNCTION check_mfa_on_role_assignment()
RETURNS trigger AS $$
DECLARE
  role_name TEXT;
  user_mfa_enabled BOOLEAN;
BEGIN
  -- Get the role name
  SELECT name INTO role_name
  FROM roles
  WHERE id = NEW.role_id;
  
  -- Check if it's a privileged role
  IF role_name IN ('administrator', 'supervisor') AND NEW.is_active = true THEN
    -- Check user's MFA status
    SELECT mfa_enabled INTO user_mfa_enabled
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Require MFA
    IF user_mfa_enabled = false OR user_mfa_enabled IS NULL THEN
      RAISE EXCEPTION 'Cannot assign % role: MFA must be enabled first', role_name
        USING HINT = 'User must enable MFA before being assigned administrator or supervisor role';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_mfa_on_role_assignment ON user_roles;
CREATE TRIGGER enforce_mfa_on_role_assignment
  BEFORE INSERT OR UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION check_mfa_on_role_assignment();

-- Add helpful comment
COMMENT ON FUNCTION check_admin_mfa_requirement() IS 'Ensures administrators and supervisors have MFA enabled for HIPAA compliance';
COMMENT ON FUNCTION check_mfa_on_role_assignment() IS 'Prevents assignment of admin/supervisor roles to users without MFA';
