# STEP 9 — Per-Screen Build Specs

This document contains a build spec per screen — every mocked screen (01-20) and every derived screen (D1-D20). Each spec is the contract Layer 0 reads when building that screen, and the contract the design + CTO reviewers score against.

**Format note:** Screens are compact but complete. Each spec tells Layer 0 the minimum to know without re-reading earlier docs. Cross-references to STEP_1, STEP_2, STEP_3, STEP_4 are given by section anchor where deeper detail lives.

**Universal preamble (applies to every screen below):**

- All token references (`gold`, `goldBright`, `text`, `textMuted`, etc.) refer to `expo/lib/uv-tokens.ts` after Phase 0 token reconciliation. Hex codes are descriptive only — code uses token names.
- All animation references (`fast`, `base`, `slow`, `ceremonial`, `tightSpring`, `sealCeremonial`) refer to constants set up in Phase 0 per STEP_4_MOTION_HAPTICS.md §A.
- All haptic references (`hapticPrimary()`, `hapticSelection()`, `hapticSheetPresent()`, etc.) are wrappers in `expo/lib/haptics.ts`.
- Every screen MUST include the standard reviewer invocation block at the end of its file. See "Standard Reviewer Invocation Block" section below.
- Every screen MUST include the standard Mock Deviation stop-rule. See same section.
- All build files for a screen go under `expo/app/native-perfect/<route>.tsx` plus any new primitives in `expo/components/primitives/` per Phase 0 list.

---

## Standard Reviewer Invocation Block

Every screen-XX file ends with this:

```markdown
---

## Reviewer Invocation

After building this screen and validating locally:

```bash
# 1. Capture built screen from booted simulator (must be on this screen)
./scripts/capture-built.sh <SCREEN_ID>

# 2. Compute visual diff vs mock
node scripts/diff-screen.mjs <SCREEN_ID>

# 3. Review reports at:
#    design-alignment/native-perfect/build-plan/diffs/<SCREEN_ID>-report.md

# 4. Invoke design reviewer
# (Claude Code: invoke .claude/agents/design-reviewer.md with this screen's
# spec, the diff report, the screenshots, and the PR diff)

# 5. Invoke CTO reviewer (in parallel with design)
# (Claude Code: invoke .claude/agents/cto-reviewer.md with the PR diff,
# this spec, STEP_2_BACKEND_MAP.md, and CLAUDE.md)
```

Both reviewers must PASS. Then present both reports to Joey for sign-off.

---

## Pre-Capture Navigation

Before running `./scripts/capture-built.sh <id>`, ensure the simulator is showing the target screen. Either:
- **Deep link** (preferred): `xcrun simctl openurl booted unbreakable-vow://native-perfect/<route>` — see route mappings in §screen-XX file structure.
- **Manual UI tap-through**: navigate from the simulator's current screen to the target by tapping through the app.

The simulator must be at the exact target screen state (loading complete, animations settled) before capture.

---

## Mock Deviation Stop-Rule

If during build you encounter anything you would want to change about this screen's mock or spec, STOP. Open a Mock Deviation Proposal in `MOCK_DEVIATIONS.md` per `STEP_8_MOCK_DEVIATIONS.md`. Do not proceed until Joey's decision is logged. Unauthorized deviation = automatic graduation hold.
```

This block is appended to every per-screen spec below. Treated as canonical boilerplate; not repeated in each spec for brevity.

---

## ─────────────────────────────────────────────────────
## MOCK SCREENS 01–20
## ─────────────────────────────────────────────────────

---

## screen-01-vow-only-quiet-start

**Phase:** 1 | **Pair:** singleton (phase opener) | **Route:** `/native-perfect/create/vow`

**Mock reference:** `project-perfect-final-build-mocks.html` shot 1 (lines 69-84). Render: `mock-renders/01.png`.

**Layout:** see STEP_1 §01. Status bar → StepHeader (1/5, 20%, SIGN IN) → tinybrand → h1 "Make a vow./Mean it." → copy → vow input card → "Or Start Here" → chip viewport → Bottom CTA "Next →".

**Typography:** h1 Fraunces 600/61/0.98 with em italic gold. Copy 600/15/1.38 `#b4aa98`. Kicker "I VOW TO" 800/12/0.34em `#817766`. Placeholder italic Fraunces 520/27/1.12 `rgba(185,174,154,.58)`.

**Colors:** all token-referenced (no hex in code). Mock CSS ↔ token map per STEP_1 preamble.

**Interactions:**
- Tap input → keyboard up, placeholder fades.
- Tap chip → `hapticSelection()`, chip flash gold 80ms, fills input.
- Tap "Next →" (enabled when input non-empty) → `hapticPrimary()`, slide-left to 02.
- Tap "SIGN IN" → if authed, navigate `/native-perfect/dashboard`; else navigate `/native-perfect/sign-in` (D13). `hapticSecondary()`.

**State:** local `rawInput` only. No DB writes.

**Backend:** none.

**New primitives needed:** `BrandWordmark` (tinybrand variant), `StepProgressHeader`, `VowInputCard`, `SuggestionChipScroll`. All from Phase 0.

**Animations + haptics:** see STEP_4 §D.1 screen 01.

**Acceptance criteria:**
- Cross-fade in 240ms on first launch.
- Input focus ramps border `borderSoft → border` over 120ms.
- Chip scroll: native iOS momentum.
- Mock-fidelity ≤2px tolerance vs `mock-renders/01.png`.
- Reduce-motion: no fade, no chip flash.
- Disabled "Next →" matches `.disabledCta` style from mock CSS.

**Files to touch:**
- `expo/app/native-perfect/create/vow.tsx` (new).
- `expo/components/primitives/{BrandWordmark,StepProgressHeader,VowInputCard,SuggestionChipScroll}.tsx` (new).
- `expo/lib/uv-tokens.ts` (token reconciliation — Phase 0 should have this done).

**Frozen-file check:** No frozen files touched.

---

## screen-02-stake-first

**Phase:** 1 | **Pair:** with 02b | **Route:** `/native-perfect/create/stake`

