# Phase 2: Edge Functions (New + Modified)

## Context
Phase 1 deployed schema changes: audit_events table, challenge columns on vows, witness_user_id, updated SMS templates, and shared audit helper. All tables and columns are in place.

## Objective
All backend logic deployed and testable via curl before building any UI. Two new edge functions, two modifications to existing functions, and audit event integration across all state-changing functions.

## Tasks

### 1. Create `accept-challenge` edge function

Create `supabase/functions/accept-challenge/index.ts`

```
POST /functions/v1/accept-challenge
Auth: Service role (public, token-based access)
CORS: Standard headers (match existing functions)

Request body:
{
  "token": string (challenge_invite_token, required),
  "action": "accept" | "decline" (optional, default "accept")
}

ACCEPT logic:
1. Create service-role Supabase client
2. Fetch vow by challenge_invite_token (select *)
3. If not found → 404 { error: "invalid_token" }
4. If challenge_status != 'pending' → 409 { error: "already_responded", challenge_status }
5. If status not in ('active','sealed') → 400 { error: "vow_not_active", status }
6. Check if a user exists with phone matching vow.target_phone:
   SELECT id FROM users WHERE phone = vow.target_phone LIMIT 1
7. Atomic update vow:
   - challenge_status = 'accepted'
   - target_user_id = matched user id (if found, else null)
   WHERE challenge_invite_token = token AND challenge_status = 'pending'
8. If update affected 0 rows → 409 (race condition, already accepted)
9. Create audit event: event_type='challenge_accepted', actor_type='target', actor_id=matched user id
10. Insert push_queue notification to vow.user_id: "Your challenge was accepted!"
11. Return { success: true, action: "accepted" }

DECLINE logic:
1-5. Same validation as accept
6. Update vow: challenge_status = 'declined'
7. If vow.stake_amount > 0 AND vow.stripe_payment_intent_id:
   - Issue Stripe refund with idempotency key "refund-{vow_id}"
   - If refund fails: set refund_failed = true
8. Update vow: status = 'voided'
9. Create audit event: event_type='challenge_declined', actor_type='target'
10. Insert push_queue notification: "Your challenge was declined"
11. Return { success: true, action: "declined" }
```

Reference `accept-witness/index.ts` for the pattern (CORS, service role client, token lookup, atomic update).

### 2. Create `void-vow` edge function

Create `supabase/functions/void-vow/index.ts`

```
POST /functions/v1/void-vow
Auth: JWT Bearer token (user must own the vow)
CORS: Standard headers

Request body:
{
  "vow_id": string (required)
}

Logic:
1. Extract user from JWT (same pattern as create-payment-intent)
2. Fetch vow by id WHERE user_id = jwt.sub
3. If not found → 404 { error: "vow_not_found" }
4. If status not in ('active', 'awaiting_verdict') → 400 { error: "cannot_void", status }
5. If vow.stripe_payment_intent_id AND vow.stake_amount > 0:
   - Issue Stripe refund: POST /v1/refunds
     { payment_intent: vow.stripe_payment_intent_id }
     Idempotency-Key: "refund-{vow_id}"
   - If refund fails: set refund_failed = true (still proceed to void)
6. Update vow: status = 'voided'
7. Create audit event: event_type='vow_voided', actor_type='maker', actor_id=user.id
8. If vow.witness_phone:
   - Send SMS using send-sms templates: "{display_name} withdrew their vow: '{refined_text}'"
   - If SMS fails: non-blocking, log error
9. If vow.witness_user_id:
   - Insert push_queue notification: "A vow you were witnessing was withdrawn"
10. Return { success: true, refunded: boolean (true if refund attempted) }
```

Reference `seal-vow/index.ts` for JWT auth pattern and Stripe API calls.

### 3. Modify `seal-vow` edge function

Read `supabase/functions/seal-vow/index.ts` CAREFULLY before modifying.

**Change 1: $0 stake conditional**
Find the Stripe payment verification section. Wrap it:

