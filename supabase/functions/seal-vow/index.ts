import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { sendSMS } from '../_shared/twilio.ts';
import { sealMessage } from '../_shared/sms-templates.ts';

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify JWT
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

    // Verify ownership and get vow
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

    // Verify vow is in correct state and has payment
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

    // Update vow status to active (atomic with status check)
    const now = new Date().toISOString();
    const { error: updateError, count } = await supabase
      .from('vows')
      .update({
        status: 'active',
        sealed_at: now,
      })
      .eq('id', vow_id)
      .in('status', ['draft', 'sealed']);

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to update vow' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!count) {
      // Vow was already sealed (status no longer draft/sealed) — idempotent return
      return new Response(JSON.stringify({ success: true, already_sealed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const verdictUrl = `https://unbreakablevow.app/witness?token=${vow.witness_invite_token}`;

    // Send SMS #1 to witness (seal notification)
    if (vow.witness_phone) {
      // Get vow owner's display name
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
        const messageBody = sealMessage(ownerName, vow.refined_text, amountDollars, endDate);
        const twilioSid = await sendSMS(vow.witness_phone, messageBody);

        await supabase.from('sms_log').insert({
          vow_id,
          message_type: 'seal',
          twilio_sid: twilioSid,
        });
      } catch (smsErr) {
        // Log but don't fail the seal — SMS is best-effort
        // Do NOT insert sms_log on failure so retries aren't blocked by idempotency check
        console.error('[seal-vow] SMS send failed:', smsErr);
      }
    }

    // Queue push notification to vow owner
    const amountDollarsPush = Math.round(vow.stake_amount / 100);
    await supabase.from('push_queue').insert({
      user_id: user.id,
      title: 'Vow sealed!',
      body: `Your vow is active. $${amountDollarsPush} is on the line.`,
      data: { route: '/live', vow_id },
      send_after: now,
    });

    return new Response(JSON.stringify({
      success: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('seal-vow error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
