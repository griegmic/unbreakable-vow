const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;

function supaRest(path: string, opts: { method?: string; body?: unknown; token?: string } = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: opts.method || 'GET',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': opts.method === 'PATCH' ? 'return=minimal' : 'return=representation',
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
}

async function verifyUser(jwt: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'apikey': SERVICE_ROLE_KEY,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function stripePost(endpoint: string, params: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Stripe error: ${res.status}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: corsHeaders,
      });
    }

    const jwt = authHeader.replace('Bearer ', '');
    console.log('[create-payment-intent] verifying user');
    const user = await verifyUser(jwt);
    if (!user || !user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: corsHeaders,
      });
    }
    console.log('[create-payment-intent] user:', user.id);

    const { vow_id } = await req.json();
    console.log('[create-payment-intent] vow_id:', vow_id);

    if (!vow_id) {
      return new Response(JSON.stringify({ error: 'vow_id required' }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Fetch authoritative stake amount from DB — never trust client
    const vowRes = await supaRest(
      `vows?id=eq.${vow_id}&user_id=eq.${user.id}&select=stake_amount&limit=1`
    );
    const vowRows = await vowRes.json();
    const vowRow = vowRows?.[0];
    if (!vowRow) {
      return new Response(JSON.stringify({ error: 'Vow not found or unauthorized' }), {
        status: 404, headers: corsHeaders,
      });
    }

    const amount = vowRow.stake_amount;
    if (typeof amount !== 'number' || amount < 1000 || amount > 10000) {
      return new Response(JSON.stringify({ error: `Invalid stake amount: ${amount}` }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Get stripe_customer_id from users table
    console.log('[create-payment-intent] looking up stripe customer');
    const profileRes = await supaRest(
      `users?id=eq.${user.id}&select=stripe_customer_id&limit=1`
    );
    const profiles = await profileRes.json();
    let customerId = profiles?.[0]?.stripe_customer_id;

    if (!customerId) {
      console.log('[create-payment-intent] creating stripe customer');
      const customer = await stripePost('customers', {
        email: user.email || '',
        'metadata[supabase_user_id]': user.id,
      });
      customerId = customer.id;
      console.log('[create-payment-intent] customer created:', customerId);

      // Upsert user row with stripe_customer_id
      await supaRest(
        `users?id=eq.${user.id}`,
        { method: 'PATCH', body: { stripe_customer_id: customerId } }
      );
    }

    // Create PaymentIntent
    console.log('[create-payment-intent] creating payment intent');
    const paymentIntent = await stripePost('payment_intents', {
      amount: String(amount),
      currency: 'usd',
      customer: customerId,
      capture_method: 'manual',
      'metadata[vow_id]': vow_id,
      'metadata[user_id]': user.id,
    });
    console.log('[create-payment-intent] PI created:', paymentIntent.id);

    // Save PI ID to vow
    const patchRes = await supaRest(
      `vows?id=eq.${vow_id}&user_id=eq.${user.id}`,
      { method: 'PATCH', body: { stripe_payment_intent_id: paymentIntent.id } }
    );
    if (!patchRes.ok) {
      console.error('[create-payment-intent] Failed to save PI to vow:', await patchRes.text());
      return new Response(JSON.stringify({ error: 'Failed to link payment to vow' }), {
        status: 500, headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }), {
      headers: corsHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[create-payment-intent] error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: corsHeaders,
    });
  }
});
