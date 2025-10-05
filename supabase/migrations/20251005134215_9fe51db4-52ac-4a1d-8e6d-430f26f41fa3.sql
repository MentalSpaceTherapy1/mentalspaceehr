-- Phase 1: Database Enhancements for Note Co-Signing System

-- Add missing fields to note_cosignatures table
ALTER TABLE public.note_cosignatures
ADD COLUMN IF NOT EXISTS revision_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS revisions_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS revision_details TEXT,
ADD COLUMN IF NOT EXISTS submitted_for_cosign_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewed_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS time_spent_reviewing INTEGER,
ADD COLUMN IF NOT EXISTS is_incident_to BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS supervisor_attestation TEXT,
ADD COLUMN IF NOT EXISTS notification_log JSONB DEFAULT '[]'::jsonb;

-- Update the status column constraint to include new status values
ALTER TABLE public.note_cosignatures
DROP CONSTRAINT IF EXISTS note_cosignatures_status_check;

ALTER TABLE public.note_cosignatures
ADD CONSTRAINT note_cosignatures_status_check 
CHECK (status IN ('Pending', 'Pending Review', 'Under Review', 'Reviewed', 'Revisions Requested', 'Cosigned', 'Returned', 'Overdue'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_note_cosignatures_status ON public.note_cosignatures(status);
CREATE INDEX IF NOT EXISTS idx_note_cosignatures_due_date ON public.note_cosignatures(due_date);
CREATE INDEX IF NOT EXISTS idx_note_cosignatures_supervisor_status ON public.note_cosignatures(supervisor_id, status);

-- Add comments for documentation
COMMENT ON COLUMN public.note_cosignatures.revision_history IS 'Array of revision requests: [{revisionDate, revisionReason, revisionCompleteDate}]';
COMMENT ON COLUMN public.note_cosignatures.notification_log IS 'Array of notifications: [{notificationDate, notificationType, recipient}]';
COMMENT ON COLUMN public.note_cosignatures.time_spent_reviewing IS 'Time spent reviewing in minutes';
COMMENT ON COLUMN public.note_cosignatures.is_incident_to IS 'Indicates if this is incident-to billing where supervisor was present';
COMMENT ON COLUMN public.note_cosignatures.supervisor_attestation IS 'Supervisor attestation statement for incident-to billing';