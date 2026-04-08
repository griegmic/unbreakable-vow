# Phase 5: Challenge Flow (End-to-End)

## Context
Phase 4 built the creation form which can create challenge vows. Phase 2 built the accept-challenge edge function. This phase builds the web pages that challenge targets interact with.

## Objective
Joey sends David a challenge via the creation form. David receives SMS, opens a web page, accepts or declines. The vow appears on both dashboards. At deadline, Joey (as witness) submits verdict.

## Tasks

### 1. Create challenge accept page (server component)
Create `web/src/app/c/[token]/page.tsx`

Follow the exact same pattern as `web/src/app/w/[token]/page.tsx` (witness invite server component):
- Create Supabase client with service role key (for bypassing RLS)
- Fetch vow by `challenge_invite_token`
- Fetch maker's display_name from users table
- Generate metadata (title, description, OpenGraph)
- If not found: return notFound()
- Render client component with vow data + maker name

```typescript
// Metadata generation:
export async function generateMetadata({ params }) {
  // Fetch vow by challenge_invite_token
  // Return: title: "{maker} challenged you", description: vow text
}
```

### 2. Create challenge accept page (client component)
Create `web/src/app/c/[token]/client.tsx`

Follow the pattern of `web/src/app/w/[token]/client.tsx` but for challenges:

**Three states: pending → accepted/declined**

**Pending state:**
```
⚔️
{makerName} challenged you

┌─────────────────────────────┐
│ "{vow refined_text}"        │
│                             │
│ {stake display or "No stake │
│  — accountability only"}    │
│ Due: {end date}             │
│ Witness: {makerName}        │
└─────────────────────────────┘

Accept and you're locked in.
{makerName} will hold you to it.

[ Accept Challenge ]
[ Decline — no shame ]
```

**Accepted state:**
```
⚔️ You're in.

"{vow text}"

{countdown to deadline}
{progress bar}

{makerName} is your witness.
They'll judge when time's up.

[Add to calendar] — ICS download for deadline
[Text {makerName}] — opens SMS app
```

**Declined state:**
```
Challenge declined.
No hard feelings.

[Make your own vow →] — link to /
```

**Accept handler:**
```typescript
const res = await fetch(`${supabaseUrl}/functions/v1/accept-challenge`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`, // Use the anon key for public access? Check how /w/[token] does it.
  },
  body: JSON.stringify({ token, action: 'accept' }),
});
```

IMPORTANT: Check how `/w/[token]/client.tsx` calls `accept-witness` — it uses `supabase.functions.invoke()`. Follow the same pattern for calling `accept-challenge`.

**Calendar ICS:** Same implementation as in `/w/[token]/client.tsx` — generates ICS file for deadline date.

**Decline handler:** Same as accept but with `action: 'decline'`.

### 3. Create not-found page for invalid tokens
Create `web/src/app/c/[token]/not-found-client.tsx`

Follow the same pattern as `web/src/app/w/[token]/not-found-client.tsx`.

### 4. Wire challenge creation end-to-end
Verify the full flow works with Phase 4's creation form:
1. Create challenge from `/create` with "Someone else" selected
2. Verify vow inserted with correct challenge fields
3. Verify seal-vow sends challenge SMS (check sms_log)
4. Open `/c/[token]` — verify page renders
5. Accept → verify challenge_status updated
6. At deadline → verify maker can submit verdict

### 5. Dashboard integration
Verify that:
- Accepted challenges appear in target's dashboard under "Active" (requires target_user_id to be set)
- For targets without accounts: they can only see via `/c/[token]` link (this is fine for V1)
- Maker's dashboard shows challenge vow with updated challenge_status
- When challenge is declined: vow moves to "Recent" as voided

## Reference Files
- `web/src/app/w/[token]/page.tsx` — SERVER COMPONENT PATTERN (replicate)
- `web/src/app/w/[token]/client.tsx` — CLIENT COMPONENT PATTERN (replicate for challenges)
- `web/src/app/w/[token]/not-found-client.tsx` — not-found pattern
- `supabase/functions/accept-challenge/index.ts` — from Phase 2
- `web/src/app/dashboard/page.tsx` — from Phase 3

## Verification
- [ ] Create challenge from `/create` with "Someone else"
- [ ] Vow has vow_type='challenge', challenge_invite_token set
- [ ] Challenge SMS sent (check sms_log for message_type='challenge_invite')
- [ ] `/c/[token]` renders challenge details with maker name
- [ ] `/c/[invalid]` shows not-found page
- [ ] Accept → challenge_status='accepted', audit event logged
- [ ] Accept → page transitions to accepted state with countdown
- [ ] Calendar ICS downloads correctly
- [ ] Decline → vow voided, refund if staked
- [ ] Decline → page shows declined state
- [ ] Maker's dashboard reflects challenge_status change
- [ ] If target has account: challenge appears in their dashboard
- [ ] At deadline: maker gets verdict request
- [ ] Maker submits verdict → vow resolves normally
- [ ] Challenge with $0 stake: full flow works
- [ ] Challenge with $50 stake: full flow including refund on decline
- [ ] OpenGraph metadata generates correct preview
- [ ] Mobile responsive at 375px

## Do Not Touch
- `/w/[token]/*` witness pages — separate flow, do not modify
- Existing verdict flow
- Dashboard structure (from Phase 3)
- Creation form (from Phase 4)
- All edge functions (from Phase 2)
- All Expo files
