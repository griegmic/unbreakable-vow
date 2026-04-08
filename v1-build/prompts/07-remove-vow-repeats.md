# Prompt: Remove Redundant Vow Preview from Witness & Stake Screens

## What to build

Remove the `VowPreview` component from `witness.tsx` and `stake.tsx`. The vow text is shown on 6+ screens — it doesn't need to appear on every one.

## Why

After the refine step, the vow text is locked. Showing it on every subsequent screen is visual clutter that users scroll past. The vow should appear on: home (input), refine (editing), seal (final confirmation), certificate (shareable), live (hero), verdict (judgment context), and outcome (resolution). It does NOT need to be on witness or stake screens. All 5 UX experts flagged this.

## Changes

### 1. Remove VowPreview from `witness.tsx`

Find all instances of `<VowPreview text={activeVowText} compact />` in `witness.tsx` and remove them. There are likely 3 instances (in the 'choose', 'manual', and 'invite' mode renders).

Also clean up:
- Remove `VowPreview` from the import statement at the top if it's no longer used in this file
- Remove `activeVowText` from the `useVowFlow()` destructuring if it's no longer used in this file (check first — it may be used elsewhere)

### 2. Remove VowPreview from `stake.tsx`

Find the `<VowPreview text={activeVowText} compact />` line in `stake.tsx` and remove it.

Also clean up:
- Remove `VowPreview` from the import statement at the top
- Remove `activeVowText` from the `useVowFlow()` destructuring if it's no longer used in this file

## What NOT to change

- Do NOT remove VowPreview from any other screens (seal, live, verdict, etc.)
- Do NOT modify the VowPreview component itself in `components/vow-ui.tsx`
- Do NOT change any navigation or business logic
- Keep all other content on these screens exactly as-is
