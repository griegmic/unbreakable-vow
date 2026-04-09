# QuickVow Post-Seal Experience Optimization

**Date:** 2026-04-09
**Status:** Approved
**Scope:** Expo + Web — QuickVow post-seal, witness accept pages, dashboard badges, witness selection UX

---

## Overview

Seven changes to optimize the QuickVow experience, fix witness accept page dead-ends, and improve viral mechanics across all flows.

---

## Change 1: Copy Button Fix

**Problem:** The copy button in QuickVow's sealed state uses deprecated `Clipboard` from react-native which doesn't work reliably.

**Fix:**
- Replace `import { Clipboard } from 'react-native'` with `import * as Clipboard from 'expo-clipboard'`
- Replace `Clipboard.setString(url)` with `await Clipboard.setStringAsync(url)`
- Add `copied` boolean state; set true on copy, reset via `setTimeout` after 2000ms
- Swap "Copy" label to "Copied!" with green color when `copied === true`

**Files:** `expo/app/quick-vow.tsx`

---

## Change 2: Edge Function for Witness Accept

**Problem:** Expo's `acceptWitnessInvite` and `declineWitnessInvite` in `vow-api.ts` do raw DB updates, skipping the `accept-witness` edge function. This misses: audit events (`witness_accepted`), SMS notification to the maker, and any future logic added to the edge function.

**Fix:**
- Rewrite `acceptWitnessInvite(vowId: string)` → `acceptWitnessInvite(token: string)` calling `supabase.functions.invoke('accept-witness', { body: { token, action: 'accept' } })`
- Same for `declineWitnessInvite(token: string)` with `action: 'decline'`
- Update `witness-invite.tsx` to pass `remoteVow.witness_invite_token` instead of `remoteVow.id`

**Files:** `expo/lib/vow-api.ts`, `expo/app/witness-invite.tsx`

---

## Change 3: Witness Accept CTA Redesign

**Problem:** Expo witness-invite accepted state is a dead end (zero CTAs). Web is better but inconsistent with the desired hierarchy. The `already_accepted` state in expo is also a dead end.

**Applies to:** All witness accept views — web (`/w/[token]/client.tsx`) and expo (`witness-invite.tsx`), both normal and QuickVow flows.

### State 1: Just Accepted

**Layout (top to bottom):**
1. Success icon (green checkmark circle)
2. Headline: `You're locked in.`
3. Body: `[Name] is counting on your honesty. You'll deliver your verdict on [Date].`
   - If no `ends_at`: `[Name] is counting on your honesty. You'll be notified when it's verdict time.`
4. Vow quote card (compact)
5. Primary CTA (gold filled): `Tell [name] you're watching`
   - Icon: MessageCircle (left of text)
   - Action: Opens native SMS to maker's phone
   - Pre-filled body: `Just accepted your vow. I'm watching.`
   - If `makerPhone` is null: hide this button; promote calendar to primary
6. Secondary CTA (outlined): `Remind me on verdict day`
   - Web: .ics download
   - Expo: native calendar event via expo-calendar (request permission on tap)
   - If no `ends_at`: hide
7. Tertiary CTA (outlined button, not text link): `Your turn — what will you commit to?`
   - Links to `https://unbreakablevow.app`

### State 2: Return Visit (Vow Active)

**Layout:**
1. Status badge: `VOW ACTIVE` (green)
2. Headline: `You're watching.`
3. Subtitle: `[Name] is counting on your honesty.`
4. Vow quote card with stake info
5. Progress row: `Day X of Y` | `Z days left — Verdict: [Date]`
6. Nudge CTA (outlined, gold text/border) — copy varies by elapsed time:

| Phase | Threshold | Button Copy | Pre-filled SMS |
|-------|-----------|-------------|----------------|
| Early | elapsed < 15% | `Send [name] a message` | `How's the vow going?` |
| Mid | 15% ≤ elapsed < 85% | `Check in on [name]` | `Still keeping the vow? I'm paying attention.` |
| Late | elapsed ≥ 85% | `The clock is ticking — message [name]` | `Almost verdict time. You good?` |

   - `elapsed = (now - starts_at) / (ends_at - starts_at)`
   - If `starts_at` or `ends_at` is null: use "mid" copy
   - If `makerPhone` is null: hide nudge entirely
7. Calendar CTA (outlined, if not yet added and verdict > 24h away)
8. Tertiary CTA (outlined button): `Your turn — what will you commit to?`
9. Footer (muted): `You'll deliver your verdict here on [Date]`

