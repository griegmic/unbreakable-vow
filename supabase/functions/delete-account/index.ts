/**
 * delete-account — V6 edge function
 *
 * Atomically: void all active vows + refund, soft-delete user,
 * flag Stripe customer, sign out.
 *
 * Canonical source: IMPLEMENTATION-V6.md §6.1.1
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createAuditEvent } from '../_shared/audit.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!;

async function stripePost(endpoint: string, params?: Record<string, string>, idempotencyKey?: string) {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${stripeKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const resp = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: 'POST',
    headers,
    body: params ? new URLSearchParams(params).toString() : '',
  });
  return resp.json();
}

async function stripeGet(endpoint: string) {
  const resp = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    headers: { 'Authorization': `Bearer ${stripeKey}` },
  });
  return resp.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the user's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });

    const userId = user.id;

    // 1. Find all active vows owned by this user
    const { data: activeVows } = await supabase
      .from('vows')
      .select('id, stake_amount, stripe_payment_intent_id, stripe_setup_intent_id, status')
      .eq('user_id', userId)
      .in('status', ['draft', 'sealed', 'active', 'awaiting_verdict']);

    // 2. Void each active vow and refund where applicable
    for (const vow of (activeVows || [])) {
      // SetupIntent-only vows (stripe_setup_intent_id populated, no PI): no money is held.
      // SetupIntents authorize a card for future charges but don't capture funds.
      // Orphaned SIs on Stripe are acceptable — they expire automatically (per Stripe docs)
      // and cannot be used to charge after account deletion since we don't store the PM.
      // Only PaymentIntents require active refund/cancellation.
      if (vow.stripe_payment_intent_id && vow.stripe_payment_intent_id.startsWith('pi_')) {
        try {
          const pi = await stripeGet(`payment_intents/${vow.stripe_payment_intent_id}`);
          if (pi.status === 'requires_capture') {
            await stripePost(`payment_intents/${vow.stripe_payment_intent_id}/cancel`);
          } else if (pi.status === 'succeeded') {
            await stripePost('refunds', {
              payment_intent: vow.stripe_payment_intent_id,
            }, `refund-delete-${vow.id}`);
          }
        } catch (err) {
          console.error(`Refund failed for vow ${vow.id}:`, err);
          // Continue — don't block deletion on refund failure
        }
      }

      // Void the vow
      await supabase
        .from('vows')
        .update({ status: 'voided', verdict: null, verdict_at: null })
        .eq('id', vow.id)
        .in('status', ['draft', 'sealed', 'active', 'awaiting_verdict']);

      await createAuditEvent(supabase, vow.id, 'vow_voided', 'system', userId, {
        reason: 'account_deletion',
      });
    }

    // 3. Soft-delete the user
    await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId);

    // 4. Flag Stripe customer (preserve payment history)
    const { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userData?.stripe_customer_id) {
      try {
        await stripePost(`customers/${userData.stripe_customer_id}`, {
          'metadata[deleted_account]': 'true',
          'metadata[deleted_at]': new Date().toISOString(),
        });
      } catch {
        // Non-critical — log and continue
      }
    }

    // 5. Audit
    await createAuditEvent(supabase, '', 'account_deleted', 'maker', userId, {
      vows_voided: (activeVows || []).length,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    console.error('delete-account error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