```typescript
if (vow.stake_amount > 0) {
  // === EXISTING STRIPE LOGIC — DO NOT MODIFY ===
  // Check stripe_payment_intent_id exists
  // Fetch PI status from Stripe
  // Capture if requires_capture
  // Verify succeeded
  // === END EXISTING LOGIC ===
} else {
  // $0 vow — skip Stripe entirely
  console.log('$0 vow — skipping Stripe');
}
```

**Change 2: Challenge SMS**
Find the SMS sending section. Add challenge path:

```typescript
if (vow.vow_type === 'challenge' && vow.target_phone) {
  // Import challengeMessage from sms-templates
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const acceptUrl = `${supabaseUrl.replace('.supabase.co', '')}.vercel.app/c/${vow.challenge_invite_token}`;
  // Actually use the web app URL, not supabase URL. Check existing code for how witness URL is constructed.
  const body = challengeMessage(ownerName, vow.refined_text, vow.stake_amount, endDateStr, acceptUrl);
  // Send SMS to target_phone using same Twilio pattern
  // Log to sms_log with message_type='challenge_invite'
} else if (vow.witness_phone) {
  // === EXISTING WITNESS SMS — DO NOT MODIFY ===
}
```

**Change 3: Audit events**
After successful activation, add:
```typescript
import { createAuditEvent } from '../_shared/audit.ts';
// After vow activated:
await createAuditEvent(supabaseAdmin, vow.id, 'vow_sealed', 'maker', userId);
if (vow.vow_type === 'challenge') {
  await createAuditEvent(supabaseAdmin, vow.id, 'challenge_sent', 'maker', userId);
} else if (vow.witness_phone) {
  await createAuditEvent(supabaseAdmin, vow.id, 'witness_invited', 'system', null);
}
```

### 4. Modify `cron-runner` edge function

Read `supabase/functions/cron-runner/index.ts` CAREFULLY before modifying.

Add two new tasks after the existing ones:

```typescript
// === Task 5: Retry failed SMS ===
try {
  const { data: smsFailed } = await supabaseAdmin
    .from('vows')
    .select('*')
    .eq('sms_failed', true)
    .gte('sealed_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

  for (const vow of smsFailed || []) {
    // Check how many SMS attempts already made (count sms_log entries)
    const { count } = await supabaseAdmin
      .from('sms_log')
      .select('*', { count: 'exact', head: true })
      .eq('vow_id', vow.id)
      .eq('message_type', 'seal');

    if ((count || 0) >= 3) {
      // Give up — push notification to maker
      await supabaseAdmin.from('push_queue').insert({
        user_id: vow.user_id,
        title: 'Witness invite failed',
        body: `We couldn't text your witness. Share the link manually.`,
        data: { route: '/live', vowId: vow.id },
        send_after: new Date().toISOString(),
      });
      // Clear flag so we stop retrying
      await supabaseAdmin.from('vows').update({ sms_failed: false }).eq('id', vow.id);
      continue;
    }

    // Retry SMS — invoke send-sms function
    // Follow the same pattern used in seal-vow for sending SMS
    // On success: clear sms_failed flag
    // On failure: leave flag, will retry next cron run
    results.sms_retry = (results.sms_retry || 0) + 1;
  }
} catch (e) {
  errors.push(`sms_retry: ${e.message}`);
}

