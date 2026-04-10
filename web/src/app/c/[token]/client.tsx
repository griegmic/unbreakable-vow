'use client';
import { useState, useCallback, useEffect } from 'react';
import { Calendar, Check, MessageCircle, Phone } from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { RitualScreen, TitleBlock, PrimaryButton, FadeUp, HeaderBadge, ChoiceChip } from '@/components/ui';
import { supabase } from '@/lib/supabase';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Vow {
  id: string;
  refined_text: string;
  stake_amount: number;
  suggested_stake_amount: number;
  destination: string;
  witness_name: string;
  starts_at: string | null;
  ends_at: string | null;
  sealed_at: string | null;
  status: string;
  challenge_status: string;
  witness_invite_token: string | null;
}

type Step = 'dare' | 'back-down-confirm' | 'backed-down' | 'stakes' | 'payment' | 'sealed';

const STAKE_OPTIONS = [1000, 2500, 5000, 10000]; // cents
const CHARITIES = [
  'ALS Association',
  "St. Jude's",
  'Feeding America',
  'Local food bank',
];

function getCountdownTint(days: number | null) {
  if (days === null) return { bg: 'rgba(82,214,154,0.06)', border: 'rgba(82,214,154,0.18)' };
  if (days <= 0) return { bg: 'rgba(255,123,123,0.10)', border: 'rgba(255,123,123,0.25)' };
  if (days === 1) return { bg: 'rgba(255,180,80,0.10)', border: 'rgba(255,180,80,0.25)' };
  if (days <= 3) return { bg: 'rgba(212,162,79,0.08)', border: 'rgba(212,162,79,0.20)' };
  return { bg: 'rgba(82,214,154,0.06)', border: 'rgba(82,214,154,0.18)' };
}

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
  // Phase 2: Auto-select first charity
  const [charity, setCharity] = useState(CHARITIES[0]);
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

  // Phone capture state (Phase 3)
  const [reminderPhone, setReminderPhone] = useState('');
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderSaved, setReminderSaved] = useState(false);

  // Test verdict state (Phase 4)
  const [verdictBusy, setVerdictBusy] = useState(false);

  // Detect existing session + listen for auth changes (Google OAuth return)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setEmail(session.user.email || '');
        setDisplayName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '');
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setEmail(session.user.email || '');
        setDisplayName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Restore challenge state from localStorage after OAuth return
  useEffect(() => {
    try {
      const saved = localStorage.getItem('challenge-pending-state');
      if (saved) {
        const { stakeAmount: savedStake, charity: savedCharity } = JSON.parse(saved);
        if (typeof savedStake === 'number') setStakeAmount(savedStake);
        if (savedCharity) setCharity(savedCharity);
        localStorage.removeItem('challenge-pending-state');
        // If we had pending state, jump to payment step
        setStep('payment');
      }
    } catch {}
  }, []);

  const makerFirstName = makerName === 'Your friend' ? 'Your friend' : makerName.split(' ')[0];
  const makerLabel = makerName === 'Your friend' ? 'your friend' : makerFirstName;

  const endDate = vow.ends_at
    ? new Date(vow.ends_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;

  // Direct fetch to edge function — bypasses supabase.functions.invoke() which
  // wraps errors in FunctionsHttpError and makes response parsing unreliable.
  const callEdgeFunction = async (fnName: string, payload: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null; errorCode: string | null }> => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Get current session JWT if available (for auth header)
    let authToken = anonKey;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) authToken = session.access_token;
    } catch {}

    const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    let body: Record<string, unknown> | null = null;
    try {
      body = await res.json();
    } catch {}

    if (!res.ok || body?.error) {
      const errorCode = body?.error ? String(body.error) : `http_${res.status}`;
      console.error(`[${fnName}] Error:`, res.status, body);
      return { data: null, errorCode };
    }

    return { data: body, errorCode: null };
  };

  const callAcceptChallenge = (payload: Record<string, unknown>) =>
    callEdgeFunction('accept-challenge', payload);

  // Map error codes to user-friendly messages
  const mapErrorMessage = (errCode: string): string => {
    if (errCode === 'already_responded') return 'This dare is no longer available.';
    if (errCode === 'vow_not_draft') return 'This dare is no longer available.';
    if (errCode === 'email required' || errCode === 'email_required') return 'Please sign in before sealing the vow.';
    if (errCode === 'invalid_token') return 'This dare link is invalid or expired.';
    if (errCode === 'payment_failed' || errCode.includes('payment') || errCode.includes('card')) return 'Payment failed. Please check your card and try again.';
    if (errCode === 'failed_to_create_account' || errCode === 'failed_to_find_account') return 'Could not create your account. Please try again.';
    if (errCode.startsWith('http_')) return `Server error (${errCode}). Please try again.`;
    return errCode; // Show the actual error — no more "unknown_error"
  };

  // ─── DECLINE HANDLER ───
  const handleDecline = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { errorCode } = await callAcceptChallenge({
        token, action: 'decline', display_name: displayName || undefined,
      });
      if (errorCode) {
        setError(errorCode === 'already_responded' ? 'This dare has already been responded to.' : mapErrorMessage(errorCode));
        setBusy(false);
        return;
      }
      setStep('backed-down');
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setBusy(false);
    }
  }, [busy, token, displayName]);

  // ─── ACCEPT / SEAL HANDLER ───
  const handleSeal = useCallback(async (paymentMethodId?: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        token,
        action: 'accept',
        stake_amount: stakeAmount,
        destination: stakeAmount > 0 ? charity : '',
        email,
        display_name: displayName || undefined,
      };
      if (paymentMethodId) {
        payload.payment_method_id = paymentMethodId;
      }

      const { errorCode } = await callAcceptChallenge(payload);
      if (errorCode) {
        setError(mapErrorMessage(errorCode));
        setBusy(false);
        return;
      }
      setSealedVow({ stake: stakeAmount, charity: stakeAmount > 0 ? charity : '', email });
      setStep('sealed');
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setBusy(false);
    }
  }, [busy, token, stakeAmount, charity, email, displayName]);

  // ─── PHONE CAPTURE HANDLER (Phase 3) ───
  const handleSavePhone = async () => {
    if (!reminderPhone.trim() || reminderSaving) return;
    setReminderSaving(true);
    try {
      // Store the phone on the vow's target_phone field via a lightweight update
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      await fetch(`${supabaseUrl}/functions/v1/accept-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          token,
          action: 'save_phone',
          phone: reminderPhone.trim(),
        }),
      });
      setReminderSaved(true);
    } catch {
      // Silently fail — not critical
    } finally {
      setReminderSaving(false);
    }
  };

  // ─── TEST VERDICT HANDLER (Phase 4) ───
  const handleTestVerdict = async (verdict: 'kept' | 'broken') => {
    if (verdictBusy || !vow.witness_invite_token) return;
    setVerdictBusy(true);
    setError(null);
    try {
      const { errorCode } = await callEdgeFunction('submit-verdict', {
        token: vow.witness_invite_token,
        verdict,
      });
      if (errorCode) {
        setError(`Verdict failed: ${errorCode}`);
        setVerdictBusy(false);
        return;
      }
      // Redirect to outcome page
      window.location.href = verdict === 'kept' ? '/vow-kept' : '/vow-broken';
    } catch {
      setError('Network error. Please check your connection.');
      setVerdictBusy(false);
    }
  };

  // ─── STEP 1: THE DARE ───
  if (step === 'dare') {
    return (
      <RitualScreen>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[70dvh] gap-8 text-center px-2">
          <FadeUp>
            <HeaderBadge />
          </FadeUp>

          <FadeUp delay={0.08}>
            <p className="text-[18px] leading-[26px]" style={{ color: 'var(--text-secondary)' }}>
              {makerFirstName} doesn&apos;t think you can
            </p>
          </FadeUp>

          <FadeUp delay={0.16}>
            <div
              className="flex items-stretch overflow-hidden rounded-[16px] max-w-[360px]"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
            >
              <div className="w-[3px] shrink-0" style={{ backgroundColor: 'var(--gold)' }} />
              <div className="flex-1 py-5 px-5">
                <p className="text-[22px] leading-[30px] font-serif font-medium tracking-[-0.3px]" style={{ color: 'var(--text)' }}>
                  &ldquo;{vow.refined_text}&rdquo;
                </p>
              </div>
            </div>
          </FadeUp>

          {endDate && (
            <FadeUp delay={0.22}>
              <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                by {endDate}
              </p>
            </FadeUp>
          )}

          <FadeUp delay={0.3}>
            <div className="flex flex-col items-center gap-3 w-full max-w-[320px]">
              <PrimaryButton
                label="I solemnly swear"
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

  // ─── STEP 3: STAKES + CHARITY (combined) ───
  if (step === 'stakes') {
    return (
      <RitualScreen>
        <FadeUp>
          <div className="text-center">
            <h2 className="text-[28px] font-bold font-serif" style={{ color: 'var(--text)' }}>
              You&apos;re in.
            </h2>
          </div>
        </FadeUp>

        <FadeUp delay={0.08}>
          <p className="text-[15px] leading-[22px] text-center" style={{ color: 'var(--text-secondary)' }}>
            Prove you mean it &mdash; stake something on yourself.
            If you fail, it goes to charity. Succeed and you get it back.
          </p>
        </FadeUp>

        <FadeUp delay={0.15}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap justify-center">
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
              <p className="text-[13px] text-center" style={{ color: 'var(--text-muted)' }}>
                {makerName}&apos;s suggestion: ${suggestedCents / 100}
              </p>
            )}
          </div>
        </FadeUp>

        {/* Charity selector — only when staked, auto-selected */}
        {stakeAmount > 0 && (
          <FadeUp delay={0.2}>
            <div className="flex flex-col gap-2">
              <p className="text-[12px] font-bold tracking-[1.2px] uppercase" style={{ color: 'var(--text-muted)' }}>
                Where does the money go?
              </p>
              <div className="flex flex-wrap gap-2">
                {CHARITIES.map((name) => (
                  <ChoiceChip
                    key={name}
                    label={name}
                    active={charity === name}
                    onPress={() => setCharity(name)}
                  />
                ))}
              </div>
            </div>
          </FadeUp>
        )}

        <FadeUp delay={0.28}>
          <div className="flex flex-col gap-3">
            <PrimaryButton
              label={stakeAmount > 0 ? `Stake $${stakeAmount / 100}` : 'Continue'}
              onPress={() => setStep('payment')}
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
                skip &mdash; my word is enough
              </span>
            </button>
          </div>
        </FadeUp>
      </RitualScreen>
    );
  }

  // ─── STEP 5: SIGN IN + PAYMENT ───
  if (step === 'payment') {
    const isStaked = stakeAmount > 0;

    const handleGoogleSignIn = async () => {
      const returnPath = `/c/${token}`;
      // Save state in both cookie (Safari) and localStorage
      try { document.cookie = `auth_return_path=${encodeURIComponent(returnPath)}; path=/; max-age=300; SameSite=Lax`; } catch {}
      try { localStorage.setItem('auth-return-path', returnPath); } catch {}
      try { localStorage.setItem('challenge-pending-state', JSON.stringify({ stakeAmount, charity })); } catch {}
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('return_to', returnPath);
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl.toString() },
      });
    };

    const handleTestBypass = async () => {
      setEmail('test@unbreakablevow.app');
      setDisplayName('Test User');
      setBusy(true);
      setError(null);
      try {
        const { errorCode } = await callAcceptChallenge({
          token,
          action: 'accept',
          stake_amount: 0,
          destination: '',
          email: 'test@unbreakablevow.app',
          display_name: 'Test User',
        });
        if (errorCode) {
          setError(`Test failed: ${mapErrorMessage(errorCode)}`);
          setBusy(false);
          return;
        }
        setSealedVow({ stake: 0, charity: '', email: 'test@unbreakablevow.app' });
        setStep('sealed');
        setBusy(false);
      } catch {
        setError('Network error. Please check your connection.');
        setBusy(false);
      }
    };

    return (
      <RitualScreen>
        <FadeUp><HeaderBadge /></FadeUp>

        <FadeUp delay={0.05}>
          <TitleBlock
            title="Almost there."
            subtitle={
              isStaked
                ? `$${stakeAmount / 100} held until your vow is resolved.`
                : 'Sign in to seal the vow.'
            }
          />
        </FadeUp>

        <FadeUp delay={0.12}>
          <div className="flex flex-col gap-4">
            {/* Google Sign In */}
            {!email && (
              <button
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="w-full min-h-[52px] rounded-2xl flex items-center justify-center gap-2.5 transition-opacity active:opacity-80 disabled:opacity-60"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>Continue with Google</span>
              </button>
            )}

            {/* Signed in state */}
            {email && (
              <div className="flex items-center gap-3 rounded-[14px] px-4 py-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(212,162,79,0.12)' }}>
                  <Check className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                </div>
                <div className="flex flex-col">
                  {displayName && <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>{displayName}</span>}
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{email}</span>
                </div>
              </div>
            )}

            {/* Stripe card if staked + signed in */}
            {isStaked && email ? (
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
            ) : email ? (
              <PrimaryButton
                label="Seal the vow"
                onPress={() => handleSeal()}
                loading={busy}
              />
            ) : null}

            {/* Testing bypass */}
            <button
              type="button"
              onClick={handleTestBypass}
              disabled={busy}
              className="py-2 transition-opacity hover:opacity-70 disabled:opacity-40"
            >
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                Just testing
              </span>
            </button>

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

  // ─── STEP 6: SEALED — Full tracking page ───
  if (step === 'sealed') {
    const displayStake = sealedVow?.stake ?? vow.stake_amount;
    const displayCharity = sealedVow?.charity ?? vow.destination;

    // Compute tracking stats
    const now = new Date();
    const end = vow.ends_at ? new Date(vow.ends_at) : null;
    const start = vow.starts_at ? new Date(vow.starts_at) : (vow.sealed_at ? new Date(vow.sealed_at) : now);
    const totalDays = end ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000)) : 7;
    const daysLeft = end ? Math.ceil((end.getTime() - now.getTime()) / 86400000) : null;
    const dayNumber = daysLeft !== null ? Math.max(1, totalDays - daysLeft + 1) : null;
    const countdownLabel = daysLeft === null ? null
      : daysLeft <= 0 ? "Time's up"
      : daysLeft === 1 ? 'Last day'
      : `${daysLeft} days left`;
    const tint = getCountdownTint(daysLeft);
    const isVerdictDue = end ? now >= end : false;

    // Build the meta line under the countdown (stake + day progress)
    const metaParts: string[] = [];
    if (displayStake > 0) metaParts.push(`$${displayStake / 100} at stake`);
    if (dayNumber !== null && !isVerdictDue) metaParts.push(`Day ${Math.min(dayNumber, totalDays)} of ${totalDays}`);
    if (endDate) metaParts.push(`Verdict: ${endDate}`);

    return (
      <RitualScreen>
        <FadeUp><HeaderBadge /></FadeUp>

        {/* Status badge */}
        <FadeUp delay={0.05}>
          <div className="flex justify-center">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full"
              style={{
                backgroundColor: isVerdictDue ? 'rgba(212,162,79,0.12)' : 'var(--success-muted)',
                border: isVerdictDue ? '1px solid var(--border-strong)' : '1px solid rgba(82,214,154,0.22)',
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isVerdictDue ? 'var(--gold-bright)' : 'var(--success)' }}
              />
              <span
                className="text-[12px] font-bold tracking-[1px] uppercase"
                style={{ color: isVerdictDue ? 'var(--gold-bright)' : 'var(--success)' }}
              >
                {isVerdictDue ? 'VERDICT DUE' : 'VOW ACTIVE'}
              </span>
            </div>
          </div>
        </FadeUp>

        {/* Title */}
        <FadeUp delay={0.08}>
          <TitleBlock
            title="THE VOW IS SEALED"
            subtitle={`${makerFirstName} will decide if you kept it at the deadline.`}
          />
        </FadeUp>

        {/* Vow quote card with gold left border — hero element */}
        <FadeUp delay={0.12}>
          <div
            className="flex items-stretch overflow-hidden rounded-[14px]"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
          >
            <div className="w-[3px] shrink-0" style={{ backgroundColor: 'var(--gold)' }} />
            <div className="flex-1 py-3.5 px-4">
              <p className="text-[17px] leading-[24px] font-serif font-medium" style={{ color: 'var(--text)' }}>
                &ldquo;{vow.refined_text}&rdquo;
              </p>
              <p className="text-[12px] mt-2" style={{ color: 'var(--text-muted)' }}>
                Dared by {makerFirstName}
              </p>
            </div>
          </div>
        </FadeUp>

        {/* Countdown + stake + progress — single card, no redundancy */}
        {daysLeft !== null && (
          <FadeUp delay={0.16}>
            <div
              className="rounded-[16px] p-4"
              style={{ backgroundColor: tint.bg, border: `1px solid ${tint.border}` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[22px] font-bold font-serif" style={{ color: 'var(--text)' }}>
                  {countdownLabel}
                </span>
                <Calendar className="w-5 h-5 shrink-0" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              </div>
              {metaParts.length > 0 && (
                <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {metaParts.join(' \u00B7 ')}
                </p>
              )}
              {/* Progress bar */}
              {!isVerdictDue && dayNumber !== null && (
                <div className="mt-3 h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (dayNumber / totalDays) * 100)}%`,
                      backgroundColor: daysLeft !== null && daysLeft <= 1 ? '#EF4444' : daysLeft !== null && daysLeft <= 3 ? '#F59E0B' : 'var(--gold)',
                    }}
                  />
                </div>
              )}
            </div>
          </FadeUp>
        )}

        {/* Stake callout — only if staked, separate visual weight */}
        {displayStake > 0 && displayCharity && (
          <FadeUp delay={0.19}>
            <div className="flex items-center justify-between px-1">
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                If you fail: <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{displayCharity}</span>
              </span>
              <span className="text-[14px] font-bold" style={{ color: 'var(--gold)' }}>
                ${displayStake / 100}
              </span>
            </div>
          </FadeUp>
        )}

        {/* Primary CTA: Text the darer — time-based contextual copy */}
        {/* Primary CTA: Text the darer */}
        <FadeUp delay={0.22}>
          <button
            type="button"
            onClick={() => {
              const smsBody = encodeURIComponent(`I accepted your dare. Game on.`);
              if (makerPhone) {
                const cleanPhone = makerPhone.replace(/[^\d+\-]/g, '');
                window.location.href = `sms:${cleanPhone}&body=${smsBody}`;
              } else {
                window.location.href = `sms:?body=${smsBody}`;
              }
            }}
            className="w-full rounded-[18px] overflow-hidden transition-transform active:scale-[0.975]"
            style={{
              background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
              boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
            }}
          >
            <div className="min-h-[56px] flex items-center justify-center gap-2.5 px-5">
              <MessageCircle className="w-5 h-5" style={{ color: '#0B0D11' }} />
              <span className="text-[15px] font-extrabold tracking-[0.2px]" style={{ color: '#0B0D11' }}>
                Text {makerFirstName}
              </span>
            </div>
          </button>
        </FadeUp>

        {/* Phone capture — auto-expanded on first visit (peak engagement moment) */}
        <FadeUp delay={0.26}>
          {reminderSaved ? (
            <div
              className="flex items-center justify-center gap-2 py-3.5 rounded-[18px]"
              style={{ backgroundColor: 'rgba(82,214,154,0.08)', border: '1px solid rgba(82,214,154,0.2)' }}
            >
              <Check className="w-4 h-4" style={{ color: 'var(--success)' }} />
              <span className="text-[14px] font-semibold" style={{ color: 'var(--success)' }}>
                We&apos;ll text you when the verdict drops
              </span>
            </div>
          ) : (
            <div
              className="rounded-[18px] p-4 flex flex-col gap-3"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
            >
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" style={{ color: 'var(--gold-bright)' }} />
                <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                  Get a text when the verdict drops
                </span>
              </div>
              <input
                type="tel"
                value={reminderPhone}
                onChange={(e) => setReminderPhone(e.target.value)}
                placeholder="(555) 555-5555"
                className="w-full bg-transparent text-[15px] outline-none py-2.5 px-3.5 rounded-xl"
                style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
              />
              <button
                type="button"
                onClick={handleSavePhone}
                disabled={!reminderPhone.trim() || reminderSaving}
                className="w-full min-h-[44px] rounded-xl text-[14px] font-bold transition-opacity"
                style={{
                  backgroundColor: 'var(--gold-bright)',
                  color: '#0B0D11',
                  opacity: !reminderPhone.trim() || reminderSaving ? 0.5 : 1,
                }}
              >
                {reminderSaving ? 'Saving...' : 'Notify me'}
              </button>
            </div>
          )}
        </FadeUp>

        {/* App Store + viral — compact row */}
        <FadeUp delay={0.3}>
          <div className="flex flex-col items-center gap-3 pt-1">
            <a
              href="https://apps.apple.com/app/unbreakable-vow/id6743597637"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-80"
            >
              <img
                src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                alt="Download on the App Store"
                className="h-[36px]"
              />
            </a>
            <a
              href="/"
              className="text-[13px] font-semibold transition-opacity hover:opacity-80"
              style={{ color: 'var(--gold-bright)' }}
            >
              Your turn &mdash; dare someone else
            </a>
          </div>
        </FadeUp>

        {/* Test verdict buttons — dev only */}
        {vow.witness_invite_token && (
          <FadeUp delay={0.35}>
            <div className="flex flex-col gap-2 pt-2">
              <p className="text-[11px] font-bold tracking-[1px] uppercase text-center" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                Testing only
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleTestVerdict('kept')}
                  disabled={verdictBusy}
                  className="flex-1 min-h-[44px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97] disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(82,214,154,0.12)', border: '1px solid rgba(82,214,154,0.25)' }}
                >
                  <span className="text-[13px] font-bold" style={{ color: 'var(--success)' }}>
                    {verdictBusy ? '...' : 'Test: Kept'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestVerdict('broken')}
                  disabled={verdictBusy}
                  className="flex-1 min-h-[44px] rounded-[14px] flex items-center justify-center transition-transform active:scale-[0.97] disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(255,123,123,0.12)', border: '1px solid rgba(255,123,123,0.25)' }}
                >
                  <span className="text-[13px] font-bold" style={{ color: 'var(--danger)' }}>
                    {verdictBusy ? '...' : 'Test: Broken'}
                  </span>
                </button>
              </div>
            </div>
          </FadeUp>
        )}

        {error && (
          <FadeUp>
            <p className="text-[13px] text-center" style={{ color: 'var(--danger)' }}>{error}</p>
          </FadeUp>
        )}
      </RitualScreen>
    );
  }

  // Fallback (shouldn't reach)
  return null;
}
