-- Add supervisor relationship to profiles table
ALTER TABLE public.profiles
ADD COLUMN supervisor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for faster supervisor lookups
CREATE INDEX idx_profiles_supervisor_id ON public.profiles(supervisor_id);

-- Add comment explaining the field
COMMENT ON COLUMN public.profiles.supervisor_id IS 'The supervisor assigned to this user for clinical oversight (required for associate/trainee roles)';