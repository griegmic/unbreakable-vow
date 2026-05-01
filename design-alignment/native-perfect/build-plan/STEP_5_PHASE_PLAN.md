# STEP 5 — Phase Decomposition & Sequencing

This document locks the build sequence. Every screen (mocked + derived) is assigned to a phase. Within each phase, the build order, pairing schedule, and graduation gates are explicit.

The build agent (Layer 0 / Claude Code) reads this file as its master sequence. The reviewer subagent reads it to know what's in-scope per phase.

---

## A. Sequencing principles

1. **Foundation before features.** Phase 0 establishes primitives, tokens, motion + haptics infrastructure. No UI screens ship until foundation is approved.
2. **Highest-risk screens early.** Auth and payment surface in Phase 3 (after creation flow basics), so backend integration issues surface before the build accumulates.
3. **TestFlight always shippable.** Per-screen graduation behind `USE_NATIVE_PERFECT`. Each screen flips its flag default-on after passing both reviewers + Joey sign-off. Other screens stay on LiveWebShell until their turn.
4. **Pairing rule from Step 3 of meta-plan:** 2 screens per checkpoint. Singletons for screens 05, 05b, 06, and the first screen of every new phase. New derived screens follow same rule.
5. **Phase boundaries are blocking.** Next phase doesn't start until current phase's screens are graduated AND the phase's exit checklist passes.

## B. Master sequence

### Phase 0 — Foundation (no UI screens ship)

**Goal:** Every primitive, token, helper, infrastructure piece needed by Phase 1+ is built and tested.

**Tasks (no graduation per task — single phase-level review):**

1. **Token reconciliation.** Update `expo/lib/uv-tokens.ts` and `web/src/app/globals.css` to mock CSS values. Mock golds (`#d6a83c`, `#edc465`), green (`#52d69a`), blue (`#79a8ff`), orange (`#f59a3d`), red (`#ef6b5f`), text (`#f4ead8`). Run `node scripts/verify-token-parity.js`. Web visual divergence acceptable per Joey's #14 decision.
2. **Motion + haptics infra.**
   - Add 3 new haptic wrappers to `lib/haptics.ts`: `hapticSheetPresent`, `hapticCopySuccess`, `hapticDraftAccepted`.
   - Set up `expo-av` audio session, pre-load 3 sounds (or stubs initially).
   - Implement `playSyncedFeedback()` helper.
   - Implement global background-phase shared value at app root (Reanimated 3).
   - Implement `useReduceMotion()` hook reading `AccessibilityInfo`.
3. **Backend additions.**
   - Migration: add `vows.anonymous_owner_token text` column with index.
   - Modify `prepare-judge-link` edge function: accept `anonymous_token` param, allow `user_id = NULL`, store token in new column.
   - New edge function: `claim-vow` (~40 lines). Takes `{ vow_id, anonymous_token }` + JWT. Sets `user_id = auth.user.id` if matches.
   - Add witness-token expiration guards to `accept-witness` and `submit-verdict` (~5 lines each).
   - Verify or add `cron-runner` orphan-draft cleanup at 24h.
4. **Primitives extraction.** Extract reusable primitives from existing `expo/components/primitives/` to support the 32 mocks. New primitives needed:
   - `BrandWordmark` (tinybrand variant, qvBrand variant).
   - `StepProgressHeader` (step number + progress bar + sign-in link).
   - `ChromeHeader` (back link + center text + hamburger).
   - `VowInputCard` (kicker + placeholder + textarea, used 01/16).
   - `SuggestionChipScroll` (horizontal scroll + fade gradient + chevron).
   - `MoneyDisplay` (centered Fraunces 600/76, used 02/16).
   - `ConsequenceRow` (red-tinted "if you break it..." row).
   - `VowDateCard` + `VowDateLine` (the two-row date card on 02).
   - `WitnessJudgeCard` (filled + empty states on 03/03c/16).
   - `BottomSheet` (grab handle + content slot, used 02b/02c/03b/D9/D11).
   - `DatePillRow` (used in 02b).
   - `CauseTypeCard` + `DestinationChip` (used in 02c).
   - `PhoneInput` (composite: country + tel field).
   - `OtpInput` (6-digit composite).
   - `PayTile` + `PayOptionBig` variants (used 05/16B).
   - `TrustCard` (used 05/16B).
   - `LegalLine` (small bottom legal text).
   - `SealMark` (variant: round 82×82, square 94×94 for sealMoment, kept-stamp for D1).
   - `LiveMark` (green variant of SealMark).
   - `MessagePreviewCard` (used 07/07B).
   - `WaitCard` (used 08/08B/08C).
   - `Timeline` + `TimelineItem` (used 08/08B/12).
   - `RolePill`.
   - `NeedCard` (urgent alert with pulse dot).
   - `VowCard` (dashboard list item).
   - `MiniModule` (small dashboard tile).
   - `WatchPill` + variants.
   - `SectionHead`.
   - `MenuPanel` + `MenuItem` + `MenuSection` (13B).
   - `JudgingRowCard` (14).
   - `TabBar` (15).
   - `SeeAllButton` (15).
   - `QvCard`/`QvInput`/`QvDate`/`QvStakeBig`/`QvTile`/`QvWitness`/`QvReceipt` (16).
   - `CenterTitle` (09/17/D1/D4/D18).
   - `ToastNetworkError` (D15).
   - `Pill` + variants (default/live/blue/green).
   - `ActiveCard` (covers vowCard variant).
   - `CountCard` (countdown variant of ActiveCard).
