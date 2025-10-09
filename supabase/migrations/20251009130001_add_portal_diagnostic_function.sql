-- Add diagnostic function to help troubleshoot portal appointment visibility

-- Function to check if a client's portal is properly configured
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
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.first_name || ' ' || c.last_name AS client_name,
    c.portal_enabled,
    c.portal_user_id,
    au.email AS portal_user_email,
    EXISTS(SELECT 1 FROM appointments a WHERE a.client_id = c.id) AS has_appointments,
    (SELECT COUNT(*) FROM appointments a WHERE a.client_id = c.id) AS appointment_count
  FROM clients c
  LEFT JOIN auth.users au ON au.id = c.portal_user_id
  WHERE c.id = p_client_id;
END;
$$;

-- Grant execute to authenticated users (for debugging)
GRANT EXECUTE ON FUNCTION check_client_portal_config TO authenticated;

COMMENT ON FUNCTION check_client_portal_config IS
'Diagnostic function to check if a client portal is properly configured and can see appointments';
