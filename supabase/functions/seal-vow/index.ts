import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { sendSMS } from '../_shared/twilio.ts';
import { sealMessage } from '../_shared/sms-templates.ts';

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

    const { vow_id } = await req.json();
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

    if (!vow.stripe_payment_intent_id) {
      return new Response(JSON.stringify({ error: 'Payment not yet captured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const witnessUrl = `https://unbreakablevow.app/w/${vow.witness_invite_token}`;

    if (vow.witness_phone) {
      const { data: profile } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', user.id)
        .single();

      const ownerName = profile?.display_name || 'Someone';
      const amountDollars = Math.round(vow.stake_amount / 100);
      const endDate = vow.ends_at
        ? new Date(vow.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'soon';

      try {
        const messageBody = sealMessage(ownerName, vow.refined_text, amountDollars, endDate, witnessUrl);
        const twilioSid = await sendSMS(vow.witness_phone, messageBody);
        await supabase.from('sms_log').insert({
          vow_id,
          message_type: 'seal',
          twilio_sid: twilioSid,
        });
      } catch (smsErr) {
        console.error('[seal-vow] SMS send failed:', smsErr);
      }
    }

    const amountDollarsPush = Math.round(vow.stake_amount / 100);
    await supabase.from('push_queue').insert({
      user_id: user.id,
      title: 'Vow sealed!',
      body: `Your vow is active. $${amountDollarsPush} is on the line.`,
      data: { route: '/live', vow_id },
      send_after: now,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('seal-vow error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
