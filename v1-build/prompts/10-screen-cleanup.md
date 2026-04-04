# Prompt 10: Screen Cleanup — Remove VowKeeper, Crew, Challenges from Nav

## Context
Unbreakable Vow app. V1 has no VowKeeper AI witness, no crew/group accountability, and challenges are hidden. We need to clean these references out of the screens while keeping the existing UI intact.

## Important rule
Do NOT delete any style definitions. Unused styles are fine. Only modify the JSX/logic, not the StyleSheet.

## Files to modify

### 1. `app/witness.tsx` (931 lines)
**Current state:** Has VowKeeper as an option ("Go solo — Just me and Vowkeeper"), crew add/remove UI, hardcoded contacts.

**Changes:**
- Remove the "Go solo" section and VowKeeper option entirely (the divider, the Vowkeeper card, everything between the "Go solo" divider and the manual entry section)
- Remove the entire crew section (the "Add crew" toggle, crew search, crew chips, all crew-related state)
- Remove `witnessContacts` hardcoded list — users enter witness name + phone manually only
- Keep the manual name entry flow (name input → phone number input → invite method selection)
- Keep the "Share invite link" and "Send via SMS" options
- Keep the share URL copy functionality
- The flow should be: enter witness name → enter phone number → choose SMS or link → continue to /stake
- Remove all references to `addCrewMember`, `removeCrewMember`, `clearCrew` from VowFlow usage
- Update the title/subtitle copy to not mention VowKeeper

### 2. `app/seal.tsx` (463 lines)
**Current state:** Has VowKeeper conditional checks, proof mode selector, crew display.

**Changes:**
- Remove `isVowkeeper` variable and all conditional branches that use it
- Remove proof mode selector UI entirely (v1 is word-of-honor only)
- Remove crew member display
- Keep: oath text, vow summary, stake display, witness name, seal animation, seal button
- The oath text stays: "I solemnly swear to keep my word this week."

### 3. `app/sent.tsx` (248 lines)
**Current state:** Has VowKeeper conditionals, crew count display, hardcoded share URL.

**Changes:**
- Remove `isVowkeeper` variable and all conditional branches
- Remove crew count display
- Keep: "Sealed. Invite sent." title, vow preview, share/copy invite link functionality
- Replace hardcoded URL `https://unbreakablevow.app/invite/a3x9k2` with a dynamic URL (for now, use a placeholder pattern: `https://unbreakablevow.app/v/${vow.id || 'pending'}` — this will be wired to real data in Prompt 11)
- Keep the "Preview what your witness sees" link
- Keep steps display but rewrite to remove VowKeeper mentions:
  1. "Your witness gets an SMS with your vow"
  2. "At the end of the week, they deliver a verdict"
  3. "If you break it, your money goes to {destination}"

### 4. `app/live.tsx` (175 lines)
**Current state:** Has VowKeeper conditionals, group text reference, SMS thread link.

**Changes:**
- Remove `isVowkeeper` variable and all conditional branches
- Remove "Vowkeeper will check in" text
- Remove "group text" references
- Keep: vow status display, vow text, witness name, stake info, countdown/timer
- Keep the verdict button (routes to `/witness-verdict`)
- Update status text to: "Your witness will deliver a verdict on {end_date}"
- Remove the SMS thread button (Linking.openURL to sms:)

### 5. `app/witness-invite.tsx` (273 lines)
**Current state:** Shows what witness sees when invited. Has group text mention.

**Changes:**
- Remove "A group text starts with you, {makerName}, and Vowkeeper" line
- Replace `makerName = 'Someone'` — this stays as placeholder for now (will be wired to real data in Prompt 11)
- Rewrite the steps section:
  1. "You'll get a text when the vow ends"
  2. "You decide: did they keep it or break it?"
  3. "If they break it, ${amount} goes to {destination}"
- Keep: oath text, accept/decline buttons, vow details display

### 6. `app/witness-verdict.tsx` (493 lines)
**Current state:** Has VowKeeper as potential witness option with self-judgment flow.

**Changes:**
- Remove `isVowkeeper` variable and all conditional branches
- Remove all self-judgment UI/text (VowKeeper branch)
- Keep only the external-witness verdict flow
- Keep: kept/broken buttons, confirmation modal, financial implications display
- The displayName should just be `vow.witnessName` directly

### 7. `app/history.tsx` (247 lines)
**Current state:** Has "Group Challenges" link with "COMING SOON" badge.

**Changes:**
- Remove the "Group Challenges" pressable that routes to `/challenges`
- Keep: past vows list, stats (kept count, broken count, money amounts), "Make a new vow" button
- Keep all existing hardcoded data for now (will be wired to real data in Prompt 11)

### 8. `app/vow-kept.tsx` (227 lines) and `app/vow-broken.tsx` (223 lines)
**Changes for both:**
- Remove `isVowkeeper` variable and conditional branches
- Keep all animations, copy, and navigation

### 9. `components/app-menu.tsx` (353 lines)
**Changes:**
- Remove "Group Challenges" menu item (the one with route `/challenges` and SOON badge)
- Keep: New Vow, My Vows, Settings menu items
- Keep streak display (will be wired to real data in Prompt 11)

### 10. `app/_layout.tsx` (78 lines)
**Changes:**
- Remove `crew-invite` from the screen list (the screen file can stay, just remove it from Stack)
- Keep `challenges` in the Stack (it's just hidden from nav, still accessible)

### 11. `app/+native-intent.tsx` (7 lines)
**Current state:** Returns '/' for all paths, swallowing all deep links.

**Changes:**
- Make it handle the verdict deep link pattern:
```typescript
export function redirectSystemPath({ path }: { path: string }) {
  // Allow verdict links through
  if (path.includes('/verdict')) return path;
  // Default: home
  return '/';
}
```
(Full deep linking is wired in Prompt 12)

## Do NOT modify
- `app/index.tsx`
- `app/refine.tsx`
- `app/stake.tsx`
- `app/auth.tsx`
- `app/settings.tsx` (minimal changes only if needed)
- `constants/unbreakable.ts`
- `components/vow-ui.tsx`
- `providers/vow-flow.tsx`

## Important notes
- This prompt is purely UI cleanup. No backend wiring. Keep all local state patterns.
- Don't delete any StyleSheet definitions — unused styles are harmless and deleting them risks breaking things.
- The witness.tsx change is the biggest. The screen goes from 931 lines to ~300-400 lines.
- After this prompt, every screen should work without referencing VowKeeper, crew, or challenges navigation.
