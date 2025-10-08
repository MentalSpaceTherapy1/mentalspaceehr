-- Remove existing cron jobs if they exist
SELECT cron.unschedule('appointment-reminders-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'appointment-reminders-hourly'
);

SELECT cron.unschedule('waitlist-notification-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'waitlist-notification-daily'
);

SELECT cron.unschedule('cleanup-rate-limits-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rate-limits-daily'
);

-- Schedule appointment reminders to run every hour
SELECT cron.schedule(
  'appointment-reminders-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url:='https://fpzuxwynuivqdyltpydj.supabase.co/functions/v1/send-appointment-reminder',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwenV4d3ludWl2cWR5bHRweWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NDU1ODYsImV4cCI6MjA3NTAyMTU4Nn0.5gomiHwP9Yh4CPFSWLk0jIvqmCOnc-ev297x3R0Vu-w"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Schedule waitlist notifications to run daily at 9 AM
SELECT cron.schedule(
  'waitlist-notification-daily',
  '0 9 * * *', -- 9 AM daily
  $$
  SELECT net.http_post(
    url:='https://fpzuxwynuivqdyltpydj.supabase.co/functions/v1/notify-waitlist-slots',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwenV4d3ludWl2cWR5bHRweWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NDU1ODYsImV4cCI6MjA3NTAyMTU4Nn0.5gomiHwP9Yh4CPFSWLk0jIvqmCOnc-ev297x3R0Vu-w"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Schedule rate limit cleanup to run daily at 2 AM
SELECT cron.schedule(
  'cleanup-rate-limits-daily',
  '0 2 * * *', -- 2 AM daily
  $$
  SELECT net.http_post(
    url:='https://fpzuxwynuivqdyltpydj.supabase.co/functions/v1/cleanup-rate-limits',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwenV4d3ludWl2cWR5bHRweWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NDU1ODYsImV4cCI6MjA3NTAyMTU4Nn0.5gomiHwP9Yh4CPFSWLk0jIvqmCOnc-ev297x3R0Vu-w"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);