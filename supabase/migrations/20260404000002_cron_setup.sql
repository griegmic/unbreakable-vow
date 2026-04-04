-- Enable pg_cron and pg_net extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule cron to invoke the cron-runner edge function every 15 minutes
-- Note: SUPABASE_URL and SERVICE_ROLE_KEY must be set in vault/app settings
-- If this fails, set up the cron via Supabase Dashboard or use an external cron service
select cron.schedule(
  'process-vow-events',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://faufcfppnkwrxabgvknt.supabase.co/functions/v1/cron-runner',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhdWZjZnBwbmt3cnhhYmd2a250Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI3NDI0NiwiZXhwIjoyMDkwODUwMjQ2fQ.PLACEHOLDER_SERVICE_ROLE_KEY","Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
