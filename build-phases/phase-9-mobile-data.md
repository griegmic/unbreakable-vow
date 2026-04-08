# Phase 9: Mobile Data Layer (Claude Code)

## Context
Phases 1-8 completed the web app. All Supabase queries, edge functions, and schema are finalized. This phase prepares the Expo app's data layer so Rork-generated screens can plug in directly.

## Objective
Add all query functions and types needed for the mobile dashboard. Keep ALL existing code working. Pure additions.

## Tasks

### 1. Update Expo types
Read `expo/types/database.ts` (or wherever Supabase types are defined).

Add the same new fields added to web types in Phase 1:

```typescript
// Add to vows Row type:
vow_type: 'self' | 'challenge'
target_user_id: string | null
target_phone: string | null
challenge_status: 'pending' | 'accepted' | 'declined' | null
challenge_invite_token: string | null
witness_user_id: string | null

// Add audit_events table type (if types file has table definitions)
```

Do NOT remove or modify any existing type definitions.

### 2. Add dashboard query functions
Read `expo/lib/vow-api.ts` first. Understand existing patterns (how queries are made, how errors are handled, how the Supabase client is imported).

Add the following NEW functions alongside existing ones. Do NOT modify or remove existing functions (getActiveVow, getVowHistory, etc.):

```typescript
/**
 * Get all vows where the current user is the maker.
 * Sorted by urgency: awaiting_verdict first, then active by deadline.
 */
export async function getMyVows(): Promise<VowRow[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('vows')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getMyVows error:', error);
    return [];
  }
  return data || [];
}

/**
 * Get all active vows where the current user is the witness.
 */
export async function getWitnessingVows(): Promise<VowRow[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('vows')
    .select('*')
    .eq('witness_user_id', session.user.id)
    .in('status', ['active', 'awaiting_verdict'])
    .order('ends_at', { ascending: true });

  if (error) {
    console.error('getWitnessingVows error:', error);
    return [];
  }
  return data || [];
}

/**
 * Get pending challenges targeting the current user.
 */
export async function getIncomingChallenges(): Promise<VowRow[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('vows')
    .select('*')
    .eq('target_user_id', session.user.id)
    .eq('challenge_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getIncomingChallenges error:', error);
    return [];
  }
  return data || [];
}

/**
 * Get recent completed vows for the current user.
 */
export async function getRecentVows(limit: number = 10): Promise<VowRow[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('vows')
    .select('*')
    .eq('user_id', session.user.id)
    .in('status', ['kept', 'broken', 'voided'])
    .order('verdict_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getRecentVows error:', error);
    return [];
  }
  return data || [];
}

/**
 * Get full vow details by ID.
 */
export async function getVowDetail(vowId: string): Promise<VowRow | null> {
  const { data, error } = await supabase
    .from('vows')
    .select('*')
    .eq('id', vowId)
    .single();

  if (error) {
    console.error('getVowDetail error:', error);
    return null;
  }
  return data;
}

/**
 * Get audit trail events for a vow.
 */
export async function getVowTimeline(vowId: string): Promise<AuditEvent[]> {
  const { data, error } = await supabase
    .from('audit_events')
    .select('*')
    .eq('vow_id', vowId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getVowTimeline error:', error);
    return [];
  }
  return data || [];
}

/**
 * Submit a check-in for a vow.
 */
export async function submitCheckIn(
  vowId: string,
  type: 'on_track' | 'struggling' | 'done_early'
): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const { error } = await supabase.from('audit_events').insert({
    vow_id: vowId,
    event_type: 'check_in',
    actor_type: 'maker',
    actor_id: session.user.id,
    metadata: { type },
  });

  if (error) {
    console.error('submitCheckIn error:', error);
    return false;
  }
  return true;
}

/**
 * Accept a challenge via token.
 */
export async function acceptChallenge(token: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('accept-challenge', {
    body: { token, action: 'accept' },
  });
  if (error) {
    console.error('acceptChallenge error:', error);
    return false;
  }
  return data?.success === true;
}

/**
 * Decline a challenge via token.
 */
export async function declineChallenge(token: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('accept-challenge', {
    body: { token, action: 'decline' },
  });
  if (error) {
    console.error('declineChallenge error:', error);
    return false;
  }
  return data?.success === true;
}

/**
 * Void/cancel a vow. Replaces the old direct-DB voidVow().
 * Keep the old function but mark as deprecated.
 */
export async function voidVowV2(vowId: string): Promise<{ success: boolean; refunded?: boolean }> {
  const { data, error } = await supabase.functions.invoke('void-vow', {
    body: { vow_id: vowId },
  });
  if (error) {
    console.error('voidVow error:', error);
    return { success: false };
  }
  return data || { success: false };
}
```

Note: Name the new void function `voidVowV2` to avoid breaking the existing `voidVow` that other screens may call. The Rork dashboard screen will use `voidVowV2`. Once the old screens are migrated, the old function can be removed.

### 3. Add AuditEvent type
Add type definition (either in database.ts or vow-api.ts):
```typescript
export interface AuditEvent {
  id: string;
  vow_id: string;
  event_type: string;
  actor_type: 'maker' | 'witness' | 'target' | 'system';
  actor_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}
```

### 4. Add navigation route placeholder
Read `expo/app/_layout.tsx` to understand the navigation structure.

Add a route for the new dashboard screen. This depends on whether the app uses tabs or a stack:
- If tabs: add a new tab entry for "Vows" pointing to a new screen file
- If stack: add a new stack screen entry

Create a minimal placeholder screen file (e.g., `expo/app/(tabs)/vows.tsx` or `expo/app/vow-dashboard.tsx`):
```typescript
import { View, Text } from 'react-native';
export default function VowDashboard() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#030508' }}>
      <Text style={{ color: '#D4A24F' }}>Dashboard — Rork will generate this screen</Text>
    </View>
  );
}
```

This placeholder will be replaced by Rork in Phase 10.

## Reference Files
- `expo/lib/vow-api.ts` — READ FIRST, match existing patterns
- `expo/lib/supabase.ts` — Supabase client instance
- `expo/types/database.ts` — existing type definitions
- `expo/app/_layout.tsx` — navigation structure
- `web/src/lib/types.ts` — reference for new column types (Phase 1)

## Verification
- [ ] TypeScript compiles with no errors: check Expo build
- [ ] Existing functions still work: `getActiveVow()` returns data
- [ ] New functions return correct data when called
- [ ] `getMyVows()` returns user's vows
- [ ] `getWitnessingVows()` returns vows where user is witness
- [ ] `getIncomingChallenges()` returns pending challenges
- [ ] `getRecentVows()` returns completed vows
- [ ] `getVowTimeline()` returns audit events
- [ ] `submitCheckIn()` creates audit event
- [ ] `voidVowV2()` calls edge function
- [ ] Navigation route added, placeholder screen renders
- [ ] Expo app builds and runs without crash
- [ ] Existing screens all still work (spot check: home, live, settings)

## Do Not Touch
- `expo/components/vow-ui.tsx` — NEVER MODIFY
- Any existing screen files (index, refine, witness, stake, auth, seal, certificate, live, self-resolve, vow-kept, vow-broken, history, settings, challenges)
- Any existing providers
- `expo/lib/supabase.ts`
- All web files
- All Supabase files