### State 3: Verdict Due

1. Badge: `VERDICT DUE` (gold)
2. Headline: `Time's up.`
3. Subtitle: `Did [name] keep the vow? Your call.`
4. Vow quote card
5. Primary CTA (gold): `Deliver your verdict` → links to verdict page
6. No nudge button (verdict is the only action)
7. Tertiary: `Your turn — what will you commit to?`

### State 4: Already Accepted (re-tap of invite link)

Show **State 2 (Return Visit)** instead of a dead-end "Already accepted" screen.

### Technical requirement:
- `getVowByWitnessToken` in `vow-api.ts` must join `users` table on `vows.user_id = users.id` to return `maker_phone` (from `users.phone`) and `maker_display_name` (from `users.display_name`).
- SMS URI: use `sms:${phone}?body=${encodeURIComponent(message)}` (question mark separator for Android compatibility).

**Files:** `expo/app/witness-invite.tsx`, `expo/lib/vow-api.ts`, `web/src/app/w/[token]/client.tsx`

---

## Change 4: QuickVow Routes to /live After Seal

**Problem:** QuickVow's post-seal screen is a dead end with only "My Vows" and "Make another". No live tracking, no witness polling, no check-ins, no progress.

**Fix — two parts:**

### Part A: Auto-fire share sheet on seal

After seal completes successfully, auto-open `Share.share()` with the pre-composed witness invite message. This is opt-out (user dismisses) rather than opt-in (user taps). If the vow is solo, skip the share sheet.

### Part B: Navigate to /live

After the share sheet is dismissed (or immediately for solo vows), hydrate VowFlowProvider from QuickVow's local state, then navigate to `/live`:

```
setRawInput(vowText)
setRefinedText(finalText)
setWitness(resolvedWitnessName, witnessPhone ? 'sms' : 'link', witnessPhone)
setStake({ amount: stakeAmount, consequence, destination })
setVowId(sealedVowId, witnessToken)
setDeadline(deadlineDate.toISOString())
If solo: setWitnessType('self')
router.push({ pathname: '/live', params: { justSealed: '1' } })
```

### Part C: Share banner on /live as fallback

On `/live`, if the vow has a witness who hasn't accepted yet, show a persistent gold-accented banner: **"Send your vow to [Name]"** with a share button. The banner persists until dismissed or witness accepts. For solo vows, no banner.

### QuickVow sealed state screen

The entire inline sealed success screen in quick-vow.tsx (`if (sealed) { ... }`) is replaced by the seal → auto-share → /live navigation. The sealed state UI is removed. "Make another vow" is accessible from the hamburger menu on any screen.

**Files:** `expo/app/quick-vow.tsx`, `expo/app/live.tsx` (add share banner)

---

## Change 5: Dashboard Witness Status Badges

**Problem:** Dashboard vow cards show witness name but no indication of whether the witness has accepted, is pending, or declined.

**Fix:**
- Compute witness status from existing fields:
  - `witness_name === 'Just me'` → no indicator (skip)
  - `witness_accepted_at` is truthy → green dot + "Accepted"
  - `witness_declined` is true → red dot + "Declined"
  - Otherwise → amber dot + "Pending"
- Render in the card's meta row, next to or below witness name
- Dot: 8x8 circle, colors: `#52D69A` (accepted), `#F0C86E` (pending), `#FF7B7B` (declined)
- Text: 11px, same color as dot, `fontWeight: '600'`

**Ensure:** Dashboard query already selects `witness_accepted_at` and `witness_declined`. If not, add them to the select.

**Files:** Expo dashboard card rendering (in `dashboard.tsx` or a card sub-component), web dashboard card rendering

---

## Change 6: Witness Selection UX in QuickVow

**Problem:** Manual name + phone entry is high friction. `expo-contacts` is already installed and used in the full flow (`witness.tsx`) but not in QuickVow.

### Card redesign

**Label:** Change from `WITNESS (OPTIONAL)` to `WHO'S HOLDING YOU TO IT?`
**Subline:** `Witnessed vows are kept 3x more often.`

**Adaptive layout:**

First-time user (no recent witnesses):
- Hero element: `[UserPlus icon] Pick from contacts` button (prominent within card)
- Below: small "Enter manually" text link → reveals name/phone fields on tap

Returning user (has recent witnesses):
- Recent witness chips: `[Sarah] [Mike] [Jordan]`
- Additional chips: `[From contacts]` `[+ Manual]`
- Selecting a recent witness = done in 1 tap

