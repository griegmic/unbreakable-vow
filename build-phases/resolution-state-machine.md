# Vow Resolution State Machine

## Status Values

| Status | Description |
|--------|-------------|
| `draft` | Created, not yet sealed. Payment pending if staked. |
| `sealed` | Brief transitional state during seal-vow processing |
| `active` | Running. Witness/target invited. Clock ticking. |
| `awaiting_verdict` | End time reached. Waiting for verdict. |
| `kept` | Verdict: kept. Refund issued (if staked). Terminal. |
| `broken` | Verdict: broken. Money captured (if staked). Terminal. |
| `voided` | Cancelled by maker or declined by challenge target. Terminal. |

## Challenge Status Values (on `challenge_status` column)

| Status | Description |
|--------|-------------|
| `pending` | Challenge sent, target hasn't responded |
| `accepted` | Target accepted the challenge |
| `declined` | Target declined → vow voided |

## Complete State Diagram

```
                    ┌──────────┐
        create ───→ │  DRAFT   │
                    └────┬─────┘
                         │
         seal-vow called │ IF stake>0: Stripe capture
                         │ IF stake=0: skip Stripe
                         │ IF challenge: SMS to target
                         │ IF self+witness: SMS to witness
                         │
                    ┌────▼─────┐
                    │  SEALED  │ ← atomic transition
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │  ACTIVE  │
                    └────┬─────┘
                         │
        ┌────────────────┼────────────────────────┐
        │                │                        │
   [challenge       [witness               [maker voids]
    target           responds]                    │
    responds]            │                   ┌────▼─────┐
        │           ┌────┴────┐              │  VOIDED  │
   ┌────┴────┐      │         │              └──────────┘
   │ accepts │  accepts   declines           refund if staked
   │         │      │         │
   │ stays   │  stays     stays
   │ ACTIVE  │  ACTIVE    ACTIVE
   │         │  (maker    (can still
   │ declined│  notified)  resolve)
   │    │    │
   │    ▼    │
   │ VOIDED  │
   │ refund  │
   └─────────┘
        │
        │ [ends_at reached — cron-runner]
        │ status → AWAITING_VERDICT
        │ verdict request SMS to witness
        │
   ┌────▼──────────────┐
   │ AWAITING_VERDICT   │
   └────┬──────────────┘
        │
   ┌────┼──────────────────────────┐
   │    │                          │
[witness/self          [72h timeout,      [maker voids]
 submits verdict]       no verdict]             │
   │                       │               ┌────▼─────┐
   ├── kept ──┐    auto-resolve            │  VOIDED  │
   │          │    as KEPT                 └──────────┘
   ├── broken ┐        │
   │          │        │
┌──▼───┐  ┌──▼────┐  ┌▼─────┐
│ KEPT │  │BROKEN │  │ KEPT │
└──────┘  └───────┘  └──────┘
refund     capture    refund
if staked  stays      if staked
```

## Transition Table

| From | Trigger | To | Side Effects |
|------|---------|-----|-------------|
| draft | seal-vow | active | Stripe capture (if staked), SMS to witness/target, audit events |
| active | challenge declined | voided | Refund (if staked), audit event, push to maker |
| active | maker voids | voided | Refund (if staked), SMS to witness, audit event |
| active | ends_at reached (cron) | awaiting_verdict | Verdict request SMS, push to maker, audit event |
| awaiting_verdict | witness verdict: kept | kept | Stripe refund (if staked), SMS outcome, audit event |
| awaiting_verdict | witness verdict: broken | broken | Money stays captured, SMS outcome, audit event |
| awaiting_verdict | self-resolve: kept | kept | Stripe refund (if staked), audit event |
| awaiting_verdict | self-resolve: broken | broken | audit event |
| awaiting_verdict | 72h timeout (cron) | kept | Auto-resolve, Stripe refund (if staked), SMS, audit event |
| awaiting_verdict | maker voids | voided | Refund (if staked), SMS, audit event |

## Money Flow Matrix

| Scenario | Stripe Action | Result |
|----------|-------------|--------|
| Seal ($0 vow) | None | No PI created |
| Seal (staked vow) | create-payment-intent → capture | Money charged |
| Verdict: kept (staked) | Full refund | Money returned to maker |
| Verdict: broken (staked) | None | Money stays captured |
| Voided (staked) | Full refund | Money returned to maker |
| Voided ($0) | None | No money to handle |
| Auto-resolve (staked) | Full refund | Money returned to maker |
| Refund fails | Set refund_failed=true | Cron retries (up to 5x) |

## Edge Cases

| Case | Handling |
|------|---------|
| Witness never accepts | Vow continues. Maker can self-resolve at deadline. Cron sends reminders at 24h and 48h. |
| Witness accepts then ignores verdict | 72h auto-resolve as kept. Refund to maker. |
| Stripe hold expires | N/A — we capture immediately on seal, not hold. |
| Refund fails | Flag set, cron retries. After 5 failures, push notification for manual resolution. |
| SMS fails on seal | Flag set, cron retries. After 3 failures, push notification to share link manually. |
| Double verdict submission | submit-verdict checks for existing verdict → 409 already_judged |
| Double challenge accept | accept-challenge uses atomic update with WHERE challenge_status='pending' → idempotent |
| Void already-voided vow | void-vow checks status → 400 cannot_void |
| $0 vow verdict: broken | Status → broken. No Stripe action. "The record stands." |
| Challenge target declines after maker voided | accept-challenge checks status → 400 vow_not_active |
