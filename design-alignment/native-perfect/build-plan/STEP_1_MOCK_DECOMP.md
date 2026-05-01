# STEP 1 — Mock Decomposition

> **Read order:** This document begins with the Patches block (decisions taken after the Step 1 audit). Treat the patches as overrides on the per-screen specs that follow. When the original screen text and a patch disagree, the patch wins.

---

## Step 1 Patches (post-audit, 2026-04-30)

These seven patches resolve gaps surfaced by the audit at `STEP_1_AUDIT.md`. They are decisions, not deferrals — the build agent treats them as locked.

### P-1. Decision tree for 07 / 07B / 08 / 08B / 08C

The post-seal share-and-wait surface fans out by witness identity and SMS-attempt history. State inputs:

- `witness_phone` (DB column on `vows`).
- `witness_name` (DB column).
- `witness_accepted_at` (DB column; non-null = accepted).
- `witness_declined` (DB column).
- `sms_open_attempted` (client AsyncStorage flag, scoped to `vow_id`; see P-5).

Decision matrix:

| witness_name | witness_phone | accepted_at | sms_open_attempted | → Screen | Notes |
|---|---|---|---|---|---|
| set | set | null | false | **07** | Initial post-seal, named witness with phone. CTA opens iMessage. |
| set | set | null | true | **08B** | User returned from iMessage. Show "Waiting on Joe." |
| set | null | null | false | **08C** | User picked a name only (no phone). Share-link entry point. |
| set | null | null | true | **08C** | Same — `sms_open_attempted` is meaningless without phone. |
| null | null | null | false | **07B** | "Go solo" or "Share link" path; no witness identity. CTA opens share sheet. |
| null | null | null | true | **08C** | After share sheet dismissed. |
| any | any | not null | any | **09** then **10** | Witness has accepted; transition celebration → mid-vow detail. |
| any | any | null | any (witness_declined=true) | **declined-handler** | (uncovered; goes to Step 3 — likely surfaces a "they declined" notice + CTA to pick another witness or go solo). |

Rules:
- 08 (the "Invite sent" detail page) shown only when entering from the dashboard, never on first transition out of seal — the seal moment hands off directly to 07 / 07B.
- 08, 08B, 08C all share the same route (`/native-perfect/vow/{id}`); the screen renders by reading the matrix above on every render.
- Any deep link to a vow in `sealed` status with no acceptance lands on the matrix-resolved screen.

### P-2. Draft vow creation timing

The vow row is created in DB at the **end of screen 03c (Witness Selected) or on tap of "Share link" / "Go solo" from screen 03 (Choose Witness)** — whichever happens first. Rationale: that's the first moment the system needs a real `witness_invite_token` for share intent, and committing the vow earlier than auth would risk RLS issues.

Specifically:
- Screens 01 → 02 → 02b → 02c → 03 → 03b are all client-side memory. No DB writes.
- On 03c "Continue →", or on 03 "Share link", or on 03 "Go solo": the client calls `createVow()` from `expo/lib/vow-api.ts`, which inserts a `vows` row with `status: 'draft'` and a generated `witness_invite_token`. The returned `vow.id` is held in flow state.
- 04/04b/04c run after this — auth happens with a draft vow already in place. (Note: `createVow` currently requires an authed session; see Step 2 backend mapping for the resolution. Provisional fix: defer `createVow` until after 04c, OR allow anon draft creation via a service-role edge function. Step 2 will pick.)
- 05 / 05b — Stripe SetupIntent attaches to the existing draft `vows.id`.
- 06 — `seal-vow` edge function flips `status` to `sealed`.
- Backing out of any post-creation screen does NOT delete the draft. A draft vow that's never sealed gets garbage-collected by `cron-runner` after 24h (existing pattern; verify in Step 2).
- Backing out of pre-creation screens (01–03) is purely local-state revert.

This means 03b's "Choose contact" populates client memory; the vow creation that follows on 03c picks up `witness_phone` from that memory.

### P-3. Screen 06 — User taps to advance

Screen 06 (Sealed Moment) does **not** auto-advance. After the seal animation completes (~1800ms), a tap-anywhere-to-continue affordance fades in with branch-specific microcopy: "Tell Joe" for a named witness, "Share the link" when no named witness exists. User taps to advance to 07 / 07B / 08C per matrix above. Rationale: this is the emotional climax; auto-advance steals the user's chance to feel it. Step 4 motion spec will lock the exact timing of the tap affordance reveal.

This means the bottom-area on 06 has no `.bottom .cta` block — instead a small tap-to-continue affordance appears post-animation. Step 4 will spec the visual.

### P-4. Maker outcome screens — stub entries (full design in Step 3)

Step 1 acknowledges these screens exist and locks copy + intent. Visual design is Step 3 because there's no mock. Two screens:

**Screen M-Kept (Maker — Vow Kept).** Triggered when the witness submits "kept" (or self-resolve = kept).
- Phone background: `.green` (matches witness-accepted aesthetic).
- Layout family: `activeCenter` like screens 09 / 17, with a green liveMark glyph (✓ or a wax-seal-style "kept" stamp).
- Headline copy: "KEPT" kicker, then h1 "You actually did it." with the operative verb in green italic. Sub copy: "Crisis averted. Your $X stays yours."
- Card: `activeCard` left-aligned with kicker "THE VOW YOU KEPT", vow text italic, metaGrid: STAKE (was on the line) / WITNESS (who called it) / KEPT ON (date).
- Bottom CTA `.cta.green`: "Make another vow". QuietLinks: "Share what you did" / "Done".
- Haptic: `hapticVerdictKept` on screen present.

