
-- SECURITY FIX: Restrict note_templates access to authenticated users with appropriate roles
-- This prevents competitors from stealing proprietary clinical documentation structures and AI prompts

-- Drop the overly permissive policy that allows public access
DROP POLICY IF EXISTS "All clinicians can view active templates" ON public.note_templates;

-- Create a new policy that requires authentication AND appropriate clinical role
CREATE POLICY "Authenticated clinicians can view templates"
ON public.note_templates
FOR SELECT
TO authenticated
USING (
  -- User must be authenticated AND have one of these clinical roles
  (auth.uid() IS NOT NULL) 
  AND 
  (
    has_role(auth.uid(), 'therapist'::app_role) 
    OR has_role(auth.uid(), 'supervisor'::app_role)
    OR has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'associate_trainee'::app_role)
    OR created_by = auth.uid()  -- Always allow viewing own templates
  )
  AND (is_active = true OR created_by = auth.uid())  -- Only active templates or own templates
);

-- Add comment explaining the security fix
COMMENT ON POLICY "Authenticated clinicians can view templates" ON public.note_templates IS 
'Restricts access to authenticated clinical staff only (therapist, supervisor, administrator, associate_trainee). Protects proprietary clinical documentation structures, AI prompts, and assessment methodologies from unauthorized access and competitor theft.';
