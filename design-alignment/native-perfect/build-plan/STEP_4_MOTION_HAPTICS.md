# STEP 4 — Motion + Haptics + Sound Master Spec

This is the canonical motion, haptic, and sound specification for the entire native build. Once approved, every screen spec in Step 9 references this document. The reviewer subagent (Step 6) treats deviations as graduation-blocking.

This document subsumes and supersedes the preliminary findings in `STEP_4_PRELIM_MOTION_AUDIO.md`.

---

## A. Global motion language

### A.1 Duration tokens

All animations use one of these duration tokens (already in `expo/lib/uv-tokens.ts` as `uvDurations`):

| Token | ms | Use |
|---|---|---|
| `fast` | 120 | Tap/press feedback, small UI state changes |
| `base` | 240 | Default screen-element transitions, sheet present, button states |
| `slow` | 400 | Cross-screen transitions, large element entrances |
| `ceremonial` | 800 | Seal moment beats, halo pulses, threshold-crossing transitions |
| `halo` | 3200 | Long-form ambient pulses (witness-watching indicators) |
| `sealPopIn` | 480 | The seal-mark scale-in specifically |
| `checkBounce` | 420 | Verdict-kept and accept-confirmation moments |
| `fadeUp` | 320 | Generic fade-up entrance for cards, text |
| `pulseDot` | 1600 | Live dot pulses (dashboard need-attention card, watch indicators) |

Any animation duration not in this set is a Mock Deviation Proposal candidate. Add a token before using a new duration.

### A.2 Easing & spring system

**Default ease:** `Easing.bezier(0.25, 0.1, 0.25, 1)` — iOS standard ease-out. Used for cross-fades, sheet presents, and most generic animations.

**Standard spring:** `{ stiffness: 180, damping: 22, mass: 1 }`. Used for state transitions where bounce is appropriate but not playful (button press-lift, card present-from-below).

**Tight spring:** `{ stiffness: 260, damping: 28, mass: 1 }`. Used for the seal mark, live mark, and other "settled with finality" moments. Less bounce than the standard spring — feels resolved, not springy.

**Ceremonial spring:** `{ stiffness: 120, damping: 18, mass: 1.2 }`. Used ONLY for the seal moment apex. Slower buildup, more weight, more presence. Used once per vow in the maker's session.

**Linear:** Used only for progress bar fills and countdown ticks. Never for entrance animations.

### A.3 Reduce-motion handling

Per `AccessibilityInfo.isReduceMotionEnabled()`:

| Motion category | Default | Reduce-motion |
|---|---|---|
| Seal moment animation (06) | Full choreography | End-state immediate. Sound + haptic still fire. |
| Live-mark scale-in (09, 17, D4) | Tight spring + halo pulse | Cross-fade only. No spring, no halo. |
| Background phase transitions | 800ms gradient cross-fade | 200ms straight fade between solid colors. Keep the color change (semantic). |
| Sheet presents (02b, 02c, 03b, D9, D11) | Slide-up + spring | Cross-fade in over 200ms. |
| CTA button press-down + lift | 120ms scale 0.97 → 1.0 | None. Static. Haptic still fires. |
| Pulse-dot animations | 1600ms cycle, opacity 0.55 → 0.85 | Static dot at 0.85. |
| Halo glow effects | Continuous pulse | Static at midpoint opacity. |
| Counter ticks (countdowns) | Number flips/animates | Direct value swap. |
| Stake-tile selection | Gold-gradient appears + shadow ramps | Direct selected-state swap. |
| Chip scroll bounce | Native iOS bounce | Native iOS bounce (system-level, do not override). |
| Screen-to-screen transitions | Slide / cross-fade per phase | Cross-fade only, 200ms. |

The build agent reads `AccessibilityInfo.isReduceMotionEnabled()` once on app boot and on accessibility-info-changed events, stores in a context. All animations conditionally reference this.

### A.4 Animation libraries

**Reanimated 3** for all screen-level animations (entrance, exit, choreography). It's already in the project (verified in `package.json`). Use `useSharedValue` + `useAnimatedStyle` + `withSpring` / `withTiming`.

**`Animated` from `react-native`** is allowed for the simplest cases (button press-down) only. Reanimated is the default.

No `react-spring`, no `framer-motion-native`, no third-party motion libraries. Reanimated 3 is the entire motion stack.

---

## B. Global haptic language

### B.1 The wrappers (already in `lib/haptics.ts`)

| Wrapper | iOS Haptic | Semantic role |
|---|---|---|
| `hapticPrimary()` | impact medium | Primary CTA press (seal, continue, verify) |
| `hapticSecondary()` | impact light | Secondary CTA press (back, cancel, share, copy) |
| `hapticSelection()` | selection | Tile/chip/pill selection |
| `hapticOtpDigit()` | selection | OTP digit entered |
| `hapticOtpError()` | notification error | Wrong OTP, validation fail |
| `hapticSealComplete()` | notification success | Seal moment apex (one-time, ceremonial) |
| `hapticVerdictKept()` | notification success | Verdict kept submission, kept-outcome render |
| `hapticVerdictBroken()` | notification warning | Verdict broken submission, broken-outcome render |
| `hapticVoidConfirm()` | notification warning | Void/cancel destructive confirm |
| `hapticPullRefresh()` | impact light | Pull-to-refresh threshold reached |
| `hapticClockStart()` | impact soft | Countdown start, ceremony beat, soft commitment |

### B.2 New wrappers to add

