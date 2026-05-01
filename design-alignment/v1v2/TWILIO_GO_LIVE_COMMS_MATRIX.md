# Twilio Go-Live Comms Matrix

Last updated: April 27, 2026

## Positioning

Unbreakable Vow SMS is transactional accountability infrastructure, not marketing. The message strategy is fewer, sharper texts: every message should make the next action obvious, protect the emotional trust between maker and witness, and avoid exposing user-written vow text in server-sent SMS.

## Twilio Console Launch Settings

- A2P 10DLC Brand and Campaign must be approved before public US traffic.
- Production sends should use `TWILIO_MESSAGING_SERVICE_SID`; `TWILIO_PHONE_NUMBER` remains a fallback only.
- Messaging Service inbound webhook should point to `/functions/v1/twilio-inbound`.
- Advanced Opt-Out should be enabled and configured before launch.
- STOP/START/HELP should be tested from a real internal mobile number before launch.
- Required env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_INBOUND_WEBHOOK_URL`.

## Lifecycle Messages

| Trigger | Recipient | Template | Job To Be Done | Conversion Intent |
|---|---|---|---|---|
| Seal invite | Witness | `sealMessage` | Understand who chose me, why I matter, and where to accept. | Get acceptance in one tap without anxiety. |
| No-accept reminder | Witness | `witnessReminderMessage` | Decide whether to accept or pass. | Recover stalled witness handoff. |
| Witness accepted | Witness | `witnessAcceptConfirmMessage` | Know the role is locked and the cadence is light. | Build trust and reduce opt-out risk. |
| Witness accepted | Maker | `makerWitnessAcceptedMessage` | Feel the vow is real and live. | Reinforce commitment. |
| 24h before deadline | Maker | `maker24hMessage` | Remember the clock is real. | Encourage completion before verdict day. |
| 24h before deadline | Witness | `witness24hMessage` | Pay attention without needing to act yet. | Prime accurate verdict. |
| Deadline/verdict | Witness | `verdictRequestMessage` | Make the final call quickly. | Convert witness from observer to judge. |
| Deadline/verdict | Maker | `makerVerdictTimeMessage` | Know the verdict is now out of their hands. | Reduce support questions. |
| Early completion | Witness | `earlyCompletionRequestMessage` | Confirm early release only if true. | Close completed vows early. |
| Outcome | Maker | `makerOutcomeMessage` | Know what happened and what money means. | Create closure and re-entry. |
| Outcome | Witness | `outcomeMessage` | Know their verdict closed the loop. | Reinforce witness satisfaction. |
| Void/withdrawal | Witness | `vowVoidedMessage` | Stop paying attention. | Prevent wasted witness effort. |
| Challenge invite | Target | `challengeMessage` | Understand the challenge and accept with agency. | Convert challenge recipient. |

## Copy Rules

- Start with `Unbreakable Vow:` so recipients know the sender.
- Never include user-written vow text in server-sent SMS.
- Include one clear CTA per message.
- Include opt-out language in server-sent SMS: `Reply STOP to opt out.`
- Use "wallet untouched" for SetupIntent kept/voided flows, not "refunded," unless a real captured payment refund occurred.
- Witness copy should feel respectful and consent-based: accepting is meaningful, passing is allowed.
- Maker copy should create healthy pressure without shame.

## Operational Failure Rules

- Never send if `sms_opt_outs.status = opted_out`.
- Treat Twilio `21610` as an opt-out signal and stop retrying that recipient.
- Queue transient failures in `sms_retry_queue`.
- Mark duplicate queued lifecycle sends as sent when an `sms_log` row already exists.
- Audit skipped sends with `sms_delivery_skipped`.
