'use client';
import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles, User, UserPlus, ChevronRight, DollarSign, Calendar, Scale, CheckCircle,
} from 'lucide-react';
import {
  RitualScreen, RitualCard, PrimaryButton, ChoiceChip,
  OathCheckbox, VowPreview, SectionLabel, FadeUp,
} from '@/components/ui';
import { AuthModal } from '@/components/auth-modal';
import { PaymentModal } from '@/components/payment-form';
import { ShareButton, CopyLinkButton } from '@/components/share-button';
import { HamburgerMenu } from '@/components/hamburger-menu';
import { useVowFlow } from '@/providers/vow-flow';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import {
  analyzeVow, generateSuggestion, charities, antiCauses,
  inferDeadline,
  type ConsequenceType,
} from '@/lib/vow-logic';

async function ensurePublicUser(userId: string, meta?: Record<string, unknown>, email?: string) {
  await supabase.from('users').upsert(
    { id: userId, display_name: (meta?.full_name as string) || email?.split('@')[0] || null },
    { onConflict: 'id', ignoreDuplicates: true },
  );
}

const STAKE_OPTIONS = [10, 25, 50, 100];

/**
 * Strip time-window phrases that generateSuggestion appends (e.g. ", this week.",
 * " all week.") — the deadline is shown separately via the date picker, so the
 * formatted vow text shouldn't duplicate or contradict it.
 *
 * Keeps frequency qualifiers like "3 times", "every night", "every morning" intact
 * and only removes the trailing time-window reference.
 */
function stripTimeSuffix(text: string): string {
  return text
    // ", this week." / " this week." / " this month." / " this year."
    .replace(/[,.]?\s+this\s+(?:week|month|year)\s*\.?$/i, '')
    // ", all week." / " all month."
    .replace(/[,.]?\s+all\s+(?:week|month)\s*\.?$/i, '')
    // "by Friday at 5pm."
    .replace(/[,.]?\s+by\s+Friday\s+at\s+5pm\s*\.?$/i, '')
    .replace(/\s*\.$/, '')
    .trim();
}

const DEADLINE_PRESETS = [
  { label: 'Tomorrow', days: () => 1 },
  { label: 'End of week', days: () => { const d = new Date(); const diff = 7 - d.getDay(); return diff === 0 ? 7 : diff; } },
  { label: '7 days', days: () => 7 },
  { label: 'Pick date', days: () => -1 },
];

type Step = 1 | 2 | 3 | 'sealed';

/* ── Thin gold progress bar ───────────────────────────────────────── */
function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  const pct = step === 1 ? 33 : step === 2 ? 66 : 100;
  return (
    <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--gold-bright), var(--gold))',
        }}
      />
    </div>
  );
}

function GuidedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, session } = useAuth();
  const { vow, resetVow, setRawInput } = useVowFlow();

  // Step state
  const [step, setStep] = useState<Step>(1);

  // Form state — S1
  const [vowText, setVowText] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [deadlineLabel, setDeadlineLabel] = useState('7 days');
  const [customDate, setCustomDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Form state — S2
  const [stakeAmount, setStakeAmount] = useState(10);
  const [consequence, setConsequence] = useState<ConsequenceType>('charity');
  const [destination, setDestination] = useState('ALS Association');

  // Form state — S3
  const [witnessName, setWitnessName] = useState('');
  const [witnessPhone, setWitnessPhone] = useState('');
  const [oathChecked, setOathChecked] = useState(false);

  // Seal state
  const [sealing, setSealing] = useState(false);
  const [error, setError] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [vowId, setVowId] = useState<string | null>(null);
  const [witnessToken, setWitnessToken] = useState<string | null>(null);
  const [showSealAnimation, setShowSealAnimation] = useState(false);
  const [sealAnimationSkippable, setSealAnimationSkippable] = useState(false);
  const [isDevBypass, setIsDevBypass] = useState(false);

  useEffect(() => {
    const isLocal = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
    setIsDevBypass(isLocal);
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize from VowFlowProvider (landing page sets rawInput before redirecting here)
  useEffect(() => {
    const prefill = vow.rawInput || searchParams.get('text') || '';
    if (prefill && !vowText) {
      setVowText(prefill);
      // Try to infer deadline from vow text
      const inferred = inferDeadline(prefill);
      if (inferred) {
        setCustomDate(inferred.toISOString().split('T')[0]);
        setShowCustomDate(true);
        setDeadlineLabel('Pick date');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const isLocal = window.location.hostname === 'localhost';
    const hasTestParam = new URLSearchParams(window.location.search).has('test');
    setIsDevBypass(isLocal || hasTestParam);
  }, []);

  // Compute suggestion as user types.
  // Strip time-window suffixes from the generated suggestion since the deadline
  // is always selected separately via the date picker shown below the input.
  useEffect(() => {
    if (vowText.trim().length < 3) { setSuggestion(''); return; }
    const analysis = analyzeVow(vowText);
    setSuggestion(analysis.type === 'vague' ? stripTimeSuffix(generateSuggestion(vowText)) : '');
  }, [vowText]);

  // End date computation
  const endDate = useMemo(() => {
    if (showCustomDate && customDate) return new Date(customDate + 'T23:59:59');
    const preset = DEADLINE_PRESETS.find((p) => p.label === deadlineLabel);
    if (!preset) { const f = new Date(); f.setDate(f.getDate() + 7); f.setHours(23, 59, 59, 0); return f; }
    const days = preset.days();
    if (days === -1) { const f = new Date(); f.setDate(f.getDate() + 7); f.setHours(23, 59, 59, 0); return f; }
    const d = new Date(); d.setDate(d.getDate() + days); d.setHours(23, 59, 59, 0); return d;
  }, [deadlineLabel, customDate, showCustomDate]);

  const destinations = consequence === 'charity' ? charities : antiCauses;

  useEffect(() => {
    const list = consequence === 'charity' ? charities : antiCauses;
    if (!list.includes(destination)) setDestination(list[0]);
  }, [consequence, destination]);

  const activeText = suggestion || vowText;
  const formattedText = activeText.trim().charAt(0).toUpperCase() + activeText.trim().slice(1);

  const handleDeadlineSelect = (label: string) => {
    setDeadlineLabel(label);
    if (label === 'Pick date') { setShowCustomDate(true); } else { setShowCustomDate(false); setCustomDate(''); }
  };

  const acceptSuggestion = () => { if (suggestion) { setVowText(suggestion); setSuggestion(''); } };

  /* ── Seal logic (same as /create) ─────────────────────────────── */
  const handleSeal = useCallback(async () => {
    if (!oathChecked || sealing) return;
    setError('');

    const { data: { session: currentSession } } = await supabase.auth.refreshSession();
    if (!currentSession) { setShowAuth(true); return; }

    setSealing(true);
    try {
      const finalText = formattedText.endsWith('.') || formattedText.endsWith('!') ? formattedText : formattedText + '.';

      await ensurePublicUser(currentSession.user.id, currentSession.user.user_metadata, currentSession.user.email ?? undefined);

      const { data: newVow, error: vowError } = await supabase
        .from('vows')
        .insert({
          user_id: currentSession.user.id,
          raw_input: vowText,
          refined_text: finalText,
          vow_type: 'self',
          witness_name: witnessName || 'Just me',
          witness_phone: witnessPhone || null,
          witness_invite_token: crypto.randomUUID(),
          stake_amount: stakeAmount * 100,
          consequence,
          destination: stakeAmount > 0 ? destination : 'None',
          status: 'draft' as const,
          starts_at: new Date().toISOString(),
          ends_at: endDate.toISOString(),
        })
        .select()
        .single();

      if (vowError) throw new Error(`Vow creation failed: ${vowError.message}`);
      setVowId(newVow.id);
      setWitnessToken(newVow.witness_invite_token);

      if (stakeAmount === 0) {
        const sealUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/seal-vow`;
        const sealRes = await fetch(sealUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ vow_id: newVow.id }),
        });
        if (!sealRes.ok) {
          const sealData = await sealRes.json().catch(() => null);
          throw new Error(sealData?.error || sealData?.msg || `Seal failed: ${sealRes.status}`);
        }
        resetVow();
        setShowSealAnimation(true);
        setStep('sealed');
        return;
      }

      // Staked vow: save a payment method. No charge now; charge only if the vow breaks.
      const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`;
      const piRes = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ vow_id: newVow.id, amount: stakeAmount * 100 }),
      });
      const piData = await piRes.json().catch(() => null);
      if (!piRes.ok) {
        const detail = piData?.error || piData?.msg || `HTTP ${piRes.status}`;
        throw new Error(`Payment: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
      }
      const secret = piData?.clientSecret || piData?.client_secret;
      if (!secret) throw new Error(`No client secret. Response: ${JSON.stringify(piData)}`);
      setClientSecret(secret);
      setShowPayment(true);
    } catch (err) {
      console.error('Guided seal error:', err);
      setError(err instanceof Error ? err.message : 'Payment setup failed. Please try again.');
    } finally {
      setSealing(false);
    }
  }, [oathChecked, sealing, vowText, formattedText, witnessName, witnessPhone, stakeAmount, consequence, destination, endDate, resetVow]);

  const handlePaymentSuccess = useCallback(async () => {
    setShowPayment(false);
    if (vowId) {
      try {
        const { data: { session: paySession } } = await supabase.auth.getSession();
        const sealToken = paySession?.access_token;
        if (!sealToken) throw new Error('Session expired');
        const sealUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/seal-vow`;
        const sealRes = await fetch(sealUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sealToken}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ vow_id: vowId }),
        });
        if (!sealRes.ok) {
          const sealData = await sealRes.json().catch(() => null);
          throw new Error(sealData?.error || `Seal failed: ${sealRes.status}`);
        }
      } catch (sealErr) {
        console.error('Failed to seal vow:', sealErr);
        setError(sealErr instanceof Error ? sealErr.message : 'Failed to activate vow.');
        return;
      }
    }
    resetVow();
    setShowSealAnimation(true);
    setStep('sealed');
  }, [vowId, resetVow]);

  const handleAuthSuccess = async () => {
    setShowAuth(false);
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (freshSession) { handleSeal(); return; }
      await new Promise((r) => setTimeout(r, 300));
    }
    setError('Session not found after sign-in. Please try again.');
  };

  // Seal animation lifecycle
  useEffect(() => {
    if (step === 'sealed' && showSealAnimation) {
      const skipTimer = setTimeout(() => setSealAnimationSkippable(true), 400);
      const autoAdvance = setTimeout(() => setShowSealAnimation(false), 1150);
      return () => { clearTimeout(skipTimer); clearTimeout(autoAdvance); };
    }
  }, [step, showSealAnimation]);

  const handleSealAnimationTap = () => { if (sealAnimationSkippable) setShowSealAnimation(false); };

  const witnessUrl = witnessToken && typeof window !== 'undefined'
    ? `${window.location.origin}/w/${witnessToken}` : '';
  const isSolo = !witnessName;
  const truncatedVow = formattedText.replace(/\.$/, '').length > 60
    ? formattedText.replace(/\.$/, '').slice(0, 57) + '...'
    : formattedText.replace(/\.$/, '');
  const shareText = stakeAmount > 0
    ? `I made a vow: "${truncatedVow}" — $${stakeAmount} on the line and you're the judge →`
    : `I made a vow: "${truncatedVow}" — and named you the judge →`;

  // Analytics helper
  const trackEvent = useCallback((eventType: string) => {
    if (!vowId) return;
    supabase.from('audit_events').insert({
      vow_id: vowId, event_type: eventType,
      actor_type: 'maker', actor_id: session?.user?.id || null, metadata: {},
    }).then(() => {});
  }, [vowId, session?.user?.id]);

  /* ── Seal animation overlay ─────────────────────────────────── */
  if (step === 'sealed' && showSealAnimation) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8 cursor-pointer"
        style={{ backgroundColor: '#0A0A0F' }}
        onClick={handleSealAnimationTap}
      >
        <div
          className="relative flex items-center justify-center mb-4 animate-scale-in"
          style={{ width: 126, height: 126 }}
        >
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(212,162,79,0.24)' }} />
          <div style={{ position: 'absolute', inset: 13, borderRadius: '50%', border: '1px solid rgba(212,162,79,0.38)' }} />
          <div
            className="flex items-center justify-center"
            style={{
              width: 94,
              height: 94,
              borderRadius: 26,
              background: 'radial-gradient(circle at 30% 22%, #F2C766 0%, #E8B656 30%, #C89B3C 62%, #8B6820 100%)',
              boxShadow: '0 0 0 1px rgba(139,104,32,0.45), 0 18px 50px rgba(200,155,60,0.32)',
            }}
          >
            <CheckCircle className="w-11 h-11" style={{ color: '#1A1205' }} />
          </div>
        </div>
        <p
          className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-center animate-fade-in"
          style={{ color: 'var(--gold)' }}
        >
          Sealed
        </p>
        <h1
          className="text-[38px] font-serif font-normal leading-[40px] text-center mt-3 animate-fade-in"
          style={{ color: 'var(--text)' }}
        >
          Your vow is<br />
          <em style={{ color: 'var(--gold)' }}>bound.</em>
        </h1>
        <div
          className="my-5 animate-fade-in-delayed"
          style={{ width: 92, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,162,79,0.58), transparent)' }}
        />
        <p
          className="text-[20px] font-serif italic leading-[27px] text-center animate-fade-in-delayed"
          style={{ color: 'var(--text)', maxWidth: 300 }}
        >
          &ldquo;{formattedText}&rdquo;
        </p>
        <p
          className="text-[13px] mt-3 animate-fade-in-delayed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {isSolo ? 'Your word is on the line.' : 'Next: send the witness link.'}
        </p>
      </div>
    );
  }

  /* ── Post-seal: share screen ─────────────────────────────────── */
  if (step === 'sealed') {
    return (
      <RitualScreen
        footer={
          <div className="flex flex-col gap-2">
            <PrimaryButton label="The clock starts now" onPress={() => router.push('/live')} />
            <button
              onClick={() => router.push('/quick-vow')}
              className="min-h-[44px] flex items-center justify-center"
            >
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Make another vow</span>
            </button>
          </div>
        }
      >
        <FadeUp>
          <div className="flex justify-center mt-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center animate-scale-in"
              style={{ backgroundColor: 'var(--success-muted)' }}
            >
              <CheckCircle className="w-7 h-7" style={{ color: 'var(--success)' }} />
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="text-center">
            <h1 className="text-[28px] font-bold font-serif" style={{ color: 'var(--text)' }}>
              {isSolo ? 'Sealed.' : 'Your witness needs to see this.'}
            </h1>
            <p className="text-[15px] mt-2" style={{ color: 'var(--text-secondary)' }}>
              {isSolo
                ? "Your vow is locked. You'll judge yourself when the time comes."
                : 'First person to accept holds you to it.'}
            </p>
          </div>
        </FadeUp>

        <FadeUp delay={0.15}>
          <VowPreview text={formattedText} />
        </FadeUp>

        {/* Share CTA */}
        {!isSolo && witnessUrl && (
          <FadeUp delay={0.2}>
            <div className="flex flex-col gap-3">
              <div onClick={() => trackEvent('share_initiated')}>
                <ShareButton url={witnessUrl} text={shareText} buttonText="Share with your witness" />
              </div>
              <div
                className="rounded-[16px] p-3 flex items-center gap-3"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="flex-1 text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>{witnessUrl}</p>
                <div onClick={() => trackEvent('link_copied')}>
                  <CopyLinkButton url={witnessUrl} />
                </div>
              </div>
            </div>
          </FadeUp>
        )}

        {/* Vow details */}
        <FadeUp delay={0.25}>
          <RitualCard>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Witness</span>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {!witnessName ? 'Just me' : witnessName === 'Your witness' ? 'Invite pending' : witnessName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Stake</span>
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>${stakeAmount}</span>
              </div>
              {stakeAmount > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>If broken</span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{destination}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Verdict</span>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {endDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </RitualCard>
        </FadeUp>

        {/* What happens next */}
        <FadeUp delay={0.3}>
          <RitualCard>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>What happens next</span>
            <div className="flex flex-col gap-3">
              {(isSolo
                ? [
                    { n: '1', text: `Live your vow until ${endDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}.` },
                    { n: '2', text: "When time's up, you decide: kept or broken." },
                    { n: '3', text: 'If broken, your stake goes to the cause.' },
                  ]
                : [
                    { n: '1', text: 'Share the link with a friend.' },
                    { n: '2', text: 'They accept and start watching.' },
                    { n: '3', text: 'On verdict day, they call it: kept or broken.' },
                  ]
              ).map(({ n, text }) => (
                <div key={n} className="flex items-start gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--gold)' }}
                  >
                    {n}
                  </div>
                  <span className="text-[14px] leading-5" style={{ color: 'var(--text-secondary)' }}>{text}</span>
                </div>
              ))}
            </div>
          </RitualCard>
        </FadeUp>
      </RitualScreen>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     STEP 1: "What are you committing to?"
     ═══════════════════════════════════════════════════════════════ */
  if (step === 1) {
    return (
      <>
        <RitualScreen
          footer={
            <PrimaryButton
              label="Set the stakes"
              onPress={() => setStep(2)}
              disabled={!vowText.trim()}
            />
          }
        >
          <FadeUp>
            <div className="flex items-center gap-3">
              <div className="flex-1"><ProgressBar step={1} /></div>
              <HamburgerMenu />
            </div>
          </FadeUp>

          <FadeUp delay={0.05}>
            <h1
              className="text-[28px] leading-[34px] font-bold font-serif tracking-[-0.5px]"
              style={{ color: 'var(--text)' }}
            >
              What are you committing to?
            </h1>
          </FadeUp>

          {/* Vow text + deadline */}
          <FadeUp delay={0.1}>
            <RitualCard>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={vowText}
                  onChange={(e) => setVowText(e.target.value)}
                  placeholder="I will..."
                  rows={3}
                  autoFocus
                  className="w-full bg-transparent text-[16px] leading-[24px] outline-none resize-none"
                  style={{ color: 'var(--text)' }}
                />
                {suggestion && suggestion !== vowText && (
                  <button
                    onClick={acceptSuggestion}
                    className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
                    style={{ backgroundColor: 'rgba(212,162,79,0.08)', border: '1px solid rgba(212,162,79,0.2)' }}
                  >
                    <Sparkles className="w-3 h-3" style={{ color: 'var(--gold)' }} />
                    <span className="text-[13px]" style={{ color: 'var(--gold)' }}>
                      {suggestion}
                    </span>
                  </button>
                )}
              </div>

              <div className="h-px my-2" style={{ backgroundColor: 'var(--border)' }} />
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text-muted)' }}>Ends</span>
                <div className="flex flex-wrap">
                  {DEADLINE_PRESETS.map((p) => (
                    <ChoiceChip
                      key={p.label}
                      label={p.label === 'Pick date' ? 'Pick' : p.label}
                      active={deadlineLabel === p.label}
                      onPress={() => handleDeadlineSelect(p.label)}
                    />
                  ))}
                </div>
              </div>
              {showCustomDate && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-transparent text-[15px] outline-none py-2 px-3 rounded-xl"
                  style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
                />
              )}
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                {endDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            </RitualCard>
          </FadeUp>
        </RitualScreen>
      </>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     STEP 2: "What's it worth to you?"
     ═══════════════════════════════════════════════════════════════ */
  if (step === 2) {
    return (
      <>
        <RitualScreen
          footer={
            <PrimaryButton
              label="Seal it"
              onPress={() => setStep(3)}
            />
          }
        >
          <FadeUp>
            <div className="flex items-center gap-3">
              <div className="flex-1"><ProgressBar step={2} /></div>
              <HamburgerMenu />
            </div>
          </FadeUp>

          <FadeUp delay={0.05}>
            <h1
              className="text-[28px] leading-[34px] font-bold font-serif tracking-[-0.5px]"
              style={{ color: 'var(--text)' }}
            >
              What&rsquo;s it worth to you?
            </h1>
          </FadeUp>

          <FadeUp delay={0.1}>
            <RitualCard>
              <div className="flex flex-wrap">
                {STAKE_OPTIONS.map((amt) => (
                  <ChoiceChip
                    key={amt}
                    label={`$${amt}`}
                    active={stakeAmount === amt}
                    onPress={() => setStakeAmount(amt)}
                  />
                ))}
              </div>
              <button
                onClick={() => setStakeAmount(0)}
                className="py-1 transition-opacity hover:opacity-70"
              >
                <span
                  className="text-[13px]"
                  style={{ color: 'var(--text-muted)', opacity: stakeAmount === 0 ? 1 : 0.6 }}
                >
                  {stakeAmount === 0 ? 'Accountability only (no stake)' : 'or go accountability only'}
                </span>
              </button>

              {stakeAmount > 0 && (
                <>
                  <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />

                  <SectionLabel>If you break it</SectionLabel>
                  <p className="text-[15px] leading-[22px]" style={{ color: 'var(--text-secondary)' }}>
                    <span
                      className="font-bold font-serif text-[17px]"
                      style={{ color: 'var(--gold)' }}
                    >
                      ${stakeAmount} goes to {destination}.
                    </span>
                  </p>

                  {/* Toggle: charity / anti-cause */}
                  <div
                    className="flex rounded-xl overflow-hidden"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    <button
                      onClick={() => setConsequence('charity')}
                      className="flex-1 py-2.5 text-center text-[13px] font-semibold transition-colors"
                      style={{
                        backgroundColor: consequence === 'charity' ? 'rgba(212,162,79,0.12)' : 'transparent',
                        color: consequence === 'charity' ? 'var(--gold-bright)' : 'var(--text-muted)',
                      }}
                    >
                      A good cause
                    </button>
                    <button
                      onClick={() => setConsequence('anti')}
                      className="flex-1 py-2.5 text-center text-[13px] font-semibold transition-colors"
                      style={{
                        backgroundColor: consequence === 'anti' ? 'rgba(212,162,79,0.12)' : 'transparent',
                        color: consequence === 'anti' ? 'var(--gold-bright)' : 'var(--text-muted)',
                      }}
                    >
                      An anti-cause
                    </button>
                  </div>

                  <div className="flex flex-wrap">
                    {destinations.map((d) => (
                      <ChoiceChip
                        key={d}
                        label={d}
                        active={destination === d}
                        onPress={() => setDestination(d)}
                      />
                    ))}
                  </div>

                  {consequence === 'anti' && (
                    <p className="text-[12px] italic" style={{ color: 'var(--text-muted)' }}>
                      Maximum pain. Maximum motivation.
                    </p>
                  )}
                </>
              )}
            </RitualCard>
          </FadeUp>

          {/* Back link */}
          <FadeUp delay={0.15}>
            <div className="flex justify-center">
              <button onClick={() => setStep(1)} className="text-[13px] font-medium py-2" style={{ color: 'var(--text-muted)' }}>
                Back
              </button>
            </div>
          </FadeUp>
        </RitualScreen>
      </>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     STEP 3: Review + oath + seal
     ═══════════════════════════════════════════════════════════════ */
  return (
    <>
      <RitualScreen
        footer={
          <div>
            <PrimaryButton
              label="Seal your vow"
              onPress={handleSeal}
              disabled={!oathChecked}
              loading={sealing}
            />
            {stakeAmount > 0 && (
              <p className="text-center text-[12px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                No charge now. Only if you break it.
              </p>
            )}
          </div>
        }
      >
        <FadeUp>
          <div className="flex items-center gap-3">
            <div className="flex-1"><ProgressBar step={3} /></div>
            <HamburgerMenu />
          </div>
        </FadeUp>

        {/* Ceremony display — the vow in gold serif */}
        <FadeUp delay={0.05}>
          <div className="pt-2 pb-1">
            <p
              className="text-[22px] font-serif font-medium leading-[30px] text-center"
              style={{ color: 'var(--gold)', textShadow: '0 0 40px rgba(212,162,79,0.15)' }}
            >
              &ldquo;{formattedText}&rdquo;
            </p>
          </div>
        </FadeUp>

        {/* Witness info line */}
        <FadeUp delay={0.1}>
          <p className="text-[14px] text-center leading-[20px]" style={{ color: 'var(--text-secondary)' }}>
            After you seal, share a link — whoever accepts becomes your judge.
          </p>
        </FadeUp>

        {/* Witness — hero CTA or entered state */}
        <FadeUp delay={0.13}>
          {witnessName ? (
            <div
              className="rounded-[18px] p-4 flex items-center justify-between"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(212,162,79,0.08)', border: '1px solid rgba(212,162,79,0.2)' }}
                >
                  <User className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[15px] font-semibold" style={{ color: 'var(--gold)' }}>{witnessName}</span>
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Your witness</span>
                </div>
              </div>
              <button
                onClick={() => { setWitnessName(''); setWitnessPhone(''); }}
                className="text-[13px] font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                Change
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setWitnessName('Your witness');
                }}
                className="rounded-[18px] p-4 flex items-center gap-4 transition-opacity active:opacity-80"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(212,162,79,0.25)' }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(212,162,79,0.08)', border: '1px solid rgba(212,162,79,0.2)' }}
                >
                  <UserPlus className="w-6 h-6" style={{ color: 'var(--gold)' }} />
                </div>
                <div className="flex flex-col items-start flex-1">
                  <span className="text-[17px] font-bold" style={{ color: 'var(--gold)' }}>Text a friend</span>
                  <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>They&apos;ll decide if you kept your word</span>
                </div>
                <ChevronRight className="w-5 h-5 shrink-0" style={{ color: 'var(--gold)' }} />
              </button>
              <button
                onClick={() => setWitnessName('Just me')}
                className="py-2 transition-opacity hover:opacity-70"
              >
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  No witness — just my word
                </span>
              </button>
            </div>
          )}
        </FadeUp>

        {/* Details card */}
        <FadeUp delay={0.18}>
          <RitualCard>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Stake</span>
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
                  ${stakeAmount}
                </span>
              </div>
              {stakeAmount > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>If broken</span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{destination}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Verdict</span>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {endDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </RitualCard>
        </FadeUp>

        {/* Error */}
        {error && (
          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--danger-muted)' }}>
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        )}

        {/* Oath */}
        <FadeUp delay={0.22}>
          <OathCheckbox
            checked={oathChecked}
            onChange={setOathChecked}
            label="I do solemnly swear to honor this vow and accept the consequences."
          />
        </FadeUp>

        {/* Back link */}
        <FadeUp delay={0.26}>
          <div className="flex justify-center">
            <button onClick={() => setStep(2)} className="text-[13px] font-medium py-2" style={{ color: 'var(--text-muted)' }}>
              Back
            </button>
          </div>
        </FadeUp>
      </RitualScreen>

      <AuthModal
        visible={showAuth}
        onDismiss={() => setShowAuth(false)}
        onSuccess={handleAuthSuccess}
      />

      {clientSecret && showPayment && (
        <PaymentModal
          mode="setup"
          clientSecret={clientSecret}
          onSuccess={handlePaymentSuccess}
          onCancel={async () => {
            setShowPayment(false);
            setSealing(false);
            if (vowId) {
              try {
                const { data: { session: s } } = await supabase.auth.getSession();
                if (s) {
                  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/void-vow`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${s.access_token}`,
                      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                    },
                    body: JSON.stringify({ vow_id: vowId }),
                  });
                }
              } catch {}
              setVowId(null);
            }
          }}
          onSkip={isDevBypass ? async () => {
            setShowPayment(false);
            if (vowId) {
              const { error: updateErr } = await supabase.from('vows').update({
                stripe_payment_intent_id: null,
                stake_amount: 0,
                consequence: 'none',
                destination: 'none',
              }).eq('id', vowId);
              if (updateErr) {
                setError('Could not skip payment. Please try again.');
                return;
              }
              // Seal directly — DB is confirmed updated
              try {
                const { data: { session: s } } = await supabase.auth.getSession();
                if (!s) throw new Error('Session expired');
                const sealRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/seal-vow`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${s.access_token}`,
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                  },
                  body: JSON.stringify({ vow_id: vowId }),
                });
                if (!sealRes.ok) throw new Error('Seal failed');
              } catch (err) {
                console.error('Skip-payment seal error:', err);
                setError('Could not activate your vow. Please try again.');
                return;
              }
            }
            resetVow();
            setShowSealAnimation(true);
            setStep('sealed');
          } : undefined}
        />
      )}
    </>
  );
}

export default function GuidedPage() {
  return (
    <Suspense>
      <GuidedContent />
    </Suspense>
  );
}
