-- Add foreign key to audit_logs for user profile lookups
ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Create index for efficient joins
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_fk ON public.audit_logs(user_id);