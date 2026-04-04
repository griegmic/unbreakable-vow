# Witness Invite Flow — Comprehensive Audit & Fix Plan

## Context
The witness invite flow is the critical path where a vow-maker selects someone to hold them accountable. This flow must:
1. Capture the witness's phone number (required for SMS notifications at seal time)
2. Be clear about WHEN the witness actually gets notified
3. Confirm to the user that the invite was sent

## Current Flow
```
Choose Witness → [Contacts / Manual Name] → Invite Mode → Stake → Auth → Seal → Sent
```

## Files to Edit
- `expo/app/witness.tsx` — witness selection + invite screen
- `expo/app/sent.tsx` — post-seal confirmation screen
- `expo/providers/vow-flow.tsx` — state management

---

## CRITICAL ISSUES

### Issue 1: "Send invite & continue" button doesn't send anything
**File:** `expo/app/witness.tsx:326`
**Problem:** The button says "Send invite & continue" (SMS mode) but only saves data to state and navigates to `/stake`. The actual SMS is sent later in `seal-vow` edge function AFTER payment.
**Fix:**
- Rename button to **"Continue"** for both methods
- Add explanatory text below: "We'll text {name} when you seal the vow"
- For link method: still open share sheet, but label the button "Share & continue"

### Issue 2: Phone number not captured when using "Share a link" method
**File:** `expo/app/witness.tsx:44-48`
**Problem:** `canFinish` returns `true` for link method without requiring phone. This means `vow.phoneNumber` can be empty, and `seal-vow` skips SMS entirely (`if (vow.witness_phone)` guard at line 99 of seal-vow/index.ts).
**Fix:** Always require phone number. Move the phone input ABOVE the method selection so it's always visible and required. The SMS vs Link choice should only control whether a preview link is ALSO shared manually — the backend SMS always goes out at seal time if we have a phone.

**Implementation:**
```tsx
// canFinish should ALWAYS require phone
const canFinish = useMemo(() => {
  if (!selectedName.trim()) return false;
  return phone.replace(/\D/g, '').length >= 10;
}, [selectedName, phone]);
```

### Issue 3: Sent screen lies about invite status
**File:** `expo/app/sent.tsx:78-80`
**Problem:** Title always says "Sealed. Invite sent." and subtitle says "{name} will receive your vow" — even when no phone was captured and no SMS was sent.
**Fix:** Make messaging conditional:
- If `vow.phoneNumber` exists: "Sealed. Invite sent." / "{name} will get a text with the details."
- If no phone: "Sealed." / "Share the link with {name} so they can be your witness."

### Issue 4: "Resend" button on sent screen is a no-op
**File:** `expo/app/sent.tsx:130`
**Problem:** The Resend `<Pressable>` has no `onPress` handler.
**Fix:** Wire it to call the `send-sms` edge function with `message_type: 'seal'`, or remove the button entirely if resend isn't implemented yet.

### Issue 5: Share sheet doesn't block navigation
**File:** `expo/app/witness.tsx:327-333`
**Problem:** For link method, `handleShareLink()` is awaited but `handleConfirm()` runs immediately after regardless of whether the user actually shared or cancelled.
**Fix:** Check share result. If cancelled, don't navigate — let user try again or switch to SMS.

---

## RECOMMENDED UX CHANGES

### Invite Mode Redesign
The current two-toggle (SMS / Link) approach is confusing because both paths ultimately result in an SMS at seal time. Simplify:

1. **Phone number field** — always visible, always required, pre-filled from contacts
2. **"Also share a preview?"** — optional, secondary action (opens share sheet)
3. **CTA button** — "Continue" with subtitle "We'll text {name} when you seal your vow"

```
┌─────────────────────────────────┐
│  Invite {name}                  │
│  Their phone number is needed   │
│  so we can text them the invite │
│                                 │
│  ┌──────────────────────────┐   │
│  │ PHONE NUMBER             │   │
│  │ (555) 123-4567           │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │ 🔗 Share a preview link  │   │
│  │ Optional — send via      │   │
│  │ iMessage, WhatsApp, etc  │   │
│  └──────────────────────────┘   │
│                                 │
│  We'll text {name} when you     │
│  seal the vow.                  │
│                                 │
│  [ Continue ]                   │
└─────────────────────────────────┘
```

### Sent Screen Updates
- Make title conditional on whether we have a phone number
- Wire up or remove Resend button
- Step 1 should say "We texted {name}" (past tense, since seal-vow already sent it)

---

## EXPERT AUDITS

### UX Expert (Nielsen Heuristics)
- **Visibility of system status:** User has NO feedback that the SMS was sent. The sent screen says "Invite sent" but this happened silently in the backend. Add a checkmark or "Text sent to {phone}" confirmation.
- **Match between system and real world:** "Send invite & continue" implies immediate sending. Rename to "Continue" and explain the actual timing.
- **Error prevention:** If the user picks "Share a link" without ever sharing, the witness never gets notified and there's no phone number for backend SMS. Require phone always.

### Product Expert (Nikita Bier lens)
- **Reduce friction:** When picking from contacts, the flow should be: tap contact → see confirmation with their name + phone → tap Continue. Don't make them choose SMS vs Link — just collect the phone and move on.
- **Create urgency:** The sent screen should make the user feel like something just happened. "We just texted {name}" is better than the generic "Invite sent."
- **Social proof:** Consider showing "Most people's witnesses accept within 2 hours" on the sent screen.

### Engineering Expert
- **Data integrity:** `vow.phoneNumber` should never be empty when reaching seal. Add a guard in seal screen: if no phone, redirect back to witness selection.
- **Idempotency:** The Resend button (if wired up) should check `sms_log` to prevent duplicate sends (already handled in send-sms edge function).
- **Error handling:** `seal-vow` treats SMS as best-effort (catch + log). This is fine, but the sent screen should reflect reality — if SMS failed, don't say "Invite sent."

### Accessibility Expert
- Phone input should have proper `accessibilityLabel`
- The method toggle cards need accessible roles (radio group pattern)
- "Copy" and "Resend" buttons need minimum 44pt touch targets (currently 48px — good)

---

## IMPLEMENTATION ORDER

1. **Make phone always required** in `witness.tsx` — highest impact, prevents the "no SMS sent" failure mode
2. **Rename CTA button** — "Continue" with explanation text
3. **Simplify invite mode** — remove SMS/Link toggle, always show phone + optional share
4. **Fix sent screen messaging** — conditional on phone number presence
5. **Wire up or remove Resend button**
6. **Add guard in seal screen** — redirect if no witness phone

---

## TESTING CHECKLIST

- [ ] Pick contact from contacts list → phone auto-fills → press Continue → verify phone stored in vow state
- [ ] Type name manually → enter phone → press Continue → verify phone stored
- [ ] Complete full flow through seal → verify SMS sent to witness (check Supabase sms_log)
- [ ] Sent screen shows correct messaging based on whether phone exists
- [ ] Share preview link via share sheet → verify link works in browser
- [ ] Back button works at every step without losing state
- [ ] Google Sign-In shows clean error in Expo Go / Rork (no red screen)
- [ ] Google Sign-In works in production EAS build
