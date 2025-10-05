-- Add comprehensive fields to contact_notes table
ALTER TABLE public.contact_notes
ADD COLUMN participants jsonb DEFAULT '[]'::jsonb,
ADD COLUMN location text,
ADD COLUMN outcome text,
ADD COLUMN follow_up_date date,
ADD COLUMN related_documentation text;

COMMENT ON COLUMN public.contact_notes.participants IS 'Array of participants with name and role';
COMMENT ON COLUMN public.contact_notes.location IS 'Location where the contact occurred';
COMMENT ON COLUMN public.contact_notes.outcome IS 'Outcome or results of the contact';
COMMENT ON COLUMN public.contact_notes.follow_up_date IS 'Specific date for follow-up';
COMMENT ON COLUMN public.contact_notes.related_documentation IS 'Reference to related notes or documentation';