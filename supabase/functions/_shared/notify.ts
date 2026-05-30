/**
 * Channel-dedup notification helper — V6
 *
 * RULE: Every maker-recipient notification MUST go through notifyMaker().
 * Push OR SMS, never both. Sending both is the fastest way to lose the user.
 *
 * Witness notifications are different: witnesses may not have the app.
 * Witness-side defaults to SMS-primary; push as bonus only if witness
 * has the app + push token.
 *
 * Canonical source: IMPLEMENTATION-V6.md §4.4.1
 */

import { sendSMS, TwilioSMSFailure } from './twilio.ts';
import { createAuditEvent } from './audit.ts';
import { normalizePhoneE164 } from './phone.ts';

type SupabaseLike = any;

// ── Push payload types (§4.4) ──

export type PushPayload =
  // Witness-side
  | { type: 'witness_vow_live'; vowId: string; makerName: string }
  | { type: 'witness_24h_headsup'; vowId: string; makerName: string }
  | { type: 'witness_verdict_request'; vowId: string; token: string; makerName: string }
  | { type: 'witness_maker_self_resolved'; vowId: string; makerName: string; verdict: string }
  | { type: 'witness_vow_voided'; vowId: string; makerName: string }

  // Maker-side
  | { type: 'maker_vow_sealed'; vowId: string }
  | { type: 'maker_witness_accepted'; vowId: string; witnessName: string }
  | { type: 'maker_witness_declined'; vowId: string; witnessName: string }
  | { type: 'maker_witness_invite_failed'; vowId: string; witnessName: string }
  | { type: 'maker_24h_no_acceptance'; vowId: string; witnessName: string }
  | { type: 'maker_self_verdict_time'; vowId: string; witnessName: string }
  | { type: 'maker_day1'; vowId: string; witnessName?: string }
  | { type: 'maker_24h_warning'; vowId: string; stake: number }
  | { type: 'maker_verdict_time'; vowId: string; witnessName: string }
  | { type: 'maker_verdict_recorded'; vowId: string; verdict: string; stake: number; destination?: string }
  | { type: 'maker_auto_resolved'; vowId: string; stake: number }
  | { type: 'maker_refund_succeeded'; vowId: string; stake: number }
  | { type: 'maker_refund_failed_final'; vowId: string; stake: number }

  // Cast / Dare
  | { type: 'maker_cast_sent'; vowId: string; targetName: string }
  | { type: 'maker_cast_invite_failed'; vowId: string; targetName: string }
  | { type: 'maker_cast_accepted'; vowId: string; targetName: string }
  | { type: 'maker_cast_declined'; vowId: string; targetName: string }
  | { type: 'maker_cast_auto_voided'; vowId: string; targetName: string }
  | { type: 'target_verdict_recorded'; vowId: string; verdict: string; makerName: string; destination: string };

// ── Push sending ──

export type PushSendResult = {
  ok: boolean;
  receiptId?: string;
  errorCode?: string;
};

export async function sendPush(pushToken: string, payload: PushPayload): Promise<PushSendResult> {
  try {
    const titleMap: Record<string, string> = {
      witness_vow_live: 'Vow is live',
      witness_24h_headsup: 'Verdict tomorrow',
      witness_verdict_request: 'Verdict time',
      witness_maker_self_resolved: 'Verdict recorded',
      witness_vow_voided: 'Vow withdrawn',
      maker_vow_sealed: 'Vow sealed',
      maker_witness_accepted: 'Your witness is in',
      maker_witness_declined: 'Witness declined',
      maker_witness_invite_failed: 'Witness text failed',
      maker_24h_no_acceptance: 'Still waiting',
      maker_self_verdict_time: 'Your verdict is due',
      maker_day1: 'Still in it',
      maker_24h_warning: '24 hours left',
      maker_verdict_time: 'Verdict time',
      maker_verdict_recorded: 'Verdict in',
      maker_auto_resolved: 'Vow auto-resolved',
      maker_refund_succeeded: 'Refund processed',
      maker_refund_failed_final: 'Refund issue',
      maker_cast_sent: 'Dare sent',
      maker_cast_invite_failed: 'Dare text failed',
      maker_cast_accepted: 'Dare accepted',
      maker_cast_declined: 'Dare declined',
      maker_cast_auto_voided: 'Dare expired',
      target_verdict_recorded: 'Verdict recorded',
    };

    const resp = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title: titleMap[payload.type] || 'Unbreakable Vow',
        body: getPushBody(payload),
        data: {
          ...payload,
          route: pushRouteFor(payload),
          vow_id: payload.vowId,
          event: payload.type,
        },
        sound: 'default',
      }),
    });

    const data = await resp.json().catch(() => null);
    const ticket = Array.isArray(data?.data) ? data.data[0] : data?.data;
    const errorCode = ticket?.details?.error || data?.errors?.[0]?.code || data?.message;

    return {
      ok: resp.ok && ticket?.status !== 'error',
      receiptId: ticket?.id,
      errorCode,
    };
  } catch (err) {
    return {
      ok: false,
      errorCode: err instanceof Error ? err.message : String(err),
    };
  }
}

