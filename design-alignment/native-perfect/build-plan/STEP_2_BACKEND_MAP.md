# STEP 2 — Backend Mapping

Source-of-truth: edge function source under `supabase/functions/`, migrations under `supabase/migrations/`, native client `expo/lib/vow-api.ts`. CLAUDE.md is informational but, where it disagrees with the deployed code, the deployed code wins.

This document maps every screen and every uncovered surface from Step 1 onto the actual backend contracts: which function is called, what payload, what response, what state mutates. It also flags every gap where the mock implies something the backend doesn't currently do.

---

## A. Schema reality vs. CLAUDE.md

CLAUDE.md is mostly accurate. Significant deltas:

### Vow status lifecycle

CLAUDE.md says `draft → sealed → active → awaiting_verdict → kept|broken|voided`. **Reality:** `seal-vow` flips status directly to `'active'`, never `'sealed'`. The `'sealed'` status value is retained in the enum for backward compatibility (older vows in production), and several functions (`accept-witness`, `submit-verdict`, `void-vow`) accept `'sealed'` as a valid input. But no live code path produces it. **Canonical lifecycle:**

```
draft → active → (deadline passes) → awaiting_verdict → kept | broken
draft → active → (maker voids) → voided
draft → (maker voids) → voided
```

Implication for the build:
- "Sealed Moment" (screen 06) is a UI moment, not a DB state. The vow is `active` by the time 06 renders.
- Step 1 patch P-1's matrix uses `witness_accepted_at IS NULL` as the discriminator for "post-seal waiting"; that's correct because the vow is `active` from seal forward, regardless of whether the witness has accepted.
- Reviewer subagent must NOT require `'sealed'` to appear in any new code path. Anything that reads status should treat `active` + `witness_accepted_at IS NULL` as the "post-seal, waiting for witness" state.

### `vows` columns added since CLAUDE.md was last updated

```
stripe_setup_intent_id        text     (apr 20)
stripe_payment_method_id      text     (apr 20)
witness_notified_at           timestamptz (apr 22)
witness_midpoint_notified_at  timestamptz [DEPRECATED, V7]
maker_24h_nudge_sent_at       timestamptz (apr 22)
witness_invited_at            timestamptz (apr 22)
witness_token_expires_at      timestamptz default (now() + 30 days) (apr 22)
currency                      text default 'USD' check (currency in ('USD'))
witness_phone_e164            text     (apr 22)
target_phone_e164             text     (apr 22)
witness_share_locked_at       timestamptz (apr 27)
witness_share_method          text check ('share'|'copy'|'contact') (apr 27)
terms_hash                    text     (apr 27)
superseded_by_vow_id          uuid FK → vows(id) (apr 27)
```

### `users` columns added

```
first_seal_completed_at       timestamptz
display_name_source           text check ('apple_pay'|'manual'|'sms'|'none')
name_capture_prompted_at      timestamptz
phone_e164                    text unique
last_push_receipt_ok_at       timestamptz
last_push_receipt_failed_at   timestamptz
sms_only_preference           boolean default false
deleted_at                    timestamptz
```

### New tables

```
sms_retry_queue   — for SMS retries on Twilio transient failures
settlements       — payout ledger (apr 25 migration)
sms_opt_outs      — STOP/HELP keyword tracking (apr 27)
sms_inbound_log   — Twilio inbound webhook log (apr 27)
```

### RLS additions

- `vows_select_as_witness` policy lets `witness_user_id` read their watched vows.
- `vows_select_as_target` policy lets `target_user_id` read challenge vows.

---

## B. Edge function contracts (deployed reality)

