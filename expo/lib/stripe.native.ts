import { supabase } from './supabase';
import { Platform } from 'react-native';

interface CreatePaymentResult {
  clientSecret: string;
  paymentIntentId: string;
}

interface SaveCardResult {
  clientSecret: string;
  setupIntentId: string;
}

type FunctionErrorContext = {
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
};

function getFunctionErrorContext(error: unknown): FunctionErrorContext | undefined {
  if (!error || typeof error !== 'object' || !('context' in error)) return undefined;
  const context = (error as { context?: unknown }).context;
  return context && typeof context === 'object' ? context as FunctionErrorContext : undefined;
}

function readErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const record = body as { error?: unknown; message?: unknown };
  if (typeof record.error === 'string' && record.error.trim()) return record.error;
  if (typeof record.message === 'string' && record.message.trim()) return record.message;
  return undefined;
}

async function readFunctionErrorDetail(error: unknown, fallback: string, label: string): Promise<string> {
  const context = getFunctionErrorContext(error);
  if (!context) return fallback;

  try {
    if (typeof context.json === 'function') {
      const body = await context.json();
      console.error(`[Stripe] ${label} error body:`, JSON.stringify(body));
      return readErrorMessage(body) || fallback;
    }
    if (typeof context.text === 'function') {
      const text = await context.text();
      console.error(`[Stripe] ${label} error text:`, text);
      return text || fallback;
    }
  } catch (parseErr) {
    console.error('[Stripe] could not parse error body:', parseErr);
  }

  return fallback;
}

export async function isNativeWalletSupported(): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  const nativeWalletsEnabled = process.env.EXPO_PUBLIC_ENABLE_NATIVE_WALLET_PAY === '1'
    || process.env.EXPO_PUBLIC_ENABLE_NATIVE_WALLET_PAY === 'true';
  if (!nativeWalletsEnabled) return false;

  try {
    const { isPlatformPaySupported } = await import('@stripe/stripe-react-native');
    if (Platform.OS === 'android') {
      return await isPlatformPaySupported({ googlePay: { testEnv: false } });
    }
    return await isPlatformPaySupported();
  } catch (err) {
    console.warn('[Stripe] platform wallet support check failed:', err);
    return false;
  }
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
    const detail = await readFunctionErrorDetail(res.error, res.error.message, 'create-payment-intent');
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
    const detail = await readFunctionErrorDetail(res.error, res.error.message, 'save-card');
    console.error('[Stripe] save-card failed:', detail);
    throw new Error(`save-card failed: ${detail}`);
  }
  console.log('[Stripe] save-card success, got clientSecret');
  return res.data as SaveCardResult;
}

// ── Payment sheet: SetupIntent mode (save card, no charge) ──

export async function setupPaymentSheetForSetup(clientSecret: string, stakeAmountCents?: number): Promise<void> {
  const { initPaymentSheet } = await import('@stripe/stripe-react-native');
  const displayAmount = stakeAmountCents && stakeAmountCents > 0
    ? (stakeAmountCents / 100).toFixed(2)
    : undefined;
  const walletSupported = await isNativeWalletSupported();
  const { error } = await initPaymentSheet({
    setupIntentClientSecret: clientSecret, // SetupIntent, not PaymentIntent
    merchantDisplayName: 'Unbreakable Vow',
    style: 'alwaysDark',
    primaryButtonLabel: 'Save stake',
    applePay: Platform.OS === 'ios' && walletSupported
      ? {
          merchantCountryCode: 'US',
          cartItems: displayAmount
            ? [{ paymentType: 'Immediate', isPending: true, label: 'If broken', amount: displayAmount }]
            : undefined,
        }
      : undefined,
    googlePay: Platform.OS === 'android' && walletSupported
      ? {
          merchantCountryCode: 'US',
          currencyCode: 'USD',
          amount: displayAmount,
          label: 'If broken',
          testEnv: false,
        }
      : undefined,
    defaultBillingDetails: { address: { country: 'US' } },
  });

  if (error) throw new Error(error.message);
}

// ── Legacy: Payment sheet for PaymentIntent ──

export async function setupPaymentSheet(clientSecret: string): Promise<void> {
  const { initPaymentSheet } = await import('@stripe/stripe-react-native');
  const walletSupported = await isNativeWalletSupported();
  const { error } = await initPaymentSheet({
    paymentIntentClientSecret: clientSecret,
    merchantDisplayName: 'Unbreakable Vow',
    style: 'alwaysDark',
    applePay: Platform.OS === 'ios' && walletSupported
      ? { merchantCountryCode: 'US' }
      : undefined,
    googlePay: Platform.OS === 'android' && walletSupported
      ? { merchantCountryCode: 'US', testEnv: false }
      : undefined,
    defaultBillingDetails: { address: { country: 'US' } },
  });

  if (error) throw new Error(error.message);
}

export async function showPaymentSheet(): Promise<boolean> {
  const { presentPaymentSheet } = await import('@stripe/stripe-react-native');
  const { error } = await presentPaymentSheet();

  if (error) {
    if (error.code === 'Canceled') return false;
    throw new Error(error.message);
  }

  return true;
}
