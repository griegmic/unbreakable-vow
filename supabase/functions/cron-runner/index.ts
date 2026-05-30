import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendSMS } from '../_shared/twilio.ts';
import { isSMSOptedOut, markSMSOptedOut, notifyMaker, queuePush, sendSMSWithRetry } from '../_shared/notify.ts';
import { normalizePhoneE164 } from '../_shared/phone.ts';
import {
  sealMessage, witnessReminderMessage, verdictRequestMessage,
  challengeMessage,
  challengeReminderMessage,
  witness24hMessage,
  maker24hMessage, makerVerdictTimeMessage,
  makerSelfVerdictTimeMessage, makerWitnessNoResponseMessage, castAutoVoidedMessage,
} from '../_shared/sms-templates.ts';
import { createAuditEvent } from '../_shared/audit.ts';
import { upsertSettlement } from '../_shared/settlements.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;

type UserNotifyProfile = {
  push_token?: string | null;
  last_push_receipt_ok_at?: string | null;
  sms_only_preference?: boolean | null;
  timezone?: string | null;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
};

function hasHealthyPush(user: UserNotifyProfile | null | undefined): boolean {
  if (!user?.push_token || user.sms_only_preference) return false;
  if (!user.last_push_receipt_ok_at) return true;
  return Date.now() - new Date(user.last_push_receipt_ok_at).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function getLocalHour(date: Date, timezone?: string | null): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hour12: false,
      timeZone: timezone || 'America/New_York',
    }).formatToParts(date);
    return Number(parts.find((part) => part.type === 'hour')?.value || '12');
  } catch {
    return date.getUTCHours();
  }
}

function quietAwareSendAt(sendAt: Date, user?: UserNotifyProfile | null, bypassQuietHours = false): Date {
  if (bypassQuietHours) return sendAt;
  const start = Number((user?.quiet_hours_start || '21:00').slice(0, 2));
  const end = Number((user?.quiet_hours_end || '08:00').slice(0, 2));
  const hour = getLocalHour(sendAt, user?.timezone);
  const inQuietHours = start > end ? hour >= start || hour < end : hour >= start && hour < end;
  if (!inQuietHours) return sendAt;
  const adjusted = new Date(sendAt);
  const hoursToEnd = hour < end ? end - hour : 24 - hour + end;
  adjusted.setUTCHours(adjusted.getUTCHours() + hoursToEnd, 0, 0, 0);
  return adjusted;
}

async function sendQueuedPush(pushToken: string, title: string, body: string, data?: Record<string, unknown>) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: pushToken, title, body, sound: 'default', data }),
  });
  const json = await response.json().catch(() => null);
  const ticket = Array.isArray(json?.data) ? json.data[0] : json?.data;
  return {
    ok: response.ok && ticket?.status !== 'error',
    receiptId: ticket?.id || null,
    errorCode: ticket?.details?.error || json?.errors?.[0]?.code || json?.message || null,
  };
}

function isDeadPushTokenError(errorCode?: string | null): boolean {
  return errorCode === 'DeviceNotRegistered' || errorCode === 'InvalidCredentials' || errorCode === 'MessageTooBig';
}

