# Unbreakable Vow Notification Lifecycle Plan

Date: 2026-05-25

## Product Principle

A vow should never feel like a link that was sent and lost. After creation, every vow needs a durable home, a visible next open loop, and a sparse notification path that helps the right actor act at the right moment.

The system treats each vow as an actor graph:

- Keeper: the person whose behavior is on the line.
- Witness: the person who verifies a self vow.
- Dare maker: the challenger who sends a dare and may become the judge.
- Dare target: the person who accepts the dare and becomes the keeper.
- System: scheduler, fallback delivery, audit trail, and auto-resolution.

## Lifecycle Matrix

| Moment | Keeper | Witness | Dare maker | Dare target |
| --- | --- | --- | --- | --- |
| Seal | Gets a receipt that routes back to vow detail. Push if healthy, SMS fallback. | Gets invite SMS immediately, or live confirmation if already accepted. | Gets a sent receipt and dashboard entry. | Gets challenge SMS. |
| Acceptance window | Sees persistent waiting state. Gets 24h no-response nudge. | Gets 24h reminder if invite is unanswered. | Gets accepted, declined, or expired notification. | Gets challenge response flow. |
| Active vow | Gets sparse accountability: day 1 for longer vows, 24h warning, verdict-time status. | Gets accept confirmation, 24h heads-up, verdict request. | If judging a dare, gets verdict-time prompt. | Gets keeper reminders and outcome. |
| Verdict window | Sees awaiting-verdict open loop until ruled or auto-resolved. | Gets verdict link at deadline. | Rules on accepted dares. | Sees awaiting-verdict status. |
| Outcome | Gets kept/broken receipt and financial status. | Gets outcome receipt. | Gets outcome receipt. | Gets outcome receipt. |
| Auto-resolve | No verdict after 72h resolves as kept and notifies involved actors. | Gets closure. | Gets closure for dares. | Gets closure. |

## Implementation Shape

The current code already has the right foundation: `notifyMaker()`, `queuePush()`, SMS retry, push retry, push health, quiet hours, and audit events. The near-term implementation focuses on making those foundations visible and consistent.

1. Use the central notification helper for maker, keeper, and dare-maker notifications so push and SMS do not double-send.
2. Keep witness delivery SMS-primary because most witnesses may not have the app.
3. Keep push dedupe keys in `queuePush()` for scheduled lifecycle nudges.
4. Keep every important transition in the vow timeline through `audit_events`.
5. Make vow detail the canonical notification receipt with an "Alert plan" section.
6. Make dares a real tracked surface, not mock cards.
7. Ask for push permission after sealing and from vow detail/settings, when the user understands the value.

## Current Shipped Changes

- Self-vow seal receipt now uses `notifyMaker()` for push-or-SMS delivery.
- Dare sent, accepted, declined, and expired notifications now use typed lifecycle payloads or `notifyMaker()` instead of one-off push inserts.
- Witness no-response nudges now go through the single-channel maker helper.
- Challenge keeper verdict-time notification now uses the same maker verdict-time channel policy.
- Failed witness/dare invite texts now notify the maker with a recovery path instead of silently relying on a missing push token.
- Unaccepted witnesses no longer receive verdict links at deadline; the keeper gets a self-verdict recovery prompt instead.
- Dare targets get a durable receipt when they accept, plus a 24-hour reminder before the 48-hour expiry window.
- Web and native dashboards keep unresolved verdicts urgent until they resolve.
- Native vow detail shows the alert plan for the current vow state.
- Native waiting-for-witness and settings screens expose push opt-in.
- Push-denied users get a system-settings recovery CTA.
- Native dares screen reads real sent challenges.
- `resend-witness-invite` now exists, so the native waiting-state recovery button has a real backend path.
- Push-open audit writes are allowed by RLS only for actors who can already read the vow.
- Expo and web database types now include `challenge_status = expired` and push-queue lifecycle fields.

## Next Hardening Pass

- Split `cron-runner` into planner and processor modules so state transitions and delivery are easier to test.
- Add `notifyWitness()` and `notifyTarget()` helpers with explicit SMS-primary and push-bonus rules.
- Add 12h, 48h, and 70h verdict-window escalation if the brand wants stronger pressure before 72h auto-resolve.
- Make web notification settings real: SMS-only preference, quiet hours, and push recovery instructions.
- Add lifecycle tests for seal, witness no-response, dare no-response, deadline, verdict, outcome, auto-resolve, and channel fallback.
