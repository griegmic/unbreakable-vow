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
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);

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

export async function sealVow(vowId: string) {
  const { error } = await supabase.from('vows').update({
    status: 'sealed',
    sealed_at: new Date().toISOString(),
  }).eq('id', vowId);
  if (error) throw error;
}

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
}

export async function getVowByWitnessToken(token: string): Promise<{ success: boolean; vow?: WitnessVowData; error?: string }> {
  console.log('[vow-api] getVowByWitnessToken:', token);
  try {
    const { data, error } = await supabase
      .from('vows')
      .select('id, refined_text, witness_name, stake_amount, consequence, destination, starts_at, ends_at, witness_accepted_at, witness_declined, status, user_id')
      .eq('witness_invite_token', token)
      .in('status', ['sealed', 'active', 'awaiting_verdict'])
      .single();

    if (error || !data) {
      console.error('[vow-api] getVowByWitnessToken error:', error);
      return { success: false, error: 'Vow not found or already resolved.' };
    }

    let userDisplayName: string | null = null;
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', data.user_id)
        .single();
      userDisplayName = userData?.display_name ?? null;
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
      },
    };
  } catch (err) {
    console.error('[vow-api] getVowByWitnessToken exception:', err);
    return { success: false, error: 'Something went wrong loading this vow.' };
  }
}

export async function acceptWitnessInvite(vowId: string): Promise<{ success: boolean; error?: string }> {
  console.log('[vow-api] acceptWitnessInvite for vow:', vowId);
  try {
    const { error } = await supabase.from('vows').update({
      witness_accepted_at: new Date().toISOString(),
      witness_declined: false,
    }).eq('id', vowId);
    if (error) {
      console.error('[vow-api] acceptWitnessInvite error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('[vow-api] acceptWitnessInvite exception:', err);
    return { success: false, error: 'Failed to accept invite.' };
  }
}

export async function declineWitnessInvite(vowId: string): Promise<{ success: boolean; error?: string }> {
  console.log('[vow-api] declineWitnessInvite for vow:', vowId);
  try {
    const { error } = await supabase.from('vows').update({
      witness_declined: true,
    }).eq('id', vowId);
    if (error) {
      console.error('[vow-api] declineWitnessInvite error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('[vow-api] declineWitnessInvite exception:', err);
    return { success: false, error: 'Failed to decline invite.' };
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
