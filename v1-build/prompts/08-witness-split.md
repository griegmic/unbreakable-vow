# Prompt: Split Witness Screen into Picker + Invite Method

## What to build

Replace the monolithic `witness.tsx` (4 modes, 5-7 decisions on one screen) with two focused screens: `witness-picker.tsx` (pick a person) and `witness-invite-method.tsx` (choose how to invite them). Also remove the crew section from the witness flow entirely.

## Why

All 5 UX experts unanimously flagged `witness.tsx` as the most problematic screen. Julie Zhuo: "This screen violates the ONE JOB rule catastrophically." One decision per screen is the target.

## Current behavior in witness.tsx

The screen has 4 modes managed by local state:
- `'choose'` — Three options: pick from contacts, type a name, Vowkeeper
- `'contacts'` — Searchable contact list
- `'manual'` — Text input for witness name
- `'invite'` — SMS vs link invite method, phone input, copy link, PLUS a collapsible crew section with its own contacts picker and manual entry

All rendered in a single component with ~500 lines.

## Target

Two separate screen files. Each has ONE job.

### Screen 1: `app/witness-picker.tsx`

**Job:** Pick who your witness is. Three clear options.

**Layout:**
```
BackButton
TitleBlock: "Choose your witness." / "Someone who knows you well enough to call it honestly."

Option 1: "Pick from contacts" (gold background hero button — existing heroOption style)
  → On tap: show inline contact list below (same as current 'contacts' mode)
  → On contact tap: set witness name, navigate to /witness-invite-method

Option 2: "Type a name" (surface card — existing secondaryOption style)
  → On tap: show inline text input below (same as current 'manual' mode)
  → On submit/next: set witness name, navigate to /witness-invite-method

Divider: "or go solo"

Option 3: "Just me and Vowkeeper" (gold border card — existing vowkeeperOption style)
  → On tap: set witness as 'Vowkeeper', navigate directly to /stake (skip invite method)

Explainer card: "What does a witness do?" (existing explainerCard)
```

**Navigation:**
- When a human witness is selected → `router.push('/witness-invite-method')`
- When Vowkeeper is selected → `router.push('/stake')` (skip invite method entirely)

**State:** Store the selected witness name in vow-flow context via `setWitness(name, 'link')` before navigating. The invite method defaults to 'link' and can be changed on the next screen.

**Key difference from current:** The contact list and manual input appear INLINE on this screen (expanding below the tapped option) rather than as separate full-screen modes. This keeps the three options visible as context.

### Screen 2: `app/witness-invite-method.tsx`

**Job:** Choose how to invite your witness. Two options.

**Layout:**
```
BackButton
TitleBlock: "Invite {witnessName}" / "We'll notify {witnessName} after you seal. They'll get the details and choose to accept."

SMS card (existing methodCard style):
  "Text {witnessName}" / "We'll SMS them the invite"
  → If selected, show phone number input below

Link card (existing methodCard style):
  "Share a link myself" / "iMessage, WhatsApp, DM — your choice"
  → If selected, show link preview row with copy button

PrimaryButton: "Send invite & continue" (if SMS) or "Share link & continue" (if link)
  → On press: update witness in context with invite method + phone, navigate to /stake
```

**Navigation:** `router.push('/stake')`

**NO crew section.** The crew feature is being moved to the live screen (handled by prompt 10).

### 3. Update `_layout.tsx`

Add `<Stack.Screen name="witness-picker" ... />` and `<Stack.Screen name="witness-invite-method" ... />` to the Stack navigator.

Remove `<Stack.Screen name="witness" ... />` from the Stack (but keep the file).

### 4. Update navigation references

Any screen that currently navigates to `/witness` should now navigate to `/witness-picker`:
- In `index.tsx`: find `router.push('/witness')` and change to `router.push('/witness-picker')`
- In `refine.tsx`: find `router.push('/witness')` and change to `router.push('/witness-picker')`

### 5. Migrate styles

Copy relevant styles from `witness.tsx` into the new files. Both new screens should look identical to the corresponding sections of the current witness screen. Reuse the existing style names and values:
- `heroOption`, `heroOptionIcon`, `heroOptionCopy`, `heroOptionTitle`, `heroOptionSub`
- `secondaryOption`, `secondaryOptionIcon`, `secondaryOptionTitle`, `secondaryOptionSub`
- `dividerRow`, `dividerLine`, `dividerText`
- `vowkeeperOption`, `vowkeeperIcon`
- `explainerCard`, `explainerTitle`, `explainerBody`
- `searchBar`, `searchInput`, `contactsList`, `contactRow`, `contactRowBorder`, `contactAvatar`, `contactInitial`, `contactName`
- `manualInputShell`, `manualLabel`, `manualInput`
- `methodCard`, `methodCardActive`, `methodIcon`, `methodEmoji`, `methodCopy`, `methodTitle`, `methodSub`
- `linkPreviewRow`, `linkUrl`, `copyBtn`, `copyBtnCopied`, `copyBtnText`, `copyBtnTextCopied`

## Design tokens

Use existing `palette` and imports from `constants/unbreakable.ts`. No new colors.

## What NOT to change

- Do NOT delete `witness.tsx` — just remove it from `_layout.tsx`
- Do NOT include any crew functionality in either new screen
- Do NOT modify `stake.tsx`, `seal.tsx`, or any other screens not mentioned above
- Keep all existing haptic feedback patterns
- Keep all existing `testID` props where applicable

## Dependency

Run this AFTER prompt 07 (remove vow repeats) since that prompt removes VowPreview from witness.tsx. The new screens should NOT include VowPreview.