function getPushBody(payload: PushPayload): string {
  switch (payload.type) {
    case 'witness_vow_live': return `${payload.makerName}'s vow is live. You're the witness.`;
    case 'witness_24h_headsup': return `${payload.makerName}'s vow ends tomorrow. Keep an eye out.`;
    case 'witness_verdict_request': return `Did ${payload.makerName} keep the vow? Make the call.`;
    case 'witness_maker_self_resolved': return `${payload.makerName} called the vow ${payload.verdict}. Nothing for you to rule.`;
    case 'witness_vow_voided': return `${payload.makerName} withdrew the vow. Nothing for you to judge.`;
    case 'maker_vow_sealed': return `It's sealed and waiting on your dashboard.`;
    case 'maker_witness_accepted': return `${payload.witnessName} accepted. Your vow is live.`;
    case 'maker_witness_declined': return `${payload.witnessName} declined. Pick someone else or go solo.`;
    case 'maker_witness_invite_failed': return `We couldn't text ${payload.witnessName}. Open the vow to share the link.`;
    case 'maker_24h_no_acceptance': return `${payload.witnessName} has not accepted yet. Nudge once?`;
    case 'maker_self_verdict_time': return `${payload.witnessName} never accepted. Open the vow and make the call yourself.`;
    case 'maker_day1': return payload.witnessName ? `${payload.witnessName} is watching. One clean day matters.` : 'Your vow is live. One clean day matters.';
    case 'maker_24h_warning': return payload.stake > 0 ? `$${payload.stake} is still on the line. Finish clean.` : 'Your word is still on the line. Finish clean.';
    case 'maker_verdict_time': return `Time's up. ${payload.witnessName} has the call now.`;
    case 'maker_verdict_recorded': return payload.verdict === 'kept'
      ? (payload.stake > 0 ? `Your word is gold. $${payload.stake} stays yours.` : 'Your word is gold.')
      : (payload.stake > 0 ? `$${payload.stake} is going to ${payload.destination || 'charity'}. The record stands.` : 'The record stands. Make the next one cleaner.');
    case 'maker_auto_resolved': return payload.stake > 0 ? 'No verdict came in. Vow kept, wallet untouched.' : 'No verdict came in. Vow auto-resolved as kept.';
    case 'maker_refund_succeeded': return `Your $${payload.stake} refund went through.`;
    case 'maker_refund_failed_final': return `We could not complete your refund yet. We're on it.`;
    case 'maker_cast_sent': return `${payload.targetName} has the dare. We'll tell you when they answer.`;
    case 'maker_cast_invite_failed': return `We couldn't text ${payload.targetName}. Open the dare to share the link.`;
    case 'maker_cast_accepted': return `${payload.targetName} accepted. You'll call the verdict when time is up.`;
    case 'maker_cast_declined': return `${payload.targetName} passed. Dare closed cleanly.`;
    case 'maker_cast_auto_voided': return `${payload.targetName} didn't respond. Dare closed.`;
    case 'target_verdict_recorded': return `${payload.makerName} ruled: ${payload.verdict}.`;
    default: return 'Check your vow.';
  }
}

export function pushRouteFor(payload: PushPayload): string {
  switch (payload.type) {
    case 'witness_verdict_request':
      return `/w/${payload.token}/verdict`;
    case 'witness_vow_live':
    case 'witness_24h_headsup':
    case 'witness_maker_self_resolved':
      return `/vow-detail?vowId=${payload.vowId}`;
    default:
      return `/vow-detail?vowId=${payload.vowId}`;
  }
}

