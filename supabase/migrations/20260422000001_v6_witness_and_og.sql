-- Migration: 20260422000001_v6_witness_and_og.sql
-- V6 schema changes for witness presence, OG cards, phone normalization,
-- push queue improvements, and SMS retry queue.

-- ═══ VOWS TABLE: witness presence tracking ═══
alter table public.vows
  add column if not exists witness_notified_at timestamptz,
  add column if not exists witness_midpoint_notified_at timestamptz,  -- DEPRECATED: midpoint push dropped in V6. Column retained for potential V7 use.
  add column if not exists maker_24h_nudge_sent_at timestamptz,
  add column if not exists witness_invited_at timestamptz,
  add column if not exists witness_token_expires_at timestamptz default (now() + interval '30 days');

-- ═══ VOWS TABLE: currency (single-currency V6, column ships now to avoid NOT NULL retrofit) ═══
alter table public.vows
  add column if not exists currency text not null default 'USD'
    check (currency in ('USD'));

-- ═══ VOWS TABLE: phone normalization (E.164) ═══
alter table public.vows
  add column if not exists witness_phone_e164 text,
  add column if not exists target_phone_e164 text;

-- ═══ INDEXES for cron-runner queries ═══
create index if not exists idx_vows_status_ends_at on public.vows(status, ends_at)
  where status in ('active', 'awaiting_verdict');
create index if not exists idx_vows_witness_pending on public.vows(sealed_at)
  where status = 'sealed' and witness_accepted_at is null;
create index if not exists idx_vows_target_user_id on public.vows(target_user_id);
create index if not exists idx_vows_witness_user_id on public.vows(witness_user_id);
create index if not exists idx_vows_witness_phone on public.vows(witness_phone_e164);
create index if not exists idx_vows_target_phone on public.vows(target_phone_e164);

-- ═══ PUSH QUEUE: retry tracking ═══
alter table public.push_queue
  add column if not exists attempts int default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists status text default 'queued'
    check (status in ('queued', 'sent', 'failed', 'dead'));
create index if not exists idx_push_queue_due on public.push_queue(send_after, status)
  where status = 'queued';

-- ═══ RLS: witness and target select policies ═══
do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'vows_select_as_witness' and tablename = 'vows'
  ) then
    create policy "vows_select_as_witness" on public.vows
      for select using (auth.uid() = witness_user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'vows_select_as_target' and tablename = 'vows'
  ) then
    create policy "vows_select_as_target" on public.vows
      for select using (auth.uid() = target_user_id);
  end if;
end $$;

-- ═══ USERS TABLE: initiation oath, name capture, channel preference, soft-delete ═══
alter table public.users
  add column if not exists first_seal_completed_at timestamptz,
  add column if not exists display_name_source text
    check (display_name_source in ('apple_pay','manual','sms','none')),
  add column if not exists name_capture_prompted_at timestamptz,
  add column if not exists phone_e164 text unique,
  add column if not exists last_push_receipt_ok_at timestamptz,
  add column if not exists last_push_receipt_failed_at timestamptz,
  add column if not exists sms_only_preference boolean default false,
  add column if not exists deleted_at timestamptz;

create index if not exists idx_users_phone_e164 on public.users(phone_e164);
create index if not exists idx_users_active on public.users(id) where deleted_at is null;

-- ═══ SMS RETRY QUEUE (new table) ═══
create table if not exists public.sms_retry_queue (
  id          uuid primary key default gen_random_uuid(),
  vow_id      uuid references public.vows(id) on delete cascade,
  to_phone    text not null,
  body        text not null,
  message_type text not null,
  attempts    int default 0,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz default now(),
  status      text default 'queued' check (status in ('queued','sent','failed','dead')),
  created_at  timestamptz default now()
);
create index if not exists idx_sms_retry_due on public.sms_retry_queue(next_attempt_at, status)
  where status = 'queued';

-- ═══ PHONE NORMALIZATION FUNCTION (Postgres-side, for backfill) ═══
create or replace function normalize_e164(input text) returns text
language plpgsql immutable as $$
declare
  digits text;
begin
  if input is null then return null; end if;
  digits := regexp_replace(input, '[^\d]', '', 'g');
  if length(digits) = 10 then
    return '+1' || digits;
  end if;
  if length(digits) = 11 and digits ~ '^1\d{10}$' then
    return '+' || digits;
  end if;
  if input ~ '^\+\d{8,15}$' then
    return input;
  end if;
  return null;
end;
$$;

-- ═══ BACKFILL E.164 phone columns (idempotent) ═══
update public.users   set phone_e164         = normalize_e164(phone)         where phone_e164 is null and phone is not null;
update public.vows    set witness_phone_e164 = normalize_e164(witness_phone) where witness_phone_e164 is null and witness_phone is not null;
update public.vows    set target_phone_e164  = normalize_e164(target_phone)  where target_phone_e164  is null and target_phone  is not null;
