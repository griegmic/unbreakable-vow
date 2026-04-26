import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createAuditEvent } from '../_shared/audit.ts';
import { sendSMS } from '../_shared/twilio.ts';
import { witnessAcceptConfirmMessage, makerWitnessAcceptedMessage } from '../_shared/sms-templates.ts';

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
      .select('id, user_id, status, witness_name, witness_phone, witness_accepted_at, witness_declined, ends_at, refined_text')
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
      // Allow for draft (witness accepted before maker sealed) + active states
      if (!['draft', 'active', 'awaiting_verdict', 'sealed'].includes(vow.status) || !vow.witness_accepted_at) {
        return new Response(JSON.stringify({ error: 'cannot_save_reminder' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const updates: Record<string, string> = {};
      // Only set witness_phone if not already set (don't overwrite maker-provided phone)
      if (reminderPhone && !vow.witness_phone) updates.witness_phone = reminderPhone;
      if (reminderName && (!vow.witness_name || vow.witness_name === 'Just me' || vow.witness_name === 'Your witness')) updates.witness_name = reminderName;
      if (Object.keys(updates).length > 0) {
        await supabase.from('vows').update(updates).eq('id', vow.id);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check vow is in a state where acceptance makes sense
    // Include 'draft' so witnesses can accept before maker finishes sealing (creates social pressure to complete)
    // Include 'sealed' for race conditions where witness clicks before seal-vow completes
    if (!['draft', 'active', 'awaiting_verdict', 'sealed'].includes(vow.status)) {
      return new Response(JSON.stringify({ error: 'vow_not_active', status: vow.status }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Reject unrecognized actions (only accept/decline/save-reminder are valid)
    if (action && action !== 'accept' && action !== 'decline') {
      return new Response(JSON.stringify({ error: 'invalid_action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle decline
    if (action === 'decline') {
      // Don't allow declining after already accepting
      if (vow.witness_accepted_at) {
        return new Response(JSON.stringify({ error: 'already_accepted' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
        data: { route: `/vow-detail?vowId=${vow.id}`, vow_id: vow.id, event: 'witness_declined' },
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

    // Try to link witness account
    // Priority 1: JWT — if the witness is authenticated, extract user ID directly
    let witnessLinked = false;
    let witnessUserId: string | null = null;
    const authHeader = req.headers.get('authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    if (jwt && jwt !== Deno.env.get('SUPABASE_ANON_KEY')) {
      try {
        const { data: { user } } = await supabase.auth.getUser(jwt);
        if (user) {
          await supabase.from('vows')
            .update({ witness_user_id: user.id })
            .eq('id', vow.id);
          witnessLinked = true;
          witnessUserId = user.id;
          console.log(`[accept-witness] Linked witness via JWT: ${user.id}`);
        }
      } catch (e) {
        console.log('[accept-witness] JWT user lookup failed:', e);
      }
    }
    // Priority 2: Phone matching (fallback for anonymous witnesses)
    if (!witnessLinked && vow.witness_phone) {
      const { data: witnessUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', vow.witness_phone)
        .maybeSingle();
      if (witnessUser) {
        await supabase.from('vows')
          .update({ witness_user_id: witnessUser.id })
          .eq('id', vow.id);
        witnessLinked = true;
        witnessUserId = witnessUser.id;
        console.log(`[accept-witness] Linked witness via phone: ${witnessUser.id}`);
      }
    }

    if (!witnessLinked) {
      console.log('[accept-witness] Could not link witness account — no valid JWT or phone match');
    }

    // Update witness_name from authenticated user's profile if still placeholder
    if (witnessLinked && witnessUserId) {
      const { data: profile } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', witnessUserId)
        .single();
      if (profile?.display_name && (!vow.witness_name || vow.witness_name === 'Your witness')) {
        await supabase.from('vows')
          .update({ witness_name: profile.display_name })
          .eq('id', vow.id);
        console.log(`[accept-witness] Updated witness_name to: ${profile.display_name}`);
      }
    }

    await createAuditEvent(supabase, vow.id, 'witness_accepted', 'witness', null, { witness_name: vow.witness_name });

    // Push notification to vow owner
    await supabase.from('push_queue').insert({
      user_id: vow.user_id,
      title: `${vow.witness_name} accepted!`,
      body: 'Your witness is locked in. They\'ll deliver the verdict when the time comes.',
      data: { route: `/vow-detail?vowId=${vow.id}`, vow_id: vow.id, event: 'witness_accepted' },
      send_after: now,
    });

    // SMS to witness: confirmation that they're locked in
    if (vow.witness_phone) {
      try {
        const { data: makerProfile } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', vow.user_id)
          .single();
        const makerName = makerProfile?.display_name || 'your friend';
        const confirmBody = witnessAcceptConfirmMessage(makerName);
        const sid = await sendSMS(vow.witness_phone, confirmBody);
        await supabase.from('sms_log').insert({
          vow_id: vow.id,
          message_type: 'witness_accept_confirm',
          twilio_sid: sid,
        });
      } catch (smsErr) {
        console.error('[accept-witness] witness confirm SMS failed:', smsErr);
      }
    }

    // SMS to maker: their witness accepted
    try {
      const { data: makerUser } = await supabase
        .from('users')
        .select('phone')
        .eq('id', vow.user_id)
        .single();
      if (makerUser?.phone) {
        const witnessName = vow.witness_name || 'Your witness';
        const makerBody = makerWitnessAcceptedMessage(witnessName);
        const sid = await sendSMS(makerUser.phone, makerBody);
        await supabase.from('sms_log').insert({
          vow_id: vow.id,
          message_type: 'maker_witness_accepted',
          twilio_sid: sid,
        });
      }
    } catch (smsErr) {
      console.error('[accept-witness] maker notify SMS failed:', smsErr);
    }

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
