# Prompt: Move Oath Text Before Checkbox + Add Optional "Why" Field

## What to build

Two changes to `seal.tsx`: (1) move the dramatic oath text so it's visible BEFORE the user checks the box, not only as a flash after, and (2) add an optional "Why does this matter?" text field.

## Why

The psychologically weighty moment (reading "I solemnly swear to keep my word this week") currently happens AFTER the commitment, not before. Users should feel the weight, then commit. 3 of 5 UX experts recommended this change.

## Current behavior in seal.tsx

**The swear card** (bottom of screen, before sealing):
- Shows a checkbox + "I solemnly swear" as a title (18px, serif font)
- Below that: "to honor this vow, to be honest about my progress, and to accept the consequences if I fail." as body text (14px)

**The oath flash** (appears AFTER sealing):
- Full-screen overlay with "I solemnly swear\nto keep my word this week." in large serif text (26px, gold)
- Fades in, holds, fades out over ~1.5 seconds
- Only visible after `sealed` becomes true

## Changes

### 1. Add full oath text INSIDE the swear card, BEFORE the checkbox

Insert the dramatic oath text above the checkbox row in the swear card. The user reads it, feels the weight, then taps the checkbox to commit.

New swear card layout (top to bottom):
1. **Large oath text** — "I solemnly swear to keep my word this week." in `serifFont`, `palette.goldBright`, 22px, centered, with generous line-height (34px). This is the hero moment.
2. **Thin gold divider** — 1px, 60% width, centered, `rgba(212,162,79,0.2)`, marginVertical 16
3. **Checkbox row** (existing) — checkbox + "I solemnly swear" title + body text. Keep as-is.

### 2. Keep the post-seal oath flash

Don't remove the oath flash overlay that appears after sealing. It now serves as REINFORCEMENT — the user already read the text, and seeing it fill the screen after committing creates an echo effect. Keep the existing animation unchanged.

### 3. Add optional "Why does this matter?" text field

Below the summary RitualCard (which shows THE VOW, WITNESS, AT STAKE, etc.) and above the proof mode card (if Vowkeeper) or the swear card (if human witness), add:

```
<RitualCard>
  <Text style={whyLabel}>Why does this matter to you? (optional)</Text>
  <TextInput
    style={whyInput}
    placeholder="This matters because..."
    placeholderTextColor={palette.textMuted}
    value={whyText}
    onChangeText={setWhyText}
    multiline
    numberOfLines={2}
    maxLength={200}
  />
</RitualCard>
```

Styles:
- `whyLabel`: `palette.textSecondary`, 14px, fontWeight 500
- `whyInput`: `palette.text`, 15px, lineHeight 22, minHeight 48, backgroundColor `palette.surfaceElevated`, borderRadius 12, padding 14, borderWidth 1, borderColor `palette.border`

Add `whyText` as local state (`useState('')`). This field is purely local for now — it doesn't need to be stored in vow-flow context. We'll wire it to persistence later.

## Design tokens

Use existing `palette` and `serifFont` values from `constants/unbreakable.ts`. No new colors.

## What NOT to change

- Do not modify the seal animation, glow effect, or check mark animation
- Do not modify the summary card content
- Do not modify the proof mode card (Vowkeeper section)
- Do not change the navigation (the `router.push` call)
- Keep all existing `testID` props
- Do not modify any other files
