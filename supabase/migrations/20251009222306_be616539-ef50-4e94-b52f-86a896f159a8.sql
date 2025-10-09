-- Add portal diagnostic function
-- This function helps diagnose portal setup issues for clients

CREATE OR REPLACE FUNCTION check_client_portal_config(p_client_id UUID)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  portal_enabled BOOLEAN,
  portal_user_id UUID,
  portal_user_email TEXT,
  has_appointments BOOLEAN,
  appointment_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS client_id,
    (c.first_name || ' ' || c.last_name) AS client_name,
    c.portal_enabled,
    c.portal_user_id,
    au.email AS portal_user_email,
    EXISTS(SELECT 1 FROM appointments WHERE client_id = c.id) AS has_appointments,
    (SELECT COUNT(*) FROM appointments WHERE client_id = c.id) AS appointment_count
  FROM clients c
  LEFT JOIN auth.users au ON au.id = c.portal_user_id
  WHERE c.id = p_client_id;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION check_client_portal_config IS 
'Diagnostic function to check client portal configuration and troubleshoot visibility issues';