**Mock reference:** shot 2 (lines 85-108).

**Layout:** see STEP_1 §02. ChromeHeader (← Back, 2/5, ≡) → progress 40% → h1 "Set the stake." → sub → stake card with money + tiles + cheeky + consequence → vowDateCard → CTA "Choose your witness →".

**Typography:** h1 Fraunces 600/47/1.03. Sub 500/18/1.35. Money Fraunces 600/76/0.9 `goldBright`. Tile labels 800/19. Cheeky italic Fraunces 500/15 `#b0a691`. Consequence body 600/15/1.35.

**Interactions:**
- Tap tile → `hapticSelection()`, gold gradient ramps in, money cross-fades.
- Tap "Other" → opens D9 sheet (`hapticSheetPresent()`).
- Tap "Change" on consequence → opens 02c (`hapticSecondary()` then `hapticSheetPresent()`).
- Tap Verdict row → opens 02b.
- Tap "Choose your witness →" → slide-left to 03.

**State:** `stake_amount`, `consequence`, `destination`, `deadlineIso` (all client-side).

**Backend:** none.

**New primitives:** `MoneyDisplay`, `StakeTile`, `ConsequenceRow`, `VowDateCard`, `VowDateLine`.

**Animations + haptics:** see STEP_4 §D.1 screen 02.

**Acceptance criteria:**
- Tile selection animates over 120ms.
- Cheeky-line copy adapts based on stake amount (variants per STEP_1 §Open Questions — Step 9 inserts the variants here).
  - $0: "Word on the line, no money this time."
  - $10/$25: "Light enough to start. Real enough to count."
  - $50: "Enough to hurt. Not enough to be stupid."
  - $100+: "Enough to make the promise louder."
- Progress bar smoothly animates 20% → 40% on entrance.

**Files:** `expo/app/native-perfect/create/stake.tsx`, plus 5 new primitives.

---

## screen-02b-verdict-date-sheet

**Phase:** 1 | **Pair:** with 02 | **Route:** sheet over `stake.tsx`

**Mock reference:** shot 3 (lines 109-144).

**Layout:** see STEP_1 §02b. Underlying 02 dimmed, bottom sheet with handle → h2 "Verdict by when?" → p → datePills row.

**Typography:** h2 Inter Tight 800/26/1.08. p 600/15/1.35. Pills 700/15.

**Interactions:**
- Pill tap → `hapticSelection()`, ramps to `.on` state, sheet auto-dismisses 200ms after.
- "Pick date" → opens iOS native DateTimePicker on top of sheet.
- Tap dimmed area or drag handle down → dismiss.

**State:** updates `deadlineIso` in flow state.

**Backend:** none.

**New primitives:** `BottomSheet`, `DatePillRow`.

**Animations + haptics:** see STEP_4 §D.1 screen 02b.

**Acceptance criteria:**
- Slide-up 240ms with standard spring.
- Backdrop fade-in 120ms.
- Pill auto-dismiss 200ms after selection.
- Tap-anywhere-on-dim dismisses without changes.

**Files:** `expo/components/primitives/BottomSheet.tsx`, `DatePillRow.tsx`. Sheet content lives inline in `stake.tsx`.

---

## screen-02c-change-destination-sheet

**Phase:** 1 | **Pair:** with D9 | **Route:** sheet over `stake.tsx`

**Mock reference:** shot 4 (lines 145-189).

**Layout:** see STEP_1 §02c. Sheet uses `.causeSheet` variant — narrower (left:20 right:20), shorter padding, has × close button. h2 "Change where it goes." → p → 2 causeTypeCards → destLabel + destChips → creamCta "Done".

**Typography:** h2 Fraunces 600/25/1.08. CauseTypeTitle 800/15. CauseTypeSub 600/13. DestChip 700/13. CreamCta 800/16 `#151006` on `#f3ead9` bg.

**Interactions:**
- × close → `hapticSecondary()`, dismiss without changes.
- Cause type tap → `hapticSelection()`, toggles list.
- Destination chip tap → `hapticSelection()`.
- "Done" → `hapticPrimary()`, applies, dismisses.

**State:** updates `consequence` and `destination`.

**Backend:** none.

**New primitives:** `CauseTypeCard`, `DestinationChip`, `CreamCta` (one-off variant of GoldCTA).

**Acceptance criteria:**
- Default state: "A cause you believe in" is `.on`. ALS Association is the default destination.
- × button rotation 90° on tap before dismiss.
- "Done" applies pending changes; no-op if user toggled and toggled back.

---

## screen-03-choose-witness

**Phase:** 2 | **Pair:** singleton (phase opener) | **Route:** `/native-perfect/create/witness`

**Mock reference:** shot 5 (lines 191-227). Plus Step 1 patches P-8/P-9/P-10.

**Layout per STEP_1 §03 with patches:**
- StatusBar → ChromeHeader (← Back, 3/5, ≡) → progress 60% → h1 "Choose your witness." → sub.
- decisionCard "READY TO SEAL" + vow text + metaGrid (witnessMeta layout).
- judgeCard EMPTY ("+ Add a witness").
- quietActions row: "Decide later" (P-8) + "Share link" (P-10). NO "Go solo" (P-9 — only reachable via D10/D11).
- moneyNote "Nothing charges unless you break it."
- NO bottom CTA (must select an option to advance).

**Typography:** h1 Fraunces 600/48/1.02. WitnessSub 600/17/1.34.

**Interactions:**
- Tap judgeCard → `hapticSecondary()`, opens 03b sheet.
- Tap "Decide later" → `hapticSecondary()`, sets `witness_decision='deferred'`, slide-left to 04 (auth) WITHOUT a witness picked. The deferred user will hit D10 checkpoint after stake — wait, that's wrong: D10 is between stake and payment per Step 5. Actually re-checking: deferred user goes 03 → 04 (auth) → D10 (witnessless checkpoint) → 05 (payment) → 06 (seal).
  Correction: deferred user goes 03 → 04/04b/04c (auth) → 05 (payment screen but with the D10 checkpoint inserted before it, OR D10 fires as an interstitial between auth-complete and payment-screen mount). Per STEP_3 §D10 "fires between stake (current screen 02 in the locked order) and payment (screen 05)" — the screen 02 reference here is misleading; it's between 02 (stake) AND 05 (payment), with 03/04 in between. The actual placement: D10 fires after 03 + auth, before 05.
  Cleaner statement: D10 is a blocking interstitial that renders before 05 if `witness_decision === 'deferred'`. Position-wise, after 04c (auth complete) and before 05 (payment). Updates flow state if user picks a witness via D10's inline picker.
