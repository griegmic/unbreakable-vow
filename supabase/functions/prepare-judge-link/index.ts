import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createAuditEvent } from '../_shared/audit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;
const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL') || Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'https://www.unbreakablevow.app';

type ShareMethod = 'share' | 'copy' | 'contact';

type PreparePayload = {
  vow_id?: string | null;
  raw_input?: string;
  refined_text?: string;
  witness_name?: string | null;
  witness_phone?: string | null;
  stake_amount_cents?: number;
  consequence?: 'charity' | 'anti' | 'witness';
  destination?: string;
  ends_at?: string;
  share_method?: ShareMethod;
  anonymous_token?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function cleanString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

function stableTerms(payload: Required<Pick<PreparePayload, 'raw_input' | 'refined_text' | 'stake_amount_cents' | 'consequence' | 'destination' | 'ends_at'>>) {
  return {
    raw_input: payload.raw_input.trim(),
    refined_text: payload.refined_text.trim(),
    stake_amount_cents: payload.stake_amount_cents,
    consequence: payload.consequence,
    destination: payload.destination.trim(),
    ends_at: new Date(payload.ends_at).toISOString(),
  };
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function buildShareText(terms: ReturnType<typeof stableTerms>, witnessUrl: string): string {
  const amount = Math.round(terms.stake_amount_cents / 100);
  const stakeLine = amount > 0
    ? `$${amount} on the line for ${terms.destination}`
    : `Accountability on the line`;
  return `I just made an Unbreakable Vow: "${terms.refined_text}" — ${stakeLine}. Verdict ${formatDeadline(terms.ends_at)}. Will you be my judge? ${witnessUrl}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Support both authenticated and anonymous drafts.
    // Anonymous drafts use an anonymous_token for later claim-vow ownership transfer.
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (!authError && user) userId = user.id;
    }

    const body = await req.json().catch(() => ({})) as PreparePayload;

    // Anonymous callers must provide an anonymous_token
    const anonymousToken = cleanString(body.anonymous_token) || null;
    if (!userId && !anonymousToken) {
      return json({ error: 'missing_authorization_or_anonymous_token' }, 401);
    }

    const shareMethod = body.share_method === 'copy' || body.share_method === 'contact' ? body.share_method : 'share';
    const rawInput = cleanString(body.raw_input);
    const refinedText = cleanString(body.refined_text, rawInput);
    const destination = cleanString(body.destination, 'ALS Association');
    const consequence = body.consequence === 'anti' || body.consequence === 'witness' ? body.consequence : 'charity';
    const stakeAmountCents = Number.isFinite(body.stake_amount_cents) ? Math.max(0, Math.round(Number(body.stake_amount_cents))) : 0;
    const endsAt = cleanString(body.ends_at);

    if (!rawInput || !refinedText || !endsAt || Number.isNaN(new Date(endsAt).getTime())) {
      return json({ error: 'invalid_terms' }, 400);
    }

    const terms = stableTerms({
      raw_input: rawInput,
      refined_text: refinedText,
      stake_amount_cents: stakeAmountCents,
      consequence,
      destination,
      ends_at: endsAt,
    });
    const termsHash = await sha256(terms);
    const now = new Date().toISOString();
    const witnessName = cleanString(body.witness_name, 'Your witness');
    const witnessPhone = normalizePhone(body.witness_phone);

    let sourceDraft: {
      id: string;
      status: string;
      witness_invite_token: string | null;
      witness_share_locked_at: string | null;
      terms_hash: string | null;
    } | null = null;

    if (body.vow_id) {
      // Authenticated users look up by user_id; anonymous users look up by anonymous_owner_token
      let query = supabase
        .from('vows')
        .select('id, status, witness_invite_token, witness_share_locked_at, terms_hash')
        .eq('id', body.vow_id);

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.eq('anonymous_owner_token', anonymousToken!);
      }

      const { data: existing, error: existingError } = await query.maybeSingle();
      if (existingError) return json({ error: existingError.message }, 500);
      sourceDraft = existing;
    }

    if (sourceDraft && sourceDraft.status !== 'draft') {
      return json({ error: 'vow_not_draft', status: sourceDraft.status }, 409);
    }

    const shouldSupersede = !!sourceDraft?.witness_share_locked_at
      && !!sourceDraft.terms_hash
      && sourceDraft.terms_hash !== termsHash;

    const token = shouldSupersede || !sourceDraft?.witness_invite_token
      ? crypto.randomUUID()
      : sourceDraft.witness_invite_token;

    const draftPayload: Record<string, unknown> = {
      raw_input: terms.raw_input,
      refined_text: terms.refined_text,
      witness_name: witnessName,
      witness_phone: witnessPhone,
      witness_invite_token: token,
      stake_amount: terms.stake_amount_cents,
      consequence: terms.consequence,
      destination: terms.destination,
      status: 'draft',
      starts_at: new Date().toISOString(),
      ends_at: terms.ends_at,
      witness_share_locked_at: now,
      witness_share_method: shareMethod,
      terms_hash: termsHash,
    };

    // Set ownership: authenticated user gets user_id, anonymous gets token
    if (userId) {
      draftPayload.user_id = userId;
    } else {
      draftPayload.anonymous_owner_token = anonymousToken;
    }

    let draftId: string;

    if (sourceDraft && !shouldSupersede) {
      const { data, error } = await supabase
        .from('vows')
        .update(draftPayload)
        .eq('id', sourceDraft.id)
        .eq('status', 'draft')
        .select('id, witness_invite_token')
        .single();
      if (error || !data) return json({ error: error?.message || 'draft_update_failed' }, 500);
      draftId = data.id;
    } else {
      const { data, error } = await supabase
        .from('vows')
        .insert(draftPayload)
        .select('id, witness_invite_token')
        .single();
      if (error || !data) return json({ error: error?.message || 'draft_create_failed' }, 500);
      draftId = data.id;

      if (sourceDraft && shouldSupersede) {
        await supabase
          .from('vows')
          .update({ status: 'voided', superseded_by_vow_id: draftId })
          .eq('id', sourceDraft.id)
          .eq('status', 'draft');
        await createAuditEvent(supabase, sourceDraft.id, 'terms_changed_after_share', 'maker', userId, { superseded_by_vow_id: draftId });
      }
    }

    const witnessUrl = `${publicSiteUrl.replace(/\/$/, '')}/w/${token}`;
    const shareText = buildShareText(terms, witnessUrl);
    const eventType = shareMethod === 'copy' ? 'judge_link_copied' : 'judge_link_shared';
    await createAuditEvent(supabase, draftId, 'judge_link_prompt_seen', 'maker', userId, {
      share_method: shareMethod,
      terms_hash: termsHash,
    });
    await createAuditEvent(supabase, draftId, eventType, 'maker', userId, {
      share_method: shareMethod,
      terms_hash: termsHash,
    });

    return json({
      vowId: draftId,
      witnessInviteToken: token,
      witnessUrl,
      shareText,
      termsHash,
      supersededVowId: shouldSupersede ? sourceDraft?.id : null,
      anonymousToken: !userId ? anonymousToken : undefined,
    });
  } catch (err) {
    console.error('prepare-judge-link error:', err);
    return json({ error: err instanceof Error ? err.message : 'internal_error' }, 500);
  }
});
