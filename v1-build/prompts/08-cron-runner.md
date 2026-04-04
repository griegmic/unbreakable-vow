# Prompt 08: Cron Runner — Scheduled SMS + Auto-Resolve

## Context
Unbreakable Vow app. We need a scheduled process that:
1. Sends SMS #2 (warmup) to witnesses the day before vows end
2. Sends SMS #3 (verdict request) to witnesses when vows end
3. Auto-resolves vows as "kept" if witness doesn't respond within 72h
4. Processes the push notification queue

pg_cron (available in Supabase) can't make HTTP calls directly. Pattern: pg_cron writes to a queue table → an Edge Function polls and processes.

## What to do

### 1. Create migration: `supabase/migrations/002_cron_setup.sql`

```sql
-- Enable pg_cron extension
create extension if not exists pg_cron;

-- Schedule cron to invoke edge function every 15 minutes
-- pg_cron can call net.http_post via pg_net extension
create extension if not exists pg_net;

select cron.schedule(
  'process-vow-events',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/cron-runner',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**Alternative if pg_net isn't available:** Use Supabase's built-in cron via the dashboard (Database → Extensions → pg_cron), or use an external cron service (e.g., cron-job.org) to hit the Edge Function URL every 15 minutes.

### 2. Create `supabase/functions/cron-runner/index.ts`

This function runs every ~15 minutes and processes all pending events:

```typescript
// Auth: service_role only (verify Authorization header)

// === TASK 1: Send warmup SMS (#2) ===
// Find vows where:
//   status = 'active'
//   ends_at is within next 24-36 hours
//   No sms_log entry with message_type = 'warmup' for this vow
// For each: send warmup SMS, log to sms_log

// === TASK 2: Send verdict request SMS (#3) ===
// Find vows where:
//   status = 'active'
//   ends_at has passed (ends_at < now())
//   No sms_log entry with message_type = 'verdict_request' for this vow
// For each:
//   Update status to 'awaiting_verdict'
//   Send verdict request SMS with verdict URL
//   Log to sms_log

// === TASK 3: Auto-resolve overdue vows ===
// Find vows where:
//   status = 'awaiting_verdict'
//   ends_at < now() - interval '72 hours'
//   verdict is null
// For each:
//   Set verdict = 'kept', status = 'kept', verdict_at = now()
//   Issue Stripe refund
//   Send SMS #4 to witness: "No verdict received. {name}'s vow auto-resolved as kept. ${amount} refunded."
//   Queue push notification to owner: "Your vow was auto-resolved as kept! ${amount} refunded."

// === TASK 4: Process push notification queue ===
// Find push_queue entries where:
//   sent = false
//   send_after <= now()
// For each:
//   Look up user's push_token
//   Send push via Expo Push API
//   Mark as sent
```

### 3. Push notification sending helper

```typescript
async function sendPushNotification(pushToken: string, title: string, body: string, data?: Record<string, string>) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: pushToken,
      title,
      body,
      sound: 'default',
      data,
    }),
  });
  return response.json();
}
```

### 4. SMS timing logic

For warmup SMS (#2):
```typescript
// Send when: now() is between (ends_at - 36h) and (ends_at - 12h)
// This gives a ~24h window to catch the 15-min cron cycle
const warmupStart = new Date(vow.ends_at);
warmupStart.setHours(warmupStart.getHours() - 36);
const warmupEnd = new Date(vow.ends_at);
warmupEnd.setHours(warmupEnd.getHours() - 12);
const now = new Date();
if (now >= warmupStart && now <= warmupEnd) {
  // Send warmup
}
```

For verdict request SMS (#3):
```typescript
// Send when: ends_at has passed
if (new Date() >= new Date(vow.ends_at)) {
  // Send verdict request + update status
}
```

### 5. Idempotency
Every SMS send MUST check `sms_log` first:
```typescript
const { data: existing } = await supabase
  .from('sms_log')
  .select('id')
  .eq('vow_id', vow.id)
  .eq('message_type', messageType)
  .limit(1);

if (existing && existing.length > 0) {
  // Already sent, skip
  continue;
}
```

## Do NOT modify
- Any React Native app code
- Other Edge Functions (seal-vow, verdict-page, etc.)

## Important notes
- The cron runs every 15 minutes. SMS timing won't be exact-to-the-minute, but within a 15-min window is fine for v1.
- Auto-resolve as "kept" after 72h is the correct default — it's better to err on the side of the vow maker.
- The Expo Push API is free and doesn't require any additional setup beyond having a push token.
- If pg_net extension isn't available in your Supabase project, use the Supabase Dashboard to set up a cron job that calls the Edge Function URL, or use cron-job.org as an external trigger.
- All database queries in the cron runner use the service role key (bypasses RLS).
