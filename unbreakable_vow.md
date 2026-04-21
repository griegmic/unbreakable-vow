# Unbreakable Vow — Complete LLM Context Document

> Everything an LLM needs to know to understand, modify, debug, and extend this project.

---

## 1. What Is Unbreakable Vow?

Unbreakable Vow is a commitment/accountability app. Users make a personal promise ("vow"), assign a witness to hold them accountable, optionally stake real money, and track the outcome. If the vow is kept, the money is refunded. If broken, the money goes to a charity or "anti-cause" the user dislikes. The witness — a friend or the user themselves — is the judge.

**Core loop:** Write vow → Assign witness → Stake money → Seal it → Live with it → Get judged → Outcome.

There is also a "challenge" mode where a user dares a friend to make a vow (the challenger becomes the witness, the friend becomes the target).

---

## 2. Repo Structure

```
/rork-unbreakable-vow (root)
├── web/             → Next.js 16 web app (primary build target)
├── expo/            → React Native / Expo 54 mobile app
├── supabase/        → Supabase backend (Edge Functions + PostgreSQL + RLS)
├── landing/         → Static HTML landing page
├── CLAUDE.md        → Claude Code instructions & guardrails
├── rork.json        → Rork framework config (native app definition)
├── .env.local       → Root environment variables
└── .vercel/         → Vercel deployment metadata
```

**Not a traditional monorepo** — no root package.json or workspace manager. Each app (`web/`, `expo/`) has its own independent `package.json` and build pipeline. They share the same Supabase backend.

---

## 3. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Web framework | Next.js (App Router) | 16.2.2 |
| Web React | React + React DOM | 19.2.4 |
| Mobile framework | Expo + React Native | 54.0.27 / 0.81.5 |
| Mobile React | React | 19.1.0 |
| Mobile router | expo-router | 6.0.17 |
| Mobile state | TanStack React Query + Zustand | 5.83.0 / 5.0.2 |
| Language | TypeScript | 5 |
| Styling (web) | Tailwind CSS 4 + PostCSS | 4 |
| Database | Supabase PostgreSQL | 17 |
| Auth | Supabase Auth (Magic Link + Google OAuth) | — |
| Edge Functions | Supabase Edge Functions (Deno) | — |
| Payments | Stripe (manual capture PaymentIntent) | — |
| SMS | Twilio | — |
| Push notifications | Expo Push API | — |
| Icons | Lucide React / Lucide React Native | — |
| Deployment (web) | Vercel | — |
| Deployment (mobile) | EAS Build | — |
| Package manager (expo) | Bun | — |

---

## 4. Database Schema

### `public.users`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | References auth.users(id) |
| display_name | text | |
| phone | text | |
| stripe_customer_id | text | Created on first payment |
| push_token | text | Expo push token |
| created_at | timestamptz | |

### `public.vows` (main entity)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → users | The maker (or challenger) |
| raw_input | text NOT NULL | Original user input |
| refined_text | text NOT NULL | Polished vow text |
| status | text NOT NULL | draft → sealed → active → awaiting_verdict → kept \| broken \| voided |
| vow_type | text NOT NULL | 'self' or 'challenge' |
| witness_name | text NOT NULL | |
| witness_phone | text | |
| witness_invite_token | text UNIQUE | UUID for token-based witness access |
| witness_user_id | uuid FK → users | Linked after witness accepts |
| witness_accepted_at | timestamptz | |
| witness_declined | boolean | |
| target_user_id | uuid FK → users | Challenge recipient |
| target_phone | text | |
| challenge_status | text | pending → accepted \| declined \| expired |
| challenge_invite_token | text UNIQUE | UUID for challenge link |
| suggested_stake_amount | integer | Challenger's anchor for target |
| stake_amount | integer NOT NULL | In cents. 0 = no stake |
| consequence | text | 'charity' or 'anti' |
| destination | text NOT NULL | Where money goes if broken |
| stripe_payment_intent_id | text | |
| starts_at | timestamptz | |
| ends_at | timestamptz | Deadline |
| verdict | text | 'kept' or 'broken' |
| verdict_at | timestamptz | |
| sealed_at | timestamptz | |
| refund_failed | boolean | Retry flag for cron |
| sms_failed | boolean | Retry flag for cron |
| created_at | timestamptz | |

