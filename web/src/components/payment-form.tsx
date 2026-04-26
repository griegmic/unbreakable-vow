'use client';
import { useState, useEffect } from 'react';
import { Elements, ExpressCheckoutElement, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ onSuccess, onCancel, onSkip, mode = 'payment' }: { onSuccess: () => void; onCancel: () => void; onSkip?: () => void; amount?: number; mode?: 'payment' | 'setup' }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [walletReady, setWalletReady] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'Payment details could not be submitted.');
      setLoading(false);
      return;
    }

    if (mode === 'setup') {
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: window.location.origin + '/sent' },
        redirect: 'if_required',
      });

      if (result.error) {
        if (result.error.type === 'card_error' || result.error.type === 'validation_error') {
          setError(result.error.message || 'Card setup failed.');
        } else {
          setError('Card could not be saved. Please try again.');
        }
        setLoading(false);
      } else if (result.setupIntent && result.setupIntent.status === 'succeeded') {
        onSuccess();
      } else {
        setError('Card setup could not be completed. Please try again.');
        setLoading(false);
      }
    } else {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.origin + '/sent' },
        redirect: 'if_required',
      });

      if (result.error) {
        if (result.error.type === 'card_error' || result.error.type === 'validation_error') {
          setError(result.error.message || 'Payment failed.');
        } else {
          setError('Payment could not be processed. Please try again.');
        }
        setLoading(false);
      } else if (result.paymentIntent && (result.paymentIntent.status === 'succeeded' || result.paymentIntent.status === 'requires_capture')) {
        onSuccess();
      } else {
        setError('Payment could not be completed. Please try again.');
        setLoading(false);
      }
    }
  };

  const handleExpressConfirm = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');

    if (mode === 'setup') {
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: window.location.origin + '/sent' },
        redirect: 'if_required',
      });

      if (result.error) {
        setError(result.error.message || 'Apple Pay could not save this card. Please try again.');
        setLoading(false);
      } else if (result.setupIntent && result.setupIntent.status === 'succeeded') {
        onSuccess();
      } else {
        setError('Apple Pay could not finish. Please try again.');
        setLoading(false);
      }
    } else {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.origin + '/sent' },
        redirect: 'if_required',
      });

      if (result.error) {
        setError(result.error.message || 'Apple Pay could not process this payment. Please try again.');
        setLoading(false);
      } else if (result.paymentIntent && (result.paymentIntent.status === 'succeeded' || result.paymentIntent.status === 'requires_capture')) {
        onSuccess();
      } else {
        setError('Apple Pay could not finish. Please try again.');
        setLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div style={{ display: walletReady ? 'block' : 'none' }}>
        <ExpressCheckoutElement
          options={{
            wallets: {
              applePay: 'always',
              googlePay: 'auto',
            },
            buttonTheme: { applePay: 'white-outline', googlePay: 'black' },
            buttonHeight: 52,
          }}
          onReady={(event) => {
            const methods = event.availablePaymentMethods;
            setWalletReady(!!methods && Object.values(methods).some(Boolean));
          }}
          onConfirm={handleExpressConfirm}
          onLoadError={() => setWalletReady(false)}
        />
      </div>

      {walletReady && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '1px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--uv-border-soft)' }} />
          <span style={{ fontSize: 11, fontFamily: 'var(--uv-font-sans)', color: 'var(--uv-text-dim)', fontWeight: 650, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            or card
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--uv-border-soft)' }} />
        </div>
      )}

      <PaymentElement
        options={{
          layout: 'tabs',
          wallets: { applePay: 'never', googlePay: 'never' },
          defaultValues: { billingDetails: { address: { country: 'US' } } },
        }}
      />
      {error && <p className="text-sm" style={{ color: 'var(--uv-danger)' }}>{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full min-h-[52px] rounded-2xl flex items-center justify-center transition-transform active:scale-[0.975]"
        style={{
          background: loading ? 'var(--uv-bg-elevated)' : 'linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold))',
          boxShadow: '0 1px 0 rgba(255,220,140,0.25) inset, 0 10px 30px rgba(200,155,60,0.18)',
          border: 'none',
          cursor: loading ? 'default' : 'pointer',
        }}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-[#0B0D11] border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="text-[15px] font-bold" style={{ color: 'var(--uv-text-on-gold)' }}>{mode === 'setup' ? 'Save card instead' : 'Use card instead'}</span>
        )}
      </button>
      {onSkip && (
        <button
          type="button"
          disabled={loading || skipping}
          onClick={async () => {
            setSkipping(true);
            try { await onSkip(); } finally { setSkipping(false); }
          }}
          className="w-full min-h-[48px] rounded-2xl flex items-center justify-center transition-transform active:scale-[0.975] disabled:opacity-40"
          style={{ border: '1px dashed rgba(212,162,79,0.3)', background: 'rgba(212,162,79,0.06)' }}
        >
          {skipping ? (
            <div className="w-5 h-5 border-2 border-[var(--uv-gold)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-[14px] font-semibold" style={{ color: 'var(--uv-gold)' }}>Skip payment</span>
          )}
        </button>
      )}
      <button
        type="button"
        onClick={onCancel}
        className="min-h-[40px] flex items-center justify-center"
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--uv-text-muted)' }}>Cancel</span>
      </button>
    </form>
  );
}

