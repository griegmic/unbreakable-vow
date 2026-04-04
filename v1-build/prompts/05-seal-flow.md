# Prompt 05: Seal Flow — PaymentIntent + Vow Creation + Status Update

## Context
Unbreakable Vow app. When a user "seals" their vow, three things happen:
1. A vow record is created in Supabase
2. Stripe charges their card
3. The vow status moves from `draft` → `sealed`

Auth (Prompt 03) and Stripe (Prompt 04) are working. The `seal.tsx` screen (463 lines) currently shows a summary and plays a seal animation, then routes to `/sent`.

## Current seal.tsx behavior
- Shows vow text, witness name, stake amount, consequence
- Has proof mode selector (word vs screenshot) — **remove this** (v1 is word-only)
- Has crew member display — **remove this** (v1 has no crew)
- Shows "I solemnly swear" oath
- On seal: plays animation → routes to `/sent`

## What to do

### 1. Modify `app/seal.tsx`

**Remove:**
- Proof mode selector (lines ~179-218) — delete the entire section
- Crew member display (lines ~155-162) — delete it
- VowKeeper conditional checks (`isVowkeeper`) — delete all branches, keep only the external-witness path

**Add the real seal flow:**

When user taps the seal button:
1. Show loading state on button
2. Create vow record in Supabase:
   ```typescript
   const { data: vow, error } = await supabase.from('vows').insert({
     user_id: session.user.id,
     raw_input: vowState.rawInput,
     refined_text: activeVowText,
     witness_name: vowState.witnessName,
     witness_phone: vowState.phoneNumber || null,
     witness_invite_token: crypto.randomUUID(),
     stake_amount: vowState.stake.amount * 100, // convert to cents
     consequence: vowState.stake.consequence,
     destination: vowState.stake.destination,
     status: 'draft',
     starts_at: new Date().toISOString(),
     ends_at: getVowEndDate(), // 7 days from now
   }).select().single();
   ```
3. Call `create-payment-intent` Edge Function with `vow.id` and amount
4. Present Stripe PaymentSheet
5. If payment succeeds:
   - Update vow status to `sealed`, set `sealed_at`
   - Play the existing seal animation
   - Route to `/sent`
6. If payment fails or user cancels:
   - Update vow status to `voided`
   - Show error message
   - Stay on seal screen

**Keep:**
- The existing seal animation sequence
- The oath text and styling
- The summary display (vow text, witness, amount)
- All haptic feedback
- BackButton and screen layout

### 2. Create helper `expo/lib/vow-api.ts`

```typescript
import { supabase } from './supabase';

export async function createVow(params: {
  rawInput: string;
  refinedText: string;
  witnessName: string;
  witnessPhone: string | null;
  stakeAmount: number; // dollars
  consequence: string;
  destination: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);

  const { data, error } = await supabase.from('vows').insert({
    user_id: session.user.id,
    raw_input: params.rawInput,
    refined_text: params.refinedText,
    witness_name: params.witnessName,
    witness_phone: params.witnessPhone,
    witness_invite_token: crypto.randomUUID(),
    stake_amount: params.stakeAmount * 100,
    consequence: params.consequence,
    destination: params.destination,
    status: 'draft',
    starts_at: new Date().toISOString(),
    ends_at: endDate.toISOString(),
  }).select().single();

  if (error) throw error;
  return data;
}

export async function sealVow(vowId: string) {
  const { error } = await supabase.from('vows').update({
    status: 'sealed',
    sealed_at: new Date().toISOString(),
  }).eq('id', vowId);
  if (error) throw error;
}

export async function getActiveVow() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data } = await supabase.from('vows')
    .select('*')
    .eq('user_id', session.user.id)
    .in('status', ['sealed', 'active', 'awaiting_verdict'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}

export async function getVowHistory() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data } = await supabase.from('vows')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  return data ?? [];
}
```

### 3. Create Edge Function: `supabase/functions/seal-vow/index.ts`

This is the main orchestrator called AFTER payment succeeds:
1. Receives `{ vow_id }` from client
2. Verifies user owns the vow
3. Updates status to `sealed` → `active`
4. Generates the witness verdict URL: `https://your-domain.com/verdict/{witness_invite_token}`
5. Sends SMS #1 to witness via Twilio (if witness_phone exists)
6. Schedules SMS #2 and #3 in `push_queue` or directly computes send times
7. Returns success

```typescript
// Called after Stripe payment succeeds
// POST { vow_id }
// Auth: Bearer token required

// 1. Verify ownership
// 2. Update vow: status = 'active', sealed_at = now()
// 3. Send SMS #1: seal notification to witness
// 4. Return { success: true, verdict_url }
```

## Do NOT modify
- `app/index.tsx`
- `app/refine.tsx`
- `constants/unbreakable.ts`
- `components/vow-ui.tsx`
- `app/witness.tsx`
- `app/stake.tsx`

## Important notes
- The seal button should be disabled while loading. Show a spinner inside the button.
- If the user backs out mid-payment, the vow stays in `draft` status. That's fine.
- `crypto.randomUUID()` is available in React Native via expo-crypto polyfill.
- The witness_invite_token is what authenticates the witness on the web verdict page.