Three additions needed for the native-perfect build:

```ts
/** Sheet presents (02b, 02c, 03b, D9, D11, D17) */
export function hapticSheetPresent() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Copy-to-clipboard confirmation */
export function hapticCopySuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Witness accepts a draft vow (D4 only — distinct from full witness-accepted celebration) */
export function hapticDraftAccepted() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}
```

Add these to `lib/haptics.ts` in Phase 0.

### B.3 Haptic principles

- **Haptics on commitments, not on passive renders.** A screen rendering does NOT fire a haptic. A user-initiated action does.
- **One haptic per interaction.** No double-tap, no compound haptics within a single user action.
- **Disabled buttons do not haptic.** Tapping a `.disabledCta` produces no feedback.
- **System UI haptics are not ours.** Native iOS sheets, share sheets, contact picker — those have their own haptics. Don't double up.
- **Reduce-motion does NOT disable haptics.** Haptics are tactile, not motion. They remain unless the user has them off in iOS settings (which the system handles transparently).

### B.4 Reduce-motion does not affect haptics or sound

iOS reduce-motion is for visual motion only. Haptics and sound continue at full fidelity.

---

## C. Sound language

### C.1 The three custom sounds (locked from preliminary spec)

| Sound | Trigger | Sonic character | Length | Volume |
|---|---|---|---|---|
| **Seal thud** | Screen 06 apex | Low woody/waxy thud, ~140-160 Hz fundamental, organic | 300ms | -14 dB |
| **Verdict kept chime** | Screen D1 render | Bright bell-tone, single strike, 880-1000 Hz, subtle reverb tail | 400ms | -16 dB |
| **Verdict broken glide** | Screen D2 render | Descending tone, 240→120 Hz, mournful, not punitive | 600ms | -16 dB |

### C.2 Audio session configuration

Use `expo-av` with category `AVAudioSessionCategoryAmbient`:
- Mixes with system audio (Spotify keeps playing — does not interrupt).
- Respects iOS silent mode (rocker switch) — sounds mute automatically.
- No audio focus requests, no interruption of user music.

### C.3 Sound-haptic synchronization

Sound and the corresponding haptic must fire on the same animation frame for the seal/verdict moments. Implementation:

```ts
async function playSyncedFeedback(sound: Audio.Sound, hapticFn: () => void) {
  await sound.playAsync();
  hapticFn();
}
```

`expo-av` is fast enough (sub-frame latency) that this is reliable. Pre-load all 3 sounds at app boot.

### C.4 No sound on:

- Tap feedback, button presses, transitions, screen renders, witness acceptance, OTP entry, copy-to-clipboard, sheet presents, screen-to-screen navigation.
- Anything that's not one of the 3 emotional anchors.

---

## D. Per-screen specs

For every mock screen and every derived screen, this section gives entrance, internal animations, haptics, sound, and reduce-motion notes.

### D.1 Mock screens 01–20

#### Screen 01 — Vow Only, Quiet Start Chips

**Entrance:** Cross-fade in over `base` (240ms). No slide. (First screen of new-user flow.)

**Internal animations:**
- Vow input focus: 1.3px border color animates from `borderSoft` → `border` over `fast` (120ms).
- Chip scroll: native iOS momentum + bounce.
- Chip tap: chip background flashes `gold` at 0.6 opacity for 80ms, then fills the input. Input text appears with 200ms typewriter-style fade-in (no character-by-character, just opacity).
- "Next →" disabled → enabled: gold gradient fades in over `fast` (120ms) when input becomes non-empty.

**Haptics:**
- Chip tap: `hapticSelection()`.
- "Next →" tap: `hapticPrimary()`.
- "SIGN IN" tap: `hapticSecondary()`.

**Sound:** none.

**Exit:** Slide-left out over `base` (240ms) to make room for screen 02 entering from the right.

**Reduce-motion:** Cross-fade in/out instead of slide.

---

#### Screen 02 — Stake First, Selectable Verdict

**Entrance:** Slide-in from right over `base` (240ms).

**Internal animations:**
- Stake tile select: tapped tile gold-gradient bg + 1px gold border + box-shadow ramp in over `fast` (120ms). Previously-selected tile fades out simultaneously. Gold "$50" big number cross-fades to new value over `fast`.
- "Cheeky" line below adapts copy when stake amount changes — crossfade over `fast`.
- Consequence row "Change" tap: row briefly highlights (bg ramps to `goldSoft`) for 80ms before sheet 02c presents.
- Vow date row "Verdict" tap: row briefly highlights for 80ms before 02b sheet presents.
- Progress bar: animates from 20% to 40% over `base` on entrance.

**Haptics:**
- Stake tile: `hapticSelection()`.
- "Other" tile (opens D9): `hapticSelection()` + sheet present haptic on D9 mount.
- Consequence change tap: `hapticSecondary()`.
- Verdict date tap: `hapticSecondary()`.
- "Choose your witness →": `hapticPrimary()`.

**Sound:** none.

**Reduce-motion:** Cross-fade in instead of slide. Tile selection: direct state swap (no ramp).

---

#### Screen 02b — Verdict Date Sheet

**Entrance:** Slide-up over `base` (240ms) with standard spring. Backdrop dim fades in over `fast` (120ms).

**Internal animations:**
- Pill tap: tapped pill background fades to `goldSelectedBg` over 80ms, border color animates to `gold`, text color animates to `goldBright`. Previously-on pill fades out simultaneously. Auto-dismisses sheet 200ms after selection.
- "Pick date" tap: opens iOS native `DateTimePicker` modal on top.

