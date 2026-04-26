'use client';
import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Calendar, Check, MessageCircle, Phone } from 'lucide-react';
import { Elements, ExpressCheckoutElement, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { RitualScreen, RitualCard, FrauncesH1, FrauncesSub, GoldCTA, OutlinedGoldCTA, EyebrowTag, ChoicePill } from '@/components/primitives';
import { supabase } from '@/lib/supabase';
import { displayPhone, normalizePhoneE164 } from '@/lib/phone';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

/**
 * Stripe SDK requires raw hex values — cannot accept CSS var() references.
 * Keep these in sync with --uv-* token family in globals.css.
 */
const STRIPE_COLORS = {
  primary: '#E8B656',           // --uv-gold-bright
  background: '#181512',        // --uv-bg-card
  text: '#F0E9DB',              // --uv-text
  danger: '#F87171',            // --uv-danger
  inputBg: '#1A1612',           // --uv-bg-input
  inputBorder: 'rgba(240,233,219,0.08)', // ~--uv-border-soft
  focusBorder: 'rgba(232,182,86,0.18)',  // gold tint focus
  disabledBg: '#1F1B16',        // --uv-bg-elevated
  textOnGold: '#1A1205',        // --uv-text-on-gold
} as const;

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
  target_phone?: string | null;
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
    colorPrimary: STRIPE_COLORS.primary,
    colorBackground: STRIPE_COLORS.background,
    colorText: STRIPE_COLORS.text,
    colorDanger: STRIPE_COLORS.danger,
    colorTextPlaceholder: '#8A8172',
    colorIconTab: STRIPE_COLORS.text,
    colorIconTabSelected: STRIPE_COLORS.textOnGold,
    borderRadius: '14px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  rules: {
    '.Label': { color: '#B8AD9A', fontWeight: '500' },
    '.Input': { border: `1px solid ${STRIPE_COLORS.inputBorder}`, backgroundColor: STRIPE_COLORS.inputBg, color: STRIPE_COLORS.text, padding: '12px 14px' },
    '.Input:focus': { border: '1px solid rgba(232,182,86,0.42)', boxShadow: '0 0 0 1px rgba(232,182,86,0.28)' },
    '.Tab': { border: `1px solid ${STRIPE_COLORS.inputBorder}`, backgroundColor: STRIPE_COLORS.inputBg, color: STRIPE_COLORS.text },
    '.Tab--selected': { border: '1px solid rgba(232,182,86,0.54)', backgroundColor: STRIPE_COLORS.primary, color: STRIPE_COLORS.textOnGold },
    '.TabLabel': { color: STRIPE_COLORS.text },
    '.TabLabel--selected': { color: STRIPE_COLORS.textOnGold },
    '.Block': { backgroundColor: STRIPE_COLORS.background, border: `1px solid ${STRIPE_COLORS.inputBorder}` },
  },
};

