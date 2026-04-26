# Twilio Messaging Audit and Lifecycle Plan

Date: 2026-04-25

## Product Goal

SMS should make the vow feel alive without making the app feel needy. The maker should feel accountable, the witness should feel connected and useful, and every message should have one clear job.

Tone: direct, cheeky, a little ominous, never cute for its own sake.

## Current Twilio Surface

Auth:
- Supabase phone auth uses Twilio config.

Edge functions:
- `seal-vow`: texts witness invite, challenge invite, maker seal confirmation.
- `accept-witness`: texts witness confirmation and maker witness-accepted notification.
- `cron-runner`: sends witness reminder, verdict request, 24h maker/witness messages, outcome/auto-resolve messages, SMS retry handling.
- `submit-verdict`: texts outcome to witness and maker.
- `send-sms`: generic SMS endpoint.

Client-side `sms:` handoffs:
- Maker can text/nudge witness from active and pending pages.
- Witness can text maker from witness acceptance/verdict surfaces.
- Challenge/dare screens have direct SMS nudges.

Data/observability:
- `sms_log` records message type and Twilio SID.
- `sms_retry_queue` exists for queued retries, but not every direct send uses it.
- `audit_events` captures product moments, not every SMS moment.

## Current Gaps

High confidence:
- There was no maker "I completed this early" path. People who finish early should not be trapped waiting for the deadline.
- Witness verdict page copy assumed deadline verdict only. It needed a distinct early-release context.
- SMS copy is serviceable, but too inconsistent: some messages feel product-led, others feel admin/system-led.
- SMS idempotency exists in cron, but immediate edge-function sends vary by function.
- Maker and witness lifecycle messages are mostly deadline-focused. The connection between witness and maker can be stronger.

Debatable:
- Midpoint SMS for every vow could help long vows but annoy short vows.
- A 10-minute-before SMS is probably too much for most vows unless the vow is same-day or very high stake.
- Witness nudges should be limited; the witness is a social lever, not a second app notification channel.

## Messaging Principles

1. One job per text.
2. No full vow text in server-sent SMS unless deliberately approved; keep grammar and privacy safe.
3. Use the witness as the accountability amplifier.
4. Prefer fewer, sharper messages over a chatty lifecycle.
5. All links must open to a page with an obvious next action in under three seconds.
6. Maker notifications should dedupe push vs SMS when possible.
7. Witness notifications are SMS-first because they may not have the app.

## Recommended Lifecycle

### 1. Maker seals vow

Witness:
`Joe put $50 on a vow. Hold him to it: {witness_url}`

Maker:
`Vow sealed. $50 on the line. Now get your witness in.`

Why: Make the maker's next job obvious. The witness invite should feel like social accountability, not a system invite.

### 2. Witness has not accepted after 24h

Witness:
`Joe is waiting on you. One tap to accept: {witness_url}`

Maker:
`Still waiting on Nick. A tiny nudge would be fair.`

Why: The maker needs a constructive action, not a gloomy "pending" state.

### 3. Witness accepts

Witness:
`You're in. We'll text you once before the deadline, then when it's time to judge.`

Maker:
`Nick accepted. Your vow is live. No mercy now.`

Why: Set frequency expectations and make the moment feel real.

### 4. Long vow midpoint

Eligibility:
- Only if duration is at least 5 days.
- Only one midpoint text.

Maker:
`Halfway. Still keeping your word?`

Witness:
`Halfway check: Joe's vow is still live. A nudge would not be rude.`

Why: Useful for long vows, too noisy for two-day vows.

### 5. 24h before deadline

Maker:
`24 hours left. $50 is still on the line.`

Witness:
`Joe's vow ends tomorrow. You'll make the call.`

Why: Existing version is directionally right. Keep it.

### 6. Optional final-hour reminder

Eligibility:
- Same-day vows or stake >= $100.
- Not for every vow by default.

Maker:
`Final hour. Finish clean.`

Why: High-intensity feature, should be gated.

### 7. Deadline reached

Witness:
`Time to judge: did Joe keep the vow? One tap: {verdict_url}`

Maker:
`Time's up. Nick has the call now.`

Why: Existing structure is good.

### 8. Early completion

Maker action:
- Active vow page shows `I did it early`.
- If solo, route to self-resolve.
- If witnessed, text witness the early verdict link.

Witness:
`Joe says the vow is already done. If that's true, release them here: {verdict_url}`

Witness page:
- Headline changes from verdict-day framing to early-release framing.
- Copy warns that one tap closes the vow.

Why: This is the clearest release valve. It keeps the witness as source of truth.

### 9. Outcome

Kept, maker:
`Your word is gold. $50 is being refunded.`

Broken, maker:
`Verdict: broken. $50 is going to ALS Association. Make a new one when you're ready.`

Witness:
`Joe kept the vow. Word honored.`
or
`Joe broke the vow. $50 is going to ALS Association.`

Why: Crisp closure. Avoid over-celebrating a normal kept vow; the brand is solemn.

## Implemented In This Pass

High-confidence changes shipped in code:
- Added `earlyCompletionRequestMessage`.
- Added Supabase function `request-early-completion`.
- Added active vow CTA: `I did it early`.
- Added witness early-release context on the verdict page via `?early=1`.
- Added timeline event label `Early release requested`.
- Added SMS type coverage for the new message type.

## Follow-Up Build Plan

85%+ confidence:
- Make all direct SMS sends use the same retry helper or a shared notification wrapper.
- Replace generic maker seal confirmation with "Now get your witness in" copy.
- Limit midpoint SMS to vows 5+ days long.
- Add a final-hour SMS only for same-day or high-stake vows.
- Add admin-visible SMS event dashboard from `sms_log` and `audit_events`.

Less certain, hold for approval:
- Let makers configure reminder intensity.
- Let witnesses schedule custom nudges.
- Include vow text in some SMS messages.
- Add a 10-minute-before text for every vow.
- Add "reply DONE" support through Twilio webhooks.