**Haptics:**
- Sheet present: `hapticSheetPresent()` (new wrapper).
- Pill tap: `hapticSelection()`.

**Sound:** none.

**Exit:** Slide-down over `base`. Backdrop fades out simultaneously.

**Reduce-motion:** Cross-fade in/out, no spring, no slide.

---

#### Screen 02c — Change Destination Sheet

Same as 02b for sheet entrance/exit + standard spring.

**Internal animations:**
- Cause-type card toggle: cards swap selected state with cross-fade `fast`.
- Destination chip tap: same selection ramp as 02 stake tiles.
- Close × tap: rotates 90° over `fast` then sheet dismisses.

**Haptics:**
- Sheet present: `hapticSheetPresent()`.
- Cause type select: `hapticSelection()`.
- Destination chip: `hapticSelection()`.
- "Done" `creamCta`: `hapticPrimary()`.
- Close ×: `hapticSecondary()`.

**Sound:** none.

---

#### Screen 03 — Choose Witness

**Entrance:** Slide-in from right over `base`.

**Internal animations:**
- judgeCard "Add a witness" tap: card scales to 0.98 over `fast`, then back to 1.0 over `fast` (press-down lift). Then 03b sheet presents.
- "Decide later" quietBtn tap: button flashes goldSoft bg for 80ms.
- "Share link" quietBtn tap: button flashes, then anonymous `prepare-judge-link` fires + native share sheet presents (200ms after tap).
- Progress bar animates 40% → 60%.

**Haptics:**
- judgeCard tap: `hapticSecondary()`.
- "Decide later" tap: `hapticSecondary()` (lighter than primary — this is a deferral, not a commitment).
- "Share link" tap: `hapticSecondary()`.

**Sound:** none.

---

#### Screen 03b — Pick Witness Sheet

Standard sheet entrance.

**Internal animations:**
- "Choose contact" tap: button press-down. iOS `Contacts` API picker opens (system-handled).
- Recent contact row tap: row bg ramps to `goldSoft` for 80ms, then sheet dismisses with selected contact populating local state.
- "Share link instead" tap: standard quietBtn flash, sheet dismisses.

**Haptics:**
- Sheet present: `hapticSheetPresent()`.
- Contact row tap: `hapticSelection()`.
- "Choose contact": `hapticPrimary()`.
- "Share link instead": `hapticSecondary()`.

---

#### Screen 03b+ — Contacts Synced Picker

Same sheet shell as 03b, but rendered after contacts access is accepted. In the first-time state, the section is `Suggested contacts`; `Recent witnesses` appears only for real Unbreakable Vow history.

**Internal animations:**
- `Contacts synced` pill fades/slides in over `base`; avoid celebratory bounce so the state feels trustworthy, not salesy.
- Search field appears with the sheet content; focus only if the user taps it.
- Contact rows stagger in lightly (40ms offsets, max 120ms total) or render immediately on lower-power devices.
- Contact row tap: full row press state ramps to `goldSoft` for 80ms, then sheet dismisses and 03c renders with the selected witness.

**Haptics:**
- Contacts accepted: `hapticPrimary()` once after permission returns successfully.
- Search focus: `hapticSelection()`.
- Contact row tap: `hapticSelection()`.
- Multiple-method resolver sheet: `hapticSheetPresent()`.

**Reduced motion:** no row stagger; use opacity only.

---

#### Screen 03c — Witness Selected

Same entrance as 03 (this is a state of 03 with witness populated, but treated as a distinct render for animation purposes).

**Internal animations:**
- judgeCard.filled scales in: 0.96 → 1.0 over `base` with tight spring. Avatar gold-gradient halo pulse-once over `slow`.
- "Change" tap: scales card to 0.98 briefly, then re-opens 03b.
- "Ask Joe now →" link tap: calls anonymous `prepare-judge-link`, then opens `MessageComposer` or share sheet. After share sheet dismisses, link copy crossfades to "Ask Joe again →" over `base`.

**Haptics:**
- Card render (witness just picked): `hapticPrimary()` — small celebration on the moment of selection.
- "Change": `hapticSecondary()`.
- "Ask Joe now →": `hapticSecondary()` on tap; `hapticPrimary()` after share sheet returns.

**Sound:** none.

---

#### Screen 04 — Phone First

**Entrance:** Slide-in from right.

**Internal animations:**
- phoneInput focus: border ramps from `borderSoft` to `border` over `fast`.
- Country selector tap: tap-down ramp + opens D12 country picker as full-screen modal.
- Dot 1 → on: gold fill animates in over `base`.
- "Text me the code" tap: button press-down, loading spinner fades in over `fast` (replaces button content for the duration of `auth.signInWithOtp`).

**Haptics:**
- phoneInput focus: none (passive).
- Country picker open: `hapticSecondary()`.
- "Text me the code": `hapticPrimary()`.

**Sound:** none.

---

#### Screen 04b — Enter Code

**Entrance:** Slide-in from right.

**Internal animations:**
- codeInput auto-focuses (system keyboard up) on mount.
- Each digit entered: dot at that position cross-fades to filled (gold), small scale 1.0 → 1.05 → 1.0 over `fast`.
- 6th digit complete: codeInput border ramps to gold for 200ms, then "Verify →" CTA enables (gold gradient ramps in).
- Wrong code: codeInput translates left-right over 200ms (shake animation), background flashes `dangerBg` for 200ms, then resets to empty. Sub-text becomes "Wrong code. Try again." in `danger` for 1500ms then reverts.
- Resend countdown: number ticks once per second linearly. At 0, becomes a tappable "Resend code" link.

