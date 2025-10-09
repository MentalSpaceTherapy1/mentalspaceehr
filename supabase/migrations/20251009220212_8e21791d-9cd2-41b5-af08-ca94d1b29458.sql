-- Add password management columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_requires_change boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_password_change timestamp with time zone DEFAULT now();

-- Create index for password expiration queries
CREATE INDEX IF NOT EXISTS idx_profiles_password_change 
ON public.profiles(last_password_change) 
WHERE password_requires_change = false;

COMMENT ON COLUMN public.profiles.password_requires_change IS 'Flag indicating if user must change password on next login';
COMMENT ON COLUMN public.profiles.last_password_change IS 'Timestamp of last password change for expiration tracking';