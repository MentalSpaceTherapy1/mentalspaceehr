-- Add policy for administrators to update clinical notes
CREATE POLICY "Administrators can update all notes"
ON public.clinical_notes
FOR UPDATE
USING (has_role(auth.uid(), 'administrator'::app_role));