5. **Visual diff tooling stub.** Per Step 7 spec: `scripts/render-mocks.mjs` rendering each mock cell as PNG.
6. **Reviewer subagent definitions.** Per Step 6: design reviewer + CTO reviewer files in `.claude/agents/`.
7. **`USE_NATIVE_PERFECT` flag verification.** Confirm flag wiring in `lib/native-flags.ts` and `eas.json` is solid. Add per-screen flag granularity if needed (e.g., `USE_NATIVE_PERFECT_SEAL`, `USE_NATIVE_PERFECT_DASHBOARD`). For continuous shipping, confirm `production` profile flips flags on per-screen graduation.
8. **CLAUDE.md update.** Append `CLAUDE_ADDENDUM.md` contents to `/Users/joey/rork-unbreakable-vow/CLAUDE.md` under a new heading `## Native-Perfect Build Rules`.
9. **Deep link configuration.** Configure URL scheme in `expo/app.json` (e.g., `"scheme": "unbreakable-vow"`). Confirm deep links work for screen navigation: `xcrun simctl openurl booted unbreakable-vow://native-perfect/create/stake`.

**Phase 0 graduation gate:**
- All primitives in `components/primitives/` have storybook entries (stretch — could be deferred).
- Lint, typecheck, expo export all pass.
- Backend changes deployed to dev environment.
- Reviewer subagents respond to test invocations.
- Joey signs off on Phase 0 as a unit.

**Pairing schedule:** N/A — single phase-level review.

**Estimated screens to graduate:** 0.

---

### Phase 1 — Maker creation core (screens 01, 02, 02b, 02c, D9)

**Goal:** First-time user can input vow text + select stake (with custom amount and destination) entirely natively. Witness selection and beyond still on LiveWebShell.

**Build order:**
1. **Screen 01** (singleton — phase opener). The first native creation screen.
2. **Screens 02 + 02b** (pair). Stake screen + verdict date sheet.
3. **Screens 02c + D9** (pair). Destination sheet + custom stake input sheet.

**Phase 1 graduation gate:**
- All 5 screens pass both reviewers ≥ thresholds.
- End-to-end smoke test: a user can input a vow, set stake (any amount including custom $0–$100), set verdict date, set destination, and reach screen 03 (which is still on LiveWebShell).
- Joey signs off.

**Notes:**
- $0 path: D9 must accept `0` and screen 02 must reflect "$0" with the cheeky-line variant ("Word on the line, no money this time").
- The vow doesn't get created in DB yet (per Step 1 P-2, that happens at end of 03c).
- Screens are flagged behind `USE_NATIVE_PERFECT` until their pair graduates.

---

### Phase 2 — Witness selection (screens 03, 03b, 03b+, 03c, D10, D11)

**Goal:** User can select a witness, defer the decision, or go solo (with proper confirmation gates).

**Build order:**
1. **Screen 03** (singleton — phase opener). Choose Witness with three quiet paths.
2. **Screens 03b + 03b+** (pair). Pick Witness sheet + Contacts Synced Picker state after permission is accepted.
3. **Screen 03c** (singleton). Witness Selected state.
4. **Screens D10 + D11** (pair). Witnessless-At-Seal Checkpoint + Go-Solo Confirmation Sheet.

