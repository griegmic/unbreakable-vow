# Share, Witness, And Payment Flow Audit — 2026-04-26

## High-confidence changes made

- Phone auth now asks for phone first, then OTP, then name. This matches the user’s mental model: “text me the code” before “what should we call you?”
- The phone input uses the same reset class as the name field to avoid mobile browser underline/decoration artifacts.
- Quick Vow now routes to `/seal?quick=1` and auto-continues into auth/payment instead of showing the redundant “Last look” review screen.
- The refine/tighten sheet now has a clear Back escape hatch.
- The post-seal celebration holds the “Vow sealed” moment longer before moving into “Now tell your witness.”
- The shared payment modal now promotes Apple Pay / Google Pay through `ExpressCheckoutElement` above card entry, while the fallback PaymentElement no longer duplicates wallet tabs.
- Witness acceptance copy is more literal: “asked you to be their judge” instead of more poetic phrasing.
- The witness accepted headline is now bolder sans-serif for readability instead of a display serif phrase.

## Product recommendation

The best maker flow is:

1. User makes the vow and stakes it.
2. Payment setup is Apple Pay first, card fallback second.
3. Success moment holds for a beat: “Vow sealed. Your word is on the line.”
4. The next screen’s only job is witness conversion: “Now tell Nick.” Primary CTA opens SMS/share. Secondary is “I’ll do it later.”
5. The vow detail stays in “Get your witness in” mode until the witness accepts, with repeated low-friction nudges.

I would not auto-open the share sheet immediately after payment. It feels like the app yanking control away at the exact moment the user wants reassurance that payment/auth worked. A dedicated post-seal witness screen is better: it confirms success, explains the next job, then lets them tap the CTA with intent.

## Still below 85% confidence

- Removing the post-seal success moment entirely and going straight to “Now tell your witness.” This may convert slightly better, but it weakens trust after payment.
- Replacing the Quick Vow judge-link model with mandatory friend name/phone before seal. It may increase witness completion, but it adds friction to the power-user flow.
- Making witness acceptance more playful/edgy. The first witness page is an acquisition surface, but first it has to explain what is happening to someone who did not ask for this app.
- Reworking the full witness accepted screen into a more social/shareable artifact. Likely worthwhile, but needs a designed mock and one round of product approval.

## Payment QA notes

- Web wallet path now uses `ExpressCheckoutElement`.
- Web card fallback still calls `elements.submit()` before `confirmSetup` / `confirmPayment`.
- Native Apple Pay still needs real TestFlight/EAS-device verification. Expo Go cannot validate native Stripe PaymentSheet behavior.
