import { Platform } from 'react-native';

import { supabase } from './supabase';

interface CreatePaymentResult {
  clientSecret: string;
  paymentIntentId: string;
}

export async function createPaymentIntent(vowId: string, amountCents: number): Promise<CreatePaymentResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await supabase.functions.invoke('create-payment-intent', {
    body: { vow_id: vowId, amount: amountCents },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data as CreatePaymentResult;
}

export async function setupPaymentSheet(clientSecret: string): Promise<void> {
  if (Platform.OS === 'web') throw new Error('Stripe is not supported on web');
  const { initPaymentSheet } = await import('@stripe/stripe-react-native');
  const { error } = await initPaymentSheet({
    paymentIntentClientSecret: clientSecret,
    merchantDisplayName: 'Unbreakable Vow',
    style: 'alwaysDark',
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
