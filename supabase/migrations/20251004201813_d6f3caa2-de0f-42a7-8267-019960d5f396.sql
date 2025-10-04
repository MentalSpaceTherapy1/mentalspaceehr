-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Clinicians can update their own unlocked notes" ON public.clinical_notes;
DROP POLICY IF EXISTS "Administrators can update all notes" ON public.clinical_notes;

-- Create policy to allow clinicians to sign their own notes  
CREATE POLICY "Clinicians can update and sign their own notes"
ON public.clinical_notes
FOR UPDATE
USING (clinician_id = auth.uid())
WITH CHECK (clinician_id = auth.uid());

-- Create policy for administrators to update any note
CREATE POLICY "Administrators can update all notes"
ON public.clinical_notes
FOR UPDATE
USING (has_role(auth.uid(), 'administrator'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));