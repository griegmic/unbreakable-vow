# Unbreakable Vow — Sprint 1 UX Overhaul

## What this app is

Unbreakable Vow is a stakes-based accountability app. Users type a commitment, put real money on it, assign a witness, and seal it in a ceremony. Dark-and-gold luxury aesthetic. React Native + Expo with file-based routing (`app/` directory). Design tokens live in `constants/unbreakable.ts` (`palette`, `serifFont`). Shared UI components live in `components/vow-ui.tsx` (`RitualScreen`, `TitleBlock`, `PrimaryButton`, `SecondaryButton`, `RitualCard`, `VowPreview`, `BackButton`).

## What we're changing and why

We're removing friction, adding a viral share mechanic, and tightening the flow. The app currently has too many screens, too many redundant info displays, and no shareable artifact. These changes are based on a UX audit by 5 product experts who unanimously agreed on every item below.

---

## Change 1: Create shareable vow certificate (NEW SCREENS)

### Create `components/vow-certificate.tsx`

A pure, stateless View designed to be captured as a share image via `react-native-view-shot`.

**Props:** `vowText: string`, `stakeAmount: number`, `sealDate: string`

**Design (must look premium — like a luxury wax-seal document, not an app screenshot):**

- Fixed 9:16 aspect ratio (Instagram Stories optimized)
- Background: `palette.bg` (#05070B)
- Centered gold radial glow behind the vow text: a View ~300x300, borderRadius 300, backgroundColor `rgba(212,162,79,0.15)`, position absolute, ~40% from top
- Top center: "Unbreakable Vow" in `palette.goldBright`, 11px, letter-spaced, subtle
- Center: vow text in `serifFont` (Georgia on iOS / serif on Android), `palette.goldBright`, 22-26px, centered, generous line-height — this is the hero element
- Below vow: thin gold rule (1px, ~40% width, centered, `rgba(212,162,79,0.3)`)
- Below rule: "$XX at stake" in bold `palette.goldBright`, 18px (use the stakeAmount prop)
- Below that: "Sealed {sealDate}" in `palette.textMuted`, 13px (use the sealDate prop — format as readable date like "April 5, 2026")
- Bottom: "unbreakablevow.app" in `palette.textMuted` at ~60% opacity, 10px
- **NO** witness name, **NO** QR code, **NO** "download the app" CTA, **NO** app store badges

### Create `app/certificate.tsx`

New screen showing the certificate full-screen with two buttons:

- **"Share your vow"** (PrimaryButton) — uses `captureRef` from `react-native-view-shot` to capture ONLY the certificate View as PNG (`{ format: 'png', quality: 1, result: 'tmpfile' }`), then calls `Share.share({ url: imageUri })` from `react-native`. Wrap the certificate View in a ref for capture.
- **"Continue"** (SecondaryButton) — navigates to `/live`

Pull vow data from `useVowFlow()`: use `activeVowText` for the vow text, `vow.stake.amount` for the stake, and `new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })` for the seal date.

Register this route in `_layout.tsx` by adding `<Stack.Screen name="certificate" />` to the Stack.

### Install dependency

```
npx expo install react-native-view-shot
```

---

## Change 2: Update seal.tsx — new navigation + oath text before checkbox

Two changes to `seal.tsx`:

### 2a. Change navigation target

Find the `router.push('/sent')` call inside the `setTimeout` callback in `handleSeal`. Change it to `router.push('/certificate')`. Change ONLY the route string — do not modify the setTimeout delay, the animation, or anything else in that function.

### 2b. Move oath text before the checkbox

**Current:** The swear card at the bottom of the screen (rendered when `!sealed`) has:
- A checkbox + "I solemnly swear" title (18px, serif)
- Body text: "to honor this vow, to be honest about my progress, and to accept the consequences if I fail."

The dramatic full oath ("I solemnly swear to keep my word this week.") only appears as a flash overlay AFTER sealing.

**Target:** Add the full oath text INSIDE the swear card, ABOVE the checkbox row. The user reads the dramatic text first, then commits by checking the box.

New swear card layout (top to bottom):
1. **Full oath text** — "I solemnly swear{'\n'}to keep my word this week." in `serifFont`, `palette.goldBright`, 22px, textAlign center, lineHeight 34, marginBottom 16. This text matches what's currently in the `oathFlashText` style.
2. **Thin gold divider** — a View with height 1, width '60%', alignSelf 'center', backgroundColor `rgba(212,162,79,0.2)`, marginBottom 16
3. **Existing checkbox row** — the Pressable with checkbox + "I solemnly swear" title + body text. Keep this exactly as-is.

**Keep the post-seal oath flash overlay** (`oathFlashOpacity` animation). It now serves as reinforcement — the user reads the oath, commits, then sees it fill the screen as an echo. Don't remove or modify the flash animation.

---

## Change 3: Remove sent screen and auth screen from flow

### 3a. Update stake.tsx — skip auth

Find the `router.push('/auth')` call in stake.tsx (in the `handleContinue` function). Change it to `router.push('/seal')`. Keep the `setStake()` call right before it unchanged.

### 3b. Update _layout.tsx — remove routes

Remove `<Stack.Screen name="sent" />` and `<Stack.Screen name="auth" />` from the Stack navigator in `_layout.tsx`. Do NOT delete the actual `sent.tsx` or `auth.tsx` files — just remove them from the navigation stack.

---

## Change 4: Remove VowPreview from witness and stake screens

### 4a. In `witness.tsx` (or `witness-picker.tsx` if it already exists)

Find ALL instances of `<VowPreview text={activeVowText} compact />` and remove them. There may be up to 3 instances (in different mode renders). After removal, clean up unused imports: remove `VowPreview` from the component import if no longer used in the file. Remove `activeVowText` from the `useVowFlow()` destructuring only if it's not used elsewhere in the file.

### 4b. In `stake.tsx`

Find `<VowPreview text={activeVowText} compact />` and remove it. Clean up the `VowPreview` import and `activeVowText` destructuring if no longer used.

---

## Change 5: Remove verdict confirmation modal

In `witness-verdict.tsx`:

### 5a. Simplify the `handleCardTap` function

Replace the current logic with direct navigation for BOTH choices (kept and broken). The current code navigates directly for "broken" but shows a confirmation modal for "kept." Make both behave the same — tap the card, get haptic feedback, navigate.

New `handleCardTap` logic:
```javascript
const handleCardTap = useCallback((choice: VerdictChoice) => {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  if (isVowkeeper) {
    setSelected(choice);
    if (choice === 'kept') {
      Animated.timing(keptColorAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
      Animated.timing(brokenColorAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    } else {
      Animated.timing(brokenColorAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
      Animated.timing(keptColorAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    }
  }

  if (choice === 'kept') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  const route = choice === 'kept' ? '/vow-kept' : '/vow-broken';
  setTimeout(() => router.push(route), isVowkeeper ? 350 : 150);
}, [isVowkeeper, keptColorAnim, brokenColorAnim]);
```

### 5b. Remove the Modal entirely

Delete the entire `<Modal>` block and all its children. Also remove:
- `confirmVisible` state (`useState`)
- `pendingVerdict` state (`useState`)
- `handleConfirm` callback
- `handleCancel` callback
- `Modal` from the `react-native` import
- All modal-related styles: `modalOverlay`, `modalCard`, `modalIconWrap`, `modalIconKept`, `modalIconBroken`, `modalTitle`, `modalBody`, `confirmButton`, `confirmButtonKept`, `confirmButtonBroken`, `confirmButtonText`, `cancelButton`, `cancelButtonText`

---

## Change 6: Collapse "How it works" on home screen

**NOTE:** If the "How it works" section has already been removed from `index.tsx`, skip this change entirely.

If it still exists (a `stepsCard` View with three step items — "Write your vow", "Choose a witness", "Put money on it"):

Replace the always-visible card with a collapsible section:
- Add state: `const [stepsVisible, setStepsVisible] = useState(false)`
- Replace the stepsCard with a `Pressable` showing "How does this work?" in `palette.textMuted`, 14px, centered, with a chevron icon (ChevronDown when collapsed, ChevronUp when expanded — import from lucide-react-native)
- On tap: toggle `stepsVisible` and animate the steps content in/out using `Animated.timing` on height and opacity
- The step content itself stays identical — same icons, same copy, same styles
- Default state: collapsed (only the link text shows)

---

## What NOT to change

- Do NOT modify `components/vow-ui.tsx`
- Do NOT modify `providers/vow-flow.tsx`
- Do NOT modify `constants/unbreakable.ts`
- Do NOT modify `app/refine.tsx`
- Do NOT modify `app/live.tsx`, `app/vow-kept.tsx`, or `app/vow-broken.tsx`
- Do NOT delete any files — only remove routes from `_layout.tsx`
- Keep ALL existing haptic feedback patterns
- Keep ALL existing `testID` props
- Keep ALL existing animations (seal glow, oath flash, etc.) unless explicitly modified above
- Use ONLY existing design tokens from `palette` and `serifFont` — do not introduce new colors or fonts