**Haptics:**
- Each digit entered: `hapticOtpDigit()`.
- 6th digit / CTA enabled: `hapticSelection()`.
- Wrong code: `hapticOtpError()`.
- Resend tap: `hapticPrimary()`.
- Verify tap: `hapticPrimary()`.

**Sound:** none.

---

#### Screen 04c — Name If Missing

**Entrance:** Slide-in from right.

**Internal animations:**
- nameInput focuses on mount (keyboard up).
- "Continue →" enables (gold gradient ramps in over `fast`) when input has text.
- On tap: button press-down, loading spinner replaces text for the duration of the save.

**Haptics:**
- Input focus: none.
- Continue tap: `hapticPrimary()`.

**Sound:** none.

---

#### Screen 05 — Add Payment

**Entrance:** Slide-in from right.

**Internal animations:**
- payTile select: ramps similar to stake tiles (gold gradient + border + shadow over `fast`). Apple Pay tile is on by default.
- Progress bar 80% → 100% on entrance.
- "Lock it in" tap: button press-down, then PaymentSheet present (system-handled). Internal loading state if SetupIntent client_secret retrieval is in-flight (rare — should be pre-fetched).

**Haptics:**
- Tile select: `hapticSelection()`.
- "Lock it in": `hapticPrimary()`.

**Sound:** none.

---

#### Screen 05b — Stripe Sheet

System-handled. Stripe React Native PaymentSheet has its own animations and haptics. We do nothing on top.

After PaymentSheet dismisses with success: cross-fade to screen 06 over `slow` (400ms). The cross-fade is generous because we're crossing a threshold (payment complete → seal moment). No slide.

**Haptics fired by us during 05b:** none — Stripe owns this surface.

---

#### Screen 06 — Sealed Moment ⭐

**This is the most important animation in the app.** It's the emotional climax. Specced in detail below.

**Entrance choreography (total ~1800ms):**

```
t=0ms        Screen 05 cross-fades out, screen 06 background fades in (slow / 400ms).
             Background: dark gradient with subtle gold radial.
             Reduce-motion: cut to 06 background instantly.

t=100ms      sealMark scales in.
             Initial state: scale 0.4, opacity 0, no halo.
             Animation: sealCeremonial spring (stiffness 120, damping 18, mass 1.2).
             End state at ~580ms: scale 1.0, opacity 1.0.
             Halo rings: render from 0 opacity → final stacked-shadow values 
             (`0 0 0 12px rgba(214,168,60,.08), 0 0 0 28px rgba(214,168,60,.035), 0 24px 70px rgba(214,168,60,.24)`)
             over the same span.
             Reduce-motion: appears at end-state instantly.

t=540ms      hapticSealComplete() fires.
             soundSealThud plays (-14 dB, mixes with background audio).
             Both must fire on the same animation frame.

t=620ms      Kicker "SEALED" fades in over fadeUp (320ms).
             Translate from y=+8 → y=0.
             Reduce-motion: instant.

t=820ms      h1 sealedTitle "Your vow is\nbound." fades in over fadeUp.
             Same translate.
             "bound." em italic gold may have a 100ms additional 
             pop-in delay vs. the rest of the title (subtle, optional).

t=1020ms     sealRule (the gold horizontal divider line) draws in, 
             expanding from center outward over base (240ms). 
             Animated `transform: scaleX(0)` → `scaleX(1)` with `transformOrigin: 50%`.
             Reduce-motion: appears static.

t=1280ms     sealQuote (the vow text in italic Fraunces) fades in over fadeUp.
             y translate +8 → 0.

t=1500ms     sealedSub "Now Joe needs to know." fades in over fadeUp.
             If no named witness exists, use "Now tell your witness."

t=1820ms     Contextual affordance ("Tell Joe →" for named witness,
             "Share the link →" if no named witness) fades in over fadeUp 
             starting from opacity 0 → 0.55. Then begins pulsing per A.1's pulseDot rhythm
             (1400ms cycle, 0.55 → 0.85 → 0.55).
             Reduce-motion: appears at 0.85 static.
```

**Total time before user can advance:** 1820ms. That's the threshold of "earned" — they sat through the moment.

**Continue affordance:**
- Italic Fraunces 17px, color `textMuted` (`#A49A85`).
- Chevron right glyph, same color.
- Centered horizontally, bottom-anchored at `bottom: 60` (24 above the safe-area).
- Tap target: 44px tall, full-width (the entire bottom 60-110 region is tappable, not just the visible text).

**On tap:**
- 300ms whole-screen fade-to-black-with-15%-darken.
- Then 400ms spring cross-fade into the next screen (07/07B/08C per matrix).
- `hapticPrimary()` on tap (continues the ceremonial moment).

**Reduce-motion variant of entrance:**
```
t=0ms        Background renders.
             Sound + haptic still fire.
t=100ms      All elements appear at their end-states. No motion.
t=400ms      Continue affordance appears at end-state opacity (0.85), no pulse.
```

Sound and haptic fire identically to the default flow regardless of reduce-motion.

