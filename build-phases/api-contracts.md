# Edge Function API Contracts

## Existing Functions (Unchanged Contracts)

### `create-payment-intent`
```
POST /functions/v1/create-payment-intent
Auth: JWT Bearer token
Request:  { "vow_id": string }
Response: { "clientSecret": string, "paymentIntentId": string }
Errors:   401, 400 (no vow_id), 404 (not found), 400 (invalid amount), 500
```

### `send-sms`
```
POST /functions/v1/send-sms
Auth: JWT or Service role
Request:  { "vow_id": string, "message_type": string, "body_override"?: string }
Response: { "success": true, "twilio_sid"?: string, "skipped"?: boolean, "reason"?: string }
Errors:   401, 400 (missing fields), 404 (vow not found), 400 (unknown type), 500
```

### `verdict-page`
```
GET /functions/v1/verdict-page?token={witness_invite_token}
Auth: None (public)
Response: HTML page
```

## Modified Functions

### `seal-vow` (Modified: $0 skip + challenge SMS + audit events)
```
POST /functions/v1/seal-vow
Auth: JWT Bearer token

Request:  { "vow_id": string }

Response (success):
  { "success": true }
  OR { "success": true, "already_sealed": true }

Response (errors):
  401: { "error": "Missing authorization" }
  401: { "error": "Unauthorized" }
  400: { "error": "vow_id required" }
  404: { "error": "Vow not found" }
  409: { "error": "Vow is not in a sealable state", "status": string }

  -- ONLY when stake_amount > 0:
  400: { "error": "Payment not yet captured" }
  402: { "error": "Payment not confirmed", "payment_status": string }

  500: { "error": "Failed to update vow" }
  500: { "error": string }

Behavior changes:
  - If stake_amount = 0: skips ALL Stripe operations (no PI check, no capture)
  - If vow_type = 'challenge': sends challenge SMS to target_phone (not witness SMS)
  - Creates audit_events: vow_sealed, witness_invited OR challenge_sent
```

### `accept-witness` (Modified: audit events + witness_user_id linking)
```
POST /functions/v1/accept-witness
Auth: Service role (token-based public access)

Request:  { "token": string, "action"?: "accept" | "decline" }

Response: unchanged from current contract

New side effects:
  - Creates audit_event: witness_accepted or witness_declined
  - On accept: checks if user exists with matching phone, sets witness_user_id
```

### `submit-verdict` (Modified: audit events)
```
POST /functions/v1/submit-verdict
Auth: Service role (token-based)

Request:  { "token": string, "verdict": "kept" | "broken" }

Response: unchanged from current contract

New side effects:
  - Creates audit_event: verdict_submitted
  - Creates audit_event: refund_issued (on successful refund)
  - Creates audit_event: refund_failed (on failed refund)
```

### `cron-runner` (Modified: +2 new tasks)
```
POST /functions/v1/cron-runner
Auth: Service role

Request:  {} (empty body)

Response:
{
  "success": true,
  "witness_reminder": number,
  "warmup": number,
  "verdict_request": number,
  "auto_resolve": number,
  "push": number,
  "sms_retry": number,      // NEW
  "refund_retry": number,    // NEW
  "errors": string[]
}

New tasks:
  Task 5 - SMS retry:
    Query: vows WHERE sms_failed=true AND sealed_at > now()-48h
    Action: Re-attempt SMS send, clear flag on success
    Limit: 3 attempts (checked via sms_log count), then give up + push notification

  Task 6 - Refund retry:
    Query: vows WHERE refund_failed=true
    Action: Re-attempt Stripe refund with idempotency key, clear flag on success
    Limit: Retry indefinitely (idempotent), push notification to maker on each failure
```

## New Functions

### `accept-challenge`
```
POST /functions/v1/accept-challenge
Auth: Service role (token-based public access)
CORS: Allow all origins

Request:
{
  "token": string,       // challenge_invite_token (required)
  "action": string       // "accept" | "decline" (optional, default "accept")
}

Response (accept success):
{
  "success": true,
  "action": "accepted"
}

Response (decline success):
{
  "success": true,
  "action": "declined"
}

Errors:
  400: { "error": "token required" }
  404: { "error": "invalid_token" }
  400: { "error": "vow_not_active", "status": string }
  409: { "error": "already_responded", "challenge_status": string }
  500: { "error": "Internal server error" }

Side effects (accept):
  - Updates vow.challenge_status → 'accepted'
  - Links target_user_id if user exists with matching phone
  - Creates audit_event: challenge_accepted
  - Push notification to maker

Side effects (decline):
  - Updates vow.challenge_status → 'declined'
  - Updates vow.status → 'voided'
  - Stripe refund if staked (sets refund_failed on failure)
  - Creates audit_event: challenge_declined
  - Push notification to maker
```

### `void-vow`
```
POST /functions/v1/void-vow
Auth: JWT Bearer token (user must own the vow)
CORS: Allow all origins

Request:
{
  "vow_id": string     // required
}

Response (success):
{
  "success": true,
  "refunded": boolean   // true if Stripe refund was attempted
}

Errors:
  401: { "error": "Missing authorization" }
  401: { "error": "Unauthorized" }
  400: { "error": "vow_id required" }
  404: { "error": "vow_not_found" }
  400: { "error": "cannot_void", "status": string }
  500: { "error": string }

Side effects:
  - Updates vow.status → 'voided'
  - Stripe refund if staked (sets refund_failed on failure)
  - Creates audit_event: vow_voided
  - SMS to witness: "{name} withdrew their vow"
  - Push notification to witness (if witness_user_id set)
```

## Shared Utilities

### `_shared/audit.ts`
```typescript
export async function createAuditEvent(
  supabase: SupabaseClient,
  vowId: string,
  eventType: string,
  actorType: 'maker' | 'witness' | 'target' | 'system',
  actorId?: string | null,
  metadata?: Record<string, unknown>
): Promise<void>
```
Non-blocking — failures logged but don't break calling function.

### `_shared/sms-templates.ts` (Updated)
```typescript
// Existing (modified for $0):
sealMessage(name, vowText, amount, endDate, acceptUrl?)  // $0: "accountability only"
warmupMessage(name, vowText)                              // unchanged
verdictRequestMessage(name, vowText, verdictUrl)          // unchanged
outcomeMessage(name, verdict, amount, destination)        // $0: "Word honored" / "Record stands"
witnessReminderMessage(name, vowText, acceptUrl)          // unchanged

// New:
challengeMessage(challengerName, vowText, amount, endDate, acceptUrl)
```
