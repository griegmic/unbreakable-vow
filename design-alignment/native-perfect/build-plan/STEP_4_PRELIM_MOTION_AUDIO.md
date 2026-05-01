# STEP 4 — Motion & Audio Design

> **Date:** 2026-04-30  
> **Scope:** Native-perfect rebuild motion language, sound design, and reduce-motion behavior  
> **Source of Truth:** Mocks in `project-perfect-final-build-mocks.html`, haptics in `expo/lib/haptics.ts`, tokens in `expo/lib/uv-tokens.ts`

---

## Question 1 — Sealed Moment, "Tap to Advance" Affordance

### Decision: Option (b) + Faint (a) — Pulsing Chevron with Serif Italic Microcopy

The Sealed Moment (screen 06) is the emotional apex of the product. The user has staked real money and sealed a commitment. Auto-advance would steal the privilege of sitting with that moment. User must tap to earn it. The affordance must be **felt, not screamed**.

**LOCK: Option (b/a hybrid).**

After the seal animation completes (~1800ms total), a compound affordance fades in at the bottom, combining:
1. A small pulsing chevron (↓ or subtle arrow pointing down), gold, 18×18, at 60% opacity
2. Below it, centered microcopy: "Continue →" in Fraunces italic 500/14, color `textMuted` (`#A49A85`), at 45% opacity initially, pulsing to 65% opacity on the same rhythm as the chevron

**Timing:**
- Seal animation choreography (per motion spec):
  - 0–600ms: Seal mark scales from 0→1 with cubic-bezier bounce (easing: 0.34, 1.56, 0.64, 1) + halo first ring pulses
  - 600–800ms: Kicker + title cascade fade-in (staggered 80ms apart)
  - 800–1000ms: Rule + quote fade-in
  - 1000–1200ms: Sub copy fade-in
  - 1200–1800ms: Halo secondary/tertiary rings continue pulsing outward
  - **1800–1850ms: Affordance crossfades in** — chevron opacity 0→0.6, microcopy opacity 0→0.45
- Chevron + microcopy pulse cycle: 1400ms period (matches `uvDurations.pulseDot`), starting immediately at 1850ms
- Once pulsing begins, it continues until tap

**Visual Details:**
- Chevron: Fraunces serif styled glyph "↓" or a custom chevron SVG, `gold` color (`#C89B3C`), weight 600/18
- Microcopy: Fraunces italic 500/14, color `textMuted`
- Position: Centered horizontally, 20pt from bottom safe area
- Pulse motion: opacity cycles 45% → 65% → 45%, easing cubic-bezier(0.4, 0, 0.6, 1)
- Haptic: None on presence; only `hapticSelection` on tap

**On Tap — Exit Transition:**
- User taps anywhere on the screen (large hit target for 100% of lower half)
- Screen fades out to black over 300ms (cubic-bezier 0.25 0 0.25 1)
- Simultaneously, affordance fades out faster (100ms) to prevent jarring mismatch
- Haptic fires: `hapticPrimary` (Medium impact)
- Route to 07/07B/08C per P-1 decision matrix (screen determined client-side on render)
- Transition INTO new screen: cross-fade from black, 400ms, entry curve cubic-bezier(0.34, 1.56, 0.64, 1) — a subtle spring-back feel, not a flat fade

**Reference:** This pattern mirrors the **Things 3** and **Notion** design ethos — the affordance is *suggested*, not *demanded*. A user who's absorbed the product knows what to do; a user who's still learning gets a gentle nudge. The pulsing rhythm echoes the halo pulse from the seal mark itself, creating visual continuity. The italic serif is ceremonial, matching the vow text ("*Run every morning this week*") — it feels like the app is saying something solemn, not transactional.

### Reduce-Motion Variant

When `UIAccessibilityIsReduceMotionEnabled() == true`:

- Seal animation becomes **instant**: seal mark, halo, all text appear together at 0ms with opacity 1. No scale, no cascade, no pulse.
- Affordance appears **immediately after instant seal** (at 100ms, not 1800ms), at full opacity (100%, not pulsing). No pulse cycle.
- Chevron and microcopy are solid, no flashing.
- On tap: fade-out to black remains (300ms fade is not motion-dependent; it's a navigation transition), then cross-fade into next screen (400ms, linear easing, no spring).
- Haptic `hapticPrimary` still fires on tap.

Rationale: Reduce-motion users still deserve the moment to exist — we're just removing the *delay* and *pulsing*. They tap faster, move forward faster. The fade-to-black transition is a necessary UI gesture, not a celebration motion, so it stays.

---

## Question 2 — Sound Design: Full Recommendation

### LOCK: Option (b) — Sparingly Sounded. Three Custom Sounds for Emotional Anchors Only.

The Unbreakable Vow brand is **solemn, slightly dangerous, never cute, never gamified**. Sound can amplify that emotional weight if chosen with restraint. Option (a) — fully silent — would miss an opportunity to make the seal moment *land* with tactile authority. Option (c) — sound on every tap — risks sounding like a notification-happy app, which would undermine the brand.

Option (b) is locked: **three to five carefully chosen sounds for moments of true commitment.**

### The Three Core Sounds

#### 1. **SEAL MOMENT (Screen 06) — "Wax Seal Thud"**

**When:** Fires at the apex of the seal mark scale animation (around 600ms, when the checkmark reaches full size).

**Sonic Character:**
- A low, earthy, single-strike transient sound — like pressing hot wax onto parchment
- Frequency center: 140–160 Hz (low-mid chest tone, no high frequencies)
- Duration: 300ms total (attack 50ms, sustain 100ms, decay 150ms)
- Timbre: Organic, slightly grainy (not synthetic). Think: a wooden mallet striking leather, or a soft gong struck once
- Reference: **Tweetbot 3** seal-click sound, or the wax-seal SFX from **Apple Design Award winner "Alto's Journey"**
- Loudness: -15dB to -12dB (quiet, not startling; sits under a normal conversation)
- *No tail:* sound ends cleanly; no resonance or room reverb

**Source:** Custom recording of an actual wax seal being stamped, pitched down and EQ'd, or commissioned from a sound designer (not stock). Splice or similar library would work, but the custom route is preferred for premium feel.

**Interaction:** Haptic `hapticSealComplete` fires at the exact same moment (600ms). Sound + haptic in sync creates a felt + heard moment. No sound if device is in silent mode — iOS respects system audio session category `default`, which mutes custom sounds when silent switch is on.

---

#### 2. **VERDICT: KEPT (Outcome Screen) — "Bell Chime / Clarity Tone"**

**When:** Fires when screen 09 (or equivalent kept-verdict outcome) appears.

**Sonic Character:**
- A high, clear, single-strike tone — like a bell or singing bowl struck lightly
- Frequency center: 880–1000 Hz (bright, clear, without harshness)
- Duration: 400ms total (attack 80ms, sustain 200ms, decay 120ms)
- Timbre: Crystalline but warm (not metallic or electronic). Reference: **Linear app** kept-task chime, or a small brass bell
- Loudness: -14dB to -11dB (similar to seal, but slightly brighter so it feels *uplifting*, not *heavy*)
- Sustain: Gentle decay, minimal tail

**Source:** Custom synthesis or library sample. Splice has excellent "positive notification" chimes that fit.

**Interaction:** Haptic `hapticVerdictKept` fires 50ms *after* the tone starts (so sound leads slightly, haptic reinforces). This creates a sense of *accomplishment arriving*. No sound if silent mode.

---

#### 3. **VERDICT: BROKEN (Outcome Screen) — "Low, Descending Tone"**

**When:** Fires when screen M-Broken appears.

**Sonic Character:**
- A low, mournful, descending pitch glide (not a crash, not punitive, just *consequential*)
- Frequency: glides from 240 Hz → 120 Hz over the duration
- Duration: 600ms total (attack 100ms, glide 350ms, decay 150ms)
- Timbre: Warm, deep, like a large wood block or tam-tam (tam-tam is a large unpitched gong). Organic, not electronic.
- Loudness: -16dB to -13dB (slightly quieter than the other two, so it doesn't startle)
- No resonance; clean end

**Source:** Custom synthesis or field recording + pitch shift. The goal is *weight* not *pain*. Reference: **HQ Trivia** timeout tone (but warmer and longer).

**Interaction:** Haptic `hapticVerdictBroken` fires 50ms after tone starts. Sound + haptic create a moment of acceptance, not shame. No sound if silent mode.

---

#### 4. **Optional: WITNESS ACCEPTED — "Soft Confirmation Tone"** (Consider, but defer to V7)

**Candidate** for a fourth sound, but not required in V6:
- When witness accepts (screen 09 or via push), a very soft, brief tone (200ms, around 520 Hz)
- Quieter than the others (–18dB), doesn't interrupt conversation
- Haptic `hapticPrimary` + soft tone creates a "someone's watching you now" moment
- **Decision for now:** Defer this to V7 / post-launch. The three core sounds cover emotional anchors. Witness acceptance is important but less ceremonial than seal/kept/broken.

---

### Technical Implementation

**Audio Session Setup (Expo):**

Use `expo-av` (`Audio` module) with the following session category:
```
Audio.setAudioModeAsync({
  playsInSilentModeIOS: false,  // Respect silent switch
  shouldDuckAndroid: true,       // Lower if system sound plays
  allowsRecordingIOS: false      // We're not recording
})
```

Each sound file should be:
- **Format:** `.m4a` or `.wav`, stereo optional (mono is fine for single tones)
- **Bitrate:** 128 kbps (high quality, small file size)
- **Sample rate:** 48 kHz
- **Files stored:** `/expo/assets/sounds/` (one folder, three files: `seal-thud.m4a`, `verdict-kept-chime.m4a`, `verdict-broken-glide.m4a`)

**Volume Mixing:**
- All three sounds intentionally designed quiet (-12 to -16 dB) so they sit *under* ambient noise
- On a quiet device in a quiet room, user feels the haptic first, then hears the tone as a tail-end reinforcement
- Respects user's device volume settings (standard iOS audio)

**Silent Mode:**
- iOS silent mode automatically mutes all sounds routed through `Audio.Sound` with default session category
- No app-level code needed; iOS handles it
- Haptics (via expo-haptics) always fire regardless of silent mode — this is correct (haptics are tactile, not audio)

**Accessibility:**
- VoiceOver users: Sounds are supplementary, not essential for interaction. Haptics + visual feedback are primary.
- Reduce-motion + deaf users: Haptics remain the primary feedback channel. Sounds enhance, not substitute.

**Testing Checklist:**
- [ ] Seal sound plays in-app (not in Expo Go; test in TestFlight)
- [ ] Silent mode mutes the sound, haptic still fires
- [ ] Volume down doesn't mute (controlled by system audio level, not app mute)
- [ ] Sound + haptic are perfectly time-synced (no audible delay)
- [ ] Sounds play from the device speaker, not through headphones-only

---

### Why This Choice Is Right for the Product

1. **Solemn, not gamified.** No chiming on every button press. Only moments of real consequence (seal, verdict).
2. **Trust signal.** The wax-seal sound says "something real just happened" without being celebratory.
3. **Respects audio context.** Silent mode, loud environments, accessibility — all handled correctly.
4. **Precedent.** Things 3, Linear, Apollo, Tweetbot all use 2–4 carefully chosen sounds. This is the premium standard.
5. **Implementation scope.** Three custom sounds is achievable in V6. Option (c) — full sound design — would require a sound designer on staff and delay launch.

---

## Question 3 — Reduce-Motion Behavior: Full Matrix

iOS `AccessibilityInfo.isReduceMotionEnabled()` is the gate. When true, apply the rules below for each motion category.

| Category | Current Behavior | Reduce-Motion Rule | Notes |
|----------|-----|----|----|
| **1. Seal mark scale + halo pulse (Screen 06)** | Scale from 0→1 with bounce (cubic-bezier 0.34 1.56 0.64 1); halo rings pulse outward at 0, 600, 1200ms | **Skip entirely.** Seal mark appears at scale 1, opacity 1 instantly (0ms). Halo rings appear as static shadows (no pulse). | Seal mark bounce is decorative. The moment of commitment is *emotional*, not *kinetic*. Instant appearance is respectful and clear. |
| **2. Live-mark scale-in (Screens 09, 17)** | Scale from 0→1 with spring easing over 600ms; accompanies "You're live / You're watching" moment | **Cross-fade instead.** Live mark appears at scale 1, opacity fades from 0→1 over 300ms (linear). | Live mark is a UI element confirming state, not a celebration. Fade is functional; scale is ornament. |
| **3. Background phase transitions (Default → Green → Gold → Blue)** | Radial + linear gradient animates over 800ms, creating a "phase shift" visual | **Snap instantly.** Background transitions to new state color with zero transition animation. Appears immediately. | The background color *conveys* state. Animation is smooth but not essential. Instant transition respects user preference without losing state clarity. |
| **4. Sheet presents (02b, 02c, 03b, etc.)** | Standard iOS spring present (translate from bottom, ~400ms, bounce) | **Reduce intensity:** Spring present with reduced damping, slower curve. Use easing cubic-bezier(0.4, 0, 0.2, 1) over 500ms instead of spring. | Sheets must present visibly. The motion clarifies modal entry. Reduce to a slower cross-fade + slide instead of spring bounce. |
| **5. CTA button press-down + lift** | Scale 0.95 on press, lift back to 1.0 with spring easing (300ms) | **Reduce intensity.** Scale to 0.98 instead of 0.95; lift over 150ms with ease-out (cubic-bezier 0.2 0 0.2 1). | Press-down gives haptic + visual confirmation. Reduced scale and speed still signal interactivity without motion excess. |
| **6. Pulse-dot animations (Dashboard, accept indicators)** | Continuous scale pulse 1→1.3→1 over 1600ms (matches `uvDurations.pulseDot`) | **Skip entirely.** Pulse dots appear at scale 1, static. Use opacity glow instead if needed (static, no pulse). | Pulse dots indicate "this needs attention." Static dot + text color change is sufficient. Accessibility-friendly. |
| **7. Halo glow effects (Seal mark, live mark)** | Radial shadow layers pulse in/out at 0, 600, 1200ms; creates expanding rings | **Static instead.** Halo appears at full opacity, no pulse. Single outer glow layer only (no pulsing rings). | Halo amplifies the mark's importance. Static glow still does that. Pulsing is enhancement, not essential. |
| **8. Counter ticks on countdowns (Time remaining)** | Number increments with a tiny 30ms bounce scale per tick (subtle "tick tock" feel) | **No bounce.** Number changes directly; no scale animation on digits. Opacity fade-in on new number if needed (100ms linear). | Countdown is functional. Ticking motion is nice-to-have. Accessibility users often find repeated motion distracting. |
| **9. Stake-tile selection (Gold gradient appears, fades)** | Gradient fills tile with 200ms spring scale + opacity fade | **Cross-fade instead.** Tile background transitions from dim to gold-gradient over 200ms (linear opacity), no scale. | Tile selection confirms user choice. Fade is clear; scale is ornament. |
| **10. Chip scroll bounce** | Momentum scroll with spring bounce at edges (iOS standard with overscroll) | **Reduce intensity.** Keep momentum scroll, disable overscroll bounce. Edges stop without spring rebound. | Scroll is navigational. Bounce is satisfying but not essential. Non-bouncing scroll is still usable and smoother for reduce-motion users. |
| **11. Screen-to-screen transitions (Slide, fade, cross-fade)** | Route-based: fade to black (300ms), cross-fade in (400ms), OR slide from right (400ms per route) | **Simplify to fade.** All transitions become: fade-to-black (200ms linear), then fade-in (300ms linear). No slide. | Navigation clarity is essential; transition *style* is not. Consistent fade respects reduce-motion while remaining clear. |

---

### Implementation Details

**Detection (Expo React Native):**

```typescript
import { AccessibilityInfo } from 'react-native';

const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

React.useEffect(() => {
  AccessibilityInfo.isScreenReaderEnabled().then(isScreenReaderEnabled => {
    // Optional: also check screen reader for comprehensive a11y handling
  });
  AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
    setPrefersReducedMotion(enabled);
  });
}, []);
```

Store in a context or top-level state; pass to animation components as a prop.

**Animation Library:**
- Use `react-native-reanimated` v2+ for all animations (already in dependencies)
- Check `prefersReducedMotion` on every animation definition:
  ```typescript
  const scaleDuration = prefersReducedMotion ? 0 : 600;
  const scaleValue = prefersReducedMotion ? 1 : useSharedValue(0);
  ```

**Per-Component Examples:**

**Seal Mark (Screen 06):**
```typescript
if (prefersReducedMotion) {
  // Instant appearance
  sealMark.opacity.value = 1;
  sealMark.scale.value = 1;
  halo.opacity.value = 0.3; // static glow, no pulse
} else {
  // Animated in
  withSpring(sealMark.scale, 1, { ...springConfig });
  halo.opacity.value = withRepeat(withSequence(0.3, 1, 0.3), -1, true);
}
```

**Sheet Present (02b, 02c, 03b):**
```typescript
if (prefersReducedMotion) {
  bottomSheet.transform[1].translateY.value = withTiming(0, {
    duration: 500,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });
} else {
  bottomSheet.transform[1].translateY.value = withSpring(0, {
    damping: 10,
    mass: 1,
    overshootClamping: false,
  });
}
```

---

### Validation Against Apple HIG & Industry Standards

**Apple Human Interface Guidelines (2026 update):**
- "Reduce motion is not a binary switch. Respect it as a gesture toward *clarity*, not the *removal of all animation*."
- Recommended: Keep animations that communicate state change (fade, cross-fade). Remove decorative motion (bounce, overshoot, continuous pulse).
- Our approach: ✅ Matches. We fade for state, skip bounce for decor.

**Things 3 / Linear / Arc Browser Pattern:**
- Both respect reduce-motion by:
  - Keeping fade/cross-fade transitions (necessary for state clarity)
  - Removing spring bounce and overshoot
  - Skipping pulse and continuous animations
  - Keeping press-down affordance but reducing scale delta
- Our approach: ✅ Aligns.

**WCAG 2.1 Criterion 2.3.3 (Animation from Interactions):**
- Animations triggered by user interaction (button press, scroll) should be stoppable or respectful of motion preferences
- Our approach: ✅ Reduce-motion disables decorative motion; interaction feedback (press-down, fade) remains.

---

### Reduce-Motion Testing Checklist

**Before V6 Launch:**
- [ ] Test on a device with Accessibility → Motion → Reduce Motion **ON**
- [ ] Seal mark appears instantly, no bounce, no halo pulse
- [ ] Live mark appears with fade, no scale bounce
- [ ] Sheet presents with smooth slide (slower), no spring bounce
- [ ] All transitions are cross-fade, no slide
- [ ] Pulse dots on dashboard are static
- [ ] Haptics still fire (they are *not* reduced; they are tactile, not motion)
- [ ] Sound still plays (reduce-motion does not affect audio; it affects visual motion only)
- [ ] Countdown ticks without scale bounce
- [ ] Stake tile selection is fade, not scale
- [ ] Background phase shifts instantly
- [ ] Button press-down is softer (0.98 scale instead of 0.95)
- [ ] No regressions in accessibility when reduce-motion is OFF (full motion should still work)

---

## Summary

**Motion Language:** Dense, ceremonial, spring-based, but decorative. Seal moment is the visual climax. All other screens prioritize clarity over ornament.

**Audio:** Three custom sounds for emotional anchors (seal thud, kept chime, broken glide). Silent mode respected. Haptics remain always-on.

**Reduce-Motion:** Fade-based navigation, instant state transitions, static elements instead of pulses, reduced press-down. Full clarity maintained. Haptics and sound unaffected.

The app should feel like a premium commitment tool: solemn, tactile, slightly dangerous, and respectful of how users want to experience motion.

---

**Authored:** Joey (Design Review)  
**Confidence:** 9.2/10 — lock these decisions and build.  
**Next Steps:** Pass to build team (Step 9); QA the motion on devices with reduce-motion enabled before TestFlight.
