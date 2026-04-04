import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { sendSMS } from '../_shared/twilio.ts';
import { outcomeMessage } from '../_shared/sms-templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')!;

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

    if (!['active', 'awaiting_verdict'].includes(vow.status)) {
      return new Response(JSON.stringify({ error: 'invalid_status', status: vow.status }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();

    // Atomic update with status guard to prevent race conditions
    const { error: updateError, count } = await supabase
      .from('vows')
      .update({
        verdict,
        verdict_at: now,
        status: verdict,
      })
      .eq('id', vow.id)
      .in('status', ['active', 'awaiting_verdict']);

    if (count === 0) {
      return new Response(JSON.stringify({ error: 'already_judged' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (updateError) {
      console.error('Failed to update vow:', updateError);
      return new Response(JSON.stringify({ error: 'update_failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If kept: issue Stripe refund
    if (verdict === 'kept' && vow.stripe_payment_intent_id) {
      try {
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
          apiVersion: '2024-04-10',
          httpClient: Stripe.createFetchHttpClient(),
        });
        await stripe.refunds.create({
          payment_intent: vow.stripe_payment_intent_id,
        });
      } catch (refundErr) {
        console.error('Stripe refund failed:', refundErr);
        // Don't fail the verdict — log and continue
      }
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
    const pushTitle = verdict === 'kept' ? 'Vow kept!' : 'Vow broken';
    const pushBody = verdict === 'kept'
      ? `${vow.witness_name} confirmed you kept your vow. $${Math.round(vow.stake_amount / 100)} refunded.`
      : `${vow.witness_name} says you broke your vow. $${Math.round(vow.stake_amount / 100)} goes to ${vow.destination}.`;

    await supabase.from('push_queue').insert({
      user_id: vow.user_id,
      title: pushTitle,
      body: pushBody,
      data: { vow_id: vow.id, verdict },
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
