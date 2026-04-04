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
