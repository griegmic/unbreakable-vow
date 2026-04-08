# Prompt: Remove Fake Data & "SOON" Labels

## What to build

Clean up hardcoded fake data across multiple screens. These are small, independent changes that can be done together.

## Changes

### 1. Remove fake streak from `vow-kept.tsx`

Find the hardcoded streak display (likely showing "3 wk" or "3 wk streak" as a StatPill or text element). This is fake data — no streak tracking exists yet.

Remove the streak display entirely until real streak tracking is implemented. It's better to show nothing than to show fake data.

### 2. Remove "SOON" labels from challenges screen

If `challenges.tsx` (or wherever the challenges feature is locked) shows "SOON" labels or lock icons on features that aren't built yet, either:
- Remove the entire challenges entry from the app menu / navigation
- Or remove just the "SOON" text and replace with nothing (leave the items but don't tease them)

**Preferred:** Remove the challenges entry from navigation entirely. If it's in `app-menu.tsx` or `_layout.tsx`, comment it out or remove the menu item. Don't tease features that don't exist yet. Nikita Bier: "either ship or hide."

### 3. Remove hardcoded "Payment processed" from `vow-broken.tsx`

If `vow-broken.tsx` shows "Payment processed" or similar text in a settlement receipt section, change it to something that's accurate for the current prototype state: "Stake forfeited" or "Settlement recorded."

No real payments exist, so "Payment processed" is misleading.

### 4. Remove fake invite link

Multiple screens reference a hardcoded invite URL: `https://unbreakablevow.app/invite/a3x9k2`. This is fake. Find and update:
- In any screen that shows this URL, change to a more honest placeholder: `unbreakablevow.app/invite/...`
- Or better: generate a display-only placeholder based on the witness name, like `unbreakablevow.app/invite/{first3letters}...`

This is cosmetic — the share functionality (Share.share) will work regardless since it just copies text.

## What NOT to change

- Do NOT modify any navigation flow
- Do NOT modify the vow-flow context or state management
- Do NOT modify the certificate, seal, or live screens
- Keep all haptic feedback and animations