**Phase 2 graduation gate:**
- Witness selection works end to end — pick from contacts, share link (anonymous draft via `prepare-judge-link`), or defer.
- Contact access accepted state shows `Contacts synced`, search, recent witnesses, suggested contacts, and direct row selection into 03c.
- "Decide later" path correctly routes through D10 checkpoint between stake and auth.
- "Go solo" only reachable via D11 confirmation.
- "Ask Joe now →" link on 03c works (anonymous draft + share sheet).
- Vow draft is created in DB at correct moment per Step 1 P-2.
- Anonymous owner token written; subsequent auth claims it via `claim-vow` (Phase 3 will graduate the claim).
- Joey signs off.

**Notes:**
- Phase 2 depends on Phase 0 backend changes being deployed.
- Pre-payment share path is now functional but still ends in LiveWebShell for auth/payment until Phase 3.

---

### Phase 3 — Auth + payment (screens 04, 04b, 04c, 05, 05b, 06, D12, D13, D17)

**Goal:** User can authenticate via phone OTP, complete payment via Stripe SetupIntent, and reach the seal moment. **This is the highest-risk phase — payment, auth, ceremonial moment all in one block.**

**Build order:**
1. **Screen 04** (singleton — phase opener). Phone First.
2. **Screens 04b + 04c** (pair). Enter Code + Name If Missing.
3. **Screen 05** (singleton — payment, ≥33/36 design + ≥16/18 CTO). Add Payment.
4. **Screen 05b** (singleton — Stripe sheet integration). Apple Pay confirmation.
5. **Screen 06** (singleton — emotional climax). Sealed Moment.
6. **Screen D12** (singleton — supplements 04). Country Code Picker.
7. **Screens D13 + D17** (pair). Returning-User Sign-In + Push Permission Pre-Prompt.

**Phase 3 graduation gate (highest bar):**
- End-to-end flow: input vow → stake → witness → auth → payment → seal (full real Stripe SetupIntent + capture in TestFlight build).
- `claim-vow` correctly transfers ownership of anonymous drafts.
- Push registration fires correctly post-seal (gated by D17).
- Apple Pay works in TestFlight (real device test required).
- Card entry works as fallback.
- Reduce-motion variant tested for screen 06.
- All 3 sounds pre-load and fire correctly.
- `playSyncedFeedback()` confirmed firing within same animation frame.
- Joey signs off after a personal end-to-end test in TestFlight.

**Notes:**
- This is where the build's biggest payment + Stripe + auth integration risk sits. Holding the line on the ≥33/36 design and ≥16/18 CTO bars is critical.
- If Phase 3 fails, Phase 4+ is blocked. Don't move on without all 9 screens passing.

---

### Phase 4 — Post-seal share + waiting (screens 07, 07B, 08, 08B, 08C)

**Goal:** Maker can share witness invite, return-from-iMessage, and see waiting states for all witness configurations.

**Build order:**
1. **Screen 07** (singleton — phase opener). Send Witness Invite (named witness with phone).
2. **Screens 07B + 08** (pair). No-Witness-Picked share + Waiting Detail (named, pre-tap).
3. **Screens 08B + 08C** (pair). Returned-From-Messages + Shared-Link-No-Name.

**Phase 4 graduation gate:**
- Decision matrix from Step 1 P-1 correctly routes between 07/07B/08/08B/08C based on `witness_phone`, `witness_accepted_at`, and `sms_open_attempted` flag.
- AsyncStorage flag set/cleared correctly.
- iMessage deep-link works (validated on real device).
- Native share sheet works for 07B.
- Copy-to-clipboard works with `hapticCopySuccess` after success.
- "Judge it myself instead" calls `switchToSoloWitness` correctly.
- Joey signs off.

---

### Phase 5 — Active vow + verdict (screens 09, 10, 11, 12)

**Goal:** Maker can see live vow, mid-vow, almost-verdict, and verdict-due states.

**Build order:**
1. **Screen 09** (singleton — phase opener). Joe Accepted celebration. Real-time subscription wiring.
2. **Screens 10 + 11** (pair). Mid-Vow Active + Almost Verdict Time. Background phase transitions tested.
3. **Screen 12** (singleton — backend integration: nudge-witness via `send-sms`). Verdict Due, Waiting.

**Phase 5 graduation gate:**
- Real-time subscription correctly fires screen 09 transition when witness accepts in-app.
- Background phase transitions (default → green → gold → blue) animate cleanly.
- AsyncStorage `accept_celebration_seen:{vow_id}` correctly suppresses re-show.
- Nudge SMS works with 30-min client rate limit.
- Joey signs off.

---

