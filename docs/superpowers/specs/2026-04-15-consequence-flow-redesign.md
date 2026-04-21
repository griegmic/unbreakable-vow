# Consequence Flow Redesign — Implementation Spec

**Date:** 2026-04-15
**Status:** Awaiting approval
**Scope:** Stake screen consequence selection + witness acceptance ceremony + maker reveal + witness payout

---

## Summary

Redesign the consequence/destination mechanic across the entire vow lifecycle. Replace the current "maker picks a charity/anti-cause" flow with a two-option system where the witness is an active participant, not a passive validator.

**Two consequence paths:**
1. **"Your witness gets the money"** (default) — real payout via PayPal Payouts API if the vow breaks
2. **"Your witness picks a charity"** — witness selects a charity at acceptance time, maker gets a cinematic reveal notification

---

## Design Principles

- The witness is a **participant**, not a rubber stamp
- The ceremony (oath + acceptance) is sacred — never interrupted by data collection
- The reveal notification is the product's most viral moment — make it cinematic
- Real money must really move — never promise what the system can't deliver
- Phone capture happens post-ceremony, framed as a service for the witness

---

## Database Changes

### `vows` table modifications

```sql
-- No new columns needed. Existing columns handle everything:
-- consequence text  → values: 'charity' | 'witness'  (remove 'anti' value)
-- destination text  → charity name (set by witness) or 'witness' 
-- 
-- Add default for destination to handle edge cases:
ALTER TABLE vows ALTER COLUMN destination SET DEFAULT 'Red Cross';
--
-- The witness_phone column already exists for phone capture.
-- The witness_accepted_at column tracks when they accepted.
```

### New: `witness_payout_status` column

```sql
ALTER TABLE vows ADD COLUMN witness_payout_status text 
  CHECK (witness_payout_status IN ('pending', 'sent', 'claimed', 'failed'))
  DEFAULT NULL;
-- NULL = not applicable (consequence != 'witness' or vow not broken)
-- pending = vow broken, payout queued
-- sent = PayPal payout sent
-- claimed = witness claimed the money
-- failed = payout failed (retry needed)
```

### Audit event types — add:

- `witness_chose_charity` — metadata: `{ charity: "NRA" }`
- `payout_sent` — metadata: `{ amount: 5000, method: "paypal", recipient_phone: "+1..." }`
- `payout_claimed` — metadata: `{ claimed_at: "..." }`
- `payout_failed` — metadata: `{ error: "..." }`

---

## Files to Modify

### Web

| File | Change | Notes |
|------|--------|-------|
| `web/src/app/stake/page.tsx` | Replace consequence section with 2-option binary | **AUTHORIZED modification of protected file** |
| `web/src/app/w/[token]/client.tsx` | Redesign witness acceptance flow (ceremony + charity pick) | Main witness experience change |
| `web/src/providers/vow-flow.tsx` | Update consequence values ('charity'/'witness'), remove destination from maker flow for charity path | State management |
| `web/src/app/reveal/[vowId]/page.tsx` | **NEW** — cinematic reveal screen for maker | The viral moment |
| `web/src/app/vow-broken/page.tsx` | Add payout status display for witness-gets-it path | Show "sending $X to [witness]" |

### Supabase Edge Functions

| Function | Change |
|----------|--------|
| `accept-witness/index.ts` | Accept `charity_choice` field in request body. If consequence='charity', update vow.destination with witness's choice. Log `witness_chose_charity` audit event. |
| `submit-verdict/index.ts` | If verdict='broken' and consequence='witness', trigger PayPal payout. Log payout events. |
| `send-sms/index.ts` | New template: reveal notification to maker when witness picks charity. New template: payout claim notification to witness. |
| **NEW** `process-payout/index.ts` | PayPal Payouts API integration. Called by submit-verdict when consequence='witness'. |

### Expo (Mobile)

| File | Change |
|------|--------|
| `expo/app/stake.tsx` | Same consequence section redesign as web |
| `expo/app/witness-invite.tsx` | Redesign to match new witness ceremony |

---

## Screen Specifications

### 1. Stake Screen — Consequence Section

**Location:** `web/src/app/stake/page.tsx` (consequence section only — preserve amount grid and deadline picker)

