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

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendSMS } from './twilio.ts';
import { createAuditEvent } from './audit.ts';

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
  supabase: SupabaseClient,
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
  const pushNeverTried = user.push_token != null && user.last_push_receipt_ok_at == null;
  const pushRecentlyHealthy =
    user.last_push_receipt_ok_at != null &&
    Date.now() - new Date(user.last_push_receipt_ok_at).getTime() < 7 * 24 * 60 * 60 * 1000;
  const pushIsHealthy =
    user.push_token != null &&
    !user.sms_only_preference &&
    (pushNeverTried || pushRecentlyHealthy);

  let channel: 'push' | 'sms' = 'sms';

  if (pushIsHealthy) {
    const ok = await sendPush(user.push_token, push);
    if (ok) {
      await supabase.from('users').update({ last_push_receipt_ok_at: new Date().toISOString() }).eq('id', userId);
      channel = 'push';
    }
    // If push failed, fall through to SMS
  }

  if (channel === 'sms' && sms.to) {
    try {
      await sendSMS(sms.to, sms.body);
    } catch (err) {
      // Queue for retry instead of silently failing
      await supabase.from('sms_retry_queue').insert({
        vow_id: vowId || null,
        to_phone: sms.to,
        body: sms.body,
        message_type: push.type,
        next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
      });
    }
  }

  // Audit — skip if no vowId (account-level notifications not tied to a vow)
  if (vowId) {
    await createAuditEvent(supabase, vowId, 'notification_sent', 'system', null, {
      channel,
      payload_type: push.type,
      user_id: userId,
    });
  }

// ── SMS with retry queue wrapper ──

export async function sendSMSWithRetry(
  supabase: SupabaseClient,
  to: string,
  body: string,
  messageType: string,
  vowId?: string,
): Promise<string | null> {
  try {
    const sid = await sendSMS(to, body);
    return sid;
  } catch (err) {
    // Insert into retry queue
    await supabase.from('sms_retry_queue').insert({
      vow_id: vowId || null,
      to_phone: to,
      body,
      message_type: messageType,
      next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
    });
    return null;
  }
}
