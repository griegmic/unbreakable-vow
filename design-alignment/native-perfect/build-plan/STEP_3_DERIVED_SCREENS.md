# STEP 3 — Derived Screen Designs

Every screen here exists in the same visual language as the 32 canonical mocks but is NOT in `project-perfect-final-build-mocks.html`. Each is specced fully enough that a Step 9 build spec can be generated without further design work.

Tokens, typography, spacing, components inherit from the mock CSS variables (read STEP_1_MOCK_DECOMP.md for the global library). Where a derived screen reuses a mock pattern, the spec references the mock by ID rather than restating the pattern.

Every derived screen is governed by the same source-of-truth rule as the mocks: once Joey approves it here, deviating during build requires a Mock Deviation Proposal.

---

## D1 — Maker, Vow Kept (M-Kept)

**Trigger:** `submit-verdict` with verdict='kept' succeeds. Vow status flips to `kept`. Maker's app receives push or refreshes detail. M-Kept renders.

**Phone background:** `.green` (matches witness-accepted aesthetic from screens 09, 17).

**Layout family:** `activeCenter` (from screens 09 / 17) — center-aligned hero treatment, with a card below, sticky bottom CTA. Solemn, satisfying, never confetti.

**Top to bottom:**
1. StatusBar.
2. activeCenter padding `78 24 0`, text-align center.
3. **liveMark variant — kept stamp:** 94×94 (slightly larger than the 82×82 used in screens 09/17), border-radius 26 (rounded square, NOT full circle — references a wax seal/stamp), green gradient `#63e1a5 → #25ad6a`, dark glyph "✓" 800/40 centered. Halo: `0 0 0 13px rgba(82,214,154,.12), 0 0 0 28px rgba(82,214,154,.04), 0 24px 70px rgba(82,214,154,.24)`.
4. Kicker "KEPT" — 800/12, 0.34em, uppercase, color `#52d69a` (green). Margin-bottom 16.
5. h1 centerTitle: "You actually\n<em.green>did it.</em>" — Fraunces 500/40/1.04, font-variation `SOFT 55, WONK 0`. Em italic in green.
6. centerSub: "Crisis averted. $50 stays yours." — 600/17/1.36, color `textMuted`, max-width 300. (Adapt copy for $0 vows: "Word kept. Word honored." — no money mention.)
7. **activeCard left-aligned** (1px gold border 0.34, padding 18, radius 22):
   - Kicker "THE VOW YOU KEPT" 800/12 0.34em.
   - Vow text Fraunces 600/22/1.18 italic.
   - metaGrid 3-col (`1fr 1fr 1.1fr`):
     - "STAKE" / "$50" `metaValue.gold`.
     - "WITNESS" / "Joe".
     - "KEPT ON" / "Sun, May 3".
   - For $0 vows: metaGrid 2-col, omit STAKE column, show "WITNESS" + "KEPT ON".
8. **Bottom (`.bottom`):**
   - Primary CTA `.cta.green`: "Make another vow".
   - quietLinks: "Share what you did" / "Done".

**Interactions:**
- "Make another vow" → returns to screen 01 / quick-vow (depending on returning-user heuristic).
- "Share what you did" → native share sheet with shareable outcome URL `/outcome/{vowId}` (web app handles rendering).
- "Done" → dashboard.

**Data:**
- Read: `vows.refined_text`, `vows.stake_amount`, `vows.witness_name`, `vows.verdict_at`, `vows.destination`.
- Write: AsyncStorage `kept_celebration_seen:{vow_id}` after first present (suppress re-show).

**Backend:** none — this is a render-only screen post-verdict.

**Animation (preview, full spec in Step 4):**
- liveMark cross-fades in from 0.85 scale → 1.0 with 320ms spring.
- Kicker, title, sub, card cascade in (each 200ms apart, 280ms fade-up each).
- Sound: `soundVerdictKept` fires synced with `hapticVerdictKept` at the moment liveMark settles.

**Acceptance criteria:**
- Renders within 200ms of `kept` status change.
- All copy matches above exactly.
- `$0` variant copy matches `WEB_TO_NATIVE_COPY_MATRIX` ("Word kept. Word honored.").
- Reduce-motion: liveMark appears static, no halo pulse, but sound + haptic still fire.

---

## D2 — Maker, Vow Broken (M-Broken)

**Trigger:** `submit-verdict` with verdict='broken' succeeds. Vow status flips to `broken`. Settlements row written. Maker's app receives push or refreshes detail.

**Phone background:** `.blue` (matches verdict-due aesthetic from screen 12). NOT red. Red would feel punitive in a way that breaks brand.

**Layout family:** `detailSafe` with chrome header (NOT a full-bleed center hero — broken outcomes deserve information density and gravity, not celebration).

