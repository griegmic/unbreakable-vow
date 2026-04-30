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

  // Maker-side
  | { type: 'maker_witness_accepted'; vowId: string; witnessName: string }
  | { type: 'maker_24h_no_acceptance'; vowId: string; witnessName: string }
  | { type: 'maker_24h_warning'; vowId: string; stake: number }
  | { type: 'maker_verdict_recorded'; vowId: string; verdict: string; stake: number }
  | { type: 'maker_refund_succeeded'; vowId: string; stake: number }
  | { type: 'maker_refund_failed_final'; vowId: string; stake: number }

  // Cast / Dare
  | { type: 'maker_cast_accepted'; vowId: string; targetName: string }
  | { type: 'maker_cast_declined'; vowId: string; targetName: string }
  | { type: 'maker_cast_auto_voided'; vowId: string; targetName: string }
  | { type: 'target_verdict_recorded'; vowId: string; verdict: string; makerName: string; destination: string };

// ── Push sending ──

export async function sendPush(pushToken: string, payload: PushPayload): Promise<boolean> {
  try {
    const titleMap: Record<string, string> = {
      witness_vow_live: 'Vow is live',
      witness_24h_headsup: 'Verdict tomorrow',
      witness_verdict_request: 'Time to judge',
      witness_maker_self_resolved: 'Verdict recorded',
      maker_witness_accepted: 'Witness accepted',
      maker_24h_no_acceptance: 'Still waiting',
      maker_24h_warning: '24 hours left',
      maker_verdict_recorded: 'Verdict in',
      maker_refund_succeeded: 'Refund processed',
      maker_refund_failed_final: 'Refund issue',
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
        data: payload,
        sound: 'default',
      }),
    });

    return resp.ok;
  } catch {
    return false;
  }
}

function getPushBody(payload: PushPayload): string {
  switch (payload.type) {
    case 'witness_vow_live': return `${payload.makerName}'s vow is live. You're the witness.`;
    case 'witness_24h_headsup': return `${payload.makerName}'s vow ends tomorrow. You'll get the verdict link.`;
    case 'witness_verdict_request': return `Did ${payload.makerName} keep the vow? One tap.`;
    case 'witness_maker_self_resolved': return `${payload.makerName} called the vow ${payload.verdict}. Nothing for you to rule.`;
    case 'maker_witness_accepted': return `${payload.witnessName} just accepted. Your vow is live.`;
    case 'maker_24h_no_acceptance': return `${payload.witnessName} still hasn't tapped. Want to nudge?`;
    case 'maker_24h_warning': return `24 hours left. $${payload.stake} still on the line.`;
    case 'maker_verdict_recorded': return payload.verdict === 'kept' ? 'Your word is gold.' : 'Verdict: broken.';
    case 'maker_refund_succeeded': return `Your $${payload.stake} refund went through.`;
    case 'maker_refund_failed_final': return `Refund issue — we're on it.`;
    case 'maker_cast_accepted': return `${payload.targetName} accepted your dare.`;
    case 'maker_cast_declined': return `${payload.targetName} declined your dare.`;
    case 'maker_cast_auto_voided': return `${payload.targetName} didn't respond. Dare voided.`;
    case 'target_verdict_recorded': return `${payload.makerName} ruled: ${payload.verdict}.`;
    default: return 'Check your vow.';
  }
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

  let channel: 'push' | 'sms' = 'sms';

  if (pushIsHealthy) {
    const ok = await sendPush(pushToken, push);
    if (ok) {
      await supabase.from('users').update({ last_push_receipt_ok_at: new Date().toISOString() }).eq('id', userId);
      channel = 'push';
    }
    // If push failed, fall through to SMS
  }

  if (channel === 'sms' && sms.to) {
    await sendSMSWithRetry(supabase, sms.to, sms.body, push.type, vowId);
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
