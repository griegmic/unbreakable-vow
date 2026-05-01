-- Twilio/SMS compliance state (service role only).
-- Stores inbound STOP/START/HELP events from Twilio Messaging Services and
-- lets server-side send paths skip opted-out recipients before hitting Twilio.

create table if not exists public.sms_opt_outs (
  phone_e164 text primary key,
  status text not null default 'opted_in'
    check (status in ('opted_in', 'opted_out')),
  last_keyword text,
  last_opt_out_type text,
  last_message_body text,
  twilio_message_sid text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.sms_opt_outs enable row level security;
-- No RLS policies = service role only.

create table if not exists public.sms_inbound_log (
  id uuid primary key default gen_random_uuid(),
  from_phone text not null,
  to_phone text,
  body text,
  opt_out_type text,
  twilio_message_sid text,
  raw_payload jsonb,
  received_at timestamptz default now()
);

alter table public.sms_inbound_log enable row level security;
-- No RLS policies = service role only.

create index if not exists idx_sms_inbound_log_from on public.sms_inbound_log(from_phone, received_at desc);
create index if not exists idx_sms_opt_outs_status on public.sms_opt_outs(status);
