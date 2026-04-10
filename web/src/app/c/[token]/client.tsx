'use client';
import { useState, useCallback } from 'react';
import { Calendar, Shield, Sparkles, Check } from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { RitualScreen, TitleBlock, PrimaryButton, FadeUp, HeaderBadge, ChoiceChip, RitualCard } from '@/components/ui';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Vow {
  id: string;
  refined_text: string;
  stake_amount: number;
  suggested_stake_amount: number;
  destination: string;
  witness_name: string;
  ends_at: string | null;
  sealed_at: string | null;
  status: string;
  challenge_status: string;
}

type Step = 'dare' | 'back-down-confirm' | 'backed-down' | 'stakes' | 'charity' | 'payment' | 'sealed';

const STAKE_OPTIONS = [1000, 2500, 5000, 10000]; // cents
const CHARITIES = [
  "St. Jude's",
  'Feeding America',
  'ALS Association',
  'Local food bank',
];

const stripeAppearance = {
  theme: 'night' as const,
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
};

// ─── STRIPE CARD FORM (inside Elements) ───
function CardForm({
  onPaymentMethod,
  loading,
}: {
  onPaymentMethod: (pmId: string) => void;
  loading: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setCardError('');

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      elements,
    });

    if (error) {
      setCardError(error.message || 'Card error. Please try again.');
      return;
    }

    if (paymentMethod) {
      onPaymentMethod(paymentMethod.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {cardError && (
        <p className="text-[13px]" style={{ color: 'var(--danger)' }}>
          {cardError}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975] disabled:active:scale-100"
        style={{
          boxShadow: loading ? 'none' : '0 12px 24px rgba(212,162,79,0.28)',
        }}
      >
        <div
          className="min-h-[56px] flex items-center justify-center px-5"
          style={{
            background: loading
              ? '#29303C'
              : 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
          }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-[#0B0D11] border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-[15px] font-extrabold tracking-[0.2px]" style={{ color: '#0B0D11' }}>
              Seal the vow
            </span>
          )}
        </div>
      </button>
    </form>
  );
}

export default function ChallengeInviteClient({
  vow,
  token,
  makerName,
  makerPhone,
}: {
  vow: Vow;
  token: string;
  makerName: string;
  makerPhone: string | null;
}) {
  // Determine initial state from existing challenge_status
  const initialStep: Step =
    vow.challenge_status === 'accepted' ? 'sealed' :
    vow.challenge_status === 'declined' ? 'backed-down' :
    'dare';

  const [step, setStep] = useState<Step>(initialStep);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collected data
  const suggestedCents = vow.suggested_stake_amount || 0;
  const [stakeAmount, setStakeAmount] = useState<number>(
    suggestedCents > 0 && STAKE_OPTIONS.includes(suggestedCents) ? suggestedCents : 0
  );
  const [charity, setCharity] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');

  // For sealed state display
  const [sealedVow, setSealedVow] = useState<{
    stake: number;
    charity: string;
    email: string;
  } | null>(
    vow.challenge_status === 'accepted'
      ? { stake: vow.stake_amount, charity: vow.destination, email: '' }
      : null
  );

  const makerLabel = makerName === 'Your friend' ? 'your friend' : makerName;

  const endDate = vow.ends_at
    ? new Date(vow.ends_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;

  // ─── DECLINE HANDLER ───
  const handleDecline = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('accept-challenge', {
        body: { token, action: 'decline', display_name: displayName || undefined },
      });
      if (fnError || data?.error) {
        setError(data?.error === 'already_responded' ? 'This dare has already been responded to.' : 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }
      setStep('backed-down');
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setBusy(false);
    }
  }, [busy, token]);

  // ─── ACCEPT / SEAL HANDLER ───
  const handleSeal = useCallback(async (paymentMethodId?: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        token,
        action: 'accept',
        stake_amount: stakeAmount,
        destination: charity || '',
        email,
        display_name: displayName || undefined,
      };
      if (paymentMethodId) {
        body.payment_method_id = paymentMethodId;
      }

      const { data, error: fnError } = await supabase.functions.invoke('accept-challenge', {
        body,
      });
      if (fnError || data?.error) {
        const msg = data?.error;
        if (msg === 'already_responded' || msg === 'vow_not_active') {
          setError('This dare is no longer available.');
        } else if (msg?.includes('payment') || msg?.includes('card')) {
          setError('Payment failed. Please check your card and try again.');
        } else {
          setError(msg || 'Something went wrong. Please try again.');
        }
        setBusy(false);
        return;
      }
      setSealedVow({ stake: stakeAmount, charity, email });
      setStep('sealed');
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setBusy(false);
    }
  }, [busy, token, stakeAmount, charity, email]);

  // ─── STEP 1: THE DARE ───
  if (step === 'dare') {
    return (
      <RitualScreen>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[70dvh] gap-6 text-center px-2">
          <FadeUp>
            <h1
              className="text-[36px] leading-[42px] font-bold font-serif tracking-[2px] uppercase"
              style={{ color: 'var(--gold)' }}
            >
              AN UNBREAKABLE VOW
            </h1>
          </FadeUp>

          <FadeUp delay={0.1}>
            <p className="text-[17px] leading-[25px]" style={{ color: 'var(--text-secondary)' }}>
              {makerName} doesn&apos;t think you can
            </p>
          </FadeUp>

          <FadeUp delay={0.18}>
            <div
              className="rounded-[16px] px-6 py-5 max-w-[360px]"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-[20px] leading-[28px] font-serif font-medium" style={{ color: 'var(--text)' }}>
                &ldquo;{vow.refined_text}&rdquo;
              </p>
            </div>
          </FadeUp>

          <FadeUp delay={0.25}>
            <div className="flex flex-col items-center gap-1.5">
              {endDate && (
                <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                  ends {endDate}
                </p>
              )}
              {suggestedCents > 0 && (
                <p className="text-[14px] font-semibold" style={{ color: 'var(--gold)' }}>
                  ${suggestedCents / 100} on the line
                </p>
              )}
            </div>
          </FadeUp>

          <FadeUp delay={0.35}>
            <div className="flex flex-col items-center gap-3 w-full max-w-[320px]">
              <PrimaryButton
                label="Accept the vow"
                onPress={() => setStep('stakes')}
              />
              <button
                type="button"
                onClick={() => setStep('back-down-confirm')}
                className="py-2 transition-opacity hover:opacity-70"
              >
                <span className="text-[13px]" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                  back down
                </span>
              </button>
            </div>
          </FadeUp>
        </div>

        {error && (
          <FadeUp>
            <div
              className="rounded-[12px] px-4 py-3 text-[14px] mx-4"
              style={{ backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
            >
              {error}
            </div>
          </FadeUp>
        )}
      </RitualScreen>
    );
  }

  // ─── BACK DOWN CONFIRM MODAL ───
  if (step === 'back-down-confirm') {
    return (
      <RitualScreen>
        <div className="flex-1 flex items-center justify-center min-h-[70dvh]">
          <FadeUp>
            <div
              className="rounded-[22px] p-7 flex flex-col items-center gap-5 text-center max-w-[360px] mx-auto"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: '0 16px 28px rgba(0,0,0,0.26)',
              }}
            >
              <h2 className="text-[24px] font-bold font-serif" style={{ color: 'var(--text)' }}>
                Are you sure?
              </h2>
              <p className="text-[15px] leading-[22px]" style={{ color: 'var(--text-secondary)' }}>
                {makerName} will know you backed down.
              </p>
              <div className="flex flex-col items-center gap-3 w-full">
                <PrimaryButton
                  label="Go back"
                  onPress={() => { setError(null); setStep('dare'); }}
                />
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={busy}
                  className="py-2 transition-opacity hover:opacity-70"
                >
                  {busy ? (
                    <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }} />
                  ) : (
                    <span className="text-[13px]" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                      I&apos;m backing down
                    </span>
                  )}
                </button>
              </div>
              {error && (
                <p className="text-[13px]" style={{ color: 'var(--danger)' }}>{error}</p>
              )}
            </div>
          </FadeUp>
        </div>
      </RitualScreen>
    );
  }

  // ─── BACKED DOWN CONFIRMED ───
  if (step === 'backed-down') {
    return (
      <RitualScreen>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[70dvh] gap-5 text-center px-4">
          <FadeUp>
            <h2 className="text-[28px] font-bold font-serif" style={{ color: 'var(--text)' }}>
              You backed down.
            </h2>
          </FadeUp>
          <FadeUp delay={0.1}>
            <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>
              {makerName} has been notified.
            </p>
          </FadeUp>
          <FadeUp delay={0.2}>
            <a
              href="/"
              className="text-[14px] font-semibold transition-opacity hover:opacity-80"
              style={{ color: 'var(--gold)' }}
            >
              Make your own vow &rarr;
            </a>
          </FadeUp>
        </div>
      </RitualScreen>
    );
  }

  // ─── STEP 3: STAKES ───
  if (step === 'stakes') {
    return (
      <RitualScreen>
        <FadeUp><HeaderBadge /></FadeUp>

        <FadeUp delay={0.05}>
          <TitleBlock
            title="You accepted. Now make it real."
            subtitle="If you fail, your money goes to charity."
          />
        </FadeUp>

        <FadeUp delay={0.12}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap">
              {STAKE_OPTIONS.map((cents) => (
                <ChoiceChip
                  key={cents}
                  label={`$${cents / 100}`}
                  active={stakeAmount === cents}
                  onPress={() => setStakeAmount(cents)}
                />
              ))}
            </div>
            {suggestedCents > 0 && (
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                {makerName} suggested ${suggestedCents / 100}
              </p>
            )}
          </div>
        </FadeUp>

        <FadeUp delay={0.2}>
          <div className="flex flex-col gap-3">
            <PrimaryButton
              label={stakeAmount > 0 ? `Stake $${stakeAmount / 100}` : 'Continue'}
              onPress={() => {
                if (stakeAmount > 0) {
                  setStep('charity');
                } else {
                  setStep('payment');
                }
              }}
              disabled={false}
            />
            <button
              type="button"
              onClick={() => {
                setStakeAmount(0);
                setStep('payment');
              }}
              className="py-2 transition-opacity hover:opacity-70"
            >
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                or just my word
              </span>
            </button>
          </div>
        </FadeUp>
      </RitualScreen>
    );
  }

  // ─── STEP 4: CHARITY ───
  if (step === 'charity') {
    return (
      <RitualScreen>
        <FadeUp><HeaderBadge /></FadeUp>

        <FadeUp delay={0.05}>
          <TitleBlock
            title="Where should the money go if you fail?"
            subtitle={`$${stakeAmount / 100} to charity if you don't follow through.`}
          />
        </FadeUp>

        <FadeUp delay={0.12}>
          <div className="flex flex-col gap-2.5">
            {CHARITIES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setCharity(name);
                  setStep('payment');
                }}
                className="w-full rounded-[16px] px-5 py-4 text-left transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: charity === name ? 'rgba(212,162,79,0.12)' : 'var(--surface)',
                  border: `1px solid ${charity === name ? 'var(--border-strong)' : 'var(--border)'}`,
                }}
              >
                <span
                  className="text-[15px] font-medium"
                  style={{ color: charity === name ? 'var(--gold-bright)' : 'var(--text)' }}
                >
                  {name}
                </span>
              </button>
            ))}
          </div>
        </FadeUp>

        <FadeUp delay={0.25}>
          <p className="text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
            You won&apos;t be charged unless you fail.
          </p>
        </FadeUp>
      </RitualScreen>
    );
  }

  // ─── STEP 5: PAYMENT + ACCOUNT ───
  if (step === 'payment') {
    const isStaked = stakeAmount > 0;

    return (
      <RitualScreen>
        <FadeUp><HeaderBadge /></FadeUp>

        <FadeUp delay={0.05}>
          <TitleBlock
            title="Almost there."
            subtitle={
              isStaked
                ? `$${stakeAmount / 100} held until your vow is resolved.`
                : 'Enter your email to seal the vow.'
            }
          />
        </FadeUp>

        <FadeUp delay={0.12}>
          <div className="flex flex-col gap-4">
            {/* Name input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold tracking-[1.2px] uppercase" style={{ color: 'var(--text-muted)' }}>
                Your name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="First name"
                className="w-full rounded-[14px] px-4 py-3.5 text-[15px] outline-none transition-all"
                style={{
                  backgroundColor: '#10141C',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(255,214,102,0.18)';
                  e.target.style.boxShadow = '0 0 0 1px rgba(255,214,102,0.18)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Email input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold tracking-[1.2px] uppercase" style={{ color: 'var(--text-muted)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-[14px] px-4 py-3.5 text-[15px] outline-none transition-all"
                style={{
                  backgroundColor: '#10141C',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(255,214,102,0.18)';
                  e.target.style.boxShadow = '0 0 0 1px rgba(255,214,102,0.18)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Stripe card if staked */}
            {isStaked ? (
              <Elements
                stripe={stripePromise}
                options={{
                  mode: 'setup',
                  currency: 'usd',
                  appearance: stripeAppearance,
                }}
              >
                <CardForm
                  onPaymentMethod={(pmId) => handleSeal(pmId)}
                  loading={busy}
                />
              </Elements>
            ) : (
              <PrimaryButton
                label="Seal the vow"
                onPress={() => handleSeal()}
                loading={busy}
                disabled={!email.includes('@')}
              />
            )}

            {error && (
              <p className="text-[13px]" style={{ color: 'var(--danger)' }}>{error}</p>
            )}

            <p className="text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
              By continuing you agree to the{' '}
              <a href="/terms" className="underline" style={{ color: 'var(--text-muted)' }}>terms</a>.
            </p>
          </div>
        </FadeUp>
      </RitualScreen>
    );
  }

  // ─── STEP 6: SEALED ───
  if (step === 'sealed') {
    const displayStake = sealedVow?.stake ?? vow.stake_amount;
    const displayCharity = sealedVow?.charity ?? vow.destination;

    return (
      <RitualScreen>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60dvh] gap-6 text-center px-2">
          <FadeUp>
            <div className="flex justify-center pb-2">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(212,162,79,0.2), rgba(212,162,79,0.08))',
                  border: '2px solid rgba(212,162,79,0.3)',
                  boxShadow: '0 0 40px rgba(212,162,79,0.15)',
                }}
              >
                <Check className="w-8 h-8" style={{ color: 'var(--gold)' }} />
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.08}>
            <h1
              className="text-[32px] leading-[38px] font-bold font-serif tracking-[1.5px] uppercase"
              style={{ color: 'var(--gold)' }}
            >
              THE VOW IS SEALED
            </h1>
          </FadeUp>

          <FadeUp delay={0.15}>
            <RitualCard>
              <div className="flex flex-col gap-3 text-left">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--gold)' }} />
                  <p className="text-[15px] leading-[22px] font-serif" style={{ color: 'var(--text)' }}>
                    &ldquo;{vow.refined_text}&rdquo;
                  </p>
                </div>
                <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
                {displayStake > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Stakes</span>
                    <span className="text-[14px] font-semibold" style={{ color: 'var(--gold)' }}>
                      ${displayStake / 100}
                    </span>
                  </div>
                )}
                {displayCharity && displayStake > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>If you fail</span>
                    <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                      {displayCharity}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
                    <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Witness</span>
                  </div>
                  <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                    {makerName}
                  </span>
                </div>
                {endDate && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
                      <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Ends</span>
                    </div>
                    <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                      {endDate}
                    </span>
                  </div>
                )}
              </div>
            </RitualCard>
          </FadeUp>

          <FadeUp delay={0.25}>
            <p className="text-[14px] leading-[21px]" style={{ color: 'var(--text-secondary)' }}>
              Oathkeeper has entered the chat.<br />
              You&apos;ll hear from Oathkeeper soon.
            </p>
          </FadeUp>

          <FadeUp delay={0.35}>
            <div className="flex flex-col items-center gap-4 w-full max-w-[320px]">
              <a
                href="/dashboard"
                className="w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975] block"
                style={{
                  background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
                  boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
                }}
              >
                <div className="min-h-[56px] flex items-center justify-center px-5">
                  <span className="text-[15px] font-extrabold tracking-[0.2px]" style={{ color: '#0B0D11' }}>
                    Track your vow &rarr;
                  </span>
                </div>
              </a>

              {/* App store badges */}
              <div className="flex flex-col items-center gap-2 pt-2">
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  Get the app for check-ins and updates
                </p>
                <div className="flex gap-3">
                  <a
                    href="https://apps.apple.com/app/unbreakable-vow/id6743597637"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-opacity hover:opacity-80"
                  >
                    <img
                      src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                      alt="Download on the App Store"
                      className="h-[40px]"
                    />
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=app.unbreakablevow"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-opacity hover:opacity-80"
                  >
                    <img
                      src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                      alt="Get it on Google Play"
                      className="h-[40px]"
                    />
                  </a>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </RitualScreen>
    );
  }

  // Fallback (shouldn't reach)
  return null;
}