**Indexes:** user_id, status, witness_invite_token, challenge_invite_token, target_user_id, witness_user_id, witness_pending (composite), refund_failed.

### `public.audit_events`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| vow_id | uuid FK → vows (cascade delete) | |
| event_type | text | See event types below |
| actor_type | text | maker \| witness \| target \| system |
| actor_id | uuid FK → users | Nullable |
| metadata | jsonb | |
| created_at | timestamptz | |

**Event types:** vow_created, vow_sealed, witness_invited, witness_accepted, witness_declined, challenge_sent, challenge_accepted, challenge_declined, challenge_expired, check_in, verdict_submitted, verdict_self_resolved, auto_resolved, vow_voided, refund_issued, refund_failed, sms_failed, sms_retried, vow_day1, vow_midpoint.

### `public.sms_log`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| vow_id | uuid FK | |
| message_type | text | seal, warmup, verdict_request, outcome, witness_reminder, challenge_invite |
| twilio_sid | text | |
| sent_at | timestamptz | |

### `public.push_queue`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK | |
| title | text | |
| body | text | |
| data | jsonb | {vow_id, event, route?} |
| send_after | timestamptz | |
| sent | boolean | |
| created_at | timestamptz | |

### Database Function
**`get_display_name(user_uuid uuid) → text`** — SECURITY DEFINER function that bypasses RLS to return display_name for any user. Used by witnesses/targets to see the maker's name.

---

## 5. RLS (Row Level Security) Policies

| Table | Who | Can Do |
|-------|-----|--------|
| users | Own user (auth.uid() = id) | SELECT, INSERT, UPDATE |
| vows | Maker (user_id = auth.uid()) | SELECT, INSERT, UPDATE |
| vows | Witness (witness_user_id = auth.uid()) | SELECT |
| vows | Target (target_user_id = auth.uid()) | SELECT |
| audit_events | Maker of parent vow | SELECT, INSERT (check_in only) |
| audit_events | Witness of parent vow | SELECT |
| audit_events | Target of parent vow | SELECT |
| sms_log | Service role only | All |
| push_queue | Service role only | All |

Edge Functions use the **service role key** to bypass RLS when acting on behalf of witnesses/targets (who may not have accounts).

---

## 6. Vow State Machine

```
                    ┌─────────┐
                    │  draft   │
                    └────┬─────┘
                         │ seal-vow (payment captured if staked)
                    ┌────▼─────┐
                    │  sealed   │
                    └────┬─────┘
                         │ (immediate transition to active)
                    ┌────▼─────┐
              ┌─────│  active   │─────┐
              │     └────┬─────┘      │
              │          │ ends_at    │ void-vow
              │          │ passes    │ (maker cancels)
              │     ┌────▼──────────┐ │
              │     │awaiting_verdict│ │
              │     └──┬────┬───┬──┘  │
              │        │    │   │      │
              │   kept │    │   │broken│
              │        │    │   │      │
              │   ┌────▼┐ ┌▼──┐├────▼─┐
              │   │ kept │ │72h││broken│
              │   └─────┘ │auto│└──────┘
              │           │kept│
              │           └───┘
              │                ┌──────┐
              └───────────────►│voided│
                               └──────┘
```

**Challenge sub-state:** `challenge_status: pending → accepted | declined | expired`
- If declined or expired (48h timeout) → vow is voided.
- If accepted → vow becomes active (target pays their own stake).

---

## 7. Stripe Payment Flow

```
$0 vow:   seal-vow skips Stripe entirely → status = active
Staked:   create-payment-intent (manual capture) → user pays → seal-vow captures → active
Kept:     submit-verdict → full refund (idempotency key: refund-{vow_id})
Broken:   submit-verdict → money stays captured (goes to destination)
Voided:   void-vow → full refund (or cancel if still uncaptured)
```

