-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view sessions they're involved in" ON public.telehealth_sessions;
DROP POLICY IF EXISTS "Users can view participants in their sessions" ON public.session_participants;

-- Create security definer function to check session participation
CREATE OR REPLACE FUNCTION public.is_session_participant(_user_id uuid, _session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.session_participants
    WHERE session_id = _session_id
    AND user_id = _user_id
  )
$$;

-- Create security definer function to check if user is session host
CREATE OR REPLACE FUNCTION public.is_session_host(_user_id uuid, _session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.telehealth_sessions
    WHERE id = _session_id
    AND host_id = _user_id
  )
$$;

-- Recreate telehealth_sessions policy without circular dependency
CREATE POLICY "Users can view sessions they're involved in"
  ON public.telehealth_sessions FOR SELECT
  USING (
    host_id = auth.uid() OR
    public.is_session_participant(auth.uid(), id) OR
    has_role(auth.uid(), 'administrator'::app_role)
  );

-- Recreate session_participants policy without circular dependency
CREATE POLICY "Users can view participants in their sessions"
  ON public.session_participants FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.is_session_host(auth.uid(), session_id) OR
    has_role(auth.uid(), 'administrator'::app_role)
  );