### Phase 6 — Dashboard (screens 13, 13B, D14)

**Goal:** Returning users land on a real dashboard. The hub of the app.

**Build order:**
1. **Screen 13** (singleton — phase opener). Dashboard Command Center, including D14 empty state variant.
2. **Screen 13B** (singleton — menu overlay is its own surface). Project Perfect Menu.

**Phase 6 graduation gate:**
- Dashboard renders all vow types correctly (own + judging + dares).
- Sort/filter rules from Step 2 §F implemented exactly.
- Empty state (D14) shows correctly when no vows exist.
- Role pills filter properly.
- needCard pulse animation correct.
- Menu overlay (13B) presents/dismisses correctly with backdrop blur.
- Joey signs off.

---

### Phase 6.5 — Settings + History mini-phase (D19, D20)

**Goal:** Critical account ops (sign-out, delete-account) and history list are accessible.

**Build order:**
1. **Screens D19 + D20** (pair). Settings (lite) + History (lite).

**Phase 6.5 graduation gate:**
- Sign-out works via `supabase.auth.signOut()`, returns user to screen 01 unauthed.
- Delete-account confirmation sheet shows full destructive copy.
- `delete-account` edge function called correctly.
- History list pulls `getRecentVows()` and routes to D1/D2 details correctly.
- Joey signs off.

---

### Phase 7 — Power user (screens 14, 15, 16, 16B fallback)

**Goal:** Judging dashboard, dares list, quick-vow flow.

