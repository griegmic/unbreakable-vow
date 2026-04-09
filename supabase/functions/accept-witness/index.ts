import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createAuditEvent } from '../_shared/audit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { token, action, phone: reminderPhone, name: reminderName } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: 'token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Look up vow by witness_invite_token
    const { data: vow, error: vowError } = await supabase
      .from('vows')
      .select('id, user_id, status, witness_name, witness_phone, witness_accepted_at, witness_declined')
      .eq('witness_invite_token', token)
      .single();

    if (vowError || !vow) {
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle save-reminder (witness provides their phone for verdict-day SMS)
    if (action === 'save-reminder') {
      // Only allow if vow is still active and witness has accepted
      if (!['active', 'awaiting_verdict'].includes(vow.status) || !vow.witness_accepted_at) {
        return new Response(JSON.stringify({ error: 'cannot_save_reminder' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const updates: Record<string, string> = {};
      // Only set witness_phone if not already set (don't overwrite maker-provided phone)
      if (reminderPhone && !vow.witness_phone) updates.witness_phone = reminderPhone;
      if (reminderName && (!vow.witness_name || vow.witness_name === 'Just me')) updates.witness_name = reminderName;
      if (Object.keys(updates).length > 0) {
        await supabase.from('vows').update(updates).eq('id', vow.id);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check vow is in a state where acceptance makes sense
    if (!['active', 'awaiting_verdict'].includes(vow.status)) {
      return new Response(JSON.stringify({ error: 'vow_not_active', status: vow.status }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle decline
    if (action === 'decline') {
      await supabase
        .from('vows')
        .update({ witness_declined: true })
        .eq('id', vow.id);

      await createAuditEvent(supabase, vow.id, 'witness_declined', 'witness', null, { witness_name: vow.witness_name });

      // Push notification to owner
      await supabase.from('push_queue').insert({
        user_id: vow.user_id,
        title: `${vow.witness_name} declined`,
        body: 'Your witness can\'t do it. Tap to switch to a new witness or go solo.',
        data: { vow_id: vow.id, event: 'witness_declined' },
        send_after: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ success: true, action: 'declined' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle accept (idempotent)
    if (vow.witness_accepted_at) {
      return new Response(JSON.stringify({ success: true, already_accepted: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Atomic update — only set if still null
    const now = new Date().toISOString();
    const { count } = await supabase
      .from('vows')
      .update({ witness_accepted_at: now, witness_declined: false })
      .eq('id', vow.id)
      .is('witness_accepted_at', null);

    if (count === 0) {
      return new Response(JSON.stringify({ success: true, already_accepted: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to link witness account by phone
    if (vow.witness_phone) {
      const { data: witnessUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', vow.witness_phone)
        .maybeSingle();
      if (witnessUser) {
        await supabase.from('vows')
          .update({ witness_user_id: witnessUser.id })
          .eq('id', vow.id);
      }
    }

    await createAuditEvent(supabase, vow.id, 'witness_accepted', 'witness', null, { witness_name: vow.witness_name });

    // Push notification to vow owner
    await supabase.from('push_queue').insert({
      user_id: vow.user_id,
      title: `${vow.witness_name} accepted!`,
      body: 'Your witness is locked in. They\'ll deliver the verdict when the time comes.',
      data: { vow_id: vow.id, event: 'witness_accepted' },
      send_after: now,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('accept-witness error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
