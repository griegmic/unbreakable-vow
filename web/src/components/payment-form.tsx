'use client';
import { useState, useEffect } from 'react';
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import type { StripeExpressCheckoutElementConfirmEvent } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ onSuccess, onCancel, onSkip }: { onSuccess: () => void; onCancel: () => void; onSkip?: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState('');
  const [expressReady, setExpressReady] = useState(false);
  const [applePayDebug, setApplePayDebug] = useState<string | null>(null);

  // Diagnostic: check Apple Pay availability via Payment Request API
  useEffect(() => {
    if (!stripe) return;
    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: { label: 'Test', amount: 1000 },
    });
    pr.canMakePayment().then((result) => {
      const info = result
        ? `Available: applePay=${result.applePay}, googlePay=${result.googlePay}`
        : 'NOT available (canMakePayment returned null)';
      console.log('[Apple Pay diagnostic]', info);
      setApplePayDebug(info);
    }).catch((err) => {
      console.error('[Apple Pay diagnostic] error:', err);
      setApplePayDebug(`Error: ${err.message}`);
    });
  }, [stripe]);

  const handleExpressConfirm = async (event: StripeExpressCheckoutElementConfirmEvent) => {
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + '/sent' },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed.');
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + '/sent' },
      redirect: 'if_required',
    });

    if (result.error) {
      if (result.error.type === 'card_error' || result.error.type === 'validation_error') {
        setError(result.error.message || 'Payment failed.');
      } else {
        setError('An unexpected error occurred.');
      }
      setLoading(false);
    } else if (result.paymentIntent && (result.paymentIntent.status === 'succeeded' || result.paymentIntent.status === 'requires_capture')) {
      onSuccess();
    } else {
      setError('Payment could not be completed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Express Checkout: Apple Pay / Google Pay buttons (renders nothing if unavailable) */}
      <ExpressCheckoutElement
        onConfirm={handleExpressConfirm}
        onReady={({ availablePaymentMethods }) => {
          console.log('[Stripe] Express checkout available methods:', availablePaymentMethods);
          if (availablePaymentMethods) setExpressReady(true);
        }}
        options={{
          buttonType: { applePay: 'plain', googlePay: 'plain' },
          buttonTheme: { applePay: 'white-outline', googlePay: 'white' },
          layout: { maxColumns: 1, maxRows: 2 },
        }}
      />
      {expressReady && (
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>or pay with card</span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        </div>
      )}
      <PaymentElement
        options={{
          layout: 'tabs',
          wallets: { applePay: 'never', googlePay: 'never' },
        }}
      />
      {applePayDebug && (
        <p className="text-[11px] px-2 py-1 rounded" style={{ color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
          Apple Pay: {applePayDebug}
        </p>
      )}
      {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full min-h-[52px] rounded-2xl flex items-center justify-center transition-transform active:scale-[0.975]"
        style={{
          background: loading ? '#29303C' : 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
          boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
        }}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-[#0B0D11] border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="text-[15px] font-extrabold" style={{ color: '#0B0D11' }}>Pay & Seal</span>
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
            <div className="w-5 h-5 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-[14px] font-semibold" style={{ color: 'var(--gold)' }}>Skip payment</span>
          )}
        </button>
      )}
      <button
        type="button"
        onClick={onCancel}
        className="min-h-[40px] flex items-center justify-center"
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Cancel</span>
      </button>
    </form>
  );
}

export function PaymentModal({ clientSecret, onSuccess, onCancel, onSkip }: { clientSecret: string; onSuccess: () => void; onCancel: () => void; onSkip?: () => void }) {
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
        className="relative w-full max-w-[440px] rounded-t-[28px] p-6 pb-8 safe-bottom animate-slide-up"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-9 h-1 rounded-full" style={{ backgroundColor: 'var(--text-muted)', opacity: 0.4 }} />
        </div>
        <h2 className="text-xl font-bold font-serif mb-4" style={{ color: 'var(--text)' }}>Complete payment</h2>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'night',
              variables: {
                colorPrimary: '#F0C86E',
                colorBackground: '#161B25',
                colorText: '#F6F7FB',
                colorDanger: '#FF7B7B',
                borderRadius: '14px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              },
              rules: {
                '.Input': { border: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#10141C' },
                '.Input:focus': { border: '1px solid rgba(255,214,102,0.18)', boxShadow: '0 0 0 1px rgba(255,214,102,0.18)' },
                '.Tab': { border: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#10141C' },
                '.Tab--selected': { border: '1px solid rgba(255,214,102,0.18)', backgroundColor: '#161B25' },
              },
            },
          }}
        >
          <CheckoutForm onSuccess={onSuccess} onCancel={onCancel} onSkip={onSkip} />
        </Elements>
      </div>
    </div>
  );
}
