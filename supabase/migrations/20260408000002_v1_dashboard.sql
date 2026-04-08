-- ============================================================
-- V1 Dashboard Migration: Additive Changes Only
-- ============================================================

-- 1. New columns on vows table (must come before audit policies that reference them)
alter table public.vows
  add column if not exists vow_type text not null default 'self'
    check (vow_type in ('self','challenge'));

alter table public.vows
  add column if not exists target_user_id uuid references public.users(id);

alter table public.vows
  add column if not exists target_phone text;

alter table public.vows
  add column if not exists challenge_status text default 'pending'
    check (challenge_status in ('pending','accepted','declined'));

alter table public.vows
  add column if not exists challenge_invite_token text unique;

alter table public.vows
  add column if not exists witness_user_id uuid references public.users(id);

-- 2. Indexes for new vow columns
create index if not exists idx_vows_challenge_invite_token
  on public.vows(challenge_invite_token)
  where challenge_invite_token is not null;

create index if not exists idx_vows_target_user_id
  on public.vows(target_user_id)
  where target_user_id is not null;

create index if not exists idx_vows_witness_user_id
  on public.vows(witness_user_id)
  where witness_user_id is not null;

-- 3. New RLS policies for cross-user vow visibility
create policy "vows_select_as_target" on public.vows
  for select using (target_user_id = auth.uid());

create policy "vows_select_as_witness" on public.vows
  for select using (witness_user_id = auth.uid());

-- 4. New table: audit_events
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  vow_id uuid not null references public.vows(id) on delete cascade,
  event_type text not null,
  actor_type text not null check (actor_type in ('maker','witness','target','system')),
  actor_id uuid references public.users(id),
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_events_vow_id on public.audit_events(vow_id);
create index if not exists idx_audit_events_created_at on public.audit_events(created_at);

alter table public.audit_events enable row level security;

-- Makers can read audit events for their own vows
create policy "audit_select_own_vows" on public.audit_events
  for select using (
    vow_id in (select id from public.vows where user_id = auth.uid())
  );

-- Makers can insert check_in events for their own vows
create policy "audit_insert_checkin" on public.audit_events
  for insert with check (
    event_type = 'check_in'
    and actor_type = 'maker'
    and actor_id = auth.uid()
    and vow_id in (select id from public.vows where user_id = auth.uid())
  );

-- Witnesses can read audit events for vows they witness
create policy "audit_select_as_witness" on public.audit_events
  for select using (
    vow_id in (select id from public.vows where witness_user_id = auth.uid())
  );

-- Targets can read audit events for vows targeting them
create policy "audit_select_as_target" on public.audit_events
  for select using (
    vow_id in (select id from public.vows where target_user_id = auth.uid())
  );