**Implementation note:** Use Reanimated's `useSharedValue` for sealMark scale + opacity, kicker/title/rule/quote/sub opacity + translateY. Sequence with `withDelay()`. Make the timing constants here be a single exported `SEAL_TIMELINE` so Step 9's per-screen spec can reference one source.

---

#### Screen 07 — Send Witness Invite

**Entrance:** Cross-fade from screen 06 over `slow` (after the user tapped the contextual affordance on 06).

**Internal animations:**
- sealMark (small 82×82 round): same scale-in as on 06 but tighter — `tightSpring`, total 320ms. Halo present but smaller. Already settled by the time the rest of the screen fades in.
- Kicker, title, sub, messageCard, note cascade in over the next ~600ms (each 100ms apart, fadeUp each).
- Bottom CTA "Text Joe the invite" + quietLinks fade in last.

**Haptics:**
- "Text Joe the invite": `hapticPrimary()`.
- "Copy link" quietLink: `hapticCopySuccess()` AFTER the clipboard write succeeds (not on tap — on confirmation).
- "Send it later": `hapticSecondary()`.

**Sound:** none.

**Reduce-motion:** all cascades collapse to a single 200ms cross-fade.

---

#### Screen 07B — No Witness Picked

Same entrance choreography as 07.

**Internal animations:** identical to 07 except the CTA opens the share sheet (not iMessage directly).

**Haptics:**
- "Share the invite": `hapticPrimary()`.
- After share sheet dismissed: `hapticSecondary()` (acknowledgment).
- "Copy link": `hapticCopySuccess()`.
- "Send it later": `hapticSecondary()`.

---

#### Screen 08 — Waiting Witness Detail

**Entrance:** Cross-fade from 07 OR slide-in from a back-nav.

**Internal animations:**
- waitCard appears with cross-fade.
- Clock icon `◷` rotates slowly: continuous 360° rotation over 12 seconds (subtle ambient motion). Reduce-motion: static.
- Timeline dots: the active "Now" dot pulses on `pulseDot` rhythm. The dim dots are static. Reduce-motion: all static.
- Quote text fades in last in cascade.

**Haptics:**
- "Remind Joe" inner CTA: `hapticPrimary()`.
- "Copy link": `hapticCopySuccess()`.
- "Judge it myself instead": `hapticSecondary()`. Then opens a confirmation sheet: `hapticSheetPresent()`. On confirm: `hapticVoidConfirm()` (this is a destructive transition — switching to solo mid-vow).

**Sound:** none.

---

#### Screen 08B — Returned After Messages

Same as 08. The differences are content-only (the AsyncStorage `sms_open_attempted` flag), no animation differences.

**Haptics:**
- "Got it" waitCard CTA: `hapticPrimary()`.
- "Text again": `hapticSecondary()` before reopening Messages.
- Link copy: `hapticCopySuccess()` after clipboard write succeeds.

---

#### Screen 08C — Shared Link, No Name

Same entrance and internal animation patterns as 08.

**Haptics:** "Share again" / "Copy link" same as 07B.

---

#### Screen 09 — Joe Accepted ⭐

**Trigger:** real-time subscription detects `witness_accepted_at` change, OR app cold-starts via push.

**Entrance choreography:**
- Background phase transition: current `default` background cross-fades to `.green` over `ceremonial` (800ms). The radial gold fades out, the radial green fades in. Whole phone tints.
- liveMark scales in at t=400ms with `tightSpring`, opacity 0 → 1, halo green-glow ramps in.
- Kicker "YOU'RE LIVE" fades in at t=820ms.
- centerTitle "Joe is watching." fades in at t=1020ms.
- centerSub at t=1220ms.
- activeCard at t=1420ms.
- Bottom CTA at t=1620ms.

**Haptics:**
- liveMark settle (t=720ms): `hapticPrimary()` — celebratory but contained, NOT one of the 3 sound moments.

**Sound:** none.

**Important:** show only ONCE per vow per device (AsyncStorage `accept_celebration_seen:{vow_id}`). Subsequent visits to the active vow detail render screen 10 directly without celebration.

**Reduce-motion:** background color cuts directly. liveMark cross-fades. No halo pulse. Cascading text reduced to single 200ms fade.

---

#### Screen 10 — Mid-Vow Active

**Entrance:** Cross-fade.

**Internal animations:**
- activeCard renders with subtle gold border ramp.
- countCard meter bar fills from 0% to current progress over `ceremonial` (800ms) on first mount. Subsequent re-mounts: at static current value.
- "Live" pill green dot pulses on `pulseDot` rhythm. Reduce-motion: static.

**Haptics:**
- "Done" CTA: `hapticPrimary()`.
- "Text Joe a check-in" quietLink: `hapticSecondary()`.
- "Share vow": `hapticSecondary()`.

---

#### Screen 11 — Almost Verdict Time

**Entrance:** Background phase transition from `.green` to `.gold` over `ceremonial` (800ms) when the deadline crosses the <24h threshold. Otherwise standard cross-fade entrance.

**Internal animations:**
- countCard meter at 91%+ width, gold-deep gradient.
- countBig number color may shift to slightly warmer gold on entrance.

**Haptics:**
- "Text Joe a final check-in": `hapticPrimary()`.

---

#### Screen 12 — Verdict Due, Waiting

**Entrance:** Background transition to `.blue` when `ends_at < now`. Cross-fade over `ceremonial`.

**Internal animations:**
- timeline dots: active dot pulses; dim dots static.
- "Nudge Joe to decide" CTA: standard.

