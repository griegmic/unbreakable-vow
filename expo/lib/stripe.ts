import { Platform } from 'react-native';

import { supabase } from './supabase';

interface CreatePaymentResult {
  clientSecret: string;
  paymentIntentId: string;
}

interface SaveCardResult {
  clientSecret: string;
  setupIntentId: string;
}

// ── Legacy: PaymentIntent flow (existing vows) ──

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

// ── New: SetupIntent flow (card-on-file, charge only on break) ──

export async function saveCard(vowId: string): Promise<SaveCardResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  console.log('[Stripe] calling save-card edge function', { vowId });
  const res = await supabase.functions.invoke('save-card', {
    body: { vow_id: vowId },
  });

  if (res.error) {
    let detail = res.error.message;
    try {
      if (typeof (res.error as any).context?.json === 'function') {
        const body = await (res.error as any).context.json();
        console.error('[Stripe] save-card error body:', JSON.stringify(body));
        detail = body?.error || body?.message || detail;
      } else if (typeof (res.error as any).context?.text === 'function') {
        const text = await (res.error as any).context.text();
        console.error('[Stripe] save-card error text:', text);
        detail = text || detail;
      }
    } catch (parseErr) {
      console.error('[Stripe] could not parse error body:', parseErr);
    }
    console.error('[Stripe] save-card failed:', detail);
    throw new Error(`save-card failed: ${detail}`);
  }
  console.log('[Stripe] save-card success, got clientSecret');
  return res.data as SaveCardResult;
}

// ── Payment sheet: SetupIntent mode (save card, no charge) ──

export async function setupPaymentSheetForSetup(clientSecret: string): Promise<void> {
  if (Platform.OS === 'web') throw new Error('Stripe is not supported on web');
  const { initPaymentSheet } = await import('@stripe/stripe-react-native');
  const { error } = await initPaymentSheet({
    setupIntentClientSecret: clientSecret, // SetupIntent, not PaymentIntent
    merchantDisplayName: 'Unbreakable Vow',
    style: 'alwaysDark',
    primaryButtonLabel: 'Save card',
    googlePay: { merchantCountryCode: 'US', testEnv: false },
    defaultBillingDetails: { address: { country: 'US' } },
  });

  if (error) throw new Error(error.message);
}

// ── Legacy: Payment sheet for PaymentIntent ──

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
