-- Fix overly permissive RLS on ai_note_settings table
-- Drop the permissive policy that allows all authenticated users to view settings
DROP POLICY IF EXISTS "All users can view AI settings" ON public.ai_note_settings;

-- Create a more restrictive policy - only administrators can view AI settings
CREATE POLICY "Administrators can view AI settings"
ON public.ai_note_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'administrator'::app_role));

-- Note: The "Administrators can manage AI settings" policy already exists for INSERT/UPDATE/DELETE
-- This ensures only administrators can view or modify AI configuration