// ─── STRIPE PAYMENT FORM (inside Elements with clientSecret — supports Apple Pay + card) ───
function PaymentForm({
  onConfirmed,
  loading,
  amount,
}: {
  onConfirmed: () => Promise<void>;
  loading: boolean;
  amount: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const confirmSetupIntent = async ({ submitElements }: { submitElements: boolean }) => {
    if (!stripe || !elements || submitting) return;
    setCardError('');
    setSubmitting(true);

    try {
      if (submitElements) {
        const { error: submitError } = await elements.submit();
        if (submitError) {
          setCardError(submitError.message || 'Payment details could not be submitted.');
          setSubmitting(false);
          return;
        }
      }

      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href, // fallback for redirect-based methods
        },
        redirect: 'if_required',
      });
      if (confirmError) {
        setCardError(confirmError.message || 'Payment failed. Please try again.');
        setSubmitting(false);
        return;
      }

      // SetupIntent confirmed — let parent finalize the vow
      await onConfirmed();
    } catch (err) {
      setCardError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpressConfirm = async () => {
    await confirmSetupIntent({ submitElements: false });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await confirmSetupIntent({ submitElements: true });
  };

  const isLoading = loading || submitting;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        borderRadius: 14,
        padding: '12px 14px',
        background: 'rgba(232,182,86,0.08)',
        border: '1px solid rgba(232,182,86,0.18)',
      }}>
        <p style={{
          margin: 0,
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 13,
          lineHeight: 1.4,
          color: 'var(--uv-text-muted)',
        }}>
          Apple Pay shows first when available. Card is the backup.
        </p>
      </div>
      <ExpressCheckoutElement
        onConfirm={handleExpressConfirm}
        options={{
          wallets: {
            applePay: 'always',
            googlePay: 'always',
          },
        }}
      />
      <PaymentElement options={{
        layout: 'tabs',
        wallets: { applePay: 'never', googlePay: 'never' },
      }} />
      {cardError && (
        <p style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 13, color: 'var(--uv-danger)', margin: 0 }}>
          {cardError}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || isLoading}
        style={{
          width: '100%', height: 62, borderRadius: 14, border: 'none',
          cursor: !stripe || isLoading ? 'not-allowed' : 'pointer',
          background: isLoading
            ? STRIPE_COLORS.disabledBg
            : 'linear-gradient(180deg, var(--uv-gold-bright) 0%, var(--uv-gold) 60%, var(--uv-gold-deep) 100%)',
          boxShadow: isLoading ? 'none' : '0 0 20px var(--uv-gold-glow), inset 0 1px 0 rgba(255,255,255,0.18)',
          opacity: isLoading ? 0.5 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 100ms ease, opacity 100ms ease',
        }}
        onMouseDown={(e) => { if (!isLoading) (e.currentTarget.style.transform = 'scale(0.97)'); }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {isLoading ? (
          <div style={{
            width: 20, height: 20, border: `2px solid ${STRIPE_COLORS.textOnGold}`,
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'uv-spin 600ms linear infinite',
          }} />
        ) : (
          <span style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 18, fontWeight: 500,
            color: STRIPE_COLORS.textOnGold, letterSpacing: '0.005em',
          }}>
            Stake ${amount / 100}
          </span>
        )}
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

  // Stripe payment state — obtained from prepare_payment before Elements renders
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentSetupIntentId, setPaymentSetupIntentId] = useState<string | null>(null);
  const [preparingPayment, setPreparingPayment] = useState(false);

  // Collected data
  const suggestedCents = vow.suggested_stake_amount || 0;
  const [stakeAmount, setStakeAmount] = useState<number>(
    suggestedCents > 0 && STAKE_OPTIONS.includes(suggestedCents) ? suggestedCents : 5000
  );
  // Phase 2: Auto-select first charity
  const [charity, setCharity] = useState(CHARITIES[0]);
  const [email, setEmail] = useState('');
  const [identityPhone, setIdentityPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phonePhase, setPhonePhase] = useState<'input' | 'otp'>('input');

  // For sealed state display
  const [sealedVow, setSealedVow] = useState<{
    stake: number;
    charity: string;
    email: string;
    phone: string | null;
  } | null>(
    vow.challenge_status === 'accepted'
      ? { stake: vow.stake_amount, charity: vow.destination, email: '', phone: vow.target_phone || null }
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
        setIdentityPhone(session.user.phone || '');
        setDisplayName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || session.user.phone || '');
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setEmail(session.user.email || '');
        setIdentityPhone(session.user.phone || '');
        setDisplayName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || session.user.phone || '');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Restore challenge state from localStorage (or cookie fallback) after OAuth return
  useEffect(() => {
    try {
      let saved = localStorage.getItem('challenge-pending-state');
      // Fallback: check cookie — Safari wipes localStorage during cross-origin OAuth
      if (!saved) {
        const match = document.cookie.match(/(?:^|;\s*)challenge_pending_backup=([^;]*)/);
        if (match) {
          saved = decodeURIComponent(match[1]);
          document.cookie = 'challenge_pending_backup=; path=/; max-age=0';
        }
      }
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
  const hasIdentity = Boolean(email || identityPhone);

  const handlePhoneInputChange = (value: string) => {
    setPhoneInput(value.replace(/\D/g, '').slice(0, 10));
    setPhoneError('');
  };

  const handlePhoneContinue = useCallback(async () => {
    const normalized = normalizePhoneE164(phoneInput);
    if (!normalized) {
      setPhoneError('Enter a valid 10-digit phone number.');
      return;
    }
    setPhoneBusy(true);
    setPhoneError('');
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalized });
    setPhoneBusy(false);
    if (otpError) {
      setPhoneError(otpError.message?.toLowerCase().includes('rate')
        ? 'Too many attempts. Please wait a minute and try again.'
        : otpError.message || 'Could not send the code. Try again.');
      return;
    }
    setOtp('');
    setPhonePhase('otp');
  }, [phoneInput]);

  const handleVerifyOtp = useCallback(async () => {
    const normalized = normalizePhoneE164(phoneInput);
    if (!normalized || otp.length !== 6 || phoneBusy) return;
    setPhoneBusy(true);
    setPhoneError('');
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: normalized,
      token: otp,
      type: 'sms',
    });
    setPhoneBusy(false);
    if (verifyError) {
      setPhoneError(verifyError.message?.includes('expired') ? 'Code expired. Send a new one.' : 'Invalid code. Try again.');
      setOtp('');
      return;
    }
    if (data.user) {
      setIdentityPhone(normalized);
      setEmail(data.user.email || '');
      setDisplayName(data.user.user_metadata?.full_name || data.user.phone || '');
      try {
        await supabase.from('users').upsert({
          id: data.user.id,
          display_name: data.user.user_metadata?.full_name || null,
          phone: normalized,
          phone_e164: normalized,
        }, { onConflict: 'id' });
      } catch (err) {
        console.warn('Challenge phone profile upsert failed (non-blocking):', err);
      }
    }
  }, [otp, phoneBusy, phoneInput]);

  const ChallengeTopBar = ({ backTo, backLabel = 'Back' }: { backTo?: Step; backLabel?: string }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, minHeight: 36, marginBottom: 10,
    }}>
      {backTo ? (
        <button
          type="button"
          onClick={() => { setError(null); setStep(backTo); }}
          aria-label={backLabel}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: 'var(--uv-text-muted)',
            fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 600,
          }}
        >
          <ArrowLeft style={{ width: 17, height: 17 }} />
          {backLabel}
        </button>
      ) : (
        <a
          href="/quick-vow"
          aria-label="Unbreakable Vow home"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            color: 'var(--uv-text-muted)', textDecoration: 'none',
            fontFamily: 'var(--uv-font-serif)', fontSize: 14, fontWeight: 700,
          }}
        >
          <span style={{
            width: 18, height: 18, borderRadius: 5,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--uv-gold)',
            color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)', fontSize: 12,
          }}>
            ◆
          </span>
          Unbreakable Vow
        </a>
      )}
      <a
        href="/quick-vow"
        style={{
          color: 'var(--uv-gold-bright)', textDecoration: 'none',
          fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 800,
        }}
      >
        Make a vow
      </a>
    </div>
  );

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

  // ─── ACCEPT / SEAL HANDLER (no-stake or legacy) ───
  const handleSeal = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        token,
        action: 'accept',
        stake_amount: 0,
        destination: '',
        email,
        phone: identityPhone,
        display_name: displayName || undefined,
      };

      const { errorCode } = await callAcceptChallenge(payload);
      if (errorCode) {
        setError(mapErrorMessage(errorCode));
        setBusy(false);
        return;
      }
      setSealedVow({ stake: 0, charity: '', email, phone: identityPhone || null });
      window.location.href = `/vow/${vow.id}?sealed=1`;
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setBusy(false);
    }
  }, [busy, token, email, identityPhone, displayName]);

  // ─── PREPARE PAYMENT: create SI on server before Elements renders ───
  const preparePayment = useCallback(async () => {
    if (preparingPayment || paymentClientSecret) return;
    setPreparingPayment(true);
    setError(null);
    try {
      const { data: prepData, errorCode: prepError } = await callAcceptChallenge({
        token,
        action: 'prepare_payment',
        stake_amount: stakeAmount,
        email,
        phone: identityPhone,
        display_name: displayName || undefined,
      });
      if (prepError || !prepData) {
        setError(mapErrorMessage(prepError || 'payment_failed'));
        setPreparingPayment(false);
        return;
      }
      setPaymentClientSecret(prepData.client_secret as string);
      setPaymentSetupIntentId(prepData.setup_intent_id as string);
      setStep('payment');
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setPreparingPayment(false);
    }
  }, [preparingPayment, paymentClientSecret, token, stakeAmount, email, identityPhone, displayName]);

  // ─── STAKED PAYMENT HANDLER — called after PaymentForm confirms the SI ───
  const handlePaymentConfirmed = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { errorCode: acceptError } = await callAcceptChallenge({
        token,
        action: 'accept',
        stake_amount: stakeAmount,
        destination: charity,
        email,
        phone: identityPhone,
        display_name: displayName || undefined,
        setup_intent_id: paymentSetupIntentId,
      });
      if (acceptError) {
        setError(mapErrorMessage(acceptError));
        setBusy(false);
        return;
      }

      setSealedVow({ stake: stakeAmount, charity, email, phone: identityPhone || null });
      window.location.href = `/vow/${vow.id}?sealed=1`;
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setBusy(false);
    }
  }, [busy, token, stakeAmount, charity, email, identityPhone, displayName, paymentSetupIntentId]);

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
      // Redirect to outcome page with vow data
      const amountDollars = Math.round((sealedVow?.stake ?? vow.stake_amount) / 100);
      const outText = encodeURIComponent(vow.refined_text || '');
      const outDest = encodeURIComponent(sealedVow?.charity ?? vow.destination ?? '');
      const outWitness = encodeURIComponent(makerName);
      const base = verdict === 'kept' ? '/vow-kept' : '/vow-broken';
      window.location.href = `${base}?amount=${amountDollars}&text=${outText}&destination=${outDest}&witness=${outWitness}`;
    } catch {
      setError('Network error. Please check your connection.');
      setVerdictBusy(false);
    }
  };

  // ─── STEP 1: THE DARE ───
  if (step === 'dare') {
    return (
      <RitualScreen variant="utility">
        <ChallengeTopBar />
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '70dvh', gap: 18, textAlign: 'center',
          padding: '0 16px',
        }}>
          <EyebrowTag tone="amber">Dare received</EyebrowTag>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <FrauncesH1 italic size="page">{makerFirstName} dared you.</FrauncesH1>
            <p style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 16, lineHeight: '23px',
              color: 'var(--uv-text-muted)', margin: 0, maxWidth: 310,
            }}>
              Accept it. Stake your word. Follow through and you lose nothing. Flake, and you pay.
            </p>
          </div>

          <RitualCard>
            <div style={{ display: 'flex', alignItems: 'stretch', overflow: 'hidden' }}>
              <div style={{ width: 3, flexShrink: 0, background: 'var(--uv-gold)' }} />
              <div style={{ flex: 1, padding: '20px 20px' }}>
                <p style={{
                  fontFamily: 'var(--uv-font-serif)', fontSize: 22, lineHeight: '30px',
                  fontWeight: 500, letterSpacing: '-0.3px', color: 'var(--uv-text)', margin: 0,
                }}>
                  &ldquo;{vow.refined_text}&rdquo;
                </p>
              </div>
            </div>
          </RitualCard>

          {endDate && (
            <p style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 14,
              color: 'var(--uv-text-muted)', margin: 0,
            }}>
              Due by {endDate}. {makerFirstName} makes the verdict.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%', maxWidth: 320 }}>
            <GoldCTA label="Accept the dare" onPress={() => setStep('stakes')} />
            <button
              type="button"
              onClick={() => setStep('back-down-confirm')}
              style={{
                background: 'none', border: 'none', padding: '8px 0',
                cursor: 'pointer',
              }}
            >
              <span style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 13,
                color: 'var(--uv-text-muted)', opacity: 0.6,
              }}>
                back down
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            borderRadius: 12, padding: '12px 16px', margin: '0 16px',
            fontSize: 14, fontFamily: 'var(--uv-font-sans)',
            background: 'var(--uv-danger-bg)', color: 'var(--uv-danger)',
            border: '1px solid var(--uv-danger)',
          }}>
            {error}
          </div>
        )}
      </RitualScreen>
    );
  }

  // ─── BACK DOWN CONFIRM MODAL ───
  if (step === 'back-down-confirm') {
    return (
      <RitualScreen variant="utility">
        <ChallengeTopBar backTo="dare" />
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '70dvh',
        }}>
          <div style={{
            borderRadius: 22, padding: 28,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 20, textAlign: 'center', maxWidth: 360, margin: '0 auto',
            background: 'var(--uv-bg-card)', border: '1px solid var(--uv-border)',
            boxShadow: '0 16px 28px rgba(0,0,0,0.26)',
          }}>
            <FrauncesH1 italic size="page">Are you sure?</FrauncesH1>
            <FrauncesSub>{makerName} will know you backed down.</FrauncesSub>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
              <GoldCTA
                label="Go back"
                onPress={() => { setError(null); setStep('dare'); }}
              />
              <button
                type="button"
                onClick={handleDecline}
                disabled={busy}
                style={{
                  background: 'none', border: 'none', padding: '8px 0',
                  cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1,
                }}
              >
                {busy ? (
                  <div style={{
                    width: 16, height: 16, border: '2px solid var(--uv-text-muted)',
                    borderTopColor: 'transparent', borderRadius: '50%',
                    animation: 'uv-spin 600ms linear infinite',
                  }} />
                ) : (
                  <span style={{
                    fontFamily: 'var(--uv-font-sans)', fontSize: 13,
                    color: 'var(--uv-text-muted)', opacity: 0.6,
                  }}>
                    I&apos;m backing down
                  </span>
                )}
              </button>
            </div>
            {error && (
              <p style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 13, color: 'var(--uv-danger)', margin: 0 }}>
                {error}
              </p>
            )}
          </div>
        </div>
      </RitualScreen>
    );
  }

  // ─── BACKED DOWN CONFIRMED ───
  if (step === 'backed-down') {
    return (
      <RitualScreen variant="utility">
        <ChallengeTopBar />
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '70dvh', gap: 20, textAlign: 'center',
          padding: '0 16px',
        }}>
          <FrauncesH1 italic size="page">You backed down.</FrauncesH1>
          <FrauncesSub>{makerName} has been notified.</FrauncesSub>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <a
              href="/cast"
              style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 600,
                color: 'var(--uv-gold-bright)', textDecoration: 'none',
              }}
            >
              Dare them back &rarr;
            </a>
            <a
              href="/quick-vow"
              style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 13,
                color: 'var(--uv-text-muted)', textDecoration: 'none',
              }}
            >
              Make your own vow
            </a>
          </div>
        </div>
      </RitualScreen>
    );
  }

  // ─── STEP 3: STAKES + CHARITY (combined) ───
  if (step === 'stakes') {
    return (
      <RitualScreen variant="utility">
        <ChallengeTopBar backTo="dare" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
          <div style={{ textAlign: 'center' }}>
            <FrauncesH1 italic size="page">Stake your word.</FrauncesH1>
            <FrauncesSub>Keep it and you lose nothing. Miss, and the money goes to charity.</FrauncesSub>
          </div>

          <RitualCard>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <p style={{
                  fontFamily: 'var(--uv-font-sans)', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.24em', textTransform: 'uppercase' as const,
                  color: 'var(--uv-text-dim)', margin: '0 0 7px',
                }}>
                  The dare
                </p>
                <p style={{
                  fontFamily: 'var(--uv-font-sans)', fontSize: 20, lineHeight: 1.18,
                  fontWeight: 750, color: 'var(--uv-text)', margin: 0,
                }}>
                  {vow.refined_text}
                </p>
              </div>
              <div style={{ height: 1, background: 'var(--uv-border-soft)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                <div>
                  <p style={{
                    fontFamily: 'var(--uv-font-sans)', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.24em', textTransform: 'uppercase' as const,
                    color: 'var(--uv-text-dim)', margin: '0 0 4px',
                  }}>
                    Due by
                  </p>
                  <p style={{
                    fontFamily: 'var(--uv-font-sans)', fontSize: 15, fontWeight: 700,
                    color: 'var(--uv-text)', margin: 0,
                  }}>
                    {endDate || 'Verdict day'}
                  </p>
                </div>
                <p style={{
                  fontFamily: 'var(--uv-font-sans)', fontSize: 13,
                  color: 'var(--uv-text-muted)', margin: 0, textAlign: 'right',
                }}>
                  {makerFirstName} judges
                </p>
              </div>
            </div>
          </RitualCard>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            {suggestedCents > 0 && (
              <p style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 13,
                color: 'var(--uv-gold)', margin: 0,
              }}>
                {`${makerFirstName} suggested $${suggestedCents / 100}`}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              {STAKE_OPTIONS.map((cents) => (
                <ChoicePill
                  key={cents}
                  label={`$${cents / 100}`}
                  active={stakeAmount === cents}
                  onPress={() => setStakeAmount(cents)}
                />
              ))}
            </div>
          </div>

          {stakeAmount > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 600,
                letterSpacing: '1px', textTransform: 'uppercase' as const,
                color: 'var(--uv-text-muted)', margin: 0,
              }}>
                If you fail, it goes to
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CHARITIES.map((name) => (
                  <ChoicePill
                    key={name}
                    label={name}
                    active={charity === name}
                    onPress={() => setCharity(name)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Footer CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <GoldCTA
              label={preparingPayment ? 'Preparing...' : stakeAmount > 0 ? `Accept the dare - stake $${stakeAmount / 100}` : 'Accept with no stake'}
              onPress={() => {
                if (stakeAmount > 0 && hasIdentity) {
                  // Staked + already signed in: prepare SI first, then show payment
                  preparePayment();
                } else {
                  // No stake or needs sign-in: go to payment/sign-in step
                  setStep('payment');
                }
              }}
              disabled={preparingPayment}
            />
            <button
              type="button"
              onClick={() => { setStakeAmount(0); setStep('payment'); }}
              style={{
                background: 'none', border: 'none', padding: '8px 0',
                cursor: 'pointer',
              }}
            >
              <span style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 13,
                color: 'var(--uv-text-muted)',
              }}>
                skip — my word is enough
              </span>
            </button>
          </div>
        </div>
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
      try { localStorage.setItem('challenge-pending-state', JSON.stringify({ stakeAmount, charity, token })); } catch {}
      // Cookie backup for challenge state — Safari wipes localStorage during cross-origin OAuth
      try { document.cookie = `challenge_pending_backup=${encodeURIComponent(JSON.stringify({ stakeAmount, charity, token }))}; path=/; max-age=300; SameSite=Lax`; } catch {}
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
        setSealedVow({ stake: 0, charity: '', email: 'test@unbreakablevow.app', phone: null });
        setStep('sealed');
        setBusy(false);
      } catch {
        setError('Network error. Please check your connection.');
        setBusy(false);
      }
    };

    return (
      <RitualScreen variant="utility">
        <ChallengeTopBar backTo="stakes" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 40 }}>
          <EyebrowTag>{hasIdentity ? 'Last step' : 'Quick sign-in'}</EyebrowTag>

          <div>
            <FrauncesH1 italic size="page">
              {!hasIdentity
                ? 'What’s your number?'
                : isStaked
                  ? `Authorize $${stakeAmount / 100}.`
                  : 'You’re in.'}
            </FrauncesH1>
            <div style={{ marginTop: 8 }}>
              <FrauncesSub>
                {!hasIdentity
                  ? 'We’ll text a code. This is your account and verdict reminder.'
                  : isStaked
                    ? 'Keep the dare and you lose nothing. Miss, and the stake goes to charity.'
                    : `${makerFirstName} needs to know who accepted.`}
              </FrauncesSub>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            padding: '13px 15px',
            borderRadius: 16,
            background: 'rgba(240,233,219,0.035)',
            border: '1px solid var(--uv-border-soft)',
          }}>
            <p style={{
              flex: 1,
              minWidth: 0,
              margin: 0,
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 14,
              lineHeight: 1.25,
              fontWeight: 700,
              color: 'var(--uv-text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {vow.refined_text}
            </p>
            <span style={{
              flexShrink: 0,
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 13,
              fontWeight: 800,
              color: 'var(--uv-gold-bright)',
            }}>
              {isStaked ? `$${stakeAmount / 100}` : 'No stake'} · {endDate || 'verdict day'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!hasIdentity && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {phonePhase === 'otp' ? (
                    <>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={otp}
                        onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setPhoneError(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyOtp(); }}
                        placeholder="6-digit code"
                        autoFocus
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          padding: '16px 16px', borderRadius: 14,
                          fontFamily: 'var(--uv-font-sans)', fontSize: 22, fontWeight: 750,
                          textAlign: 'center', letterSpacing: '0.16em',
                          color: 'var(--uv-text)', background: 'var(--uv-bg-input)',
                          border: '1px solid var(--uv-border-strong)', outline: 'none',
                        }}
                      />
                      <GoldCTA
                        label={phoneBusy ? 'Checking...' : 'Verify number'}
                        onPress={handleVerifyOtp}
                        disabled={phoneBusy || otp.length !== 6}
                      />
                      <button
                        type="button"
                        onClick={() => { setPhonePhase('input'); setOtp(''); setPhoneError(''); }}
                        style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          fontFamily: 'var(--uv-font-sans)', fontSize: 12,
                          color: 'var(--uv-text-muted)',
                        }}
                      >
                        Use a different number
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        borderRadius: 14, border: '1px solid var(--uv-border-strong)',
                        background: 'var(--uv-bg-input)', padding: '0 14px',
                      }}>
                        <span style={{
                          fontFamily: 'var(--uv-font-sans)', fontSize: 15,
                          color: 'var(--uv-text-muted)', whiteSpace: 'nowrap',
                        }}>
                          +1
                        </span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          value={displayPhone(normalizePhoneE164(phoneInput) || phoneInput)}
                          onChange={(e) => handlePhoneInputChange(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handlePhoneContinue(); }}
                          placeholder="(555) 867-5309"
                          autoFocus
                          style={{
                            flex: 1, minWidth: 0, border: 'none', outline: 'none',
                            background: 'transparent', padding: '16px 0',
                            fontFamily: 'var(--uv-font-sans)', fontSize: 18,
                            color: 'var(--uv-text)',
                          }}
                        />
                      </div>
                      <GoldCTA
                        label={phoneBusy ? 'Sending...' : 'Text me the code'}
                        onPress={handlePhoneContinue}
                        disabled={phoneBusy || phoneInput.replace(/\D/g, '').length < 10}
                      />
                    </>
                  )}

                  {phoneError && (
                    <p style={{ margin: 0, fontFamily: 'var(--uv-font-sans)', fontSize: 13, color: 'var(--uv-danger)' }}>
                      {phoneError}
                    </p>
                  )}
              </div>
            )}

            {/* Google Sign In — secondary fallback. Brand colors are Google's requirement. */}
            {!hasIdentity && (
              <button
                onClick={handleGoogleSignIn}
                disabled={busy}
                style={{
                  width: '100%', minHeight: 52, borderRadius: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: 'var(--uv-bg-card)', border: '1px solid var(--uv-border)',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.45 : 0.72, transition: 'opacity 100ms',
                }}
              >
                {/* Google brand SVG — hex colors are Google's brand requirement */}
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--uv-text)' }}>
                  or continue with Google
                </span>
              </button>
            )}

            {/* Signed in state */}
            {hasIdentity && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                borderRadius: 14, padding: '12px 16px',
                background: 'var(--uv-bg-card)', border: '1px solid var(--uv-border)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--uv-gold-bg)',
                }}>
                  <Check style={{ width: 16, height: 16, color: 'var(--uv-gold)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {displayName && (
                    <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--uv-text)' }}>
                      {displayName}
                    </span>
                  )}
                  <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 13, color: 'var(--uv-text-muted)' }}>
                    {identityPhone ? displayPhone(normalizePhoneE164(identityPhone) || identityPhone) : email}
                  </span>
                </div>
              </div>
            )}

            {/* Stripe payment if staked + signed in + SI ready */}
            {isStaked && hasIdentity && paymentClientSecret ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: paymentClientSecret,
                  appearance: stripeAppearance,
                }}
              >
                <PaymentForm
                  onConfirmed={handlePaymentConfirmed}
                  loading={busy}
                  amount={stakeAmount}
                />
              </Elements>
            ) : isStaked && hasIdentity && !paymentClientSecret ? (
              /* Signed in but SI not yet created — show button to prepare payment */
              <GoldCTA
                label={preparingPayment ? 'Preparing payment...' : `Stake $${stakeAmount / 100}`}
                onPress={preparePayment}
                disabled={preparingPayment}
              />
            ) : hasIdentity ? (
              <GoldCTA
                label={busy ? 'Sealing...' : 'Seal the vow'}
                onPress={() => handleSeal()}
                disabled={busy}
              />
            ) : null}

            {/* Testing bypass — dev only */}
            {process.env.NODE_ENV === 'development' && (
              <button
                type="button"
                onClick={handleTestBypass}
                disabled={busy}
                style={{
                  background: 'none', border: 'none', padding: '8px 0',
                  cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.4 : 1,
                }}
              >
                <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 13, color: 'var(--uv-text-muted)' }}>
                  Just testing
                </span>
              </button>
            )}

            {error && (
              <p style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 13, color: 'var(--uv-danger)', margin: 0 }}>
                {error}
              </p>
            )}

            <p style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 12, textAlign: 'center',
              color: 'var(--uv-text-muted)', margin: 0,
            }}>
              By continuing you agree to the{' '}
              <a href="/terms" style={{ color: 'var(--uv-text-muted)', textDecoration: 'underline' }}>terms</a>.
            </p>
          </div>
        </div>
      </RitualScreen>
    );
  }

  // ─── STEP 6: SEALED — Full tracking page ───
  if (step === 'sealed') {
    const displayStake = sealedVow?.stake ?? vow.stake_amount;
    const displayCharity = sealedVow?.charity ?? vow.destination;
    const verdictPhone = sealedVow?.phone || vow.target_phone || identityPhone || null;

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
      <RitualScreen variant="utility">
        <ChallengeTopBar />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
          <EyebrowTag>UNBREAKABLE VOW</EyebrowTag>

          {/* Status badge */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 9999,
              background: isVerdictDue ? 'var(--uv-gold-bg)' : 'var(--uv-success-bg)',
              border: isVerdictDue ? '1px solid var(--uv-border-strong)' : '1px solid var(--uv-success-border)',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isVerdictDue ? 'var(--uv-gold-bright)' : 'var(--uv-success)',
              }} />
              <span style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 12, fontWeight: 700,
                letterSpacing: '1px', textTransform: 'uppercase' as const,
                color: isVerdictDue ? 'var(--uv-gold-bright)' : 'var(--uv-success)',
              }}>
                {isVerdictDue ? 'VERDICT DUE' : 'VOW ACTIVE'}
              </span>
            </div>
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center' }}>
            <FrauncesH1 italic size="page">The vow is sealed.</FrauncesH1>
            <div style={{ marginTop: 8 }}>
              <FrauncesSub>{makerFirstName} will decide if you kept it at the deadline.</FrauncesSub>
            </div>
          </div>

          {/* Vow quote card — gold left border, matches dashboard card pattern */}
          <RitualCard>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              <div style={{ width: 3, flexShrink: 0, background: 'var(--uv-gold)', borderRadius: 2 }} />
              <div style={{ flex: 1, padding: '14px 16px' }}>
                <p style={{
                  fontFamily: 'var(--uv-font-serif)', fontSize: 17, lineHeight: '24px',
                  fontWeight: 500, color: 'var(--uv-text)', margin: 0,
                }}>
                  &ldquo;{vow.refined_text}&rdquo;
                </p>
                <p style={{
                  fontFamily: 'var(--uv-font-sans)', fontSize: 12, marginTop: 8,
                  color: 'var(--uv-text-muted)', margin: '8px 0 0',
                }}>
                  Dared by {makerFirstName}
                </p>
              </div>
            </div>
          </RitualCard>

          {/* Countdown — matches dashboard countdown visual pattern */}
          {daysLeft !== null && (
            <div style={{
              borderRadius: 16, padding: 16,
              background: tint.bg, border: `1px solid ${tint.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontFamily: 'var(--uv-font-serif)', fontSize: 22, fontWeight: 700,
                  color: 'var(--uv-text)',
                }}>
                  {countdownLabel}
                </span>
                <Calendar style={{ width: 20, height: 20, color: 'var(--uv-text-muted)', opacity: 0.4 }} />
              </div>
              {metaParts.length > 0 && (
                <p style={{
                  fontFamily: 'var(--uv-font-sans)', fontSize: 13, marginTop: 4,
                  color: 'var(--uv-text-muted)', margin: '4px 0 0',
                }}>
                  {metaParts.join(' \u00B7 ')}
                </p>
              )}
              {/* Progress bar — screen-local */}
              {!isVerdictDue && dayNumber !== null && (
                <div style={{
                  marginTop: 12, height: 3, borderRadius: 9999, overflow: 'hidden',
                  background: 'rgba(255,255,255,0.06)',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 9999,
                    transition: 'width 500ms ease',
                    width: `${Math.min(100, (dayNumber / totalDays) * 100)}%`,
                    background: daysLeft !== null && daysLeft <= 1
                      ? 'var(--uv-danger)'
                      : daysLeft !== null && daysLeft <= 3
                        ? 'var(--uv-warn)'
                        : 'var(--uv-gold)',
                  }} />
                </div>
              )}
            </div>
          )}

          {/* Stake callout */}
          {displayStake > 0 && displayCharity && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 4px', fontFamily: 'var(--uv-font-sans)',
            }}>
              <span style={{ fontSize: 13, color: 'var(--uv-text-muted)' }}>
                If you fail: <span style={{ fontWeight: 500, color: 'var(--uv-text)' }}>{displayCharity}</span>
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--uv-gold)' }}>
                ${displayStake / 100}
              </span>
            </div>
          )}

          {/* SMS nudge — screen-local gold button with icon */}
          {/* TODO: extend GoldCTA to support a leading icon slot if this pattern appears 3+ times */}
          {(() => {
            const elapsed = (start && end) ? Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / (end.getTime() - start.getTime()))) : 0;
            const nudgeLabel = elapsed < 0.15
              ? `Tell ${makerFirstName} you're in`
              : elapsed < 0.85
              ? `Check in with ${makerFirstName}`
              : `Tell ${makerFirstName} you made it`;
            const smsBody = elapsed < 0.15
              ? `I accepted your dare. Game on.`
              : elapsed < 0.85
              ? `Still going strong on the dare.`
              : `Almost verdict time — I'm feeling good about this one.`;

            return (
              <button
                type="button"
                onClick={() => {
                  const message = encodeURIComponent(smsBody);
                  if (makerPhone) {
                    const cleanPhone = makerPhone.replace(/[^\d+\-]/g, '');
                    window.location.href = `sms:${cleanPhone}?body=${message}`;
                  } else {
                    window.location.href = `sms:?body=${message}`;
                  }
                }}
                style={{
                  width: '100%', height: 62, borderRadius: 14, border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(180deg, var(--uv-gold-bright) 0%, var(--uv-gold) 60%, var(--uv-gold-deep) 100%)',
                  boxShadow: '0 0 20px var(--uv-gold-glow), inset 0 1px 0 rgba(255,255,255,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'transform 100ms ease',
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <MessageCircle style={{ width: 20, height: 20, color: 'var(--uv-text-on-gold)' }} />
                <span style={{
                  fontFamily: 'var(--uv-font-serif)', fontSize: 15, fontWeight: 500,
                  letterSpacing: '0.005em', color: 'var(--uv-text-on-gold)',
                }}>
                  {nudgeLabel}
                </span>
              </button>
            );
          })()}

          {/* Phone capture */}
          {verdictPhone ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 0', borderRadius: 18,
              background: 'var(--uv-success-bg)', border: '1px solid var(--uv-success-border)',
            }}>
              <Check style={{ width: 16, height: 16, color: 'var(--uv-success)' }} />
              <span style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 600,
                color: 'var(--uv-success)', textAlign: 'center',
              }}>
                We&apos;ll text {displayPhone(normalizePhoneE164(verdictPhone) || verdictPhone)} when the verdict drops
              </span>
            </div>
          ) : reminderSaved ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 0', borderRadius: 18,
              background: 'var(--uv-success-bg)', border: '1px solid var(--uv-success-border)',
            }}>
              <Check style={{ width: 16, height: 16, color: 'var(--uv-success)' }} />
              <span style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 600,
                color: 'var(--uv-success)',
              }}>
                We&apos;ll text you when the verdict drops
              </span>
            </div>
          ) : (
            <RitualCard>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Phone style={{ width: 16, height: 16, color: 'var(--uv-gold-bright)' }} />
                <span style={{
                  fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 600,
                  color: 'var(--uv-text)',
                }}>
                  Get a text when the verdict drops
                </span>
              </div>
              <input
                type="tel"
                value={reminderPhone}
                onChange={(e) => setReminderPhone(e.target.value)}
                placeholder="(555) 555-5555"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12,
                  fontFamily: 'var(--uv-font-sans)', fontSize: 15,
                  color: 'var(--uv-text)', background: 'transparent',
                  border: '1px solid var(--uv-border)', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={handleSavePhone}
                disabled={!reminderPhone.trim() || reminderSaving}
                style={{
                  width: '100%', minHeight: 44, borderRadius: 12, border: 'none',
                  fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 700,
                  background: 'var(--uv-gold-bright)', color: 'var(--uv-text-on-gold)',
                  cursor: !reminderPhone.trim() || reminderSaving ? 'not-allowed' : 'pointer',
                  opacity: !reminderPhone.trim() || reminderSaving ? 0.5 : 1,
                  transition: 'opacity 100ms',
                }}
              >
                {reminderSaving ? 'Saving...' : 'Notify me'}
              </button>
            </RitualCard>
          )}

          {/* App Store + viral */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 4 }}>
            <a
              href="https://apps.apple.com/app/unbreakable-vow/id6743597637"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                alt="Download on the App Store"
                style={{ height: 36 }}
              />
            </a>
            <a
              href="/quick-vow"
              style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 600,
                color: 'var(--uv-gold-bright)', textDecoration: 'none',
              }}
            >
              Your turn &mdash; dare someone else
            </a>
          </div>

          {/* Test verdict buttons — dev only */}
          {process.env.NODE_ENV === 'development' && vow.witness_invite_token && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
              <p style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 700,
                letterSpacing: '1px', textTransform: 'uppercase' as const, textAlign: 'center',
                color: 'var(--uv-text-muted)', opacity: 0.5, margin: 0,
              }}>
                Testing only
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleTestVerdict('kept')}
                  disabled={verdictBusy}
                  style={{
                    flex: 1, minHeight: 44, borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--uv-success-bg)', border: '1px solid var(--uv-success-border)',
                    cursor: verdictBusy ? 'not-allowed' : 'pointer',
                    opacity: verdictBusy ? 0.4 : 1,
                  }}
                >
                  <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 700, color: 'var(--uv-success)' }}>
                    {verdictBusy ? '...' : 'Test: Kept'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestVerdict('broken')}
                  disabled={verdictBusy}
                  style={{
                    flex: 1, minHeight: 44, borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--uv-danger-bg)', border: '1px solid var(--uv-danger)',
                    cursor: verdictBusy ? 'not-allowed' : 'pointer',
                    opacity: verdictBusy ? 0.4 : 1,
                  }}
                >
                  <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 700, color: 'var(--uv-danger)' }}>
                    {verdictBusy ? '...' : 'Test: Broken'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <p style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 13, textAlign: 'center',
              color: 'var(--uv-danger)', margin: 0,
            }}>
              {error}
            </p>
          )}
        </div>
      </RitualScreen>
    );
  }

  // Fallback (shouldn't reach)
  return null;
}
