# Phase 4: Power-User Creation + $0 Vows

## Context
Phase 3 built the dashboard. Users can see vows but can only create them via the old multi-step flow. This phase adds the fast single-page creation form and enables $0 (no-money) vows.

## Objective
Authenticated users create vows from a single page. $0 vows work end-to-end without touching Stripe.

## Tasks

### 1. Update VowFlowProvider
Read `web/src/providers/vow-flow.tsx` first. Add new fields WITHOUT removing existing ones:

```typescript
// Add to state:
vowType: 'self' | 'challenge'  // default 'self'
targetName: string              // default ''
targetPhone: string             // default ''

// Add to context/methods:
setVowType: (type: 'self' | 'challenge') => void
setTarget: (name: string, phone: string) => void
```

Add these to sessionStorage persistence alongside existing fields. All existing fields, methods, and behavior remain unchanged.

### 2. Create power-user creation page
Create `web/src/app/create/page.tsx` (client component)

**Layout — single scrollable form:**
```
← Back to Dashboard

New Vow

[Textarea: "What are you committing to?"]
  └─ If vague: inline suggestion below (not a separate page)
     "Stronger version: ..." with [Use this] button

WHO IS THIS FOR?
  (●) Me    ( ) Someone else

[If "Me":]
  WITNESS
  [Recent witness chips: David, Mikey, ...]  [+ New person]
  └─ New person: Name input + Phone input (inline expand)

[If "Someone else":]
  WHO ARE YOU CHALLENGING?
  Name: [input]
  Phone: [input]
  (You'll be their witness)

STAKE
  [$0]  [$10]  [$25]  [$50]  [$100]
  [If > $0:]
    Consequence: [Charity ▼] [Anti-cause ▼]
    Destination: [dropdown]

DEADLINE
  [This Friday]  [End of week]  [In 7 days]  [Pick date ▼]

┌─ Preview ─────────────────────┐
│ "Run 3 miles before Friday"   │
│ Witness: David · $25 stake    │
│ Due: Fri Apr 10               │
└───────────────────────────────┘

☐ I solemnly swear to honor this vow

[ Seal This Vow ]
```

**Recent witnesses query:**
```typescript
const { data: recentWitnesses } = await supabase
  .from('vows')
  .select('witness_name, witness_phone')
  .eq('user_id', session.user.id)
  .not('witness_name', 'eq', 'Just me')
  .not('witness_name', 'is', null)
  .order('created_at', { ascending: false });

// Deduplicate by witness_name
const unique = [...new Map(recentWitnesses.map(w => [w.witness_name, w])).values()].slice(0, 5);
```

**Vow analysis (inline):**
Use existing `analyzeVow()` and `generateSuggestion()` from `lib/vow-logic.ts`. If vow is vague, show suggestion below the textarea. If already good, show nothing (no refine page needed).

**Seal logic:**
```typescript
async function handleSeal() {
  // 1. Insert vow into DB
  const vowData = {
    user_id: session.user.id,
    raw_input: rawInput,
    refined_text: refinedText || rawInput,
    status: 'draft',
    vow_type: vowType,
    witness_name: vowType === 'challenge' ? displayName : witnessName,
    witness_phone: vowType === 'challenge' ? null : witnessPhone,
    witness_user_id: vowType === 'challenge' ? session.user.id : null,
    target_phone: vowType === 'challenge' ? targetPhone : null,
    challenge_invite_token: vowType === 'challenge' ? crypto.randomUUID() : null,
    witness_invite_token: vowType === 'self' ? crypto.randomUUID() : null,
    stake_amount: stakeAmount, // 0 for no stake
    consequence: stakeAmount > 0 ? consequence : 'none',
    destination: stakeAmount > 0 ? destination : 'none',
    starts_at: new Date().toISOString(),
    ends_at: deadline.toISOString(),
  };

  const { data: vow, error } = await supabase
    .from('vows')
    .insert(vowData)
    .select()
    .single();

  if (error) { /* show error */ return; }

  // 2. Handle payment (if staked)
  if (stakeAmount > 0) {
    // Call create-payment-intent
    const piRes = await supabase.functions.invoke('create-payment-intent', {
      body: { vow_id: vow.id }
    });
    // Show Stripe payment sheet
    // On payment success → call seal-vow
    // On payment failure → show error
  } else {
    // $0 vow — skip Stripe, call seal-vow directly
    const sealRes = await supabase.functions.invoke('seal-vow', {
      body: { vow_id: vow.id }
    });
    if (sealRes.error) { /* show error */ return; }
  }

  // 3. Redirect
  if (stakeAmount > 0) {
    router.push(`/certificate/${vow.id}`);
  } else {
    router.push('/dashboard');
  }
}
```

