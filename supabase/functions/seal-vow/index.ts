import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendSMS } from '../_shared/twilio.ts';
import { sealMessage, challengeMessage } from '../_shared/sms-templates.ts';
import { createAuditEvent } from '../_shared/audit.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;

async function stripeGet(endpoint: string) {
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Stripe error: ${res.status}`);
  return data;
}

async function stripePost(endpoint: string, params?: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params ? new URLSearchParams(params).toString() : '',
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

    const { vow_id, skip_payment } = await req.json();
    if (!vow_id) {
      return new Response(JSON.stringify({ error: 'vow_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: vow, error: vowError } = await supabase
      .from('vows')
      .select('*')
      .eq('id', vow_id)
      .eq('user_id', user.id)
      .single();

    if (vowError || !vow) {
      return new Response(JSON.stringify({ error: 'Vow not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['draft', 'sealed'].includes(vow.status)) {
      return new Response(JSON.stringify({ error: 'Vow is not in a sealable state', status: vow.status }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // skip_payment is only allowed for $0 (accountability-only) vows.
    // Staked vows MUST go through Stripe — never skip payment on real money.
    if (skip_payment) {
      if (vow.stake_amount > 0) {
        console.error('[seal-vow] REJECTED: skip_payment on staked vow', { vow_id, stake_amount: vow.stake_amount });
        return new Response(JSON.stringify({ error: 'Cannot skip payment on a staked vow' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('[seal-vow] skip_payment flag — $0 vow, clearing Stripe PI');
      const { error: skipErr } = await supabase.from('vows').update({
        stripe_payment_intent_id: null,
      }).eq('id', vow_id);
      if (skipErr) {
        console.error('[seal-vow] skip_payment update failed:', skipErr);
        return new Response(JSON.stringify({ error: 'Could not skip payment' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      vow.stripe_payment_intent_id = null;
    }

    if (vow.stake_amount > 0 && !skip_payment) {
      if (vow.stripe_setup_intent_id) {
        // === NEW: SetupIntent flow — verify setup succeeded, save payment method ===
        const setupIntent = await stripeGet(`setup_intents/${vow.stripe_setup_intent_id}`);
        if (setupIntent.status !== 'succeeded') {
          return new Response(JSON.stringify({
            error: 'Card setup not completed',
            setup_status: setupIntent.status,
          }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        // Save payment_method to vow for later off-session charge
        const { error: pmErr } = await supabase.from('vows').update({
          stripe_payment_method_id: setupIntent.payment_method,
        }).eq('id', vow_id);
        if (pmErr) {
          console.error('[seal-vow] Failed to save payment_method:', pmErr);
        }
        console.log('[seal-vow] SetupIntent verified, payment_method saved:', setupIntent.payment_method);
        // No capture needed — money is only charged if vow is broken
        // === END SetupIntent flow ===
      } else if (vow.stripe_payment_intent_id) {
        // === EXISTING STRIPE LOGIC — DO NOT MODIFY ===
        // Verify payment status and capture if needed
        const paymentIntent = await stripeGet(`payment_intents/${vow.stripe_payment_intent_id}`);

        if (paymentIntent.status === 'requires_capture') {
          await stripePost(`payment_intents/${vow.stripe_payment_intent_id}/capture`);
        } else if (paymentIntent.status !== 'succeeded') {
          return new Response(JSON.stringify({
            error: 'Payment not confirmed',
            payment_status: paymentIntent.status,
          }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        // === END EXISTING LOGIC ===
      } else {
        return new Response(JSON.stringify({ error: 'Payment not yet captured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // $0 vow or skip_payment — skip Stripe entirely
      console.log(skip_payment ? 'skip_payment — skipping Stripe, stake preserved for display' : '$0 vow — skipping Stripe');
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('vows')
      .update({
        status: 'active',
        sealed_at: now,
      })
      .eq('id', vow_id)
      .in('status', ['draft', 'sealed'])
      .select('id')
      .maybeSingle();

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to update vow' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!updated) {
      return new Response(JSON.stringify({ success: true, already_sealed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Audit: vow sealed
    await createAuditEvent(supabase, vow.id, 'vow_sealed', 'maker', user.id);

    const { data: profile } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single();

    const ownerName = profile?.display_name || 'Someone';
    const amountDollars = Math.round(vow.stake_amount / 100);
    const endDateStr = vow.ends_at
      ? new Date(vow.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'soon';

    if (vow.vow_type === 'challenge' && vow.target_phone) {
      // Challenge vow: send challenge SMS to target
      const acceptUrl = `https://unbreakablevow.app/c/${vow.challenge_invite_token}`;
      const messageBody = challengeMessage(ownerName, vow.refined_text, vow.stake_amount, endDateStr, acceptUrl);
      let smsSent = false;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
          const twilioSid = await sendSMS(vow.target_phone, messageBody);
          await supabase.from('sms_log').insert({
            vow_id,
            message_type: 'challenge_invite',
            twilio_sid: twilioSid,
          });
          smsSent = true;
          break;
        } catch (smsErr) {
          console.error(`[seal-vow] Challenge SMS attempt ${attempt + 1} failed:`, smsErr);
        }
      }

      if (!smsSent) {
        await supabase.from('vows').update({ sms_failed: true }).eq('id', vow_id);
        await supabase.from('push_queue').insert({
          user_id: user.id,
          title: 'Challenge text failed',
          body: `We couldn't text the challenge target. Share the link manually.`,
          data: { route: '/live', vow_id, event: 'sms_failed' },
          send_after: now,
        });
      }

      await createAuditEvent(supabase, vow.id, 'challenge_sent', 'maker', user.id);
    } else if (vow.witness_phone && !vow.witness_accepted_at) {
      // Standard vow: send witness SMS (skip if witness already accepted during draft)
      const witnessUrl = `https://unbreakablevow.app/w/${vow.witness_invite_token}`;
      const messageBody = sealMessage(ownerName, vow.refined_text, amountDollars, endDateStr, witnessUrl);
      let smsSent = false;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
          const twilioSid = await sendSMS(vow.witness_phone, messageBody);
          await supabase.from('sms_log').insert({
            vow_id,
            message_type: 'seal',
            twilio_sid: twilioSid,
          });
          smsSent = true;
          break;
        } catch (smsErr) {
          console.error(`[seal-vow] SMS attempt ${attempt + 1} failed:`, smsErr);
        }
      }

      if (!smsSent) {
        await supabase.from('vows').update({ sms_failed: true }).eq('id', vow_id);
        await supabase.from('push_queue').insert({
          user_id: user.id,
          title: 'Witness text failed',
          body: `We couldn't text ${vow.witness_name}. Share the link manually.`,
          data: { route: '/live', vow_id, event: 'sms_failed' },
          send_after: now,
        });
      }

      await createAuditEvent(supabase, vow.id, 'witness_invited', 'system', null);
    }

    await supabase.from('push_queue').insert({
      user_id: user.id,
      title: 'Vow sealed',
      body: "It's done. No turning back.",
      data: { route: '/live', vow_id, event: 'vow_sealed' },
      send_after: now,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('seal-vow error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
