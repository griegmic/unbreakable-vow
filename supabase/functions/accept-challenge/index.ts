import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createAuditEvent } from '../_shared/audit.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function stripePost(endpoint: string, params: Record<string, string>, idempotencyKey?: string) {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: 'POST',
    headers,
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Stripe error: ${res.status}`);
  return data;
}

async function stripeGet(endpoint: string) {
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Stripe error: ${res.status}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { token, action } = body;

    if (!token) {
      return jsonResponse({ error: 'token required' }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch vow by challenge_invite_token
    const { data: vow, error: vowError } = await supabase
      .from('vows')
      .select('*')
      .eq('challenge_invite_token', token)
      .single();

    if (vowError || !vow) {
      return jsonResponse({ error: 'invalid_token' }, 404);
    }

    // === SAVE PHONE (post-acceptance, stores target_phone for verdict SMS) ===
    if (action === 'save_phone') {
      const { phone } = body;
      if (!phone) {
        return jsonResponse({ error: 'phone required' }, 400);
      }
      if (vow.challenge_status !== 'accepted') {
        return jsonResponse({ error: 'vow_not_accepted' }, 400);
      }
      await supabase
        .from('vows')
        .update({ target_phone: phone })
        .eq('id', vow.id);
      return jsonResponse({ success: true, action: 'phone_saved' });
    }

    // === PREPARE PAYMENT (step 1 of deferred-intent Apple Pay flow) ===
    if (action === 'prepare_payment') {
      if (vow.challenge_status !== 'pending') {
        return jsonResponse({ error: 'already_responded', challenge_status: vow.challenge_status }, 409);
      }
      if (vow.status !== 'draft') {
        return jsonResponse({ error: 'vow_not_draft', status: vow.status }, 400);
      }

      const { stake_amount, email, display_name } = body;
      if (!email) return jsonResponse({ error: 'email required' }, 400);

      const stakeAmountCents = typeof stake_amount === 'number' ? stake_amount : 0;
      if (stakeAmountCents < 1000 || stakeAmountCents > 10000) {
        return jsonResponse({ error: 'stake_amount must be between $10 and $100' }, 400);
      }

      // Find or create user
      let targetUserId: string;
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email, email_confirm: true, user_metadata: { full_name: display_name || '' },
      });
      if (newUser?.user) {
        targetUserId = newUser.user.id;
        await supabase.from('users').upsert({ id: targetUserId, display_name: display_name || email.split('@')[0] });
      } else if (createError?.message?.toLowerCase().includes('already')) {
        let foundId: string | null = null;
        let page = 1;
        const perPage = 100;
        while (!foundId) {
          const { data: listed } = await supabase.auth.admin.listUsers({ page, perPage });
          const users = listed?.users;
          if (!users || users.length === 0) break;
          const match = users.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase());
          if (match) { foundId = match.id; break; }
          if (users.length < perPage) break;
          page++;
        }
        if (!foundId) return jsonResponse({ error: 'failed_to_find_account' }, 500);
        targetUserId = foundId;
      } else {
        return jsonResponse({ error: 'failed_to_create_account' }, 500);
      }

      if (display_name) {
        await supabase.from('users').update({ display_name }).eq('id', targetUserId);
      }

      // Get or create Stripe customer
      const { data: userProfile } = await supabase
        .from('users').select('stripe_customer_id').eq('id', targetUserId).single();
      let customerId = userProfile?.stripe_customer_id;
      if (!customerId) {
        const customer = await stripePost('customers', {
          email, 'metadata[supabase_user_id]': targetUserId,
        });
        customerId = customer.id;
        await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', targetUserId);
      }

      // Create PaymentIntent (no PM, no confirm — client will confirm with Apple Pay or card)
      const pi = await stripePost('payment_intents', {
        amount: String(stakeAmountCents),
        currency: 'usd',
        customer: customerId,
        capture_method: 'manual',
        'automatic_payment_methods[enabled]': 'true',
        'metadata[vow_id]': vow.id,
        'metadata[user_id]': targetUserId,
        'metadata[type]': 'challenge_acceptance',
      }, `challenge-prepare-${vow.id}-${targetUserId}`);

      return jsonResponse({
        success: true,
        action: 'payment_prepared',
        client_secret: pi.client_secret,
        payment_intent_id: pi.id,
        target_user_id: targetUserId,
      });
    }

    if (vow.challenge_status !== 'pending') {
      return jsonResponse({ error: 'already_responded', challenge_status: vow.challenge_status }, 409);
    }

    if (vow.status !== 'draft') {
      return jsonResponse({ error: 'vow_not_draft', status: vow.status }, 400);
    }

    // === DECLINE ===
    if (action === 'decline') {
      // Atomic update — only succeeds if still pending
      const { data: declined } = await supabase
        .from('vows')
        .update({ challenge_status: 'declined', status: 'voided' })
        .eq('id', vow.id)
        .eq('challenge_status', 'pending')
        .select('id')
        .maybeSingle();

      if (!declined) {
        return jsonResponse({ error: 'already_responded' }, 409);
      }

      // No Stripe refund needed — challenger never paid, vow was in draft

      await createAuditEvent(supabase, vow.id, 'challenge_declined', 'target');

      // Push notification to challenger
      await supabase.from('push_queue').insert({
        user_id: vow.user_id,
        title: 'They backed down',
        body: `${body.display_name || 'Someone'} backed down from your dare.`,
        data: { vow_id: vow.id, event: 'challenge_declined' },
        send_after: new Date().toISOString(),
      });

      return jsonResponse({ success: true, action: 'declined' });
    }

    // === ACCEPT ===
    const {
      stake_amount,   // cents — recipient's choice (0 = no stake)
      destination,    // charity name
      email,          // required — creates/finds account
      payment_method_id, // Stripe PM (legacy card-only flow)
      payment_intent_id, // Stripe PI (new deferred-intent flow — Apple Pay + card)
      display_name,   // optional
    } = body;

    if (!email) {
      return jsonResponse({ error: 'email required' }, 400);
    }

    const stakeAmountCents = typeof stake_amount === 'number' ? stake_amount : 0;

    if (stakeAmountCents > 0 && !payment_method_id && !payment_intent_id) {
      return jsonResponse({ error: 'payment required for staked vows' }, 400);
    }

    if (stakeAmountCents > 0 && (stakeAmountCents < 1000 || stakeAmountCents > 10000)) {
      return jsonResponse({ error: 'stake_amount must be between $10 and $100' }, 400);
    }

    // 1. Find or create user account by email
    let targetUserId: string;

    // If using the new deferred-intent flow, the user was already created in prepare_payment
    if (payment_intent_id) {
      // Retrieve PI to get the user ID from metadata
      const pi = await stripeGet(`payment_intents/${payment_intent_id}`);
      targetUserId = pi.metadata?.user_id;
      if (!targetUserId) {
        return jsonResponse({ error: 'invalid_payment_intent' }, 400);
      }
      // Update display_name if provided
      if (display_name) {
        await supabase.from('users').update({ display_name }).eq('id', targetUserId);
      }
    } else {
      // Legacy flow — find or create user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: display_name || '' },
      });

      if (newUser?.user) {
        targetUserId = newUser.user.id;
        console.log(`[accept-challenge] Created new user: ${targetUserId}`);
        await supabase.from('users').upsert({
          id: targetUserId,
          display_name: display_name || email.split('@')[0],
        });
      } else if (createError?.message?.toLowerCase().includes('already')) {
        let foundId: string | null = null;
        let page = 1;
        const perPage = 100;
        while (!foundId) {
          const { data: listed } = await supabase.auth.admin.listUsers({ page, perPage });
          const users = listed?.users;
          if (!users || users.length === 0) break;
          const match = users.find(
            (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
          );
          if (match) { foundId = match.id; break; }
          if (users.length < perPage) break;
          page++;
        }

        if (!foundId) {
          console.error('[accept-challenge] User registered but cannot find:', email);
          return jsonResponse({ error: 'failed_to_find_account' }, 500);
        }
        targetUserId = foundId;
        console.log(`[accept-challenge] Found existing user: ${targetUserId}`);
      } else {
        console.error('[accept-challenge] Failed to create user:', createError);
        return jsonResponse({ error: 'failed_to_create_account' }, 500);
      }

      if (display_name) {
        await supabase.from('users').update({ display_name }).eq('id', targetUserId);
      }
    }

    // 2. Handle Stripe payment if staked
    let stripePaymentIntentId: string | null = null;

    if (stakeAmountCents > 0 && payment_intent_id) {
      // New deferred-intent flow: PI was created in prepare_payment, confirmed by client (Apple Pay / card)
      // Just verify status and capture
      const pi = await stripeGet(`payment_intents/${payment_intent_id}`);
      console.log(`[accept-challenge] Deferred PI status: ${pi.status}`);

      if (pi.status === 'requires_capture') {
        const captured = await stripePost(`payment_intents/${pi.id}/capture`, {});
        console.log(`[accept-challenge] PI captured: ${captured.id} status: ${captured.status}`);
        stripePaymentIntentId = pi.id;
      } else if (pi.status === 'succeeded') {
        stripePaymentIntentId = pi.id;
      } else {
        return jsonResponse({ error: 'payment_failed', stripe_status: pi.status }, 402);
      }
    } else if (stakeAmountCents > 0 && payment_method_id) {
      // Legacy flow: create PI with PM and confirm in one shot
      const { data: userProfile } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', targetUserId)
        .single();

      let customerId = userProfile?.stripe_customer_id;

      if (!customerId) {
        console.log('[accept-challenge] Creating Stripe customer for recipient');
        const customer = await stripePost('customers', {
          email,
          'metadata[supabase_user_id]': targetUserId,
        });
        customerId = customer.id;
        await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', targetUserId);
      }

      console.log(`[accept-challenge] Creating PI: ${stakeAmountCents} cents`);
      const pi = await stripePost('payment_intents', {
        amount: String(stakeAmountCents),
        currency: 'usd',
        customer: customerId,
        payment_method: payment_method_id,
        capture_method: 'manual',
        confirm: 'true',
        'metadata[vow_id]': vow.id,
        'metadata[user_id]': targetUserId,
        'metadata[type]': 'challenge_acceptance',
      }, `challenge-accept-${vow.id}`);

      if (pi.status === 'requires_capture') {
        const captured = await stripePost(`payment_intents/${pi.id}/capture`, {});
        console.log(`[accept-challenge] PI captured: ${captured.id} status: ${captured.status}`);
        stripePaymentIntentId = pi.id;
      } else if (pi.status === 'succeeded') {
        stripePaymentIntentId = pi.id;
      } else {
        console.error(`[accept-challenge] PI in unexpected state: ${pi.status}`);
        return jsonResponse({ error: 'payment_failed', stripe_status: pi.status }, 402);
      }
    }

    // 3. Atomically update vow — only if still pending
    const { data: accepted } = await supabase
      .from('vows')
      .update({
        challenge_status: 'accepted',
        target_user_id: targetUserId,
        stake_amount: stakeAmountCents,
        destination: destination || '',
        stripe_payment_intent_id: stripePaymentIntentId,
        status: 'active',
        sealed_at: new Date().toISOString(),
      })
      .eq('id', vow.id)
      .eq('challenge_status', 'pending')
      .select('id')
      .maybeSingle();

    if (!accepted) {
      // Race condition: someone else accepted/declined while we were processing payment
      // Refund if we captured payment
      if (stripePaymentIntentId) {
        try {
          await stripePost('refunds', {
            payment_intent: stripePaymentIntentId,
          }, `refund-race-${vow.id}-${targetUserId}`);
        } catch (refundErr) {
          console.error('[accept-challenge] Race condition refund failed:', refundErr);
        }
      }
      return jsonResponse({ error: 'already_responded' }, 409);
    }

    // 4. Audit events
    await createAuditEvent(supabase, vow.id, 'challenge_accepted', 'target', targetUserId);
    await createAuditEvent(supabase, vow.id, 'vow_sealed', 'target', targetUserId, {
      stake_amount: stakeAmountCents,
      destination: destination || '',
      sealed_by: 'challenge_acceptance',
    });

    // 5. Push notification to challenger
    const recipientName = display_name || email.split('@')[0];
    await supabase.from('push_queue').insert({
      user_id: vow.user_id,
      title: 'Vow accepted',
      body: `${recipientName} accepted the vow. It's live.`,
      data: { vow_id: vow.id, event: 'challenge_accepted' },
      send_after: new Date().toISOString(),
    });

    return jsonResponse({
      success: true,
      action: 'accepted',
      vow_id: vow.id,
      target_user_id: targetUserId,
    });
  } catch (err) {
    console.error('accept-challenge error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 500);
  }
});