**Haptics:**
- "Nudge Joe": `hapticPrimary()` on tap. After SMS dispatched: `hapticCopySuccess()` (success acknowledgment without sound).

---

#### Screen 13 — Dashboard Command Center

**Entrance:** Cross-fade over `base`.

**Internal animations:**
- Role pills: tapped pill ramps to gold-tinted state over `fast`. Pull-to-refresh standard iOS.
- needCard: pulse dot animates on `pulseDot` rhythm. Card border may have a subtle gold-shimmer on first mount (single pass over 1200ms, never repeats).
- vowCards: cascade in over 200ms each (max 4 cascade, rest snap in).
- moduleRow numbers: count-up animation from 0 to current value over `slow`. Reduce-motion: direct.

**Haptics:**
- Role pill tap: `hapticSelection()`.
- needCard tap: `hapticPrimary()` (this is the urgent action).
- vowCard tap: `hapticSecondary()`.
- "Make a vow →": `hapticPrimary()`.
- Pull-to-refresh threshold: `hapticPullRefresh()`.

**Sound:** none.

---

#### Screen 13B — Project Perfect Menu

**Entrance:** Backdrop blur + dim fades in over `base` (240ms). menuPanel slides up + scales from 0.92 → 1.0 with `tightSpring`.

**Internal animations:**
- menuItem.hero (Make a vow): subtle gold-shimmer pass on entrance.
- Each menuItem ripples briefly on tap.

**Haptics:**
- Menu open: `hapticSheetPresent()`.
- menuItem.hero tap: `hapticPrimary()`.
- Other menuItem taps: `hapticSelection()`.
- Close × tap: `hapticSecondary()`.
- Swipe-down dismiss: `hapticSecondary()`.

**Sound:** none.

**Reduce-motion:** backdrop fades, panel cross-fades in (no scale, no slide).

---

#### Screen 14 — Judging Dashboard

**Entrance:** Slide-in from right (came from menu/dashboard).

**Internal animations:**
- rowCards cascade in (200ms each, max 4).
- Section divider kicker static.
- Urgent meta indicators: "Reply in 6 hrs" text in `orange` may pulse opacity subtly on `pulseDot`. Reduce-motion: static.

**Haptics:**
- rowCard tap: `hapticSecondary()`.

---

#### Screen 15 — Dares You Sent

**Entrance:** Slide-in from right.

**Internal animations:**
- tabBar: tapped tab ramps to gold-tinted bg over `fast`. Underlying card list crossfades over `base`.
- vowCard.pending pulse dot animates.
- "Resend invite" seeAll button: subtle hover-equivalent on press (scale 0.98 → 1.0 fast).

**Haptics:**
- Tab switch: `hapticSelection()`.
- Card tap: `hapticSecondary()`.
- "Resend invite": `hapticPrimary()`.
- "Dare someone →": `hapticPrimary()` (opens web flow per scope decision).

---

#### Screen 16 — Quick Vow Main

**Entrance:** Cross-fade in (this is a returning-user surface, not part of multi-step).

**Internal animations:**
- qvInput focus + chip behaviors same as screen 01.
- qvStake big "$50" cross-fades to new value when tile changes.
- qvTiles select: same ramp as screen 02 stake tiles.
- qvWitness empty → filled: smooth bg cross-fade + avatar pop-in.
- Bottom CTA "Stake $X →" updates dynamically as stake changes.

**Haptics:**
- Same set as 01 + 02 combined.

---

#### Screen 16B — Quick Vow Add Payment

Same entrance as 05.

**Internal animations:** same patterns as 05.

**Haptics:** same as 05.

---

#### Screen 17 — Witness Accepted

**Entrance:** Standard liveMark choreography (mirrors screen 09 but witness-side).
- Background `.green`.
- liveMark green ✓ scales in with tightSpring at t=200ms.
- Cascading content follows.

**Haptics:**
- liveMark settle: `hapticPrimary()`.
- "Text Joe: I've got you": `hapticPrimary()`.
- "Done"/"Make your own vow" quietLinks: `hapticSecondary()`.

**Sound:** none.

---

#### Screen 18 — Witness Mid-Vow

Same as screen 10 but witness-side. No new motion.

---

#### Screen 19 — Witness Almost Up

Same as screen 11. Background phase transition to `.gold`.

---

#### Screen 20 — Witness Time's Up

**Entrance:** Background transition to `.blue` over `ceremonial`.

**Internal animations:**
- buttons2 (Yes/No judge buttons) fade in last after the rest of the screen settles.
- On tap: tapped button ramps to filled state, then opens a confirmation sheet ("Are you sure? This is final.").

**Haptics:**
- Yes tap: `hapticSelection()` on tap, then on confirm sheet "Confirm": `hapticVerdictKept()`.
- No tap: `hapticSelection()` on tap, then on confirm sheet "Confirm": `hapticVerdictBroken()`.
- "Need to check? Text Joe first": `hapticSecondary()`.

**Sound:** Yes confirm fires `soundVerdictKept` synced with `hapticVerdictKept`. No confirm fires `soundVerdictBroken` synced with `hapticVerdictBroken`. **Both fire only on the confirmation sheet's confirm tap, not on the initial Yes/No tap.**

---

### D.2 Derived screens D1–D20

#### D1 — Maker, Vow Kept

**Entrance:** Cross-fade from previous screen. Background phase transition to `.green` if not already.