async function stripePost(endpoint: string, params: Record<string, string>, idempotencyKey?: string) {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const response = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: 'POST',
    headers,
    body: new URLSearchParams(params).toString(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Stripe error: ${response.status}`);
  return data;
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
  const results = {
    witness_reminder: 0,
    warmup: 0,
    verdict_request: 0,
    auto_resolve: 0,
    sms_retry: 0,
    refund_retry: 0,
    vow_lifecycle: 0,
    challenge_reminder: 0,
    challenge_expire: 0,
    push: 0,
    maker_sms: 0,
    witness_lifecycle_sms: 0,
    errors: [] as string[],
  };

  // For challenge vows, the "vow keeper" is target_user_id, not user_id
  const getVowKeeperId = (vow: { vow_type?: string; target_user_id?: string; user_id: string }) =>
    (vow.vow_type === 'challenge' && vow.target_user_id) ? vow.target_user_id : vow.user_id;

  try {
    // === TASK 0: Send witness acceptance reminders ===
    // Find active vows sealed >24h ago where witness hasn't accepted
    const reminderDeadline = new Date(now);
    reminderDeadline.setHours(reminderDeadline.getHours() - 24);

    const { data: unacceptedVows } = await supabase
      .from('vows')
      .select('*')
      .eq('vow_type', 'self')
      .eq('status', 'active')
      .not('witness_phone', 'is', null)
      .is('witness_accepted_at', null)
      .eq('witness_declined', false)
      .lte('sealed_at', reminderDeadline.toISOString());

    for (const vow of unacceptedVows || []) {
      if (vow.ends_at && new Date(vow.ends_at) <= now) continue;
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
        const body = witnessReminderMessage(ownerName, acceptUrl);
        const sid = await sendSMSWithRetry(supabase, vow.witness_phone!, body, 'witness_reminder', vow.id);
        if (sid) {
          await supabase.from('sms_log').insert({ vow_id: vow.id, message_type: 'witness_reminder', twilio_sid: sid });
        }

        const { data: makerUser } = await supabase.from('users').select('phone').eq('id', vow.user_id).single();
        const witnessName = vow.witness_name || 'Your witness';
        await notifyMaker(
          supabase,
          vow.user_id,
          { type: 'maker_24h_no_acceptance', vowId: vow.id, witnessName },
          { to: makerUser?.phone || '', body: makerWitnessNoResponseMessage(witnessName) },
          vow.id,
        );

        results.witness_reminder++;
      } catch (err) {
        results.errors.push(`witness_reminder ${vow.id}: ${err}`);
      }
    }

    // === TASK 1: Send warmup SMS (#2) ===
    // V6: warmup/midpoint dropped — replaced by 24h heads-up in TASK 9
    // const warmupStart = new Date(now);
    // warmupStart.setHours(warmupStart.getHours() + 12);
    // const warmupEnd = new Date(now);
    // warmupEnd.setHours(warmupEnd.getHours() + 36);
    //
    // const { data: warmupVows } = await supabase
    //   .from('vows')
    //   .select('*')
    //   .eq('status', 'active')
    //   .not('witness_phone', 'is', null)
    //   .gte('ends_at', warmupStart.toISOString())
    //   .lte('ends_at', warmupEnd.toISOString());
    //
    // for (const vow of warmupVows || []) {
    //   const { data: existing } = await supabase
    //     .from('sms_log')
    //     .select('id')
    //     .eq('vow_id', vow.id)
    //     .eq('message_type', 'warmup')
    //     .limit(1)
    //     .maybeSingle();
    //
    //   if (existing) continue;
    //
    //   try {
    //     const keeperId = getVowKeeperId(vow);
    //     const { data: profile } = await supabase.from('users').select('display_name').eq('id', keeperId).single();
    //     const ownerName = profile?.display_name || 'Someone';
    //     const body = warmupMessage(ownerName, vow.refined_text);
    //     const sid = await sendSMS(vow.witness_phone!, body);
    //     await supabase.from('sms_log').insert({ vow_id: vow.id, message_type: 'warmup', twilio_sid: sid });
    //     results.warmup++;
    //   } catch (err) {
    //     results.errors.push(`warmup ${vow.id}: ${err}`);
    //   }
    // }

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

        const isChallengeVow = vow.vow_type === 'challenge';
        const witnessAccepted = Boolean(vow.witness_accepted_at);
        const isSolo = vow.witness_name === 'Just me';

        if (vow.witness_phone && (isChallengeVow || witnessAccepted)) {
          // For challenge vows, the vow keeper is target_user_id — use their name
          const nameUserId = (vow.vow_type === 'challenge' && vow.target_user_id) ? vow.target_user_id : vow.user_id;
          const { data: profile } = await supabase.from('users').select('display_name').eq('id', nameUserId).single();
          const ownerName = profile?.display_name || 'Someone';
          const verdictUrl = `https://unbreakablevow.app/w/${vow.witness_invite_token}/verdict`;
          const body = verdictRequestMessage(ownerName, verdictUrl);
          const sid = await sendSMSWithRetry(supabase, vow.witness_phone, body, 'verdict_request', vow.id);
          if (sid) {
            await supabase.from('sms_log').insert({ vow_id: vow.id, message_type: 'verdict_request', twilio_sid: sid });
          }
        } else if (!isChallengeVow && !witnessAccepted && !isSolo) {
          const witnessName = vow.witness_name || 'Your witness';
          const { data: makerUser } = await supabase.from('users').select('phone').eq('id', vow.user_id).single();
          await notifyMaker(
            supabase,
            vow.user_id,
            { type: 'maker_self_verdict_time', vowId: vow.id, witnessName },
            {
              to: makerUser?.phone || '',
              body: makerSelfVerdictTimeMessage(witnessName),
            },
            vow.id,
          );
        }

        // For challenge vows, also notify the target (vow keeper) that verdict time is here.
        if (vow.vow_type === 'challenge' && vow.target_user_id) {
          const { data: targetUser } = await supabase.from('users').select('phone').eq('id', vow.target_user_id).single();
          await notifyMaker(
            supabase,
            vow.target_user_id,
            { type: 'maker_verdict_time', vowId: vow.id, witnessName: vow.witness_name || 'Your challenger' },
            {
              to: targetUser?.phone || '',
              body: makerVerdictTimeMessage(vow.witness_name || 'your challenger'),
            },
            vow.id,
          );
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

        // SMS #4 to witness — use vow keeper's name
        if (vow.witness_phone) {
          try {
            const keeperId = getVowKeeperId(vow);
            const { data: profile } = await supabase.from('users').select('display_name').eq('id', keeperId).single();
            const keeperName = profile?.display_name || 'Someone';
            const body = noRealPayment
              ? `No verdict received. ${keeperName}'s vow auto-resolved as kept.`
              : `No verdict received. ${keeperName}'s vow auto-resolved as kept. Wallet untouched.`;
            const sid = await sendSMSWithRetry(supabase, vow.witness_phone, body, 'outcome', vow.id);
            if (sid) {
              await supabase.from('sms_log').insert({ vow_id: vow.id, message_type: 'outcome', twilio_sid: sid });
            }
          } catch (smsErr) {
            results.errors.push(`auto-resolve sms ${vow.id}: ${smsErr}`);
          }
        }

        const { data: makerUser } = await supabase.from('users').select('phone').eq('id', vow.user_id).single();
        await notifyMaker(
          supabase,
          vow.user_id,
          { type: 'maker_auto_resolved', vowId: vow.id, stake: amountDollars },
          {
            to: makerUser?.phone || '',
            body: noRealPayment
              ? 'Unbreakable Vow: No verdict came in. Vow auto-resolved as kept.'
              : 'Unbreakable Vow: No verdict came in. Vow kept, wallet untouched.',
          },
          vow.id,
        );

        // For challenge vows, also notify the target (vow keeper)
        if (vow.vow_type === 'challenge' && vow.target_user_id) {
          const { data: targetUser } = await supabase.from('users').select('phone').eq('id', vow.target_user_id).single();
          await notifyMaker(
            supabase,
            vow.target_user_id,
            { type: 'maker_auto_resolved', vowId: vow.id, stake: amountDollars },
            {
              to: targetUser?.phone || '',
              body: noRealPayment
                ? 'Unbreakable Vow: No verdict came in. Your vow auto-resolved as kept.'
                : 'Unbreakable Vow: No verdict came in. Your vow kept, wallet untouched.',
            },
            vow.id,
          );
        }

        results.auto_resolve++;
      } catch (err) {
        results.errors.push(`auto_resolve ${vow.id}: ${err}`);
      }
    }

    // === TASK 5: Process queued SMS retries ===
    try {
      const { data: queuedSms } = await supabase
        .from('sms_retry_queue')
        .select('*')
        .eq('status', 'queued')
        .lte('next_attempt_at', now.toISOString())
        .order('next_attempt_at', { ascending: true })
        .limit(50);

      for (const item of queuedSms || []) {
        try {
          if (item.vow_id) {
            const { data: existingLog } = await supabase
              .from('sms_log')
              .select('id')
              .eq('vow_id', item.vow_id)
              .eq('message_type', item.message_type)
              .limit(1)
              .maybeSingle();

            if (existingLog) {
              await supabase
                .from('sms_retry_queue')
                .update({ status: 'sent', last_attempt_at: now.toISOString() })
                .eq('id', item.id);
              continue;
            }
          }

          const normalizedTo = normalizePhoneE164(item.to_phone);
          if (!normalizedTo || await isSMSOptedOut(supabase, normalizedTo)) {
            await supabase
              .from('sms_retry_queue')
              .update({ status: 'dead', last_attempt_at: now.toISOString() })
              .eq('id', item.id);
            if (item.vow_id) {
              await createAuditEvent(supabase, item.vow_id, 'sms_delivery_skipped', 'system', null, {
                message_type: item.message_type,
                reason: normalizedTo ? 'opted_out' : 'invalid_phone',
              });
            }
            continue;
          }

          const sid = await sendSMS(normalizedTo, item.body);
          if (item.vow_id) {
            await supabase.from('sms_log').insert({
              vow_id: item.vow_id,
              message_type: item.message_type,
              twilio_sid: sid,
            });
          }
          await supabase
            .from('sms_retry_queue')
            .update({ status: 'sent', attempts: (item.attempts || 0) + 1, last_attempt_at: now.toISOString() })
            .eq('id', item.id);
          results.sms_retry++;
        } catch (smsErr) {
          if (smsErr && typeof smsErr === 'object' && 'code' in smsErr && smsErr.code === 21610) {
            await markSMSOptedOut(supabase, item.to_phone, 'TWILIO_21610', 'STOP');
            await supabase
              .from('sms_retry_queue')
              .update({ status: 'dead', attempts: (item.attempts || 0) + 1, last_attempt_at: now.toISOString() })
              .eq('id', item.id);
            if (item.vow_id) {
              await createAuditEvent(supabase, item.vow_id, 'sms_delivery_skipped', 'system', null, {
                message_type: item.message_type,
                reason: 'opted_out',
                twilio_code: 21610,
              });
            }
            continue;
          }
          const attempts = (item.attempts || 0) + 1;
          const isDead = attempts >= 5;
          const delayMinutes = Math.min(60, 2 ** attempts);
          await supabase
            .from('sms_retry_queue')
            .update({
              attempts,
              status: isDead ? 'dead' : 'queued',
              last_attempt_at: now.toISOString(),
              next_attempt_at: new Date(now.getTime() + delayMinutes * 60 * 1000).toISOString(),
            })
            .eq('id', item.id);

          if (isDead && item.vow_id) {
            await createAuditEvent(supabase, item.vow_id, 'sms_failed', 'system', null, {
              message_type: item.message_type,
              reason: smsErr instanceof Error ? smsErr.message : String(smsErr),
            });
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.errors.push(`sms_retry_queue: ${msg}`);
    }

    // === TASK 5b: Retry legacy failed seal SMS ===
    try {
      const { data: smsFailed } = await supabase
        .from('vows')
        .select('*')
        .eq('sms_failed', true)
        .gte('sealed_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

      for (const vow of smsFailed || []) {
        // Move legacy sms_failed rows onto the durable retry path and clear
        // the flag so each failed invite is queued once instead of every cron run.
        try {
          const { data: profile } = await supabase.from('users').select('display_name').eq('id', vow.user_id).single();
          const ownerName = profile?.display_name || 'Someone';
          const amountDollars = Math.round(vow.stake_amount / 100);

          let body: string;
          let toPhone = vow.witness_phone;
          let messageType = 'seal';
          if (vow.vow_type === 'challenge' && vow.challenge_invite_token) {
            const challengeUrl = `https://unbreakablevow.app/c/${vow.challenge_invite_token}`;
            body = challengeMessage(ownerName, Math.round(vow.stake_amount / 100), challengeUrl);
            toPhone = vow.target_phone;
            messageType = 'challenge_invite';
          } else {
            const witnessUrl = `https://unbreakablevow.app/w/${vow.witness_invite_token}`;
            body = sealMessage(amountDollars, witnessUrl, ownerName);
          }
          const sid = await sendSMSWithRetry(supabase, toPhone!, body, messageType, vow.id);
          if (sid) {
            await supabase.from('sms_log').insert({ vow_id: vow.id, message_type: messageType, twilio_sid: sid });
          }
          await supabase.from('vows').update({ sms_failed: false }).eq('id', vow.id);
          await createAuditEvent(supabase, vow.id, sid ? 'sms_retried' : 'sms_retry_queued', 'system');
        } catch (smsErr) {
          console.error(`[cron-runner] SMS retry failed for ${vow.id}:`, smsErr);
        }
        results.sms_retry++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.errors.push(`sms_retry: ${msg}`);
    }

    // === TASK 6: Retry failed refunds / failed broken-vow charges ===
    try {
      const { data: refundFailed } = await supabase
        .from('vows')
        .select('*')
        .eq('refund_failed', true);

      for (const vow of refundFailed || []) {
        const { data: paymentDueSettlement } = await supabase
          .from('settlements')
          .select('*')
          .eq('vow_id', vow.id)
          .eq('status', 'payment_due')
          .maybeSingle();

        if (paymentDueSettlement && vow.status === 'broken') {
          try {
            if (!vow.stripe_payment_method_id) {
              throw new Error('No saved payment method for retry');
            }
            const payerUserId = (vow.vow_type === 'challenge' && vow.target_user_id) ? vow.target_user_id : vow.user_id;
            const settlementVow = { ...vow, user_id: payerUserId };

            const { data: userRow } = await supabase
              .from('users')
              .select('stripe_customer_id')
              .eq('id', payerUserId)
              .single();

            if (!userRow?.stripe_customer_id) {
              throw new Error('No Stripe customer found for retry');
            }

            const pi = await stripePost('payment_intents', {
              amount: String(vow.stake_amount),
              currency: 'usd',
              customer: userRow.stripe_customer_id,
              payment_method: vow.stripe_payment_method_id,
              off_session: 'true',
              confirm: 'true',
              'metadata[vow_id]': vow.id,
              'metadata[user_id]': payerUserId,
              'metadata[verdict]': 'broken',
              'metadata[retry]': 'true',
            }, `broken-charge-retry-${vow.id}-${new Date().toISOString().slice(0, 10)}`);

            await supabase.from('vows').update({
              stripe_payment_intent_id: pi.id,
              refund_failed: false,
            }).eq('id', vow.id);

            await upsertSettlement(supabase, settlementVow, {
              status: 'pending_manual_settlement',
              stripe_payment_intent_id: pi.id,
              stripe_charge_id: pi.latest_charge || null,
              failure_reason: null,
            });
            await createAuditEvent(supabase, vow.id, 'charge_retry_succeeded', 'system', null, { payment_intent_id: pi.id });
            results.refund_retry++;
          } catch (chargeErr) {
            const message = chargeErr instanceof Error ? chargeErr.message : String(chargeErr);
            const payerUserId = (vow.vow_type === 'challenge' && vow.target_user_id) ? vow.target_user_id : vow.user_id;
            await upsertSettlement(supabase, { ...vow, user_id: payerUserId }, {
              status: 'payment_due',
              failure_reason: message,
            });
            results.errors.push(`charge_retry ${vow.id}: ${message}`);
          }
          continue;
        }

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

    // === TASK 7: Schedule sparse vow lifecycle push notifications ===
    // No daily spam: day-1 for 3+ day vows, 24h before, verdict time, and witness verdict.
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
        const keeperId = getVowKeeperId(vow);
        const vowDurationMs = endsAt.getTime() - startsAt.getTime();
        const amountDollars = Math.round((vow.stake_amount || 0) / 100);

        try {
          const { data: keeperNotify } = await supabase
            .from('users')
            .select('push_token, last_push_receipt_ok_at, sms_only_preference, timezone, quiet_hours_start, quiet_hours_end')
            .eq('id', keeperId)
            .maybeSingle();

          // --- Day 1: only for vows 3+ days long. ---
          const day1 = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000);
          if (vowDurationMs >= 3 * 24 * 60 * 60 * 1000 && now >= day1 && hasHealthyPush(keeperNotify)) {
            const queued = await queuePush(
              supabase,
              keeperId,
              { type: 'maker_day1', vowId: vow.id, witnessName: vow.witness_name || undefined },
              quietAwareSendAt(day1, keeperNotify),
            );
            if (queued) results.vow_lifecycle++;
          }

          // --- 24h before deadline: main maker nudge. ---
          const twentyFourBefore = new Date(endsAt.getTime() - 24 * 60 * 60 * 1000);
          const midpoint = new Date((startsAt.getTime() + endsAt.getTime()) / 2);
          if (twentyFourBefore >= midpoint && now >= twentyFourBefore && hasHealthyPush(keeperNotify)) {
            const queued = await queuePush(
              supabase,
              keeperId,
              { type: 'maker_24h_warning', vowId: vow.id, stake: amountDollars },
              quietAwareSendAt(twentyFourBefore, keeperNotify),
            );
            if (queued) results.vow_lifecycle++;
          }

          // --- Verdict time: maker push. ---
          if (now >= endsAt && hasHealthyPush(keeperNotify)) {
            const witnessAccepted = Boolean(vow.witness_accepted_at);
            const isChallengeVow = vow.vow_type === 'challenge';
            const isSolo = vow.witness_name === 'Just me';
            const pendingExternalWitness = !isChallengeVow && !witnessAccepted && !isSolo;
            if (pendingExternalWitness) continue;
            const queued = await queuePush(
              supabase,
              keeperId,
              { type: 'maker_verdict_time', vowId: vow.id, witnessName: vow.witness_name || 'Your witness' },
              endsAt,
            );
            if (queued) results.vow_lifecycle++;
          }

          // --- Verdict time: app-linked witness push, SMS remains primary in TASK 2. ---
          if (now >= endsAt && (vow.vow_type === 'challenge' || vow.witness_accepted_at) && vow.witness_user_id && vow.witness_invite_token) {
            const { data: witnessNotify } = await supabase
              .from('users')
              .select('push_token, last_push_receipt_ok_at, sms_only_preference')
              .eq('id', vow.witness_user_id)
              .maybeSingle();
            if (hasHealthyPush(witnessNotify)) {
              const { data: keeperProfile } = await supabase
                .from('users')
                .select('display_name')
                .eq('id', keeperId)
                .single();
              const makerName = keeperProfile?.display_name || 'Someone';
              const queued = await queuePush(
                supabase,
                vow.witness_user_id,
                { type: 'witness_verdict_request', vowId: vow.id, token: vow.witness_invite_token, makerName },
                endsAt,
                { route: `/w/${vow.witness_invite_token}/verdict` },
              );
              if (queued) results.vow_lifecycle++;
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

    // === TASK 9: Maker + Witness lifecycle SMS ===
    // Send SMS at key vow milestones to both maker and witness
    try {
      const { data: smsLifecycleVows } = await supabase
        .from('vows')
        .select('*')
        .in('status', ['active', 'awaiting_verdict'])
        .not('starts_at', 'is', null)
        .not('ends_at', 'is', null);

      for (const vow of smsLifecycleVows || []) {
        const startsAt = new Date(vow.starts_at);
        const endsAt = new Date(vow.ends_at);
        const midpoint = new Date((startsAt.getTime() + endsAt.getTime()) / 2);
        const twentyFourBefore = new Date(endsAt.getTime() - 24 * 60 * 60 * 1000);

        // Helper: check SMS already sent
        async function smsAlreadySent(messageType: string): Promise<boolean> {
          const { data: existing } = await supabase
            .from('sms_log')
            .select('id')
            .eq('vow_id', vow.id)
            .eq('message_type', messageType)
            .limit(1)
            .maybeSingle();
          return !!existing;
        }

        const keeperId = getVowKeeperId(vow);

        try {
          const { data: keeperNotify } = await supabase
            .from('users')
            .select('push_token, last_push_receipt_ok_at, sms_only_preference')
            .eq('id', keeperId)
            .maybeSingle();
          const makerNeedsSmsFallback = !hasHealthyPush(keeperNotify);

          // --- Maker 24h before SMS ---
          if (makerNeedsSmsFallback && twentyFourBefore >= midpoint && now >= twentyFourBefore) {
            if (!(await smsAlreadySent('maker_24h'))) {
              const { data: makerUser } = await supabase.from('users').select('phone').eq('id', keeperId).single();
              if (makerUser?.phone) {
                const amountDollars = Math.round(vow.stake_amount / 100);
                const body = maker24hMessage(amountDollars);
                const sid = await sendSMSWithRetry(supabase, makerUser.phone, body, 'maker_24h', vow.id);
                if (sid) {
                  await supabase.from('sms_log').insert({ vow_id: vow.id, message_type: 'maker_24h', twilio_sid: sid });
                }
                results.maker_sms++;
              }
            }
          }

          // --- Maker verdict time SMS ---
          if (makerNeedsSmsFallback && now >= endsAt) {
            if (!(await smsAlreadySent('maker_verdict_time')) && !(await smsAlreadySent('maker_self_verdict_time'))) {
              const { data: makerUser } = await supabase.from('users').select('phone').eq('id', keeperId).single();
              if (makerUser?.phone) {
                const witnessAccepted = Boolean(vow.witness_accepted_at);
                const isChallengeVow = vow.vow_type === 'challenge';
                const isSolo = vow.witness_name === 'Just me';
                const witnessName = vow.witness_name || 'your witness';
                const pendingExternalWitness = !isChallengeVow && !witnessAccepted && !isSolo;
                const body = pendingExternalWitness
                  ? makerSelfVerdictTimeMessage(witnessName)
                  : makerVerdictTimeMessage(witnessName);
                const messageType = pendingExternalWitness ? 'maker_self_verdict_time' : 'maker_verdict_time';
                const sid = await sendSMSWithRetry(supabase, makerUser.phone, body, messageType, vow.id);
                if (sid) {
                  await supabase.from('sms_log').insert({ vow_id: vow.id, message_type: messageType, twilio_sid: sid });
                }
                results.maker_sms++;
              }
            }
          }

          // --- Witness 24h before SMS ---
          if (vow.witness_phone && (vow.vow_type === 'challenge' || vow.witness_accepted_at) && twentyFourBefore >= midpoint && now >= twentyFourBefore) {
            if (!(await smsAlreadySent('witness_24h'))) {
              const { data: keeperProfile } = await supabase.from('users').select('display_name').eq('id', keeperId).single();
              const keeperName = keeperProfile?.display_name || 'your friend';
              const body = witness24hMessage(keeperName);
              const sid = await sendSMSWithRetry(supabase, vow.witness_phone, body, 'witness_24h', vow.id);
              if (sid) {
                await supabase.from('sms_log').insert({ vow_id: vow.id, message_type: 'witness_24h', twilio_sid: sid });
              }
              results.witness_lifecycle_sms++;
            }
          }
        } catch (err) {
          results.errors.push(`sms_lifecycle ${vow.id}: ${err}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.errors.push(`sms_lifecycle: ${msg}`);
    }

    // === TASK 7b: Remind unanswered dare targets once before expiry ===
    try {
      const challengeReminderCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const challengeExpiryCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const { data: pendingDares } = await supabase
        .from('vows')
        .select('id, user_id, target_phone, challenge_invite_token, created_at')
        .eq('vow_type', 'challenge')
        .eq('challenge_status', 'pending')
        .eq('status', 'draft')
        .not('target_phone', 'is', null)
        .not('challenge_invite_token', 'is', null)
        .lte('created_at', challengeReminderCutoff)
        .gt('created_at', challengeExpiryCutoff);

      for (const vow of pendingDares || []) {
        const { data: existing } = await supabase
          .from('sms_log')
          .select('id')
          .eq('vow_id', vow.id)
          .eq('message_type', 'challenge_reminder')
          .limit(1)
          .maybeSingle();
        if (existing) continue;

        try {
          const { data: profile } = await supabase.from('users').select('display_name').eq('id', vow.user_id).single();
          const challengerName = profile?.display_name || 'Someone';
          const acceptUrl = `https://unbreakablevow.app/c/${vow.challenge_invite_token}`;
          const sid = await sendSMSWithRetry(
            supabase,
            vow.target_phone,
            challengeReminderMessage(challengerName, acceptUrl),
            'challenge_reminder',
            vow.id,
          );
          if (sid) {
            await supabase.from('sms_log').insert({ vow_id: vow.id, message_type: 'challenge_reminder', twilio_sid: sid });
          }
          results.challenge_reminder++;
        } catch (err) {
          results.errors.push(`challenge_reminder ${vow.id}: ${err}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.errors.push(`challenge_reminder: ${msg}`);
    }

    // === TASK 8: Expire unanswered challenge dares after 48h ===
    try {
      const challengeCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const { data: expiredDares } = await supabase
        .from('vows')
        .select('id, user_id, refined_text, target_phone')
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

          const targetName = vow.target_phone ? `Friend ${String(vow.target_phone).slice(-4)}` : 'They';
          const { data: challengerUser } = await supabase.from('users').select('phone').eq('id', vow.user_id).single();
          await notifyMaker(
            supabase,
            vow.user_id,
            { type: 'maker_cast_auto_voided', vowId: vow.id, targetName },
            { to: challengerUser?.phone || '', body: castAutoVoidedMessage(targetName) },
            vow.id,
          );

          results.challenge_expire++;
        } catch (err) {
          results.errors.push(`challenge_expire ${vow.id}: ${err}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.errors.push(`challenge_expire: ${msg}`);
    }

    // === TASK 10: Clean up orphan drafts older than 24h ===
    // Anonymous drafts that were never claimed or sealed within 24h are voided.
    try {
      const orphanCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const { data: orphanDrafts } = await supabase
        .from('vows')
        .select('id')
        .eq('status', 'draft')
        .lt('created_at', orphanCutoff)
        .is('user_id', null)
        .not('anonymous_owner_token', 'is', null);

      for (const draft of orphanDrafts || []) {
        try {
          const { data: voided } = await supabase
            .from('vows')
            .update({ status: 'voided' })
            .eq('id', draft.id)
            .eq('status', 'draft')
            .select('id')
            .maybeSingle();

          if (voided) {
            await createAuditEvent(supabase, draft.id, 'orphan_draft_voided', 'system');
          }
        } catch (err) {
          results.errors.push(`orphan_cleanup ${draft.id}: ${err}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.errors.push(`orphan_cleanup: ${msg}`);
    }

    // === TASK 4: Process push notification queue ===
    const { data: pendingPush } = await supabase
      .from('push_queue')
      .select('*')
      .eq('status', 'queued')
      .lte('send_after', now.toISOString())
      .order('send_after', { ascending: true })
      .limit(50);

    for (const item of pendingPush || []) {
      try {
        if (!item.user_id) {
          await supabase.from('push_queue').update({
            status: 'dead',
            sent: true,
            last_attempt_at: now.toISOString(),
            error_code: 'missing_user_id',
          }).eq('id', item.id);
          continue;
        }

        const { data: user } = await supabase
          .from('users')
          .select('push_token')
          .eq('id', item.user_id)
          .single();

        if (!user?.push_token) {
          await supabase.from('push_queue').update({
            status: 'dead',
            sent: true,
            attempts: (item.attempts || 0) + 1,
            last_attempt_at: now.toISOString(),
            error_code: 'missing_push_token',
          }).eq('id', item.id);
          if (item.data?.vow_id || item.data?.vowId) {
            await createAuditEvent(supabase, item.data.vow_id || item.data.vowId, 'notification_failed', 'system', null, {
              channel: 'push',
              user_id: item.user_id,
              payload_type: item.event_type || item.data?.event,
              error_code: 'missing_push_token',
            });
          }
          continue;
        }

        const result = await sendQueuedPush(
            user.push_token,
            item.title,
            item.body,
            (item.data as Record<string, unknown>) || undefined,
        );

        const attempts = (item.attempts || 0) + 1;
        if (result.ok) {
          await supabase.from('push_queue').update({
            status: 'sent',
            sent: true,
            sent_at: now.toISOString(),
            attempts,
            last_attempt_at: now.toISOString(),
            receipt_id: result.receiptId,
            error_code: null,
          }).eq('id', item.id);
          await supabase.from('users').update({ last_push_receipt_ok_at: now.toISOString() }).eq('id', item.user_id);
          if (item.data?.vow_id || item.data?.vowId) {
            await createAuditEvent(supabase, item.data.vow_id || item.data.vowId, 'notification_sent', 'system', null, {
              channel: 'push',
              user_id: item.user_id,
              payload_type: item.event_type || item.data?.event,
              receipt_id: result.receiptId,
            });
          }
          results.push++;
          continue;
        }

        await supabase.from('users').update({ last_push_receipt_failed_at: now.toISOString() }).eq('id', item.user_id);

        const dead = isDeadPushTokenError(result.errorCode) || attempts >= 5;
        await supabase.from('push_queue').update({
          status: dead ? 'dead' : 'queued',
          sent: dead,
          attempts,
          last_attempt_at: now.toISOString(),
          send_after: dead ? item.send_after : new Date(now.getTime() + Math.min(60, 2 ** attempts) * 60 * 1000).toISOString(),
          error_code: result.errorCode,
        }).eq('id', item.id);

        if (dead && user.push_token && isDeadPushTokenError(result.errorCode)) {
          await supabase.from('users').update({ push_token: null }).eq('id', item.user_id);
        }

        if (item.data?.vow_id || item.data?.vowId) {
          await createAuditEvent(supabase, item.data.vow_id || item.data.vowId, 'notification_failed', 'system', null, {
            channel: 'push',
            user_id: item.user_id,
            payload_type: item.event_type || item.data?.event,
            error_code: result.errorCode,
            retrying: !dead,
          });
        }
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