**Replace** the current 3-option consequence cards + cause pill picker **with:**

```
IF YOU FAIL:

┌─────────────────────────────────────────┐
│ ◉  💰  Your witness gets the money      │
│        They cash out if you break it.   │
│        Real stakes.                     │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ ○  🎯  Your witness picks a charity     │
│        They'll choose — you'll find     │
│        out when they accept.            │
└─────────────────────────────────────────┘
```

**Interaction:**
- Top option ("witness gets") is default selected
- Tapping either card selects it (radio-style, gold border on active)
- **No cause/charity pills shown.** Maker does NOT pick a specific charity for either option.
- When "witness gets" is selected: `setStake({ ...stake, consequence: 'witness', destination: 'witness' })`
- When "witness picks" is selected: `setStake({ ...stake, consequence: 'charity', destination: 'Red Cross' })` (backend default, overridden by witness)

**Styling:**
- Same card styling as current consequence cards (18px border-radius, 16px padding, gold border on active)
- Radio circle on left (20x20px, gold when active)
- Icon in 40x40px rounded wrap
- Title: 15px semibold
- Description: 13px muted
- Remove the "CHOOSE A CAUSE" pill section entirely
- Remove the `antiCauses` array and related logic

**Remove from this screen:**
- The charity/anti-cause pill picker
- The "Witness decides" third option
- All references to `antiCauses` or specific charity selection by maker

---

### 2. Witness Acceptance Page — Charity Path

**Location:** `web/src/app/w/[token]/client.tsx`

**When:** `vow.consequence === 'charity'`

**Replace the entire pending state render with:**

```
[HeaderBadge]

   {makerFirstName} put ${stakeDisplay} on the line.

   "{vow.refined_text}"

   You're the judge. Verdict day: {endDate}.

   ┌────────────────────────────────────┐
   │ ☐  I solemnly swear to hold       │
   │    {makerFirstName} accountable    │
   └────────────────────────────────────┘

   If they fail, the money goes to...

   ┌───────────┐  ┌───────────┐
   │ Red Cross │  │    NRA    │
   └───────────┘  └───────────┘
   ┌───────────┐  ┌───────────┐
   │   PETA    │  │ Planned   │
   │           │  │Parenthood │
   └───────────┘  └───────────┘
   ┌───────────┐
   │   ASPCA   │
   └───────────┘

                          Not now →
```

**Interaction:**
- Charity buttons are **visually disabled** (opacity 0.3, no pointer events) until oath checkbox is checked
- When checkbox is checked: charity buttons animate to full opacity with a subtle gold glow
- **Tapping a charity = acceptance.** This single tap:
  1. Calls `accept-witness` with `{ token, action: 'accept', charity_choice: 'NRA' }`
  2. Sets `status = 'accepted'`
  3. Transitions to confirmation screen
- There is NO separate "I'll hold them to it" button on this path
- The charity buttons ARE the accept buttons

**Charity button styling:**
- Inactive (before checkbox): `backgroundColor: var(--surface)`, `border: 1px solid var(--border)`, `opacity: 0.3`
- Active (after checkbox): `backgroundColor: rgba(212,162,79,0.08)`, `border: 1.5px solid var(--border-strong)`, `opacity: 1`, `cursor: pointer`
- Hover: `border-color: var(--gold)`, slight scale
- Pressed: `scale(0.96)`
- Text: 14px, semibold. Color transitions from `var(--text-muted)` to `var(--text)` when enabled
- Layout: CSS grid, 2 columns, gap 10px. Last item spans 1 column (left-aligned).

**Charity list (hardcoded for V1):**
```typescript
const charities = ['Red Cross', 'NRA', 'PETA', 'Planned Parenthood', 'ASPCA'];
```

---

### 3. Witness Acceptance Page — Witness Gets It Path

**Location:** `web/src/app/w/[token]/client.tsx`

**When:** `vow.consequence === 'witness'`

```
[HeaderBadge]

   {makerFirstName} put ${stakeDisplay} on the line.

   "{vow.refined_text}"

   If {makerFirstName} fails, you get ${stakeDisplay}.
   Verdict day: {endDate}.

   ┌────────────────────────────────────┐
   │ ☐  I solemnly swear to hold       │
   │    {makerFirstName} accountable    │
   └────────────────────────────────────┘

   ┌────────────────────────────────────┐
   │        I'll hold them to it        │
   │        [ disabled until ☑ ]        │
   └────────────────────────────────────┘

                          Not now →
```

