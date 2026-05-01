import { createClient } from 'jsr:@supabase/supabase-js@2';
import { normalizePhoneE164 } from '../_shared/phone.ts';
import { validateTwilioSignature } from '../_shared/twilio-webhook.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const webhookUrlOverride = Deno.env.get('TWILIO_INBOUND_WEBHOOK_URL');

function twiml(message?: string) {
  const body = message ? `<Message>${message.replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  }[c] || c))}</Message>` : '';
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return twiml();

  const rawBody = await req.text();
  const params = new URLSearchParams(rawBody);
  const signature = req.headers.get('x-twilio-signature');
  const webhookUrl = webhookUrlOverride || req.url;

  if (twilioAuthToken) {
    const valid = await validateTwilioSignature(twilioAuthToken, webhookUrl, params, signature);
    if (!valid) return new Response('Invalid signature', { status: 403 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const fromPhone = normalizePhoneE164(params.get('From')) || params.get('From') || '';
  const toPhone = normalizePhoneE164(params.get('To')) || params.get('To');
  const body = params.get('Body') || '';
  const keyword = body.trim().split(/\s+/)[0]?.toUpperCase() || '';
  const optOutTypeParam = params.get('OptOutType')?.toUpperCase();
  const optOutType =
    optOutTypeParam ||
    (['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'REVOKE', 'OPTOUT'].includes(keyword) ? 'STOP'
      : ['START', 'UNSTOP'].includes(keyword) ? 'START'
        : keyword === 'HELP' ? 'HELP'
          : null);

  await supabase.from('sms_inbound_log').insert({
    from_phone: fromPhone,
    to_phone: toPhone,
    body,
    opt_out_type: optOutType,
    twilio_message_sid: params.get('MessageSid'),
    raw_payload: Object.fromEntries(params.entries()),
  });

  if (optOutType === 'STOP' || optOutType === 'START') {
    await supabase.from('sms_opt_outs').upsert({
      phone_e164: fromPhone,
      status: optOutType === 'STOP' ? 'opted_out' : 'opted_in',
      last_keyword: keyword,
      last_opt_out_type: optOutType,
      last_message_body: body,
      twilio_message_sid: params.get('MessageSid'),
      updated_at: new Date().toISOString(),
    });
  }

  // If Twilio Advanced Opt-Out is enabled, Twilio already replies. Returning
  // empty TwiML avoids double-sending. Without Advanced Opt-Out, this webhook
  // supplies the required HELP response while Twilio long-code defaults handle
  // STOP/START.
  if (optOutType === 'HELP' && !optOutTypeParam) {
    return twiml('Unbreakable Vow: transactional vow reminders only. Reply STOP to opt out or email joe@therave.co for help.');
  }

  return twiml();
});
