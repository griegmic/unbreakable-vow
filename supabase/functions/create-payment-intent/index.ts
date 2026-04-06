import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;

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

    const { vow_id, amount } = await req.json();

    if (!vow_id || !amount || typeof amount !== 'number' || amount < 1000 || amount > 10000) {
      return new Response(JSON.stringify({ error: 'Invalid request: vow_id and amount (1000-10000 cents) required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripePost('customers', {
        email: user.email || '',
        'metadata[supabase_user_id]': user.id,
      });
      customerId = customer.id;
      // Try to update, but don't fail if user row doesn't exist
      await supabase
        .from('users')
        .upsert({ id: user.id, stripe_customer_id: customerId }, { onConflict: 'id' });
    }

    // Create PaymentIntent
    const paymentIntent = await stripePost('payment_intents', {
      amount: String(amount),
      currency: 'usd',
      customer: customerId,
      capture_method: 'manual',
      'metadata[vow_id]': vow_id,
      'metadata[user_id]': user.id,
    });

    // Save PI ID to vow
    await supabase
      .from('vows')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', vow_id)
      .eq('user_id', user.id);

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-payment-intent error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