**Interaction:**
- Standard oath → accept button flow
- Accept button enabled when checkbox is checked
- On accept: calls `accept-witness` with `{ token, action: 'accept' }` (no charity_choice)
- Transitions to confirmation screen

---

### 4. Post-Acceptance Confirmation + Phone Capture (Both Paths)

**Replaces** the current `acceptPhase === 'capturing'` render.

```
            ✓ Sealed.
   {consequenceMessage}

   We'll remind you when it's verdict day.

   ┌────────────────────────────────┐
   │ 📱  Your number               │
   └────────────────────────────────┘
   ┌────────────────────────────────┐
   │            Done                │
   └────────────────────────────────┘

                         Skip →
```

**Where `consequenceMessage` is:**
- Charity path: `"{makerFirstName} finds out what you chose."`
- Witness-gets-it path: `"You're the judge. If {makerFirstName} fails, you get {stakeDisplay}."`

**Phone input:**
- `type="tel"`, `inputMode="tel"` 
- Placeholder: "Your number"
- Same E.164 formatting as current `handleSaveReminder`
- "Done" button calls existing `handleSaveReminder` logic
- "Skip" sets `acceptPhase = null` → transitions to witness dashboard view

**Styling:**
- Compact, centered layout
- Phone input: same styling as current (gold border, 18px border-radius)
- "Done" button: gold gradient (only enabled when phone has 7+ digits)
- "Skip" link: 13px, muted, centered below

---

### 5. Maker Reveal Screen (NEW)

**Location:** `web/src/app/reveal/[vowId]/page.tsx` (new file)

**Triggered by:** Push notification or in-app routing when witness accepts and picks charity.

**The maker navigates here from a notification or from the dashboard (if a "reveal pending" indicator is shown).**

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                                      │
│     {witnessFirstName} made          │
│     her choice.                      │
│                                      │
│     If you fail, $50 goes to...      │
│                                      │
│                                      │
│              NRA                     │
│     [ 36px, bold, serif, gold        │
│       appears after 0.8s delay       │
│       with scale(0.8→1) + fade ]     │
│                                      │
│                                      │
│        Better keep that vow.         │
│                                      │
│                                      │
│  ┌────────────────────────────────┐  │
│  │          Continue              │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

**Animation sequence:**
1. 0ms: Screen appears dark. "{witnessName} made her choice." fades in.
2. 400ms: "If you fail, $50 goes to..." fades in.
3. 1200ms: Charity name scales up from 0.8→1.0 with opacity 0→1. Gold color. Subtle gold particle/glow effect.
4. 2000ms: "Better keep that vow." fades in, muted.
5. 2400ms: "Continue" button fades in.

**Styling:**
- Full viewport height, dark background (`var(--bg)`)
- All text centered
- "{witnessName} made her choice" — 20px, font-serif, medium, `var(--text-secondary)`
- "If you fail, $50 goes to..." — 16px, `var(--text-muted)`
- Charity name — 36px, bold, font-serif, `var(--gold-bright)`, letter-spacing -1px
- "Better keep that vow." — 14px, `var(--text-muted)`, italic
- "Continue" — standard PrimaryButton, gold gradient

**Data loading:**
- Server component fetches vow by ID (service role)
- Passes vow + witness name to client component
- Client handles animation + navigation

---

### 6. Broken Vow Payout Screen (witness-gets-it path)

**Location:** Modify `web/src/app/vow-broken/page.tsx` or route to a payout-specific screen

**When:** verdict = 'broken' AND consequence = 'witness'

Show payout status alongside the broken vow message:

```
Vow broken.

You didn't keep your word.
{witnessName} gets ${stakeDisplay}.

┌──────────────────────────────────┐
│  💸  ${stakeDisplay} sent to     │
│      {witnessName} via PayPal    │
│                                  │
│      ✓ Payment sent              │
│      (or ⏳ Processing...)       │
│      (or ❌ Failed — retrying)   │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│        Make a new vow            │
└──────────────────────────────────┘

The best revenge is keeping
your next one.
```

