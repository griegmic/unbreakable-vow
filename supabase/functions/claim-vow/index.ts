import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createAuditEvent } from '../_shared/audit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'missing_authorization' }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return json({ error: 'unauthorized' }, 401);

    const { vow_id, anonymous_token } = await req.json().catch(() => ({}));
    if (!vow_id || !anonymous_token) {
      return json({ error: 'vow_id and anonymous_token required' }, 400);
    }

    // Atomic claim: set user_id and clear anonymous_owner_token,
    // but only if the token matches and user_id is still null.
    const { data: claimed, error: claimError } = await supabase
      .from('vows')
      .update({
        user_id: user.id,
        anonymous_owner_token: null,
      })
      .eq('id', vow_id)
      .eq('anonymous_owner_token', anonymous_token)
      .is('user_id', null)
      .eq('status', 'draft')
      .select('id')
      .maybeSingle();

    if (claimError) return json({ error: claimError.message }, 500);

    if (!claimed) {
      return json({ error: 'claim_failed', message: 'Vow not found, already claimed, or not in draft status' }, 409);
    }

    await createAuditEvent(supabase, vow_id, 'vow_claimed', 'maker', user.id, {
      claimed_from: 'anonymous_token',
    });

    return json({ success: true, vowId: claimed.id });
  } catch (err) {
    console.error('claim-vow error:', err);
    return json({ error: err instanceof Error ? err.message : 'internal_error' }, 500);
  }
});