export function pushDedupeKey(userId: string, vowId: string, eventType: string, channel = 'push'): string {
  return `${userId}:${vowId}:${eventType}:${channel}`;
}

export async function queuePush(
  supabase: SupabaseLike,
  userId: string,
  payload: PushPayload,
  sendAfter: string | Date,
  options: { route?: string; dedupeKey?: string; data?: Record<string, unknown> } = {},
): Promise<boolean> {
  const titleMap: Record<string, string> = {
    witness_vow_live: 'Vow is live',
    witness_24h_headsup: 'Verdict tomorrow',
    witness_verdict_request: 'Verdict time',
    witness_maker_self_resolved: 'Verdict recorded',
    witness_vow_voided: 'Vow withdrawn',
    maker_vow_sealed: 'Vow sealed',
    maker_witness_accepted: 'Your witness is in',
    maker_witness_declined: 'Witness declined',
    maker_witness_invite_failed: 'Witness text failed',
    maker_24h_no_acceptance: 'Still waiting',
    maker_self_verdict_time: 'Your verdict is due',
    maker_day1: 'Still in it',
    maker_24h_warning: '24 hours left',
    maker_verdict_time: 'Verdict time',
    maker_verdict_recorded: 'Verdict in',
    maker_auto_resolved: 'Vow auto-resolved',
    maker_refund_succeeded: 'Refund processed',
    maker_refund_failed_final: 'Refund issue',
    maker_cast_sent: 'Dare sent',
    maker_cast_invite_failed: 'Dare text failed',
    maker_cast_accepted: 'Dare accepted',
    maker_cast_declined: 'Dare declined',
    maker_cast_auto_voided: 'Dare expired',
    target_verdict_recorded: 'Verdict recorded',
  };
  const eventType = payload.type;
  const dedupeKey = options.dedupeKey || pushDedupeKey(userId, payload.vowId, eventType);
  const sendAfterIso = sendAfter instanceof Date ? sendAfter.toISOString() : sendAfter;

  const { error } = await supabase.from('push_queue').upsert({
    user_id: userId,
    title: titleMap[eventType] || 'Unbreakable Vow',
    body: getPushBody(payload),
    data: {
      ...payload,
      ...(options.data || {}),
      route: options.route || pushRouteFor(payload),
      vow_id: payload.vowId,
      event: eventType,
    },
    send_after: sendAfterIso,
    status: 'queued',
    sent: false,
    event_type: eventType,
    dedupe_key: dedupeKey,
  }, { onConflict: 'dedupe_key', ignoreDuplicates: true });

  if (!error && payload.vowId) {
    await createAuditEvent(supabase, payload.vowId, 'notification_queued', 'system', null, {
      channel: 'push',
      payload_type: eventType,
      user_id: userId,
      dedupe_key: dedupeKey,
    });
  }

  return !error;
}

// ── Channel dedup: maker notifications ──

export async function notifyMaker(
  supabase: SupabaseLike,
  userId: string,
  push: PushPayload,
  sms: { to: string; body: string },
  vowId?: string,
): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('push_token, last_push_receipt_ok_at, sms_only_preference')
    .eq('id', userId)
    .single();

  if (!user) return;

  // Channel selection: push if healthy, else SMS
  // Cold-start: new users have push_token but no prior receipt — treat as healthy-on-first-attempt
  const pushToken = typeof user.push_token === 'string' ? user.push_token : null;
  const lastPushReceiptOkAt = typeof user.last_push_receipt_ok_at === 'string' ? user.last_push_receipt_ok_at : null;
  const smsOnlyPreference = Boolean(user.sms_only_preference);
  const pushNeverTried = pushToken != null && lastPushReceiptOkAt == null;
  const pushRecentlyHealthy =
    lastPushReceiptOkAt != null &&
    Date.now() - new Date(lastPushReceiptOkAt).getTime() < 7 * 24 * 60 * 60 * 1000;
  const pushIsHealthy =
    pushToken != null &&
    !smsOnlyPreference &&
    (pushNeverTried || pushRecentlyHealthy);

  let channel: 'push' | 'sms' | 'none' = 'sms';

  if (pushIsHealthy) {
    const result = await sendPush(pushToken, push);
    if (result.ok) {
      await supabase.from('users').update({ last_push_receipt_ok_at: new Date().toISOString() }).eq('id', userId);
      channel = 'push';
    } else {
      await supabase.from('users').update({ last_push_receipt_failed_at: new Date().toISOString() }).eq('id', userId);
      if (vowId) {
        await createAuditEvent(supabase, vowId, 'notification_failed', 'system', null, {
          channel: 'push',
          payload_type: push.type,
          user_id: userId,
          error_code: result.errorCode,
        });
      }
    }
    // If push failed, fall through to SMS
  }

  if (channel === 'sms' && sms.to) {
    const sid = await sendSMSWithRetry(supabase, sms.to, sms.body, push.type, vowId);
    if (sid && vowId) {
      await supabase.from('sms_log').insert({
        vow_id: vowId,
        message_type: push.type,
        twilio_sid: sid,
      });
    }
  } else if (channel === 'sms') {
    channel = 'none';
  }

  // Audit — skip if no vowId (account-level notifications not tied to a vow)
  if (vowId) {
    await createAuditEvent(supabase, vowId, 'notification_sent', 'system', null, {
      channel,
      payload_type: push.type,
      user_id: userId,
    });
  }
}

