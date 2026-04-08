import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendSMS } from '../_shared/twilio.ts';
import { outcomeMessage } from '../_shared/sms-templates.ts';

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

    // Accept 'sealed' as well — the sealVow() fallback sets this when the seal-vow edge function fails
    const acceptableStatuses = ['active', 'awaiting_verdict', 'sealed'];
    if (!acceptableStatuses.includes(vow.status)) {
      return new Response(JSON.stringify({ error: 'invalid_status', status: vow.status }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();

    // Atomic update with status guard to prevent race conditions
    const { data: updated, error: updateError } = await supabase
      .from('vows')
      .update({
        verdict,
        verdict_at: now,
        status: verdict,
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

    // Auto-set witness_accepted_at if witness never formally accepted
    // (submitting a verdict is implicit acceptance)
    if (!vow.witness_accepted_at) {
      await supabase
        .from('vows')
        .update({ witness_accepted_at: now })
        .eq('id', vow.id);
    }

    // If kept: issue Stripe refund
    if (verdict === 'kept' && vow.stripe_payment_intent_id) {
      try {
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
      } catch (refundErr) {
        console.error('Stripe refund failed:', refundErr);
        // Flag for manual review — verdict is recorded but refund needs retry
        await supabase
          .from('vows')
          .update({ refund_failed: true })
          .eq('id', vow.id);
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