**Screen M-Broken (Maker — Vow Broken).** Triggered when the witness submits "broken" (or self-resolve = broken).
- Phone background: `.blue` (matches verdict-due aesthetic, never red — red would feel punitive in a way that's off-brand for this product).
- Layout family: `detailSafe` with chrome header.
- Pill: "BROKEN" in subdued color (`textMuted`-on-dim-bg, NOT a celebratory pill).
- Headline copy: "BROKEN" kicker, then h1 "Brutal." with em italic "You broke it." Sub copy: "$X is on its way to ALS Association. The promise was real."
- Card: `activeCard` with kicker "THE VOW YOU BROKE", vow text italic, metaGrid: CHARGED $X (gold) / DESTINATION (where it went) / BROKEN ON (date).
- Bottom CTA: "Make a new vow" (default gold). QuietLinks: "See the receipt" / "Done".
- Haptic: `hapticVerdictBroken` on screen present.

Both screens reuse existing mock components (sealMark/liveMark, activeCard, metaGrid, pill, ChromeHeader). Step 3 produces the layout spec; Step 9 produces the per-screen build spec.

Copy parity check: matches the WEB_TO_NATIVE_COPY_MATRIX entries for outcomes (`KEPT / You actually did it. / Crisis averted.` and `BROKEN / You broke it. / Brutal. You broke it.`).

### P-5. 08 vs 08B detection

Use a **client-side AsyncStorage flag**: `sms_open_attempted:{vow_id}`. Set to `true` when the user taps "Text Joe the invite" on 07 (i.e., the moment we call `Linking.openURL('sms:...')` or `expo-sms` `composeAsync`). Read on every mount of the post-seal detail surface to pick between 08 and 08B per the P-1 matrix.

Why client-side: there's no reliable server signal for "user actually opened the SMS app" — the iOS share/SMS sheet doesn't report back. We could log a server-side intent on tap, but the truth is local to the device anyway. Server-side `audit_events` already records `witness_invited` (the SMS being queued); this client flag is specifically about "the user pressed the button to engage iMessage."

Lifecycle:
- Set on tap of "Text Joe the invite" CTA on 07.
- Cleared when `witness_accepted_at` becomes non-null (i.e., we transition to 09).
- Cleared when the vow transitions to any terminal state (kept, broken, voided).
- Persists across app restarts and across multiple devices for the same user — no, not really; AsyncStorage is device-local. If the user opens on a second device, they'll see 07 again (which is fine — the share opportunity is always there).

### P-6. Dashboard empty state — inline state in screen 13

Screen 13 has two states, both spec'd as one screen:

- **Populated state** (current 13 spec): Hey-greeting, role pills, needCard if applicable, sectionHead "YOUR VOWS", vowCards, moduleRow, footer CTA.
- **Empty state** (first-time user, no vows ever made): Same head + greeting "Hey, [Name]." but `dashSub` is "No vows on the line." Below: a single empty-state card (centered, dim) with copy "Sealed commitments will show up here." and the only CTA is the bottom footer "Make your first vow →" (note: copy differs from populated — "first" instead of "a"). No role pills, no needCard, no sections, no moduleRow.

Detection: `getMyVows() returns [] && getWitnessingVows() returns [] && getIncomingChallenges() returns []`. If only `getMyVows()` is empty but the user is judging or has dares, show populated layout with empty "Your vows" section showing "No vows yet — make one or accept a dare." inline.

Step 9's screen-13 spec will have explicit subsections for both states.

### P-7. "SIGN IN" link on screen 01

Tapping "SIGN IN" on 01 routes:
- If user has an active session → `/native-perfect/dashboard` (screen 13). Skip the entire creation flow.
- If user has no session → a derived sign-in screen (Step 3) consisting of phone input + OTP, mirroring 04/04b/04c structure but without the dots progress and without the "name if missing" step (returning users have a name). After successful auth → `/native-perfect/dashboard`.

Rationale: the link is mislabeled if it's purely a sign-in form. For a returning authed user it's "take me home." For a returning-but-signed-out user it's "let me sign back in." Both end at the dashboard.

This makes 01 the natural first-time-only entry — every returning user (authed or not) gets routed back to their dashboard via this link, and the creation flow becomes opt-in.

---

## Original Step 1 specs follow.

Source: `design-alignment/native-perfect/project-perfect-final-build-mocks.html`
Phone canvas: 393 × 852 (iPhone 15 Pro logical).
Status bar: y=0 to y=50, padded `16/28/0`. Time on left, signal+battery on right. White text, weight 800, 18px on left, 15px battery, 13px signal bars (3/3 strength). Status bar is part of the design, but in native it'll be the real iOS status bar.

Token reconciliation note (per Step 0 confirmation):
- Mock CSS `--gold:#d6a83c` ≠ existing `uvColors.gold:#C89B3C`. Tokens will move toward mock values. Mock golds are slightly warmer.
- Mock CSS `--goldHi:#edc465` ≠ existing `uvColors.goldBright:#E8B656`.
- Mock CSS `--text:#f4ead8` vs existing `uvColors.text:#F0E9DB` — close, mock slightly warmer.
- Mock CSS `--green:#52d69a` vs existing `uvColors.success:#4ADE80` — different. Mock is more cyan-leaning.
- Mock CSS `--blue:#79a8ff` vs existing `uvColors.info:#60A5FA` — different.
- Mock CSS `--orange:#f59a3d` vs existing `uvColors.warn:#FB923C` — different.
- Mock CSS `--red:#ef6b5f` vs existing `uvColors.danger:#F87171` — different.
Action: token sweep is a Phase 0 task; Step 9 specs reference token NAMES not hex.

---

## Global components (extracted from mocks)

**StatusBar** — System iOS status bar at iPhone 15 Pro size. Mocks render a faux one for layout reference.

**StepHeader (Top)** — Used on screens 01, 02, 02b, 02c, 05, 05b, 16B. Three-column grid `58px 1fr 72px`:
- Col 1: step text "1 / 5", color `textMuted`, font 800/16/var(--sans), letter-spacing 0.08em.
- Col 2: progress bar, height 4, radius 99, bg `rgba(244,234,216,.08)`, fill `gold` solid. Width % matches step.
- Col 3: SIGN IN link or empty, 800/12, letter-spacing 0.26em.

**ChromeHeader (head)** — Used on 02–03c, 05–05b, 08, 08B, 08C, 10, 11, 12, 13, 13B, 14, 15, 16B, 18, 19, 20. Three-column `auto 1fr auto`. Left: back arrow + label "← Back" or "← Dashboard" or "← Judging" — 700/15, color `textMuted`, min-height 44. Center: optional step text or wordmark or empty. Right: hamburger ≡ in 44×44 circle, 1px border `rgba(244,234,216,.1)`.

**Brand wordmark (tinybrand)** — Centered on 01: "Unbreakable Vow", color `textDim`, font 800/10, letter-spacing 0.34em, uppercase, margin-top -14, margin-bottom 22.

**qvBrand** — Used on 16/16B as compact wordmark: 22×22 rotated diamond mark with 6×6 inner square, both gold. Text "Unbreakable Vow" with "Vow" italic in gold serif 500/15.

**Bottom CTA bar (.bottom)** — Absolutely positioned `left:22 right:22 bottom:30`. The primary CTA `.cta` is 62 high, radius 24, gradient `linear-gradient(180deg, #f1cf7a, #c2912d)`, text 800/20 `#151006`, drop-shadow `0 18px 46px rgba(201,148,42,.22)`. There's a `.cta.green` variant on screens 09/10/17/18 with a green gradient.

**quietLinks** — Inline secondary actions under the CTA: 800/13, color `#8f8573`, gap 12, each with min-height 44 hitarea.

**Sheet (presented modal)** — Used on 02b, 02c, 03b. Bottom sheet, full-width up to phone edges. Border radius `30 30 0 0`, gradient `#211b15 → #15110d`, 1px border `rgba(244,234,216,.12)`, padding `12 22 26`. Has a 46×5 grab handle. h2 inside is Fraunces 600/35.

**Native sheet (.nativeSheet)** — On 05b, simulating Stripe/Apple Pay PaymentSheet. Cream `#f4f4f2`, rounded 30, contains a Pay logo, Cancel link, merchant block, key/value rows, explanation, and a "Double-click to confirm" black button — but in real native, this is the actual Stripe React Native PaymentSheet. Mock 05b is reference; we don't render this ourselves.

**dimScreen overlay** — When a sheet presents, the rest of the screen darkens with `rgba(0,0,0,.34)` overlay. In native this is the standard modal presentation.

**decisionCard** — Bordered card with 18px padding, 22 radius, gold-tinged border `rgba(214,168,60,.34)`, bg `rgba(27,22,15,.82)`, inset shadow. Contains kicker + serif vow text + metaGrid. Used on 03, 03c, 05, 05b.

**activeCard** — Same structure as decisionCard but with stronger gold accents. Used on 09, 10, 11, 12, 17, 18, 19, 20.

**countCard** — Sub-variant of activeCard, used for countdown displays. Bigger gold number `countBig` 800/44, sub-text, 6px meter.

**vowCard** (dashboard) — Used on 13, 15. Different structure: 14px padding, 18 radius, 3px left-border in `gold`/`orange`/`blue` depending on state. Top row has pill + time. Body has italic serif vow text. Bottom meta row has columns.

**needCard** — Pulsing alert card on 13, 13B. Orange left-border 3px, orange gradient bg, 14 padding, has pulse dot, label, title, body, mini CTA.

**rowCard** (judging) — Used on 14. 14 padding, 17 radius, 39×39 avatar, body with row top (name + status pill), italic serif vow text 16, meta row with urgent timestamp + stake.

**rowPill / pill** — Inline status badges. Variants:
- Default `.pill`: bg `rgba(245,154,61,.12)`, color `orange`, text 800/12, letter-spacing 0.06em, uppercase.
- `.pill.live`: bg `rgba(82,214,154,.13)`, color `green`.
- `.pill.blue`: bg `rgba(121,168,255,.12)`, color `blue`.
- `.pill.green`: bg `rgba(82,214,154,.13)`, color `green`.
- `.rowPill`: smaller variant, padding `4 8`, font 800/9, letter-spacing 0.14em.

**Phone background variants:**
- Default: `radial(82% -8%, gold @ 16% → transparent 34%) + linear(180deg, #17130f → #0f0d0a → #080706)`.
- `.green`: green-tinted radial, dark gradient.
- `.gold`: stronger gold radial.
- `.blue`: blue-tinted radial.

---

## Per-screen specs

### 01 — Vow Only, Quiet Start Chips

**Route (proposed):** `/native-perfect/create` step 1, or replaces current `/quick-vow` flow start.
**Mock element:** `<div class="shot">` index 1.
**Status:** First step of multi-step Smart Split creation.

**Layout (top→bottom):**
1. StatusBar.
2. StepHeader: step "1 / 5", progress 20%, "SIGN IN" link.
3. Brand tinybrand "Unbreakable Vow".
4. h1 hero: `Make a vow.\n<em.gold>Mean it.</em>` — Fraunces 600/61/0.98.
5. Body copy `.copy`: "**Flake and lose it all.** Stake real cash on your word. Your friend judges. No mercy." — Inter Tight 600/15/1.38, color `#b4aa98`, max-width 349, strong → `text` color, weight 850.
6. Vow input card `.input`: min-height 128, 1.3px border `rgba(244,234,216,.3)`, radius 22, bg `rgba(24,21,18,.82)`, padding `21 18`. Inside: kicker "I VOW TO" 800/12 letter-spacing 0.34em uppercase, color `#817766`. Below: placeholder Fraunces italic 520/27/1.12, color `rgba(185,174,154,.58)`. Tappable to focus and bring up keyboard.
7. Section divider `.or`: "Or Start Here" — 800/12, letter-spacing 0.34em, uppercase, color `#817766`. Margin `28 0 12`.
8. Chip viewport: horizontal scroll of suggestion chips. Right edge has a fade gradient overlay and a chevron arrow indicator showing more content. Chips: pill, min-height 42, padding 0/15, 1px border, font 600/15. Default dim, no `.on` state in this view.
9. Bottom CTA: "Next →".

**Sample chips:** Gym 3x this week, No alcohol 2 weeks, Delete TikTok, 10k steps, Call mom weekly.

**Interactions:**
- Tap input → focus, keyboard up, placeholder fades out.
- Tap chip → fills the input with that text, scrolls back to start.
- Tap "Next →" with non-empty input → next screen (02 Stake).
- Tap "SIGN IN" → returning-user sign-in flow (uncovered, derive in Step 3).

**States:** empty (current), filled (text shown), focused (keyboard up). CTA disabled when input empty.

**Data:** local form state — `rawInput`. Nothing persisted yet.

**Backend:** none.

**Native primitives needed:** new `BrandWordmark` (tinybrand variant), `StepProgressHeader`, `VowInputCard` (the kicker + placeholder textarea), `SuggestionChipScroll`, `GoldCTA` (exists).

**Haptics:** `hapticSelection` on chip tap; `hapticPrimary` on Next.

**Animation:** chips horizontal scroll with momentum + bounce; tapped chip flashes briefly before populating input.

---

### 02 — Stake First, Selectable Verdict

**Route:** `/native-perfect/create` step 2.
**Mock element:** shot index 2.

**Layout:**
1. StatusBar.
2. ChromeHeader: ← Back / 2 / 5 / ≡.
3. Progress bar 40% standalone (without step text — step is in head's center).
4. h1 `.h2`: `Set the <em.gold>stake.</em>` — Fraunces 600/47/1.03, margin-top 44.
5. Sub: "Enough to matter. Charged only if you flake." — 500/18/1.35, color `textMuted`.
6. **Stake card** `.card.stakeFocus`: 1px border `rgba(214,168,60,.46)`, bg `rgba(27,22,15,.88)`, padding 20.
   - Kicker "THE STAKE" 800/12, 0.34em, uppercase.
   - Money "$50" — Fraunces 600/76/0.9 centered, color `goldBright`.
   - Tiles row 4×1: $20 / $50.on / $100 / Other. Each 62 high, 17 radius, 1px border. Selected: gold gradient bg, gold border, gold text, subtle shadow.
   - Cheeky line italic Fraunces 500/15: "Enough to hurt. Not enough to be stupid." — color `#b0a691`.
   - Consequence row: red-tinted bg `rgba(56,25,18,.28)`, red-tinted border `rgba(214,77,44,.28)`, 16 radius, padding `13 14`. Left: "If you break it, **$50** goes to **ALS Association.**" Right: "Change" link gold weight 850.
7. **vowDateCard** below stake card: 1px top divider, gap 9, two rows. Each row 31 min-height (44 if tappable), grid `82px 1fr auto`.
   - Row 1: "Vow" / "Run every morning" (read-only).
   - Row 2: "Verdict" / "Sunday night" / pencil ✎ — tappable, opens 02b sheet.
8. Bottom CTA: "Choose your witness →".

**Interactions:**
- Tap a tile → updates `$50` display + cheeky note adapts to amount.
- Tap "Other" → opens custom-stake input (uncovered — Step 3).
- Tap "Change" on consequence → opens 02c sheet.
- Tap Verdict row → opens 02b sheet.
- Tap CTA → next screen 03.

**States:** stake selected (default $50), other amounts, custom amount, default verdict, custom verdict.

**Data:** `stake_amount`, `consequence`, `destination`, `deadlineIso`. All client-side until creation.

**Backend:** none yet.

**Primitives needed:** new `MoneyDisplay`, `StakeTile` (exists, may need restyle), new `ConsequenceRow`, new `VowDateCard`, `VowDateLine`, plus existing `StakeFocus`-style card.

**Haptics:** `hapticSelection` on tile select. `hapticPrimary` on CTA.

**Animation:** tile select: gold tint pulses briefly; money "$X" updates with crossfade or slide animation.

---

### 02b — Verdict Date Sheet

**Route:** Sheet over 02.
**Mock element:** shot index 3, has `.dimScreen` and a `.sheet.dateSheet`.

**Layout:**
1. Underlying 02 dimmed at `rgba(0,0,0,.34)`.
2. Bottom sheet: handle 46×5 grab, padding `12 22 26`.
3. h2: "Verdict by when?" — 800/26/1.08 Inter Tight, letter-spacing -0.01em.
4. p: "Pick when your witness decides if you kept it." — 600/15/1.35, color `textMuted`, max-width 330.
5. datePills wrapping flex: pills 44 min-height, 99 radius, 1px border, padding 0/16. Selected `.on`: gold border, gold text, gold-tinted bg.
   - "Sunday night" (default on), "Tomorrow", "1 week", "30 days", "Pick date".

**Interactions:**
- Tap pill → selects, updates underlying form state, dismisses sheet (or stays — TBD: probably dismiss after selection per iOS pattern).
- Tap "Pick date" → opens iOS native date picker.
- Tap grab handle / drag down → dismiss sheet.
- Tap dimmed area → dismiss sheet.

**States:** Sunday selected, Tomorrow, 1 week, 30 days, custom date picked.

**Animation:** standard iOS sheet present (translate from below, spring). Backdrop fade-in.

**Haptics:** `hapticSelection` on pill tap.

**Primitives:** new `BottomSheet` wrapper with grab handle, new `DatePillRow`.

---

### 02c — Change Destination Sheet

**Route:** Sheet over 02.
**Mock element:** shot index 4. Sheet uses `.causeSheet` variant (smaller margins, different layout).

**Layout:**
1. Underlying 02 dimmed.
2. Sheet: `left:20 right:20 bottom:0`, radius `20 20 0 0`, padding `12 18 22`. Has `.closeRound` × button at top-right (44×44 circle, 1px border).
3. h2: "Change where it goes." — Fraunces 600/25/1.08, padding-right 54 to clear close button.
4. p: "If the vow breaks, the stake goes to the destination you choose here." — max-width 305, margin-bottom 18.
5. Two `causeTypeCard` rows: 68 min-height, padding 13.
   - On: "♡ A cause you believe in / Your money does some good."
   - Off: "♨ A cause you hate / Maximum pain. Maximum motivation."
   - Selected has gold border, gold-tinted bg.
6. destLabel "CHOOSE A DESTINATION" 800/10, 0.28em, uppercase.
7. destChips wrap flex: ALS Association (on), St. Jude Children's Hospital, Ronald McDonald House, Feeding America. Pills 44 min-height, 99 radius, padding 0/13, font 700/13.
8. creamCta: "Done" — full-width, 52 high, 99 radius, cream bg `#f3ead9`, dark text. Distinct from gold gradient CTA — used only in this sheet.

**Interactions:**
- Tap × → dismiss without changes.
- Tap a causeTypeCard → toggles which list is shown (cause-you-believe-in vs cause-you-hate).
- Tap a destChip → selects it.
- Tap "Done" → applies, dismisses, updates underlying screen.

**Data:** `consequence` ('charity' or 'spite'), `destination` (string).

**Animation:** iOS sheet present + chip selection ripple.

**Haptics:** `hapticSelection` on chip/card tap. `hapticPrimary` on Done.

---

### 03 — Choose Witness

**Route:** `/native-perfect/create` step 3.

**Layout:**
1. StatusBar.
2. ChromeHeader: ← Back / 3 / 5 / ≡.
3. Progress bar 60%.
4. h1 `.witnessTitle`: `Choose your <em.gold>witness.</em>` — Fraunces 600/48/1.02, margin-top 38.
5. Sub: "Stay true or pay the price. They decide." — 600/17/1.34.
6. **decisionCard:**
   - Kicker "READY TO SEAL" 800/12, 0.34em.
   - Vow text Fraunces 600/25/1.18: "Run every morning this week."
   - metaGrid `0.7fr 1.55fr 0.75fr`:
     - "STAKE" / "$50" gold
     - "IF BROKEN" / "$50 to ALS Association" (small 13)
     - "VERDICT" / "Sunday"
   - metaLabel: 800/10, 0.22em, uppercase, color `#817766`.
   - metaValue: 700/14/1.15, color `text` (or `goldBright` if `.gold`).
7. **judgeCard** (empty state): 78 min-height, 1.3px border `rgba(214,168,60,.48)`, gold-tinted bg.
   - 48×48 avatar with "+", gold-tinted bg, gold-tinted border.
   - Title "Add a witness" 800/18.
   - Sub "Pick someone who won't let you slide." 600/13/1.25.
   - Right action chevron "→" 800/20 gold.
   - Tappable → opens 03b sheet.
8. **quietActions** row: two outlined buttons, gap 10. "Share link" + "Go solo". 44 min-height, 99 radius, 1px border `rgba(244,234,216,.13)`, color `#bdb39f`, font 700/14.
9. moneyNote centered: "Nothing charges unless you break it." — 600/13/1.2, color `#8f8573`.
10. NO bottom CTA on this screen — must add witness or share link to advance.

**Interactions:**
- Tap judgeCard → 03b sheet.
- Tap "Share link" → triggers iOS share sheet with witness invite URL (this requires the vow to exist as a draft first; uncovered nuance — Step 2 backend mapping).
- Tap "Go solo" → flips `witness_name = 'Just me'`, advances to 05 Add Payment (skips 04 if already authed... uncovered).

**Backend:** when witness is added, create draft vow and send invite URL preview. When "Share link" or "Go solo" is invoked, create draft vow.

**Primitives:** new `WitnessJudgeCard` (filled and empty states).

---

### 03b — Pick Witness Sheet

**Route:** Sheet over 03.
**Mock element:** shot 5.

**Layout:**
1. Underlying 03 dimmed.
2. Sheet (default style, full-width).
3. h2: "Pick your witness." — Fraunces 600/35/1.06.
4. p: "Choose a close friend, roommate, or anyone who won't let you slide." — 600/15/1.35, color `textMuted`.
5. **permissionCard** (gold-tinged): "Sync contacts / Find your witness faster. We only use the person you choose." with gold CTA "Choose contact". This is a permission-prompt-style card.
6. contactHint: "iPhone will ask for permission next. We never message anyone until you send the invite." — 600/12/1.35, color muted. For first-time users, no recent-witness rows show before permission.
7. sheetQuiet: "Share link instead" — secondary action, 46 min-height, 1px border, 16 radius.

**Interactions:**
- Tap "Choose contact" → triggers the native iOS contacts permission prompt if needed, then the contacts picker state.
- Tap a recent witness row → selects them, dismisses. This row exists only if the user has actual Unbreakable Vow witness history.
- Tap "Share link instead" → dismisses sheet, on screen 03 user can tap "Share link" quietBtn (or it could go directly).

**Data:** `witness_name`, `witness_phone`. Contact picker returns these.

**Backend:** none from this sheet directly. Selecting a witness updates local state; vow gets created at next step.

---

### 03b1 — iOS Contacts Permission

**Route:** Native iOS system alert over 03b.
**Mock element:** v2 03b1.

**Layout:** 03b remains dimmed behind the iOS alert. Alert title: `"Unbreakable Vow" Would Like to Access Your Contacts`. Body: "Find your witness faster. We only use the person you choose." Buttons: "Don't Allow" / "Allow".

**Interactions:** "Allow" → 03b+ first-time contacts synced picker. "Don't Allow" → returns to 03b with share/manual options still available. This prompt is never shown on screen arrival.

---

### 03b+ — First-Time Contacts Synced

**Route:** Sheet over 03 after contacts permission succeeds.
**Mock element:** v2 03b+.

**Layout:** Same sheet shell as 03b, but with green `Contacts synced` pill, h2 "Choose witness.", contact search, section "Suggested contacts", full-row contact choices, contactHint, and manual fallback "Invite by phone or email". First-time users see `Suggested contacts`, not `Recent witnesses`. `Recent witnesses` appears only when the user has actual Unbreakable Vow witness history.

**Interactions:** Contact row tap selects the person and routes directly to 03c. If a contact has multiple numbers/emails, show a resolver sheet before 03c.

---

### 03c — Witness Selected

**Route:** Replaces 03 once a witness is chosen.

**Layout:** Identical to 03 except:
- decisionCard kicker says "WITNESS CHOSEN".
- **judgeCard.filled:** avatar shows initial "J" with gold gradient bg + dark text. Title "Joe is your witness." Sub "After you seal, we'll help you text Joe." Right side: "Change" tap link in gold.
- No "Share link"/"Go solo" quietActions row.
- moneyNote retained.
- Bottom CTA: "Continue →".

**Interactions:**
- Tap "Change" → re-opens 03b sheet.
- Tap "Continue →" → advances to 04 (auth) if not authed, else to 05 (payment).

---

### 04 — Phone First

**Route:** Auth flow start. Replaces 04 layout pattern from existing `native-seal.tsx`.

**Layout:**
1. StatusBar.
2. authWrap: padding `92 28 0`, text-align center.
3. Back link "← Back" (top-left, inside authWrap — note: not the chrome header style).
4. h1 authTitle: "What's your number?" — Inter Tight 800/38/1.06, letter-spacing -0.01em.
5. p authSub: "We'll text the code that seals your vow. No password." — 500/18/1.35, color `textMuted`, max-width 310.
6. Dots row: 3 dots, 9×9 default, 31 wide for `.on`. Position 1 highlighted gold.
7. **phoneInput**: 76 min-height, 1.3px border `rgba(244,234,216,.27)`, 22 radius, bg `rgba(24,21,18,.82)`, padding `0 18`, gap 13, align-items center.
   - Country flag + +1 separator (1px right border).
   - Phone number text 600/26 — placeholder shown as "(555) 867-5309" in mock.
8. fieldNote: "For verification and vow updates only." — 600/14/1.35, color `#7f7667`, text-align left.
9. **stateSpec** card: dim border, 16 radius, padding 12. Color `#8f8573`, font 600/12/1.45. Lists alternate states: "States: invalid number, sending, SMS failed, rate limited, change country."
10. Bottom CTA: "Text me the code".

**Interactions:**
- Tap input → keyboard up.
- Tap CTA with valid number → calls phone OTP send (Supabase `auth.signInWithOtp`), advances to 04b.
- Tap country code → country picker (uncovered).

**Data:** local `phone` state.

**Backend:** Supabase auth phone OTP send.

**Primitives:** new `PhoneInput` (composite of country picker + tel field), reuse `GoldCTA`.

---

### 04b — Enter Code

**Route:** Auth step 2.

**Layout:**
- Same authWrap.
- h1: "Enter the code."
- authSub: "Sent to ••• ••• 5309." (last 4 digits revealed)
- Dots: position 2 on.
- **codeInput**: 76 min-height, justify-content center, gap 12, letter-spacing 0.25em, font 600/31. 6 underline marks 18×2 `rgba(244,234,216,.32)` separating digits.
- microLink: "Resend code in 38s" — 700/15, color `textMuted`, min-height 44.
- stateSpec: "States: invalid, expired, resend active, paste code, use a different number."
- Bottom CTA: "Verify →" with `.disabledCta` modifier (text color `#756c5d`, bg `rgba(244,234,216,.06)`, no shadow). Active when 6 digits entered.

**Interactions:**
- Auto-paste on iOS one-time-code autofill.
- After 6 digits, auto-verify (or wait for tap).
- Resend countdown 38s → 0 → tappable "Resend code".
- Wrong code → `hapticOtpError`, codeInput shakes, sub becomes "Wrong code. Try again." in red.

**Data:** OTP code.

**Backend:** Supabase `auth.verifyOtp`.

**Primitives:** new `OtpInput` (6-digit), `Countdown` (exists, may need adapt).

---

### 04c — Name If Missing

**Route:** Auth step 3 (only if user doesn't have a display_name).

**Layout:**
- authWrap.
- h1: "What should we call you?"
- authSub: "A vow with a name carries more weight."
- Dots: position 3 on.
- **nameInput**: 76 min-height, padding `0 20`, font 600/24.
- fieldNote: "Use the name people know you by." text-align left.
- stateSpec: "States: empty, too short, saving, save failed, longer names truncate gracefully."
- Bottom CTA: "Continue →".

**Interactions:**
- Tap input → keyboard up.
- Tap CTA with non-empty name → save to `users.display_name`, advance to 05.

**Data:** `display_name`.

**Backend:** `supabase.from('users').update({ display_name }).eq('id', userId)`.

---

### 05 — Add Payment

**Route:** `/native-perfect/create` step 5.
**Hard requirement:** ≥33/36 reviewer score.

**Layout:**
1. StatusBar.
2. ChromeHeader: ← Back / 5 / 5 / ≡.
3. Progress 100%.
4. h1 `.h2`: `Add <em.gold>payment.</em>`.
5. Sub: "No charge now. Only if you break it."
6. **decisionCard:**
   - Kicker "YOU ARE SEALING".
   - Vow text Fraunces 600/25.
   - metaGrid (3-col equal): STAKE $50 gold, WITNESS Joe, VERDICT Sunday.
7. **payStack** grid `1.1fr 0.9fr` gap 10:
   - payTile.on: 82 min-height, gold gradient bg, 1.3px gold border, color `#151006`. Top: payMark white pill " Pay" 800/15. Middle: "Apple Pay" 800/20. Bottom: paySub "Fastest" 700/12, opacity 0.78. (The space before "Pay" is intentional for Apple logo glyph.)
   - payTile (off): same dim style. Top: "Card" 800/20. Bottom: paySub "Enter card".
8. **trustCard**: 1px dim border, 18 radius, bg `rgba(244,234,216,.03)`, padding `13 15`. Text: "**Nothing charges today.** Apple Pay saves your payment method. You are charged only if the vow is broken." — 600/13/1.36, strong → `text`.
9. paymentLegal (absolute, bottom 106): "By continuing you agree to the <u>terms</u>." — 600/12, color `#756c5d`, centered. Underline color `#9e927f`, offset 3.
10. Bottom CTA: "Lock it in".

**Interactions:**
- Tap payTile → toggles selection (Apple Pay / Card).
- Tap "Lock it in" → triggers Stripe SetupIntent → presents native PaymentSheet (depicted as 05b).

**Data:** payment method preference.

**Backend:** `create-payment-intent` edge function (creates SetupIntent), then native Stripe PaymentSheet.

**Primitives:** new `PayTile` (Apple Pay variant + Card variant), new `TrustCard`, new `LegalLine`.

**Haptics:** `hapticSelection` on tile toggle. `hapticPrimary` on CTA.

---

### 05b — Stripe / Apple Pay Confirm

**Route:** Same as 05; modal stripe sheet appears.
**Hard requirement:** ≥33/36 reviewer score.

**Layout:** Identical 05 dimmed, plus:
- systemNote (above sheet, absolute bottom 224): "Stripe/Apple present this native sheet. We control the setup, merchant name, and surrounding context." 700/12/1.35 centered. **This is a designer note for our team — DO NOT render in production.**
- nativeSheet: as described in Global components. **In production, this is the actual Stripe React Native PaymentSheet** — we don't render it; Stripe does.

**Implication:** Mock 05b is a designer reference for the surrounding context. Layer 0 builds 05 + the Stripe SetupIntent integration. The "sheet" is Stripe's. Acceptance criterion: when user taps "Lock it in" on 05, the Stripe PaymentSheet appears with merchant "Unbreakable Vow", "Save payment method" subtitle, and the contextual rows shown. Configurable via `presentSetupIntent`.

**Backend:** Stripe SetupIntent client_secret → `useStripe().initPaymentSheet({ setupIntentClientSecret, customFlow: false, merchantDisplayName: 'Unbreakable Vow', applePay: { merchantCountryCode: 'US' } })` → `presentPaymentSheet()`.

**Animation:** native iOS sheet present (Stripe handles).

**Haptics:** none from us — system handles.

---

### 06 — Sealed Moment

**Route:** Post-payment success, before 07.
**This is the emotional climax. Single screen, no pairing partner. Special motion + haptics treatment in Step 4.**

**Layout:**
1. StatusBar.
2. **sealWrap.sealMoment**: padding `66 24 0` plus `padding-top: 150` (so seal is lower in viewport).
3. **sealMark** (sealMoment variant): 94×94 instead of 82, border-radius 26 (rounded square not full circle), gold gradient bg, dark glyph "✓" 800/34. Halo: `0 0 0 12px rgba(214,168,60,.08), 0 0 0 28px rgba(214,168,60,.035), 0 24px 70px rgba(214,168,60,.24)`.
4. Kicker "SEALED" 800/12, 0.34em, color `#817766`.
5. h1 sealedTitle (sealMoment variant): "Your vow is\n<em.gold>bound.</em>" — Fraunces 500/38/1.04, font-variation `SOFT 55, WONK 0`.
6. sealRule: 92×1 horizontal line, gradient `transparent → rgba(214,168,60,.58) → transparent`, margin `20 auto 16`.
7. sealQuote: italic Fraunces 560/20/1.28, color `text`. The vow text in quotes: `"Run every morning this week."`
8. sealedSub: "Now Joe needs to know." — 600/18/1.35, color `textMuted`, max-width 300. If no named witness exists, use "Now tell your witness."

**No bottom CTA initially** — user-tap-to-continue affordance fades in after the seal moment. Copy is contextual: "Tell Joe →" for named witness, "Share the link →" if no named witness exists.

**Animation choreography (preview, fully specced in Step 4):**
- Seal mark scales from 0 → 1 with bounce.
- Halo rings pulse outward.
- `hapticSealComplete` fires on apex.
- 240ms beat.
- Kicker + title + rule fade in cascading.
- sealQuote fades in.
- sealedSub fades in.
- After ~1800ms total, gentle haptic pulse and auto-advance to 07.

**Data:** uses `vow_id` from sealVow response.

**Backend:** none — this screen renders post-`sealVow`.

**Primitives:** new `SealMoment` composite, reuse `WaxSeal` or extend.

---

### 07 — Send Witness Invite

**Route:** Post-seal share screen, when witness has phone.

**Layout:**
1. StatusBar.
2. sealWrap (no `.sealMoment`): padding `66 24 0`.
3. sealMark (small 82×82 round): gold gradient, ✓.
4. Kicker "NEXT" centered.
5. h1 sendTitle: "Send Joe the\n<em.gold>invite.</em>" — Fraunces 500/41/1.04.
6. sealedSub: "Joe accepts, then the vow starts." — 600/18, color `textMuted`.
7. **messageCard**: 1px border, 22 radius, bg `rgba(24,21,18,.82)`, padding 18. Inside:
   - Kicker "YOUR TEXT TO JOE" 800/12 0.34em.
   - messageText (the SMS preview): 600/16/1.34, color `#c7bca8`. Content: "I vowed to run every morning this week. $50 if I break it. You decide if I kept it:".
   - URL line below 1px top-divider: 700/15, color `#8f8573`, ellipsis. Content: "unbreakablevow.app/w/abc123".
8. note: "We'll open Messages. You choose when to send." — 600/13/1.3, color `#8f8573`, centered.
9. Bottom (`.sealedBottom` modifier, bottom: 42):
   - CTA: "Text Joe the invite".
   - quietLinks below: "Copy link" / "Send it later".

**Interactions:**
- "Text Joe the invite" → `Linking.openURL('sms:+15551234567&body=' + encodeURI(message))` or `expo-sms` `composeAsync`. Pre-fills the SMS draft.
- "Copy link" → copy URL to clipboard, show "Copied" toast.
- "Send it later" → advance to 08 (waiting state).

**Data:** witness phone, witness invite URL.

**Backend:** Vow already exists (sealed); URL is `https://unbreakablevow.app/w/{token}`.

**Primitives:** new `MessagePreviewCard`, new `SealMarkSmall`.

---

### 08 — Waiting Witness Detail

**Route:** Maker's vow detail when status=sealed and witness not yet accepted, witness has phone.

**Layout:**
1. StatusBar.
2. detailSafe: padding 22.
3. ChromeHeader: ← Dashboard / empty / ≡.
4. Pill: "INVITE SENT" — orange variant.
5. h1 detailTitle: "Waiting for <em.gold>Joe.</em>" — Fraunces 500/42/1.04.
6. detailSub: "Your vow is sealed. Joe has the invite. Once he accepts, it begins." — 600/17/1.36.
7. **waitCard**: 1px gold border, 22 radius, bg `rgba(27,22,15,.82)`, padding 18.
   - waitTop: 46×46 clock circle gold-tinted + title "Invite sent." 800/19/1.15 + sub "You made it this far. Now Joe needs to accept." 600/14.
   - quote: italic Fraunces 500/23/1.18: `"Run every morning this week."`
   - CTA inside card: "Remind Joe" gold gradient.
   - linkRow grid `1fr 116px`: linkBox showing URL (ellipsis) + copyBtn "Copy link" 800/14.
   - note: "You can text him again or copy the link." — 700/12.5, centered textMuted.
8. softAction: "Judge it myself instead" — 56 min-height, 1px border, 18 radius.
9. **timeline** section:
   - timelineHead: "WHAT HAPPENS NEXT" 800/12 0.22em.
   - timelineBox: 1px border, 18 radius, padding 14.
   - 3 timelineItems: dot (active or inactive) + copy. Each item has small uppercase eyebrow ("NOW", "DURING", "SUNDAY") + body line.
     - Now: "Joe accepts the job." (active dot)
     - During: "They keep you honest." (inactive dot)
     - Sunday: "One tap: kept it or broke it." (inactive dot)

**Interactions:**
- Inner "Remind Joe" → SMS deep link.
- "Copy link" → clipboard.
- "Judge it myself instead" → confirms switch to solo, calls `switchToSoloWitness(vowId)`, transitions vow to active immediately.

**Data:** vow + witness state.

**Backend:** read-only fetch of vow; on judge-myself: `switchToSoloWitness(vowId)`.

**Primitives:** new `WaitCard`, new `Timeline` + `TimelineItem`.

---

### 07B — No Witness Picked

**Route:** Post-seal share screen when witness was not chosen at creation.

**Layout:** Same as 07 except:
- h1: "Share the\n<em.gold>invite.</em>"
- sealedSub: "Whoever accepts becomes your witness. Then the vow starts."
- messageCard kicker: "YOUR SHARE TEXT".
- note: "We'll open the share sheet. You choose who gets it."
- CTA: "Share the invite".

**Interactions:**
- CTA triggers iOS share sheet (`expo-sharing` or `Share.share`) with the URL + message.

---

### 08B — Returned After Messages

**Route:** Same route as 08; appears when user has confirmed they sent SMS or returns from share sheet.

**Layout:** Same as 08 except:
- Pill: "WAITING ON JOE" instead of "INVITE SENT".
- h1: "Waiting on\n<em.gold>Joe.</em>"
- detailSub: "If you sent the text, you're done for now. Joe must accept before the vow starts."
- waitCard waitTitle: "Waiting for acceptance.".
- waitCard waitSub: "We'll update this page when Joe is in.".
- waitCard CTA: "Got it" (instead of "Text Joe").
- linkRow: copyBtn says "Text again" (re-opens SMS deep link).
- softAction: same "Judge it myself instead".
- Timeline: same.

**State logic:** Show 08 if `witness_accepted_at IS NULL AND user has not yet tapped "Text Joe"`. Show 08B if user did tap and returned. Persist this in local state OR by detecting that the SMS app was opened (more reliable: a flag set when SMS deep-link was tapped, persisted in AsyncStorage scoped to vow_id).

---

### 08C — Shared Link, No Name

**Route:** When witness has no name (anonymous share-link flow), pre-acceptance.

**Layout:**
1. StatusBar + ChromeHeader (← Dashboard / ≡).
2. Pill: "WAITING FOR WITNESS".
3. h1: "Waiting for\n<em.gold>a witness.</em>"
4. detailSub: "If you shared the link, you're done for now. Whoever accepts becomes your witness, then the vow starts."
5. **card.activeCard**: kicker "THE VOW", italic vow text, metaGrid `1fr 1.15fr`: STAKE $50 at stake / IF BROKEN ALS Association.
6. **job** section: 1px dim border, 18 radius, padding 15, flex gap 12. Mark icon "↗" 38×38 gold-tinted. Title "Need to resend?" 800/18/1.15. Body "Share the invite again or copy the link." 500/14/1.3.
7. Bottom: CTA "Done" + quietLinks "Share again" / "Copy link".

---

### 09 — Joe Accepted

**Route:** Transition screen when witness has just accepted (push-triggered or polling). Phone background `.green`.

**Layout:**
1. StatusBar.
2. **activeCenter**: padding `78 24 0`, text-align center.
3. **liveMark** 82×82 round, green gradient `#63e1a5 → #25ad6a`, dark glyph ✓, halo `0 0 0 13px rgba(82,214,154,.09), 0 16px 42px rgba(82,214,154,.2)`.
4. Kicker "YOU'RE LIVE".
5. h1 centerTitle: "Joe is\n<em.green>watching.</em>" — Fraunces 500/40/1.04.
6. centerSub: "Your vow has started. Keep your word until Sunday night." — 600/17, max-width 300.
7. card.activeCard (text-align left): kicker "THE VOW", vow text, metaGrid `1fr 1.15fr`: STAKE $50 on the line / JUDGE Joe accepted (green color).
8. Bottom CTA `.cta.green`: "See my vow".

**Interactions:**
- CTA → 10 (mid-vow detail).

**Data:** vow now active. Witness accepted_at timestamp.

**Backend:** real-time subscription to vow changes (Supabase realtime) OR push notification triggers a state refresh.

**Primitives:** new `LiveMark` (green variant of SealMark), new `CenterTitle`.

**Haptics:** light celebratory haptic on screen present (`Haptics.notificationAsync(Success)` — but warm, not loud; or use `hapticClockStart` for the moment).

**Animation:** liveMark scales in with a tighter spring than sealMark; halo pulses.

---

### 10 — Mid-Vow Active

**Route:** Vow detail in active state. Phone background `.green`.

**Layout:**
1. StatusBar.
2. detailSafe + ChromeHeader (← Dashboard / ≡).
3. Pill `.live`: "VOW LIVE".
4. h1: "Keep\n<em.green>going.</em>"
5. detailSub: "Joe decides if you kept your word."
6. activeCard: kicker "THE VOW", vow text, metaGrid: STAKE $50 on hold / JUDGE Joe is watching (green).
7. **countCard** (sub of activeCard, more gold-tinged): countHead row "TIME LEFT" + metaValue "Sunday night". countBig "4 days left" 800/44 gold. countSub "Verdict by Sun, May 3 at 9:00 PM." 500/14.5/1.4. Meter 6px tall, 38% width gold gradient.
8. Bottom: CTA `.cta.green` "Done" + quietLinks "Text Joe a check-in" / "Share vow".

**Interactions:**
- "Text Joe a check-in" → SMS deep link with pre-filled message.
- "Share vow" → iOS share sheet with vow status URL.

**Backend:** read vow + audit_events for check-in history.

---

### 11 — Almost Verdict Time

**Route:** Vow detail when ≤24h remain. Phone background `.gold`.

**Layout:** Like 10 but:
- Phone bg gold-tinged.
- Pill: "ALMOST VERDICT TIME" (default orange-on-orange-bg).
- h1: "Last\n<em.gold>stretch.</em>"
- detailSub: "Joe calls it soon. Finish clean."
- activeCard: STAKE $50 on hold / IF BROKEN ALS Association.
- countCard: "TIME LEFT" + "Tonight" / countBig "2h 14m" / countSub "Verdict by Sun, May 3 at 9:00 PM." / meter 91% width.
- Bottom CTA (default gold): "Text Joe a final check-in".
- quietLinks: "Back to dashboard" / "Share vow".

---

### 12 — Verdict Due, Waiting

**Route:** Vow detail when deadline passed and witness hasn't decided. Phone background `.blue`.

**Layout:**
- Pill `.blue`: "VERDICT DUE".
- h1: "Time's up.\n<em.blue>Joe decides.</em>"
- detailSub: "Joe can decide now. Nudge them if you need to."
- activeCard: STAKE $50 at stake / ENDED Today.
- timeline section:
  - "WHAT HAPPENS NEXT"
  - Now: "Joe can deliver the verdict." (active dot)
  - If kept: "Nothing charges." (dim dot)
- Bottom CTA "Nudge Joe to decide" + quietLinks "Back to dashboard".

**Interactions:**
- "Nudge Joe to decide" → triggers `send-sms` with `message_type: 'verdict_request'` (or a custom nudge endpoint — Step 2 Backend Map will resolve).

**Backend:** edge function for nudge SMS.

---

### 13 — Dashboard Command Center

**Route:** `/native-perfect/dashboard` (will replace default).

**Layout:**
1. StatusBar.
2. safe + scroll wrapper (overflow-hidden, padding-bottom 94 for footer CTA).
3. Head row 3-col `auto 1fr auto`: hamburger ≡ left, wordmark "Unbreakable Vow" Fraunces italic 500/16 center, avatar "J" 44×44 right (gold initial).
4. h1 dashTitle: "Hey, Joseph." — Inter Tight 800/36/1.02, letter-spacing -0.01em.
5. dashSub: "Open loops first. Quiet vows after." — 600/15/1.34.
6. **rolePills** row: horizontal flex, gap 8. Each 34 height, 999 radius, 1px border, padding 0/11, font 800/12. "All", "My vows" (on, gold), "● Judging · 1" (orange dot indicating something to do), "Dares · 2".
7. **needCard** (urgent alert): 1.4px orange border, 3px left border, orange gradient bg, 14 padding, 18 radius. Inside: needTop (pulse + label), needTitle "Sarah needs your verdict.", needBody "**"** No alcohol, 2 weeks." Decide if she kept it.", needCta "Give verdict →" gold gradient.
8. sectionHead: "YOUR VOWS" 800/12 0.28em gold + "· 3" textMuted, with 1px gold-tinted bottom border.
9. **vowCard**: 1px border + 3px left border `gold`. cardTop: pill green "Active · Day 4 of 7" + time "**3 days** left". vowText italic Fraunces 600/16. meta row: ON LINE $50 gold / UNTIL Sun · 9pm / watch dot Joe (green dot pill).
10. **moduleRow** grid 1fr 1fr gap 10:
    - miniModule: miniNum "6" 800/24 gold + miniLabel "you're judging" 700/12.
    - miniModule: miniNum "2" + miniLabel "dares you sent".
11. footer (sticky bottom 28): full CTA "Make a vow →".

**Interactions:**
- Tap rolePill → filter cards.
- Tap needCard → opens witness verdict screen for Sarah's vow.
- Tap vowCard → opens 10/11/12/08 (state-dependent).
- Tap miniModule → opens 14 (judging) or 15 (dares).
- Tap "Make a vow →" → opens 16 quick vow OR 01 guided (TBD: probably 16 for returning users).

**Data:** vows where user_id = me, joined with witness_accepted_at, verdict deadline, status. Plus counts of judging and dares-sent.

**Backend:** `getMyVows()`, `getWitnessingVows()`, plus a new aggregate count for dares (Step 2).

**Primitives:** new `RolePill`, new `NeedCard`, new `VowCard`, new `MiniModule`, new `WatchPill`, new `SectionHead`.

---

### 13B — Project Perfect Menu

**Route:** Menu overlay over 13.

**Layout:**
1. Underlying dashboard scrolled, dimmed/blurred at `rgba(8,7,6,0.72-0.9)` with backdrop-filter blur 6.
2. **menuPanel**: 24 radius, 1px border, dark bg, drop-shadow.
   - menuTop: name "Joseph" + sub "Unbreakable Vow" + close × 40×40 circle.
   - **menuItem.hero** (gold-tinted): "＋ Make a vow / Put money on your word" + gold "→" arrow.
   - menuSection "DASHBOARD" 900/9 0.22em uppercase, 1px top divider.
   - menuItem ✓ "My vows" + gold badge "3".
   - menuItem ◐ "People I'm judging" + badge "1".
   - menuItem ↗ "Dares I sent" + dim badge "2".
   - menuSection "CHALLENGES":
   - menuItem ↗ "Dare someone".
   - menuSection "ACCOUNT":
   - menuItem ⚙ "Settings".
   - menuItem ? "Help".
   - menuFooter: "Urgent verdicts still appear on the dashboard first, even when they belong to someone else's vow." + tinyLinks "Terms" / "Privacy" underlined.

**Interactions:**
- Tap × → close menu.
- Tap any item → navigate.
- Tap dimmed area → close.
- Swipe down on panel → close (gesture).

**Animation:** menu panel slides up + scales in slightly; backdrop blur fades in.

**Primitives:** new `MenuPanel`, `MenuItem`, `MenuItem.Hero`, `MenuSection`.

---

### 14 — Judging Dashboard

**Route:** `/native-perfect/judging`.

**Layout:**
1. StatusBar.
2. safe + scroll.
3. Head: ← Dashboard / empty / ≡.
4. Pill `.blue`: "JUDGING".
5. h1 detailTitle: "People you're\n<em.blue>holding to it.</em>" — Fraunces 500/42/1.04.
6. dashSub: "Urgent calls first. Quiet vows after."
7. Rows of `rowCard`:
   - Sarah: avatar S, "Awaiting" pill (orange), italic vow "No alcohol, 2 weeks.", meta "Reply in 6 hrs" (orange) + "$100".
   - Devon: similar, "Cold plunge every morning.", "Reply in 18 hrs" + "$25".
8. Section divider kicker "ACTIVE" gold 18 0 4 0.
9. Marcus + Alex rows with `.rowPill.green` "Watching" + meta "X days left" + stake.

**Interactions:**
- Tap row → witness vow detail (18/19/20 depending on state).

**Data:** `getWitnessingVows()`.

**Primitives:** new `JudgingRowCard` (extends rowCard).

---

### 15 — Dares You Sent

**Route:** `/native-perfect/dares`.

**Layout:**
1. StatusBar.
2. safe + scroll.
3. Head: ← Dashboard / empty / ≡.
4. h1: "Dares you\n<em.gold>sent.</em>" Fraunces 600/61.
5. dashSub: "See who accepted, who's stalling, and what needs a resend."
6. **tabBar**: 3 tabs, 38 height, 99 radius, 1px border. "Open" (on), "Accepted", "Done".
7. **vowCard.pending**: 3px orange left border. cardTop: orange "WAITING" pill + time "**18h** left". vowText "Delete TikTok for a week." meta: SENT TO Marcus / SUGGESTED $50 gold / watch.pending dot orange "Pending".
8. **seeAll** button: 48 high, 16 radius, 1px gold-tinted border, gold-tinted bg, color goldBright 800/14. Content: "Resend invite →".
9. vowCard (default green left border): "ACCEPTED" green pill + "**4 days** left". vowText "No phone in bed for 7 days.". meta: ACCEPTED BY Ana / AT STAKE $25 gold / watch dot green "You judge".
10. footer CTA: "Dare someone →".

**Interactions:**
- Tap tab → filter list.
- Tap vowCard → dare detail (uncovered nuance).
- Tap "Resend invite →" → re-send SMS to challenge target.
- Tap "Dare someone →" → cast flow (uncovered: native cast screen).

**Data:** challenge vows where user_id = me, grouped by challenge_status.

**Primitives:** new `TabBar`, new `SeeAllButton`, new `WatchPill.Pending`.

---

### 16 — Quick Vow Main

**Route:** `/native-perfect/quick-vow` — power-user single-page creation.

**Layout (heavily compressed; 802px tall):**
1. StatusBar.
2. safe (flex column, height 802):
3. **qvTop** row: qvBrand left (mark + "Unbreakable Vow" with "Vow" italic gold serif), avatar J right.
4. qvKicker "QUICK VOW" gold 800/11 0.24em uppercase, margin 0 0 7.
5. h1 qvTitle.compact: "One promise. <em>Real consequence.</em>" — 800/18 with em italic Fraunces 600. Margin 0 0 10.
6. **qvCard** (vow input): bg `rgba(24,21,18,.82)`, 1px border, 18 radius, padding `16 18 13`, drop-shadow.
   - kicker "I VOW TO" 800/12.
   - qvInput 82 min-height, color text, 700/29 letter-spacing -0.01em. Placeholder italic "skip takeout all week".
   - qvRule: 1px gold-tinted line.
   - qvDate (inline): "Verdict <em>by</em> **Sunday night** ✎" 600/13. Tappable.
7. **chipViewport** with horizontal scroll: chips "Gym 3x this week", "Delete TikTok for a week", "Dry, 2 weeks", "No texting my ex".
8. qvStake: gold "$50" Fraunces 500/58/0.9 centered, with text-shadow `0 10px 34px rgba(200,155,60,.18)`.
9. **qvTiles** grid 4×1 gap 9: $10 / $25 / $50 (on) / $100. Each 52 high, 14 radius. Selected gold gradient.
10. qvStakeNote italic 600/13 dim, centered: "Enough to sting. Not enough to be stupid."
11. **qvWitness** row: 64 min-height, 1px gold-tinted border, gold-tinted bg, padding 0 15. Empty state: qvCircle "+" 34×34 + "Add a witness / Contacts first. Share link still works." + chevron →.
12. **qvReceipt**: 44 min-height, 1px red-tinted border, dim red bg, 14 radius, padding 0 14. Centered: "If broken, **$50** goes to **ALS Association**."
13. flex spacer.
14. CTA "Stake $50 →".
15. moneyNote "Need help? Guided setup" — small dim link.

**Interactions:**
- Tap qvInput → keyboard up.
- Tap chip → fills input.
- Tap tile → updates stake (and "$50" big text).
- Tap qvWitness → witness picker sheet (03b style).
- Tap qvDate → 02b sheet style.
- Tap "Need help? Guided setup" → opens 01 (multi-step).
- Tap "Stake $50 →" → 16B add payment.

**Data:** all client-side until creation.

**Primitives:** new `QvCard`, `QvInput`, `QvDate`, `QvStakeBig`, `QvTile`, `QvWitness`, `QvReceipt`.

---

### 16B — Quick Vow Add Payment

**Route:** Continuation of 16.

**Layout:**
1. StatusBar.
2. safe (flex column 802):
3. Head row 3-col: ← Back / qvBrand center / 44px spacer right.
4. Pill: "NO CHARGE NOW".
5. h1 detailTitle: "Add payment." Fraunces 500/42/1.04.
6. detailSub: "Save a way to pay. You only get charged if the vow breaks."
7. **payHero**: 1px gold-tinted border, 24 radius, gradient `rgba(31,26,20,.96) → rgba(23,20,16,.9)`, padding 18, margin `2 0 14`.
   - Kicker "YOU'RE STAKING".
   - vowText "Skip takeout all week."
   - metaGrid 3-col: STAKE $50 gold / IF BROKEN ALS / VERDICT Sunday.
8. card (regular):
   - Kicker "PAYMENT METHOD".
   - **paymentOptions** grid 1fr 1fr gap 10:
     - payOptionBig.on: 72 high, 18 radius, gold gradient bg, padding 14, flex gap 10, color `#120e08`. Content: " Pay" 900/19 (Apple-system font for the Pay logotype).
     - payOptionBig (off): same but dim. Content: "Card".
   - **trustBox**: 1px dim border, 18 radius, padding 15, color textMuted, 650/14.5/1.38. "**Stripe saves the payment method.** Unbreakable Vow charges it later only if the vow is marked broken."
9. flex spacer.
10. CTA "Save with Apple Pay".
11. legal (small dim centered): "Actual Apple Pay / card entry opens in Stripe's native PaymentSheet."

**Interactions:**
- Tap payOptionBig → toggles selection.
- Tap "Save with Apple Pay" → presents Stripe PaymentSheet.

**Backend:** SetupIntent → PaymentSheet.

---

### 17 — Witness Accepted

**Route:** Witness-side post-acceptance screen. Phone bg `.green`.

**Layout:**
1. StatusBar.
2. activeCenter padding 78 24 0:
3. liveMark green ✓ 82×82.
4. Kicker "YOU'RE IN".
5. h1 centerTitle: "Joe knows\nyou've got <em.green>him.</em>" — Fraunces 500/40.
6. centerSub: "That's it for now. We'll text you Sunday at 9pm."
7. activeCard left-aligned: kicker "YOU'RE WATCHING", vow text, metaGrid 1fr 1.15fr: ON LINE $50 / IF BROKEN ALS Association.
8. Bottom: CTA `.cta.green` "Text Joe: I've got you" + quietLinks "Done" / "Make your own vow".

**Interactions:**
- "Text Joe: I've got you" → SMS deep link to maker with pre-filled message.
- "Done" → witness's home (judging dashboard 14 or maker dashboard 13 if they're also a maker).
- "Make your own vow" → 16 quick-vow.

**Backend:** witness accepts via `accept-witness` edge function (already done by the time this screen shows; this is the success state).

---

### 18 — Witness Mid-Vow

**Route:** Witness-side detail when watching active vow. Phone bg `.green`.

**Layout:**
- detailSafe + ChromeHeader (← Judging / ≡).
- Pill `.live` "WATCHING".
- h1: "Keep Joe\n<em.green>honest.</em>"
- detailSub: "He picked you for a reason."
- activeCard: THE VOW + vow text + metaGrid: ON LINE $50 / IF BROKEN ALS Association.
- countCard: TIME UNTIL VERDICT / Sunday night / countBig "4 days left" gold / countSub "You decide by Sun, May 3 at 9:00 PM." / meter 38%.
- Bottom CTA `.cta.green` "Text Joe a check-in" + quietLinks "Done" / "Share vow".

---

### 19 — Witness Almost Up

**Route:** Witness-side, deadline ≤24h. Phone bg `.gold`.

**Layout:**
- Pill default orange "ALMOST VERDICT TIME".
- h1: "Last chance\nto <em.gold>nudge.</em>"
- detailSub: "Joe's vow ends tonight. Give him the final poke."
- activeCard: ON LINE $50 / VERDICT Tonight.
- countCard: TIME LEFT / 9:00 PM / countBig "2h 14m" **in orange** / countSub "After that, we'll ask if he kept it." / meter 91% with **orange-to-goldDeep** gradient.
- Bottom CTA gold "Text Joe now" + quietLinks "Done" / "I'll decide later".

---

### 20 — Witness Time's Up

**Route:** Witness-side, deadline passed. Phone bg `.blue`.

**Layout:**
- Pill `.blue` "VERDICT DUE".
- h1: "Joe's vow\nis <em.blue>up.</em>"
- detailSub: "Be honest. He picked you for a reason."
- activeCard: ON LINE $50 / ENDED 2h ago.
- Centered kicker "YOUR CALL" margin-top 22.
- Centered h2 Fraunces 500/28: "Did Joe keep it?"
- **buttons2** grid 1fr 1fr gap 10 margin-top 18:
  - judgeBtn.yes: 70 high, 18 radius, green tint bg `rgba(82,214,154,.08)`, green border, color green 800/18. Top: "Yes". btnSub "KEPT IT" 800/10 0.16em uppercase.
  - judgeBtn.no: red tint, red border, color light red. Top: "No". btnSub "BROKE IT".
- Bottom: only quietLinks "Need to check? Text Joe first" centered (no primary CTA).

**Interactions:**
- Tap Yes → confirmation sheet (uncovered) → submit verdict 'kept' → success screen.
- Tap No → confirmation sheet (uncovered) → submit verdict 'broken' → success screen.
- "Text Joe first" → SMS deep link.

**Backend:** `submit-verdict` edge function with witness_invite_token + verdict.

**Haptics:** `hapticVerdictKept` on Yes confirm. `hapticVerdictBroken` on No confirm.

---

## Cross-screen patterns

**Header back-label routing:**
- "← Back" inside multi-step creation = previous step.
- "← Dashboard" = go to dashboard route.
- "← Judging" = go to /judging route.

**Hamburger ≡ on every chromed screen** opens 13B menu overlay.

**Bottom-area patterns:**
- `<div class="bottom">` is `position:absolute; left:22; right:22; bottom:30`.
- `.sealedBottom` modifier: `bottom:42` instead.
- Footer (`.footer`): same as bottom but used on dashboard (different terminology in mocks).

**Backgrounds:**
- Default phone uses dark gradient + subtle gold radial.
- Active states (10): `.green` background.
- Almost-time states (11/19): `.gold` background.
- Verdict-due states (12/20): `.blue` background.
- Witness-accepted moment (09, 17): `.green` background with center-aligned content.

**Pills:**
- Default (orange) for transitional/urgent states ("One tap away", "Almost verdict time", "Waiting for witness", "No charge now", "Awaiting").
- `.live` (green) for active states ("Vow live", "Watching").
- `.blue` for verdict-due ("Verdict due", "Judging").
- `.green` for accepted ("Accepted").

**Typography hierarchy:**
- Display title `h1`: Fraunces 600/61 (screens 01, 15).
- Page title `.h2`: Fraunces 600/47 (02, 02b, 02c, 16B).
- Witness/secondary title: Fraunces 600/48 (03, 03b, 03c).
- Detail title: Fraunces 500/42 (08-12, 14, 18-20).
- Send title: Fraunces 500/41 (07, 07B).
- Sealed title: Fraunces 500/44 (06 base) or 500/38 (06 sealMoment variant).
- Center title: Fraunces 500/40 (09, 17).
- Auth title: Inter Tight 800/38 (04, 04b, 04c) — note: SANS, not serif. Auth is operational, not ceremonial.
- Dash title: Inter Tight 800/36 (13).
- Quick vow title compact: Inter Tight 800/18 + serif italic em (16).

**Italics + gold accent rule:** Every display title has an italic gold span — that's the brand voice. The italic word is always the emotional verb/anchor of the headline ("Mean it.", "stake.", "witness.", "bound.", "invite.", "Joe.", "watching.", "going.", "stretch.", "Joe decides.", "him.", "honest.", "nudge.", "up.", "sent."). This pattern must hold for any uncovered screen too.

---

## Open questions for Step 2 / Step 3

1. **Custom stake amount input** (mock 02 "Other" tile) — Step 3 must design.
2. **Country code picker** in 04 — Step 3.
3. **Returning-user sign-in** path (mock 01 has "SIGN IN" link) — Step 3.
4. **Verdict confirmation sheets** for 20 (Yes/No tap → confirm) — Step 3.
5. **State 08 vs 08B detection** — local AsyncStorage flag or backend field.
6. **"Nudge Joe to decide"** in 12 — needs a backend endpoint.
7. **Dare detail screen** (tap on a card in 15) — Step 3.
8. **Native cast/dare creation flow** — Step 3.
9. **Maker-side kept/broken outcome screens** — Step 3 must derive (mocks 17–20 are witness-side only).
10. **Transition animations between phase backgrounds** (default → green → gold → blue) — Step 4.

---

End of Step 1.