- Tap "Share link" → calls `prepare-judge-link` with `anonymous_token` (P-10). Opens iOS share sheet. After share, returns to 03 with state updated to track that a vow was created.

**State:** sets `witness_decision` flag (`'selected'` / `'deferred'` / `'shared'` from this screen, only `'solo'` reachable from D11).

**Backend:** `prepare-judge-link` for the Share link path. No DB writes for "Add witness" / "Decide later" until 03c.

**New primitives:** `WitnessJudgeCard` (with empty state).

**Acceptance criteria:**
- "Go solo" button NOT visible on this screen (P-9).
- Three quiet options visible: judgeCard (primary), "Decide later", "Share link".
- judgeCard is the largest visual element (primary).

---

## screen-03b-pick-witness-sheet

**Phase:** 2 | **Pair:** with 03c | **Route:** sheet over witness.tsx

**Mock:** shot 6 (lines 230-255).

**Layout per STEP_1 §03b:** sheet with handle → h2 "Pick your witness." → p "Choose a close friend, roommate, or anyone who won't let you slide." → permissionCard (gold-tinged, "Sync contacts") → contactHint "iPhone will ask for permission next. We never message anyone until you send the invite." → sheetQuiet "Share link instead". For first-time users, do **not** show recent-witness rows before permission because there is no app history yet.

**Interactions:**
- "Choose contact" → `hapticPrimary()`, then shows the native iOS contacts permission prompt if permission has not already been granted. If access is accepted and contacts are available, render 03b+ First-Time Contacts Synced state.
- If the user already has Unbreakable Vow witness history, recent witness row tap → `hapticSelection()`, populates `witness_name`, `witness_phone`, dismisses sheet. This is not the default first-time state.
- "Share link instead" → `hapticSecondary()`, dismisses sheet, on screen 03 user can tap "Share link" quietBtn.

**Backend:** none from this sheet directly. Selection updates local state; vow creation happens at 03c.

**New primitives:** part of the BottomSheet system from 02b. PermissionCard pattern.

---

## screen-03b1-ios-contacts-permission

**Phase:** 2 | **Pair:** with 03b / 03b+ | **Route:** native iOS permission alert over 03b

**Mock:** v2 shot `V2 03b1. iOS Contacts Permission`.

**Purpose:** show the exact moment after the user taps "Choose contact." This is system UI, not our custom sheet, but the surrounding screen should make the request feel expected and trustworthy.

**Layout / behavior:**
- 03b remains dimmed behind the system alert.
- iOS permission alert copy:
  - Title: `"Unbreakable Vow" Would Like to Access Your Contacts`
  - Body: `Find your witness faster. We only use the person you choose.`
  - Buttons: `Don't Allow` / `Allow`
- If `Allow`, transition to 03b+ First-Time Contacts Synced.
- If `Don't Allow`, dismiss back to 03b with the manual `Share link instead` and `Invite by phone or email` paths still available.

**Acceptance criteria:**
- The permission prompt is never shown cold on screen arrival; it appears only after explicit tap of `Choose contact`.
- User already saw the in-app trust copy before iOS asks.
- No contacts are messaged automatically.

---

## screen-03b-plus-first-time-contacts-synced

**Phase:** 2 | **Pair:** with 03b / 03c | **Route:** sheet over witness.tsx after contacts permission is accepted

**Mock:** v2 shot `V2 03b+. First-Time Contacts Synced`.

**Purpose:** show the post-permission Add Witness module state. This is not a generic address book; it is a trust-preserving witness picker that confirms contacts are available and helps the user choose someone who will actually hold them to the vow.

**Layout:**
- Same dimmed 03 witness background as 03b.
- Bottom sheet: handle → green `Contacts synced` pill → h2 `Choose witness.` → one-line copy `Pick someone you trust to witness this vow.`
- Search field `Search contacts`.
- First-time section `Suggested contacts` (not `Recent witnesses`).
- Full-width contact rows with avatar, name, secondary identifier/context, and right arrow.
- Optional manual fallback `Invite by phone or email`.

**Interactions:**
- Search field filters local contacts in-sheet.
- Full contact row tap → `hapticSelection()`, selects the row and immediately returns to 03c.
- If selected contact has multiple phone/email options and no reliable primary, open a small native resolver sheet; otherwise use the primary automatically.
- Empty search state: `No matching contacts` plus secondary `Invite by phone or email`.

**Copy / trust rules:**
- Use `Contacts synced` or `Contacts available`, never "uploaded" or "we found your friends."
- Do not show `Recent witnesses` for first-time users. `Recent witnesses` means recent Unbreakable Vow witnesses only, not arbitrary phone recents.
- Keep rows quiet: no gamified badges, relationship guesses, or over-explaining.

**Backend:** none. Local contacts only; chosen witness becomes local flow state. Vow creation happens at 03c / Continue unless a share link was created earlier.

**Acceptance criteria:**
- User understands contacts access succeeded.
- User can choose a witness in one tap.
- Contact picker preserves Unbreakable Vow's restrained, high-trust tone.
- Selecting a person routes directly to 03c with no extra confirm screen unless multiple contact methods require resolution.

---

## screen-03c-witness-selected

**Phase:** 2 | **Pair:** with 03b / 03b+ | **Route:** state of witness.tsx (rendered when `witness_name` is set)

**Mock:** shot 7 (lines 257-280). Plus Step 1 patch P-10.

