# Prompt: Delete Sent Screen & Remove Auth Screen

## What to build

Remove two unnecessary screens from the vow flow: `sent.tsx` (redundant confirmation) and `auth.tsx` (currently mocked — every button just sets `authenticated: true`). This reduces the flow by 2 screens and 2 taps.

## Why

**Sent screen:** Repeats information already shown on the seal screen (vow, witness, stake, verdict date). The "Got it" button is a dead tap that adds no value. All 5 UX experts unanimously recommended deleting it.

**Auth screen:** Currently 100% fake — no real authentication exists. All buttons just set a local state flag. Real auth will be handled by Stripe/Apple Pay when payments ship. Keeping a fake screen adds friction for zero benefit.

## Current flow
```
Stake → Auth → Seal → Certificate → Sent → Live
```

## Target flow
```
Stake → Seal → Certificate → Live
```

## Changes

### 1. Update `stake.tsx` navigation

Find the `router.push('/auth')` call in `handleContinue` and change it to `router.push('/seal')`.

This skips the auth screen entirely. The `setStake()` call right before it should remain unchanged.

### 2. Update `_layout.tsx`

Remove the `<Stack.Screen name="sent" ... />` and `<Stack.Screen name="auth" ... />` entries from the Stack navigator. Keep the files in the codebase but remove them from the navigation stack.

### 3. Verify certificate.tsx navigation

If `certificate.tsx` exists (created by prompt 02), confirm its "Continue" button navigates to `/live`, NOT `/sent`. If it navigates to `/sent`, change it to `/live`.

### 4. Remove auth imports from vow-flow.tsx (if any)

If `providers/vow-flow.tsx` has any `authenticated` state that gates navigation, remove that gate. The `authenticated` field can stay in the state type but should not block any flow.

## What NOT to change

- Do NOT delete the `sent.tsx` or `auth.tsx` files from disk — just remove them from the navigation stack in `_layout.tsx`
- Do NOT modify `seal.tsx` (prompt 02 already handles its navigation)
- Do NOT modify `certificate.tsx` content — only verify its navigation target
- Keep all other screens exactly as they are

## Dependency

**CRITICAL: Run this AFTER prompt 02 (vow-certificate).** Before making any changes, verify that `app/certificate.tsx` exists. If it does not exist, STOP — run prompt 02 first. Without the certificate screen, removing sent.tsx will break the navigation chain (seal would try to navigate to a screen that doesn't exist).
