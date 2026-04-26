import { createClient } from 'jsr:@supabase/supabase-js@2';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseStripeSignature(header: string | null) {
  const parts = (header || '').split(',').map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3));
  return { timestamp, signatures };
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifySignature(rawBody: string, signatureHeader: string | null) {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  const { timestamp, signatures } = parseStripeSignature(signatureHeader);
  if (!timestamp || signatures.length === 0) {
    throw new Error('Missing Stripe signature');
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = hex(digest);
  if (!signatures.includes(expected)) {
    throw new Error('Invalid Stripe signature');
  }
}

async function updateByPaymentIntent(
  supabase: ReturnType<typeof createClient>,
  paymentIntentId: string | null | undefined,
  patch: Record<string, unknown>,
) {
  if (!paymentIntentId) return;
  await supabase
    .from('settlements')
    .update(patch)
    .eq('stripe_payment_intent_id', paymentIntentId);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  try {
    const rawBody = await req.text();
    await verifySignature(rawBody, req.headers.get('stripe-signature'));
    const event = JSON.parse(rawBody);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error: insertError } = await supabase.from('stripe_events').insert({
      id: event.id,
      type: event.type,
      payload: event,
    });

    if (insertError) {
      if ((insertError as { code?: string }).code === '23505') {
        return json({ received: true, duplicate: true });
      }
      const message = String(insertError.message || '');
      if (message.includes('duplicate key')) {
        return json({ received: true, duplicate: true });
      }
      throw insertError;
    }

    const object = event.data?.object || {};

    switch (event.type) {
      case 'payment_intent.succeeded':
        await updateByPaymentIntent(supabase, object.id, {
          status: 'pending_manual_settlement',
          stripe_charge_id: object.latest_charge || null,
          failure_reason: null,
        });
        break;

      case 'payment_intent.payment_failed':
        await updateByPaymentIntent(supabase, object.id, {
          status: 'payment_due',
          failure_reason: object.last_payment_error?.message || 'Stripe payment failed',
        });
        break;

      case 'charge.dispute.created':
        await updateByPaymentIntent(supabase, object.payment_intent, {
          status: 'disputed',
          stripe_dispute_id: object.id,
          stripe_charge_id: object.charge || null,
          failure_reason: object.reason || 'Stripe dispute created',
        });
        break;

      case 'charge.dispute.closed':
        await updateByPaymentIntent(supabase, object.payment_intent, {
          status: object.status === 'won' ? 'pending_manual_settlement' : 'reversed',
          stripe_dispute_id: object.id,
          stripe_charge_id: object.charge || null,
          failure_reason: object.status === 'won' ? null : `Stripe dispute ${object.status || 'closed'}`,
        });
        break;

      case 'charge.refunded':
        await updateByPaymentIntent(supabase, object.payment_intent, {
          status: 'reversed',
          stripe_charge_id: object.id,
          failure_reason: 'Charge refunded',
        });
        break;

      default:
        break;
    }

    return json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook] error:', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});