**Layout per STEP_1 §03c with P-10 affordance:**
- ChromeHeader, progress 60%, h1, sub same as 03.
- decisionCard with kicker "WITNESS CHOSEN".
- judgeCard.filled with avatar "J" + "Joe is your witness." + "After you seal, we'll help you text Joe." + "Change" link.
- **NEW per P-10:** small italic "Ask Joe now →" link below judgeCard, color `goldBright`, font 600/14 italic. State after first tap: "Ask Joe again →".
- moneyNote.
- Bottom CTA "Continue →".

**Interactions:**
- Tap "Change" → `hapticSecondary()`, re-opens 03b.
- Tap "Ask Joe now →" → calls `prepare-judge-link` with anonymous token. Opens iMessage with pre-filled SMS template (or share sheet if witness has no phone). After return, link copy crossfades to "Ask Joe again →".
- Tap "Continue →" → `hapticPrimary()`. Per Step 1 P-2, **the vow row is created in DB at this moment** if not already created via Share link / Ask Joe now. Calls `prepare-judge-link` (or `createVow` if user already authed). Then slide-left to 04 (or skip to 05 if authed via D13 returning-user path).

**State:** sets `witness_name`, `witness_phone`, `witness_decision='selected'`. After Continue: `vow_id`, `witness_invite_token`, `anonymous_owner_token` populated.

**Backend:** `prepare-judge-link` (anonymous draft, or authed claim if already signed in).

**New primitives:** `WitnessJudgeCard` filled state.

**Acceptance criteria:**
- "Ask Joe now →" link visible but quiet.
- After first tap, link state updates to "Ask Joe again →".
- judgeCard.filled has gold-gradient avatar.

---

## screen-04-phone-first

**Phase:** 3 | **Pair:** singleton (phase opener) | **Route:** `/native-perfect/auth/phone`

**Mock:** shot 8 (lines 282-297). HARD requirement: ≥33/36 design + ≥16/18 CTO score.

**Layout per STEP_1 §04:** authWrap padding 92/28/0 → back link → h1 "What's your number?" → authSub → 3 dots (1 on) → phoneInput (country + tel) → fieldNote → stateSpec note → Bottom CTA "Text me the code".

**Typography:** authTitle Inter Tight 800/38/1.06/-0.01em. authSub 500/18/1.35. phoneInput inner text 600/26.

**Interactions:**
- Tap input → keyboard up.
- Tap country code → opens D12 country picker.
- Tap CTA → `hapticPrimary()`, calls `supabase.auth.signInWithOtp({ phone })`, slide-left to 04b.

**State:** local `phone`.

**Backend:** Supabase Auth phone OTP send.

**New primitives:** `PhoneInput` composite.

**Acceptance criteria:**
- Phone input validation: client-side E.164-ish check before send (10 digits min).
- Loading spinner replaces CTA text during signInWithOtp call.
- stateSpec note copy matches mock: "States: invalid number, sending, SMS failed, rate limited, change country."
- D15 toast appears on network failure.

---

## screen-04b-enter-code

**Phase:** 3 | **Pair:** with 04c | **Route:** `/native-perfect/auth/code`

**Mock:** shot 9 (lines 301-316).

**Layout per STEP_1 §04b.** authWrap → back → h1 "Enter the code." → sub "Sent to ••• ••• 5309." → 3 dots (2 on) → codeInput (6 digits, 18×2 separators) → microLink "Resend code in 38s" → stateSpec → CTA "Verify →" with `.disabledCta` style.

**Interactions:**
- Auto-paste OTP via iOS one-time-code autofill (supported via `textContentType="oneTimeCode"`).
- Each digit `hapticOtpDigit()`.
- Wrong code → `hapticOtpError()`, shake, sub becomes red "Wrong code. Try again." for 1500ms.
- 6 digits → CTA enables (gold gradient ramps in over 120ms). Tap → calls `auth.verifyOtp`. Slide-left to 04c (if no name) or 05 (if name set).
- Resend countdown 38s → 0 → tappable "Resend code" link.

**Backend:** Supabase `auth.verifyOtp({ phone, token, type: 'sms' })`. On success, upsert `users` row.

**New primitives:** `OtpInput` (6-digit composite).

**Acceptance criteria:**
- iOS autofill works (test on real device).
- Shake animation 200ms left-right.
- Resend timer ticks linearly.

---

## screen-04c-name-if-missing

**Phase:** 3 | **Pair:** with 04b | **Route:** `/native-perfect/auth/name`

**Mock:** shot 10 (lines 318-332).

**Layout per STEP_1 §04c.** Same authWrap structure. h1 "What should we call you?" → authSub → dots (3 on) → nameInput → fieldNote → stateSpec → CTA "Continue →".

**Interactions:**
- Tap input → keyboard up.
- Type → CTA enables.
- Tap CTA → `hapticPrimary()`, save `display_name` to `users` row with `display_name_source='manual'`, slide-left to 05 (after also calling `claim-vow` if anonymous draft exists).

**Backend:** `supabase.from('users').update({ display_name, display_name_source: 'manual' }).eq('id', userId)`. Then `claim-vow` edge function if `anonymous_owner_token` in AsyncStorage.

**New primitives:** `NameInput` (variant of phoneInput composite).

**Acceptance criteria:**
- Continue disabled until name has ≥2 chars.
- After save: `claim-vow` runs; on success, AsyncStorage `pending_anon_vow` cleared.
- Long names truncate gracefully (no layout break).

---

## screen-05-add-payment

**Phase:** 3 | **Pair:** singleton | **Route:** `/native-perfect/payment`

**Mock:** shot 11 (lines 337-364). HARD: ≥33/36 design.

**Layout per STEP_1 §05.** ChromeHeader (← Back, 5/5, ≡) → progress 100% → h1 "Add payment." → sub → decisionCard ("YOU ARE SEALING" + vow text + metaGrid 3-col STAKE/WITNESS/VERDICT) → payStack 1.1fr/0.9fr (Apple Pay tile.on + Card tile) → trustCard → paymentLegal absolute bottom → CTA "Lock it in".

