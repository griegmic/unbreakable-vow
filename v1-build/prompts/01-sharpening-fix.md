# Rork Prompt: Fix Vow Sharpening Flow

## What this app is
Unbreakable Vow is a stakes-based accountability app. Users type a commitment, put real money on it, and assign a witness who judges if they kept it. The sharpening flow helps users write vows that are specific enough for a witness to judge as "kept" or "broken."

## What's wrong now
The current sharpening flow has 3 classification paths (`vague`, `needs_tweak`, `already_good`) with multiple screens (frequency step, duration step, deadline step, vague suggestions). It's over-engineered and has bugs. We're simplifying to 2 paths and fewer screens.

## Files to modify
- `constants/unbreakable.ts` — the analysis engine (`analyzeVow`, `composeVow`, `detectVowNeeds`, etc.)
- `app/refine.tsx` — the sharpening UI
- `providers/vow-flow.tsx` — the `shouldSkipRefine` function

Do NOT modify: `app/index.tsx`, `components/vow-ui.tsx`, `app/witness.tsx`, `app/stake.tsx`, or any other screens. Only touch the three files listed above.

## The new sharpening flow

### Two paths instead of three

**Path 1: Good enough → skip refine entirely**
The vow has a clear action AND at least one measurable element (number, frequency word, deadline, or negation with a time window). Examples:
- "Go to the gym 3 times this week" → good enough
- "No takeout all week" → good enough
- "Read every night before bed" → good enough
- "Run 5k by Saturday" → good enough
- "Wake up before 7 every weekday" → good enough

When good enough: `shouldSkipRefine` returns true in `vow-flow.tsx`, `index.tsx` skips straight to `/witness`. No refine screen at all.

**Path 2: Needs sharpening → one single screen**
Everything else goes to the sharpening screen. This replaces ALL of the current multi-step flow (vague suggestions, frequency step, duration step, soft_sharpen step). One screen handles everything.

### The single sharpening screen design

Screen title: **"Make it stick"**
Subtitle: **"Specific vows are 3x more likely to stick. Your witness has to call this 'kept' or 'broken' — make it clear."**

Layout from top to bottom:

1. **The user's original vow** displayed as a quote/reference (use the existing `VowPreview` component)

2. **An editable text input** pre-filled with a contextual suggestion based on what they typed. This is NOT read-only — the user can tap to edit the suggestion text. Label above the input: "YOUR VOW" (same style as the current vague input shell).

3. **"Use this vow →" primary button** at the bottom (uses existing `PrimaryButton`)

4. **"Keep my original wording"** as a text link below the button (uses existing `SecondaryButton` style but text-only). This takes the user's original raw input and goes to `/witness`.

### How to generate the pre-filled suggestion

Replace the current multi-step approach (separate frequency, duration, deadline screens) with a single function that takes the user's input and returns a complete suggested vow. The suggestion adds ONLY what's missing:

**Topic detection via keyword matching** (expand the existing `getContextualSuggestions` approach but return a single composed suggestion, not three options):

```
Input contains gym/workout/exercise/lift/train → default frequency: "3 times this week"
Input contains run/jog → default frequency: "3 times this week"
Input contains walk/steps/hike → default frequency: "every day this week" or "10,000 steps every day this week"
Input contains read/book → default: "every night this week"
Input contains meditat/mindful → default: "every morning this week"
Input contains write/code/create → default: "for 60 minutes, 4 days this week"
Input contains study/learn/practice → default: "for 45 minutes, 4 days this week"
Input contains eat/food/cook/takeout/diet/health → default: "all week" (negation framing)
Input contains drink/alcohol/sober → default: "all week"
Input contains phone/screen/social/scroll → default: "all week"
Input contains sleep/bed/wake/morning → default: "every weekday"
Input contains send/submit/finish/complete/ship/launch → default: "by Friday at 5pm"
Fallback → append "this week"
```

The suggestion should read naturally. Take the user's original text, clean it up (capitalize first letter, remove trailing punctuation), and append the missing piece. Examples:

- "Go to the gym" → "Go to the gym 3 times this week."
- "Read more" → "Read every night this week."
- "No junk food" → "No junk food, all week."
- "Finish the pitch deck" → "Finish the pitch deck by Friday at 5pm."
- "Walk more" → "Walk 10,000 steps every day this week."
- "Meditate" → "Meditate every morning this week."
- "Run" → "Run 3 times this week."

