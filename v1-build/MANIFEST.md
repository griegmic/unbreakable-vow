# MANIFEST.md — Cross-Session Claude Code Memory

Place this file at the project root before starting any Claude Code prompt. Claude Code reads CLAUDE.md files automatically, so rename this to `CLAUDE.md` in your working directory.

---

## Project: Unbreakable Vow

Stakes-based accountability app. Users type a vow, put real money on it, assign a witness, witness judges via web page.

## Tech Stack
- **Frontend:** Expo SDK 54, React Native 0.81, expo-router, TypeScript
- **State:** React Context via `@nkzw/create-context-hook` (providers/vow-flow.tsx)
- **Backend:** Supabase (Postgres, Auth, Edge Functions, Realtime)
- **Payments:** Stripe (charge on seal, refund on kept)
- **SMS:** Twilio toll-free (4 messages to witness per vow)
- **Auth:** Apple Sign-In only (v1)
- **Distribution:** EAS Build → TestFlight

## V1 Scope
- Apple Sign-In → vow creation → witness (manual name+phone) → stake ($10-100) → Stripe payment → seal → 4 SMS to witness → web verdict page → outcome
- NO: VowKeeper AI, crew/groups, challenges, Google auth, contact picker, proof mode, App Store

## Key Architecture Decisions
- Vow statuses: draft → sealed → active → awaiting_verdict → kept/broken/voided
- Stripe: `capture_method: 'automatic'` (charge immediately, refund if kept)
- Witness auth: UUID token in URL (no account needed)
- Cron: pg_cron → pg_net → Edge Function every 15 min
- Auto-resolve: 72h after vow ends with no verdict → auto-kept, refund
- RLS: verdict writes go through Edge Functions (RLS can't restrict columns)
- Nonce flow: HASHED nonce → Apple, RAW nonce → Supabase
- Apple only returns fullName on FIRST sign-in — must capture immediately
- Provider order: StripeProvider → OathStateProvider → AuthProvider → VowFlowProvider

## File Map
- `app/` — Expo Router screens (index, refine, witness, stake, auth, seal, sent, live, witness-verdict, vow-kept, vow-broken, history, settings)
- `components/vow-ui.tsx` — Shared UI component library (DO NOT MODIFY)
- `components/app-menu.tsx` — Navigation menu
- `constants/unbreakable.ts` — Vow analysis engine, palette, constants
- `providers/vow-flow.tsx` — VowState context (rawInput, refinedText, witnessName, stake, etc.)
- `providers/oath-state.tsx` — Intro ceremony state
- `lib/supabase.ts` — Supabase client
- `lib/auth.ts` — Apple Sign-In helper
- `lib/stripe.ts` — Stripe helpers
- `lib/vow-api.ts` — Vow CRUD operations
- `lib/notifications.ts` — Push notification registration
- `types/database.ts` — Supabase DB types
- `supabase/functions/` — Edge Functions (seal-vow, create-payment-intent, verdict-page, submit-verdict, send-sms, cron-runner)
- `supabase/migrations/` — SQL migrations

## Prompt Execution Progress
Track which prompts have been completed:
- [x] 01: Sharpening fix (Rork) — DONE (commit c19ef69)
- [ ] 02: Supabase client + DB types
- [ ] 03: Apple Sign-In auth
- [ ] 04: Stripe payment integration
- [ ] 05: Seal flow
- [ ] 06: Twilio SMS
- [ ] 07: Web verdict page
- [ ] 08: Cron runner
- [ ] 09: Push notifications
- [ ] 10: Screen cleanup
- [ ] 11: Wire real data
- [ ] 12: Deep linking
- [ ] 13: EAS + TestFlight

## Rules
- Keep the dark theme (palette in constants/unbreakable.ts)
- Keep all existing animations and haptic feedback
- Don't delete StyleSheet definitions even if unused
- Don't modify vow-ui.tsx unless absolutely necessary
- All amounts in database are cents; display as dollars
- Phone numbers must be E.164 format (+1XXXXXXXXXX)
- Test Stripe with card 4242 4242 4242 4242
