-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create cron job for Sunday lockout (runs every Sunday at 23:59:59)
SELECT cron.schedule(
  'sunday-lockout',
  '59 23 * * 0',
  $$
  SELECT net.http_post(
    url:='https://fpzuxwynuivqdyltpydj.supabase.co/functions/v1/sunday-lockout',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwenV4d3ludWl2cWR5bHRweWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NDU1ODYsImV4cCI6MjA3NTAyMTU4Nn0.5gomiHwP9Yh4CPFSWLk0jIvqmCOnc-ev297x3R0Vu-w"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Create cron job for daily compliance check (runs every day at midnight)
SELECT cron.schedule(
  'daily-compliance-check',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url:='https://fpzuxwynuivqdyltpydj.supabase.co/functions/v1/check-compliance',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwenV4d3ludWl2cWR5bHRweWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NDU1ODYsImV4cCI6MjA3NTAyMTU4Nn0.5gomiHwP9Yh4CPFSWLk0jIvqmCOnc-ev297x3R0Vu-w"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for automated compliance checking';
COMMENT ON EXTENSION pg_net IS 'Async HTTP client for PostgreSQL - used to invoke edge functions from cron jobs';