**Top to bottom:**
1. StatusBar.
2. detailSafe padding 22.
3. ChromeHeader: "← Dashboard" / empty / hamburger. (Note: even in the moment of breaking, the user retains escape paths — this is a brand choice, not a punishment screen.)
4. Pill: "BROKEN" — small, low-saturation. Background `rgba(244,234,216,.06)`, color `textDim` (`#5A5346`). Distinct from the celebratory pills on other screens — this pill is muted, not red, not orange.
5. h1 detailTitle: "Brutal.\n<em>You broke it.</em>" — Fraunces 500/42/1.04. The em is NOT colored — it's left at default `text` (`#f4ead8`) for solemnity. NOT a celebratory color. The gravity is in the absence of color, not the presence of it.
6. detailSub: "$50 is on its way to ALS Association. The promise was real." — 600/17/1.36, `textMuted`. (For $0 vows: "Verdict: broken. The record stands.")
7. **activeCard:**
   - Kicker "THE VOW YOU BROKE" 800/12 0.34em.
   - Vow text Fraunces 600/22/1.18 italic.
   - metaGrid 3-col `1fr 1.15fr 0.85fr`:
     - "CHARGED" / "$50" `metaValue.gold` (gold preserved here — the money moved).
     - "TO" / "ALS Association".
     - "ON" / "Sun, May 3".
   - $0 variant: metaGrid 2-col, omit CHARGED + TO, show "VERDICT" / "Broken" and "ON" / date.
8. **Settlement detail card** (small, dim, below activeCard):
   - 1px dim border, 18 radius, padding 14, color `textMuted`.
   - Kicker "RECEIPT" 800/10 0.22em.
   - Body 600/13/1.4: "Charge processed. ALS Association receives the funds within 30 days. You'll get a confirmation when settlement completes."
   - This card only renders for staked vows. For $0, it's omitted.
9. **Bottom (`.bottom`):**
   - Primary CTA (default gold, NOT green): "Make a new vow".
   - quietLinks: "See the receipt" / "Done".

**Interactions:**
- "Make a new vow" → screen 01 / quick-vow.
- "See the receipt" → native settlement detail view (Step 9 — could be a small sheet with PI ID, charge timestamp, settlement status).
- "Done" → dashboard.

**Data:**
- Read: `vows.refined_text`, `vows.stake_amount`, `vows.witness_name`, `vows.destination`, `vows.verdict_at`, `settlements` row joined on `vow_id` for status.
- Write: AsyncStorage `broken_acknowledged:{vow_id}` after present.

**Animation:**
- No liveMark / sealMark equivalent — this screen does NOT have a celebratory glyph. The absence is intentional.
- Card slides in from below (180ms), settlement card cross-fades in 240ms after.
- Sound: `soundVerdictBroken` (descending tone) fires on present, synced with `hapticVerdictBroken`. Once. Quiet (-16dB).

**Acceptance criteria:**
- No red colors anywhere on the screen.
- No celebratory typography weight or accent.
- Sound + haptic fire exactly once on first render.
- For $0 vows, the receipt card and "TO" column are properly omitted.
- Reduce-motion: card appears static, sound + haptic still fire.

---

## D3 — Witness Draft Page (`/w/{token}` when status = 'draft')

**Trigger:** Witness opens link to a vow that hasn't been sealed yet. Per Step 1 P-13 and the pre-payment-share path, this is the friend who tapped the "Ask Joe now →" link before the maker paid.

**Layout family:** Same as screen 17 (Witness Accepted). Identical visual structure, conditional copy block.