// === Task 6: Retry failed refunds ===
try {
  const { data: refundFailed } = await supabaseAdmin
    .from('vows')
    .select('*')
    .eq('refund_failed', true);

  for (const vow of refundFailed || []) {
    if (!vow.stripe_payment_intent_id) {
      // No PI — clear flag (shouldn't happen for $0 vows)
      await supabaseAdmin.from('vows').update({ refund_failed: false }).eq('id', vow.id);
      continue;
    }

    try {
      // Attempt Stripe refund with idempotency key
      const refundRes = await fetch('https://api.stripe.com/v1/refunds', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': `refund-${vow.id}`,
        },
        body: `payment_intent=${vow.stripe_payment_intent_id}`,
      });

      if (refundRes.ok) {
        await supabaseAdmin.from('vows')
          .update({ refund_failed: false })
          .eq('id', vow.id);
        await createAuditEvent(supabaseAdmin, vow.id, 'refund_issued', 'system');
      } else {
        // Still failing — check if we should give up
        // For now, leave flag and retry next cron. Manual intervention after repeated failures.
      }
      results.refund_retry = (results.refund_retry || 0) + 1;
    } catch (e) {
      errors.push(`refund_retry ${vow.id}: ${e.message}`);
    }
  }
} catch (e) {
  errors.push(`refund_retry: ${e.message}`);
}
```

### 5. Add audit events to existing unchanged functions

**`accept-witness/index.ts`** — Read first, then add after the update:
```typescript
import { createAuditEvent } from '../_shared/audit.ts';
// After successful accept:
await createAuditEvent(supabaseAdmin, vow.id, 'witness_accepted', 'witness', null, { witness_name: vow.witness_name });
// After successful decline:
await createAuditEvent(supabaseAdmin, vow.id, 'witness_declined', 'witness', null, { witness_name: vow.witness_name });
```

Also: when witness accepts, check if a user exists with matching phone and set `witness_user_id`:
```typescript
// After accept update, try to link witness account
const { data: witnessUser } = await supabaseAdmin
  .from('users')
  .select('id')
  .eq('phone', vow.witness_phone)
  .maybeSingle();
if (witnessUser) {
  await supabaseAdmin.from('vows')
    .update({ witness_user_id: witnessUser.id })
    .eq('id', vow.id);
}
```

**`submit-verdict/index.ts`** — Read first, then add:
```typescript
import { createAuditEvent } from '../_shared/audit.ts';
// After verdict recorded:
await createAuditEvent(supabaseAdmin, vow.id, 'verdict_submitted', 'witness', null, { verdict });
// After refund succeeds:
await createAuditEvent(supabaseAdmin, vow.id, 'refund_issued', 'system');
// After refund fails:
await createAuditEvent(supabaseAdmin, vow.id, 'refund_failed', 'system', null, { error: errorMessage });
```

## Reference Files
- `supabase/functions/seal-vow/index.ts` — READ BEFORE MODIFYING
- `supabase/functions/cron-runner/index.ts` — READ BEFORE MODIFYING
- `supabase/functions/accept-witness/index.ts` — READ BEFORE MODIFYING (pattern + audit addition)
- `supabase/functions/submit-verdict/index.ts` — READ BEFORE MODIFYING (audit addition)
- `supabase/functions/create-payment-intent/index.ts` — READ FOR REFERENCE (JWT auth pattern)
- `supabase/functions/_shared/audit.ts` — created in Phase 1
- `supabase/functions/_shared/sms-templates.ts` — updated in Phase 1
- `supabase/functions/_shared/twilio.ts` — SMS sending utility

## Verification
- [ ] Deploy all functions: `supabase functions deploy`
- [ ] curl test: seal-vow with stake_amount=0 vow succeeds without Stripe
- [ ] curl test: seal-vow with stake_amount>0 vow still works (existing flow)
- [ ] curl test: seal-vow with vow_type='challenge' sends challenge SMS
- [ ] curl test: accept-challenge with valid token → challenge_status=accepted
- [ ] curl test: accept-challenge decline → vow voided, refund if staked
- [ ] curl test: accept-challenge with invalid token → 404
- [ ] curl test: void-vow by owner → status=voided, refund if staked
- [ ] curl test: void-vow by non-owner → 401/404
- [ ] curl test: void-vow on kept vow → 400 cannot_void
- [ ] Verify audit_events rows created for each operation above
- [ ] Existing mobile vow creation still works end-to-end (regression: create draft → seal → verify active)
- [ ] Existing witness accept still works (regression)
- [ ] Existing verdict submission still works (regression)

## Do Not Touch
- `create-payment-intent/index.ts` — no changes needed
- `send-sms/index.ts` — no changes needed
- `verdict-page/index.ts` — no changes needed
- Database migration files (deployed in Phase 1)
- Any web or Expo app code
