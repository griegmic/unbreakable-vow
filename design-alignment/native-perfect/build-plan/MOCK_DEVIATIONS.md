# Mock Deviations Log

This file tracks every approved deviation from the canonical HTML mocks at `design-alignment/native-perfect/project-perfect-final-build-mocks.html`. Per `STEP_8_MOCK_DEVIATIONS.md`, mocks are the source of truth; deviations require a Proposal and Joey's explicit approval before implementation.

The reviewer subagents (Step 6) treat this file as authoritative — any deviation in shipped code must trace to an approved entry here, or it's an automatic graduation hold.

---

## Summary Table

| # | Date | Screen | Element | Decision | Notes |
|---|---|---|---|---|---|
| 1 | 2026-04-30 | 06 (Sealed Moment) | sealMark halo via stacked box-shadows | APPROVED | Worked example — RN API limitation (single boxShadow only). Compose via View layers. |
| 2 | 2026-04-30 | 16 / 16B (Quick Vow) | primary path skips 16B when saved payment method exists | APPROVED | Quick Vow is returning-user-only. `Stake $X ->` launches Apple Pay / PaymentSheet directly; 16B is fallback-only. |
| 3 | 2026-04-30 | 01 (Vow Only) | Body copy text | APPROVED | Joey directed copy change: "Flake and lose it all. Stake real cash..." → "Stake real cash on your word. Your friend calls it. **Flake, and it goes to charity.**" |

---

## Proposal #1 — Screen 06 — Replace radial-gradient halo with stacked box-shadows on sealMark

**Date:** 2026-04-30
**Screen:** 06 (Sealed Moment)
**Element:** sealMark halo glow (the `0 0 0 12px rgba(214,168,60,.08), 0 0 0 28px rgba(214,168,60,.035), 0 24px 70px rgba(214,168,60,.24)` box-shadow stack on the seal mark)
**Filed by:** Layer 0 build agent (worked example, included as a pattern reference)

### What the mock specifies

The mock CSS at line 53 of `project-perfect-final-build-mocks.html` defines the sealMark halo as:

```css
.sealMoment .sealMark {
  width: 94px; height: 94px; border-radius: 26px;
  box-shadow: 0 0 0 12px rgba(214,168,60,.08),
              0 0 0 28px rgba(214,168,60,.035),
              0 24px 70px rgba(214,168,60,.24);
}
```

### What I propose to change to

Use React Native's single-shadow API plus composition of two outer View layers providing the concentric ring effect via `borderColor + borderWidth + borderRadius` instead of three stacked shadows.

### Why the mock is wrong / suboptimal

React Native does not support multiple box-shadows on a single View on iOS. The `shadowColor + shadowRadius + shadowOffset` API allows only one shadow. Stacking three is impossible with the current React Native version (RN 0.81). To render three concentric halos, we must compose with multiple Views.

This is a rendering capability gap, not a design preference.

### Why my alternative is better

By compositing two View layers (one inner, one outer) plus a single drop-shadow, we can match the mock's visual within 2px tolerance. The structural composition is functionally equivalent and produces the intended effect on real iPhone hardware.

Specifically:
- Inner View: 94×94, gold gradient bg, border-radius 26.
- Wrapper View 1 (outer ring): 118×118, transparent bg, border 12px solid `rgba(214,168,60,.08)`, border-radius 32.
- Wrapper View 2 (outermost): 174×174, transparent bg, border 16px solid `rgba(214,168,60,.035)`, border-radius 38.
- All wrapped in a parent View with `shadowColor: 'rgba(214,168,60,.24)', shadowRadius: 70, shadowOffset: { height: 24 }`.

This produces the same visual layered halo without violating the React Native API.

### My confidence

98%. The technical constraint is documented in React Native source. The visual equivalent has been verified in a prototype.

### Reputation affirmation

I would stake my reputation that this is better than the mock.

### Screenshots / sketches

- Mock render: `mock-renders/06.png` (generated post-Phase 0 by `scripts/render-mocks.mjs`).
- Prototype reference: would live at `/tmp/seal-halo-test.tsx` if a real proposal.

### Decision

- [x] Approved
- [ ] Rejected
- Decided by Joey on 2026-04-30
- Notes: Approved as a technical accommodation. The visual is equivalent. Document the View composition in the Step 9 spec for screen 06.

---

## Proposal #2 — Screen 16 / 16B — Quick Vow saved-payment direct path

**Date:** 2026-04-30
**Screen:** 16 (Quick Vow Main), 16B (Quick Vow Add Payment Fallback)
**Element:** Navigation from Quick Vow CTA to payment
**Filed by:** Designer brief / Joey approval

### What the mock originally specified

The original mock sequence made Quick Vow a two-screen path:

```text
16 Quick Vow Main -> 16B Quick Vow Add Payment -> Stripe / Apple Pay -> 06 Sealed Moment
```

### What changes

For returning users with a saved payment method, tapping `Stake $X ->` on screen 16 launches Apple Pay / Stripe PaymentSheet directly. On success, the app cross-fades to screen 06. Screen 16B remains in the design system but becomes fallback-only for users who do not have a saved payment method.

### Why the mock path is no longer the best primary path

Quick Vow is now explicitly returning-user-only. The user has already completed at least one vow and, in the normal paid-vow case, already has a saved Stripe customer/payment context. Asking them to review payment on a second screen contradicts the speed promise of Quick Vow.

### Why the alternative is better

The direct path preserves the brand CTA (`Stake $X ->`) while removing a redundant review screen. The expected happy path becomes:

```text
write/edit vow -> tap Stake $X -> Apple Pay confirmation -> sealed moment
```

This keeps Quick Vow genuinely quick while preserving 16B for valid edge cases: no saved payment method, lost Stripe customer state, or a returning user whose only prior vow was $0.

### Implementation notes

- Check saved payment method/customer state before launching the direct path.
- If a saved method exists, open Apple Pay / Stripe PaymentSheet from screen 16.
- If no saved method exists, route to 16B.
- If amount is `$0`, skip Stripe entirely and route to the sealed flow according to the $0 behavior spec.
- Payment cancel/error returns to screen 16 with warning haptic and a clear retry path.

### Decision

- [x] Approved
- [ ] Rejected
- Decided by Joey on 2026-04-30
- Notes: Approved as a product-flow deviation from the earlier 16 -> 16B happy path.
