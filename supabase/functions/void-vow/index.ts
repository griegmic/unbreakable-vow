import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendSMS } from '../_shared/twilio.ts';
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { vow_id } = await req.json();
    if (!vow_id) {
      return new Response(JSON.stringify({ error: 'vow_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch vow owned by this user
    const { data: vow, error: vowError } = await supabase
      .from('vows')
      .select('*')
      .eq('id', vow_id)
      .eq('user_id', user.id)
      .single();

    if (vowError || !vow) {
      return new Response(JSON.stringify({ error: 'vow_not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['draft', 'sealed', 'active', 'awaiting_verdict'].includes(vow.status)) {
      return new Response(JSON.stringify({ error: 'cannot_void', status: vow.status }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Refund if staked (only for real Stripe PIs, not dev_bypass_ IDs)
    let refunded = false;
    const hasRealStripePI = vow.stripe_payment_intent_id && vow.stripe_payment_intent_id.startsWith('pi_');
    if (hasRealStripePI && vow.stake_amount > 0) {
      try {
        // Check the payment intent's actual status on Stripe
        const piRes = await fetch(`https://api.stripe.com/v1/payment_intents/${vow.stripe_payment_intent_id}`, {
          headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
        });
        if (!piRes.ok) {
          throw new Error(`Failed to fetch PI status: HTTP ${piRes.status}`);
        }
        const piData = await piRes.json();
        const piStatus = piData.status;
        console.log(`[void-vow] Payment intent ${vow.stripe_payment_intent_id} status: ${piStatus}`);

        if (piStatus === 'requires_capture') {
          // Payment authorized but never captured — cancel it (releases hold)
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
          console.log('[void-vow] Payment intent cancelled (was uncaptured)');
          refunded = true;
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
          console.log('[void-vow] Payment refunded');
          refunded = true;
        } else if (piStatus === 'canceled') {
          console.log('[void-vow] Payment already cancelled, skipping');
          refunded = true;
        } else if (piStatus === 'requires_payment_method') {
          console.log('[void-vow] PI never authorized, skipping');
          refunded = true;
        } else {
          throw new Error(`Cannot process refund: PI in ${piStatus} state`);
        }
      } catch (refundErr) {
        console.error('Stripe refund/cancel failed on void:', refundErr);
        const errorMessage = refundErr instanceof Error ? refundErr.message : String(refundErr);
        await supabase.from('vows').update({ refund_failed: true }).eq('id', vow.id);
        return new Response(JSON.stringify({
          error: 'refund_failed',
          message: 'Refund could not be processed. Please try again.',
          details: errorMessage,
        }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Void the vow (atomic guard: only update if status is still active/awaiting_verdict)
    const { data: voided, error: voidError } = await supabase
      .from('vows')
      .update({ status: 'voided' })
      .eq('id', vow.id)
      .in('status', ['draft', 'sealed', 'active', 'awaiting_verdict'])
      .select('id')
      .maybeSingle();

    if (voidError || !voided) {
      return new Response(JSON.stringify({ error: 'status_changed', message: 'Vow status has already changed.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await createAuditEvent(supabase, vow.id, 'vow_voided', 'maker', user.id);

    // SMS to witness (non-blocking)
    if (vow.witness_phone) {
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', user.id)
          .single();
        const ownerName = profile?.display_name || 'Someone';
        const vowPreview = vow.refined_text.length > 60
          ? vow.refined_text.substring(0, 57) + '...'
          : vow.refined_text;
        await sendSMS(vow.witness_phone, `${ownerName} withdrew their vow: "${vowPreview}"`);
      } catch (smsErr) {
        console.error('Void SMS to witness failed:', smsErr);
      }
    }

    // Push to witness user if linked
    if (vow.witness_user_id) {
      await supabase.from('push_queue').insert({
        user_id: vow.witness_user_id,
        title: 'Vow withdrawn',
        body: 'A vow you were witnessing was withdrawn.',
        data: { vow_id: vow.id, event: 'vow_voided' },
        send_after: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ success: true, refunded }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('void-vow error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
