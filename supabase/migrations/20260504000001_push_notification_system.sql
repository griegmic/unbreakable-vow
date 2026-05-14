-- Push notification system hardening.
-- Push remains native-app only; SMS remains the reliable witness fallback.

alter table public.users
  add column if not exists timezone text default 'America/New_York',
  add column if not exists quiet_hours_start time default '21:00',
  add column if not exists quiet_hours_end time default '08:00',
  add column if not exists push_permission_status text default 'unknown'
    check (push_permission_status in ('unknown', 'granted', 'denied', 'undetermined'));

alter table public.push_queue
  add column if not exists sent_at timestamptz,
  add column if not exists receipt_id text,
  add column if not exists error_code text,
  add column if not exists dedupe_key text,
  add column if not exists event_type text;

update public.push_queue
set status = 'queued'
where status is null;

update public.push_queue
set event_type = coalesce(data->>'event', data->>'type')
where event_type is null and data is not null;

update public.push_queue
set dedupe_key = concat_ws(':', user_id::text, coalesce(data->>'vow_id', data->>'vowId', ''), coalesce(event_type, data->>'event', 'push'), 'push')
where dedupe_key is null and user_id is not null;

create unique index if not exists idx_push_queue_dedupe_key
  on public.push_queue(dedupe_key)
  where dedupe_key is not null;

create index if not exists idx_push_queue_status_due
  on public.push_queue(status, send_after)
  where status = 'queued';
