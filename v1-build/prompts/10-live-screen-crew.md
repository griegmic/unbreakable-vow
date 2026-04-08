# Prompt: Add Crew Prompt to Live Screen

## What to build

Add an optional "Add others to hold you accountable" section to `live.tsx`. This replaces the crew functionality that was previously in the witness screen (removed in prompt 08).

## Why

Crew is a nice-to-have social feature, but it was blocking the witness flow's critical path. Moving it to post-seal means users can optionally add friends AFTER committing, without slowing down the path to sealing.

## Current behavior in live.tsx

The live screen shows:
- "VOW ACTIVE" status badge with pulse animation
- "Day 1 of 7" progress info
- Info cards about the witness/Vowkeeper
- Buttons for verdict and history
- An "Open SMS thread" link that opens native SMS

## Changes

### 1. Add crew invitation section

Below the existing info cards and above the verdict/history buttons, add a new card:

```
<RitualCard>
  <View style={crewPromptRow}>
    <Users color={palette.textMuted} size={18} />
    <View style={crewPromptCopy}>
      <Text style={crewPromptTitle}>Want backup?</Text>
      <Text style={crewPromptDesc}>Add friends to keep you on track. They'll see your vow but only your witness delivers the verdict.</Text>
    </View>
  </View>
  <Pressable onPress={handleAddCrew} style={crewPromptButton}>
    <UserPlus color={palette.goldBright} size={16} />
    <Text style={crewPromptButtonText}>Add crew members</Text>
  </Pressable>
</RitualCard>
```

Import `Users` and `UserPlus` from `lucide-react-native`.

### 2. Crew add flow (inline, not a new screen)

When the user taps "Add crew members":
- Expand inline to show a text input for a name + "Add" button (same pattern as the crew manual entry in the old witness screen)
- Added crew members appear as chips with an X to remove
- Maximum 4 crew members (from the existing `MAX_CREW` constant in vow-flow.tsx)
- Use existing `addCrewMember` and `removeCrewMember` from `useVowFlow()`

### 3. Show existing crew if any

If `vow.crew.length > 0`, show the crew members as chips at the top of the card, above the "Add crew members" button. Same chip styling as the old witness screen.

### 4. Hide the section for Vowkeeper-only vows (optional)

If `isVowkeeper` is true, you can either:
- Show the crew section anyway (they might still want friends in the loop)
- Hide it (Vowkeeper is solo mode)

Default: show it regardless. Let the user decide.

## Styles

- `crewPromptRow`: flexDirection 'row', gap 12, alignItems 'flex-start'
- `crewPromptCopy`: flex 1, gap 4
- `crewPromptTitle`: palette.text, 15px, fontWeight 600
- `crewPromptDesc`: palette.textMuted, 13px, lineHeight 19
- `crewPromptButton`: flexDirection 'row', gap 8, alignItems 'center', justifyContent 'center', backgroundColor palette.surfaceElevated, borderRadius 12, borderWidth 1, borderColor palette.borderStrong, paddingVertical 12, marginTop 8
- `crewPromptButtonText`: palette.goldBright, 14px, fontWeight 600

## Design tokens

Use existing `palette` values. No new colors.

## What NOT to change

- Do NOT modify the VOW ACTIVE badge, status display, or pulse animation
- Do NOT modify the verdict or history buttons
- Do NOT modify any other screens
- Keep all existing haptic feedback
- Keep all existing `testID` props

## Dependency

Run this AFTER prompt 08 (witness split) since that prompt removes crew from the witness flow.
