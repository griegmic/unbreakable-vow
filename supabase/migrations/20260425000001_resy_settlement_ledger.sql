-- Resy-style money flow: save a payment method, charge only if broken,
-- then manually settle destination totals from an internal ledger.

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  vow_id uuid not null references public.vows(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  gross_amount integer not null check (gross_amount >= 0),
  currency text not null default 'USD' check (currency in ('USD')),
  destination text not null,
  destination_type text not null default 'charity'
    check (destination_type in ('charity', 'anti_cause', 'manual')),
  platform_reserve_bps integer not null default 1000
    check (platform_reserve_bps >= 0 and platform_reserve_bps <= 10000),
  platform_reserve_amount integer not null,
  destination_net_amount integer not null,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_dispute_id text,
  status text not null default 'pending_charge'
    check (status in (
      'pending_charge',
      'charged',
      'payment_due',
      'pending_manual_settlement',
      'settled',
      'disputed',
      'reversed'
    )),
  failure_reason text,
  manual_confirmation text,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vow_id)
);

alter table public.settlements enable row level security;
revoke all on public.settlements from anon, authenticated;

create index if not exists idx_settlements_status
  on public.settlements(status, created_at);

create index if not exists idx_settlements_destination
  on public.settlements(destination, status, created_at);

create index if not exists idx_settlements_payment_intent
  on public.settlements(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb not null
);

alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;

create or replace function public.touch_settlement_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists settlements_touch_updated_at on public.settlements;
create trigger settlements_touch_updated_at
  before update on public.settlements
  for each row execute function public.touch_settlement_updated_at();

create or replace view public.settlement_monthly_destination_report as
select
  date_trunc('month', created_at)::date as month,
  destination,
  destination_type,
  currency,
  count(*) as vow_count,
  sum(gross_amount) as gross_amount,
  sum(platform_reserve_amount) as platform_reserve_amount,
  sum(destination_net_amount) as destination_net_amount,
  array_remove(array_agg(stripe_payment_intent_id), null) as stripe_payment_intent_ids,
  array_agg(vow_id) as vow_ids
from public.settlements
where status in ('charged', 'pending_manual_settlement', 'settled')
group by 1, 2, 3, 4;
revoke all on public.settlement_monthly_destination_report from anon, authenticated;

create or replace view public.settlement_manual_export as
select
  s.id as settlement_id,
  s.vow_id,
  s.user_id,
  s.destination,
  s.destination_type,
  s.gross_amount,
  s.platform_reserve_amount,
  s.destination_net_amount,
  s.currency,
  s.status,
  s.stripe_payment_intent_id,
  s.stripe_charge_id,
  s.failure_reason,
  s.manual_confirmation,
  s.created_at,
  s.settled_at
from public.settlements s
order by s.created_at desc;
revoke all on public.settlement_manual_export from anon, authenticated;
