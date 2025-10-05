-- Phase 3: Setup automated cosignature monitoring cron job

-- Schedule cosignature status monitor to run every hour
SELECT cron.schedule(
  'monitor-cosignature-status',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://fpzuxwynuivqdyltpydj.supabase.co/functions/v1/cosignature-status-monitor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwenV4d3ludWl2cWR5bHRweWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NDU1ODYsImV4cCI6MjA3NTAyMTU4Nn0.5gomiHwP9Yh4CPFSWLk0jIvqmCOnc-ev297x3R0Vu-w"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Add index for better performance on status checks
CREATE INDEX IF NOT EXISTS idx_note_cosignatures_overdue_check 
ON public.note_cosignatures(due_date, status) 
WHERE status IN ('Pending', 'Pending Review', 'Under Review', 'Revisions Requested');