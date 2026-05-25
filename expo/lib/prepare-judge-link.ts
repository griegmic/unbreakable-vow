import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type JudgeShareMethod = 'share' | 'copy' | 'contact';

const ANONYMOUS_OWNER_TOKEN_KEY = 'uv_anonymous_owner_token';

export interface JudgeLinkTerms {
  vowId?: string | null;
  anonymousToken?: string | null;
  rawInput: string;
  refinedText: string;
  stakeAmountCents: number;
  consequence: 'charity' | 'anti' | 'witness';
  destination: string;
  endsAt: string;
  witnessName?: string | null;
  witnessPhone?: string | null;
}

export interface PreparedJudgeLink {
  vowId: string;
  witnessInviteToken: string;
  witnessUrl: string;
  shareText: string;
  termsHash: string;
  supersededVowId: string | null;
  anonymousToken?: string;
}

function createAnonymousOwnerToken(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === 'function') return randomUUID.call(globalThis.crypto);

  return `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

export async function getAnonymousOwnerToken(): Promise<string> {
  const existing = await AsyncStorage.getItem(ANONYMOUS_OWNER_TOKEN_KEY);
  if (existing) return existing;

  const token = createAnonymousOwnerToken();
  await AsyncStorage.setItem(ANONYMOUS_OWNER_TOKEN_KEY, token);
  return token;
}

export async function prepareJudgeLink(terms: JudgeLinkTerms, shareMethod: JudgeShareMethod): Promise<PreparedJudgeLink> {
  const { data: { session } } = await supabase.auth.getSession();
  const anonymousToken = session?.access_token ? null : terms.anonymousToken || await getAnonymousOwnerToken();

  const { data, error } = await supabase.functions.invoke('prepare-judge-link', {
    body: {
      vow_id: terms.vowId ?? null,
      anonymous_token: anonymousToken,
      raw_input: terms.rawInput,
      refined_text: terms.refinedText,
      witness_name: terms.witnessName?.trim() || null,
      witness_phone: terms.witnessPhone ?? null,
      stake_amount_cents: terms.stakeAmountCents,
      consequence: terms.consequence,
      destination: terms.destination,
      ends_at: terms.endsAt,
      share_method: shareMethod,
    },
  });

  if (error) throw new Error(error.message || 'Could not prepare judge link');
  return data as PreparedJudgeLink;
}
