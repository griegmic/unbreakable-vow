import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { sendSMS } from '../_shared/twilio.ts';
import { witnessReminderMessage, warmupMessage, verdictRequestMessage, outcomeMessage } from '../_shared/sms-templates.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;

async function sendPushNotification(pushToken: string, title: string, body: string, data?: Record<string, unknown>) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: pushToken, title, body, sound: 'default', data }),
  });
  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check: require service role key as bearer token
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.replace('Bearer ', '') !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();
  const results = { witness_reminder: 0, warmup: 0, verdict_request: 0, auto_resolve: 0, push: 0, errors: [] as string[] };

  try {
    // === TASK 0: Send witness acceptance reminders ===
    // Find active vows sealed >24h ago where witness hasn't accepted
    const reminderDeadline = new Date(now);
    reminderDeadline.setHours(reminderDeadline.getHours() - 24);

    const { data: unacceptedVows } = await supabase
      .from('vows')
      .select('*')
      .eq('status', 'active')
      .not('witness_phone', 'is', null)
      .is('witness_accepted_at', null)
      .eq('witness_declined', false)
      .lte('sealed_at', reminderDeadline.toISOString());

    for (const vow of unacceptedVows || []) {
      // Idempotency check
      const { data: existing } = await supabase
        .from('sms_log')
        .select('id')
        .eq('vow_id', vow.id)
        .eq('message_type', 'witness_reminder')
        .limit(1)
        .maybeSingle();

      if (existing) continue;

      try {
        const { data: profile } = await supabase.from('users').select('display_name').eq('id', vow.user_id).single();
        const ownerName = profile?.display_name || 'Someone';
        const acceptUrl = `https://unbreakablevow.app/witness?token=${vow.witness_invite_token}`;
        const body = witnessReminderMessage(ownerName, vow.refined_text, acceptUrl);
        const sid = await sendSMS(vow.witness_phone!, body);
        await supabase.from('sms_log').insert({ vow_id: vow.id, message_type: 'witness_reminder', twilio_sid: sid });

        // Push notification to owner
        await supabase.from('push_queue').insert({
          user_id: vow.user_id,
          title: `${vow.witness_name} hasn't responded`,
          body: 'Your witness hasn\'t accepted yet. You can resend, switch witnesses, or go solo.',
          data: { vow_id: vow.id, event: 'witness_no_response' },
          send_after: now.toISOString(),
        });

        results.witness_reminder++;
      } catch (err) {
        results.errors.push(`witness_reminder ${vow.id}: ${err}`);
      }
    }

    // === TASK 1: Send warmup SMS (#2) ===
    // Find active vows ending within 12-36 hours
    const warmupStart = new Date(now);
    warmupStart.setHours(warmupStart.getHours() + 12);
    const warmupEnd = new Date(now);
    warmupEnd.setHours(warmupEnd.getHours() + 36);

    const { data: warmupVows } = await supabase
      .from('vows')
      .select('*')
      .eq('status', 'active')
      .not('witness_phone', 'is', null)
      .gte('ends_at', warmupStart.toISOString())
      .lte('ends_at', warmupEnd.toISOString());

    for (const vow of warmupVows || []) {
      // Idempotency check
      const { data: existing } = await supabase
        .from('sms_log')
        .select('id')
        .eq('vow_id', vow.id)
        .eq('message_type', 'warmup')
        .limit(1)
        .maybeSingle();

      if (existing) continue;

      try {
        const { data: profile } = await supabase.from('users').select('display_name').eq('id', vow.user_id).single();
        const ownerName = profile?.display_name || 'Someone';
        const body = warmupMessage(ownerName, vow.refined_text);
        const sid = await sendSMS(vow.witness_phone!, body);
        await supabase.from('sms_log').insert({ vow_id: vow.id, message_type: 'warmup', twilio_sid: sid });
        results.warmup++;
      } catch (err) {
        results.errors.push(`warmup ${vow.id}: ${err}`);
      }
    }

    // === TASK 2: Send verdict request SMS (#3) ===
    // Find active vows where ends_at has passed
    const { data: endedVows } = await supabase
      .from('vows')
      .select('*')
      .eq('status', 'active')
      .lte('ends_at', now.toISOString());

    for (const vow of endedVows || []) {
      // Idempotency check
      const { data: existing } = await supabase
        .from('sms_log')
        .select('id')
        .eq('vow_id', vow.id)
        .eq('message_type', 'verdict_request')
        .limit(1)
        .maybeSingle();

      if (existing) continue;

      try {
        // Update status to awaiting_verdict
        await supabase.from('vows').update({ status: 'awaiting_verdict' }).eq('id', vow.id);

        if (vow.witness_phone) {
          const { data: profile } = await supabase.from('users').select('display_name').eq('id', vow.user_id).single();
          const ownerName = profile?.display_name || 'Someone';
          const verdictUrl = `https://unbreakablevow.app/witness?token=${vow.witness_invite_token}`;
          const body = verdictRequestMessage(ownerName, vow.refined_text, verdictUrl);
          const sid = await sendSMS(vow.witness_phone, body);
          await supabase.from('sms_log').insert({ vow_id: vow.id, message_type: 'verdict_request', twilio_sid: sid });
        }
        results.verdict_request++;
      } catch (err) {
        results.errors.push(`verdict_request ${vow.id}: ${err}`);
      }
    }

    // === TASK 3: Auto-resolve overdue vows ===
    // Vows awaiting_verdict for more than 72 hours
    const autoResolveDeadline = new Date(now);
    autoResolveDeadline.setHours(autoResolveDeadline.getHours() - 72);

    const { data: overdueVows } = await supabase
      .from('vows')
      .select('*')
      .eq('status', 'awaiting_verdict')
      .is('verdict', null)
      .lte('ends_at', autoResolveDeadline.toISOString());

    for (const vow of overdueVows || []) {
      try {
        // Auto-resolve as kept (atomic with status guard to prevent double-resolve)
        const { count } = await supabase.from('vows').update({
          verdict: 'kept',
          status: 'kept',
          verdict_at: now.toISOString(),
        }).eq('id', vow.id).eq('status', 'awaiting_verdict');

        if (count === 0) continue; // Already resolved by witness or another cron run

        // Stripe refund
        if (vow.stripe_payment_intent_id) {
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
            results.errors.push(`refund ${vow.id}: ${refundErr}`);
            await supabase.from('vows').update({ refund_failed: true }).eq('id', vow.id);
          }
        }

        const amountDollars = Math.round(vow.stake_amount / 100);

        // SMS #4 to witness
        if (vow.witness_phone) {
          try {
            const { data: profile } = await supabase.from('users').select('display_name').eq('id', vow.user_id).single();
            const ownerName = profile?.display_name || 'Someone';
            const body = `No verdict received. ${ownerName}'s vow auto-resolved as kept. $${amountDollars} refunded.`;
            const sid = await sendSMS(vow.witness_phone, body);
            await supabase.from('sms_log').insert({ vow_id: vow.id, message_type: 'outcome', twilio_sid: sid });
          } catch (smsErr) {
            results.errors.push(`auto-resolve sms ${vow.id}: ${smsErr}`);
          }
        }

        // Push notification to owner
        await supabase.from('push_queue').insert({
          user_id: vow.user_id,
          title: 'Vow auto-resolved: Kept!',
          body: `No verdict was received, so your vow was auto-resolved as kept. $${amountDollars} refunded.`,
          data: { vow_id: vow.id, verdict: 'kept' },
          send_after: now.toISOString(),
        });

        results.auto_resolve++;
      } catch (err) {
        results.errors.push(`auto_resolve ${vow.id}: ${err}`);
      }
    }

    // === TASK 4: Process push notification queue ===
    const { data: pendingPush } = await supabase
      .from('push_queue')
      .select('*')
      .eq('sent', false)
      .lte('send_after', now.toISOString())
      .limit(50);

    for (const item of pendingPush || []) {
      try {
        if (!item.user_id) continue;

        const { data: user } = await supabase
          .from('users')
          .select('push_token')
          .eq('id', item.user_id)
          .single();

        if (user?.push_token) {
          await sendPushNotification(
            user.push_token,
            item.title,
            item.body,
            (item.data as Record<string, unknown>) || undefined,
          );
        }

        await supabase.from('push_queue').update({ sent: true }).eq('id', item.id);
        results.push++;
      } catch (err) {
        results.errors.push(`push ${item.id}: ${err}`);
      }
    }

    console.log('[cron-runner] results:', JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('cron-runner fatal error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
