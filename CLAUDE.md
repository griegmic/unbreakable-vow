# Unbreakable Vow — Claude Code Context

## Project Overview

Commitment/accountability app. Users create vows, assign witnesses, optionally stake money, and track outcomes.

**Repo structure:**
- `/web` — Next.js 16 web app (primary build target)
- `/expo` — React Native/Expo mobile app (adding dashboard only)
- `/supabase` — Supabase backend (Edge Functions + PostgreSQL + RLS)
- `/landing` — Landing page (not modified)

## Tech Stack

- **Web:** Next.js 16.2.2, React 19, TypeScript, Tailwind CSS 4, Supabase JS v2
- **Mobile:** Expo 54, React Native, expo-router
- **Backend:** Supabase (PostgreSQL, Edge Functions in Deno/TypeScript, RLS)
- **Payments:** Stripe (manual capture → refund on kept, capture stays on broken)
- **SMS:** Twilio
- **Push:** Expo push notifications

## Database Schema

### `public.users`
```
id uuid PK (references auth.users)
display_name text
phone text
stripe_customer_id text
push_token text
created_at timestamptz
```

### `public.vows`
```
id uuid PK
user_id uuid FK → users (the maker)
raw_input text NOT NULL
refined_text text NOT NULL
status text NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft','sealed','active','awaiting_verdict','kept','broken','voided'))
vow_type text NOT NULL DEFAULT 'self'
  CHECK (vow_type IN ('self','challenge'))
witness_name text NOT NULL
witness_phone text
witness_invite_token text UNIQUE
witness_user_id uuid FK → users
witness_accepted_at timestamptz
witness_declined boolean DEFAULT false
target_user_id uuid FK → users
target_phone text
challenge_status text DEFAULT 'pending'
  CHECK (challenge_status IN ('pending','accepted','declined'))
challenge_invite_token text UNIQUE
stake_amount integer NOT NULL (cents, 0 = no stake)
consequence text DEFAULT 'charity'
destination text NOT NULL
stripe_payment_intent_id text
starts_at timestamptz
ends_at timestamptz
verdict text CHECK (verdict IN ('kept','broken'))
verdict_at timestamptz
sealed_at timestamptz
refund_failed boolean DEFAULT false
sms_failed boolean DEFAULT false
created_at timestamptz
```

### `public.audit_events`
```
id uuid PK
vow_id uuid FK → vows
event_type text NOT NULL
actor_type text NOT NULL CHECK (actor_type IN ('maker','witness','target','system'))
actor_id uuid FK → users (nullable)
metadata jsonb DEFAULT '{}'
created_at timestamptz
```

Event types: vow_created, vow_sealed, witness_invited, witness_accepted, witness_declined,
challenge_sent, challenge_accepted, challenge_declined, check_in, verdict_submitted,
verdict_self_resolved, auto_resolved, vow_voided, refund_issued, refund_failed, sms_failed, sms_retried

### `public.sms_log`
```
id uuid PK, vow_id uuid FK, message_type text, twilio_sid text, sent_at timestamptz
```

### `public.push_queue`
```
id uuid PK, user_id uuid FK, title text, body text, data jsonb, send_after timestamptz, sent boolean, created_at timestamptz
```

## RLS Policies

- `users`: select/insert/update own record only
- `vows`: select/insert/update own vows (by user_id), select as witness (by witness_user_id), select as target (by target_user_id)
- `audit_events`: select for own vows, insert check_in events for own vows
- `sms_log`, `push_queue`: service role only

## Edge Functions

| Function | Auth | Purpose |
|----------|------|---------|
| `create-payment-intent` | JWT | Creates Stripe PI for staked vows |
| `seal-vow` | JWT | Captures payment (if staked), activates vow, sends SMS |
| `submit-verdict` | Service role | Records verdict, processes refund |
| `accept-witness` | Service role | Witness accepts/declines via token |
| `accept-challenge` | Service role | Challenge target accepts/declines via token |
| `void-vow` | JWT | Maker cancels vow, refunds if staked |
| `send-sms` | JWT/Service | Sends templated SMS via Twilio |
| `cron-runner` | Service role | Background jobs: reminders, verdict requests, auto-resolve, retries |
| `verdict-page` | None | HTML verdict page (legacy) |

## Stripe Flow

```
$0 vow:  seal-vow (skip Stripe) → activate
Staked:  create-payment-intent (manual capture) → user pays → seal-vow (capture) → activate
Kept:    submit-verdict → full refund
Broken:  submit-verdict → money stays captured
Voided:  void-vow → full refund
```

## Vow State Machine

```
draft → sealed → active → awaiting_verdict → kept | broken
                active → voided (maker cancels)
                awaiting_verdict → voided (maker cancels)
                awaiting_verdict → kept (72h auto-resolve)
Challenge: challenge_status: pending → accepted | declined
           declined → vow voided
```

## Key Patterns