**Key details:**
- Minimum stake: $10 (1000 cents). Maximum: $100 (10000 cents).
- `capture_method: 'manual'` — payment is authorized on seal, captured only if broken.
- Refund idempotency key: `refund-{vow_id}` prevents duplicate refunds.
- Non-real PI IDs (not starting with `pi_`) skip Stripe operations (dev bypass).
- Challenge stakes: target chooses their own amount on acceptance.
- Failed refunds set `refund_failed = true` and are retried by cron.

---

## 8. Edge Functions (Supabase)

### `create-payment-intent`
- **Auth:** JWT (user must own the vow)
- **Input:** `{ vow_id }`
- **Logic:** Gets/creates Stripe customer, creates PaymentIntent with manual capture, saves PI ID to vow.
- **Output:** `{ clientSecret, paymentIntentId }`

### `seal-vow`
- **Auth:** JWT (user must own the vow)
- **Input:** `{ vow_id, skip_payment? }`
- **Logic:** Validates vow is draft/sealed. For staked vows: verifies Stripe PI captured. Updates status → active, sealed_at → now. Sends SMS to witness (standard) or target (challenge). 2 retry attempts for SMS.
- **Output:** `{ success: true }`

### `submit-verdict`
- **Auth:** Public (uses witness_invite_token)
- **Input:** `{ token, verdict: "kept"|"broken" }`
- **Logic:** For "kept" with real Stripe PI: refunds first (blocks verdict on refund failure). Updates verdict + status. Sends outcome SMS. Pushes to all stakeholders.
- **Output:** `{ success: true, verdict }`
- **Error:** 502 if Stripe refund fails.

### `accept-witness`
- **Auth:** Public (uses witness_invite_token)
- **Input:** `{ token, action: "accept"|"decline"|"save-reminder", phone?, name? }`
- **Logic:** Accept → sets witness_accepted_at, tries to link witness account. Decline → sets witness_declined, pushes to owner. Save-reminder → stores phone for future SMS.
- **Output:** `{ success: true }`

### `accept-challenge`
- **Auth:** Public (uses challenge_invite_token)
- **Input:** `{ token, action: "prepare_payment"|"accept"|"decline"|"save_phone", stake_amount?, destination?, email?, payment_intent_id? }`
- **Logic:** Accept → captures target's payment, creates/finds target user account, atomically updates challenge_status → accepted + status → active. Handles race conditions (refunds if another client accepted simultaneously). Decline → voids vow.
- **Output:** `{ success: true }`
- **Errors:** 409 (already responded), 402 (payment failed)

### `void-vow`
- **Auth:** JWT (user must own the vow)
- **Input:** `{ vow_id }`
- **Logic:** Refunds payment if real Stripe PI. Updates status → voided. Notifies witness.
- **Output:** `{ success: true, refunded }`

### `send-sms`
- **Auth:** Service role or JWT
- **Input:** `{ vow_id, message_type, body_override? }`
- **Logic:** Idempotency check via sms_log. Sends via Twilio. Logs to sms_log.
- **Output:** `{ success: true, twilio_sid }`

### `cron-runner` (runs every ~15 minutes)
- **Auth:** Service role
- **Tasks:**
  1. **Witness reminders** — SMS if witness hasn't accepted after 24h
  2. **Warmup SMS** — 12-36h before deadline
  3. **Verdict request** — When ends_at passes, status → awaiting_verdict, SMS to witness
  4. **Auto-resolve** — 72h with no verdict → auto "kept", refund, notify all
  5. **Push dispatch** — Sends queued push notifications via Expo Push API
  6. **SMS retry** — Retries sms_failed vows (max 3 attempts)
  7. **Refund retry** — Retries refund_failed vows
  8. **Vow lifecycle pushes** — Queues Day 1, midpoint, countdown, verdict-time reminders
  9. **Challenge expiry** — Expires pending challenges after 48h

### `verdict-page`
- **Auth:** None (public HTML)
- Server-rendered HTML form for witness verdict submission (legacy fallback).

---

## 9. Shared Backend Code (`supabase/functions/_shared/`)

### `twilio.ts`
```typescript
sendSMS(to: string, body: string): Promise<string>  // Returns Twilio SID
```
Uses basic auth with `TWILIO_ACCOUNT_SID:TWILIO_AUTH_TOKEN`.

