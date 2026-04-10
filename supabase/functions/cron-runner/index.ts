import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendSMS } from '../_shared/twilio.ts';
import { sealMessage, witnessReminderMessage, warmupMessage, verdictRequestMessage, outcomeMessage, challengeMessage } from '../_shared/sms-templates.ts';
import { createAuditEvent } from '../_shared/audit.ts';

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
  const results: Record<string, unknown> = { witness_reminder: 0, warmup: 0, verdict_request: 0, auto_resolve: 0, sms_retry: 0, refund_retry: 0, vow_lifecycle: 0, challenge_expire: 0, push: 0, errors: [] as string[] };

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
        const acceptUrl = `https://unbreakablevow.app/w/${vow.witness_invite_token}`;
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
          // For challenge vows, the vow keeper is target_user_id — use their name
          const nameUserId = (vow.vow_type === 'challenge' && vow.target_user_id) ? vow.target_user_id : vow.user_id;
          const { data: profile } = await supabase.from('users').select('display_name').eq('id', nameUserId).single();
          const ownerName = profile?.display_name || 'Someone';
          const verdictUrl = `https://unbreakablevow.app/w/${vow.witness_invite_token}/verdict`;
          const body = verdictRequestMessage(ownerName, vow.refined_text, verdictUrl);
          const sid = await sendSMS(vow.witness_phone, body);
          await supabase.from('sms_log').insert({ vow_id: vow.id, message_type: 'verdict_request', twilio_sid: sid });
        }

        // For challenge vows, also push-notify the target (vow keeper) that verdict time is here
        if (vow.vow_type === 'challenge' && vow.target_user_id) {
          await supabase.from('push_queue').insert({
            user_id: vow.target_user_id,
            title: 'Time\'s up',
            body: `Your vow deadline has passed. ${vow.witness_name || 'Your challenger'} will decide the verdict.`,
            data: { vow_id: vow.id, event: 'challenge_verdict_pending' },
            send_after: now.toISOString(),
          });
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
        const { data: resolved } = await supabase.from('vows').update({
          verdict: 'kept',
          status: 'kept',
          verdict_at: now.toISOString(),
        }).eq('id', vow.id).eq('status', 'awaiting_verdict').select('id').maybeSingle();

        if (!resolved) continue; // Already resolved by witness or another cron run

        // Stripe refund — check PI status first (skip non-real PIs like dev_bypass_)
        if (vow.stripe_payment_intent_id && vow.stripe_payment_intent_id.startsWith('pi_')) {
          try {
            const piRes = await fetch(`https://api.stripe.com/v1/payment_intents/${vow.stripe_payment_intent_id}`, {
              headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
            });
            if (!piRes.ok) {
              throw new Error(`Failed to fetch PI status: HTTP ${piRes.status}`);
            }
            const piData = await piRes.json();
            const piStatus = piData.status;
            console.log(`[cron-runner] auto-resolve PI ${vow.stripe_payment_intent_id} status: ${piStatus}`);

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
              // Already cancelled or never authorized — nothing to do
            } else {
              throw new Error(`Cannot process refund: PI in ${piStatus} state`);
            }
          } catch (refundErr) {
            results.errors.push(`refund ${vow.id}: ${refundErr}`);
            await supabase.from('vows').update({ refund_failed: true }).eq('id', vow.id);
          }
        }

        const amountDollars = Math.round(vow.stake_amount / 100);
        const hasRealPI = vow.stripe_payment_intent_id && vow.stripe_payment_intent_id.startsWith('pi_');
        const noRealPayment = vow.stake_amount === 0 || !hasRealPI;

        // SMS #4 to witness
        if (vow.witness_phone) {
          try {
            const { data: profile } = await supabase.from('users').select('display_name').eq('id', vow.user_id).single();
            const ownerName = profile?.display_name || 'Someone';
            const body = noRealPayment
              ? `No verdict received. ${ownerName}'s vow auto-resolved as kept.`
              : `No verdict received. ${ownerName}'s vow auto-resolved as kept. $${amountDollars} refunded.`;
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
          body: noRealPayment
            ? 'No verdict was received, so your vow was auto-resolved as kept.'
            : `No verdict was received, so your vow was auto-resolved as kept. $${amountDollars} refunded.`,
          data: { vow_id: vow.id, verdict: 'kept' },
          send_after: now.toISOString(),
        });

        results.auto_resolve++;
      } catch (err) {
        results.errors.push(`auto_resolve ${vow.id}: ${err}`);
      }
    }

    // === TASK 5: Retry failed SMS ===
    try {
      const { data: smsFailed } = await supabase
        .from('vows')
        .select('*')
        .eq('sms_failed', true)
        .gte('sealed_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

      for (const vow of smsFailed || []) {
        const { count } = await supabase
          .from('sms_log')
          .select('*', { count: 'exact', head: true })
          .eq('vow_id', vow.id)
          .eq('message_type', 'seal');

        if ((count || 0) >= 3) {
          // Give up — push notification to maker
          await supabase.from('push_queue').insert({
            user_id: vow.user_id,
            title: 'Witness invite failed',
            body: `We couldn't text your witness. Share the link manually.`,
            data: { route: '/live', vowId: vow.id },
            send_after: new Date().toISOString(),
          });
          await supabase.from('vows').update({ sms_failed: false }).eq('id', vow.id);
          await createAuditEvent(supabase, vow.id, 'sms_failed', 'system', null, { reason: 'max_retries_exceeded' });
          continue;
        }

        // Retry SMS
        try {
          const { data: profile } = await supabase.from('users').select('display_name').eq('id', vow.user_id).single();
          const ownerName = profile?.display_name || 'Someone';
          const amountDollars = Math.round(vow.stake_amount / 100);
          const endDate = vow.ends_at
            ? new Date(vow.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'soon';

          let body: string;
          if (vow.vow_type === 'challenge' && vow.challenge_invite_token) {
            const challengeUrl = `https://unbreakablevow.app/c/${vow.challenge_invite_token}`;
            body = challengeMessage(ownerName, vow.refined_text, vow.stake_amount, endDate, challengeUrl);
          } else {
            const witnessUrl = `https://unbreakablevow.app/w/${vow.witness_invite_token}`;
            body = sealMessage(ownerName, vow.refined_text, amountDollars, endDate, witnessUrl);
          }
          const sid = await sendSMS(vow.witness_phone!, body);
          await supabase.from('sms_log').insert({ vow_id: vow.id, message_type: 'seal', twilio_sid: sid });
          await supabase.from('vows').update({ sms_failed: false }).eq('id', vow.id);
          await createAuditEvent(supabase, vow.id, 'sms_retried', 'system');
        } catch (smsErr) {
          // Leave flag, will retry next cron run
          console.error(`[cron-runner] SMS retry failed for ${vow.id}:`, smsErr);
        }
        results.sms_retry++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.errors.push(`sms_retry: ${msg}`);
    }

    // === TASK 6: Retry failed refunds ===
    try {
      const { data: refundFailed } = await supabase
        .from('vows')
        .select('*')
        .eq('refund_failed', true);

      for (const vow of refundFailed || []) {
        if (!vow.stripe_payment_intent_id || !vow.stripe_payment_intent_id.startsWith('pi_')) {
          // No real Stripe PI — clear the flag (dev/test bypass)
          await supabase.from('vows').update({ refund_failed: false }).eq('id', vow.id);
          continue;
        }

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
          console.log(`[cron-runner] refund_retry PI ${vow.stripe_payment_intent_id} status: ${piStatus}`);

          let success = false;
          if (piStatus === 'requires_capture') {
            const cancelRes = await fetch(`https://api.stripe.com/v1/payment_intents/${vow.stripe_payment_intent_id}/cancel`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            });
            success = cancelRes.ok;
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
            success = refundRes.ok;
          } else if (piStatus === 'canceled') {
            // Already cancelled — clear the flag
            success = true;
          }

          if (success) {
            await supabase.from('vows')
              .update({ refund_failed: false })
              .eq('id', vow.id);
            await createAuditEvent(supabase, vow.id, 'refund_issued', 'system');
          }
          results.refund_retry++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          results.errors.push(`refund_retry ${vow.id}: ${msg}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.errors.push(`refund_retry: ${msg}`);
    }

    // === TASK 7: Schedule vow lifecycle push notifications ===
    // Queries active/awaiting_verdict vows and schedules time-based push notifications
    // with dedup via push_queue data->>'event' + data->>'vow_id'
    try {
      const { data: lifecycleVows } = await supabase
        .from('vows')
        .select('*')
        .in('status', ['active', 'awaiting_verdict'])
        .not('starts_at', 'is', null)
        .not('ends_at', 'is', null);

      for (const vow of lifecycleVows || []) {
        const startsAt = new Date(vow.starts_at);
        const endsAt = new Date(vow.ends_at);

        // Helper: check if a push with this event was already queued for this vow
        async function alreadyQueued(eventType: string, userId?: string): Promise<boolean> {
          const { count } = await supabase
            .from('push_queue')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId || vow.user_id)
            .contains('data', { vow_id: vow.id, event: eventType });
          return (count || 0) > 0;
        }

        // Helper: queue a push notification
        async function queuePush(userId: string, title: string, body: string, eventType: string, sendAfter: Date) {
          await supabase.from('push_queue').insert({
            user_id: userId,
            title,
            body,
            data: { vow_id: vow.id, event: eventType },
            send_after: sendAfter.toISOString(),
          });
          results.vow_lifecycle++;
        }

        try {
          // --- #2: 24 hours after start: "Day 1 down." ---
          const day1 = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000);
          if (now >= day1) {
            if (!(await alreadyQueued('vow_day1'))) {
              const body = vow.witness_name && vow.witness_user_id
                ? `Day 1 down. ${vow.witness_name} is watching.`
                : 'Day 1 down. You made a promise.';
              await queuePush(vow.user_id, 'Day 1', body, 'vow_day1', day1);
            }
          }

          // --- #3: Midpoint ---
          const midpoint = new Date((startsAt.getTime() + endsAt.getTime()) / 2);
          // Only send midpoint if vow is at least 3 days long (avoid spamming short vows)
          const vowDurationMs = endsAt.getTime() - startsAt.getTime();
          if (vowDurationMs >= 3 * 24 * 60 * 60 * 1000 && now >= midpoint) {
            if (!(await alreadyQueued('vow_midpoint'))) {
              await queuePush(vow.user_id, 'Halfway', 'Halfway. Still standing?', 'vow_midpoint', midpoint);
            }
          }

          // --- #4: 48 hours before deadline ---
          const fortyEightBefore = new Date(endsAt.getTime() - 48 * 60 * 60 * 1000);
          // Only send if 48h-before is after the midpoint (avoid sending before midpoint on short vows)
          if (fortyEightBefore > midpoint && now >= fortyEightBefore) {
            if (!(await alreadyQueued('vow_48h_warning'))) {
              const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
              const body = `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left. You know what's on the line.`;
              await queuePush(vow.user_id, 'Deadline approaching', body, 'vow_48h_warning', fortyEightBefore);
            }
          }

          // --- #6: Verdict day — notify witness when ends_at is reached ---
          if (now >= endsAt && vow.witness_user_id) {
            if (!(await alreadyQueued('vow_verdict_day_witness', vow.witness_user_id))) {
              // Get maker's display name
              const { data: makerProfile } = await supabase
                .from('users')
                .select('display_name')
                .eq('id', vow.user_id)
                .single();
              const makerName = makerProfile?.display_name || 'Someone';
              await queuePush(
                vow.witness_user_id,
                'Verdict time',
                `Time's up on ${makerName}'s vow. What's the verdict?`,
                'vow_verdict_day_witness',
                endsAt,
              );
            }
          }
        } catch (err) {
          results.errors.push(`vow_lifecycle ${vow.id}: ${err}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.errors.push(`vow_lifecycle: ${msg}`);
    }

    // === TASK 8: Expire unanswered challenge dares after 48h ===
    try {
      const challengeCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const { data: expiredDares } = await supabase
        .from('vows')
        .select('id, user_id, refined_text')
        .eq('vow_type', 'challenge')
        .eq('challenge_status', 'pending')
        .eq('status', 'draft')
        .lt('created_at', challengeCutoff);

      for (const vow of expiredDares || []) {
        try {
          // Atomic update — only expire if still pending
          const { data: expired } = await supabase
            .from('vows')
            .update({ challenge_status: 'expired', status: 'voided' })
            .eq('id', vow.id)
            .eq('challenge_status', 'pending')
            .select('id')
            .maybeSingle();

          if (!expired) continue; // Already responded

          await createAuditEvent(supabase, vow.id, 'challenge_expired', 'system');

          // Push notification to challenger
          await supabase.from('push_queue').insert({
            user_id: vow.user_id,
            title: 'Dare expired',
            body: "They didn't respond to your dare.",
            data: { vow_id: vow.id, event: 'challenge_expired', route: '/dashboard' },
            send_after: now.toISOString(),
          });

          results.challenge_expire = (results.challenge_expire || 0) + 1;
        } catch (err) {
          results.errors.push(`challenge_expire ${vow.id}: ${err}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.errors.push(`challenge_expire: ${msg}`);
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