| Function | Auth | Frozen? | Purpose | Required body | Returns |
|---|---|---|---|---|---|
| `create-payment-intent` | JWT | YES | Legacy name; creates SetupIntent (off_session, $10–$100), upserts Stripe customer, links SI to vow. | `{ vow_id }` | `{ clientSecret, setupIntentId }` |
| `save-card` | JWT | NO | Functionally identical to `create-payment-intent`. Newer name. | `{ vow_id }` | `{ clientSecret, setupIntentId }` |
| `seal-vow` | JWT | NO | Verifies SI succeeded, saves payment_method on vow, flips status to `active`, fires SMS to witness/target, queues maker push, queues maker SMS confirm. | `{ vow_id, skip_payment? }` | `{ success }` |
| `submit-verdict` | NONE (token) | NO | Atomically writes verdict, charges off-session if broken (via SetupIntent payment_method), refunds/cancels if kept (legacy PI flow only — SetupIntent kept = no-op), writes settlements row, fires outcome SMS to maker + witness, queues push to maker (and target if challenge). | `{ token, verdict: 'kept'\|'broken' }` | `{ success, verdict }` or `{ error: 'refund_failed' }` (502) |
| `accept-witness` | NONE or JWT | NO | Atomically marks witness_accepted_at, links witness_user_id (priority: JWT, fallback: phone match), fires SMS confirms, queues push to maker. Also handles `decline` and `save-reminder` actions. | `{ token, action?: 'accept'\|'decline'\|'save-reminder', phone?, name? }` | `{ success, already_accepted? }` |
| `accept-challenge` | NONE | NO | Two-phase: `prepare_payment` creates target user + Stripe customer + SetupIntent; `accept` verifies SI, atomically flips vow to `active`, links target_user_id. | `{ token, action: 'prepare_payment'\|'accept'\|'decline', stake_amount?, ... }` | varies |
| `void-vow` | JWT | NO | Owner-only. Voids vow + handles refund/cancel based on SI vs PI state. SetupIntent path: nothing to refund. | `{ vow_id }` | `{ success, refunded }` |
| `send-sms` | JWT or service | YES | Idempotent SMS send through Twilio. Logs to sms_log. | `{ vow_id, message_type, body_override? }` | `{ success, skipped?, twilio_sid? }` |
| `cron-runner` | service | NO | Background jobs: witness reminders, warmup, verdict requests, 72h auto-resolve, SMS retries, refund retries, challenge expiry, push queue flush. | (none) | counts per job type |
| `verdict-page` | NONE | YES | Public HTML verdict page (legacy fallback). Native does NOT use this. | query params | HTML |
| `prepare-judge-link` | JWT | NO | Pre-payment witness-link generator. Creates a draft vow and returns a witness URL + share text. Used by web's "Share link" / "Copy link" affordances pre-payment. **Critical for Step 1 patch P-2.** | `{ raw_input, refined_text, witness_name?, stake_amount_cents, consequence, destination, ends_at, share_method }` | `{ vow_id, witness_url, share_text }` |
| `request-early-completion` | JWT | NO | Maker can ask witness to release them before deadline. Fires SMS to witness. Vow keeper only. Status must be `active`. | `{ vow_id }` | `{ success }` |
| `delete-account` | JWT | NO | Soft-delete of user account. | `{ user_id }` | `{ success }` |
| `stripe-webhook` | Stripe sig | NO | Receives Stripe events (charge succeeded, refund completed, dispute opened, etc.). Updates settlements + audit_events. | Stripe event | `{ received }` |
| `twilio-inbound` | Twilio sig | NO | Receives inbound SMS (STOP/HELP/START keywords). Updates `sms_opt_outs` table. | Twilio webhook | TwiML |

### Legacy/duplicate to consolidate

- `create-payment-intent` and `save-card` are functionally equivalent. The native build will use `save-card` (newer, not on the frozen list). `create-payment-intent` stays in production for legacy clients.

---

## C. Per-screen backend contract

Each row maps a Step 1 screen to its backend operations. "—" = no backend touchpoint. Patches P-1 through P-7 from Step 1 are honored.

### Phase 1 — Maker creation

| Screen | Read | Write | Function calls | Notes |
|---|---|---|---|---|
| 01 (Vow input) | — | — | — | Pure local state. `rawInput` only. |
| 02 (Stake) | — | — | — | Local state: `stake_amount`, `consequence`, `destination`. |
| 02b (Verdict date sheet) | — | — | — | Local state: `deadlineIso`. |
| 02c (Destination sheet) | — | — | — | Local state: `consequence`, `destination`. |
| 03 (Choose witness) | — | — | — | Local state: nothing yet committed. |
| 03b (Pick witness sheet) | iOS contacts API | — | — | Native `expo-contacts`. Local state: `witness_name`, `witness_phone`. |
| 03c (Witness selected) | — | **DB INSERT vows row** + `witness_invite_token` (UUID v4 client-generated) | `vow-api.ts: createVow()` (NOT a function — direct supabase.from('vows').insert) **OR** `prepare-judge-link` edge fn (recommended path). | This is where Step 1 patch P-2 lives. See §D below for the full decision. |

