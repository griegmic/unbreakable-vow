# Simplify Vow Sharpening to a Single Screen

## What's changing

The current multi-step sharpening flow (frequency picker → duration picker → deadline/calendar → preview) is being replaced with a **single, clean screen** that handles everything at once.

### **Features**

- [x] **Two paths instead of three**: Vows are either "good enough" (skip straight to witness) or "needs sharpening" (one screen). The old "needs tweak" middle path is removed.
- [x] **Smart suggestion engine**: When a vow needs sharpening, the app pre-fills an editable suggestion based on what the user typed (e.g. "Go to the gym" → "Go to the gym 3 times this week.")
- [x] **Word-number recognition fix**: Words like "three times" or "twice" are now properly recognized as having a frequency, so those vows skip sharpening correctly.
- [x] **No more double-appending**: Fixes a bug where "this week" could appear twice in composed vows.
- [x] **Editable text input**: The suggestion is fully editable — users can tweak the wording however they want.
- [x] **Contextual alternatives**: Below the input, 3 topic-based alternative vows are shown (e.g. gym alternatives for gym vows).
- [x] **"Keep my original wording" escape hatch**: Users can skip the suggestion entirely and proceed with what they originally typed.
- [x] **Re-validation on submit**: If the edited vow is still too vague, a gentle shake animation + hint text appears.

### **Design**

- [x] **Screen title**: "Make it stick"
- [x] **Subtitle**: Explains why specific vows work better
- [x] The user's original vow shown as a reference quote at the top
- [x] A gold-bordered input field pre-filled with the smart suggestion
- [x] A divider with "Or try one of these" followed by tappable suggestion cards
- [x] Primary gold button: "Use this vow →"
- [x] Muted text link below: "Keep my original wording"
- [x] Same dark theme, animations, and haptic feedback as the rest of the app

### **What's removed**

- [x] The frequency chip picker step
- [x] The duration chip picker step  
- [x] The deadline picker step (including the full calendar widget)
- [x] The "soft sharpen" step
- [x] The multi-step preview screen

### **Files affected**

1. [x] **Analysis engine** — Merge "needs tweak" into "vague", add word-to-number normalizer, add single suggestion generator, fix double-append bug
2. [x] **Sharpening screen** — Replace all step-based rendering with one unified screen
3. [x] **Flow logic** — Simplify the skip-refine check to just use the analysis result directly
