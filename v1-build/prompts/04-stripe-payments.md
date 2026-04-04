# Prompt 04: Stripe Payment Integration

## Context
Unbreakable Vow app. Users put real money on their vows. When a vow is sealed, we create a Stripe PaymentIntent and charge the user. If the vow is kept → refund. If broken → payment stands (goes to charity).

Auth is working (Prompt 03). Supabase client is configured (Prompt 02).

Currently `app/stake.tsx` (285 lines) lets users pick an amount ($10/$25/$50/$100) and consequence type, then routes to `/auth`. The stake UI is complete — we just need to wire Stripe.

## What to do

### 1. Install dependencies
```bash
cd expo
npx expo install @stripe/stripe-react-native
```

Add to `app.json` plugins:
```json
["@stripe/stripe-react-native", {
  "merchantIdentifier": "merchant.com.yourname.unbreakablevow",
  "enableGooglePay": false
}]
```

### 2. Create `expo/lib/stripe.ts`
Helper for Stripe operations:

```typescript
// initPaymentSheet(clientSecret: string) — configures the Stripe payment sheet
// presentPaymentSheet() — shows the native payment UI
```

### 3. Create Supabase Edge Function: `supabase/functions/create-payment-intent/index.ts`

This function:
1. Receives `{ vow_id, amount }` from the client
2. Validates the user is authenticated (from Authorization header)
3. Creates a Stripe PaymentIntent with `capture_method: 'automatic'` and amount in cents
4. Creates/retrieves Stripe Customer for the user
5. Returns `{ clientSecret, paymentIntentId }` to the client
6. Updates the vow row with `stripe_payment_intent_id`

```typescript
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

Deno.serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization')!;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Verify JWT
  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (error || !user) return new Response('Unauthorized', { status: 401 });

  const { vow_id, amount } = await req.json();

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  // Create PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount, // already in cents
    currency: 'usd',
    customer: customerId,
    capture_method: 'automatic',
    metadata: { vow_id, user_id: user.id },
  });

  // Save PI ID to vow
  await supabase
    .from('vows')
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq('id', vow_id);

  return new Response(JSON.stringify({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
```

### 4. Modify `app/_layout.tsx`
Wrap the entire app in `StripeProvider`:

```typescript
import { StripeProvider } from '@stripe/stripe-react-native';

// Outermost provider
<StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
  {/* ...rest of providers */}
</StripeProvider>
```

### 5. Modify `app/stake.tsx`
The stake screen already has the UI. No visual changes needed. Just:
- When user taps "Lock it in" → save stake to VowFlow state (already does this)
- Route to `/auth` (already does this)
- The actual Stripe charge happens in the seal flow (Prompt 05), not here

No changes to stake.tsx logic needed — it already saves the amount and routes correctly.

## Do NOT modify
- `app/index.tsx`
- `app/refine.tsx`
- `constants/unbreakable.ts`
- `components/vow-ui.tsx`
- `app/witness.tsx` (yet)

## Important notes
- We use `capture_method: 'automatic'` (charge immediately on seal), then refund if kept. This is simpler than `capture_method: 'manual'` which requires capturing within 7 days.
- All amounts are in cents (e.g., $25 = 2500).
- The Edge Function needs `STRIPE_SECRET_KEY` in Supabase secrets.
- Test card: `4242 4242 4242 4242`, any future date, any CVC.
