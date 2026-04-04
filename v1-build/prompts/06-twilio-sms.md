# Prompt 06: Twilio SMS Edge Functions

## Context
Unbreakable Vow app. The witness receives 4 SMS messages over the life of a vow. The witness never needs the app — they judge via a web page. SMS is their only touchpoint.

Supabase Edge Functions handle all SMS sending via Twilio REST API.

## The 4 SMS messages

| # | Trigger | Message Template |
|---|---|---|
| 1 | Vow sealed (immediate) | "{name} just made an Unbreakable Vow: \"{vow_text}\" — with ${amount} on the line. You're the witness. You'll get a link to deliver your verdict on {end_date}." |
| 2 | Day before vow ends | "Reminder: {name}'s vow \"{vow_text}\" ends tomorrow. You'll get a verdict link soon." |
| 3 | Vow period ends | "It's verdict time! Did {name} keep their vow: \"{vow_text}\"? Tap here to decide: {verdict_url}" |
| 4 | After verdict submitted | "Verdict recorded: {verdict}. {outcome_message}" |

Where `outcome_message` is:
- If kept: "{name} kept their word. ${amount} refunded."
- If broken: "{name} broke their vow. ${amount} goes to {destination}."

## What to do

### 1. Create `supabase/functions/_shared/twilio.ts`
Shared Twilio helper:

```typescript
export async function sendSMS(to: string, body: string): Promise<string> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
  const from = Deno.env.get('TWILIO_PHONE_NUMBER')!;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    }
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Twilio error: ${result.message}`);
  }
  return result.sid;
}
```

### 2. Create `supabase/functions/_shared/sms-templates.ts`
Message templates:

```typescript
export function sealMessage(name: string, vowText: string, amount: number, endDate: string): string {
  return `${name} just made an Unbreakable Vow: "${vowText}" — with $${amount} on the line. You're the witness. You'll get a link to deliver your verdict on ${endDate}.`;
}

export function warmupMessage(name: string, vowText: string): string {
  return `Reminder: ${name}'s vow "${vowText}" ends tomorrow. You'll get a verdict link soon.`;
}

export function verdictRequestMessage(name: string, vowText: string, verdictUrl: string): string {
  return `It's verdict time! Did ${name} keep their vow: "${vowText}"? Tap here to decide: ${verdictUrl}`;
}

export function outcomeMessage(name: string, verdict: string, amount: number, destination: string): string {
  if (verdict === 'kept') {
    return `Verdict recorded: Kept! ${name} kept their word. $${amount} refunded.`;
  }
  return `Verdict recorded: Broken. ${name} broke their vow. $${amount} goes to ${destination}.`;
}
```

### 3. Create `supabase/functions/send-sms/index.ts`
Generic SMS sender Edge Function that logs to `sms_log`:

```typescript
// POST { vow_id, message_type, body_override? }
// Auth: service_role only (called by other edge functions or cron)
//
// 1. Fetch vow + user profile
// 2. Check sms_log for idempotency (skip if already sent for this vow_id + message_type)
// 3. Build message from template (or use body_override)
// 4. Call sendSMS() to witness phone
// 5. Log to sms_log table
// 6. Return { success, twilio_sid }
```

### 4. Update `supabase/functions/seal-vow/index.ts`
After sealing the vow and updating status to `active`:
- Call `sendSMS` with SMS #1 (seal message) to witness
- Log it to `sms_log` with `message_type: 'seal'`
- Only send if `witness_phone` is not null

### 5. SMS sending for #2, #3, #4
- SMS #2 (warmup) and #3 (verdict request) are sent by the cron runner (Prompt 08)
- SMS #4 (outcome) is sent by the witness-verdict Edge Function (Prompt 07)

## Do NOT modify
- Any app screens
- Any React Native code
- This prompt only creates/modifies Supabase Edge Functions

## Important notes
- All SMS go to a single phone number (the witness). The vow owner gets push notifications, not SMS.
- Twilio toll-free numbers don't require A2P 10DLC registration (long codes do). But toll-free verification is recommended for production.
- The `sms_log` idempotency check prevents double-sending if a function retries.
- Phone numbers must be E.164 format (`+1XXXXXXXXXX`). Validate/format on the client before saving.
- For beta testing, you can add a check: if `witness_phone` is null or empty, skip SMS sending silently.
