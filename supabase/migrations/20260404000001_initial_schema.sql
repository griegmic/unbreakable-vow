-- Users (extends Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  stripe_customer_id text,
  push_token text,
  created_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- Vows
create table public.vows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) not null,
  raw_input text not null,
  refined_text text not null,
  status text not null default 'draft'
    check (status in ('draft','sealed','active','awaiting_verdict','kept','broken','voided')),
  witness_name text not null,
  witness_phone text,
  witness_invite_token text unique,
  stake_amount integer not null,
  consequence text not null default 'charity',
  destination text not null,
  stripe_payment_intent_id text,
  starts_at timestamptz,
  ends_at timestamptz,
  verdict text check (verdict in ('kept','broken')),
  verdict_at timestamptz,
  sealed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.vows enable row level security;

create policy "vows_select_own" on public.vows
  for select using (auth.uid() = user_id);

create policy "vows_insert_own" on public.vows
  for insert with check (auth.uid() = user_id);

create policy "vows_update_own" on public.vows
  for update using (auth.uid() = user_id);

create index idx_vows_user_id on public.vows(user_id);
create index idx_vows_status on public.vows(status);
create index idx_vows_witness_invite_token on public.vows(witness_invite_token);

-- SMS log (service role only — no client access)
create table public.sms_log (
  id uuid primary key default gen_random_uuid(),
  vow_id uuid references public.vows(id),
  message_type text not null,
  twilio_sid text,
  sent_at timestamptz default now()
);

alter table public.sms_log enable row level security;
-- No RLS policies = service role only access

-- Push notification queue (service role only)
create table public.push_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  title text not null,
  body text not null,
  data jsonb,
  send_after timestamptz not null,
  sent boolean default false,
  created_at timestamptz default now()
);

alter table public.push_queue enable row level security;
-- No RLS policies = service role only access

create index idx_push_queue_pending on public.push_queue(send_after) where sent = false;
