import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendSMSWithRetry } from '../_shared/notify.ts';
import { outcomeMessage, makerOutcomeMessage } from '../_shared/sms-templates.ts';
import { createAuditEvent } from '../_shared/audit.ts';
import { upsertSettlement, recordSettlementEvent } from '../_shared/settlements.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;

async function stripePost(endpoint: string, params: Record<string, string>, idempotencyKey?: string) {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: 'POST',
    headers,
    body: new URLSearchParams(params).toString(),
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
    const { token, verdict } = await req.json();

    if (!token || !verdict || !['kept', 'broken'].includes(verdict)) {
      return new Response(JSON.stringify({ error: 'token and verdict (kept|broken) required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Look up vow by witness_invite_token
    const { data: vow, error: vowError } = await supabase
      .from('vows')
      .select('*')
      .eq('witness_invite_token', token)
      .single();

    if (vowError || !vow) {
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Expiration guard: reject if vow deadline has passed + 72h auto-resolve window
    if (vow.ends_at) {
      const expiresAt = new Date(new Date(vow.ends_at).getTime() + 72 * 60 * 60 * 1000);
      if (new Date() > expiresAt) {
        return new Response(JSON.stringify({ error: 'token_expired' }), {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check status
    if (['kept', 'broken'].includes(vow.status)) {
      return new Response(JSON.stringify({ error: 'already_judged', verdict: vow.verdict }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Accept 'sealed' for backward compatibility with vows stuck from before the fallback removal
    const acceptableStatuses = ['active', 'awaiting_verdict', 'sealed'];
    if (!acceptableStatuses.includes(vow.status)) {
      return new Response(JSON.stringify({ error: 'invalid_status', status: vow.status }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    const payerUserId = (vow.vow_type === 'challenge' && vow.target_user_id) ? vow.target_user_id : vow.user_id;
    const settlementVow = { ...vow, user_id: payerUserId };

    // === NEW: SetupIntent flow ===
    const hasSetupIntent = !!vow.stripe_payment_method_id;
    if (hasSetupIntent && verdict === 'broken') {
      await upsertSettlement(supabase, settlementVow, { status: 'pending_charge' });
      // Charge the saved card off-session
      try {
        // Look up stripe_customer_id from users table
        const { data: userRow } = await supabase
          .from('users')
          .select('stripe_customer_id')
          .eq('id', payerUserId)
          .single();

        if (!userRow?.stripe_customer_id) {
          throw new Error('No Stripe customer found for user');
        }

        const pi = await stripePost('payment_intents', {
          amount: String(vow.stake_amount),
          currency: 'usd',
          customer: userRow.stripe_customer_id,
          payment_method: vow.stripe_payment_method_id,
          off_session: 'true',
          confirm: 'true',
          'metadata[vow_id]': vow.id,
          'metadata[user_id]': payerUserId,
          'metadata[verdict]': 'broken',
        }, `broken-charge-${vow.id}`);

        // Save the new PI to the vow
        await supabase.from('vows').update({
          stripe_payment_intent_id: pi.id,
          refund_failed: false,
        }).eq('id', vow.id);

        await upsertSettlement(supabase, settlementVow, {
          status: 'pending_manual_settlement',
          stripe_payment_intent_id: pi.id,
          stripe_charge_id: pi.latest_charge || null,
          failure_reason: null,
        });

        console.log(`[submit-verdict] SetupIntent flow: charge created ${pi.id}`);
        await createAuditEvent(supabase, vow.id, 'charge_created', 'system', null, { payment_intent_id: pi.id });
        await recordSettlementEvent(supabase, vow, 'settlement_pending_manual', { payment_intent_id: pi.id });
      } catch (chargeErr) {
        console.error('[submit-verdict] SetupIntent charge failed:', chargeErr);
        const errorMessage = chargeErr instanceof Error ? chargeErr.message : String(chargeErr);
        await supabase.from('vows').update({ refund_failed: true }).eq('id', vow.id);
        await upsertSettlement(supabase, settlementVow, {
          status: 'payment_due',
          failure_reason: errorMessage,
        });
        await createAuditEvent(supabase, vow.id, 'charge_failed', 'system', null, { error: errorMessage });
        // Continue to finalize verdict even if charge fails — flag is set for retry
      }
    } else if (hasSetupIntent && verdict === 'kept') {
      // SetupIntent flow: nothing to refund — no money was ever captured
      console.log('[submit-verdict] SetupIntent flow: kept verdict, nothing to refund');
    }

    // For "kept" verdicts with a real Stripe payment, return the money BEFORE finalizing verdict.
    // Skip Stripe operations for dev/test PI IDs (not starting with 'pi_')
    const hasRealStripePI = vow.stripe_payment_intent_id && vow.stripe_payment_intent_id.startsWith('pi_');
    if (verdict === 'kept' && hasRealStripePI && !hasSetupIntent) {
      try {
        // First, check the payment intent's actual status on Stripe
        const piRes = await fetch(`https://api.stripe.com/v1/payment_intents/${vow.stripe_payment_intent_id}`, {
          headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
        });
        if (!piRes.ok) {
          throw new Error(`Failed to fetch PI status: HTTP ${piRes.status}`);
        }
        const piData = await piRes.json();
        const piStatus = piData.status;
        console.log(`[submit-verdict] Payment intent ${vow.stripe_payment_intent_id} status: ${piStatus}`);

        if (piStatus === 'requires_capture') {
          // Payment was authorized but never captured — cancel it (releases the hold)
          const cancelRes = await fetch(`https://api.stripe.com/v1/payment_intents/${vow.stripe_payment_intent_id}/cancel`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });
          if (!cancelRes.ok) {
            const cancelData = await cancelRes.json();
            throw new Error(cancelData.error?.message || 'Cancel failed');
          }
          console.log('[submit-verdict] Payment intent cancelled (was uncaptured)');
        } else if (piStatus === 'succeeded') {
          // Payment was captured — refund it
          const refundRes = await fetch('https://api.stripe.com/v1/refunds', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Idempotency-Key': `refund-${vow.id}`,
            },
            body: new URLSearchParams({ payment_intent: vow.stripe_payment_intent_id }).toString(),
          });
          if (!refundRes.ok) {
            const refundData = await refundRes.json();
            throw new Error(refundData.error?.message || 'Refund failed');
          }
          console.log('[submit-verdict] Payment refunded');
        } else if (piStatus === 'canceled') {
          // Already cancelled — nothing to do
          console.log('[submit-verdict] Payment already cancelled, skipping');
        } else if (piStatus === 'requires_payment_method') {
          // Payment was never authorized — nothing to refund
          console.log('[submit-verdict] PI never authorized (requires_payment_method), skipping');
        } else {
          // Unknown or transient state (processing, requires_action, etc.) — block verdict, retry later
          throw new Error(`Cannot process refund: PI in ${piStatus} state`);
        }
      } catch (refundErr) {
        console.error('Stripe refund/cancel failed:', refundErr);
        const errorMessage = refundErr instanceof Error ? refundErr.message : String(refundErr);
        // Flag for retry but DO NOT finalize verdict
        await supabase
          .from('vows')
          .update({ refund_failed: true })
          .eq('id', vow.id);
        await createAuditEvent(supabase, vow.id, 'refund_failed', 'system', null, { error: errorMessage });

        return new Response(JSON.stringify({
          error: 'refund_failed',
          message: 'Refund could not be processed. Please try again in a moment.',
        }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (verdict === 'broken' && vow.stake_amount > 0 && !hasSetupIntent) {
      if (hasRealStripePI) {
        try {
          const piRes = await fetch(`https://api.stripe.com/v1/payment_intents/${vow.stripe_payment_intent_id}`, {
            headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
          });
          if (!piRes.ok) throw new Error(`Failed to fetch PI status: HTTP ${piRes.status}`);
          const piData = await piRes.json();
          const status = piData.status === 'requires_capture' ? 'charged' : piData.status;
          if (piData.status === 'requires_capture') {
            const captured = await stripePost(
              `payment_intents/${vow.stripe_payment_intent_id}/capture`,
              {},
              `legacy-broken-capture-${vow.id}`,
            );
            await upsertSettlement(supabase, settlementVow, {
              status: 'pending_manual_settlement',
              stripe_payment_intent_id: captured.id,
              stripe_charge_id: captured.latest_charge || null,
              failure_reason: null,
            });
          } else if (piData.status === 'succeeded') {
            await upsertSettlement(supabase, settlementVow, {
              status: 'pending_manual_settlement',
              stripe_payment_intent_id: piData.id,
              stripe_charge_id: piData.latest_charge || null,
              failure_reason: null,
            });
          } else {
            await upsertSettlement(supabase, settlementVow, {
              status: 'payment_due',
              stripe_payment_intent_id: piData.id,
              failure_reason: `legacy payment intent in ${status} state`,
            });
          }
        } catch (settlementErr) {
          const errorMessage = settlementErr instanceof Error ? settlementErr.message : String(settlementErr);
          await upsertSettlement(supabase, settlementVow, {
            status: 'payment_due',
            failure_reason: errorMessage,
          });
          await createAuditEvent(supabase, vow.id, 'charge_failed', 'system', null, { error: errorMessage });
        }
      } else {
        await upsertSettlement(supabase, settlementVow, {
          status: 'payment_due',
          failure_reason: 'No saved card or Stripe payment intent on vow',
        });
      }
    }

    // Refund succeeded (or not needed) — now finalize verdict
    const { data: updated, error: updateError } = await supabase
      .from('vows')
      .update({
        verdict,
        verdict_at: now,
        status: verdict,
        // Implicit acceptance if witness never formally accepted
        ...(vow.witness_accepted_at ? {} : { witness_accepted_at: now }),
      })
      .eq('id', vow.id)
      .in('status', acceptableStatuses)
      .select('id')
      .maybeSingle();

    if (updateError) {
      console.error('Failed to update vow:', updateError);
      return new Response(JSON.stringify({ error: 'update_failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!updated) {
      return new Response(JSON.stringify({ error: 'already_judged' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Audit events
    await createAuditEvent(supabase, vow.id, 'verdict_submitted', 'witness', null, { verdict });
    if (verdict === 'kept' && hasRealStripePI && !hasSetupIntent) {
      await createAuditEvent(supabase, vow.id, 'refund_issued', 'system');
    }

    // For challenge vows, the vow keeper is target_user_id
    const isChallenge = vow.vow_type === 'challenge' && vow.target_user_id;
    const keeperId = isChallenge ? vow.target_user_id : vow.user_id;

    // Send SMS #4 (outcome) to witness — use vow keeper's name
    if (vow.witness_phone) {
      const { data: profile } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', keeperId)
        .single();

      const keeperName = profile?.display_name || 'Someone';
      const amountDollars = Math.round(vow.stake_amount / 100);

      try {
        const body = outcomeMessage(keeperName, verdict as 'kept' | 'broken', amountDollars, vow.destination);
        const twilioSid = await sendSMSWithRetry(supabase, vow.witness_phone, body, 'outcome', vow.id);
        if (twilioSid) {
          await supabase.from('sms_log').insert({
            vow_id: vow.id,
            message_type: 'outcome',
            twilio_sid: twilioSid,
          });
        }
      } catch (smsErr) {
        console.error('Outcome SMS failed:', smsErr);
      }
    }

    // SMS to maker: outcome notification
    try {
      const { data: makerUser } = await supabase
        .from('users')
        .select('phone')
        .eq('id', keeperId)
        .single();
      if (makerUser?.phone) {
        const amtDollars = Math.round(vow.stake_amount / 100);
        const makerBody = makerOutcomeMessage(verdict as 'kept' | 'broken', amtDollars, vow.destination);
        const sid = await sendSMSWithRetry(supabase, makerUser.phone, makerBody, 'maker_outcome', vow.id);
        if (sid) {
          await supabase.from('sms_log').insert({
            vow_id: vow.id,
            message_type: 'maker_outcome',
            twilio_sid: sid,
          });
        }
      }
    } catch (smsErr) {
      console.error('[submit-verdict] Maker outcome SMS failed:', smsErr);
    }

    // Queue push notification to challenger/maker
    const amountDollars = Math.round(vow.stake_amount / 100);
    const noRealPayment = vow.stake_amount === 0 || !hasRealStripePI;

    if (isChallenge) {
      // Challenger gets confirmation they submitted the verdict
      const { data: targetProfile } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', vow.target_user_id)
        .single();
      const targetName = targetProfile?.display_name || 'They';
      const challengerTitle = verdict === 'kept' ? 'Verdict: Kept' : 'Verdict: Broken';
      const challengerBody = verdict === 'kept'
        ? `You confirmed ${targetName} kept their vow.`
        : noRealPayment
          ? `You ruled ${targetName} broke their vow.`
          : `You ruled ${targetName} broke their vow. $${amountDollars} to ${vow.destination}.`;

      await supabase.from('push_queue').insert({
        user_id: vow.user_id,
        title: challengerTitle,
        body: challengerBody,
        data: { route: `/vow-detail?vowId=${vow.id}`, vow_id: vow.id, verdict, event: `vow_verdict_${verdict}` },
        send_after: now,
      });
    } else {
      // Regular vow: notify the maker
      let pushTitle: string;
      let pushBody: string;
      if (verdict === 'kept') {
        pushTitle = 'Vow kept';
        pushBody = `${vow.witness_name} confirmed it. You kept your word.`;
      } else {
        pushTitle = 'Vow broken';
        pushBody = noRealPayment
          ? `${vow.witness_name} has spoken. The record stands.`
          : `${vow.witness_name} has spoken. $${amountDollars} to ${vow.destination}.`;
      }

      await supabase.from('push_queue').insert({
        user_id: vow.user_id,
        title: pushTitle,
        body: pushBody,
        data: { route: `/vow-detail?vowId=${vow.id}`, vow_id: vow.id, verdict, event: `vow_verdict_${verdict}` },
        send_after: now,
      });
    }

    // For challenge vows, also notify the target (vow keeper) of the verdict
    if (vow.vow_type === 'challenge' && vow.target_user_id && vow.target_user_id !== vow.user_id) {
      const targetPushTitle = verdict === 'kept' ? 'You kept your vow!' : 'Vow broken';
      const targetPushBody = verdict === 'kept'
        ? `${vow.witness_name || 'Your challenger'} confirmed it. Well done.`
        : noRealPayment
          ? `${vow.witness_name || 'Your challenger'} says you didn't keep it.`
          : `${vow.witness_name || 'Your challenger'} says you didn't keep it. $${amountDollars} to ${vow.destination}.`;

      await supabase.from('push_queue').insert({
        user_id: vow.target_user_id,
        title: targetPushTitle,
        body: targetPushBody,
        data: { route: `/vow-detail?vowId=${vow.id}`, vow_id: vow.id, verdict, event: `challenge_verdict_${verdict}` },
        send_after: now,
      });
    }

    return new Response(JSON.stringify({ success: true, verdict }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('submit-verdict error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