**Phone background:** Default (NOT green — the vow isn't live yet).

**Top to bottom:**
1. StatusBar.
2. activeCenter padding `78 24 0`, text-align center.
3. **Pill** (instead of liveMark): "PENDING SEAL" — small, gold-tinged. Background `rgba(214,168,60,.10)`, color `goldBright`, font 800/12 0.06em uppercase. Distinct from the celebratory liveMark on 17 — this is a "not yet" marker, not a "you're in" marker.
4. Kicker (subdued): "JOSEPH WANTS YOU TO" — 800/11 0.24em, color `#817766`.
5. h1 centerTitle: "Witness this\n<em.gold>vow.</em>" — Fraunces 500/40/1.04. Em italic in gold.
6. centerSub: "Joseph hasn't sealed it yet. Once they do, you'll judge whether they kept it." — 600/17/1.36, `textMuted`, max-width 320.
7. **activeCard left-aligned** (gold border, padding 18, radius 22):
   - Kicker "THE VOW" 800/12.
   - Vow text Fraunces 600/22/1.18 italic. Full text shown.
   - metaGrid 3-col:
     - "STAKE" / "$50" gold (or "—" if $0).
     - "IF BROKEN" / "ALS Association" (or "—" if $0).
     - "VERDICT BY" / "Sunday".
   - For $0 vows: metaGrid 2-col with "VERDICT BY" and "VOW TYPE" / "Accountability only".
8. Sub-note (small, dim, below the card): "It still needs to be sealed before it starts. We'll let you know once Joseph locks it in." — 600/13/1.35, `textDim`, centered, max-width 300, margin-top 12.
9. **Bottom (`.bottom`):**
   - Primary CTA `.cta` (gold gradient): "I'll witness it".
   - quietLinks: "Pass on this" (decline path, opens decline sheet) / nothing else (no "skip" — they should make a decision).

**Interactions:**
- "I'll witness it" → if witness has no name/phone yet, opens a small "save reminder" sheet (modeled on existing web pattern at `accept-witness?action=save-reminder`):
  - "What's your name?" (single text field, optional but encouraged).
  - "What's your number? (so we can text you when verdict time comes)" — optional.
  - CTA: "Lock it in".
  - On submit → calls `accept-witness` with `action='accept'` + `name` + `phone`. Returns success → routes to D4 (post-acceptance for draft).
- "Pass on this" → small confirmation sheet "Are you sure? Joseph picked you for a reason." → if confirmed, `accept-witness` with `action='decline'`. Routes to a decline-success state (terminal).

**Data:**
- Read: `vows.refined_text`, `vows.stake_amount`, `vows.consequence`, `vows.destination`, `vows.ends_at`, `vows.witness_name`, plus `users.display_name` of the maker.
- Write: on accept — `vows.witness_accepted_at`, optionally `vows.witness_name`, `vows.witness_phone`, `vows.witness_user_id`.

**Backend:** `getVowByWitnessToken(token)` for read. `accept-witness` for write.

**Note on web vs native rendering:** Per Joey's call, 90%+ of witnesses see this on the web app — the native witness-side flow is a polish-not-critical path. This spec serves both the web `/w/{token}` page (which the web team can match) and any future native witness deep-link handler. Step 9 will produce one canonical spec for both.

**Acceptance criteria:**
- Full vow detail shown (text, stake, destination, deadline) — witness has enough info to make a real decision.
- "Pending seal" framing is unambiguous — witness understands the vow isn't live yet.
- Name/phone capture matches mobile-web behavior exactly.
- "Pass on this" requires confirmation (no accidental decline).

---

## D4 — Witness Draft-Accepted Confirmation

**Trigger:** Witness accepted a draft vow. Brief success state before showing the persistent "waiting for seal" view.

**Layout family:** Same as screen 17 (Witness Accepted), identical activeCenter structure.

**Phone background:** `.green` (consistent with screen 17 — the witness HAS committed; only the vow itself isn't live yet).

**Top to bottom:**
1. StatusBar.
2. activeCenter.
3. liveMark green ✓ 82×82 (smaller than D1's M-Kept variant — same as screen 17's).
4. Kicker "YOU'RE IN" — 800/12.
5. h1 centerTitle: "Joseph still needs to\n<em.green>seal it.</em>" — Fraunces 500/40.
6. centerSub: "We'll text you when the vow goes live. After that, your only job is the verdict." — 600/17.
7. activeCard left-aligned: kicker "THE VOW", vow text, metaGrid (same as D3).
8. **Bottom:**
   - Primary CTA `.cta.green`: "Got it, I'll wait".
   - quietLinks: "Make my own vow".

**Interactions:**
- "Got it, I'll wait" → witness lands on a persistent "waiting for seal" version of D3 (same screen, but with the pill changed to "ACCEPTED · WAITING FOR JOSEPH" and CTAs replaced by a single quietLink "I'll see you on verdict day").
- "Make my own vow" → P-15 viral path — opens app sign-up or web `/quick-vow`.

**State persistence:** This screen shows ONCE on acceptance. Subsequent visits to `/w/{token}` (while vow is still draft) show the persistent waiting state. After the maker seals, the page transitions to standard screen 18 (Witness Mid-Vow).

**Animation:**
- liveMark scale-in with green halo pulse (matches screen 17 exactly).
- Sound: subtle low confirmation tone (NOT one of the 3 emotional anchors — system-style; per Step 4 spec, no custom sound here).
- Haptic: `hapticPrimary` on render.

---

## D5 — Witness Already-Accepted (link reuse)

**Trigger:** A second person opens `/w/{token}` after another witness has already accepted.

**Layout family:** Single-card terminal state (similar to existing web witness-terminal). No cards, no metaGrid — just a centered message.

**Phone background:** Default.

**Top to bottom:**
1. StatusBar.
2. authWrap (centered, padding `92 28 0`).
3. Kicker (small, `textMuted`): "ALREADY TAKEN".
4. h1 authTitle: "Someone else has it." — Inter Tight 800/38/1.06. (Sans, not serif — operational tone, not ceremonial.)
5. authSub: "Joseph picked another witness for this one. You're free." — 500/18/1.35, `textMuted`, max-width 310.
6. **Bottom:**
   - Primary CTA: "Make your own vow" (routes to web `/quick-vow` or native if app installed — viral path).
   - quietLinks: "Done".

**Interactions:**
- CTA → viral path.
- "Done" → if web, close tab / dismiss. If native, exit to home.

**Data:** read `vows` row, check `witness_accepted_at IS NOT NULL` AND the calling user/device is not the original accepter (best-effort detection — could just check that the URL was already used).

---

## D6 — Witness Voided / Maker Bailed

**Trigger:** Witness opens `/w/{token}` for a vow that's status=`voided`. Either the maker explicitly canceled, or 24h cleanup voided an unsealed draft.

**Layout family:** Single-card terminal state.

**Phone background:** Default.

**Top to bottom:**
1. StatusBar.
2. authWrap.
3. Kicker: "VOW WITHDRAWN".
4. h1 authTitle: "Joseph called it off." (or "This vow timed out." if cleanup-voided.)
5. authSub:
   - Maker-voided variant: "They withdrew the vow. No money moved. No verdict needed."
   - Cleanup-voided variant: "The vow was never sealed. We voided it after 24 hours of inactivity."
6. **Bottom:**
   - Primary CTA: "Make your own vow".
   - quietLinks: "Done".

**Interactions:** Same as D5.

**Data:** read `vows.status='voided'`, optionally read audit_events for `vow_voided` event to determine variant (maker-voided vs cleanup).

---

## D7 — Witness Link Expired

**Trigger:** Witness opens `/w/{token}` past `witness_token_expires_at` (defaults to seal+30 days). New backend guards in `accept-witness` and `submit-verdict` enforce this.

**Layout family:** Single-card terminal.

**Top to bottom:**
1. StatusBar.
2. authWrap.
3. Kicker: "LINK EXPIRED".
4. h1: "This invite ran out." — Inter Tight 800/38.
5. authSub: "Witness invites expire after 30 days. If Joseph still needs you, ask them to send a fresh link."
6. **Bottom:**
   - Primary CTA: "Make your own vow".
   - quietLinks: "Done".

---

## D8 — Witness Superseded

**Trigger:** Witness opens `/w/{token}` where `vows.status='voided'` AND `vows.superseded_by_vow_id IS NOT NULL` (maker changed terms after sharing, the old token was voided in favor of a new vow).

**Layout family:** Single-card with a redirect affordance.

**Top to bottom:**
1. StatusBar.
2. authWrap.
3. Kicker: "VOW UPDATED".
4. h1: "Joseph rewrote it." — Inter Tight 800/38.
5. authSub: "They changed the terms. Here's the latest version:"
6. Mini activeCard (compact, padding 14): kicker "THE NEW VOW", vow text from the superseding vow, optional stake / deadline. Card is tappable.
7. **Bottom:**
   - Primary CTA: "See the new vow" → opens the superseder's witness page.
   - quietLinks: "Pass".

**Data:** read the old vow's `superseded_by_vow_id`, fetch the new vow's `witness_invite_token`, build the new URL.

---

## D9 — "Other" Custom Stake Input

**Trigger:** User taps the "Other" tile on screen 02. Mock 02 doesn't show the input.

**Layout family:** Bottom sheet (similar to 02b/02c structure).

**Phone background:** 02 dimmed underneath (`dimScreen`).

**Top to bottom:**
1. Sheet (full-width, padding `12 22 26`, radius `30 30 0 0`):
   - Grab handle 46×5.
   - h2: "Pick your stake." — Fraunces 600/35/1.06.
   - p: "Anything from $0 to $100." — 600/15, `textMuted`, max-width 320.
   - **Money input:** Centered, large. Renders as Fraunces 600/76 like the static `$50` on screen 02 — but is editable. Cursor blinking. Default value `$50` selected; user types to replace. Format: `$XX` with leading dollar sign, no decimals (cents not allowed for stakes).
   - Below input: small dim hint "Min $0. Max $100." — 600/13.
   - For $0 specifically: when user types `$0`, the cheeky-line below changes to "Word on the line, no money this time." (P-12 framing — making $0 feel like an intentional path, not a hack).
   - For amounts > $100: input shakes briefly (haptic error), max stays at $100, hint becomes red.
2. Bottom of sheet:
   - Primary `creamCta` (cream bg, like 02c "Done"): "Set the stake".
   - sheetQuiet: "Cancel".

**Interactions:**
- Tap money input → numeric keyboard up.
- Tap "Set the stake" with valid amount → updates underlying screen 02, dismisses sheet.
- Tap "Cancel" or grab handle drag → dismiss without changes.
- Type 0 → cheeky-line variant + still allows continue (this is the $0 path).

**Validation:** Client-side: 0 ≤ amount ≤ 100 (in dollars). Backend `save-card` enforces 1000–10000 cents (i.e., $10–$100) — but with $0 path enabled, `seal-vow` accepts `skip_payment: true` for $0 vows, and `save-card` is never called for $0. Step 5 sequencing handles the branch.

**Backend:** none from this sheet — local state only.

---

## D10 — Witnessless-At-Seal Checkpoint (P-11)

**Trigger:** User who tapped "Decide later" on screen 03 reaches the post-stake transition. Fires between stake (current screen 02 in the locked order) and payment (screen 05).

NOTE: Per Joey's lock, witness order stays at step 3, stake at step 2. The checkpoint fires *between* stake and auth/payment for users who deferred. Specifically: after tapping "Continue →" on screen 02 with `witness_decision='deferred'`, this checkpoint renders before screens 04 (auth) and 05 (payment).

**Layout family:** Full-screen page (NOT a sheet — this is a real decision point, not a quick prompt).

**Phone background:** Default.

**Top to bottom:**
1. StatusBar.
2. ChromeHeader: "← Back" / no step / hamburger. (No step number — this is interstitial.)
3. Eyebrow / Kicker (centered, gold): "ONE MORE THING".
4. h1 (Fraunces 500/40, centered): "Want someone\n<em.gold>holding you to this?</em>" — em italic gold.
5. Sub: "Vows work better with a witness. You can pick one now, or continue solo." — 600/17/1.36, `textMuted`, max-width 320, centered.
6. **Inline contact picker** (matches 03b style): occupies middle-bottom of the screen. Renders:
   - permissionCard "Choose from Contacts / Find your witness faster." with a gold sheetCta "Choose contact".
   - Recent contact rows (if any) — same `contactRow` pattern as 03b.
   - sheetQuiet "Share link instead" — fires the anonymous `prepare-judge-link` + share sheet flow (same as 07B).
7. **Bottom CTA area:**
   - There is NO primary CTA — primary action is "pick someone above OR continue solo below."
   - Single quietLink centered: "Continue solo →" — gold, italic, smaller. Tapping fires the Go-Solo Confirmation Sheet (D11).

**Interactions:**
- Pick a contact → `witness_decision='selected'`, `witness_name` + `witness_phone` set in flow state, advances to screen 04 (auth).
- Tap "Share link instead" → fires anonymous-share path (P-10 logic), then advances to 04.
- Tap "Continue solo →" → opens Go-Solo Confirmation Sheet (D11). If user confirms solo, `witness_decision='solo'`, `witness_name = 'Just me'` set, advances to 04. If user cancels, returns to checkpoint.

**Data:** updates flow state per interaction.

**Backend:** anonymous `prepare-judge-link` if share-path chosen.

**Acceptance criteria:**
- Inline contact picker is functional, NOT a button that opens a sheet (P-11 inline vs. route-back decision).
- "Continue solo →" requires the confirmation sheet (D11) — one-tap solo not allowed.
- No progress bar (this is interstitial, not part of the 5-step count).

---

## D11 — Go-Solo Confirmation Sheet (P-9)

**Trigger:** User taps "Continue solo →" on D10.

**Layout family:** Bottom sheet, same style as 02b/02c (NOT full-screen — this is a quick gate, not a destination).

**Phone background:** D10 dimmed underneath.

**Top to bottom:**
1. Sheet (`.sheet`, full-width, padding `12 22 26`):
   - Grab handle.
   - h2: "Vows work better\nwith a witness." — Fraunces 600/30/1.08.
   - p: "A witness makes the verdict harder to dodge. You can still seal this one solo." — 600/15/1.35, `textMuted`, max-width 320.
   - Bottom of sheet:
     - Primary `.sheetCta` (gold gradient, full-width): "Add a witness".
     - `.sheetQuiet` (full-width, dim): "Go solo anyway".

**Interactions:**
- "Add a witness" → dismiss sheet, return to D10 (so user picks a contact).
- "Go solo anyway" → dismiss sheet, set `witness_decision='solo'`, `witness_name='Just me'`, advance to screen 04 (auth).

**Data:** updates `witness_decision` and `witness_name`.

---

## D12 — Country Code Picker (screen 04 supplement)

**Trigger:** User taps the country flag/code on screen 04's phoneInput.

**Layout family:** Full-screen modal (iOS `.fullScreen` presentation).

**Phone background:** Default.

**Top to bottom:**
1. StatusBar.
2. Modal header (chrome): "Cancel" left, "Pick country" centered (Inter Tight 800/15), invisible spacer right.
3. Search field (1px border, 16 radius, padding `0 14`, height 44): "Search country" placeholder.
4. List of countries (scrollable):
   - Each row: 56 high, padding `0 22`, gap 14, layout `[flag emoji] [country name flex] [+code muted]`.
   - Flag emoji 28px.
   - Country name `text` 600/16.
   - Code `textMuted` 600/15.
   - Tappable.
5. List sorted alphabetically. Top: most-likely countries (US, CA, UK, AU, MX) shown above a divider in a "Common" section.

**Interactions:**
- Type in search → filter list.
- Tap row → updates underlying screen 04 phoneInput country, dismisses modal.
- Tap "Cancel" → dismiss without changes.

**Data:** static country list (json file `expo/data/countries.json`).

**Source:** Use `react-native-country-picker-modal` or build internally — both viable. Step 9 specs which.

---

## D13 — Returning-User Sign-In (P-7)

**Trigger:** User taps "SIGN IN" link on screen 01 AND has no active session.

**Layout family:** Variant of 04/04b — phone OTP, but compact (no dots progress, no name capture step since returning users have a name).

**Top to bottom:**
1. StatusBar.
2. authWrap.
3. Back link "← Back" (returns to 01).
4. h1 authTitle: "Welcome back." — Inter Tight 800/38.
5. authSub: "Enter your number to sign in." — 500/18, `textMuted`, max-width 310.
6. NO dots progress (this is a single-step or two-step inline flow, not the 3-step new-user auth).
7. phoneInput (same as screen 04).
8. fieldNote: "We'll text the code." — 600/14, `#7f7667`.
9. **Bottom CTA:** "Text me the code".

**Sub-step 2 (after CTA):**
- Replace phoneInput + fieldNote with codeInput (same as 04b).
- Replace fieldNote with "Sent to ••• ••• 5309. Resend in 38s."
- CTA becomes "Verify →" (disabled until 6 digits).

**On verify success:**
- Authed user with existing record → routes to dashboard (screen 13).
- Authed user with NO existing `users.display_name` → routes to a one-screen name capture (similar to 04c) before dashboard. Edge case — should be rare since name was captured at original sign-up.

**Backend:** `supabase.auth.signInWithOtp({ phone })` then `verifyOtp`.

---

## D14 — Dashboard Empty State (formal entry of P-6)

NOT a separate screen — this is a state variant of screen 13. Specced here for completeness.

**Trigger:** `getMyVows()`, `getWitnessingVows()`, AND `getIncomingChallenges()` all return empty.

**Layout (replaces the populated dashboard content):**
1. StatusBar.
2. Head row: hamburger / wordmark / avatar (same as populated 13).
3. h1 dashTitle: "Hey, [Name]." — Inter Tight 800/36.
4. dashSub (variant): "No vows on the line." — 600/15, `textMuted`.
5. **Empty state card** (single, centered vertically in remaining space):
   - 1px dim border, 22 radius, bg `rgba(244,234,216,.025)`, padding 28, text-align center.
   - Small dim icon (e.g., a wax-seal outline, gold-tinged at 0.4 opacity), 56×56.
   - Body text Fraunces 500/20/1.18 italic: "Sealed commitments will show up here."
   - Sub-body 600/14, `textMuted`: "Make your first vow to begin."
6. **Footer CTA:** "Make your first vow →" (NOT "Make a vow" — first-vow-specific copy per WEB_TO_NATIVE_COPY_MATRIX).
7. NO rolePills, NO needCard, NO sectionHead, NO moduleRow.

**Edge case:** if user has 0 of their own vows but IS judging or has dares, show populated layout but with empty "Your vows" section displaying inline copy: "No vows yet — make one or accept a dare."

---

## D15 — Network/Connectivity Error State

**Trigger:** Any network-dependent action fails (edge function call, vow fetch, auth verify, etc.) due to connectivity, NOT due to backend rejection.

**Pattern:** Inline toast + retry, NOT a full-screen takeover. Full-screen takeovers are only for catastrophic failures (D16).

**Toast:** Bottom-anchored sheet, 64 high, padding `12 18`, bg `rgba(56,25,18,.92)` (dark red-tinted), 1px border `rgba(214,77,44,.32)`, radius 16. Icon (small alert ⚠) + text "No connection. Tap to retry." 600/14 + chevron right.

**Behavior:**
- Toast slides up from bottom over 240ms.
- Auto-dismisses after 6 seconds, OR user taps to retry the failed operation.
- Only one toast at a time — subsequent failures replace the existing one.
- Reduce-motion: appears static, no slide.

**Universal:** This pattern applies to every network-dependent screen. Step 9 references this spec rather than restating per-screen.

---

## D16 — Generic Failure / Try Again (catastrophic)

**Trigger:** A flow-blocking failure where retry isn't sufficient (e.g., Stripe SetupIntent creation fails 3x, vow status corrupt and unrecoverable, edge function returns 500 repeatedly).

**Layout family:** Full-screen (rare — most failures should be toasts).

**Top to bottom:**
1. StatusBar.
2. authWrap.
3. Kicker (red-tinged): "SOMETHING'S OFF".
4. h1 authTitle: "We can't finish this right now." — Inter Tight 800/38.
5. authSub: "We're looking into it. Try again in a minute, or come back later." — 500/18.
6. **Bottom:**
   - Primary CTA: "Try again".
   - quietLinks: "Back to dashboard" / "Contact support".

**Interactions:**
- "Try again" → re-runs the failed flow.
- "Contact support" → opens email composer with pre-filled diagnostics (vow_id if applicable, error code, build version).

**Where it appears:** Probably never in normal use. This is a fallback for unrecoverable states.

---

## D17 — Push Permission Prompt

**Trigger:** Per `FINAL_RAVE_WORTHY_AUDIT.md` and `STEP_2_BACKEND_MAP`, push permission is requested AFTER seal (screen 06 → 07 transition). Not on first launch.

**Layout family:** Native iOS permission alert is the actual prompt. We control the *pre-prompt* — a soft sell card that appears just before iOS asks.

**Pre-prompt screen:** Inserted between screen 06 (Sealed Moment) and screen 07 (Send Witness Invite), but only on FIRST seal for the user (gated by `users.first_seal_completed_at IS NULL`).

**Top to bottom:**
1. StatusBar.
2. activeCenter padding `78 24 0`, text-align center.
3. Small icon: a bell glyph or notification icon, gold, 56×56, halo glow.
4. Kicker: "QUICK THING".
5. h1 centerTitle: "Want updates\non your <em.gold>vow?</em>" — Fraunces 500/40.
6. centerSub: "We'll text Joe and notify you when they accept, when verdict day comes, and that's it. No noise." — 600/17/1.36, max-width 300.
7. **Bottom:**
   - Primary CTA `.cta`: "Sure, notify me".
   - quietLinks: "Maybe later".

**Interactions:**
- "Sure, notify me" → triggers iOS native push permission prompt (`Notifications.requestPermissionsAsync()` in expo). On grant → register token, advance to 07. On deny → record decision, advance to 07.
- "Maybe later" → skip without prompting iOS, advance to 07. User can re-trigger from settings later.

**Why pre-prompt:** Native iOS prompts are one-shot. If user denies, you can't ask again — they have to go to settings. So we soft-sell first, only triggering the native prompt if the user is already inclined to grant.

**Data:** writes `users.first_seal_completed_at` after this screen (so it never shows again).

---

## D18 — Witness Verdict Submitted Success + "Your Turn?" Viral CTA (P-15)

**Trigger:** Witness submits a verdict (kept or broken) on screen 20. After successful `submit-verdict`, this success screen renders.

**Layout family:** activeCenter (centered hero).

**Phone background:** Reflects the verdict — `.green` for kept, `.blue` for broken (NOT red — same brand discipline as M-Broken).

**Top to bottom:**
1. StatusBar.
2. activeCenter padding `78 24 0`, text-align center.
3. liveMark or pill (state-dependent):
   - Kept: green liveMark ✓ 82×82.
   - Broken: blue pill "VERDICT DELIVERED", no liveMark.
4. Kicker: "VERDICT IN".
5. h1 centerTitle:
   - Kept variant: "You held them\n<em.green>to it.</em>"
   - Broken variant: "You called it.\n<em.blue>Honestly.</em>"
6. centerSub:
   - Kept: "Joseph kept their word. We'll let them know."
   - Broken: "$50 is going to ALS Association. The promise was real, even if the result wasn't."
7. **Viral card (gold-tinted, P-15):**
   - 1px gold border, 22 radius, padding 18, margin-top 28.
   - Kicker (gold): "YOUR TURN?"
   - Body Fraunces 500/22/1.2 italic: "What would you commit to, with someone watching?"
   - Sub-body 600/14, `textMuted`: "You held Joseph honest. See what your own promise feels like."
   - Inline CTA (gold gradient pill, NOT full-width): "Make your own vow →".
8. **Bottom:**
   - Primary CTA (lower priority — this is the "done" path): "Done" (default style, NOT gold gradient).
   - No quietLinks.

**Interactions:**
- "Make your own vow →" (inside viral card) → routes to:
  - On native (witness has app): screen 01 (or quick-vow if returning user).
  - On web: routes to web `/quick-vow`.
- "Done" → returns witness to home (judging dashboard 14 if authed, or simple "thank you, you're done" terminal page if not).

**Data:** read submitted verdict from `vows.verdict`, `submit-verdict` response.

**Why this works:** witness is in a peak emotional state (just judged a friend) and the friction to make their own vow is at a minimum. P-15 free virality.

**Acceptance criteria:**
- Viral CTA is visible but not aggressive (inside a card, not as the primary bottom CTA).
- Copy matches state (kept variant vs broken variant).
- "Make your own vow →" works on both native and web (routing handled by client).

---

## D19 — Settings (lite v1)

**Trigger:** User taps Settings from menu 13B.

**Scope:** v1 settings. Minimal — sign-out, delete-account, push notification toggle. Step 9 will fold this into a phase between Phase 6 and Phase 7 per Joey's #11 decision.

**Layout family:** detailSafe with chrome header.

**Top to bottom:**
1. StatusBar.
2. detailSafe.
3. ChromeHeader: "← Dashboard" / "Settings" / hamburger.
4. **Profile section:**
   - sectionHead "PROFILE" 800/12 0.28em gold.
   - Row: avatar + name + edit-name affordance (chevron).
   - Row: phone number (read-only, dim). Subtitle: "Used for sign-in and SMS notifications."
5. **Preferences section:**
   - sectionHead "NOTIFICATIONS".
   - Row: "Push notifications" + toggle. (State pulled from `users.last_push_receipt_ok_at` and OS permission.)
   - Row: "SMS notifications" + toggle. (Bound to `users.sms_only_preference`.)
6. **Account section:**
   - sectionHead "ACCOUNT".
   - Row: "Sign out" + chevron. Tap → confirmation sheet → `supabase.auth.signOut()` → routes to screen 01 unauthed state.
   - Row: "Delete account" (destructive, color `danger`) + chevron. Tap → confirmation sheet with stronger copy → calls `delete-account` edge function.
7. **Footer:**
   - Small dim text: "Build [version] · [build number]" — for support diagnostics.
   - tinyLinks: "Terms" / "Privacy" / "Contact".

**Interactions:** standard for each row.

**Backend:** `delete-account` edge function for destructive path. `supabase.auth.signOut()` for sign-out. `users` table updates for preferences.

**Acceptance criteria:**
- Sign-out is reversible (user can sign back in via D13).
- Delete account is irreversible — confirmation sheet must spell this out clearly. Copy: "This will delete all your vows, history, and account. You can't undo this."

---

## D20 — History (lite v1)

**Trigger:** User taps History from menu 13B (or from a "see all" link on dashboard).

**Layout family:** safe + scroll, similar to 14 but without role pills.

**Top to bottom:**
1. StatusBar.
2. safe + scroll.
3. ChromeHeader: "← Dashboard" / "History" / hamburger.
4. h1 dashTitle: "Your record." — Inter Tight 800/36.
5. dashSub: "Every vow, kept or broken." — 600/15, `textMuted`.
6. **Filter bar** (optional, stretch goal): tabBar with "All" / "Kept" / "Broken" / "Voided".
7. **vowCard list** (terminal-state vows): each card 14 padding, 18 radius, 3px left border colored per outcome (green=kept, blue=broken, dim=voided). Compact metaGrid: status + date + stake + witness.
8. **Empty state:** if no terminal vows, show single line "You haven't completed any vows yet." centered with a "Make your first vow" CTA.

**Interactions:**
- Tap card → opens M-Kept / M-Broken / Voided detail (D1, D2, or a voided variant of D2 — TBD).

**Data:** `getRecentVows()` from vow-api.ts (already exists).

---

## D21 — Maker Public Outcome (`/outcome/{vowId}`)

**Note:** This route already exists in the web app (`web/src/app/outcome/[vowId]/`). Native does NOT need its own implementation in v1 — when user taps "Share what you did" on D1 or "See the receipt" on D2, the native share sheet shares the URL, and the recipient opens it on web.

**Step 3 deliberately punts:** Native's role is to share the URL. Web renders the page. No native screen here.

If/when we add native rendering of public outcomes (post-v1), Step 3 will be supplemented. For now: not in scope.

---

## D22 — Certificate (`/certificate/{vowId}`)

**Same call as D21:** already in web at `web/src/app/certificate/[vowId]/`. Native shares the URL, web renders. No native screen in v1.

If you tap "Share certificate" from any vow, native opens the share sheet with the certificate URL.

---

## Summary — derived screens count

| ID | Name | Phase placement | Has design? |
|---|---|---|---|
| D1 | Maker Vow Kept | 8 (with witness side) | YES |
| D2 | Maker Vow Broken | 8 (with witness side) | YES |
| D3 | Witness Draft Page | 8 (witness side, web-primary, native-secondary) | YES |
| D4 | Witness Draft-Accepted | 8 | YES |
| D5 | Witness Already-Accepted | 8 (terminal) | YES |
| D6 | Witness Voided | 8 (terminal) | YES |
| D7 | Witness Link Expired | 8 (terminal) | YES |
| D8 | Witness Superseded | 8 (terminal) | YES |
| D9 | "Other" Custom Stake Input | 1 (creation) | YES |
| D10 | Witnessless-At-Seal Checkpoint | 1 (creation, post-stake) | YES |
| D11 | Go-Solo Confirmation Sheet | 1 (creation) | YES |
| D12 | Country Code Picker | 2 (auth) | YES |
| D13 | Returning-User Sign-In | (cross-cut, used from screen 01) | YES |
| D14 | Dashboard Empty State | 6 (dashboard) | YES (state of 13) |
| D15 | Network/Connectivity Error | (universal pattern) | YES |
| D16 | Catastrophic Failure | (universal fallback) | YES |
| D17 | Push Permission Pre-Prompt | 4 (post-seal, gated by first-seal flag) | YES |
| D18 | Witness Verdict Submitted Success + Viral CTA | 8 | YES |
| D19 | Settings (lite v1) | 6.5 (mini-phase) | YES |
| D20 | History (lite v1) | 6.5 (mini-phase) | YES |
| D21 | Public Outcome | n/a — web renders | PUNTED |
| D22 | Certificate | n/a — web renders | PUNTED |

20 derived screens designed; 2 punted to web. 

Each screen has enough specification that Step 9 build specs can be generated without further design work. Token names, layout families, copy, interactions, backend touchpoints, and acceptance criteria are all locked.

---

End of Step 3.
