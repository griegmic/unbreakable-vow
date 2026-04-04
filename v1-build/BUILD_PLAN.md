# Unbreakable Vow — V1 Build Plan

## What V1 Is

A fully functioning stakes-based accountability app for 10-30 TestFlight beta users. Users type a vow, put real money on it via Stripe, assign a witness (friend via SMS), and the witness delivers a verdict via a web page. If the vow is broken, the money goes to charity.

**Target:** Ship to TestFlight. Real auth, real payments, real SMS alerts.

---

## V1 Scope — What's In

| Feature | Implementation |
|---|---|
| Auth | Apple Sign-In via Supabase Auth |
| Vow creation | Existing flow with simplified 2-path sharpening |
| Witness selection | Manual name + phone number entry (no contact picker) |
| Stake & consequence | Stripe PaymentIntent (charge on seal, refund on kept) |
| Witness alerts | 4 Twilio toll-free SMS to witness |
| Witness verdict | Token-authenticated web page (no app needed) |
| Auto-resolve | 72h after vow ends, if no verdict → auto-kept, refund |
| Push notifications | expo-notifications for vow owner |
| Outcome screens | Existing kept/broken screens wired to real data |
| History | Real vow history from Supabase |
| Settings | Basic account info, sign out |

## V1 Scope — What's Cut

| Feature | Treatment |
|---|---|
| VowKeeper AI witness | Remove entirely. External witness only. |
| Crew / group accountability | Remove entirely. 1 vow → 1 witness. |
| Group challenges | Keep screen but hide from nav. "COMING SOON" badge stays. |
| Group chat / Telegram | Cut. SMS alerts to witness only. |
| Contact picker | Cut. Manual name + phone entry only. |
| Google auth | Cut. Apple Sign-In only. |
| Proof mode (screenshot) | Cut. Word-of-honor only. |
| App Store submission | Cut. TestFlight only for v1. |
| Anti-cause consequence | Keep in UI but route to charity backend (same Stripe flow). |

---

## Architecture

```
┌──────────────────┐     ┌─────────────────────┐
│  Expo App (iOS)  │────▶│  Supabase           │
│  React Native    │     │  - Auth (Apple)      │
│  expo-router     │     │  - Postgres DB       │
│  Stripe RN SDK   │     │  - Edge Functions    │
│  expo-notifs     │     │  - Realtime          │
└──────────────────┘     └─────────┬───────────┘
                                   │
                         ┌─────────▼───────────┐
                         │  External Services   │
                         │  - Stripe API        │
                         │  - Twilio SMS        │
                         │  - APNs (push)       │
                         └─────────────────────┘
                                   │
                         ┌─────────▼───────────┐
                         │  Web Verdict Page    │
                         │  (static HTML +      │
                         │   Supabase Edge Fn)  │
                         └─────────────────────┘
```

### Vow Status State Machine

```
draft → sealed → active → awaiting_verdict → kept | broken | voided
```

- `draft`: vow created, not yet paid
- `sealed`: Stripe payment captured successfully
- `active`: witness SMS sent, vow period running
- `awaiting_verdict`: vow period ended, waiting for witness response
- `kept`: witness said kept → Stripe refund issued
- `broken`: witness said broken → payment stands (goes to charity)
- `voided`: error state, payment refunded

### Database Tables

```sql
-- Users (extends Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users(id),
  display_name text,
  phone text,
  stripe_customer_id text,
  push_token text,
  created_at timestamptz default now()
);

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
  stake_amount integer not null, -- cents
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

-- SMS log (for idempotency)
create table public.sms_log (
  id uuid primary key default gen_random_uuid(),
  vow_id uuid references public.vows(id),
  message_type text not null, -- seal, warmup, verdict_request, outcome
  twilio_sid text,
  sent_at timestamptz default now()
);

-- Push notification queue
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
```

### RLS Policies

```sql
-- Users can read/update their own profile
alter table public.users enable row level security;
create policy "users_own" on public.users
  for all using (auth.uid() = id);

-- Users can read their own vows; verdict writes go through Edge Functions
alter table public.vows enable row level security;
create policy "vows_own_read" on public.vows
  for select using (auth.uid() = user_id);
create policy "vows_own_insert" on public.vows
  for insert with check (auth.uid() = user_id);
create policy "vows_own_update" on public.vows
  for update using (auth.uid() = user_id);
```

### Edge Functions

1. **`seal-vow`** — Creates Stripe PaymentIntent, updates vow to `sealed`, sends SMS #1 to witness
2. **`witness-verdict`** — Token-authenticated. Witness submits kept/broken. Updates vow, triggers Stripe refund (if kept) or confirms charge (if broken). Sends SMS #4.
3. **`cron-runner`** — Called by pg_cron every 15 min. Processes `push_queue`, sends SMS #2 (warmup) and SMS #3 (verdict request) based on vow dates, auto-resolves 72h overdue vows.

### 4 Twilio SMS Alerts

| # | When | To | Message |
|---|---|---|---|
| 1 | Vow sealed | Witness | "{Name} just made an Unbreakable Vow: '{vow_text}' — with ${amount} on the line. You're the witness. You'll get a link to deliver your verdict on {end_date}." |
| 2 | Day before vow ends | Witness | "Reminder: {Name}'s vow '{vow_text}' ends tomorrow. You'll get a verdict link soon." |
| 3 | Vow period ends | Witness | "It's verdict time! Did {Name} keep their vow: '{vow_text}'? Tap here to decide: {verdict_url}" |
| 4 | After verdict | Witness | "Verdict recorded: {kept/broken}. {outcome_message}" |

### Provider Wrapping Order

```
StripeProvider → OathStateProvider → AuthProvider → VowFlowProvider
```

---

## Build Sequence

### Phase 0: Rork UI Fixes (before Claude Code)
Give the sharpening prompt (`01-sharpening-fix.md`) to Rork to fix the 3-file sharpening flow. This is pure frontend — no backend needed.

### Phase 1: Manual Setup (you do this)
See `MANUAL_SETUP.md` for step-by-step instructions.

### Phase 2: Claude Code Prompts (sequential)
Run each numbered prompt file in order. Each prompt is self-contained with all context needed.

| Prompt | What it does | Depends on |
|---|---|---|
| 02 | Supabase client + DB types + env config | Manual setup done |
| 03 | Apple Sign-In auth flow | Prompt 02 |
| 04 | Stripe payment integration | Prompt 03 |
| 05 | Seal flow (PaymentIntent + vow status) | Prompt 04 |
| 06 | Twilio SMS Edge Functions | Prompt 05 |
| 07 | Web verdict page | Prompt 06 |
| 08 | Cron runner (scheduled SMS + auto-resolve) | Prompt 06 |
| 09 | Push notifications | Prompt 02 |
| 10 | Screen cleanup (remove VowKeeper/crew/challenges) | Any time |
| 11 | Wire real data (history, settings, live screen) | Prompts 05-08 |
| 12 | Deep linking + native intent fix | Prompt 07 |
| 13 | EAS Build + TestFlight config | All prompts done |

### Phase 3: Testing
- Create test vow end-to-end
- Verify Stripe test mode charge + refund
- Verify all 4 SMS arrive
- Test web verdict page on mobile Safari
- Test push notifications
- Test Apple Sign-In on real device
- Test auto-resolve after 72h (use short vow window)
