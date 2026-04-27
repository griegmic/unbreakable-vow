# Project Parody Push Notification Flow

## Principle

Push is the native-app accountability layer. It should be timely, sparse, and useful. SMS remains the fallback for web-only witnesses and moments where a person must act even if they never installed the app.

## Permission Timing

- Do not request push permission on first launch.
- Request after a user seals their first vow, saves payment, or accepts accountability in-app.
- If declined, continue with SMS/email where available and do not block the vow flow.

## Maker Notifications

| Moment | Trigger | Push |
|---|---|---|
| Vow sealed | after successful seal | Success haptic in-app; no push to self. |
| Witness accepted | witness accepts | `Your judge is in` — route to vow detail. |
| Day 1 | 24 hours after start | `Still in it` — light reminder that the vow is active. |
| Midpoint | halfway through vows 3+ days | `Halfway check` — useful nudge without over-messaging short vows. |
| 48 hours left | deadline minus 48h, only after midpoint | `Two days left` — make the stake feel present. |
| 10 minutes left | deadline minus 10m | `Last call` — final moment to close the loop. |
| Verdict time | deadline reached | `Verdict time` — clarify whether the witness has the call. |

## Witness Notifications

| Moment | Trigger | Push |
|---|---|---|
| Accepts in app | after acceptance | Success haptic in-app; no redundant push. |
| Verdict time | deadline reached | `Verdict time` — one-tap route to decide kept/broken. |

Witnesses who do not have the app stay on the mobile web flow and are served by SMS lifecycle messages.

## Copy Rules

- Keep copy short enough to read from the lock screen.
- Use the maker/witness name only when it improves clarity.
- Avoid guilt-heavy or spammy language.
- Do not mention platform reserve, internal settlement, or implementation details.

## Native Interaction Rules

- Haptic success on seal, witness accepted, card saved, verdict submitted.
- Haptic warning on payment failure, invalid form, broken-verdict confirmation, and destructive actions.
- No haptics on passive pushes, auto-redirects, or repeated disabled taps.