**Internal animations:**
- liveMark (kept stamp 94×94 rounded square) scales in with `tightSpring`. Halo expands.
- Kicker, h1 "You actually did it.", centerSub, activeCard cascade in (each fadeUp, 200ms apart).
- soundVerdictKept fires synced with hapticVerdictKept at the moment liveMark settles (t=540ms).

**Haptics:**
- liveMark settle: `hapticVerdictKept()`.
- "Make another vow": `hapticPrimary()`.
- "Share what you did": `hapticSecondary()`.
- "Done": `hapticSecondary()`.

**Sound:** soundVerdictKept (locked above).

**Reduce-motion:** liveMark static, no halo, no cascade, sound + haptic still fire.

---

#### D2 — Maker, Vow Broken

**Entrance:** Cross-fade. Background `.blue`.

**Internal animations:**
- NO liveMark animation (intentional absence).
- activeCard slides in from below 16px over `base`.
- Settlement detail card cross-fades in 240ms after activeCard.
- soundVerdictBroken fires synced with hapticVerdictBroken at the moment the activeCard settles.

**Haptics:**
- Screen render (one-time, AsyncStorage gated): `hapticVerdictBroken()`.
- "Make a new vow": `hapticPrimary()`.
- "See the receipt": `hapticSecondary()`.
- "Done": `hapticSecondary()`.

**Sound:** soundVerdictBroken.

---

#### D3 — Witness Draft Page

**Entrance:** Page loads (web or native). Cross-fade in.

**Internal animations:**
- "PENDING SEAL" pill renders with subtle gold-shimmer single pass.
- Vow card content cascades in.

**Haptics (native only):**
- "I'll witness it": `hapticPrimary()`.
- "Pass on this": `hapticSecondary()`. Then confirm sheet: `hapticSheetPresent()`. Confirm: `hapticVoidConfirm()`.

**Sound:** none.

---

#### D4 — Witness Draft-Accepted Confirmation

**Entrance:** Background `.green`. liveMark scale-in. Cascading content.

