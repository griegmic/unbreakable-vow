# Unbreakable Vow — What Exists Today

> A factual snapshot of Joe's MVP as built (verified against the codebase, June 2026), so we know exactly what we're building **Instant Market** on top of. Companion to `PRODUCT_STRATEGY.md`.

---

## Bottom line

This is **not a prototype — it's beta-stage production code.** A user can create a vow, seal it with a real card via Stripe, get a witness, be judged, and have money charged (broken) or released (kept), with SMS + push reminders throughout. Roughly 2–3 months of committed work. **No betting / prediction-market / multi-participant code exists yet** — that's all greenfield for us.

| Directory | State | Scale |
|---|---|---|
| `/web` | Substantial — full Next.js 16 app | ~48 route pages, 12 components |
| `/expo` | Substantial — React Native (expo-router) | 30+ screens, native Stripe + push + haptics |
| `/supabase` | Substantial — Deno edge fns + Postgres + RLS | 18 edge functions (~4,700 LOC), 18 migrations |
| `/landing` | Stub | static HTML |

---

## What's fully built ✅

**Core vow lifecycle (state machine).**
`draft → sealed → active → awaiting_verdict → kept | broken`, plus `voided` from any state and **72h auto-resolve → kept** via a cron job. Implemented end-to-end in edge functions + migrations.

**Money (Stripe).** The current model is **SetupIntent** (save a card at seal, no upfront charge):
- Kept → nothing charged.
- **Broken → off-session charge** of the stake to the saved card (idempotent).
- Void → refund. `$0` vows skip Stripe entirely.
- A **`settlements` ledger** + Stripe webhook track every charge/refund. *(Charity payout itself is still a manual/TBD step.)*

**Witness & challenge flows (token-based, no account needed).**
- Witness: unique `witness_invite_token` → public `/w/[token]` accept → `/w/[token]/verdict` to judge.
- Challenge/dare: `challenge_invite_token` → `/c/[token]` accept/decline (decline voids + refunds).
- **Judge link** (newer): share a link pre-witness; first acceptor becomes the judge.
- Anonymous draft vows claimable to an account after seal.

**Notifications.** Twilio SMS (templated: seal, accept, verdict request, outcome) with an inbound webhook + retry queue; Expo push with a queue, retries, and SMS fallback.

**Apps.**
- Web: home/create/refine/stake/witness/seal/sent, dashboard (your vows / dares / needs-you-now / witnessing, live refresh), vow detail, certificate, history, settings, outcome screens, legal.
- Mobile: guided creation, seal+payment, vow detail, dashboard, witness/verdict, challenges, cast, certificate — with contacts picker, haptics, native push.

**Backend depth.** 18 edge functions incl. `create-payment-intent`, `seal-vow`, `submit-verdict`, `accept-witness`, `accept-challenge`, `void-vow`, `cron-runner` (the 1,160-LOC jobs engine), `stripe-webhook`, `twilio-inbound`, `prepare-judge-link`, `delete-account` (GDPR). Immutable `audit_events` log on every state change. RLS throughout.

**Auth.** Supabase email + phone OTP, Google sign-in, token-based access for witnesses/targets.

---

## What's NOT built ❌

- **Prediction market / betting of any kind** — no pooled stakes, no YES/NO sides, no odds, no public market. Only planning docs in `/docs`.
- **Multi-participant** vows/bets (everything is 1 maker + 1 witness/target today).
- **AI proof verification / resolver** — none. (Stripe + witness only.)
- **Public discovery feed**, streaks/gamification, paid tier/subscriptions.
- **Tests** (zero) and **CI/CD** (no GitHub Actions).
- Video-proof capture (deps present, unused).

---

## What Instant Market can reuse 🔁

This is why we're building on Joe's base rather than from scratch:

| We need (per strategy) | Already exists to repurpose |
|---|---|
| Bet/vow **setup UI** | create → refine → stake → witness → seal flow (web + mobile) |
| **Staking + payment** rails | full Stripe SetupIntent → charge/refund + `settlements` ledger |
| **Resolution** primitive | witness verdict + `submit-verdict` + 72h auto-resolve (extend toward AI/admin) |
| **Token-based join** (no account) | witness/challenge/judge-link token system — close to "share into the chat" |
| **Notifications** | Twilio SMS + Expo push with retry queues |
| **State machine + audit** | vow lifecycle + immutable `audit_events` |
| **Identity** | Supabase auth + OTP |

**The gaps we must build** map cleanly onto the strategy's three parts: a **multi-participant parimutuel pool** (extend the stake model), the **AI/admin resolver with evidence + dispute window** (extend verdict), and a **public/live market view** (new). See `PRODUCT_STRATEGY.md` §6–7.
