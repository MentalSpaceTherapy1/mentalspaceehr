-- ================================================================
-- AUTH COMPATIBILITY LAYER FOR AWS COGNITO
-- ================================================================
-- This creates an auth schema and users table to maintain compatibility
-- with Supabase migrations, while using AWS Cognito as the actual auth provider
-- ================================================================

-- Create auth schema
CREATE SCHEMA IF NOT EXISTS auth;

-- Create users table that mirrors Cognito users
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  email_confirmed_at TIMESTAMPTZ,
  phone TEXT,
  phone_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sign_in_at TIMESTAMPTZ,

  -- Cognito-specific fields
  cognito_sub TEXT UNIQUE, -- Cognito user ID (sub claim from JWT)
  cognito_username TEXT,

  -- Metadata
  raw_app_meta_data JSONB DEFAULT '{}',
  raw_user_meta_data JSONB DEFAULT '{}',

  -- Account status
  is_super_admin BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

-- Create sessions table for token tracking (optional)
CREATE TABLE IF NOT EXISTS auth.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  -- Cognito tokens (encrypted/hashed in production)
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_users_cognito_sub ON auth.users(cognito_sub);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON auth.sessions(expires_at);

-- Create function to get user ID from Cognito JWT
-- This will be used by RLS policies that reference auth.uid()
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  -- In production, this will extract the user ID from the Cognito JWT
  -- For now, return NULL (will be updated when Lambda auth is implemented)
  SELECT NULL::UUID;
$$;

-- Create function to get JWT claims
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS JSONB
LANGUAGE SQL STABLE
AS $$
  -- In production, this will return the decoded Cognito JWT
  -- For now, return empty object
  SELECT '{}'::JSONB;
$$;

-- Create function to sync Cognito user to auth.users
CREATE OR REPLACE FUNCTION auth.sync_cognito_user(
  p_cognito_sub TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Insert or update user
  INSERT INTO auth.users (
    cognito_sub,
    email,
    phone,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    p_cognito_sub,
    p_email,
    p_phone,
    NOW(), -- Cognito confirms email before user is created
    p_metadata,
    NOW(),
    NOW()
  )
  ON CONFLICT (cognito_sub)
  DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW()
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO PUBLIC;
GRANT SELECT ON auth.users TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.jwt() TO PUBLIC;

-- Insert a system user for migrations and seed data
INSERT INTO auth.users (
  id,
  email,
  cognito_sub,
  email_confirmed_at,
  created_at,
  updated_at,
  is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'system@mentalspaceehr.com',
  'SYSTEM',
  NOW(),
  NOW(),
  NOW(),
  TRUE
) ON CONFLICT (cognito_sub) DO NOTHING;

COMMENT ON SCHEMA auth IS 'Compatibility layer for AWS Cognito authentication';
COMMENT ON TABLE auth.users IS 'User records synced from AWS Cognito User Pool';
COMMENT ON FUNCTION auth.uid() IS 'Returns current user ID from Cognito JWT (to be implemented in Lambda context)';
COMMENT ON FUNCTION auth.sync_cognito_user IS 'Syncs a Cognito user to the local auth.users table';