### Phase 2 — Auth (interleaved with creation)

| Screen | Read | Write | Function calls | Notes |
|---|---|---|---|---|
| 04 (Phone) | — | — | `supabase.auth.signInWithOtp({ phone })` | Sends OTP via Supabase Auth → Twilio. |
| 04b (OTP) | — | DB UPSERT `users` row | `supabase.auth.verifyOtp({ phone, token, type: 'sms' })` | On success, creates auth.users entry; trigger or app-level upsert into `public.users` row. |
| 04c (Name) | — | DB UPDATE `users.display_name`, `display_name_source = 'manual'` | `supabase.from('users').update({ display_name })` | |

### Phase 3 — Payment + seal

| Screen | Read | Write | Function calls | Notes |
|---|---|---|---|---|
| 05 (Add Payment) | DB SELECT vow | — | `save-card` (returns clientSecret) | Sets `vows.stripe_setup_intent_id`. |
| 05b (Stripe sheet) | Stripe servers | Stripe SetupIntent confirmed | `useStripe().initPaymentSheet(...)` then `presentPaymentSheet()` | Stripe handles the sheet UI entirely. SI status flips to `succeeded` on user confirmation. |
| 06 (Sealed Moment) | DB SELECT vow | DB UPDATE `vows.status` to `'active'`, `sealed_at`, `stripe_payment_method_id` | `seal-vow` | Per Step 1 patch P-3, user taps to advance — but `seal-vow` is invoked BEFORE 06 renders (after PaymentSheet succeeds). 06 renders only after `seal-vow` returns success. |

### Phase 4 — Post-seal share/wait

Per Step 1 patch P-1 matrix. All screens listed below are different visual states of the same route (vow detail, status=`active`, witness_accepted_at IS NULL).

| Screen | Read | Write | Function calls | Notes |
|---|---|---|---|---|
| 07 (Send invite, named witness w/ phone) | DB SELECT vow | AsyncStorage SET `sms_open_attempted:{vow_id}` on tap of "Text Joe the invite" | `Linking.openURL('sms:{phone}&body={...}')` or `expo-sms`. **No backend call** — the SMS was already sent by `seal-vow`; this is the maker re-engaging from the same draft. | The pre-filled text in messageCard is local; the URL `unbreakablevow.app/w/{token}` comes from the vow row. |
| 07B (Share, no witness) | DB SELECT vow | AsyncStorage SET `sms_open_attempted` | `Share.share({ message, url })` | Native iOS share sheet. |
| 08 (Waiting detail, named, pre-tap) | DB SELECT vow + audit_events | — | none | Polling or Supabase realtime subscription for `witness_accepted_at` change. |
| 08B (Waiting detail, returned-from-SMS) | same as 08 | — | none | Differs from 08 only by the AsyncStorage flag. |
| 08C (Waiting detail, share-link path) | same as 08 | — | none | Differs by `witness_phone IS NULL`. |

### Phase 5 — Active / verdict (maker)

| Screen | Read | Write | Function calls | Notes |
|---|---|---|---|---|
| 09 (Joe Accepted) | Realtime subscription on vow.witness_accepted_at | — | none | Triggered the first time the maker is in-app and acceptance happens. Per audit: should be one-time only. AsyncStorage flag `accept_celebration_seen:{vow_id}` to suppress re-show. |
| 10 (Mid-Vow Active) | DB SELECT vow + audit_events | AsyncStorage flag `accept_celebration_seen` set on first present | quietLink "Text Joe a check-in" → SMS deep link (no backend). "Share vow" → native share sheet. | |
| 11 (Almost Verdict Time) | same | same | "Text Joe a final check-in" → SMS deep link. | Visually distinct from 10 by `(ends_at - now) < 24h`. |
| 12 (Verdict Due, Waiting) | same | — | "Nudge Joe to decide" → **NEW backend endpoint needed** OR uses existing `send-sms` with `message_type: 'verdict_request'`. | See §E.2 below. |
| Maker M-Kept (per P-4) | DB SELECT vow + settlements | — | — | Visible after `submit-verdict` flips status to `kept`. |
| Maker M-Broken (per P-4) | DB SELECT vow + settlements | — | — | Same. settlements row gives the "where did $ go" detail. |

