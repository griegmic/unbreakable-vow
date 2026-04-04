# Walkthrough: Shipping Unbreakable Vow V1

This is your step-by-step guide. Follow it in order.

---

## Phase 0: Fix Sharpening UI in Rork

**You do:** Give `v1-build/prompts/01-sharpening-fix.md` to Rork.

This fixes the over-engineered 3-path sharpening flow down to 2 paths with one screen. Pure frontend change. No backend needed.

**Verify:** Open the app, type "go to the gym" → should see the single "Make it stick" sharpening screen with an editable suggestion. Type "No takeout all week" → should skip straight to witness selection.

**Time:** ~5 min (Rork processes it)

---

## Phase 1: Manual Setup

**You do:** Follow every step in `v1-build/MANUAL_SETUP.md`.

| Step | What | Time |
|---|---|---|
| 1 | Create Supabase project | 5 min |
| 2 | Apple Developer: App ID + Sign-In with Apple | 15-20 min |
| 3 | Stripe account (test mode) | 5 min |
| 4 | Twilio account + toll-free number | 10 min |
| 5 | Set Supabase secrets | 5 min |
| 6 | EAS CLI setup | 5 min |
| 7 | Create `.env` file | 2 min |

**Total:** ~45-60 min

**Verify:** You have a `.env` file with all `EXPO_PUBLIC_*` values. Supabase dashboard shows your project. Stripe is in test mode.

---

## Phase 2: Claude Code Prompts

**You do:** Copy the MANIFEST.md to your project root as `CLAUDE.md`. Then feed each prompt to Claude Code one at a time. After each, check the box in CLAUDE.md.

### How to run a prompt

1. Open Claude Code in the `expo/` directory
2. Paste the contents of the prompt file
3. Let Claude Code execute
4. Verify the changes work (see verification steps below)
5. Commit: `git add -A && git commit -m "Prompt XX: description"`

### Prompt sequence with verification

---

**Prompt 02: Supabase Client** (~10 min)
```
Paste contents of v1-build/prompts/02-supabase-client.md
```
Verify: `lib/supabase.ts` exists. `types/database.ts` exists. Migration SQL is ready. Run `npx expo start` — no import errors.

---

**Prompt 03: Apple Sign-In** (~15 min)
```
Paste contents of v1-build/prompts/03-apple-auth.md
```
Verify: `lib/auth.ts` exists. `providers/auth-provider.tsx` exists. `auth.tsx` shows Apple button. Note: Can't test Apple Sign-In until building with EAS.

---

**Prompt 04: Stripe Payments** (~15 min)
```
Paste contents of v1-build/prompts/04-stripe-payments.md
```
Verify: `@stripe/stripe-react-native` in package.json. `StripeProvider` wraps app in `_layout.tsx`. Edge Function `create-payment-intent` exists.

---

**Prompt 05: Seal Flow** (~20 min)
```
Paste contents of v1-build/prompts/05-seal-flow.md
```
Verify: `lib/vow-api.ts` exists. `seal.tsx` creates a real vow in Supabase and charges Stripe. `seal-vow` Edge Function exists.

Deploy Edge Functions:
```bash
supabase functions deploy create-payment-intent
supabase functions deploy seal-vow
```

---

**Prompt 06: Twilio SMS** (~15 min)
```
Paste contents of v1-build/prompts/06-twilio-sms.md
```
Verify: `_shared/twilio.ts` exists. `_shared/sms-templates.ts` exists. `send-sms` Edge Function exists.

Deploy:
```bash
supabase functions deploy send-sms
```

---

**Prompt 07: Web Verdict Page** (~20 min)
```
Paste contents of v1-build/prompts/07-web-verdict.md
```
Verify: `verdict-page` and `submit-verdict` Edge Functions exist. Test by visiting the verdict page URL with a test token.

Deploy:
```bash
supabase functions deploy verdict-page
supabase functions deploy submit-verdict
```

---

