-- Track witness acceptance status
alter table public.vows
  add column witness_accepted_at timestamptz,
  add column witness_declined boolean not null default false;

-- Index for cron-runner to find vows with unaccepted witnesses
create index idx_vows_witness_pending
  on public.vows(sealed_at)
  where status = 'active'
    and witness_phone is not null
    and witness_accepted_at is null
    and witness_declined = false;

-- Allow anonymous users to read vows by witness_invite_token
-- (needed for the witness web page to fetch vow details)
create policy "vows_select_by_witness_token" on public.vows
  for select using (witness_invite_token is not null);