// ── SMS with retry queue wrapper ──

export async function sendSMSWithRetry(
  supabase: SupabaseLike,
  to: string,
  body: string,
  messageType: string,
  vowId?: string,
): Promise<string | null> {
  const normalizedTo = normalizePhoneE164(to);
  if (!normalizedTo) {
    await createSMSDeliveryAudit(supabase, vowId, messageType, 'invalid_phone', { to });
    return null;
  }
  if (await isSMSOptedOut(supabase, normalizedTo)) {
    await createSMSDeliveryAudit(supabase, vowId, messageType, 'opted_out', { to: normalizedTo });
    return null;
  }

  try {
    const sid = await sendSMS(normalizedTo, body);
    return sid;
  } catch (err) {
    if (err instanceof TwilioSMSFailure && err.code === 21610) {
      await markSMSOptedOut(supabase, normalizedTo, 'TWILIO_21610', 'STOP');
      await createSMSDeliveryAudit(supabase, vowId, messageType, 'opted_out', { to: normalizedTo, twilio_code: err.code });
      return null;
    }
    await enqueueSMSRetry(supabase, normalizedTo, body, messageType, vowId);
    return null;
  }
}

async function enqueueSMSRetry(
  supabase: SupabaseLike,
  to: string,
  body: string,
  messageType: string,
  vowId?: string,
): Promise<void> {
  const normalizedTo = normalizePhoneE164(to);
  if (!normalizedTo) return;
  if (await isSMSOptedOut(supabase, normalizedTo)) return;

  if (vowId) {
    const { data: existing } = await supabase
      .from('sms_retry_queue')
      .select('id')
      .eq('vow_id', vowId)
      .eq('message_type', messageType)
      .eq('status', 'queued')
      .limit(1)
      .maybeSingle();
    if (existing) return;
  }

  await supabase.from('sms_retry_queue').insert({
    vow_id: vowId || null,
    to_phone: normalizedTo,
    body,
    message_type: messageType,
    next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
  });
}

export async function isSMSOptedOut(supabase: SupabaseLike, phone: string): Promise<boolean> {
  const normalizedPhone = normalizePhoneE164(phone);
  if (!normalizedPhone) return true;
  const { data } = await supabase
    .from('sms_opt_outs')
    .select('status')
    .eq('phone_e164', normalizedPhone)
    .eq('status', 'opted_out')
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function markSMSOptedOut(
  supabase: SupabaseLike,
  phone: string,
  keyword: string,
  optOutType: 'STOP' | 'START',
): Promise<void> {
  const normalizedPhone = normalizePhoneE164(phone);
  if (!normalizedPhone) return;
  await supabase.from('sms_opt_outs').upsert({
    phone_e164: normalizedPhone,
    status: optOutType === 'STOP' ? 'opted_out' : 'opted_in',
    last_keyword: keyword,
    last_opt_out_type: optOutType,
    updated_at: new Date().toISOString(),
  });
}

async function createSMSDeliveryAudit(
  supabase: SupabaseLike,
  vowId: string | undefined,
  messageType: string,
  reason: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  if (!vowId) return;
  await createAuditEvent(supabase, vowId, 'sms_delivery_skipped', 'system', null, {
    message_type: messageType,
    reason,
    ...metadata,
  });
}
