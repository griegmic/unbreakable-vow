# Native Screen Scorecard

Use this before a native screen replaces the live web shell.

Scores:

- 3 = excellent / ship-ready
- 2 = acceptable but needs polish
- 1 = weak / risky
- 0 = broken or missing

Minimum graduation bar:

- No `0`s.
- No more than one `1`.
- Total score at least 24 out of 30.
- Payment/auth screens require 28 out of 30.
- Copy parity must be 3 unless a native-specific difference is documented.

## Criteria

1. Three-second clarity: user knows what is happening and what to do.
2. CTA strength: primary action is obvious, reachable, and emotionally correct.
3. Visual hierarchy: typography, spacing, and contrast guide the eye.
4. Native feel: haptics, gestures, safe areas, transitions, and sheets feel app-native.
5. Trust: auth, payment, SMS, and money language feel precise.
6. Escape hatch: user can go back, exit, or recover without confusion.
7. State handling: loading, disabled, error, success, empty states exist.
8. Social momentum: witness/share/nudge moment creates energy without pressure spam.
9. Readability: all text is legible on iPhone, no ornate font overuse.
10. Functional parity: it does what the accepted mobile web flow does.

## Copy Lock

Approved mobile web copy is the default source of truth. Native screens may improve interaction quality, haptics, contact selection, safe-area behavior, payment presentation, and push timing, but they should not rewrite headlines, CTA labels, explanatory copy, or emotional beats.

Allowed native-only differences include contact sync, push permission, native share sheet, Apple Pay/payment sheet, Expo Go/TestFlight test states, and native error states. Detailed rules live in `COPY_PARITY_AND_3_SCORE_RULES.md`.

## Current Native Status

| Screen | Route | Status | Notes |
| --- | --- | --- | --- |
| Demo-safe web shell | `/quick-vow`, `/create`, `/seal`, `/dashboard`, `/vow-detail` | Ship-safe | Current TestFlight default. Good for demo, not final native. |
| Native Quick Vow lab | `/native-quick-vow` | Copy-locked prototype+ | Now matches approved web copy for headline, input, stake notes, stake choices, witness card, consequence line, CTA, and guided fallback. Native difference: contact picker and iOS custom-stake prompt. Still needs real auth/payment graduation and final device density QA. |
| Native Seal lab | `/native-seal` | Real wiring started | Review and post-seal copy match web. Native deltas: formatted phone entry, phone/OTP/name auth, Apple Pay-first PaymentSheet path, and push registration after post-seal user action. TestFlight Stripe/Apple Pay QA required before graduation. |
| Native Guided Vow | TBD | Missing | Should be first-time default. Must mirror web `/create` step one. |
| Native Stake/Cause | TBD | Partial inside quick lab | Needs reusable native component and destination sheet. |
| Native Judge Picker | TBD | Missing | Must use contacts/recent contacts and share fallback. |
| Native Seal/Auth/Payment | `/native-seal` | Prototype | Highest-risk screen. Apple Pay TestFlight QA required before graduation. |
| Native Post-Seal | `/native-seal` sealed state | Prototype | Persistent share moment exists. Needs real vow id/invite link wiring. |
| Native Dashboard lab | `/native-dashboard` | Copy-locked prototype+ | Empty state, greeting, section label, card status, card time, and meta labels now match web. Local sealed flow now reads `Awaiting Witness`, not `Draft`. Needs live QA with real authenticated vows before graduation. |
| Native Vow Detail lab | `/native-vow-detail` | State coverage prototype+ | Pending witness, active, verdict due, kept, and broken variants now render with state-specific CTAs. Needs real authenticated vow QA and TestFlight device screenshots before graduation. |
| Native Push Permission | `/native-seal` post-seal | Started | Native registers push after the user acts from the post-seal screen, not on first launch. Needs device permission-flow QA. |

## Graduation Template

Copy this block into implementation PR notes for each screen.

```md
## Screen: [name]

Route:
Web baseline:
Native difference:

| Criterion | Score | Notes |
| --- | ---: | --- |
| Three-second clarity |  |  |
| CTA strength |  |  |
| Visual hierarchy |  |  |
| Native feel |  |  |
| Trust |  |  |
| Escape hatch |  |  |
| State handling |  |  |
| Social momentum |  |  |
| Readability |  |  |
| Functional parity |  |  |
| Copy parity |  |  |

Total:
Decision: hold / graduate
```

## First Graduation Candidate: Native Quick Vow