### Phase 6 — Dashboard

| Screen | Read | Write | Function calls | Notes |
|---|---|---|---|---|
| 13 (Dashboard) | `getMyVows()`, `getWitnessingVows()`, `getIncomingChallenges()`, `getRecentVows()` | — | — | Empty state per P-6. Sort/filter rules in §F. |
| 13B (Menu overlay) | same | — | — | Reads counts from same queries; no extra backend. |

### Phase 7 — Power-user

| Screen | Read | Write | Function calls | Notes |
|---|---|---|---|---|
| 14 (Judging Dashboard) | `getWitnessingVows()` | — | — | Sort: urgent (deadline-distance ASC) first, then active (status=active). |
| 15 (Dares You Sent) | DB SELECT vows where user_id=me AND vow_type='challenge', filtered by `challenge_status` per tab | — | "Resend invite" → **NEW or reused** (likely reuses `seal-vow` with `resend_sms: true` like web does). | "Dare someone →" → cast/challenge creation flow. |
| 16 (Quick Vow Main) | Recent witness / saved payment method state | Create draft vow on submit; DB UPDATE vow.stripe_setup_intent_id if paid | Saved method exists: launch PaymentSheet/Apple Pay directly, then `seal-vow`. No saved method: route to 16B. $0: skip Stripe and call `seal-vow` with skip-payment rules. | Returning-user-only. Defaults to last witness when available. Tap "Stake $X →" is the happy-path payment trigger, not a route to 16B. |
| 16B (Quick Vow Add Payment Fallback) | DB SELECT vow | DB UPDATE vow.stripe_setup_intent_id | `save-card` then PaymentSheet then `seal-vow` | Fallback-only when no saved method exists, Stripe customer state is missing, or prior vow history is $0-only. Same backend path as 05/05b/06 collapsed. |

### Phase 8 — Witness side

