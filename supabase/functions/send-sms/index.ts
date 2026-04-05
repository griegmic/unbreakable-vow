import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { sendSMS } from '../_shared/twilio.ts';
import { sealMessage, warmupMessage, verdictRequestMessage, outcomeMessage } from '../_shared/sms-templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;
// Verdict URL points to the edge function that serves the HTML verdict page

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check: require service role key OR valid JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const isServiceRole = token === serviceRoleKey;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!isServiceRole) {
      const { error: authError } = await supabase.auth.getUser(token);
      if (authError) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { vow_id, message_type, body_override } = await req.json();

    if (!vow_id || !message_type) {
      return new Response(JSON.stringify({ error: 'vow_id and message_type required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotency check
    const { data: existing } = await supabase
      .from('sms_log')
      .select('id')
      .eq('vow_id', vow_id)
      .eq('message_type', message_type)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'already_sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch vow
    const { data: vow, error: vowError } = await supabase
      .from('vows')
      .select('*')
      .eq('id', vow_id)
      .single();

    if (vowError || !vow) {
      return new Response(JSON.stringify({ error: 'Vow not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!vow.witness_phone) {
      // No phone number — skip silently
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'no_phone' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get vow owner's display name
    const { data: profile } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', vow.user_id)
      .single();

    const ownerName = profile?.display_name || 'Someone';
    const amountDollars = Math.round(vow.stake_amount / 100);
    const endDate = vow.ends_at ? new Date(vow.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'soon';
    const verdictUrl = `https://unbreakablevow.app/witness?token=${vow.witness_invite_token}`;

    // Build message
    let messageBody: string;
    if (body_override) {
      messageBody = body_override;
    } else {
      switch (message_type) {
        case 'seal':
          messageBody = sealMessage(ownerName, vow.refined_text, amountDollars, endDate);
          break;
        case 'warmup':
          messageBody = warmupMessage(ownerName, vow.refined_text);
          break;
        case 'verdict_request':
          messageBody = verdictRequestMessage(ownerName, vow.refined_text, verdictUrl);
          break;
        case 'outcome':
          messageBody = outcomeMessage(ownerName, vow.verdict || 'broken', amountDollars, vow.destination);
          break;
        default:
          return new Response(JSON.stringify({ error: `Unknown message_type: ${message_type}` }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
      }
    }

    // Send SMS
    const twilioSid = await sendSMS(vow.witness_phone, messageBody);

    // Log to sms_log
    await supabase.from('sms_log').insert({
      vow_id,
      message_type,
      twilio_sid: twilioSid,
    });

    return new Response(JSON.stringify({ success: true, twilio_sid: twilioSid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-sms error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
