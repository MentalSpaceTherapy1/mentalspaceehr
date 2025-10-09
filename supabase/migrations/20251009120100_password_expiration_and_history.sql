-- Password expiration and history tracking
-- Implements 90-day password rotation policy and prevents password reuse

-- Add password history table
CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_password_history_user_id ON password_history(user_id);
CREATE INDEX idx_password_history_changed_at ON password_history(changed_at DESC);

-- Enable RLS
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;

-- RLS policies - only admins and the user themselves can view
CREATE POLICY "Users can view own password history"
  ON password_history FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'administrator'::app_role));

-- System can insert password history
CREATE POLICY "System can insert password history"
  ON password_history FOR INSERT
  WITH CHECK (true);

-- Add password_requires_change flag to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'password_requires_change'
  ) THEN
    ALTER TABLE profiles ADD COLUMN password_requires_change BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Function to check if password is expired (90 days)
CREATE OR REPLACE FUNCTION is_password_expired(user_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_change_date TIMESTAMP WITH TIME ZONE;
  days_since_change INTEGER;
BEGIN
  -- Get last password change date
  SELECT last_password_change INTO last_change_date
  FROM profiles
  WHERE id = user_profile_id;
  
  -- If never changed, use created_at
  IF last_change_date IS NULL THEN
    SELECT created_at INTO last_change_date
    FROM profiles
    WHERE id = user_profile_id;
  END IF;
  
  -- Calculate days since last change
  days_since_change := EXTRACT(DAY FROM (now() - last_change_date));
  
  -- Return true if expired (> 90 days)
  RETURN days_since_change > 90;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check password reuse (last 5 passwords)
CREATE OR REPLACE FUNCTION check_password_reuse(
  p_user_id UUID,
  p_new_password_hash TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  recent_password_count INTEGER;
BEGIN
  -- Check if password matches any of last 5 passwords
  SELECT COUNT(*) INTO recent_password_count
  FROM (
    SELECT password_hash
    FROM password_history
    WHERE user_id = p_user_id
    ORDER BY changed_at DESC
    LIMIT 5
  ) recent_passwords
  WHERE password_hash = p_new_password_hash;
  
  -- Return true if password was reused
  RETURN recent_password_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON TABLE password_history IS 'Tracks password changes to prevent reuse and maintain audit trail';
COMMENT ON FUNCTION is_password_expired(UUID) IS 'Checks if user password is older than 90 days';
COMMENT ON FUNCTION check_password_reuse(UUID, TEXT) IS 'Prevents reuse of last 5 passwords';
