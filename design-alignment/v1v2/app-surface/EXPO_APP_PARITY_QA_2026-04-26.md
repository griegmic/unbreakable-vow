# Expo App Parity QA — 2026-04-26

## Current restore point

- GitHub `main`: `4baa6942faee2fee47a9f51e4e4a2b78aab485d3`
- Production Vercel deployment: `dpl_CGuDmfcUrwhTsmSynkHwoVj1JggC`
- Product target: Expo/Rork native maker experience should mirror mobile web where it owns the maker flow. Witness and dare acceptance remain mobile web.

## Verified

- Restored production serves `dpl_CGuDmfcUrwhTsmSynkHwoVj1JggC` after cache propagation.
- `PAYMENTS_AUDIT_2026-04-25.md` exists on the restored commit.
- Expo TypeScript passes.
- Expo lint passes.
- Expo web export passes, which is the Rork preview-style bundling path that previously exposed native-only imports.
- Web production build passes.
- `rork.json` points Rork at `expo`.
- `expo/lib/haptics.ts` exists, so the previous missing `@/lib/haptics` Rork error is not present on this restore point.
- Native `quick-vow` and guided `seal` route to `/vow-detail?justSealed=1` after seal success.
- Native `/w/...` and `/c/...` deep links hand off to mobile web through `/external-web`.

## High-confidence fixes applied in this pass

- Clarified Expo Go payment copy: Apple Pay/card setup require TestFlight or a development build, so Expo Go shows an explicit testing bypass instead of feeling broken.
- Renamed internal native payment state from `paymentCaptured` to `cardSaved` on SetupIntent paths to match the Resy-style save-card model.
- Updated native retry copy after card-save success to reference the actual dynamic stake CTA.
- Split Stripe native PaymentSheet code into `expo/lib/stripe.native.ts` and left `expo/lib/stripe.ts` web-safe, so Rork/web preview does not try to bundle `@stripe/stripe-react-native` internals while iOS/Android still use the native implementation.

## Still requires real-device QA

- Apple Pay on TestFlight quick vow.
- Apple Pay on TestFlight guided seal.
- Contact picker permission and selected contact formatting.
- Push permission timing after seal.
- SMS handoff from vow detail to witness.
- Browser handoff for `/w/[token]` and `/c/[token]` links from an installed app.

## Known product/design gaps to revisit after stabilization

- `expo/app/index.tsx` still carries more first-time explanatory/marketing structure than the mobile web power flow. It is acceptable as a cold first-run screen, but returning users should continue to land on `quick-vow`.
- Several legacy screens still import `expo-haptics` directly instead of the typed wrapper. This is not user-visible, but the app surface should eventually standardize around `expo/lib/haptics.ts`.
- Dashboard is functional but still visually denser than the mobile web target. It needs a focused post-stabilization design pass, not a broad rewrite during rollback recovery.
