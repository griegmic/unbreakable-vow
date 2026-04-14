import { Platform } from 'react-native';

import { supabase } from './supabase';

interface CreatePaymentResult {
  clientSecret: string;
  paymentIntentId: string;
}

export async function createPaymentIntent(vowId: string, amountCents: number): Promise<CreatePaymentResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  console.log('[Stripe] calling create-payment-intent edge function', { vowId, amountCents });
  const res = await supabase.functions.invoke('create-payment-intent', {
    body: { vow_id: vowId, amount: amountCents },
  });

  if (res.error) {
    let detail = res.error.message;
    try {
      if (typeof (res.error as any).context?.json === 'function') {
        const body = await (res.error as any).context.json();
        console.error('[Stripe] create-payment-intent error body:', JSON.stringify(body));
        detail = body?.error || body?.message || detail;
      } else if (typeof (res.error as any).context?.text === 'function') {
        const text = await (res.error as any).context.text();
        console.error('[Stripe] create-payment-intent error text:', text);
        detail = text || detail;
      }
    } catch (parseErr) {
      console.error('[Stripe] could not parse error body:', parseErr);
    }
    console.error('[Stripe] create-payment-intent failed:', detail);
    throw new Error(`create-payment-intent failed: ${detail}`);
  }
  console.log('[Stripe] create-payment-intent success, got clientSecret');
  return res.data as CreatePaymentResult;
}

export async function setupPaymentSheet(clientSecret: string): Promise<void> {
  if (Platform.OS === 'web') throw new Error('Stripe is not supported on web');
  const { initPaymentSheet } = await import('@stripe/stripe-react-native');
  const { error } = await initPaymentSheet({
    paymentIntentClientSecret: clientSecret,
    merchantDisplayName: 'Unbreakable Vow',
    style: 'alwaysDark',
    applePay: { merchantCountryCode: 'US' },
    googlePay: { merchantCountryCode: 'US', testEnv: false },
    defaultBillingDetails: { address: { country: 'US' } },
  });

  if (error) throw new Error(error.message);
}

export async function showPaymentSheet(): Promise<boolean> {
  if (Platform.OS === 'web') throw new Error('Stripe is not supported on web');
  const { presentPaymentSheet } = await import('@stripe/stripe-react-native');
  const { error } = await presentPaymentSheet();

  if (error) {
    if (error.code === 'Canceled') return false;
    throw new Error(error.message);
  }

  return true;
}
