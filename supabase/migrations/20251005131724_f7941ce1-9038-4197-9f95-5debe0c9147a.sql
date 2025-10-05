-- Phase 1: Database Schema Enhancements for Supervision Sessions

-- Add time tracking fields
ALTER TABLE public.supervision_sessions 
ADD COLUMN IF NOT EXISTS session_start_time TIME,
ADD COLUMN IF NOT EXISTS session_end_time TIME;

-- Add session format field
ALTER TABLE public.supervision_sessions 
ADD COLUMN IF NOT EXISTS session_format TEXT CHECK (session_format IN ('In-Person', 'Telehealth', 'Phone'));

-- Add group supervision support
ALTER TABLE public.supervision_sessions 
ADD COLUMN IF NOT EXISTS group_supervisees JSONB DEFAULT '[]'::jsonb;

-- Add enhanced case tracking
ALTER TABLE public.supervision_sessions 
ADD COLUMN IF NOT EXISTS cases_discussed JSONB DEFAULT '[]'::jsonb;

-- Add skills and development fields
ALTER TABLE public.supervision_sessions 
ADD COLUMN IF NOT EXISTS skills_developed TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS feedback_provided TEXT,
ADD COLUMN IF NOT EXISTS areas_of_strength TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS areas_for_improvement TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add action items tracking
ALTER TABLE public.supervision_sessions 
ADD COLUMN IF NOT EXISTS action_items JSONB DEFAULT '[]'::jsonb;

-- Add follow-up planning fields
ALTER TABLE public.supervision_sessions 
ADD COLUMN IF NOT EXISTS next_session_scheduled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS next_session_date DATE;

-- Add supervisee reflection
ALTER TABLE public.supervision_sessions 
ADD COLUMN IF NOT EXISTS supervisee_reflection TEXT;

-- Add better signature tracking
ALTER TABLE public.supervision_sessions 
ADD COLUMN IF NOT EXISTS supervisor_signature_name TEXT,
ADD COLUMN IF NOT EXISTS supervisee_signature_name TEXT,
ADD COLUMN IF NOT EXISTS supervisor_signed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS supervisee_signed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS supervisor_signed_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS supervisee_signed_date TIMESTAMP WITH TIME ZONE;

-- Add metadata fields if they don't exist
ALTER TABLE public.supervision_sessions 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_supervision_sessions_updated_at ON public.supervision_sessions;

CREATE TRIGGER update_supervision_sessions_updated_at
  BEFORE UPDATE ON public.supervision_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN public.supervision_sessions.group_supervisees IS 'JSONB array: [{"supervisee_id": "uuid", "hours_earned": number}]';
COMMENT ON COLUMN public.supervision_sessions.cases_discussed IS 'JSONB array: [{"client_id": "uuid", "discussion_summary": "text", "clinical_issues": ["text"], "interventions_recommended": ["text"]}]';
COMMENT ON COLUMN public.supervision_sessions.action_items IS 'JSONB array: [{"item": "text", "due_date": "date", "completed": boolean}]';