**Important:** For the Stripe payment flow when stake > 0, reference how `seal/page.tsx` implements the PaymentForm + Stripe Elements. You may need to render the PaymentForm component conditionally within this page, or redirect to `/seal` with the vow pre-loaded. Choose the simpler approach — if reusing PaymentForm component is straightforward, do that. If not, redirect to seal page with the vow ID in query params.

### 3. Modify seal page for $0 vows
Read `web/src/app/seal/page.tsx` CAREFULLY.

Add a conditional path: if the vow's stake_amount is 0, skip the Stripe payment form and call seal-vow directly after oath checkbox.

This is a BACKUP path — the primary $0 flow goes through `/create`. But if someone uses the old flow and somehow has $0, it should work.

```typescript
// After oath checked and seal button pressed:
if (stake.amount === 0) {
  // Insert vow with stake_amount: 0
  // Call seal-vow directly (no create-payment-intent, no Stripe sheet)
  // Redirect to dashboard
} else {
  // Existing Stripe flow — UNCHANGED
}
```

### 4. Add creation button to dashboard
In `dashboard/page.tsx` (from Phase 3), the "+ Make a Vow" button should link to `/create`.

## Reference Files
- `web/src/providers/vow-flow.tsx` — READ BEFORE MODIFYING
- `web/src/app/seal/page.tsx` — READ BEFORE MODIFYING (reference for Stripe flow + $0 backup path)
- `web/src/components/payment-form.tsx` — understand how PaymentForm works
- `web/src/lib/vow-logic.ts` — analyzeVow, generateSuggestion, getContextualSuggestions, stakeAmounts, consequenceOptions, charities, antiCauses
- `web/src/components/ui.tsx` — ChoiceChip, PrimaryButton, RitualCard, OathCheckbox, VowPreview, SectionLabel, FadeUp
- `web/src/app/dashboard/page.tsx` — from Phase 3

## Verification
- [ ] `/create` page renders with all form fields
- [ ] "Me" toggle: witness field shows recent witnesses + new person option
- [ ] "Someone else" toggle: challenge target fields appear
- [ ] Recent witnesses populated from DB (deduplicated)
- [ ] $0 chip selected: consequence section hidden
- [ ] Deadline presets calculate correct dates
- [ ] Preview card updates in real-time
- [ ] Inline suggestion appears for vague vow text
- [ ] Oath checkbox required before seal button activates
- [ ] $0 vow seal: no Stripe, vow active in dashboard
- [ ] Staked vow seal: Stripe sheet, payment captured, vow active
- [ ] Challenge vow: correct fields populated (vow_type, target_phone, challenge_invite_token)
- [ ] Self vow: correct fields populated (witness_name, witness_phone, witness_invite_token)
- [ ] Seal page $0 backup path works
- [ ] VowFlowProvider backwards-compatible (existing /seal flow still works)
- [ ] New vow appears on dashboard after creation

## Do Not Touch
- `/refine`, `/stake`, `/witness` (first-time flow pages)
- `/live`, `/self-resolve`, `/vow-kept`, `/vow-broken`
- All witness pages, outcome pages
- `components/ui.tsx`, `components/auth-modal.tsx`, `components/share-button.tsx`
- `lib/supabase.ts`, `lib/vow-logic.ts`
- `providers/auth-provider.tsx`
- All Supabase edge functions (modified in Phase 2)
- All Expo files
