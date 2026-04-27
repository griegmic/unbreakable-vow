import { supabase } from '@/lib/supabase';

export type JudgeShareMethod = 'share' | 'copy' | 'contact';

export interface JudgeLinkTerms {
  vowId?: string | null;
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
}

export async function prepareJudgeLink(terms: JudgeLinkTerms, shareMethod: JudgeShareMethod): Promise<PreparedJudgeLink> {
  const { data, error } = await supabase.functions.invoke('prepare-judge-link', {
    body: {
      vow_id: terms.vowId ?? null,
      raw_input: terms.rawInput,
      refined_text: terms.refinedText,
      witness_name: terms.witnessName ?? 'Your witness',
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