**Interactions:**
- Tap payTile → `hapticSelection()`, toggle selection.
- Tap "Lock it in" → `hapticPrimary()`. Calls `save-card` to create SetupIntent, gets clientSecret. Calls `useStripe().initPaymentSheet({ setupIntentClientSecret, merchantDisplayName: 'Unbreakable Vow', applePay: { merchantCountryCode: 'US' } })`. Then `presentPaymentSheet()`. (This is screen 05b territory — Stripe owns the sheet.)

**Backend:** `save-card` edge function (returns clientSecret + setupIntentId).

**New primitives:** `PayTile`, `TrustCard`, `LegalLine`.

**Acceptance criteria:**
- Apple Pay tile on by default.
- payStack grid is 1.1fr/0.9fr (NOT 1fr/1fr).
- Trust card copy: "Nothing charges today. Apple Pay saves your payment method. You are charged only if the vow is broken."
- paymentLegal at bottom 106 (per mock).
- Stripe PaymentSheet initialization happens on screen mount (pre-fetch clientSecret) so the user's tap of "Lock it in" instantly presents the sheet.

**$0 STAKE BYPASS:** If `vows.stake_amount === 0`, this screen is bypassed entirely. The flow:
- 04c (auth complete with name) → directly to `seal-vow({ vow_id, skip_payment: true })` → cross-fade (`slow`, 400ms) to screen 06.
- No payment screen UI for $0 vows. No Stripe call. No clientSecret.
- The $0 path through the build is: 01 vow → 02 stake (with custom $0 selected via D9) → 03 witness → 04/04b/04c (auth) → seal-vow with skip_payment → 06.
- The reviewer subagent verifies this branch is properly implemented for $0 vows.

---

## screen-05b-stripe-apple-pay-confirm

**Phase:** 3 | **Pair:** singleton | **Route:** Stripe-presented sheet over screen 05

**Mock:** shot 12 (lines 366-413). The mock includes a `.systemNote` and `.nativeSheet` — both are **designer references**, not things we render. Stripe's actual PaymentSheet is what appears.

**Layout:** N/A — Stripe owns the surface.

**Interactions:** Stripe handles the sheet. On success → `presentPaymentSheet()` resolves → call `seal-vow` edge function → cross-fade to screen 06.

**Backend:** Stripe SetupIntent confirmation. Then `seal-vow` to flip status → 'active'.

**Acceptance criteria:**
- Merchant display name: "Unbreakable Vow" (configured in initPaymentSheet).
- Apple Pay merchant country: 'US'.
- Payment configuration matches setupIntent's saved customer ID.
- On success, vow status flips to 'active'.
- On Stripe failure → D15 toast, stay on 05.
- The "double-click to confirm" in the mock is iOS Apple Pay's native UI — we don't control it.

**Note on systemNote in mock:** "Stripe/Apple present this native sheet. We control the setup, merchant name, and surrounding context." — this is a design reference for OUR team, not something the user sees. Do NOT render it.

---

## screen-06-sealed-moment ⭐

**Phase:** 3 | **Pair:** singleton (climax) | **Route:** `/native-perfect/sealed`

**Mock:** shot 13 (lines 415-428). EMOTIONAL CLIMAX. Most carefully animated screen in app.

