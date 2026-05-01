# Copy Parity And 3/3 Graduation Rules

## Product Rule

Native app screens should use the same copy, structure, and product hierarchy as the approved mobile web experience or specifically approved native mocks.

Specifically approved native mocks are an exact visual and copy contract. Treat them as close to a prison: spacing, hierarchy, copy, tone, and layout should match unless the user explicitly approves a new revision to that mock.

For areas not covered by an approved native mock, the approved mobile web source remains the default. Native may deviate from mobile web only when the change is explicitly approved, materially better because of iOS-native affordances, or strong enough that it should be considered for mobile web too. The burden of proof is on the deviation. If the case is not strong, revert to source of truth.

No silent improvements: every deviation must be named, classified, justified, and approved before a screen can graduate.

Allowed native-only copy differences:

- Contacts permission/contact sync.
- Push notification permission.
- Native Apple Pay or payment-sheet behavior.
- Native share sheet or Messages handoff.
- Expo Go/TestFlight-only testing affordances.
- Native error states that do not exist on web.

Not allowed:

- Rewriting headlines for taste.
- Changing CTA language just because the native screen has a different layout.
- Adding explanatory copy that the web flow deliberately removed.
- Making the app sound like a different product.

If a native screen needs different copy, the scorecard must name the reason.

## Deviation Status

Every copy, layout, interaction, or hierarchy change must use one of these labels:

| Status | Meaning |
| --- | --- |
| Parity | Matches approved mobile web, or exactly matches the approved native mock when one exists. |
| Approved Exception | Differs because the user already approved this exact direction. |
| Native Advantage | Differs because contacts, haptics, Apple Pay/PaymentSheet, push, safe areas, keyboard behavior, or native share/Messages handoff make the native version better. |
| Upgrade Candidate | Differs because the proposed version is likely better for both native and mobile web. |
| Rejected Drift | Differs for taste, decoration, novelty, or drama without a strong product case. |

For every non-parity deviation, record:

- What changed.
- Why the approved source of truth is weaker in this case.
- Why the new version is materially better.
- What risk the change introduces.
- Whether mobile web should change too.
- Whether the user approved the deviation.

## What A 3 Means

Every screen gets a 3 only when all of these are true.

### 1. Copy Parity

- All user-facing copy matches the approved web baseline.
- If an approved native mock exists for the screen, copy matches that mock exactly.
- Any native-only or upgrade-candidate copy is documented, classified, justified, and approved.
- CTAs match web unless the native action differs.

### 2. Three-Second Clarity

- The user instantly knows where they are, what just happened, and what to do next.
- There is one primary action.
- Secondary actions are present but visually subordinate.

### 3. Visual Hierarchy

- The screen reads cleanly on iPhone 393x852.
- If an approved native mock exists, the native screen visually matches that mock as closely as React Native and real device constraints allow.
- No CTA/content overlap.
- No tiny critical text.
- Serif is reserved for earned display moments; task UI remains readable.
- No decorative elements compete with the job to be done.

### 4. Native Interaction Quality

- Touch targets are comfortable.
- Pressed, loading, disabled, success, and error states exist.
- Navigation uses app flow routes, not confusing browser-style back.
- Native affordances are used where they are better: contacts, haptics, share sheet, Apple Pay, push.
- Keyboard behavior, safe areas, and back gestures feel native and do not create layout regressions.

### 5. Functional Completeness

- The screen works with real data and local fallback data.
- All CTAs do what they say.
- Auth, payment, share, and navigation paths are wired.
- Stripe/Apple Pay is verified in a TestFlight build when applicable.

### 6. State Coverage

- Empty, loading, success, error, retry, and edge states are designed.
- Pending witness, active, awaiting verdict, kept, broken, voided, and draft states are represented where relevant.

### 7. Trust

- Money language is exact.
- No false “hold” language if the product is save-card/charge-if-broken.
- Payment and phone auth are clear and calm.

### 8. Haptics

- Selection taps use light haptics.
- Primary progress actions use medium haptics.
- Success moments use success haptics.
- Error/destructive moments use warning/error haptics.
- No haptics fire on passive renders or disabled taps.

### 9. Accessibility

- Critical controls have at least 44px touch targets.
- Important actions and state changes have clear VoiceOver labels.
- Dynamic text does not break layout at common larger text settings.
- Meaning is not conveyed by color alone.

## Graduation Process

For each native screen:

1. Capture the approved web baseline copy and screenshot.
2. Capture the approved native mock screenshot when one exists.
3. Build the native screen using the approved native mock exactly when one exists; otherwise use the approved web baseline.
4. Document every copy, structure, layout, and interaction delta.
5. Classify each delta as Parity, Approved Exception, Native Advantage, Upgrade Candidate, or Rejected Drift.
6. Get explicit approval for every non-parity delta before implementation.
7. Run lint, typecheck, and Expo export.
8. Browser-smoke the web build for gross layout issues.
9. Device-test in Expo Go for haptics and interaction.
10. TestFlight-test anything involving Stripe/Apple Pay, push, or native modules.
11. Score the screen.
12. Only replace the default web-shell route when every critical category is 3.

## Current Implication

The native lab screens created so far are useful design prototypes, but before they graduate they must be normalized against the approved source of truth. If an approved native mock exists, the implementation must match it exactly unless a new revision is explicitly approved. Any copy or layout that differs because the prototype was trying to improve the product should be treated as temporary until it is classified, justified, and explicitly approved.
