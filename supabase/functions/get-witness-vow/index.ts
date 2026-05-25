import { createClient } from 'jsr:@supabase/supabase-js@2';

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
    const { token } = await req.json().catch(() => ({}));
    if (!token || typeof token !== 'string') return json({ error: 'token_required' }, 400);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: vow, error } = await supabase
      .from('vows')
      .select('id, refined_text, witness_name, witness_invite_token, stake_amount, consequence, destination, starts_at, ends_at, witness_accepted_at, witness_declined, status, user_id')
      .eq('witness_invite_token', token)
      .maybeSingle();

    if (error) return json({ error: error.message }, 500);
    if (!vow) return json({ error: 'not_found' }, 404);

    let userDisplayName: string | null = null;
    let makerPhone: string | null = null;
    if (vow.user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('display_name, phone')
        .eq('id', vow.user_id)
        .maybeSingle();
      userDisplayName = user?.display_name ?? null;
      makerPhone = vow.witness_accepted_at && !vow.witness_declined ? user?.phone ?? null : null;
    }

    return json({
      success: true,
      vow: {
        id: vow.id,
        refined_text: vow.refined_text,
        witness_name: vow.witness_name,
        witness_invite_token: vow.witness_invite_token,
        stake_amount: vow.stake_amount,
        consequence: vow.consequence,
        destination: vow.destination,
        starts_at: vow.starts_at,
        ends_at: vow.ends_at,
        witness_accepted_at: vow.witness_accepted_at,
        witness_declined: vow.witness_declined,
        status: vow.status,
        user_display_name: userDisplayName,
        maker_phone: makerPhone,
      },
    });
  } catch (err) {
    console.error('get-witness-vow error:', err);
    return json({ error: err instanceof Error ? err.message : 'internal_error' }, 500);
  }
});
