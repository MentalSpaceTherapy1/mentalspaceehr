-- Drop existing tables if they exist and recreate with proper structure
DROP TABLE IF EXISTS public.note_cosignatures CASCADE;
DROP TABLE IF EXISTS public.supervision_sessions CASCADE;
DROP VIEW IF EXISTS public.supervision_hours_summary CASCADE;
DROP TABLE IF EXISTS public.supervision_relationships CASCADE;

-- Create supervision_relationships table with correct structure
CREATE TABLE public.supervision_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supervisee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('Clinical Supervision', 'Administrative Supervision', 'Training')) DEFAULT 'Clinical Supervision',
  
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Completed')),
  
  required_supervision_hours INTEGER NOT NULL DEFAULT 100,
  required_direct_hours INTEGER DEFAULT 50,
  required_indirect_hours INTEGER DEFAULT 30,
  required_group_hours INTEGER DEFAULT 20,
  
  supervision_frequency TEXT CHECK (supervision_frequency IN ('Weekly', 'Biweekly', 'Monthly', 'As Needed')) DEFAULT 'Weekly',
  scheduled_day_time TEXT,
  
  requires_note_cosign BOOLEAN NOT NULL DEFAULT true,
  cosign_timeframe INTEGER NOT NULL DEFAULT 7,
  
  notification_settings JSONB DEFAULT '{
    "notifySupervisorNewNote": true,
    "notifySuperviseeWhenCosigned": true,
    "escalateIfNotCosigned": true,
    "escalationDays": 5
  }'::jsonb,
  
  competencies_to_achieve TEXT[],
  competencies_achieved JSONB DEFAULT '[]'::jsonb,
  
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(supervisor_id, supervisee_id, start_date)
);

-- Enable RLS
ALTER TABLE public.supervision_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors can view their relationships"
ON public.supervision_relationships FOR SELECT
USING (supervisor_id = auth.uid() OR supervisee_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Supervisors can manage relationships"
ON public.supervision_relationships FOR ALL
USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Create supervision_sessions table
CREATE TABLE public.supervision_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.supervision_relationships(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_duration_minutes INTEGER NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('Direct', 'Indirect', 'Group', 'Individual')),
  session_format TEXT CHECK (session_format IN ('In-Person', 'Telehealth', 'Phone')),
  topics_discussed TEXT[],
  notes TEXT,
  cases_reviewed TEXT[],
  notes_reviewed UUID[],
  competencies_addressed TEXT[],
  supervisor_signed BOOLEAN DEFAULT false,
  supervisor_signed_date TIMESTAMP WITH TIME ZONE,
  supervisee_signed BOOLEAN DEFAULT false,
  supervisee_signed_date TIMESTAMP WITH TIME ZONE,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.supervision_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their sessions"
ON public.supervision_sessions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.supervision_relationships WHERE id = supervision_sessions.relationship_id AND (supervisor_id = auth.uid() OR supervisee_id = auth.uid())) OR has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Users can manage their sessions"
ON public.supervision_sessions FOR ALL
USING (EXISTS (SELECT 1 FROM public.supervision_relationships WHERE id = supervision_sessions.relationship_id AND (supervisor_id = auth.uid() OR supervisee_id = auth.uid())) OR has_role(auth.uid(), 'administrator'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.supervision_relationships WHERE id = supervision_sessions.relationship_id AND (supervisor_id = auth.uid() OR supervisee_id = auth.uid())) OR has_role(auth.uid(), 'administrator'::app_role));

-- Create note_cosignatures table
CREATE TABLE public.note_cosignatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  note_type TEXT NOT NULL,
  clinician_id UUID NOT NULL REFERENCES auth.users(id),
  supervisor_id UUID NOT NULL REFERENCES auth.users(id),
  relationship_id UUID REFERENCES public.supervision_relationships(id),
  clinician_signed BOOLEAN DEFAULT false,
  clinician_signed_date TIMESTAMP WITH TIME ZONE,
  supervisor_cosigned BOOLEAN DEFAULT false,
  supervisor_cosigned_date TIMESTAMP WITH TIME ZONE,
  supervisor_comments TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Reviewed', 'Cosigned', 'Returned')),
  due_date DATE,
  supervisor_notified BOOLEAN DEFAULT false,
  supervisor_notified_date TIMESTAMP WITH TIME ZONE,
  escalated BOOLEAN DEFAULT false,
  escalated_date TIMESTAMP WITH TIME ZONE,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.note_cosignatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their cosignatures"
ON public.note_cosignatures FOR SELECT
USING (clinician_id = auth.uid() OR supervisor_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "System can insert cosignatures"
ON public.note_cosignatures FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their cosignatures"
ON public.note_cosignatures FOR UPDATE
USING (clinician_id = auth.uid() OR supervisor_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role));

-- Create indexes
CREATE INDEX idx_supervision_relationships_supervisor ON public.supervision_relationships(supervisor_id);
CREATE INDEX idx_supervision_relationships_supervisee ON public.supervision_relationships(supervisee_id);
CREATE INDEX idx_supervision_relationships_status ON public.supervision_relationships(status);
CREATE INDEX idx_supervision_sessions_relationship ON public.supervision_sessions(relationship_id);
CREATE INDEX idx_supervision_sessions_date ON public.supervision_sessions(session_date);
CREATE INDEX idx_note_cosignatures_note ON public.note_cosignatures(note_id, note_type);
CREATE INDEX idx_note_cosignatures_supervisor ON public.note_cosignatures(supervisor_id);
CREATE INDEX idx_note_cosignatures_status ON public.note_cosignatures(status);

-- Create triggers
CREATE TRIGGER update_supervision_relationships_updated_at BEFORE UPDATE ON public.supervision_relationships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_supervision_sessions_updated_at BEFORE UPDATE ON public.supervision_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_note_cosignatures_updated_at BEFORE UPDATE ON public.note_cosignatures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create view for supervision hours
CREATE OR REPLACE VIEW public.supervision_hours_summary AS
SELECT 
  sr.id as relationship_id,
  sr.supervisor_id,
  sr.supervisee_id,
  sr.required_supervision_hours,
  sr.required_direct_hours,
  sr.required_indirect_hours,
  sr.required_group_hours,
  COALESCE(SUM(ss.session_duration_minutes) / 60.0, 0) as completed_hours,
  COALESCE(SUM(CASE WHEN ss.session_type = 'Direct' THEN ss.session_duration_minutes ELSE 0 END) / 60.0, 0) as direct_hours_completed,
  COALESCE(SUM(CASE WHEN ss.session_type = 'Indirect' THEN ss.session_duration_minutes ELSE 0 END) / 60.0, 0) as indirect_hours_completed,
  COALESCE(SUM(CASE WHEN ss.session_type = 'Group' THEN ss.session_duration_minutes ELSE 0 END) / 60.0, 0) as group_hours_completed,
  sr.required_supervision_hours - COALESCE(SUM(ss.session_duration_minutes) / 60.0, 0) as remaining_hours
FROM public.supervision_relationships sr
LEFT JOIN public.supervision_sessions ss ON sr.id = ss.relationship_id
GROUP BY sr.id;