**Build order:**
1. **Screens 14 + 15** (pair). Judging Dashboard + Dares You Sent (read-only — create-dare bounces to web per Joey's #10 decision).
2. **Screen 16** (singleton). Quick Vow Main, including last-witness default state and direct saved-payment path.
3. **Screen 16B** (fallback singleton). Quick Vow Add Payment fallback for no saved payment method / prior $0-only user.

**Phase 7 graduation gate:**
- 14 lists witnessing vows correctly.
- 15 lists user's challenge vows by tab; "Dare someone →" opens web `/cast`.
- 16 collapses creation into one screen for returning users and launches Apple Pay / Stripe PaymentSheet directly when a saved method exists.
- 16 defaults to the user's most recent witness when available, with a faded row and a clear Change affordance.
- 16B handles payment + seal only as fallback when no saved method exists.
- Joey signs off.

---

### Phase 8 — Witness side + outcomes (screens 17, 18, 19, 20, D1, D2, D3, D4, D5, D6, D7, D8, D18)

**Goal:** Witness flow fully native (for the ~10% of witnesses who use the app vs. web), maker outcomes complete, viral loop installed.

**Build order:**
1. **Screens 17 + 18** (pair). Witness Accepted + Witness Mid-Vow.
2. **Screens 19 + 20** (pair). Witness Almost Up + Witness Time's Up. Verdict submission + sound.
3. **Screens D1 + D2** (pair). Maker Vow Kept + Maker Vow Broken. Both sounds + haptics.
4. **Screen D3** (singleton — pre-acceptance witness state). Witness Draft Page (native render — web is canonical).
5. **Screens D4 + D18** (pair). Witness Draft-Accepted + Witness Verdict Submitted Success / Viral CTA.
6. **Screens D5 + D6** (pair). Already-Accepted + Voided.
7. **Screens D7 + D8** (pair). Link Expired + Superseded.

**Phase 8 graduation gate:**
- Verdict submission triggers correct sound + haptic synchronization.
- M-Kept and M-Broken render correctly with $0 variant.
- Settlement card on M-Broken pulls from `settlements` table correctly.
- D18 viral CTA routes correctly (native if app installed, web otherwise).
- All terminal witness states (D5-D8) render correctly per backend signal.
- Real-time subscription fires across all 7+ relevant screens.
- Reduce-motion tested across all sound + haptic moments (sound + haptic still fire).
- Joey signs off.

---

### Phase 9 — Universal patterns + cleanup (D15, D16)

**Goal:** Network errors and catastrophic failures handled across the app.

**Build order:**
1. **Screen D15** (singleton). Network/Connectivity Error Toast pattern.
2. **Screen D16** (singleton). Catastrophic Failure / Try Again.

**Phase 9 graduation gate:**
- Toast pattern integrated into every network-dependent screen with retry logic.
- Catastrophic fallback verified for unrecoverable Stripe/auth failures.
- Joey signs off.

---

### Phase 10 — Final integration + LiveWebShell removal

**Goal:** Wipe the LiveWebShell entirely. Native is now the entire app.

**Tasks:**
1. Confirm every default route renders native screens.
2. Delete `expo/components/live-web-shell.tsx` and all uses (with one exception: `external-web` route remains for any push-notification deep links to web-only routes like certificate or public outcome).
3. Confirm `EXPO_PUBLIC_USE_NATIVE_PERFECT` flag is now ON by default in production EAS profile (or remove the flag entirely if everything graduated).
4. Remove the `nativePerfectProduction` EAS profile.
5. Build a clean TestFlight, run end-to-end smoke test on real device.
6. Web QA pass (per Joey's #14 — last step). Verify globals.css token changes from Phase 0 don't break web visuals.
7. Joey signs off as final phase exit.

**Phase 10 graduation gate:**
- TestFlight build is fully native, no LiveWebShell, every flow works end-to-end on real device.
- Web QA shows no regressions from token reconciliation.
- All audit logs, settlement flows, push notifications verified in production.
- Joey signs off as the build exit.

---

## C. Pairing schedule summary

| Phase | Singletons | Pairs | Total screens |
|---|---|---|---|
| 0 | (foundation, no UI graduation) | — | 0 |
| 1 | 01 | 02+02b, 02c+D9 | 5 |
| 2 | 03, 03c | 03b+03b+, D10+D11 | 6 |
| 3 | 04, 05, 05b, 06, D12 | 04b+04c, D13+D17 | 9 |
| 4 | 07 | 07B+08, 08B+08C | 5 |
| 5 | 09, 12 | 10+11 | 4 |
| 6 | 13, 13B (D14 inside 13) | — | 2 (D14 inside 13) |
| 6.5 | — | D19+D20 | 2 |
| 7 | 16, 16B fallback | 14+15 | 4 |
| 8 | D3 | 17+18, 19+20, D1+D2, D4+D18, D5+D6, D7+D8 | 13 |
| 9 | D15, D16 | — | 2 |
| 10 | (final integration) | — | 0 |

**Total checkpoints:** 9 phase-level signoffs + 30 individual screen pair/singleton signoffs = 39 review touchpoints across the build. At 15-25 min per checkpoint average, that's ~10-16 hours of Joey's review time spread across the project.

---

## D. Inter-phase dependencies

```
Phase 0 (foundation)
       ↓
Phase 1 (creation core) ── Phase 2 (witness)
                                    ↓
                           Phase 3 (auth + payment + seal) ← HIGHEST RISK
                                    ↓
                           Phase 4 (post-seal share)
                                    ↓
                           Phase 5 (active + verdict)
                                    ↓
                           Phase 6 (dashboard) → Phase 6.5 (settings/history)
                                    ↓                   ↓
                                  Phase 7 (power user)  
                                    ↓
                           Phase 8 (witness + outcomes)
                                    ↓
                           Phase 9 (universal patterns)
                                    ↓
                           Phase 10 (integration + cleanup)
```

Phase 3 is the bottleneck. If anything goes wrong with Stripe SetupIntent on TestFlight, the build halts there. All phases after 3 depend on a working seal.

---

## E. Continuous shipping model

Per Joey's #15 decision:

- After each screen graduates (passes both reviewers + Joey sign-off), its `USE_NATIVE_PERFECT_X` flag flips ON in production EAS profile.
- Next TestFlight build picks up the flag. TestFlight users (Joey + small testers) immediately see that screen native; rest of the app remains LiveWebShell.
- Visual disjointedness during this period is acceptable per Joey's #15 confirmation.
- No public marketing or external user invites until Phase 10 graduates.

---

## F. Estimated calendar

**Rough estimates** (Layer 0 / Claude Code velocity is unknown until first phase):

| Phase | Estimated days |
|---|---|
| 0 (foundation) | 3-5 |
| 1 (creation core) | 2-3 |
| 2 (witness) | 2-3 |
| 3 (auth + payment + seal) | 5-7 (highest risk, padding included) |
| 4 (post-seal) | 2-3 |
| 5 (active + verdict) | 2-3 |
| 6 (dashboard) | 2-3 |
| 6.5 (settings/history) | 1-2 |
| 7 (power user) | 2-3 |
| 8 (witness + outcomes) | 4-6 |
| 9 (universal patterns) | 1 |
| 10 (integration) | 2-3 |

**Total:** ~28-41 days of Layer 0 build, depending on how often reviewers hold and how quickly fixes turn around. Joey's review cadence (10-16 hrs) is amortized across this.

---

End of Step 5.