After a contact/witness is selected:
- Card shows: "[Name] ✓" with phone in muted text + "Change" link

### Contact picker implementation

- Opens as a `<Modal>` overlay on QuickVow (screen stays mounted underneath)
- Contains: search bar + FlatList with colored avatar circles (first initial) + name + phone
- Selecting a contact dismisses modal, populates `witnessName` and `witnessPhone`
- Permission denied: alert with Settings instructions, manual entry remains available

### Shared code extraction

- **`expo/lib/contacts.ts`** — extract from `witness.tsx`: `requestAndLoadContacts()` function. Returns `{ granted: boolean, contacts: Contact[] }`. Handles permission request, fetches contacts with PhoneNumbers + Name fields, filters to contacts with at least one phone number.
- **`expo/components/contact-picker-modal.tsx`** — reusable component: search bar + FlatList + avatars. Props: `visible`, `onSelect(name, phone)`, `onClose`. Both `witness.tsx` and `quick-vow.tsx` consume this.

### No backend changes

`createVow()` receives the same `witnessName` + `witnessPhone` regardless of whether the input came from contacts, recent witnesses, or manual entry.

**Files:** `expo/app/quick-vow.tsx`, `expo/app/witness.tsx` (refactor to use shared components), new `expo/lib/contacts.ts`, new `expo/components/contact-picker-modal.tsx`

---

## Change 7: Viral CTA Upgrade

**Problem:** "Make a vow of your own" on witness accept pages is a nearly invisible text link. The viral loop completion is treated as an afterthought.

**Fix:**
- Promote from text link to outlined button
- Copy change: `Make a vow of your own` → `Your turn — what will you commit to?`
- Position: below the nudge and calendar CTAs on all witness accept states
- Links to `https://unbreakablevow.app` (web) or deep link (if available)

**Applies to:** Web `/w/[token]/client.tsx` and expo `witness-invite.tsx`, all states (just accepted, return visit, verdict due).

**Files:** `web/src/app/w/[token]/client.tsx`, `expo/app/witness-invite.tsx`

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `expo/app/quick-vow.tsx` | Copy button fix, witness card redesign, contact picker modal, post-seal → share sheet → /live navigation |
| `expo/lib/vow-api.ts` | acceptWitnessInvite/declineWitnessInvite → edge function, getVowByWitnessToken join users table |
| `expo/app/witness-invite.tsx` | Full CTA stack on accepted/already_accepted states, pass token to edge function |
| `expo/app/live.tsx` | Add share banner for unnotified witnesses |
| `expo/app/dashboard.tsx` | Witness status badges on vow cards |
| `expo/app/witness.tsx` | Refactor to use shared contact-picker-modal and contacts lib |
| `expo/lib/contacts.ts` | NEW — shared contact loading logic |
| `expo/components/contact-picker-modal.tsx` | NEW — reusable contact picker modal |
| `web/src/app/w/[token]/client.tsx` | Updated CTA hierarchy, time-based nudge copy, viral button upgrade |

## Files NOT Changed

- `expo/components/vow-ui.tsx` — never modified per project rules
- All existing screen files not listed above
- All Supabase edge functions (accept-witness already supports `{ token, action }`)
- Database schema (all needed columns already exist)

---

## Deferred

- **Contacts multi-phone picker** — if a contact has multiple phone numbers, currently picks the first one. Future: show a sub-picker.
- **Witness notified on maker check-ins** — push notification to witness when maker checks in ("Alex checked in: On track. Day 3 of 7"). Infrastructure exists (push_queue, cron-runner, audit_events) but wiring is separate scope.
- **Remove oath checkbox on witness accept** — Nikita Bier's recommendation. Worth A/B testing but controversial. Parking for now.
- **Certificate sharing as separate viral vector** — Instagram Stories optimized share image. Exists but not integrated into QuickVow flow. Future enhancement.

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Copy button | Very low | Isolated UI, one file |
| Edge function switch | Medium | If edge function unreachable, accept fails. Add error handling with user-facing retry message. |
| Witness CTA redesign | Low | Additive UI only, no state machine changes |
| QuickVow → /live | Medium | VowFlowProvider hydration must be complete. Test all combos: solo/witnessed, staked/free, all deadline presets. |
| Dashboard badges | Low | Additive UI, no behavioral changes |
| Contact picker | Medium | Permission flow, modal overlay must not break scroll. Graceful fallback if denied. |
| Viral CTA upgrade | Very low | Copy + styling change only |