### `sms-templates.ts`
Templates for all SMS types: seal, witness reminder, warmup, verdict request, outcome, challenge invite. Each returns a formatted string with vow details and action URLs.

### `audit.ts`
```typescript
createAuditEvent(supabase, vowId, eventType, actorType, actorId?, metadata?): Promise<void>
```
Non-blocking insert to audit_events. Logs errors but never throws.

---

## 10. Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Web | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web | Supabase anonymous JWT |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Web | Stripe client key |
| `SUPABASE_URL` | Edge Functions | Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Service role (bypasses RLS) |
| `STRIPE_SECRET_KEY` | Edge Functions | Stripe server key |
| `TWILIO_ACCOUNT_SID` | Edge Functions | Twilio account |
| `TWILIO_AUTH_TOKEN` | Edge Functions | Twilio auth |
| `TWILIO_PHONE_NUMBER` | Edge Functions | Sender phone |

Expo stores Supabase URL, anon key, Google OAuth credentials, and Stripe publishable key in `app.json` → `expo.extra`.

**Supabase project ref:** `faufcfppnkwrxabgvknt`

---

## 11. Web App (Next.js)

### Routes

**Vow creation flow (multi-step):**
- `/` — Home, enter vow text
- `/guided` — Full onboarding flow for new users
- `/refine` — AI-assisted vow sharpening
- `/stake` — Set amount, consequence, deadline
- `/seal` — Review, authenticate, pay, confirm
- `/sent` — Post-seal success

**Active vow tracking:**
- `/dashboard` — All vows hub (my vows + witnessing + challenges)
- `/live` — Single active vow view (prioritizes awaiting_verdict)
- `/vow/[id]` — Vow detail with timeline
- `/self-resolve` — Self-witness verdict

**Outcomes:**
- `/vow-kept` — Celebration page
- `/vow-broken` — Consequence page
- `/certificate/[vowId]` — Shareable certificate
- `/outcome/[vowId]` — Public outcome page

**Witness/challenge (public, no auth required):**
- `/w/[token]` — Witness accept/decline page
- `/w/[token]/verdict` — Witness verdict submission
- `/c/[token]` — Challenge accept/decline page

**Other:**
- `/create` — Power-user single-page vow creation
- `/cast` — Dare/challenge a friend
- `/history` — Past vows archive
- `/settings` — User preferences
- `/privacy`, `/terms` — Legal
- `/auth/callback` — OAuth callback

### Key Architecture Patterns

**State management:**
- `AuthProvider` (React Context) — global auth session
- `VowFlowProvider` (React Context + localStorage) — multi-step creation state that survives OAuth redirects
- localStorage keys: `unbreakable-vow-flow`, `auth-return-path`, `challenge-pending-state`
- Cookies (`auth_return_path`, `vow_flow_backup`) for Safari cross-origin OAuth survival

**Auth flow:**
- Magic Link (email OTP with 6-digit code, 60s resend cooldown)
- Google OAuth
- Name collection on first login
- No passwords stored

**Admin emails** (hard-coded for delete operations in `/live`): `rosenfield.joseph@gmail.com`, `joero93@gmail.com`, `joe@turnkey.io`

**Middleware:** Redirects `/witness?token=X` → `/w/X`

**Dashboard polling:** 30-second interval + visibility change handler for auto-refresh.

**Dashboard sort logic (`dashboard-sort.ts`):**
- Card states: M1–M11 (maker states), W1–W2 (witness states), T1–T3 (target states)
- Urgency tiers 1–6 (urgent → low priority)
- Determines tap target routing per card state

### Design System

**Theme:** Dark-only. Background `#05070B`, surfaces `#10141C`–`#1B2230`.

**Brand color:** Gold — `#D4A24F` (normal), `#F0C86E` (bright), `#8C6423` (deep).

**Typography:** System font stack (-apple-system, BlinkMacSystemFont, Segoe UI). Serif fallback (Georgia) for headings.