- **Token-based access:** Witnesses and challenge targets access via unique tokens. No account required. Edge functions use service role to bypass RLS.
- **Audit events:** All state changes logged to audit_events via `_shared/audit.ts` helper. Check-ins written directly by client via RLS.
- **$0 vows:** When stake_amount = 0, ALL Stripe operations are skipped. Check `stripe_payment_intent_id` is not null before any Stripe call.
- **Challenge vows:** Maker = witness. Target = person being challenged. One vow row, not two.
- **Idempotency:** Stripe refunds use idempotency key `refund-{vow_id}`. SMS checked against sms_log before sending.

## Critical: DO NOT BREAK

- Mobile app's existing creation flow (input → refine → witness → stake → seal → certificate → live)
- Existing witness flow (/w/[token] accept + /w/[token]/verdict)
- Existing edge function API contracts (request/response shapes for existing callers)
- Existing RLS policies on users and vows tables
- Stripe manual capture → refund flow for staked vows
- `expo/components/vow-ui.tsx` — DO NOT MODIFY this file

## Files That Must Not Be Modified

> **Updated Apr 22, 2026 for V6.** The V6 spec (`design-alignment/v1v2/IMPLEMENTATION-V6.md`) is the single source of truth. Files listed below are frozen; everything else may be modified per the V6 spec.

### FROZEN — do not modify under any circumstances:

**Expo:**
- `expo/components/vow-ui.tsx` — NEVER MODIFY (permanently frozen)
- `expo/lib/supabase.ts`

**Web:**
- `/refine/page.tsx`, `/stake/page.tsx`, `/witness/page.tsx` (first-time flow)
- `/live/page.tsx`, `/self-resolve/page.tsx` (existing single-vow tracking)
- `/auth/callback/page.tsx`
- `components/auth-modal.tsx`, `components/share-button.tsx`
- `providers/auth-provider.tsx`
- `lib/supabase.ts`, `lib/vow-logic.ts`

**Supabase:**
- All existing migration files (never modify, only add new ones)
- `create-payment-intent/index.ts`
- `send-sms/index.ts`
- `verdict-page/index.ts`

### MODIFIABLE per V6 spec (previously frozen, now unlocked):
- `globals.css` — token reconciliation per §1.5
- `layout.tsx` — font loading changes per §2.2
- `middleware.ts` — auth route changes for new routes
- `/w/[token]/page.tsx` — S19 status-aware router per §3.2
- `/vow-kept/page.tsx` — M11/M11B outcome flows per §5.1-5.2
- `/vow-broken/page.tsx` — broken-vow variants per §5.3-5.4
- `/settings/page.tsx` — new settings design per §6.1
- `/history/page.tsx` — new history design per §6.2
- `/outcome/[vowId]/page.tsx` — public outcome design pass per §5.6
- `components/ui.tsx` — may add new primitives or update to V6 tokens; do NOT remove existing exports

## Web App Routes

### Existing (may be modified per V6 spec):
`/`, `/refine`, `/stake`, `/witness`, `/seal`, `/sent`, `/live`, `/self-resolve`,
`/vow-kept`, `/vow-broken`, `/history`, `/settings`, `/auth/callback`,
`/w/[token]`, `/w/[token]/verdict`, `/outcome/[vowId]`

### New routes (V6 build):
- `/dashboard` — Authenticated home, concurrent vow tracking
- `/create` — Power-user single-page vow creation (redirects to `/refine` for V6)
- `/vow/[id]` — Vow detail with timeline
- `/c/[token]` — Challenge accept/decline page
- `/certificate/[vowId]` — Shareable certificate page
- `/witnessing` — All vows you're witnessing (overflow from dashboard)
- `/cast` — Dare creation page
- `/quick-vow` — Returning-user power flow
- `/_dev/primitives` — Primitives storybook (dev only)

## Permanent Project Rules

### No raw Pressable outside primitives (Expo)
- No `Pressable`, `TouchableOpacity`, or `TouchableHighlight` may appear in `/expo/app/` screen files.
- All interactive elements in screens must use primitive components from `/expo/components/primitives/` which wrap haptics internally.
- Exception list (must be justified in code comments): none currently.
- CI enforcement: `grep -r "Pressable\|TouchableOpacity\|TouchableHighlight" expo/app/` must return zero hits outside of comments.
- If a screen needs a custom interactive element, build it as a primitive first.

### Haptics go through typed wrappers only (Expo)
- No file outside `/expo/lib/haptics.ts` may import `expo-haptics` directly.
- All haptic feedback uses the typed wrappers in `expo/lib/haptics.ts`.
- CI enforcement: `grep -r "from 'expo-haptics'" expo/ --include="*.ts" --include="*.tsx" | grep -v "lib/haptics.ts"` must return zero hits.

### Token values live in exactly two places
- Web: `/web/src/app/globals.css` (CSS custom properties)
- Expo: `/expo/lib/uv-tokens.ts` (TypeScript constants)
- No hardcoded hex values anywhere else. `grep -rE "#[0-9a-fA-F]{6}" expo/app/ expo/components/ web/src/app/ web/src/components/ --include="*.ts" --include="*.tsx"` should return zero hits outside token files, test files, and SVG markup.
- Run `node scripts/verify-token-parity.js` to verify web/expo parity.
