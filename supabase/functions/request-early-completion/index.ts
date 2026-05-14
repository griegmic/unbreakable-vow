import { createClient } from 'jsr:@supabase/supabase-js@2';
import { queuePush, sendSMSWithRetry } from '../_shared/notify.ts';
import { earlyCompletionRequestMessage } from '../_shared/sms-templates.ts';
import { createAuditEvent } from '../_shared/audit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;
const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://unbreakablevow.app';

function cleanPersonName(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 7 && digits.length >= trimmed.replace(/\s/g, '').length - 2) return fallback;
  return trimmed;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { vow_id } = await req.json();
    if (!vow_id) {
      return new Response(JSON.stringify({ error: 'vow_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: vow, error: vowError } = await supabase
      .from('vows')
      .select('id, user_id, status, refined_text, witness_name, witness_phone, witness_invite_token, witness_accepted_at, witness_declined, witness_user_id, vow_type, target_user_id')
      .eq('id', vow_id)
      .single();

    if (vowError || !vow) {
      return new Response(JSON.stringify({ error: 'Vow not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const keeperId = vow.vow_type === 'challenge' && vow.target_user_id ? vow.target_user_id : vow.user_id;
    if (keeperId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (vow.status !== 'active') {
      return new Response(JSON.stringify({ error: 'not_active', status: vow.status }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!vow.witness_invite_token) {
      return new Response(JSON.stringify({ error: 'missing_witness_link' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const verdictUrl = `${publicSiteUrl}/w/${vow.witness_invite_token}/verdict?early=1`;

    if (!vow.witness_accepted_at || vow.witness_declined) {
      return new Response(JSON.stringify({
        error: 'witness_not_ready',
        witness_url: `${publicSiteUrl}/w/${vow.witness_invite_token}`,
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existing } = await supabase
      .from('sms_log')
      .select('id')
      .eq('vow_id', vow.id)
      .eq('message_type', 'early_completion_request')
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, already_sent: true, verdict_url: verdictUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', keeperId)
      .single();

    const makerName = cleanPersonName(profile?.display_name, 'Your friend');

    if (!vow.witness_phone) {
      await createAuditEvent(supabase, vow.id, 'early_completion_requested', 'maker', user.id, {
        delivery: 'link_only',
      });

      return new Response(JSON.stringify({ success: true, sent: false, verdict_url: verdictUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = earlyCompletionRequestMessage(makerName, verdictUrl);
    const twilioSid = await sendSMSWithRetry(supabase, vow.witness_phone, body, 'early_completion_request', vow.id);

    if (twilioSid) {
      await supabase.from('sms_log').insert({
        vow_id: vow.id,
        message_type: 'early_completion_request',
        twilio_sid: twilioSid,
      });
    }

    await createAuditEvent(supabase, vow.id, 'early_completion_requested', 'maker', user.id, {
      delivery: twilioSid ? 'sms' : 'sms_queued',
      witness_name: vow.witness_name,
    });

    if (vow.witness_user_id) {
      await queuePush(
        supabase,
        vow.witness_user_id,
        { type: 'witness_verdict_request', vowId: vow.id, token: vow.witness_invite_token, makerName },
        new Date(),
        {
          route: `/w/${vow.witness_invite_token}/verdict?early=1`,
          dedupeKey: `${vow.witness_user_id}:${vow.id}:early_completion_requested:push`,
          data: { event: 'early_completion_requested' },
        },
      );
    }

    return new Response(JSON.stringify({ success: true, sent: !!twilioSid, queued: !twilioSid, verdict_url: verdictUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('request-early-completion error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