If the input ALREADY has a frequency/time but is missing something else, don't double-add. Check before appending:
- If input already contains "this week" / "all week" / "every" / "daily" → don't add a time window
- If input already contains a number + "times"/"x" → don't add a frequency
- If input already contains "by" + a day/date → don't add a deadline

### Bug fixes to include

**Bug 1: Word-form numbers not recognized**
Add a normalizer function that runs before classification. Map these words to digits for the purpose of classification (not in the display text):
- one/once → 1, two/twice → 2, three → 3, four → 4, five → 5, six → 6, seven → 7

So "three times a week" is recognized as having a frequency, and "go to the gym" is not.

Use this normalizer in `analyzeVow` before running the regex checks. Do NOT modify the user's display text — only use the normalized version for pattern matching.

**Bug 2: `composeVow` double-appends time phrases**
Before appending any time phrase ("all week", "this week", etc.), check if the string already contains it using a case-insensitive `includes()` check. If it's already there, don't append.

**Bug 3: `already_good` vows sometimes fall through to unnecessary steps**
In the current `refine.tsx`, the useEffect (line 84-125) checks `analysis.type === 'already_good'` but then still checks `needs.showFrequency || needs.showDuration` and shows extra steps. With the new 2-path system, this is eliminated — `already_good` vows never reach refine.tsx at all (they're caught by `shouldSkipRefine` in index.tsx).

### Changes to `shouldSkipRefine` in vow-flow.tsx

Simplify this function. Currently it checks `isAlreadySharp` AND then re-checks `detectVowNeeds`. The new logic:

```
shouldSkipRefine(input):
  if input is one of the vowExamples → return true (existing behavior, keep it)
  run analyzeVow(input)
  if result.type === 'already_good' → return true
  return false
```

That's it. No secondary `detectVowNeeds` check. If `analyzeVow` says it's good, it's good.

### Changes to `analyzeVow` in unbreakable.ts

Keep the existing structure but make these changes:

1. Run the word-to-number normalizer on the input BEFORE checking patterns
2. Remove the `needs_tweak` return type. The function now only returns `'good_enough'` or `'needs_sharpening'`. (You can keep the TypeScript type as `'already_good' | 'vague'` if that's simpler — just make sure `already_good` means "skip refine" and `vague` means "show the sharpening screen". The `needs_tweak` path gets merged into `vague`.)
3. The `alreadyGoodPattern` regex and the other `already_good` checks stay as-is — they're solid
4. Everything that currently returns `needs_tweak` should now return `vague` (which means "show the single sharpening screen")

### Changes to `refine.tsx`

This is the biggest change. Replace ALL the current step-based rendering (`vague`, `soft_sharpen`, `frequency`, `duration`, `deadline`, `preview`) with a **single screen**.

Remove:
- The `step` state and all step-based branching
- The `soft_sharpen` step
- The `frequency` step
- The `duration` step
- The `deadline` step (remove the entire calendar picker)
- The separate `preview` step

Keep:
- All existing style definitions (don't delete any styles — unused ones are fine)
- The existing animation setup (chipFade, chipSlide, shakeAnim) — reuse for the new screen
- The `BackButton`, `TitleBlock`, `RitualCard`, `RitualScreen`, `PrimaryButton` component usage
- The haptic feedback patterns

The new refine.tsx has ONE render path:

```
<RitualScreen footer={<PrimaryButton label="Use this vow →" onPress={...} />}>
  <BackButton />
  <TitleBlock title="Make it stick" subtitle="Specific vows are 3x more likely to stick. Your witness has to call this 'kept' or 'broken' — make it clear." />

  {/* Show original vow as reference */}
  <VowPreview text={activeVowText} />

  {/* Guidance card - keep the existing guidance card from the vague step */}
  <RitualCard>
    <View style={styles.guidanceHeader}>
      <Sparkles ... />
      <Text>The strongest vows have:</Text>
    </View>
    <Text>A clear action — what exactly will you do or not do?</Text>
    <Text>A finish line — a number, a threshold, or a clear "done"</Text>
    <Text>A time window — when does your witness check?</Text>
  </RitualCard>

  {/* Editable suggestion input - reuse the vagueInputShell style */}
  <View style={styles.vagueInputShell}>
    <Text style={styles.vagueInputLabel}>YOUR VOW</Text>
    <TextInput
      value={suggestionText}
      onChangeText={setSuggestionText}
      autoFocus
      multiline
    />
  </View>

  {/* Contextual suggestion cards below - "Try one of these" */}
  <View style={styles.dividerRow}>
    <Text>Or try one of these</Text>
  </View>
  {contextualSuggestions.map(suggestion => (
    <Pressable onPress={() => setSuggestionText(suggestion)}>
      <Text>{suggestion}</Text>
    </Pressable>
  ))}

  {/* Footer */}
  <PrimaryButton label="Use this vow →" onPress={() => continueWith(suggestionText)} />
  <SecondaryButton label="Keep my original wording" onPress={() => continueWith(vow.rawInput)} />
</RitualScreen>
```

The `continueWith` function stays the same — it calls `setRefinedText(value)` and `router.push('/witness')`.

### Copy and tone

Use these exact strings:
- Screen title: "Make it stick"
- Subtitle: "Specific vows are 3x more likely to stick. Your witness has to call this 'kept' or 'broken' — make it clear."
- Primary button: "Use this vow →"
- Secondary link: "Keep my original wording"
- Input label: "YOUR VOW"
- Suggestion divider: "Or try one of these"
- If the user submits a vow that's still too vague (re-analyzed as vague after editing): show error text "Try adding a number and a time window." with the existing shake animation

Do NOT use words like: improve, fix, better, weak, unclear, invalid, error, required.

### Deadline tasks ("finish the pitch deck")

When the input matches deadline task keywords (send/submit/finish/complete/ship/launch) AND doesn't already have a "by" date:
- The pre-filled suggestion should append "by Friday at 5pm" as a sensible default
- The user can edit this in the text input to change the day/time
- Do NOT show the calendar date picker. It's overkill for v1. Just let them type "by Wednesday" or "by April 10" in the text field.

### What the flow looks like end to end

```
User types: "go to the gym"
→ analyzeVow returns 'vague' (no frequency/time)
→ shouldSkipRefine returns false
→ Routes to /refine
→ Sharpening screen shows:
    Original: "Go to the gym."
    Editable suggestion: "Go to the gym 3 times this week."
    3 contextual suggestions below: gym-related alternatives
→ User taps "Use this vow →"
→ Routes to /witness with refinedText = "Go to the gym 3 times this week."

User types: "No takeout all week"
→ analyzeVow returns 'already_good' (negation + time window)
→ shouldSkipRefine returns true
→ Skips /refine entirely, routes to /witness

User types: "be healthier"
→ analyzeVow returns 'vague' (vague term detected)
→ Sharpening screen shows:
    Original: "Be healthier."
    Editable suggestion: "Go to the gym 3 times this week." (fallback — topic not specific enough to detect)
    3 contextual suggestions: generic fitness/health alternatives
→ User edits to "Cook dinner at home 5 nights this week"
→ Taps "Use this vow →"

User types: "finish the pitch deck"
→ analyzeVow returns 'vague' (deadline task, no date)
→ Sharpening screen shows:
    Original: "Finish the pitch deck."
    Editable suggestion: "Finish the pitch deck by Friday at 5pm."
→ User edits to "Finish the pitch deck by Wednesday"
→ Taps "Use this vow →"
```

### Summary of changes

1. **`constants/unbreakable.ts`**: Add word-to-number normalizer, fix double-append in `composeVow`, merge `needs_tweak` into `vague`, add a new `generateSuggestion(input)` function that returns a single composed suggestion string based on topic keywords
2. **`app/refine.tsx`**: Replace the entire multi-step flow with one screen showing an editable suggestion + contextual alternatives + "keep my original wording" escape hatch. Remove the calendar date picker, frequency chips, duration chips, and soft_sharpen step.
3. **`providers/vow-flow.tsx`**: Simplify `shouldSkipRefine` to just check `analyzeVow` result — if `already_good`, skip. No secondary `detectVowNeeds` check.

Keep all existing styles, animations infrastructure, and component imports. Keep the existing dark theme (palette colors). Keep the existing navigation pattern (`router.push('/witness')`). Keep all haptic feedback.
