# Payments / Apple Pay Audit — 2026-04-25

## Executive Summary

The Resy-style model is correct: save a payment method at seal/accept time with a SetupIntent, charge only if the vow is broken, and keep settlement internal. The bug was in the client integrations around wallet setup, not the high-level money model.

Two high-confidence defects were fixed:

1. Native SetupIntent PaymentSheet did not enable Apple Pay on the new save-card flow.
2. Web SetupIntent forms confirmed Stripe without first calling `elements.submit()`, which Stripe recommends for PaymentElement setup flows because it validates and collects wallet-required data before `confirmSetup`.

A third reliability issue was fixed:

3. Dare acceptance reused the same SetupIntent idempotently after a failed/canceled attempt, which could trap a user on a stale failed SetupIntent. New prepare-payment attempts now create a fresh SetupIntent.

## Stripe Surfaces Audited

### Native Expo: quick vow

Files:
- `expo/app/quick-vow.tsx`
- `expo/lib/stripe.ts`
- `expo/components/stripe-wrapper.tsx`
- `supabase/functions/save-card/index.ts`
- `supabase/functions/seal-vow/index.ts`

Flow:
1. Create draft vow.
2. Call `save-card`.
3. Create Stripe SetupIntent.
4. Present React Native PaymentSheet.
5. On success, call `seal-vow`.
6. `seal-vow` verifies SetupIntent succeeded and stores `stripe_payment_method_id`.

Fixes:
- Added `applePay` to `setupPaymentSheetForSetup`.
- Added Apple Pay / Google Pay display amount context for SetupIntent setup.
- Passed stake amount into native PaymentSheet setup from quick vow.

Status:
- Code path is now clean.
- Needs device-level TestFlight verification because Apple Pay cannot be fully validated in normal web/local tooling.

### Native Expo: guided seal

Files:
- `expo/app/seal.tsx`
- `expo/lib/stripe.ts`
- `supabase/functions/save-card/index.ts`
- `supabase/functions/seal-vow/index.ts`

Flow is the same as quick vow.

Fixes:
- Guided seal now passes stake amount into the SetupIntent PaymentSheet so Apple Pay/Google Pay setup has amount context.
- Same Apple Pay enablement fix applies.

Status:
- Code path is now clean.

### Web: normal seal / guided seal

Files:
- `web/src/app/seal/page.tsx`
- `web/src/app/guided/page.tsx`
- `web/src/components/payment-form.tsx`
- `supabase/functions/save-card/index.ts`
- `supabase/functions/create-payment-intent/index.ts`
- `supabase/functions/seal-vow/index.ts`

Flow:
1. Create draft vow.
2. Create SetupIntent through `save-card` or legacy-named `create-payment-intent`.
3. Render Stripe PaymentElement.
4. Confirm SetupIntent.
5. Call `seal-vow`.

Fix:
- Added `await elements.submit()` before `stripe.confirmSetup()` and `stripe.confirmPayment()`.

Status:
- The generic web PaymentModal is now aligned with Stripe’s PaymentElement setup guidance.

### Web: dare receiver acceptance

Files:
- `web/src/app/c/[token]/client.tsx`
- `supabase/functions/accept-challenge/index.ts`

Flow:
1. Dare receiver enters phone/auth.
2. Chooses stake/destination.
3. `prepare_payment` creates SetupIntent.
4. Payment UI confirms SetupIntent.
5. `accept` verifies SetupIntent status and saves payment method to the vow.

Fixes:
- Added `elements.submit()` before `confirmSetup()` for the PaymentElement fallback.
- Split wallets into `ExpressCheckoutElement` and card/bank fallback.
- Disabled wallet duplication inside `PaymentElement` when Express Checkout is present.
- Made server-side `prepare_payment` create a fresh SetupIntent per attempt instead of reusing a failed/canceled one through a broad idempotency key.

Status:
- This directly addresses the screenshot failure path.
- Needs live mobile Safari / in-app browser verification on a device with Apple Pay enabled and the domain registered in Stripe.

### Backend charge-on-broken path

Files:
- `supabase/functions/submit-verdict/index.ts`
- `supabase/functions/cron-runner/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/void-vow/index.ts`

Flow:
1. Kept verdict: no charge for SetupIntent vows.
2. Broken verdict: create off-session PaymentIntent using saved `stripe_payment_method_id`.
3. Settlement ledger moves to `pending_manual_settlement` or `payment_due`.
4. Webhooks update failed/disputed/reversed payment states.

Status:
- Architecture is consistent with the Resy-style model.
- Separate future QA should simulate `payment_intent.payment_failed`, dispute created/closed, and retry job behavior.

## Remaining Verification Checklist

- TestFlight quick vow: Apple Pay appears in PaymentSheet and returns success.
- TestFlight guided seal: Apple Pay appears in PaymentSheet and returns success.
- Mobile Safari dare receiver: Apple Pay appears as an Express Checkout wallet button.
- Mobile Safari dare receiver: Apple Pay approval leads to accepted dare / vow detail, not `Payment failed`.
- Mobile Safari normal seal: wallet/card setup succeeds through PaymentElement.
- Stripe Dashboard: confirm `unbreakablevow.app` and any production subdomains are registered under Payment Method Domains.
- Stripe Dashboard: confirm Apple Pay / wallets are enabled in payment method settings for the active mode.
- Backend: submit broken verdict with saved card and verify one PaymentIntent is created.
- Backend: submit kept verdict and verify no charge is created.

## Sources Used

- Stripe Payment Element docs: https://docs.stripe.com/payments/payment-element
- Stripe SetupIntent + PaymentElement migration guidance: https://docs.stripe.com/payments/payment-element/migration?integration-path=future
- Stripe wallet rendering checklist: https://docs.stripe.com/testing/wallets?ui=payment-element
- Stripe React Native SDK overview: https://docs.stripe.com/sdks/react-native
