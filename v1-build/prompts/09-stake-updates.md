# Prompt: Stake Screen Updates — Consequence Order + Social Proof Hint

## What to build

Two small changes to the stake screen: (1) reorder consequence options and (2) add a social proof hint to the $50 amount.

## Changes

### 1. Reorder consequence options in `constants/unbreakable.ts`

Find the `consequenceOptions` array. The current order is likely: charity → witness → anti-cause.

Change the order to: **charity → anti-cause → witness**

Move the anti-cause option to second position. This puts the emotionally strongest option (donating to a cause you hate) right after the default (charity), creating a stronger reaction earlier. 2 of 5 experts recommended this.

The array entries stay identical — just reorder them. The `id` values ('charity', 'anti', 'witness') don't change.

### 2. Add social proof hint to $50 stake in `stake.tsx`

Find the `amountHint` logic (likely a `useMemo` that returns different strings based on the selected amount).

Change the $50 hint from its current text to: **"Most popular"**

Keep all other hints unchanged:
- $10: keep current hint
- $25: keep current hint
- $50: → "Most popular"
- $100: keep current hint

This uses social proof to nudge users toward a higher stake without changing the default ($25 stays pre-selected).

## What NOT to change

- Do NOT change the default stake amount ($25)
- Do NOT modify the stake amounts themselves ($10, $25, $50, $100)
- Do NOT modify the consequence card UI or charity/anti-cause selection
- Do NOT modify any navigation
- Do NOT modify any other files besides `stake.tsx` and `constants/unbreakable.ts`
