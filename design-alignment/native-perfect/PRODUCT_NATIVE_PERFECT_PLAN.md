# Product Native Perfect Plan

## Mission

Build the native Expo app into a premium, app-store-ready Unbreakable Vow experience that matches the approved mobile web product where it should, and improves on it where native can be meaningfully better.

The current TestFlight build is intentionally demo-safe: it wraps the live mobile web flow so old native screens cannot leak into the demo. Product Native Perfect is the deliberate native rebuild that replaces that shell screen by screen only after each native screen is clearly better.

## Operating Rules

- Keep the live web shell as the default app until native replacements are verified.
- Build native screens behind separate routes first, then graduate them into the main app.
- Do not reintroduce legacy native flows.
- Mobile web and specifically approved native mocks are the source of truth.
- Specifically approved native mocks are an exact visual and copy contract. Treat them as close to a prison: spacing, hierarchy, copy, tone, and layout should match unless the user explicitly approves a change to that mock.
- For areas not covered by an approved native mock, copy, product hierarchy, and basic flow structure should match the approved mobile web source by default.
- The mobile web source of truth is a guideline, not a prison: a deviation is allowed only when it is explicitly approved, clearly better because of iOS-native affordances, or strong enough that we would recommend changing mobile web too.
- No silent improvements. Any deviation from the source of truth must be named, classified, justified, and approved before it can graduate.
- The burden of proof is on the deviation. If the rationale is not very strong, revert to the approved source of truth.
- Haptics are a product layer, not decoration. They should mark decisions, commitments, success, warnings, and errors.
- Witness and dare accepter flows remain mobile web for now.
- Apple Pay and push notifications must be verified in TestFlight, not Expo Go.

## Source Of Truth Hierarchy

1. Current approved mobile web experience.
2. Specifically approved native mock files or user comments. When a native mock is approved for a screen, it overrides mobile web for that screen and must be matched exactly.
3. Native-only affordances that materially improve the experience: contacts, haptics, Apple Pay/PaymentSheet, push timing, safe-area navigation, keyboard behavior, and native share/Messages handoff.
4. Upgrade candidates that are demonstrably clearer, simpler, more emotionally precise, or more premium than both current web and prior native attempts.

If these sources conflict, the approved native mock wins for its screen unless the user explicitly approves a new revision. If the conflict is not covered by an approved native mock, the batch must state the conflict and ask for approval before implementation.

## Deviation Policy

Native improvements are welcome, but they must earn their keep. Every proposed deviation must be assigned one of these statuses:

| Status | Meaning |
| --- | --- |
| Parity | Matches the approved mobile web, or exactly matches the approved native mock when one exists. |
| Approved Exception | Differs because the user already approved this specific design, copy, or behavior. |
| Native Advantage | Differs because iOS makes this version materially better. |
| Upgrade Candidate | Differs because it appears better for both native and mobile web, and should be considered for web too. |
| Rejected Drift | Looks interesting, but is not clearly better or justified. Do not implement. |

For any status other than Parity, the batch must include:

- What changed.
- Why the approved source of truth is weaker in this case.
- Why the new version is materially better.
- What risk the change introduces.
- Whether mobile web should change too.
- Explicit approval status.

## Batch Approval Gate

Each mock batch must include this gate before native implementation:

| Check | Required Result |
| --- | --- |
| Matches approved native mock | Yes, exactly, for any screen with an approved mock. |
| Matches source of truth | Yes, or deviations listed for areas not covered by an approved native mock. |
| Deviations classified | Parity, Approved Exception, Native Advantage, or Upgrade Candidate. |
| Strong rationale provided | Yes for every deviation. |
| User approved deviation | Yes for every non-parity deviation. |
| Mobile web change recommended | Yes/No, with rationale. |
| Ready for native implementation | Yes only after the above are complete. |

## Walk / Crawl / Run

### Walk: Native Design Lab

- Create native preview routes for core maker screens.
- Start with Quick Vow because it defines the product promise and conversion.
- Use static/local state first so design iteration is fast and safe.
- Produce mocks in small approval batches, normally two screens at a time.
- Include source-of-truth deltas and deviation status for every batch.
- Run Expo lint, TypeScript, and web export after every meaningful batch.

### Crawl: Functional Native Maker Flow

- Wire native Quick Vow to auth, saved payment setup, judge/contact selection, and vow creation.
- Add post-seal celebration and witness-share routing.
- Add dashboard and vow detail using the real Supabase data model.
- Preserve the web shell as fallback for any unready state.

### Run: TestFlight-Ready Native App

- Make native routes the default.
- Add haptic QA pass.
- Add push notification lifecycle.
- Add Apple Pay / card fallback QA.
- Add screenshot audit for every major state.
- Ship a TestFlight build only when native is more trustworthy than the shell.

## Milestones

1. Native Quick Vow visual prototype.
2. Native Dashboard visual prototype.
3. Native Vow Detail visual prototype.
4. Native Seal and post-seal celebration prototype.
5. Functional Quick Vow path.
6. Functional dashboard and vow detail.
7. Payment, auth, contacts, and share integration.
8. Push notification lifecycle.
9. Full TestFlight QA.
10. Replace web shell defaults with native screens.

## Native-Only Advantages

- Contact picker for judge selection.
- Haptics on selections, commitments, payment success, witness sent, verdicts, and errors.
- Push reminders after the user understands value.
- Native share sheet after seal, not surprise share before context.
- Smooth app transitions and safe-area-aware sticky CTAs.
- Saved payment reuse when available.

## First Build Target

`/native-quick-vow`

This route is a native design lab screen. It should not affect the demo-safe default app. It should prove the native visual language, haptics, hierarchy, and CTA treatment for the core product loop.
