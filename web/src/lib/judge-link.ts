'use client';

import { supabase } from '@/lib/supabase';

export type JudgeShareMethod = 'share' | 'copy' | 'contact';
export type JudgeConsequence = 'charity' | 'anti' | 'witness';

export interface JudgeLinkTerms {
  vowId?: string | null;
  rawInput: string;
  refinedText: string;
  stakeAmountCents: number;
  consequence: JudgeConsequence;
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

export function stableJudgeTerms(terms: JudgeLinkTerms) {
  return {
    raw_input: terms.rawInput.trim(),
    refined_text: terms.refinedText.trim(),
    stake_amount_cents: terms.stakeAmountCents,
    consequence: terms.consequence,
    destination: terms.destination.trim(),
    ends_at: new Date(terms.endsAt).toISOString(),
  };
}

export async function hashJudgeTerms(terms: JudgeLinkTerms): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(stableJudgeTerms(terms)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
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

  if (error) {
    let detail = error.message;
    try {
      const context = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      if (typeof context?.json === 'function') {
        const body = await context.json();
        detail = body?.error || detail;
      }
    } catch {}
    throw new Error(detail || 'Could not prepare judge link');
  }

  return data as PreparedJudgeLink;
}

export async function shareOrCopyJudgeLink(prepared: PreparedJudgeLink): Promise<'shared' | 'copied'> {
  if (navigator.share) {
    try {
      await navigator.share({ text: prepared.shareText, url: prepared.witnessUrl });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
    }
  }

  await navigator.clipboard.writeText(prepared.shareText);
  return 'copied';
}
