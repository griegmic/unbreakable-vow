import { createClient } from 'jsr:@supabase/supabase-js@2';
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
    const { token, action } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: 'token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch vow by challenge_invite_token
    const { data: vow, error: vowError } = await supabase
      .from('vows')
      .select('*')
      .eq('challenge_invite_token', token)
      .single();

    if (vowError || !vow) {
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (vow.challenge_status !== 'pending') {
      return new Response(JSON.stringify({ error: 'already_responded', challenge_status: vow.challenge_status }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['active', 'sealed'].includes(vow.status)) {
      return new Response(JSON.stringify({ error: 'vow_not_active', status: vow.status }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle decline
    if (action === 'decline') {
      const { data: declined } = await supabase
        .from('vows')
        .update({ challenge_status: 'declined' })
        .eq('id', vow.id)
        .eq('challenge_status', 'pending')
        .select('id')
        .maybeSingle();

      if (!declined) {
        return new Response(JSON.stringify({ error: 'already_responded' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Refund if staked (only for real Stripe PIs, not dev_bypass_ IDs)
      let refundFailed = false;
      const hasRealStripePI = vow.stripe_payment_intent_id && vow.stripe_payment_intent_id.startsWith('pi_');
      if (vow.stake_amount > 0 && hasRealStripePI) {
        try {
          // Check PI status before deciding how to return money
          const piRes = await fetch(`https://api.stripe.com/v1/payment_intents/${vow.stripe_payment_intent_id}`, {
            headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
          });
          if (!piRes.ok) {
            throw new Error(`Failed to fetch PI status: HTTP ${piRes.status}`);
          }
          const piData = await piRes.json();
          const piStatus = piData.status;
          console.log(`[accept-challenge] PI ${vow.stripe_payment_intent_id} status: ${piStatus}`);

          if (piStatus === 'requires_capture') {
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
          } else if (piStatus === 'succeeded') {
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
          } else if (piStatus === 'canceled' || piStatus === 'requires_payment_method') {
            // Already handled — nothing to do
          } else {
            throw new Error(`Cannot process refund: PI in ${piStatus} state`);
          }
        } catch (refundErr) {
          console.error('Stripe refund/cancel failed on challenge decline:', refundErr);
          refundFailed = true;
        }
      }

      // Void the vow
      await supabase
        .from('vows')
        .update({ status: 'voided', ...(refundFailed ? { refund_failed: true } : {}) })
        .eq('id', vow.id);

      await createAuditEvent(supabase, vow.id, 'challenge_declined', 'target');

      // Push notification to maker
      await supabase.from('push_queue').insert({
        user_id: vow.user_id,
        title: 'Challenge declined',
        body: 'Your challenge was declined.',
        data: { vow_id: vow.id, event: 'challenge_declined' },
        send_after: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ success: true, action: 'declined' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle accept (default)
    // Check if a user exists with matching target_phone
    let targetUserId: string | null = null;
    if (vow.target_phone) {
      const { data: targetUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', vow.target_phone)
        .maybeSingle();
      if (targetUser) {
        targetUserId = targetUser.id;
      }
    }

    // Atomic update
    const { data: accepted } = await supabase
      .from('vows')
      .update({
        challenge_status: 'accepted',
        target_user_id: targetUserId,
      })
      .eq('id', vow.id)
      .eq('challenge_status', 'pending')
      .select('id')
      .maybeSingle();

    if (!accepted) {
      return new Response(JSON.stringify({ error: 'already_responded' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await createAuditEvent(supabase, vow.id, 'challenge_accepted', 'target', targetUserId);

    // Push notification to maker
    await supabase.from('push_queue').insert({
      user_id: vow.user_id,
      title: 'Challenge accepted!',
      body: 'Your challenge was accepted!',
      data: { vow_id: vow.id, event: 'challenge_accepted' },
      send_after: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, action: 'accepted' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('accept-challenge error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
