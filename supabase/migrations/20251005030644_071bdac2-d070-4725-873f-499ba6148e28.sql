-- Add comprehensive fields to miscellaneous_notes table
ALTER TABLE public.miscellaneous_notes
ADD COLUMN duration integer,
ADD COLUMN participants jsonb DEFAULT '[]'::jsonb,
ADD COLUMN location text,
ADD COLUMN contact_method text,
ADD COLUMN purpose text,
ADD COLUMN outcome text,
ADD COLUMN follow_up_required boolean DEFAULT false,
ADD COLUMN follow_up_date date,
ADD COLUMN follow_up_plan text,
ADD COLUMN related_documentation text;

COMMENT ON COLUMN public.miscellaneous_notes.duration IS 'Duration of the activity in minutes';
COMMENT ON COLUMN public.miscellaneous_notes.participants IS 'Array of participants with name and role';
COMMENT ON COLUMN public.miscellaneous_notes.location IS 'Location where the activity occurred';
COMMENT ON COLUMN public.miscellaneous_notes.contact_method IS 'Method of contact/interaction';
COMMENT ON COLUMN public.miscellaneous_notes.purpose IS 'Purpose or reason for the activity';
COMMENT ON COLUMN public.miscellaneous_notes.outcome IS 'Outcome or results of the activity';
COMMENT ON COLUMN public.miscellaneous_notes.follow_up_required IS 'Whether follow-up is required';
COMMENT ON COLUMN public.miscellaneous_notes.follow_up_date IS 'Date for follow-up';
COMMENT ON COLUMN public.miscellaneous_notes.follow_up_plan IS 'Plan for follow-up';
COMMENT ON COLUMN public.miscellaneous_notes.related_documentation IS 'Reference to related notes or documentation';