export function PaymentModal({ clientSecret, onSuccess, onCancel, onSkip, amount, mode = 'payment' }: { clientSecret: string; onSuccess: () => void; onCancel: () => void; onSkip?: () => void; amount?: number; mode?: 'payment' | 'setup' }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-[440px] rounded-t-[28px] p-5 pb-8 safe-bottom animate-slide-up overflow-y-auto"
        style={{ backgroundColor: 'var(--uv-bg-elevated)', maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-3">
          <div className="w-9 h-1 rounded-full" style={{ backgroundColor: 'var(--uv-text-muted)', opacity: 0.4 }} />
        </div>
        <h2 className="text-lg font-bold font-serif" style={{ color: 'var(--uv-text)' }}>
          {mode === 'setup' ? 'Save your card' : amount ? `Hold $${amount} on your card` : 'Authorize hold'}
        </h2>
        <p className="text-[13px] mb-3" style={{ color: 'var(--uv-text-muted)' }}>
          {mode === 'setup' ? 'No charge now. Only if you break it.' : `No charge now. Released if you keep your vow.`}
        </p>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'night',
              variables: {
                colorPrimary: '#E8B656',
                colorBackground: '#181512',
                colorText: '#F0E9DB',
                colorDanger: '#F87171',
                colorTextPlaceholder: '#8A8172',
                colorIconTab: '#F0E9DB',
                colorIconTabSelected: '#1A1205',
                borderRadius: '14px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                spacingGridRow: '14px',
              },
              rules: {
                '.Label': { color: '#B8AD9A', fontWeight: '500' },
                '.Input': { border: '1px solid rgba(240,233,219,0.14)', backgroundColor: '#1A1612', color: '#F0E9DB', padding: '12px 14px' },
                '.Input:focus': { border: '1px solid rgba(232,182,86,0.42)', boxShadow: '0 0 0 1px rgba(232,182,86,0.28)' },
                '.Tab': { border: '1px solid rgba(240,233,219,0.14)', backgroundColor: '#1A1612', color: '#F0E9DB' },
                '.Tab--selected': { border: '1px solid rgba(232,182,86,0.54)', backgroundColor: '#E8B656', color: '#1A1205' },
                '.TabLabel': { color: '#F0E9DB' },
                '.TabLabel--selected': { color: '#1A1205' },
                '.Block': { backgroundColor: '#181512', border: '1px solid rgba(240,233,219,0.10)' },
              },
            },
          }}
        >
          <CheckoutForm onSuccess={onSuccess} onCancel={onCancel} onSkip={onSkip} amount={amount} mode={mode} />
        </Elements>
      </div>
    </div>
  );
}