**Core UI components** (`components/ui.tsx` — DO NOT MODIFY):
- `RitualScreen` — Page wrapper with header/footer
- `HeaderBadge` — Logo badge
- `TitleBlock` — Section heading (eyebrow + title + subtitle)
- `RitualCard` — Styled card container
- `PrimaryButton` — Gold gradient CTA
- `SecondaryButton`, `ChoiceChip`, `VowPreview`, `StatPill`, `SectionLabel`, `FadeUp`

**Other components:** `auth-modal.tsx`, `payment-form.tsx` (Stripe Elements), `share-button.tsx`, `dashboard-card.tsx`, `dashboard-hero.tsx`, `hamburger-menu.tsx`, `timeline.tsx`, `vow-card.tsx`.

---

## 12. Mobile App (Expo)

### Creation Flow (Sequential Screens)

1. **index.tsx** — Vow input with example chips. Returning users → quick-vow.
2. **refine.tsx** — AI sharpening (skipped if vow is "already_good").
3. **witness.tsx** — Choose "Just me" or "Friend" (native contacts picker).
4. **stake.tsx** — Amount ($10/$25/$50/$100), consequence, destination, deadline.
5. **seal.tsx** — Auth (Google Sign-In or email), Stripe Payment Sheet, call seal-vow edge function.
6. **certificate.tsx** — Visual certificate, share via `react-native-view-shot`.
7. **live.tsx** — Active tracking with witness status, countdown, verdict submission.

### Other Screens
- `dashboard.tsx` — All vows hub
- `vow-detail.tsx` — Full details + timeline
- `quick-vow.tsx` — Returning users' fast creation
- `witness-invite.tsx` — Deep-linked witness acceptance
- `witness-verdict.tsx` — Witness verdict submission
- `self-resolve.tsx` — Self-witness resolution
- `vow-kept.tsx` / `vow-broken.tsx` — Outcome screens
- `history.tsx`, `settings.tsx`, `challenges.tsx`, `cast.tsx`
- `auth.tsx` — Auth screen

### Architecture

**Providers (nested in `_layout.tsx`):** StripeWrapper → QueryClientProvider → OathStateProvider → AuthProvider → VowFlowProvider → GestureHandlerRootView

**State management:**
- `VowFlowProvider` — Creation flow state (rawInput, refinedText, witness, stake, deadline)
- `AuthProvider` — Supabase session, displayName, signOut
- `OathStateProvider` — Onboarding state via AsyncStorage + React Query (introSeen, oath intervals)
- React Query for server state (vow fetching)
- Zustand for client state

**Supabase client:** AsyncStorage persistence, auto token refresh.

**Deep linking:** `unbreakablevow://` scheme. Witness invites link via `?token=`.

**Push notifications:** Expo Push API. Token saved to `users.push_token`. Notification taps route via `data.route`.

**Critical component — `components/vow-ui.tsx`** (NEVER MODIFY): Contains `RitualScreen`, `HeaderBadge`, `BackButton`, `TitleBlock`, `RitualCard`, `PrimaryButton`, `SecondaryButton`, `ChoiceChip`, `RitualInput`, `VowPreview`, `StatPill`, `SectionLabel`. Uses haptics, spring animations, gradient backgrounds.

### Key Libraries
- `@stripe/stripe-react-native` — Payment Sheet
- `@react-native-google-signin/google-signin` — Google OAuth
- `expo-contacts` — Native contacts
- `expo-notifications` — Push notifications
- `react-native-view-shot` — Screenshot for certificate sharing
- `@tanstack/react-query` — Server state
- `zustand` — Client state

---

## 13. Vow Logic (Rule-Based, No ML)

Located in `web/src/lib/vow-logic.ts` and `expo/lib/` (mirrored).

**`analyzeVow(text)`** — Returns 'vague' or 'already_good'. Checks for:
- Vague terms: "be better", "try harder", "improve", "more", "less"
- Required elements: action verb + measurable quantity + time reference

**`generateSuggestion(text)`** — Deterministic improvement. Adds time windows, deadlines, measurable targets based on keyword matching (100+ patterns for fitness, reading, work, etc.).

**`formalizeVow(text)`** — Capitalizes first letter, adds period.