**Prompt 08: Cron Runner** (~15 min)
```
Paste contents of v1-build/prompts/08-cron-runner.md
```
Verify: `cron-runner` Edge Function exists. Migration `002_cron_setup.sql` exists.

Deploy:
```bash
supabase functions deploy cron-runner
supabase db push  # applies migrations
```

---

**Prompt 09: Push Notifications** (~10 min)
```
Paste contents of v1-build/prompts/09-push-notifications.md
```
Verify: `lib/notifications.ts` exists. Notification listeners in `_layout.tsx`. Can't fully test until device build.

---

**Prompt 10: Screen Cleanup** (~20 min)
```
Paste contents of v1-build/prompts/10-screen-cleanup.md
```
Verify: Run `npx expo start`. Navigate through all screens. No VowKeeper references visible. No crew UI visible. Challenges not in menu. App doesn't crash.

---

**Prompt 11: Wire Real Data** (~25 min)
```
Paste contents of v1-build/prompts/11-wire-real-data.md
```
Verify: History screen shows real data (or empty state). Live screen fetches active vow. Settings shows auth info.

---

**Prompt 12: Deep Linking** (~5 min)
```
Paste contents of v1-build/prompts/12-deep-linking.md
```
Verify: `+native-intent.tsx` no longer swallows all paths.

---

**Prompt 13: EAS + TestFlight** (~10 min for config, ~20 min for build)
```
Paste contents of v1-build/prompts/13-eas-testflight.md
```
Then run:
```bash
cd expo
eas build --platform ios --profile production
# Wait ~15-20 min for build
eas submit --platform ios --latest
```

---

## Phase 3: End-to-End Testing

Once the build is on TestFlight:

1. **Install on your iPhone** via TestFlight app
2. **Sign in with Apple** — verify auth works, name captured
3. **Create a vow:** "Go to the gym 3 times this week"
   - Should skip sharpening (already good)
   - Enter witness: your own phone number (for testing)
   - Set stake: $10 → charity
   - Auth → Seal
4. **Verify Stripe:** Check Stripe dashboard for test charge of $10.00
5. **Verify SMS #1:** You should receive seal SMS on your phone
6. **Wait for SMS #2:** Day before vow ends (or manually trigger cron)
7. **Verify SMS #3:** After vow ends, you receive verdict link
8. **Open verdict link** in mobile Safari → tap "Kept"
9. **Verify Stripe refund** in dashboard
10. **Verify push notification** on your phone
11. **Check history screen** — vow should appear as "kept"

### Quick test shortcut
To test without waiting 7 days, temporarily modify the vow end date in `lib/vow-api.ts` to be 5 minutes from now instead of 7 days.

---

## Estimated Total Time

| Phase | Time |
|---|---|
| Phase 0: Rork sharpening fix | 5 min |
| Phase 1: Manual setup | 45-60 min |
| Phase 2: Claude Code prompts (12 prompts) | ~3 hours |
| Phase 3: Testing | 30-60 min |
| **Total** | **~5 hours** |

This assumes prompts execute cleanly. Budget extra time for debugging Edge Function deployments and Stripe/Twilio configuration issues.

---

## Troubleshooting

**Apple Sign-In fails silently**
→ Check nonce flow. HASHED → Apple, RAW → Supabase. Check Supabase Apple provider config.

**Stripe payment sheet doesn't appear**
→ Check `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set. Check `StripeProvider` is wrapping the app. Must test on real device, not simulator.

**SMS not sending**
→ Check Twilio secrets in Supabase. Check phone number is E.164 format. Check Twilio console for error logs.

**Push notifications not received**
→ Must be on physical device. Check push token is saved in `users` table. Check EAS push credentials.

**Build fails**
→ Run `eas build --platform ios --profile production --clear-cache`. Check that bundle ID matches Apple Developer App ID.

**Edge Function 500 errors**
→ Check `supabase functions logs <function-name>`. Most common: missing secrets, wrong env var names.