| Screen | Read | Write | Function calls | Notes |
|---|---|---|---|---|
| 17 (Witness Accepted) | DB SELECT vow via `getVowByWitnessToken(token)` | DB UPDATE `witness_accepted_at`, optional `witness_user_id` | `accept-witness` action=accept | Native deep link `/w/{token}` lands here OR on a confirmation card before this. |
| 18 (Witness Mid-Vow) | DB SELECT vow + audit_events | — | "Text Joe a check-in" SMS deep link (no backend). | |
| 19 (Witness Almost Up) | same | — | same | Visually distinct by `<24h`. |
| 20 (Witness Time's Up) | same | DB UPDATE verdict + status | `submit-verdict` with token + verdict | Yes/No buttons commit on tap-confirm (single confirm — no second sheet for Yes; Yes/No → confirm sheet → submit, per Step 3 design TBD). |

### Phase 9 — Settings/history/derived/error/empty/loading

All in Step 3.

---

## D. Resolution of Step 1 patch P-2 (draft vow creation timing)

**Step 1 said:** vow row created at end of 03c (or on Share-link / Go-solo from 03), via `createVow()` from vow-api.ts.

**Backend reality check:** `createVow()` requires an authed session. Calling it before 04/04b/04c means the user must already be authed by 03 — which they aren't if this is their first vow.

**Two viable paths:**

1. **Path A — `prepare-judge-link` (recommended).** This edge function exists, is unfrozen, and is already used by the web app. It accepts an unauthed payload (header-checked but no user requirement), creates a draft vow with the supplied terms (raw_input, refined_text, stake_amount_cents, consequence, destination, ends_at, witness_name?, share_method), generates a `witness_invite_token`, and returns `{ vow_id, witness_url, share_text }`. The vow is unowned (`user_id` placeholder, see below) until the user authenticates and reclaims it.

2. **Path B — Defer createVow until after auth.** Auth (04/04b/04c) runs immediately after 03c. Then `createVow()` runs with a session in hand. The downside: "Share link" on screen 03 (which fires before 03c is reached) doesn't have a vow yet, so its share URL has nothing to point to.

**Recommendation: Path A (use `prepare-judge-link`).**

Implementation detail: `prepare-judge-link` requires a user_id today (it has an `Authorization` header check) — verify by reading the function fully. If it does require auth, we have two sub-options:
- 1a. Authenticate the user FIRST (move 04 to before 03), and the vow gets created at 03c with auth in place.
- 1b. Modify `prepare-judge-link` to allow anonymous draft creation (a small edge function change — NOT on the frozen list per CLAUDE.md).

I lean toward **1a** because it keeps the backend simple and matches the web flow, but it requires moving auth earlier in the mock sequence (currently auth is steps 4/5 of 5; mocks would shift to auth at step 1 or 2 of 5). That's a real product change.

**Concrete proposal for Joey to confirm:** Path A, sub-option 1a, with mock sequence rearrangement: auth happens AT screen 01 if user is unauthed — i.e., the "SIGN IN" link becomes "SIGN UP / SIGN IN" and is the first action a new user takes. Returning users skip 04 entirely. The mock screens 04/04b/04c then become a derived "first-time auth on entry" sequence rather than mid-flow. This means the progress bar reads `1/5 → 2/5 → ... → 5/5` for vow input → stake → witness → review → payment — auth is pre-flow, not in the bar.

If Joey rejects the rearrangement, we go to **Path A, sub-option 1b**: small modification to `prepare-judge-link` to allow user_id-less drafts, and a reclamation path in `accept-challenge`-like fashion (the user takes ownership of the draft after they auth).

This is a real decision needed before Step 5 sequencing.

---

## E. Backend gaps — things mocks imply that backend doesn't currently do

### E.1 — Status `'sealed'` is not produced

CLAUDE.md says vow goes through `'sealed'`. Code doesn't. Acceptance: treat the post-seal pre-acceptance period as `(status='active' AND witness_accepted_at IS NULL)`. Step 9 specs and reviewer subagent rules must encode this.

No backend change needed; documentation drift only.

### E.2 — "Nudge Joe to decide" (screen 12)

The mock CTA "Nudge Joe to decide" implies an SMS to the witness asking them to submit a verdict. The existing `send-sms` function supports a `message_type: 'verdict_request'` and the cron-runner already fires this SMS automatically when the deadline passes.

Two paths:

- **Manual nudge** — new endpoint `nudge-witness` (or reuse `send-sms`). Accepts JWT + vow_id, sends a nudge SMS, rate-limited (e.g., 1 per 30min), increments a `vows.nudge_count` column or logs to `audit_events`.
- **Reuse cron logic** — the cron-runner already fires `verdict_request` SMS at deadline. The mock is showing a manual CTA that essentially fast-tracks what cron does anyway. We could just call `send-sms` with `message_type: 'verdict_request'` directly (idempotent — already de-duped by sms_log).

Recommend: **reuse `send-sms` with `message_type: 'verdict_request'`**, plus a client-side rate-limit (no more than one nudge per 30 minutes per vow). Avoids new backend code.

### E.3 — Real-time witness acceptance (for screen 09)

Step 9 spec for screen 09 needs real-time updates. Options:

- **Polling.** Simple. Refresh vow on every dashboard mount and on every detail-screen mount. Misses the "in-app moment" of acceptance.
- **Supabase Realtime.** Subscribe to `vows` table on the maker's row. Real-time push from server. Works in-app.
- **Push notification + cold start.** Push fires when witness accepts; tapping it opens the app at /vow/[id]. Doesn't help if the app is foreground.

Recommend: **Supabase Realtime subscription on the active vow detail screen**. When `witness_accepted_at` changes from null to non-null, present screen 09 as an overlay / replace the detail content. Push notifications still fire (already configured) for cold-start case.

No backend change needed — Supabase Realtime is enabled out-of-the-box for tables under RLS.

### E.4 — `accept_celebration_seen` flag (screen 09)

Per audit feedback, screen 09 should be one-time-only. Persist `accept_celebration_seen:{vow_id}` in AsyncStorage. Cleared on terminal vow state.

No backend change.

### E.5 — Witness-link expiration (`witness_token_expires_at`)

The `witness_token_expires_at` column defaults to `now() + 30 days` on insert. After expiration, the witness link should show a "this link has expired" state. Currently, no edge function checks expiration on token resolution.

Implementation: `accept-witness` and `submit-verdict` should reject if `witness_token_expires_at < now()`. **Small backend addition.** Cleaner alternative: add a guard in the edge function at the top of token resolution. **Add to Step 5 backlog.**

### E.6 — "Already declined" / "already voided" witness states

Mock screens 17–20 show happy paths only. The witness might open `/w/{token}` for a vow that's been:
- Voided by the maker.
- Self-resolved as kept (witness no longer needed).
- Already accepted on a different device.
- Declined by themselves earlier.
- Expired.

Each is a distinct visible state. Step 3 derived screens — see §F.

The backend already returns `{ error: 'invalid_token' }` for missing or expired vows, `{ error: 'already_judged' }` for resolved, `{ error: 'vow_not_active' }` for non-{active|awaiting_verdict|sealed} status. Frontend just needs to render these as distinct states.

### E.7 — Refund-failed retry surface

If `submit-verdict` returns `{ error: 'refund_failed' }` (502) on a "kept" verdict, the witness sees the witness-side equivalent of "we couldn't process the refund — try again." The cron-runner has refund retry logic, so the user-facing message can reassure that it'll retry. Mock 20 doesn't show this state — Step 3 derived.

### E.8 — Pre-payment witness-link generation

If a user creates a vow with no stake (`stake_amount = 0`), they skip Stripe entirely — `seal-vow` accepts `skip_payment: true` for $0 vows. But the mocks always show a stake. Either we don't ship $0 vows on native, or we add a "no stake" path. Decision: native ships paid only for v1; $0 vows remain web-only. This is a product call. **Surface to Joey.**

### E.9 — Challenge / dare flow gaps

Screen 15 "Dares You Sent" implies challenge vows the user created. The backend supports challenge vows (`vow_type='challenge'`, `target_user_id`, `target_phone`, `challenge_status`, `accept-challenge` function). Native today does NOT have a challenge creation flow. Mocks don't show one either. Step 3 derived.

`accept-challenge` is unfrozen. The challenge creation path needs:
- A new mock or a derived spec for "create a dare" (similar to 01–05 but with target instead of witness).
- DB: `vows.vow_type = 'challenge'`, plus `target_phone` and `challenge_invite_token`.
- The challenger acts as their own witness (per CLAUDE.md: "Maker = witness. Target = person being challenged. One vow row, not two.").

**For Step 1 scope:** mocks 14/15 surface dares but don't create them. Cast/dare creation is Step 3 derived design.

### E.10 — Maker outcome screens (M-Kept, M-Broken)

Per Step 1 patch P-4, copy + intent locked, full design Step 3. Backend: read the vow row + the corresponding `settlements` row (for M-Broken) to get the actual charged amount, destination payout status, and PI ID. No backend change.

---

## F. Sort/filter rules (for screens 13, 14, 15)

**Screen 13 (Dashboard) — vow card list, "Your vows" section:**

```
sort: 
  1. needs_attention (computed: deadline - now < 24h AND status in ('active','awaiting_verdict')) DESC
  2. status priority: awaiting_verdict, active, sealed, draft (descending priority)
  3. ends_at ASC (soonest deadline first)
  4. created_at DESC

filter (per role pill):
  All:     all of (my vows + judging + dares)
  My vows: getMyVows() result
  Judging: getWitnessingVows() result
  Dares:   getMyVows() WHERE vow_type = 'challenge' AND user_id = me
```

**Screen 14 (Judging) — "Awaiting" then "Active" sections:**

```
section "Awaiting":
  filter: status in ('awaiting_verdict') AND witness_user_id = me
  sort: ends_at ASC (most-urgent at top)

section "Active":
  filter: status in ('active') AND witness_user_id = me
  sort: ends_at ASC
```

**Screen 15 (Dares Sent) — by tab:**

```
tab "Open":     challenge_status = 'pending'    (sort: created_at DESC)
tab "Accepted": challenge_status = 'accepted' AND status in ('active','awaiting_verdict')
tab "Done":     status in ('kept','broken','voided') OR challenge_status = 'declined'
```

---

## G. AsyncStorage keys (the contract)

Step 1 P-5 introduces `sms_open_attempted:{vow_id}`. The full set:

| Key | Type | Set when | Cleared when |
|---|---|---|---|
| `sms_open_attempted:{vow_id}` | bool | User taps "Text Joe the invite" on screen 07 | Witness accepts (transition to 09) OR vow terminal state |
| `accept_celebration_seen:{vow_id}` | bool | Screen 09 has been shown once | Vow terminal state |
| `seal_intro_seen` | bool | First-time user has completed first vow | Never (persists per-device) |
| `last_active_vow_id` | string | On every screen 10/11 mount | App reset |

All keyed by vow_id where applicable to support concurrent vows.

---

## H. Real-time subscriptions

Active subscriptions per screen:

| Screen | Subscribes to | What changes triggers |
|---|---|---|
| 08, 08B, 08C | `vows.witness_accepted_at` change for `id={vow_id}` | Transition to 09 when non-null |
| 10, 11 | `vows.status` change | Transition to 12 (awaiting_verdict) or M-Kept/M-Broken |
| 12 | `vows.status` change | Transition to M-Kept/M-Broken |
| 13 (Dashboard) | `vows` for any change in user's set | Refresh the relevant card |
| 14 (Judging) | `vows.status` for `witness_user_id={me}` | Refresh list |
| 18, 19 | `vows.status` and `vows.verdict` | Transition to 20 (verdict due) or post-verdict outcome |

Use `supabase.channel('vow:{id}').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vows', filter: `id=eq.${vowId}` }, callback)`. Unsubscribe on screen blur.

---

## I. Error states by screen (where the spec must add explicit handling)

| Screen | Error | Surface |
|---|---|---|
| 04 | Invalid phone, OTP rate limit, network | Inline field error + retry option |
| 04b | Wrong OTP, expired OTP | Shake input + clear, sub-text becomes "Wrong code. Try again." |
| 05 | Stripe save-card failed | Toast "Couldn't save payment method. Try again." + stay on 05 |
| 05/06 | seal-vow returns `Payment not yet captured` (402) | Block transition to 06, show error toast on 05 |
| 06 | seal-vow returns 500 | Stay on 05 with a recoverable error message |
| 07 | Linking.openURL fails | Fallback to clipboard + toast "We couldn't open Messages. Link copied." |
| 12 | send-sms verdict_request fails | Toast "Couldn't reach Joe. We'll try again." (cron will retry) |
| 17 | accept-witness returns `vow_not_active` | Show "This vow is no longer active" derived screen (Step 3) |
| 17 | accept-witness returns `invalid_token` | Show "This link is no longer valid" derived screen |
| 20 | submit-verdict returns `refund_failed` | Toast "We couldn't process the refund. We'll retry. Joe will get the money back automatically." (Step 3 needs proper screen) |
| 20 | submit-verdict returns `already_judged` | Refresh and show post-verdict state |

---

## J. Open questions / decisions needed before Step 5

1. **Auth-first vs auth-mid creation flow.** §D resolution. Recommend: auth-first.
2. **$0 vows on native.** §E.8. Recommend: paid only for v1.
3. **Manual nudge mechanism on screen 12.** §E.2. Recommend: reuse `send-sms` with `verdict_request`, client-side 30min rate limit.
4. **Witness-link expiration UX.** §E.5. Recommend: backend guards in `accept-witness` and `submit-verdict`, derived screen for "expired link."
5. **Challenge creation flow scope.** §E.9. Either ship dares as a derived flow in Step 3 or push to Phase 2 native build (post-launch). Recommend: Step 3 derives the screens, but ship dares as a stretch goal — not on the critical path for top-3 quality on the maker/witness loops.

---

End of Step 2.