**`inferDeadline(text)`** — Parses relative dates ("tomorrow", "this week", "next month", "April 15"). Returns ISO timestamp at 23:59:59 or null.

**Stake amounts:** $10 (nudge), $25 (sting), $50 (business), $100 (serious), $0 (free).

**Charity destinations:** ALS Association, St. Jude, Ronald McDonald House, Feeding America.
**Anti-cause destinations:** NRA, Donald Trump, Planned Parenthood, Kamala Harris, Ted Cruz.

**Example vows:** "Wake up before 7 every weekday", "Go to the gym 3x this week", "No takeout all week", "No texting my ex for 30 days".

---

## 14. SMS Templates & Flow

SMS are sent at key lifecycle moments:

1. **Seal** — Witness invite with accept link (`/w/{token}`)
2. **Witness reminder** — 24h after seal if witness hasn't accepted
3. **Warmup** — 12-36h before deadline
4. **Verdict request** — When deadline passes, includes verdict link (`/w/{token}/verdict`)
5. **Outcome** — After verdict, tells witness the result
6. **Challenge invite** — Sent to target with challenge link (`/c/{token}`)
7. **Void notification** — When maker cancels

**Idempotency:** All SMS checked against `sms_log` (by vow_id + message_type) before sending.

**Retry:** 2 immediate attempts on seal. Cron retries `sms_failed` vows up to 3 total attempts within 48h.

---

## 15. Landing Page

Static HTML at `/landing/`. Dark theme, gold accents. Playfair Display + Crimson Pro + Inter fonts. Features:
- Hero: "Make a vow. Mean it."
- Vow input field with preset chips
- "How it works" bottom sheet
- Live stakes counter
- No build process (plain HTML deployed to Vercel)
- Vercel rewrite: `/witness` → `/witness.html`

---

## 16. Deployment

| App | Platform | Config |
|-----|----------|--------|
| Web | Vercel | `.vercel/project.json`, auto-deploy from Git |
| Mobile | EAS Build | `eas.json` (dev/preview/production profiles) |
| Landing | Vercel | `vercel.json` with rewrites |
| Backend | Supabase (hosted) | Edge Functions + managed PostgreSQL |

**Git:** GitHub at `github.com/joeyr0/rork-unbreakable-vow.git`. Branches: `main`, `feature/challenge-v1`.

**Mobile app IDs:** iOS `app.unbreakablevow.ios`, Android `app.unbreakablevow.android`.

---

## 17. Critical Files — DO NOT MODIFY

### Web (preserve existing behavior):
- `/refine/page.tsx`, `/stake/page.tsx`, `/witness/page.tsx` (first-time flow)
- `/live/page.tsx`, `/self-resolve/page.tsx` (single-vow tracking)
- `/vow-kept/page.tsx`, `/vow-broken/page.tsx` (outcome pages)
- `/history/page.tsx`, `/settings/page.tsx`
- `/w/[token]/page.tsx` (witness invite — server component)
- `/outcome/[vowId]/page.tsx` (public outcome)
- `/auth/callback/page.tsx`
- `components/ui.tsx`, `components/auth-modal.tsx`, `components/share-button.tsx`
- `providers/auth-provider.tsx`
- `lib/supabase.ts`, `lib/vow-logic.ts`
- `middleware.ts`, `layout.tsx`, `globals.css`

### Expo:
- `components/vow-ui.tsx` — **NEVER MODIFY** (core design system)
- All existing screen files, providers, `lib/supabase.ts`

### Supabase:
- All existing migration files
- `create-payment-intent/index.ts`, `send-sms/index.ts`, `verdict-page/index.ts`

---

## 18. Key Patterns & Conventions

**Token-based access:** Witnesses and challenge targets access via unique UUID tokens embedded in URLs. No account required. Edge functions use service role to bypass RLS.

**Audit trail:** All state changes logged to `audit_events` via `_shared/audit.ts`. Check-ins are written directly by client via RLS.

**$0 vows:** When `stake_amount = 0`, ALL Stripe operations are skipped. Always check `stripe_payment_intent_id IS NOT NULL` before any Stripe call.

**Challenge vows:** The maker becomes the witness. The target is the challenged person. One vow row (not two).

