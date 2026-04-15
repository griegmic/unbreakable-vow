import 'react-native-get-random-values';

import { supabase } from './supabase';

/** UUID v4 using the polyfilled crypto.getRandomValues */
function generateUUID(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function createVow(params: {
  rawInput: string;
  refinedText: string;
  witnessName: string;
  witnessPhone: string | null;
  stakeAmount: number; // dollars
  consequence: string;
  destination: string;
  deadlineIso?: string | null;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  // Ensure public.users row exists (foreign key requirement for vows.user_id)
  const userPhone = session.user.phone || (session.user.user_metadata?.phone as string) || null;
  await supabase.from('users').upsert(
    {
      id: session.user.id,
      display_name: (session.user.user_metadata?.full_name as string) || session.user.email?.split('@')[0] || null,
      ...(userPhone ? { phone: userPhone } : {}),
    },
    { onConflict: 'id' },
  );

  const endDate = params.deadlineIso ? new Date(params.deadlineIso) : new Date(Date.now() + 7 * 86400000);

  const { data, error } = await supabase.from('vows').insert({
    user_id: session.user.id,
    raw_input: params.rawInput,
    refined_text: params.refinedText,
    witness_name: params.witnessName,
    witness_phone: params.witnessPhone,
    witness_invite_token: generateUUID(),
    stake_amount: params.stakeAmount * 100,
    consequence: params.consequence,
    destination: params.destination,
    status: 'draft',
    starts_at: new Date().toISOString(),
    ends_at: endDate.toISOString(),
  }).select().single();

  if (error) throw error;
  return data;
}

/** @deprecated Use the seal-vow edge function instead. Direct DB writes skip Stripe capture. */
async function sealVow(_vowId: string) {
  throw new Error('sealVow() is disabled. Use the seal-vow edge function.');
}

/** @deprecated Use voidVowV2() which calls the void-vow edge function with proper Stripe handling. */
export async function voidVow(vowId: string) {
  const { error } = await supabase.from('vows').update({
    status: 'voided',
  }).eq('id', vowId);
  if (error) throw error;
}

export async function getActiveVow() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data } = await supabase.from('vows')
    .select('*')
    .eq('user_id', session.user.id)
    .in('status', ['sealed', 'active', 'awaiting_verdict'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}

export async function getVowHistory() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data } = await supabase.from('vows')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  return data ?? [];
}

export async function resendWitnessInvite(vowId: string): Promise<{ success: boolean; error?: string }> {
  console.log('[vow-api] resendWitnessInvite for vow:', vowId);
  try {
    const { data, error } = await supabase.functions.invoke('resend-witness-invite', {
      body: { vow_id: vowId },
    });
    if (error) {
      console.error('[vow-api] resendWitnessInvite error:', error);
      return { success: false, error: error.message || 'Failed to resend invite' };
    }
    if (data?.error === 'cooldown') {
      return { success: false, error: 'Please wait before resending.' };
    }
    return { success: true };
  } catch (err) {
    console.error('[vow-api] resendWitnessInvite exception:', err);
    const fallback = await supabase.functions.invoke('seal-vow', {
      body: { vow_id: vowId, resend_sms: true },
    }).catch(() => null);
    if (fallback?.data) return { success: true };
    return { success: false, error: 'Could not resend invite. Try again later.' };
  }
}