**Haptics:**
- liveMark settle: `hapticDraftAccepted()` (new wrapper — distinct from full witness-accepted because the vow isn't actually live yet).
- "Got it, I'll wait": `hapticPrimary()`.
- "Make my own vow": `hapticSecondary()`.

**Sound:** none.

---

#### D5–D8 — Witness terminal states (Already-Accepted, Voided, Expired, Superseded)

**Entrance:** Cross-fade. No special motion.

**Internal animations:** static page.

**Haptics:**
- Primary CTA: `hapticPrimary()`.
- Secondary: `hapticSecondary()`.

**Sound:** none.

---

#### D9 — "Other" Custom Stake Sheet

Standard sheet entrance.

**Internal animations:**
- Money input cursor blinks (system-handled).
- Cheeky-line copy adapts to stake value (cross-fade `fast` on each change).
- Invalid input: shake animation (200ms left-right) + brief red tint.

**Haptics:**
- Sheet present: `hapticSheetPresent()`.
- Each digit tap (numeric keyboard): `hapticOtpDigit()`.
- Invalid input shake: `hapticOtpError()`.
- "Set the stake" (creamCta): `hapticPrimary()`.
- "Cancel": `hapticSecondary()`.

---

#### D10 — Witnessless-At-Seal Checkpoint

**Entrance:** Slide-in from right (interstitial in flow).

**Internal animations:**
- Inline contact picker behaves like 03b (recent rows, "Choose contact" sheetCta).
- "Continue solo →" link: subtle pulse on `pulseDot` rhythm to draw attention as the only obvious advance path. Reduce-motion: static.

**Haptics:**
- Contact row tap: `hapticSelection()`.
- "Choose contact": `hapticPrimary()`.
- "Share link instead": `hapticSecondary()`.
- "Continue solo →": `hapticSecondary()`. Then opens D11 with `hapticSheetPresent()`.

---

#### D11 — Go-Solo Confirmation Sheet

Standard sheet entrance.

**Haptics:**
- "Add a witness" (sheetCta): `hapticPrimary()`. Returns to D10.
- "Go solo anyway" (sheetQuiet): `hapticVoidConfirm()` — this is a destructive choice for the social mechanic.

**Sound:** none.

---

#### D12 — Country Code Picker

**Entrance:** Full-screen modal slide-up from below over `base` (iOS standard).

**Internal animations:**
- Search field standard.
- List rows: tappable, ramp on press.

**Haptics:**
- Cancel: `hapticSecondary()`.
- Row tap: `hapticSelection()`.

**Reduce-motion:** modal cross-fades in instead of sliding.

---

#### D13 — Returning-User Sign-In

Same entrance as 04. Same internal animations.

---

#### D14 — Dashboard Empty State

Same as screen 13 entrance, with empty card cross-fading in.

**Internal animations:** small icon (wax-seal outline) gently pulses opacity 0.4 → 0.55 → 0.4 on `halo` rhythm (3.2s). Reduce-motion: static.

**Haptics:** "Make your first vow →": `hapticPrimary()`.

---

#### D15 — Network/Connectivity Error Toast

**Entrance:** Slide-up from bottom over `base` (240ms). Subtle bounce on settle.

**Internal animations:**
- Auto-dismisses after 6 seconds: slide-down over `fast`.
- Tap to retry: scales 0.97 → 1.0 over `fast`, dismisses, retries operation.

**Haptics:**
- Toast appears: `hapticOtpError()` (signals "something went wrong" without being scary).
- Tap to retry: `hapticPrimary()`.

**Sound:** none.

**Reduce-motion:** appears/disappears with cross-fade only.

---

#### D16 — Catastrophic Failure

**Entrance:** Cross-fade. No motion.

**Haptics:**
- Render: `hapticOtpError()` (one-time).
- "Try again": `hapticPrimary()`.
- "Back to dashboard"/"Contact support": `hapticSecondary()`.

---

#### D17 — Push Permission Pre-Prompt

**Entrance:** Cross-fade from screen 06's tap-to-continue (after seal). Background reverts from black to default phone bg.

**Internal animations:**
- Bell icon scales in 0.85 → 1.0 with `tightSpring` at t=200ms. Halo glow pulses once over `slow`.
- Cascading text 200ms apart.

**Haptics:**
- Bell icon settle: `hapticClockStart()` (soft commitment haptic).
- "Sure, notify me": `hapticPrimary()`.
- "Maybe later": `hapticSecondary()`.

**Sound:** none.

---

#### D18 — Witness Verdict Submitted Success + Viral CTA

**Entrance:** Background phase transition based on verdict (`.green` for kept, `.blue` for broken). Cross-fade over `ceremonial`.

**Internal animations:**
- liveMark (kept) or pill (broken) at top.
- Kicker, h1, centerSub cascade in.
- Viral card (gold-tinted, "YOUR TURN?") fades in last with subtle gold-shimmer single pass.

**Haptics:**
- Render: `hapticVerdictKept()` (kept variant) or `hapticVerdictBroken()` (broken variant) — fired ONCE on first present, gated by AsyncStorage.
- "Make your own vow →" (inside viral card): `hapticPrimary()`.
- "Done": `hapticSecondary()`.

**Sound:** kept variant fires `soundVerdictKept` synced with haptic. Broken fires `soundVerdictBroken`. Same as D1/D2.

---

#### D19 — Settings (lite v1)

**Entrance:** Slide-in from right.

**Internal animations:**
- Toggle switches use iOS native animation.
- "Sign out" / "Delete account" rows tap → confirmation sheet.

**Haptics:**
- Row tap: `hapticSecondary()`.
- Toggle: `hapticSelection()`.
- "Sign out" confirm: `hapticPrimary()`.
- "Delete account" confirm: `hapticVoidConfirm()`.

---

#### D20 — History (lite v1)

**Entrance:** Slide-in from right.

**Internal animations:**
- vowCard list cascades.
- Tab switch (if present) cross-fades.

**Haptics:**
- Card tap: `hapticSecondary()`.
- Tab switch: `hapticSelection()`.

---

## E. Cross-screen transitions

| From → To | Transition | Duration |
|---|---|---|
| Screen N → N+1 (in maker creation flow 01–05) | Slide-left | `base` (240ms) |
| Screen N+1 → N (back) | Slide-right | `base` |
| Pre-seal screen → 06 (after PaymentSheet success) | Cross-fade | `slow` (400ms) |
| 06 → 07/07B/08C (after tap-to-continue) | Fade-to-black-then-cross-fade | 300+400ms |
| Detail screen → 09 (when witness accepts in real-time) | Background phase transition + content cross-fade | `ceremonial` (800ms) |
| 09 → 10 (See my vow tap) | Cross-fade | `slow` |
| 10/11/12 → M-Kept (D1) or M-Broken (D2) | Background phase transition + content cross-fade | `ceremonial` |
| 20 → D18 (witness submits verdict) | Background phase transition + cross-fade | `ceremonial` |
| Dashboard → vow detail | Slide-left | `base` |
| Vow detail → dashboard (back) | Slide-right | `base` |
| Any screen → 13B menu | Backdrop blur + panel slide-up | `base` |

---

## F. Implementation notes

**Pre-load on app boot:**
- 3 sound files (Audio.Sound instances).
- AccessibilityInfo current state.
- All Reanimated shared values needed for global state (background phase color).

**Background phase color:** maintained as a single shared value at app root. When a vow's status implies a phase change (witness_accepted_at non-null → green; ends_at < now+24h → gold; ends_at < now → blue), the global shared value animates. Individual screens read it.

**Sound + haptic synchronization:** every sealing/verdict moment uses the `playSyncedFeedback()` helper. Don't fire one before the other.

**Animation testing:** every screen's choreography needs to be testable at reduce-motion ON and OFF in the simulator. Step 9 specs include a manual QA checklist for each.

**Animation correctness in the reviewer's eye:** the design reviewer (Step 6) treats motion that drifts from this doc as a graduation-blocking deviation. Specific quantities (scale 0.4 → 1.0, sealCeremonial spring, t=540ms haptic, etc.) are part of the contract. The reviewer can tell if you used `withTiming(1, { duration: 400 })` instead of `withSpring(1, { stiffness: 120, damping: 18 })` because the result looks different.

**SEAL_TIMELINE constant location:** All screen 06 timing constants export from `expo/lib/seal-timeline.ts`:

```ts
export const SEAL_TIMELINE = {
  startMs: 0,
  sealMarkAt: 100,
  hapticAt: 540,
  soundAt: 540,
  kickerAt: 620,
  titleAt: 820,
  ruleAt: 1020,
  quoteAt: 1280,
  subAt: 1500,
  continueAffordanceAt: 1820,
  continueAffordancePulseMs: 1400,
  exitFadeMs: 300,
  exitTransitionMs: 400,
} as const;
```

Step 9's screen-06 build spec references these directly. Don't redefine.

---

End of Step 4.