**Layout per STEP_1 §06.** sealWrap.sealMoment padding 66/24/0 plus padding-top 150 → sealMark (94×94 rounded square per Mock Deviation #1) → kicker "SEALED" → h1 "Your vow is bound." → sealRule → sealQuote (italic Fraunces) → sealedSub "Now Joe needs to know." If no named witness exists, use "Now tell your witness."

**No bottom CTA initially.** Per Step 1 P-3, a tap-to-continue affordance fades in after the seal animation completes.

**Animation timeline:** see STEP_4 §D.1 screen 06. 1820ms total before user can advance.

**Interactions:**
- After 1820ms, contextual affordance fades in (italic Fraunces 17px, `textMuted`, pulsing 1400ms cycle): "Tell Joe →" for named witness, "Share the link →" for no named witness.
- Tap anywhere in bottom 30% of screen → `hapticPrimary()`, fade-to-black 300ms + cross-fade to 07/07B/08C per matrix (P-1).

**State:** AsyncStorage `seal_intro_seen` set to true on first complete (suppress for Phase 6.5 first-time users).

**Backend:** none (vow is already 'active' by the time this renders — `seal-vow` was called on PaymentSheet success).

**New primitives:** `SealMark` with sealMoment variant per Mock Deviation #1 (composed View layers for halo).

**Sound:** soundSealThud at t=540ms synced with hapticSealComplete().

**Acceptance criteria:**
- Total animation duration 1820ms (matches `SEAL_TIMELINE` constant).
- Contextual affordance pulses on `pulseDot` rhythm.
- Tap target spans bottom 30% of screen (not just visible chevron).
- Reduce-motion: end-state immediate, sound + haptic still fire.
- Sound + haptic fire on same animation frame (`playSyncedFeedback()`).
- ≥33/36 design score, ≥16/18 CTO.

---

## screen-07-send-witness-invite

**Phase:** 4 | **Pair:** singleton (phase opener) | **Route:** `/native-perfect/post-seal/share`

**Mock:** shot 14 (lines 430-451).

**Layout per STEP_1 §07.** sealWrap (no sealMoment) → small sealMark (82×82 round) → kicker "NEXT" → h1 "Send Joe the invite." → sealedSub → messageCard (kicker "YOUR TEXT TO JOE" + body + URL) → note → Bottom (sealedBottom modifier, bottom:42) CTA "Text Joe the invite" + quietLinks.

**Interactions:**
- Tap "Text Joe the invite" → `hapticPrimary()`, sets AsyncStorage `sms_open_attempted:{vow_id}`, opens iMessage with pre-filled SMS:
  ```
  I vowed to <vow_text>. $X if I break it. You decide if I kept it: <witness_url>
  ```
  Returns to 07 (the user can re-share).
- Tap "Copy link" → write URL to clipboard, `hapticCopySuccess()`, briefly toast "Copied".
- Tap "Send it later" → `hapticSecondary()`, navigate to 08B (or dashboard).

**Routing:** This screen is the default render for `(witness_name && witness_phone && !witness_accepted_at && !sms_open_attempted)` per P-1 matrix.

**Backend:** none from this screen (vow already created and sealed).

**New primitives:** `MessagePreviewCard`, `SealMarkSmall`.

**Acceptance criteria:**
- SMS pre-fill exact match per template.
- Copy-to-clipboard fires haptic AFTER write succeeds, not on tap.

---

## screen-07B-no-witness-picked

**Phase:** 4 | **Pair:** with 08 | **Route:** same as 07

**Mock:** shot 16 (lines 487-508).

**Layout:** Same as 07 except:
- h1 "Share the invite."
- sealedSub "Whoever accepts becomes your witness. Then the vow starts."
- messageCard kicker "YOUR SHARE TEXT".
- note "We'll open the share sheet. You choose who gets it."
- CTA "Share the invite".

**Routing:** This screen renders when (`!witness_name && !witness_accepted_at`).

**Interactions:**
- "Share the invite" → `hapticPrimary()`, opens iOS share sheet (`Share.share({ message, url })`). After dismissed, AsyncStorage flag set, navigate to 08C (waiting share-link state).

---

## screen-08-waiting-witness-detail

**Phase:** 4 | **Pair:** with 07B | **Route:** `/native-perfect/vow/[id]`

**Mock:** shot 15 (lines 453-485).

**Layout per STEP_1 §08.** detailSafe → ChromeHeader (← Dashboard) → pill "INVITE SENT" → h1 "Waiting for Joe." → detailSub "Your vow is sealed. Joe has the invite. Once he accepts, it begins." → waitCard (clock + waitTitle "Invite sent." + waitSub "You made it this far. Now Joe needs to accept." + quote + inner CTA "Remind Joe" + linkRow with linkBox + copyBtn + helper note) → softAction "Judge it myself instead" → timeline section.

**Routing:** Renders for `(witness_name && witness_phone && !witness_accepted_at && !sms_open_attempted)` per P-1.

**Wait — but 07 has the SAME criteria.** 07 is the immediate post-seal share screen; 08 is the persistent vow detail when user comes back via dashboard. Differentiator: navigation source. 07 is reached from 06 (post-seal). 08 is reached from dashboard (re-entry). Both render based on the same vow state but with different chrome (07 has "NEXT" framing, 08 has "INVITE SENT" pill + dashboard back).

**Interactions:**
- Inner "Remind Joe" → SMS deep link (same URL/message as 07, but framed as a resend).
- "Copy link" copyBtn → clipboard.
- "Judge it myself instead" → confirmation sheet, then `switchToSoloWitness(vowId)`.

**New primitives:** `WaitCard`, `Timeline` + `TimelineItem`.

---

## screen-08B-returned-after-messages

**Phase:** 4 | **Pair:** with 08C | **Route:** same as 08

**Mock:** shot 17 (lines 510-542).

**Layout:** Same as 08 except:
- pill "WAITING ON JOE".
- h1 "Waiting on Joe."
- detailSub "If you sent the text, you're done for now. Joe must accept before the vow starts."
- waitCard waitTitle "Waiting for acceptance."
- waitCard CTA "Got it" (instead of Text Joe).
- linkRow copyBtn "Text again".

**Routing:** Renders for `(witness_name && witness_phone && !witness_accepted_at && sms_open_attempted)` per P-1.

**Interactions:** "Got it" → dashboard. "Text again" → re-fires SMS deep link (re-sets sms_open_attempted to current timestamp).

---

## screen-08C-shared-link-no-name

**Phase:** 4 | **Pair:** with 08B | **Route:** same as 08

**Mock:** shot 18 (lines 544-562).

**Layout:** detailSafe → ChromeHeader → pill "WAITING FOR WITNESS" → h1 "Waiting for a witness." → detailSub → activeCard (kicker "THE VOW" + vow text + metaGrid 1fr/1.15fr STAKE + IF BROKEN) → job section ("Need to resend? Share the invite again or copy the link.") → Bottom CTA "Done" + quietLinks "Share again" / "Copy link".

**Routing:** Renders for `(!witness_name && !witness_accepted_at)`.

**Interactions:** "Share again" → re-fires share sheet. "Copy link" → clipboard.

**New primitives:** `JobCard` (the "Need to resend?" card pattern).

---

## screen-09-joe-accepted

**Phase:** 5 | **Pair:** singleton (phase opener) | **Route:** `/native-perfect/vow/[id]` (state)

**Mock:** shot 19 (lines 564-581). Phone bg `.green`.

**Layout per STEP_1 §09.** Background phase transitions to `.green` over 800ms. activeCenter padding 78/24/0 → liveMark green ✓ 82×82 → kicker "YOU'RE LIVE" → h1 "Joe is watching." → centerSub → activeCard left-aligned (kicker "THE VOW" + vow text + metaGrid 1fr/1.15fr STAKE + JUDGE green) → Bottom CTA `.cta.green` "See my vow".

**Routing:** Triggered when real-time subscription detects `witness_accepted_at` change from null to non-null. AsyncStorage `accept_celebration_seen:{vow_id}` gates one-time presentation.

**Interactions:**
- "See my vow" → `hapticPrimary()`, AsyncStorage flag set, cross-fade to screen 10.

**New primitives:** `LiveMark` (green variant of SealMark), `CenterTitle`.

**Acceptance criteria:**
- Background phase transition over `ceremonial` (800ms).
- liveMark scales in with `tightSpring` at t=400ms.
- haptic `hapticPrimary()` at liveMark settle.
- AsyncStorage suppresses re-show.

---

## screen-10-mid-vow-active

**Phase:** 5 | **Pair:** with 11 | **Route:** `/native-perfect/vow/[id]`

**Mock:** shot 20 (lines 583-606). Phone bg `.green`.

**Layout per STEP_1 §10.** detailSafe → ChromeHeader → pill `.live` "VOW LIVE" → h1 "Keep going." → detailSub "Joe decides if you kept your word." → activeCard (THE VOW + metaGrid STAKE on hold + JUDGE Joe is watching) → countCard (TIME LEFT + Sunday night + countBig "4 days left" + countSub + meter at 38%) → Bottom `.cta.green` "Done" + quietLinks "Text Joe a check-in" / "Share vow".

**Routing:** Renders when status='active' AND witness_accepted_at not null AND ends_at - now > 24h.

**Interactions:**
- "Done" → dashboard.
- "Text Joe a check-in" → SMS deep link with body "Hey Joe, just keeping you in the loop on the vow: <vow_text>".
- "Share vow" → native share sheet with public outcome URL or witness URL.

**New primitives:** `CountCard`, `Pill.Live`.

---

## screen-11-almost-verdict-time

**Phase:** 5 | **Pair:** with 10 | **Route:** same as 10

**Mock:** shot 21 (lines 608-631). Phone bg `.gold`.

**Layout per STEP_1 §11.** Same structure as 10. Background phase transitions from `.green` to `.gold` over 800ms when ends_at - now < 24h. Pill default "ALMOST VERDICT TIME". h1 "Last stretch." Sub "Joe calls it soon. Finish clean." countCard countBig "2h 14m" + meter at 91%. Bottom default `.cta` "Text Joe a final check-in" + quietLinks.

**Interactions:**
- "Text Joe a final check-in" → SMS deep link.
- "Back to dashboard" → dashboard.
- "Share vow" → share sheet.

---

## screen-12-verdict-due-waiting

**Phase:** 5 | **Pair:** singleton | **Route:** same as 10

**Mock:** shot 22 (lines 633-657). Phone bg `.blue`.

**Layout per STEP_1 §12.** Background to `.blue` over 800ms when ends_at < now. Pill `.blue` "VERDICT DUE". h1 "Time's up. Joe decides." Sub "Joe can decide now. Nudge them if you need to." activeCard (STAKE at stake + ENDED Today). timeline section (Now: Joe can deliver the verdict / If kept: Nothing charges). Bottom CTA "Nudge Joe to decide" + quietLinks.

**Interactions:**
- "Nudge Joe to decide" → `hapticPrimary()`. Calls `send-sms` with `message_type='verdict_request'`. Client-side rate-limit: no more than 1 nudge per 30min per vow (AsyncStorage `last_nudge:{vow_id}` timestamp). On success: small toast "Nudge sent." On rate-limited: toast "You can nudge again in X min."
- "Back to dashboard" → dashboard.

**Backend:** `send-sms` edge function with `message_type='verdict_request'`.

---

## screen-13-dashboard-command-center

**Phase:** 6 | **Pair:** singleton (phase opener) | **Route:** `/native-perfect/dashboard`

**Mock:** shot 23 (lines 661-696). Includes D14 empty state.

**Layout per STEP_1 §13 + STEP_3 D14:** safe → scroll wrapper (padding-bottom 94 for footer) → head (hamburger / wordmark / avatar) → h1 "Hey, [Name]." → dashSub "Open loops first. Quiet vows after." → rolePills row (All / My vows / Judging · X / Dares · X) → optional needCard if has-attention items → sectionHead "YOUR VOWS" + count → vowCard list → moduleRow (miniModules for judging count and dares-sent count) → footer absolute bottom CTA "Make a vow →".

**Empty state (D14):** when getMyVows() + getWitnessingVows() + getIncomingChallenges() all empty: replace post-greeting content with single empty-state card + footer CTA "Make your first vow →".

**Sort/filter:** per STEP_2 §F.

**Interactions:**
- Tap rolePill → filter cards.
- Tap needCard → opens witness verdict screen.
- Tap vowCard → opens vow detail (08/10/11/12 state-dependent).
- Tap miniModule → opens 14 (judging) or 15 (dares).
- Tap "Make a vow →" → opens 16 (returning users) or 01 (first-time, but unlikely path on dashboard).
- Pull to refresh → re-fetches all queries.

**New primitives:** `RolePill`, `NeedCard`, `VowCard`, `MiniModule`, `WatchPill`, `SectionHead`.

---

## screen-13B-project-perfect-menu

**Phase:** 6 | **Pair:** singleton | **Route:** overlay over 13

**Mock:** shot 24 (lines 698-744).

**Layout per STEP_1 §13B.** menuOverlay (backdrop blur + dim) → menuPanel → menuTop (name + close ×) → menuItem.hero "Make a vow" → menuSection "DASHBOARD" + 3 menuItems (My vows / People I'm judging / Dares I sent) with badges → menuSection "CHALLENGES" + menuItem "Dare someone" → menuSection "ACCOUNT" + 2 menuItems (Settings / Help) → menuFooter with tinyLinks (Terms / Privacy).

**Interactions:**
- × close → dismiss.
- menuItem.hero → opens screen 16 quick vow.
- "My vows" → filters dashboard to my vows.
- "People I'm judging" → opens screen 14.
- "Dares I sent" → opens screen 15.
- "Dare someone" → opens web `/cast` via LiveWebShell or in-app Safari.
- "Settings" → opens D19.
- "Help" → opens help URL via Linking.
- Tap dimmed area → dismiss.
- Swipe-down on panel → dismiss.

**New primitives:** `MenuPanel`, `MenuItem`, `MenuItem.Hero`, `MenuSection`.

---

## screens 14, 15, 16, 16B (compact)

**Screen 14 — Judging Dashboard:** see STEP_1 §14. New primitive `JudgingRowCard`. Reads `getWitnessingVows()`. Sort per STEP_2 §F. Pair with 15. Route `/native-perfect/judging`.

**Screen 15 — Dares You Sent:** see STEP_1 §15. New primitives `TabBar`, `SeeAllButton`, `WatchPill.Pending`. Filters challenge vows by `challenge_status`. "Dare someone →" opens web `/cast`. Pair with 14. Route `/native-perfect/dares`.

**Screen 16 — Quick Vow Main:** see STEP_1 §16 and the v2 mock notes. Returning-user-only compact single-page creation flow. New primitives `QvCard`, `QvInput`, `QvDate`, `QvStakeBig`, `QvTile`, `QvWitness`, `QvReceipt`. The witness row defaults to the user's most recent witness when available: gold initial avatar, witness name, contextual subcopy such as "Joe's been your witness before.", right-side `Change`, and default opacity `.85` until the user taps/changes the row. No `Decide later` path on Quick Vow; users who need deferral use Guided setup. Primary paid path: tapping `Stake $X ->` launches Apple Pay / Stripe PaymentSheet directly when a saved payment method exists, then routes to screen 06. Route `/native-perfect/quick-vow`.

**Screen 16B — Quick Vow Add Payment Fallback:** see STEP_1 §16B. Same backend path as 05/05b/06 but compact. Fallback-only, not the happy path: show when the returning user has no saved payment method, lost Stripe customer state, or previously completed only $0 vows. Route `/native-perfect/quick-vow/payment`.

---

## screens 17, 18, 19, 20 (compact — witness side)

**Screen 17 — Witness Accepted:** see STEP_1 §17. Phone bg `.green`. Same liveMark choreography as screen 09. Pair with 18.

**Screen 18 — Witness Mid-Vow:** see STEP_1 §18. Phone bg `.green`. Mirrors screen 10 visually but witness-side. Pair with 17.

**Screen 19 — Witness Almost Up:** see STEP_1 §19. Phone bg `.gold`. Pair with 20.

**Screen 20 — Witness Time's Up:** see STEP_1 §20. Phone bg `.blue`. Yes/No judge buttons → confirmation sheet → `submit-verdict` with verdict + token. Sound + haptic synced. Pair with 19.

---

## ─────────────────────────────────────────────────────
## DERIVED SCREENS D1–D20
## ─────────────────────────────────────────────────────

For derived screens, see STEP_3_DERIVED_SCREENS.md as the canonical spec. The reviewer uses Step 3 + Step 4 + Step 2 as the contract. Per STEP_7 §A, derived screens have NO mock PNG, so the design reviewer's Mock Fidelity criterion 11 is replaced with "Spec Fidelity" — does the implementation match the Step 3 derived spec.

Compact reference for each:

**D1 — Maker, Vow Kept:** STEP_3 §D1. Phase 8. Pair with D2. Route `/native-perfect/vow/[id]/kept`.

**D2 — Maker, Vow Broken:** STEP_3 §D2. Phase 8. Pair with D1.

**D3 — Witness Draft Page:** STEP_3 §D3. Phase 8 (singleton). Web is canonical render — native is supplementary. Spec serves both.

**D4 — Witness Draft-Accepted:** STEP_3 §D4. Phase 8. Pair with D18.

**D5 — Witness Already-Accepted:** STEP_3 §D5. Phase 8. Pair with D6.

**D6 — Witness Voided / Maker Bailed:** STEP_3 §D6. Phase 8. Pair with D5.

**D7 — Witness Link Expired:** STEP_3 §D7. Phase 8. Pair with D8.

**D8 — Witness Superseded:** STEP_3 §D8. Phase 8. Pair with D7.

**D9 — "Other" Custom Stake Sheet:** STEP_3 §D9. Phase 1. Pair with 02c.

**D10 — Witnessless Checkpoint:** STEP_3 §D10. Phase 2. Pair with D11. Renders before screen 05 if `witness_decision='deferred'`.

**D11 — Go-Solo Confirmation Sheet:** STEP_3 §D11. Phase 2. Pair with D10.

**D12 — Country Code Picker:** STEP_3 §D12. Phase 3. Singleton.

**D13 — Returning-User Sign-In:** STEP_3 §D13. Phase 3. Pair with D17.

**D14 — Dashboard Empty State:** rendered as a state of screen 13. No standalone build.

**D15 — Network/Connectivity Error:** STEP_3 §D15. Phase 9. Pair with D16. Universal toast pattern.

**D16 — Catastrophic Failure:** STEP_3 §D16. Phase 9. Pair with D15.

**D17 — Push Permission Pre-Prompt:** STEP_3 §D17. Phase 3. Pair with D13. Inserted between 06 and 07 on first seal.

**D18 — Witness Verdict Submitted Success + Viral CTA:** STEP_3 §D18. Phase 8. Pair with D4.

**D19 — Settings (lite):** STEP_3 §D19. Phase 6.5. Pair with D20.

**D20 — History (lite):** STEP_3 §D20. Phase 6.5. Pair with D19.

---

## File structure

After Phase 0:

```
expo/app/native-perfect/
├── create/
│   ├── vow.tsx           (screen 01)
│   ├── stake.tsx         (screen 02 + 02b sheet + 02c sheet + D9 sheet)
│   ├── witness.tsx       (screen 03 + 03b sheet + 03b+ synced picker + 03c state)
│   └── witness-checkpoint.tsx  (D10 + D11)
├── auth/
│   ├── phone.tsx         (screen 04)
│   ├── code.tsx          (screen 04b)
│   ├── name.tsx          (screen 04c)
│   ├── country-picker.tsx (D12)
│   └── sign-in.tsx       (D13 returning user)
├── payment.tsx           (screen 05 — 05b is Stripe-handled)
├── sealed.tsx            (screen 06)
├── push-permission.tsx   (D17)
├── post-seal/
│   └── share.tsx         (screen 07 + 07B based on state)
├── vow/[id].tsx          (screens 08/08B/08C/10/11/12 + D1/D2 — state-aware)
├── celebration.tsx       (screen 09 — full-screen overlay state)
├── dashboard.tsx         (screen 13 + D14)
├── menu.tsx              (screen 13B — overlay)
├── judging.tsx           (screen 14)
├── dares.tsx             (screen 15)
├── quick-vow/
│   ├── index.tsx         (screen 16)
│   └── payment.tsx       (screen 16B)
├── settings.tsx          (D19)
├── history.tsx           (D20)
└── w/[token].tsx         (witness-side screens 17/18/19/20 + D3/D4/D5/D6/D7/D8/D18 — state-aware)
```

Witness side (`w/[token].tsx`) is a single state-aware screen that renders the appropriate witness UI based on the vow's status, the witness's acceptance state, the token's validity, and the maker's state. The web app already does this; native parity follows the same pattern.

---

End of Step 9.