---

## Edge Function Changes

### `accept-witness/index.ts`

**Add to request body schema:**
```typescript
interface AcceptWitnessRequest {
  token: string;
  action: 'accept' | 'decline' | 'save-reminder';
  charity_choice?: string; // NEW — only for consequence='charity'
  phone?: string;
  name?: string;
}
```

**On action='accept':**
```typescript
// Existing logic: update witness_accepted_at, link witness_user_id...

// NEW: If consequence='charity' and charity_choice provided, update destination
if (vow.consequence === 'charity' && body.charity_choice) {
  const validCharities = ['Red Cross', 'NRA', 'PETA', 'Planned Parenthood', 'ASPCA'];
  if (validCharities.includes(body.charity_choice)) {
    await supabase.from('vows').update({ destination: body.charity_choice }).eq('id', vow.id);
    
    // Log audit event
    await logAuditEvent(vow.id, 'witness_chose_charity', 'witness', witnessUserId, {
      charity: body.charity_choice
    });
  }
}

// NEW: Send reveal notification to maker (if consequence='charity')
if (vow.consequence === 'charity' && body.charity_choice) {
  // Send push notification to maker
  await sendPushToUser(vow.user_id, {
    title: 'Your witness chose your fate',
    body: `${witnessName} accepted. If you fail, $${vow.stake_amount/100} → ${body.charity_choice}`,
    data: { type: 'reveal', vowId: vow.id }
  });
  
  // Send SMS to maker if they have a phone
  if (makerPhone) {
    await sendSms(makerPhone, `${witnessName} accepted your vow and chose: ${body.charity_choice}. If you fail, $${vow.stake_amount/100} goes there. Better keep it.`);
  }
}

// Existing logic: send acceptance SMS/push for witness-gets-it path...
```

### `submit-verdict/index.ts`

**Add after existing broken-vow logic:**
```typescript
if (verdict === 'broken' && vow.consequence === 'witness') {
  // Trigger payout to witness
  try {
    const payoutResult = await triggerWitnessPayout(vow);
    await supabase.from('vows')
      .update({ witness_payout_status: 'sent' })
      .eq('id', vow.id);
    await logAuditEvent(vow.id, 'payout_sent', 'system', null, {
      amount: vow.stake_amount,
      method: 'paypal',
      recipient_phone: vow.witness_phone
    });
  } catch (error) {
    await supabase.from('vows')
      .update({ witness_payout_status: 'failed' })
      .eq('id', vow.id);
    await logAuditEvent(vow.id, 'payout_failed', 'system', null, { error: error.message });
  }
}
```

### NEW: `process-payout/index.ts`

