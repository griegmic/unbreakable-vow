# Phase 1: Schema Migrations + Shared Utilities

## Context
The Supabase backend has 4 existing tables (users, vows, sms_log, push_queue) and 7 edge functions. All working. We are adding new tables and columns to support: concurrent vow dashboard, challenge flow, audit trail, $0 vows, and vow cancellation. ALL changes are additive — no existing columns or tables are modified.

## Objective
Deploy all database schema changes and shared utility files. Everything in subsequent phases depends on this.

## Tasks

### 1. Create migration file
Create `supabase/migrations/[use current timestamp]_v1_dashboard.sql` with the following SQL:

```sql
-- ============================================================
-- V1 Dashboard Migration: Additive Changes Only
-- ============================================================

-- 1. New table: audit_events
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  vow_id uuid not null references public.vows(id) on delete cascade,
  event_type text not null,
  actor_type text not null check (actor_type in ('maker','witness','target','system')),
  actor_id uuid references public.users(id),
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_audit_events_vow_id on public.audit_events(vow_id);
create index idx_audit_events_created_at on public.audit_events(created_at);

alter table public.audit_events enable row level security;

-- Makers can read audit events for their own vows
create policy "audit_select_own_vows" on public.audit_events
  for select using (
    vow_id in (select id from public.vows where user_id = auth.uid())
  );

-- Makers can insert check_in events for their own vows
create policy "audit_insert_checkin" on public.audit_events
  for insert with check (
    event_type = 'check_in'
    and actor_type = 'maker'
    and actor_id = auth.uid()
    and vow_id in (select id from public.vows where user_id = auth.uid())
  );

-- Witnesses can read audit events for vows they witness
create policy "audit_select_as_witness" on public.audit_events
  for select using (
    vow_id in (select id from public.vows where witness_user_id = auth.uid())
  );

-- Targets can read audit events for vows targeting them
create policy "audit_select_as_target" on public.audit_events
  for select using (
    vow_id in (select id from public.vows where target_user_id = auth.uid())
  );

-- 2. New columns on vows table for challenges
alter table public.vows
  add column if not exists vow_type text not null default 'self'
    check (vow_type in ('self','challenge'));

alter table public.vows
  add column if not exists target_user_id uuid references public.users(id);

alter table public.vows
  add column if not exists target_phone text;

alter table public.vows
  add column if not exists challenge_status text default 'pending'
    check (challenge_status in ('pending','accepted','declined'));

alter table public.vows
  add column if not exists challenge_invite_token text unique;

-- 3. New column: witness_user_id (links witness to their account)
alter table public.vows
  add column if not exists witness_user_id uuid references public.users(id);

-- 4. Indexes for new columns
create index if not exists idx_vows_challenge_invite_token
  on public.vows(challenge_invite_token)
  where challenge_invite_token is not null;

create index if not exists idx_vows_target_user_id
  on public.vows(target_user_id)
  where target_user_id is not null;

create index if not exists idx_vows_witness_user_id
  on public.vows(witness_user_id)
  where witness_user_id is not null;

-- 5. New RLS policies for cross-user vow visibility
create policy "vows_select_as_target" on public.vows
  for select using (target_user_id = auth.uid());

create policy "vows_select_as_witness" on public.vows
  for select using (witness_user_id = auth.uid());
```

### 2. Create shared audit helper
Create `supabase/functions/_shared/audit.ts`:

```typescript
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function createAuditEvent(
  supabase: SupabaseClient,
  vowId: string,
  eventType: string,
  actorType: "maker" | "witness" | "target" | "system",
  actorId?: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("audit_events").insert({
    vow_id: vowId,
    event_type: eventType,
    actor_type: actorType,
    actor_id: actorId || null,
    metadata: metadata || {},
  });

  if (error) {
    console.error(`Failed to create audit event ${eventType} for vow ${vowId}:`, error);
    // Non-blocking: audit failures should not break the main operation
  }
}
```

### 3. Update SMS templates
Read `supabase/functions/_shared/sms-templates.ts` first, then add $0-aware variants and challenge message:

**Changes to existing functions:**
- `sealMessage`: if amount = 0, replace stake text with "accountability only — no money, just their word"
- `outcomeMessage`: if amount = 0 and kept, say "Word honored" not "$X refunded". If broken, say "Vow broken. The record stands."

**New function to add:**
```typescript
export function challengeMessage(
  challengerName: string,
  vowText: string,
  amount: number,
  endDate: string,
  acceptUrl: string
): string {
  const stakeText = amount > 0
    ? ` with $${amount / 100} on the line.`
    : '.';
  const vowPreview = vowText.length > 80
    ? vowText.substring(0, 77) + '...'
    : vowText;
  return `${challengerName} challenged you: "${vowPreview}"${stakeText} Accept here: ${acceptUrl}`;
}
```

### 4. Update web types.ts
Read `web/src/lib/types.ts` first, then add new fields to the Vows Row type:

```typescript
// Add to Database['public']['Tables']['vows']['Row']:
vow_type: 'self' | 'challenge'
target_user_id: string | null
target_phone: string | null
challenge_status: 'pending' | 'accepted' | 'declined' | null
challenge_invite_token: string | null
witness_user_id: string | null
```

Also add the same fields to Insert and Update types (as optional).

Add new table type for audit_events:
```typescript
audit_events: {
  Row: {
    id: string
    vow_id: string
    event_type: string
    actor_type: 'maker' | 'witness' | 'target' | 'system'
    actor_id: string | null
    metadata: Record<string, unknown>
    created_at: string
  }
  Insert: {
    vow_id: string
    event_type: string
    actor_type: 'maker' | 'witness' | 'target' | 'system'
    actor_id?: string | null
    metadata?: Record<string, unknown>
  }
  Update: Partial<...>
}
```

## Reference Files
- `supabase/migrations/` — existing migrations for naming convention
- `supabase/functions/_shared/sms-templates.ts` — read before modifying
- `supabase/functions/_shared/twilio.ts` — reference for shared utility pattern
- `web/src/lib/types.ts` — read before modifying

## Verification
- [ ] Migration runs without errors on `supabase db push` or via dashboard
- [ ] `select vow_type, target_user_id, challenge_status, witness_user_id from vows limit 1` succeeds
- [ ] Existing vows all have `vow_type = 'self'`, null on new columns
- [ ] `select * from audit_events limit 0` succeeds
- [ ] `_shared/audit.ts` exports `createAuditEvent` function
- [ ] SMS templates handle amount=0 correctly
- [ ] Web TypeScript compiles: `cd web && npx tsc --noEmit`

## Do Not Touch
- Any existing migration files
- Any existing edge function logic (modifications happen in Phase 2)
- Any web page or component files
- Any Expo files
- `_shared/twilio.ts`
