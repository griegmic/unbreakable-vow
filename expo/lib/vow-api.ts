import 'react-native-get-random-values';

import { supabase } from './supabase';

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
    witness_invite_token: crypto.randomUUID(),
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
    const newToken = crypto.randomUUID();
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