Preliminary score after copy-lock pass:

| Criterion | Score | Notes |
| --- | ---: | --- |
| Three-second clarity | 3 | Matches web: vow, verdict, stake, judge, consequence, continue. |
| CTA strength | 3 | CTA copy and placement match web; disabled state is clear. |
| Visual hierarchy | 2 | Strong, but still needs real iPhone density screenshots before graduation. |
| Native feel | 2 | Haptics, stake pulse, and contact picker exist; final device QA pending. |
| Trust | 2 | Consequence line is visible; real payment/auth still not wired here. |
| Escape hatch | 2 | Menu and guided fallback exist; native flow back stack still needs device QA. |
| State handling | 2 | Local flow state works; real loading/error states remain. |
| Social momentum | 2 | Judge/contact slot works as a native affordance; real invite link still later. |
| Readability | 3 | Copy is readable and no longer over-rewritten. |
| Functional parity | 2 | Lab route advances through native seal/dashboard/detail; not yet real backend/payment. |

Total: 23 / 30  
Decision: hold. Continue as design lab.

## First Build Batch

1. Tighten `/native-quick-vow` visual density.
2. Extract reusable native primitives from the lab screen.
3. Build native guided vow screen with web parity.
4. Wire contact judge picker into real witness state. `Started`
5. Build native seal/auth/payment as a separate route. `Started`
6. Build persistent post-seal share screen. `Started`
7. Wire real SetupIntent/Apple Pay, vow creation, seal-vow, and witness invite links.
8. Only then consider replacing default `/quick-vow` shell.

## Verification Log

2026-04-27:

- `cd expo && npm run lint` passed.
- `cd expo && npx tsc --noEmit` passed.
- `cd expo && npx expo export --platform web --output-dir /tmp/unbreakable-native-perfect-20260427` passed.
- Browser smoke on `http://localhost:8095/native-quick-vow` passed: fill vow -> `Stake $50` -> `/native-seal`.
- Browser smoke on `http://localhost:8095/native-seal` passed: review -> seal -> persistent witness invite moment.
- After deterministic back/dashboard cleanup, `cd expo && npm run lint`, `cd expo && npx tsc --noEmit`, and `cd expo && npx expo export --platform web --output-dir /tmp/unbreakable-native-perfect-20260427b` passed.
- Added `/native-dashboard` and `/native-vow-detail`; fixed an Expo Router param identity loop found in browser smoke.
- Browser smoke passed: native quick vow -> seal -> sealed -> native dashboard -> native vow detail.
- After dashboard/detail work, `cd expo && npm run lint`, `cd expo && npx tsc --noEmit`, and `cd expo && npx expo export --platform web --output-dir /tmp/unbreakable-native-perfect-20260427c` passed.
- Added `WEB_TO_NATIVE_COPY_MATRIX.md` and ran the copy-lock pass across `/native-quick-vow`, `/native-seal`, `/native-dashboard`, and `/native-vow-detail`.
- Fixed native local sealed state so post-seal dashboard reads as awaiting witness rather than draft.
- Browser smoke on `http://localhost:8096` passed: native quick vow -> native seal -> post-seal share moment -> native dashboard -> native vow detail.
- After copy-lock work, `cd expo && npm run lint`, `cd expo && npx tsc --noEmit`, and `cd expo && npx expo export --platform web --output-dir /tmp/unbreakable-native-perfect-20260427-copylock2` passed.
- Added real native seal scaffolding: phone OTP, maker name, vow creation, SetupIntent/PaymentSheet, `seal-vow`, and post-seal push registration timing.
- Added native detail state coverage for active, awaiting verdict, kept, and broken states. Removed duplicate active hero copy and replaced generic active secondary share with early-release path.
- Added `EXPO_PUBLIC_USE_NATIVE_PERFECT=1` graduation flag and `nativePerfect` EAS profile so default routes can render native-perfect screens when explicitly enabled while stable builds keep the live web shell.
- After state coverage and push/phone polish, `cd expo && npm run lint`, `cd expo && npx tsc --noEmit`, and `cd expo && npx expo export --platform web --output-dir /tmp/unbreakable-native-perfect-20260427-active-release` passed.
- Browser smoke on `http://localhost:8096` passed for pending witness, active, awaiting verdict, kept, and broken native detail variants.
- Flagged browser smoke on `http://localhost:8097` passed: with `EXPO_PUBLIC_USE_NATIVE_PERFECT=1`, default `/quick-vow` and `/dashboard` render native screens.
