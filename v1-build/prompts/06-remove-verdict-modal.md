# Prompt: Remove Verdict Confirmation Modal

## What to build

Remove the confirmation modal from `witness-verdict.tsx`. When users tap "Kept" or "Broken," navigate directly to the outcome screen instead of showing "Are you sure?"

## Why

The user already made a deliberate choice by tapping a verdict card. The confirmation modal adds an unnecessary tap at the most emotionally charged moment in the app. 5 of 5 UX experts flagged this.

## Current behavior in witness-verdict.tsx

1. User taps a verdict card ("Nailed it." or "Didn't make it.")
2. `handleCardTap` is called — for "broken" it navigates directly (good), but for "kept" it:
   - Sets `pendingVerdict` state
   - Opens a `<Modal>` asking "Confirm: you kept the vow?" / "Confirm: you broke the vow?"
   - User must tap "Confirm" to proceed or "Go back" to cancel
3. `handleConfirm` then calls `router.push('/vow-kept')` or `router.push('/vow-broken')`

## Changes

### 1. Simplify `handleCardTap` — navigate directly on tap

Replace the current `handleCardTap` logic with direct navigation for BOTH choices:

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

### 2. Remove the Modal component entirely

Delete the entire `<Modal>` block and all its children (the overlay, modal card, confirm button, cancel button). Also remove these now-unused pieces:
- `confirmVisible` state
- `pendingVerdict` state
- `handleConfirm` callback
- `handleCancel` callback
- All modal-related styles: `modalOverlay`, `modalCard`, `modalIconWrap`, `modalIconKept`, `modalIconBroken`, `modalTitle`, `modalBody`, `confirmButton`, `confirmButtonKept`, `confirmButtonBroken`, `confirmButtonText`, `cancelButton`, `cancelButtonText`

### 3. Clean up imports

Remove `Modal` from the `react-native` import if it's no longer used anywhere in the file. Keep `CircleDollarSign` if it's used in the non-Vowkeeper verdict buttons.

## What NOT to change

- Keep all the verdict card UI (the Vowkeeper animated cards and the witness static cards)
- Keep the color animations for Vowkeeper mode
- Keep all haptic feedback
- Keep the vow summary card at the top
- Keep the disclaimer text at the bottom
- Do not modify any other files
