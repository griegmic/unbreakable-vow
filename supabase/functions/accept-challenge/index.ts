import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createAuditEvent } from '../_shared/audit.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('ANON_KEY') || '';

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

function normalizePhoneE164(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/[^\d+]/g, '');
  if (/^\d{10}$/.test(digits)) return `+1${digits}`;
  if (/^1\d{10}$/.test(digits)) return `+${digits}`;
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  return null;
}

function fallbackName(email?: string | null, phone?: string | null) {
  if (email) return email.split('@')[0];
  if (phone) return `Friend ${phone.slice(-4)}`;
  return 'Friend';
}

async function getAuthUser(supabase: ReturnType<typeof createClient>, req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token || token === SUPABASE_ANON_KEY) return null;
  const { data } = await supabase.auth.getUser(token);
  return data?.user || null;
}

async function findUserByAuthField(
  supabase: ReturnType<typeof createClient>,
  field: 'email' | 'phone',
  value: string,
) {
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data: listed } = await supabase.auth.admin.listUsers({ page, perPage });
    const users = listed?.users;
    if (!users || users.length === 0) break;
    const match = users.find((u: { email?: string; phone?: string }) =>
      field === 'email'
        ? u.email?.toLowerCase() === value.toLowerCase()
        : u.phone === value
    );
    if (match) return match.id;
    if (users.length < perPage) break;
    page++;
  }
  return null;
}

