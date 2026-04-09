import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendSMS } from '../_shared/twilio.ts';
import { outcomeMessage } from '../_shared/sms-templates.ts';
import { createAuditEvent } from '../_shared/audit.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;

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

    // For "kept" verdicts with a real Stripe payment, return the money BEFORE finalizing verdict.
    // Skip Stripe operations for dev/test PI IDs (not starting with 'pi_')
    const hasRealStripePI = vow.stripe_payment_intent_id && vow.stripe_payment_intent_id.startsWith('pi_');
    if (verdict === 'kept' && hasRealStripePI) {
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
    if (verdict === 'kept' && hasRealStripePI) {
      await createAuditEvent(supabase, vow.id, 'refund_issued', 'system');
    }

    // Send SMS #4 (outcome) to witness
    if (vow.witness_phone) {
      const { data: profile } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', vow.user_id)
        .single();

      const ownerName = profile?.display_name || 'Someone';
      const amountDollars = Math.round(vow.stake_amount / 100);

      try {
        const body = outcomeMessage(ownerName, verdict, amountDollars, vow.destination);
        const twilioSid = await sendSMS(vow.witness_phone, body);
        await supabase.from('sms_log').insert({
          vow_id: vow.id,
          message_type: 'outcome',
          twilio_sid: twilioSid,
        });
      } catch (smsErr) {
        console.error('Outcome SMS failed:', smsErr);
      }
    }

    // Queue push notification to vow owner
    const amountDollars = Math.round(vow.stake_amount / 100);
    const noRealPayment = vow.stake_amount === 0 || !hasRealStripePI;
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
      data: { vow_id: vow.id, verdict, event: `vow_verdict_${verdict}` },
      send_after: now,
    });

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