```typescript
// PayPal Payouts API integration
// 
// Environment variables needed:
//   PAYPAL_CLIENT_ID
//   PAYPAL_CLIENT_SECRET
//   PAYPAL_API_URL (sandbox vs production)
//
// Flow:
// 1. Get PayPal OAuth token
// 2. Create payout batch with single item
// 3. Send to witness phone or email
// 4. Return payout batch ID for tracking
//
// PayPal Payouts API docs: https://developer.paypal.com/docs/api/payments.payouts-batch/v1/

export async function triggerWitnessPayout(vow: Vow): Promise<{ batchId: string }> {
  const accessToken = await getPayPalToken();
  
  const response = await fetch(`${PAYPAL_API_URL}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: `vow-${vow.id}-${Date.now()}`,
        email_subject: "You won! Your friend broke their vow",
        email_message: `${makerName} broke their vow. Here's your $${vow.stake_amount / 100}.`
      },
      items: [{
        recipient_type: vow.witness_phone ? 'PHONE' : 'EMAIL',
        amount: {
          value: (vow.stake_amount / 100).toFixed(2),
          currency: 'USD'
        },
        receiver: vow.witness_phone || witnessEmail,
        note: `Payout from Unbreakable Vow — ${makerName} broke their vow`,
        sender_item_id: `vow-${vow.id}`
      }]
    })
  });
  
  const data = await response.json();
  return { batchId: data.batch_header.payout_batch_id };
}
```

---

## Notification Templates

### Push Notifications

| Event | Title | Body |
|-------|-------|------|
| Witness accepts (charity path) | "Your witness chose your fate" | "{witnessName} accepted. If you fail, ${amount} → {charity}." |
| Witness accepts (witness-gets-it) | "{witnessName} is watching" | "{witnessName} accepted your vow. If you fail, they get ${amount}. 👀" |
| Witness declines | "Witness declined" | "{witnessName} declined. Your vow continues without a witness." |
| Payout sent to witness | "You won!" | "{makerName} broke their vow. ${amount} is yours — check PayPal." |

### SMS Templates

| Event | Recipient | Message |
|-------|-----------|---------|
| Reveal (charity path) | Maker | "{witnessName} accepted your vow and chose {charity}. $${amount} goes there if you fail. Better keep it." |
| Acceptance (witness-gets-it) | Maker | "{witnessName} accepted your vow. If you fail, you owe them $${amount}. They're watching." |
| Verdict reminder | Witness | "It's verdict day for {makerName}'s vow: \"{vowText}\". Did they keep it? {verdictUrl}" |
| Payout claim | Witness | "{makerName} broke their vow! You get $${amount}. Check your PayPal." |

---

## Analytics Events

Instrument these from day one:

| Event | Properties | Why |
|-------|-----------|-----|
| `consequence_selected` | `type: 'witness' \| 'charity'` | Which option makers prefer |
| `witness_page_loaded` | `consequence_type, has_stake` | Funnel top |
| `witness_oath_checked` | `consequence_type` | Commitment step |
| `witness_charity_picked` | `charity_name` | Which charities get picked, distribution |
| `witness_accepted` | `consequence_type, had_phone, time_on_page` | Conversion rate |
| `witness_phone_entered` | `consequence_type` | Phone capture rate |
| `witness_phone_skipped` | `consequence_type` | Skip rate |
| `reveal_notification_sent` | `charity_name` | Outbound |
| `reveal_screen_viewed` | `charity_name, time_to_open` | Engagement |
| `reveal_shared` | `share_method` | Viral measurement (THE key metric) |
| `payout_sent` | `amount, method` | Money movement |
| `payout_claimed` | `amount, time_to_claim` | Witness engagement |
| `verdict_submitted` | `verdict, consequence_type, had_phone` | Core loop completion |

---

## Key Implementation Constraints

1. **Protected files being modified:** `stake/page.tsx` and the witness flow are on the DO NOT MODIFY list in CLAUDE.md. These modifications are explicitly authorized by the product owner for this feature.

2. **Backward compatibility:** Existing vows with `consequence = 'anti'` must still display correctly. Don't break the history page or existing vow detail views. Just don't offer 'anti' as a new option.

3. **The charity pick must be atomic with acceptance.** One API call to `accept-witness` handles both the acceptance AND the charity selection. No separate calls. No race conditions.

4. **PayPal Payouts requires a PayPal Business account** with Payouts API enabled. This needs to be set up before "witness gets it" can go live. If not ready, ship with only the charity path and add witness-gets-it when PayPal is configured.

5. **Backend default:** The `destination` column defaults to 'Red Cross'. This is a silent safety net — never shown to users as a choice, just prevents null destinations.

6. **The reveal screen must work even if the maker opens it hours later.** It's not a one-time animation — the vow detail or dashboard should link to it anytime the charity was recently picked. Store a `reveal_seen` flag or timestamp to know whether to show the reveal vs. the normal dashboard.

7. **Free vows ($0 stake):** When stake = 0, the consequence section is hidden entirely. No changes to the free vow flow.

---

## Implementation Order

1. **Database migration** — add `witness_payout_status`, update `destination` default
2. **Stake screen redesign** — replace consequence section (web + mobile)
3. **Witness acceptance redesign** — ceremony with charity pick (web)
4. **Accept-witness edge function** — handle charity_choice, send reveal notification
5. **Reveal screen** — new page for maker
6. **Phone capture** — move to post-ceremony confirmation
7. **PayPal Payouts integration** — process-payout edge function
8. **Submit-verdict update** — trigger payout on broken vow
9. **Broken-vow payout screen** — show payout status
10. **Analytics instrumentation** — all events
11. **Mobile (Expo)** — port stake + witness changes