async function resolveTargetUser(
  supabase: ReturnType<typeof createClient>,
  req: Request,
  input: { email?: string; phone?: string; display_name?: string },
) {
  const authUser = await getAuthUser(supabase, req);
  const normalizedPhone = normalizePhoneE164(input.phone || authUser?.phone || null);
  const email = input.email || authUser?.email || undefined;
  const displayName = input.display_name || authUser?.user_metadata?.full_name || fallbackName(email, normalizedPhone);

  if (authUser) {
    await supabase.from('users').upsert({
      id: authUser.id,
      display_name: displayName,
      phone: normalizedPhone || authUser.phone || null,
      phone_e164: normalizedPhone,
    }, { onConflict: 'id' });
    return { targetUserId: authUser.id, email, phone: normalizedPhone, displayName };
  }

  if (normalizedPhone) {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      phone: normalizedPhone,
      phone_confirm: true,
      user_metadata: { full_name: displayName },
    });
    let targetUserId = newUser?.user?.id || null;
    if (!targetUserId && createError?.message?.toLowerCase().includes('already')) {
      targetUserId = await findUserByAuthField(supabase, 'phone', normalizedPhone);
    }
    if (!targetUserId) {
      console.error('[accept-challenge] Failed to create/find phone user:', createError);
      throw new Error('failed_to_create_account');
    }
    await supabase.from('users').upsert({
      id: targetUserId,
      display_name: displayName,
      phone: normalizedPhone,
      phone_e164: normalizedPhone,
    }, { onConflict: 'id' });
    return { targetUserId, email, phone: normalizedPhone, displayName };
  }

  if (!email) throw new Error('identity_required');

  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: displayName },
  });

  let targetUserId = newUser?.user?.id || null;
  if (!targetUserId && createError?.message?.toLowerCase().includes('already')) {
    targetUserId = await findUserByAuthField(supabase, 'email', email);
  }
  if (!targetUserId) {
    console.error('[accept-challenge] Failed to create/find email user:', createError);
    throw new Error('failed_to_create_account');
  }

  await supabase.from('users').upsert({
    id: targetUserId,
    display_name: displayName,
  }, { onConflict: 'id' });
  return { targetUserId, email, phone: normalizedPhone, displayName };
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

    // === PREPARE PAYMENT (step 1 of Resy-style saved-card flow) ===
    if (action === 'prepare_payment') {
      if (vow.challenge_status !== 'pending') {
        return jsonResponse({ error: 'already_responded', challenge_status: vow.challenge_status }, 409);
      }
      if (vow.status !== 'draft') {
        return jsonResponse({ error: 'vow_not_draft', status: vow.status }, 400);
      }

      const { stake_amount, email, phone, display_name } = body;

      const stakeAmountCents = typeof stake_amount === 'number' ? stake_amount : 0;
      if (stakeAmountCents < 1000 || stakeAmountCents > 10000) {
        return jsonResponse({ error: 'stake_amount must be between $10 and $100' }, 400);
      }

      let identity: Awaited<ReturnType<typeof resolveTargetUser>>;
      try {
        identity = await resolveTargetUser(supabase, req, {
          email: typeof email === 'string' ? email : undefined,
          phone: typeof phone === 'string' ? phone : undefined,
          display_name: typeof display_name === 'string' ? display_name : undefined,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'failed_to_create_account';
        return jsonResponse({ error: message }, message === 'identity_required' ? 400 : 500);
      }
      const { targetUserId } = identity;

      // Get or create Stripe customer
      const { data: userProfile } = await supabase
        .from('users').select('stripe_customer_id').eq('id', targetUserId).single();
      let customerId = userProfile?.stripe_customer_id;
      if (!customerId) {
        const customerParams: Record<string, string> = { 'metadata[supabase_user_id]': targetUserId };
        if (identity.email) customerParams.email = identity.email;
        if (identity.phone) customerParams.phone = identity.phone;
        const customer = await stripePost('customers', customerParams);
        customerId = customer.id;
        await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', targetUserId);
      }

      // Create SetupIntent (no charge now; card is charged only if the vow breaks)
      const si = await stripePost('setup_intents', {
        customer: customerId,
        'automatic_payment_methods[enabled]': 'true',
        usage: 'off_session',
        'metadata[vow_id]': vow.id,
        'metadata[user_id]': targetUserId,
        'metadata[type]': 'challenge_acceptance',
      }, `challenge-prepare-${vow.id}-${targetUserId}-${Date.now()}`);

      return jsonResponse({
        success: true,
        action: 'payment_prepared',
        client_secret: si.client_secret,
        setup_intent_id: si.id,
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
        data: { route: `/vow-detail?vowId=${vow.id}`, vow_id: vow.id, event: 'challenge_declined' },
        send_after: new Date().toISOString(),
      });

      return jsonResponse({ success: true, action: 'declined' });
    }

    // === ACCEPT ===
    const {
      stake_amount,   // cents — recipient's choice (0 = no stake)
      destination,    // charity name
      email,          // optional fallback identity; phone/JWT is preferred
      payment_method_id, // Stripe PM (legacy card-only flow)
      payment_intent_id, // Stripe PI (new deferred-intent flow — Apple Pay + card)
      setup_intent_id,   // Stripe SI (Resy-style saved-card flow — Apple Pay + card)
      phone,             // preferred identity for SMS-first accounts
      display_name,   // optional
    } = body;

    const stakeAmountCents = typeof stake_amount === 'number' ? stake_amount : 0;

    if (stakeAmountCents > 0 && !payment_method_id && !payment_intent_id && !setup_intent_id) {
      return jsonResponse({ error: 'payment required for staked vows' }, 400);
    }

    if (stakeAmountCents > 0 && (stakeAmountCents < 1000 || stakeAmountCents > 10000)) {
      return jsonResponse({ error: 'stake_amount must be between $10 and $100' }, 400);
    }

    // 1. Find or create user account by verified phone first, email second
    let targetUserId: string;
    let resolvedPhone: string | null = null;
    let resolvedEmail: string | undefined = typeof email === 'string' ? email : undefined;
    let resolvedDisplayName = typeof display_name === 'string' ? display_name : undefined;

    // If using the saved-card flow, the user was already created in prepare_payment
    if (setup_intent_id) {
      // Retrieve SI to get the user ID from metadata
      const si = await stripeGet(`setup_intents/${setup_intent_id}`);
      targetUserId = si.metadata?.user_id;
      if (!targetUserId) {
        return jsonResponse({ error: 'invalid_setup_intent' }, 400);
      }
      // Update display_name if provided
      if (display_name) {
        await supabase.from('users').update({ display_name }).eq('id', targetUserId);
      }
      const { data: userProfile } = await supabase
        .from('users')
        .select('phone, phone_e164, display_name')
        .eq('id', targetUserId)
        .single();
      resolvedPhone = userProfile?.phone_e164 || userProfile?.phone || normalizePhoneE164(typeof phone === 'string' ? phone : undefined);
      resolvedDisplayName = userProfile?.display_name || resolvedDisplayName;
    } else if (payment_intent_id) {
      // Legacy compatibility: retrieve old PI to get the target user ID.
      const pi = await stripeGet(`payment_intents/${payment_intent_id}`);
      targetUserId = pi.metadata?.user_id;
      if (!targetUserId) {
        return jsonResponse({ error: 'invalid_payment_intent' }, 400);
      }
    } else {
      try {
        const identity = await resolveTargetUser(supabase, req, {
          email: typeof email === 'string' ? email : undefined,
          phone: typeof phone === 'string' ? phone : undefined,
          display_name: typeof display_name === 'string' ? display_name : undefined,
        });
        targetUserId = identity.targetUserId;
        resolvedPhone = identity.phone;
        resolvedEmail = identity.email;
        resolvedDisplayName = identity.displayName;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'failed_to_create_account';
        return jsonResponse({ error: message }, message === 'identity_required' ? 400 : 500);
      }
    }

    // 2. Handle Stripe payment if staked
    let stripePaymentIntentId: string | null = null;
    let stripeSetupIntentId: string | null = null;
    let stripePaymentMethodId: string | null = null;

    if (stakeAmountCents > 0 && setup_intent_id) {
      const si = await stripeGet(`setup_intents/${setup_intent_id}`);
      console.log(`[accept-challenge] SetupIntent status: ${si.status}`);

      if (si.status === 'succeeded' && si.payment_method) {
        stripeSetupIntentId = si.id;
        stripePaymentMethodId = si.payment_method;
      } else {
        return jsonResponse({ error: 'card_setup_failed', stripe_status: si.status }, 402);
      }
    } else if (stakeAmountCents > 0 && payment_intent_id) {
      // Legacy compatibility only. Do not capture now for new flows.
      const pi = await stripeGet(`payment_intents/${payment_intent_id}`);
      stripePaymentIntentId = pi.id;
    } else if (stakeAmountCents > 0 && payment_method_id) {
      // Legacy direct-PM flow: attach/store PM. It will be charged only if broken.
      const { data: userProfile } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', targetUserId)
        .single();

      let customerId = userProfile?.stripe_customer_id;

      if (!customerId) {
        console.log('[accept-challenge] Creating Stripe customer for recipient');
        const customerParams: Record<string, string> = { 'metadata[supabase_user_id]': targetUserId };
        if (resolvedEmail) customerParams.email = resolvedEmail;
        if (resolvedPhone) customerParams.phone = resolvedPhone;
        const customer = await stripePost('customers', customerParams);
        customerId = customer.id;
        await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', targetUserId);
      }

      try {
        await stripePost(`payment_methods/${payment_method_id}/attach`, {
          customer: customerId,
        }, `challenge-attach-${vow.id}-${targetUserId}`);
      } catch (err) {
        console.warn('[accept-challenge] PM attach skipped/failed:', err);
      }
      stripePaymentMethodId = payment_method_id;
    }

    // 3. Atomically update vow — only if still pending
    const { data: accepted } = await supabase
      .from('vows')
      .update({
        challenge_status: 'accepted',
        target_user_id: targetUserId,
        target_phone: resolvedPhone,
        target_phone_e164: resolvedPhone,
        stake_amount: stakeAmountCents,
        destination: destination || '',
        stripe_payment_intent_id: stripePaymentIntentId,
        stripe_setup_intent_id: stripeSetupIntentId,
        stripe_payment_method_id: stripePaymentMethodId,
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
    const recipientName = resolvedDisplayName || fallbackName(resolvedEmail, resolvedPhone);
    await supabase.from('push_queue').insert({
      user_id: vow.user_id,
      title: 'Vow accepted',
      body: `${recipientName} accepted the vow. It's live.`,
      data: { route: `/vow-detail?vowId=${vow.id}`, vow_id: vow.id, event: 'challenge_accepted' },
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