**Idempotency:** Stripe refunds use `refund-{vow_id}`. SMS checked against sms_log. Witness acceptance checks `witness_accepted_at IS NULL`. Push notifications deduped by `data->event` in push_queue.

**Auto-resolve:** If no verdict after 72h in awaiting_verdict, cron auto-resolves as "kept" and refunds.

**Challenge expiry:** If challenge not accepted/declined within 48h, cron expires it and voids the vow.

**OAuth state survival:** Flow state persisted to both localStorage and cookies to survive Safari's cross-origin cookie wipes during OAuth redirects.

**Admin access:** Hard-coded email list for destructive operations (delete vow). Currently: `rosenfield.joseph@gmail.com`, `joero93@gmail.com`, `joe@turnkey.io`.

---

## 19. Database Migrations Timeline

1. `20260404000001` — Initial schema (users, vows, sms_log, push_queue, RLS)
2. `20260404000002` — pg_cron + pg_net extensions
3. `20260405000001` — Witness acceptance columns + indexes
4. `20260406000001` — Witness update policy via token
5. `20260408000001` — Security fixes (tighten RLS, add refund_failed/sms_failed)
6. `20260408000002` — V1 Dashboard (vow_type, target fields, challenge flow, audit_events)
7. `20260410000001` — Challenge expansion (suggested_stake_amount, expire status)
8. `20260414000001` — get_display_name function

---

## 20. Error Handling Conventions

| HTTP Code | Meaning |
|-----------|---------|
| 401 | Missing or invalid auth |
| 400 | Invalid payload or wrong vow state |
| 402 | Stripe payment failed |
| 404 | Invalid token or vow not found |
| 409 | State conflict (already accepted/judged) |
| 502 | Stripe refund/cancel failed (non-fatal, retried by cron) |

Edge functions return JSON: `{ success: true, ...data }` on success, `{ error: "message" }` on failure.

**Refund failures are non-blocking for UX:** The vow is flagged `refund_failed = true` and cron retries, rather than leaving the user stuck.

---

## 21. Quick Reference: Typical User Journeys

### Standard Vow
1. User writes vow → `/` or `/create`
2. Optionally refines → `/refine`
3. Sets stake + deadline → `/stake`
4. Assigns witness (name + phone) → `/witness` (web) or `witness.tsx` (mobile)
5. Reviews + pays → `/seal` → Stripe captures payment
6. `seal-vow` edge function: status → active, SMS sent to witness
7. Witness gets SMS → opens `/w/{token}` → accepts
8. Vow is live → user tracks at `/live` or `/dashboard`
9. Deadline passes → cron: status → awaiting_verdict, SMS verdict request to witness
10. Witness opens `/w/{token}/verdict` → submits "kept" or "broken"
11. `submit-verdict`: refund (if kept) or keep payment (if broken), update status
12. User sees outcome at `/vow-kept` or `/vow-broken`

### Challenge Vow
1. Challenger creates vow with `vow_type: 'challenge'` + target phone
2. `seal-vow`: SMS to target with `/c/{token}` link
3. Target opens link → sees challenge → chooses stake → pays → accepts
4. `accept-challenge`: captures payment, status → active, challenger notified
5. At deadline → challenger (who is the witness) submits verdict
6. Outcome processed same as standard vow

### Self-Witness Vow
1. Same as standard but witness_type = 'self' (no external witness assigned)
2. At deadline → user self-resolves at `/self-resolve`
3. User submits own verdict (honor system)

---

## 22. Project Metadata

- **Creator:** Joe Rosenfield (joe@turnkey.io / rosenfield.joseph@gmail.com)
- **GitHub:** github.com/joeyr0/rork-unbreakable-vow
- **Supabase project:** faufcfppnkwrxabgvknt
- **Vercel project:** rork-unbreakable-vow (prj_bJkHETAojQhkLL4jFhqp5DstIm6L)
- **EAS project:** 229acb21-4fb1-4d1b-be8a-2feb1c98a020
- **Expo owner:** joey_r0
- **Deep link scheme:** unbreakablevow://
- **App origin:** https://unbreakablevow.app