export async function switchToSoloWitness(vowId: string): Promise<{ success: boolean; error?: string }> {
  console.log('[vow-api] switchToSoloWitness for vow:', vowId);
  try {
    const { error } = await supabase.from('vows').update({
      witness_name: 'Just me',
      witness_phone: null,
      witness_accepted_at: null,
      witness_declined: false,
    }).eq('id', vowId);
    if (error) {
      console.error('[vow-api] switchToSoloWitness error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('[vow-api] switchToSoloWitness exception:', err);
    return { success: false, error: 'Failed to switch to solo.' };
  }
}

export async function updateVowWitness(vowId: string, params: {
  witnessName: string;
  witnessPhone: string | null;
}): Promise<{ success: boolean; witnessInviteToken?: string; error?: string }> {
  console.log('[vow-api] updateVowWitness for vow:', vowId, params);
  try {
    const newToken = generateUUID();
    const { error } = await supabase.from('vows').update({
      witness_name: params.witnessName,
      witness_phone: params.witnessPhone,
      witness_invite_token: newToken,
      witness_accepted_at: null,
      witness_declined: false,
    }).eq('id', vowId);
    if (error) {
      console.error('[vow-api] updateVowWitness error:', error);
      return { success: false, error: error.message };
    }
    if (params.witnessPhone) {
      await supabase.functions.invoke('seal-vow', {
        body: { vow_id: vowId, resend_sms: true },
      }).catch((e) => console.warn('[vow-api] SMS send after witness update failed:', e));
    }
    return { success: true, witnessInviteToken: newToken };
  } catch (err) {
    console.error('[vow-api] updateVowWitness exception:', err);
    return { success: false, error: 'Failed to update witness.' };
  }
}

export interface WitnessVowData {
  id: string;
  refined_text: string;
  witness_name: string;
  stake_amount: number;
  consequence: string;
  destination: string;
  starts_at: string | null;
  ends_at: string | null;
  witness_accepted_at: string | null;
  witness_declined: boolean;
  status: string;
  user_display_name: string | null;
  maker_phone: string | null;
  witness_invite_token: string | null;
}

export async function getVowByWitnessToken(token: string): Promise<{ success: boolean; vow?: WitnessVowData; error?: string }> {
  console.log('[vow-api] getVowByWitnessToken:', token);
  try {
    const { data, error } = await supabase
      .from('vows')
      .select('id, refined_text, witness_name, witness_invite_token, stake_amount, consequence, destination, starts_at, ends_at, witness_accepted_at, witness_declined, status, user_id')
      .eq('witness_invite_token', token)
      .single();

    if (error || !data) {
      console.error('[vow-api] getVowByWitnessToken error:', error);
      return { success: false, error: 'Vow not found or already resolved.' };
    }

    let userDisplayName: string | null = null;
    let makerPhone: string | null = null;
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('display_name, phone')
        .eq('id', data.user_id)
        .single();
      userDisplayName = userData?.display_name ?? null;
      makerPhone = userData?.phone ?? null;
    } catch {
      console.log('[vow-api] could not fetch user display name');
    }

    return {
      success: true,
      vow: {
        id: data.id,
        refined_text: data.refined_text,
        witness_name: data.witness_name,
        stake_amount: data.stake_amount,
        consequence: data.consequence,
        destination: data.destination,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        witness_accepted_at: data.witness_accepted_at,
        witness_declined: data.witness_declined ?? false,
        status: data.status,
        user_display_name: userDisplayName,
        maker_phone: makerPhone,
        witness_invite_token: data.witness_invite_token,
      },
    };
  } catch (err) {
    console.error('[vow-api] getVowByWitnessToken exception:', err);
    return { success: false, error: 'Something went wrong loading this vow.' };
  }
}

export async function acceptWitnessInvite(token: string): Promise<{ success: boolean; error?: string }> {
  console.log('[vow-api] acceptWitnessInvite with token:', token);
  try {
    // Explicitly pass JWT so edge function can link witness_user_id
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    const { data, error } = await supabase.functions.invoke('accept-witness', {
      body: { token, action: 'accept' },
      headers,
    }) as { data: any; error: any };
    if (error) {
      // Parse the actual error from the edge function response
      let errorBody: any = null;
      try { errorBody = await error.context?.json(); } catch {}
      console.error('[vow-api] acceptWitnessInvite error:', errorBody || error.message);
      if (errorBody?.error === 'vow_not_active') return { success: false, error: 'This vow is no longer active.' };
      if (errorBody?.error === 'invalid_token') return { success: false, error: 'This invite link is no longer valid.' };
      return { success: false, error: `Failed to accept invite. (${errorBody?.error || error.message || 'unknown'})` };
    }
    if (data?.error) {
      return { success: false, error: data.error === 'vow_not_active' ? 'This vow is no longer active.' : 'Something went wrong.' };
    }
    return { success: true };
  } catch (err) {
    console.error('[vow-api] acceptWitnessInvite exception:', err);
    return { success: false, error: 'Failed to accept invite.' };
  }
}

export async function declineWitnessInvite(token: string): Promise<{ success: boolean; error?: string }> {
  console.log('[vow-api] declineWitnessInvite with token:', token);
  try {
    const { data, error } = await supabase.functions.invoke('accept-witness', {
      body: { token, action: 'decline' },
    }) as { data: any; error: any };
    if (error) {
      let errorBody: any = null;
      try { errorBody = await error.context?.json(); } catch {}
      console.error('[vow-api] declineWitnessInvite error:', errorBody || error.message);
      return { success: false, error: `Failed to decline invite. (${errorBody?.error || error.message || 'unknown'})` };
    }
    if (data?.error) {
      return { success: false, error: 'Something went wrong.' };
    }
    return { success: true };
  } catch (err) {
    console.error('[vow-api] declineWitnessInvite exception:', err);
    return { success: false, error: 'Failed to decline invite.' };
  }
}

function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export async function saveWitnessReminder(token: string, phone: string, name?: string): Promise<{ success: boolean; error?: string }> {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return { success: false, error: 'Please enter a valid phone number.' };

  try {
    const { data, error } = await supabase.functions.invoke('accept-witness', {
      body: { token, action: 'save-reminder', phone: formatPhoneE164(phone), name },
    }) as { data: any; error: any };
    if (error) {
      let errorBody: any = null;
      try { errorBody = await error.context?.json(); } catch {}
      return { success: false, error: errorBody?.error || error.message || 'Failed to save reminder.' };
    }
    if (data?.error) return { success: false, error: data.error };
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to save reminder.' };
  }
}

export interface VowRow {
  id: string;
  user_id: string;
  raw_input: string;
  refined_text: string;
  status: 'draft' | 'sealed' | 'active' | 'awaiting_verdict' | 'kept' | 'broken' | 'voided';
  vow_type: 'self' | 'challenge';
  witness_name: string;
  witness_phone: string | null;
  witness_user_id: string | null;
  witness_accepted_at: string | null;
  witness_declined: boolean;
  target_user_id: string | null;
  target_phone: string | null;
  challenge_status: 'pending' | 'accepted' | 'declined' | null;
  challenge_invite_token: string | null;
  stake_amount: number;
  consequence: string;
  destination: string;
  starts_at: string | null;
  ends_at: string | null;
  verdict: 'kept' | 'broken' | null;
  verdict_at: string | null;
  sealed_at: string | null;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  vow_id: string;
  event_type: string;
  actor_type: 'maker' | 'witness' | 'target' | 'system';
  actor_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export async function getMyVows(): Promise<VowRow[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  // Fetch vows I created
  const { data: myData, error: myError } = await supabase.from('vows')
    .select('*')
    .eq('user_id', session.user.id)
    .in('status', ['draft', 'sealed', 'active', 'awaiting_verdict'])
    .order('created_at', { ascending: false });
  if (myError) { console.error('[vow-api] getMyVows error:', myError); }
  // Also fetch accepted challenges where I'm the target (vow keeper)
  const { data: challengeData, error: challengeError } = await supabase.from('vows')
    .select('*')
    .eq('target_user_id', session.user.id)
    .eq('challenge_status', 'accepted')
    .in('status', ['draft', 'sealed', 'active', 'awaiting_verdict', 'kept', 'broken'])
    .order('created_at', { ascending: false });
  if (challengeError) { console.error('[vow-api] getMyVows challenge error:', challengeError); }
  // Merge, avoiding duplicates
  const my = (myData ?? []) as VowRow[];
  const challenges = (challengeData ?? []) as VowRow[];
  const myIds = new Set(my.map(v => v.id));
  return [...my, ...challenges.filter(v => !myIds.has(v.id))];
}

export async function getWitnessingVows(): Promise<VowRow[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const { data, error } = await supabase.from('vows')
    .select('*')
    .eq('witness_user_id', session.user.id)
    .neq('user_id', session.user.id)
    .in('status', ['active', 'awaiting_verdict'])
    .order('created_at', { ascending: false });
  if (error) { console.error('[vow-api] getWitnessingVows error:', error); return []; }
  return (data ?? []) as VowRow[];
}

export async function getIncomingChallenges(): Promise<VowRow[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const { data, error } = await supabase.from('vows')
    .select('*')
    .eq('target_user_id', session.user.id)
    .eq('challenge_status', 'pending')
    .order('created_at', { ascending: false });
  if (error) { console.error('[vow-api] getIncomingChallenges error:', error); return []; }
  return (data ?? []) as VowRow[];
}

export async function getRecentVows(limit: number = 5): Promise<VowRow[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  // Vows I created
  const { data: myData, error: myError } = await supabase.from('vows')
    .select('*')
    .eq('user_id', session.user.id)
    .in('status', ['kept', 'broken', 'voided'])
    .order('created_at', { ascending: false })
    .limit(limit);
  if (myError) { console.error('[vow-api] getRecentVows error:', myError); }
  // Completed challenge vows where I was the target
  const { data: challengeData, error: challengeError } = await supabase.from('vows')
    .select('*')
    .eq('target_user_id', session.user.id)
    .eq('challenge_status', 'accepted')
    .in('status', ['kept', 'broken', 'voided'])
    .order('created_at', { ascending: false })
    .limit(limit);
  if (challengeError) { console.error('[vow-api] getRecentVows challenge error:', challengeError); }
  // Merge and sort by created_at desc, limit
  const merged = [...(myData ?? []), ...(challengeData ?? [])];
  merged.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  return merged.slice(0, limit) as VowRow[];
}

export async function acceptChallenge(token: string): Promise<{ success: boolean; error?: string }> {
  console.log('[vow-api] acceptChallenge:', token);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'Not authenticated' };

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

    const res = await fetch(`${supabaseUrl}/functions/v1/accept-challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        token,
        action: 'accept',
        email: session.user.email,
        display_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
        stake_amount: 0,
        destination: '',
      }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok || body?.error) {
      const errMsg = body?.error ? String(body.error) : `HTTP ${res.status}`;
      console.error('[vow-api] acceptChallenge error:', errMsg);
      return { success: false, error: errMsg };
    }
    return { success: true };
  } catch (err) {
    console.error('[vow-api] acceptChallenge exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function declineChallenge(token: string): Promise<{ success: boolean; error?: string }> {
  console.log('[vow-api] declineChallenge:', token);
  try {
    const { data: { session } } = await supabase.auth.getSession();

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${session?.access_token || anonKey}`,
    };

    const res = await fetch(`${supabaseUrl}/functions/v1/accept-challenge`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        token,
        action: 'decline',
        display_name: session?.user?.user_metadata?.full_name || undefined,
      }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok || body?.error) {
      const errMsg = body?.error ? String(body.error) : `HTTP ${res.status}`;
      console.error('[vow-api] declineChallenge error:', errMsg);
      return { success: false, error: errMsg };
    }
    return { success: true };
  } catch (err) {
    console.error('[vow-api] declineChallenge exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getVowDetail(vowId: string): Promise<VowRow | null> {
  console.log('[vow-api] getVowDetail:', vowId);
  const { data, error } = await supabase.from('vows')
    .select('*')
    .eq('id', vowId)
    .single();
  if (error) { console.error('[vow-api] getVowDetail error:', error); return null; }
  return data as VowRow;
}

export async function getVowTimeline(vowId: string): Promise<AuditEvent[]> {
  console.log('[vow-api] getVowTimeline:', vowId);
  const { data, error } = await supabase.from('audit_events')
    .select('*')
    .eq('vow_id', vowId)
    .order('created_at', { ascending: true });
  if (error) { console.error('[vow-api] getVowTimeline error:', error); return []; }
  return (data ?? []) as AuditEvent[];
}

export async function voidVowV2(vowId: string): Promise<{ success: boolean; refunded?: boolean; error?: string }> {
  console.log('[vow-api] voidVowV2:', vowId);
  try {
    const { error } = await supabase.functions.invoke('void-vow', {
      body: { vow_id: vowId },
    });
    if (error) {
      console.error('[vow-api] voidVowV2 edge function error:', error);
      // Fallback: direct DB update so vow at least gets voided
      await supabase.from('vows').update({ status: 'voided' }).eq('id', vowId);
      return { success: true, refunded: false };
    }
    return { success: true, refunded: true };
  } catch (err) {
    console.error('[vow-api] voidVowV2 exception:', err);
    // Fallback: direct DB update
    try { await supabase.from('vows').update({ status: 'voided' }).eq('id', vowId); } catch { /* ignore */ }
    return { success: false, error: 'Could not withdraw vow.' };
  }
}

export async function extendVowDeadline(vowId: string, hours: number): Promise<{ success: boolean; newEndDate?: string; error?: string }> {
  console.log('[vow-api] extendVowDeadline for vow:', vowId, 'by', hours, 'hours');
  try {
    const { data: vowData } = await supabase.from('vows')
      .select('ends_at')
      .eq('id', vowId)
      .single();
    if (!vowData?.ends_at) {
      return { success: false, error: 'Vow not found' };
    }
    const currentEnd = new Date(vowData.ends_at);
    const newEnd = new Date(currentEnd.getTime() + hours * 60 * 60 * 1000);
    const { error } = await supabase.from('vows').update({
      ends_at: newEnd.toISOString(),
    }).eq('id', vowId);
    if (error) {
      console.error('[vow-api] extendVowDeadline error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, newEndDate: newEnd.toISOString() };
  } catch (err) {
    console.error('[vow-api] extendVowDeadline exception:', err);
    return { success: false, error: 'Failed to extend deadline.' };
  }
}
