-- Enable pg_cron and pg_net extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule cron to invoke the cron-runner edge function every 15 minutes
--
-- MANUAL SETUP REQUIRED:
-- This migration creates the extensions but the cron job must be configured
-- via the Supabase Dashboard (SQL Editor) with the real service role key.
--
-- Run this SQL in the Supabase Dashboard SQL Editor:
--
--   SELECT cron.unschedule('process-vow-events');
--   SELECT cron.schedule(
--     'process-vow-events',
--     '*/15 * * * *',
--     $$
--     SELECT net.http_post(
--       url := 'https://faufcfppnkwrxabgvknt.supabase.co/functions/v1/cron-runner',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE',
--         'Content-Type', 'application/json'
--       ),
--       body := '{}'::jsonb
--     ) AS request_id;
--     $$
--   );
--
