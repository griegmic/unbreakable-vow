import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createAuditEvent } from '../_shared/audit.ts';
import { sendSMSWithRetry } from '../_shared/notify.ts';
import { sealMessage } from '../_shared/sms-templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;
const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL') || Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'https://unbreakablevow.app';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization' }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { vow_id, force } = await req.json();
    if (!vow_id) return json({ error: 'vow_id required' }, 400);

    const { data: vow, error: vowError } = await supabase
      .from('vows')
      .select('id, user_id, status, witness_name, witness_phone, witness_invite_token, witness_accepted_at, witness_declined, stake_amount')
      .eq('id', vow_id)
      .single();

    if (vowError || !vow) return json({ error: 'Vow not found' }, 404);
    if (vow.user_id !== user.id) return json({ error: 'Forbidden' }, 403);
    if (!['draft', 'sealed', 'active'].includes(vow.status)) return json({ error: 'vow_not_resendable', status: vow.status }, 409);
    if (vow.witness_accepted_at) return json({ error: 'already_accepted' }, 409);
    if (!vow.witness_phone || !vow.witness_invite_token) return json({ error: 'missing_witness_contact' }, 400);

    const cooldownSince = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('sms_log')
      .select('id')
      .eq('vow_id', vow.id)
      .eq('message_type', 'seal')
      .gte('sent_at', cooldownSince)
      .limit(1)
      .maybeSingle();

    if (recent && !force) return json({ error: 'cooldown' }, 429);

    const { data: profile } = await supabase.from('users').select('display_name').eq('id', user.id).single();
    const ownerName = profile?.display_name || 'Someone';
    const witnessUrl = `${publicSiteUrl.replace(/\/$/, '')}/w/${vow.witness_invite_token}`;
    const amountDollars = Math.round((vow.stake_amount || 0) / 100);
    const body = sealMessage(amountDollars, witnessUrl, ownerName);
    const sid = await sendSMSWithRetry(supabase, vow.witness_phone, body, 'seal', vow.id);

    if (sid) {
      await supabase.from('sms_log').insert({
        vow_id: vow.id,
        message_type: 'seal',
        twilio_sid: sid,
      });
    }

    await createAuditEvent(supabase, vow.id, sid ? 'witness_invite_resent' : 'witness_invite_retry_queued', 'maker', user.id, {
      witness_name: vow.witness_name,
      forced: Boolean(force),
    });

    return json({ success: true, queued: !sid });
  } catch (err) {
    console.error('resend-witness-invite error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message || 'Internal server error' }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
