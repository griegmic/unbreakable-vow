'use client';
import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, User, DollarSign, Calendar, Scale, Plus, CheckCircle } from 'lucide-react';
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
  type ConsequenceType,
} from '@/lib/vow-logic';

/** Ensure a public.users row exists before inserting a vow (foreign key requirement). */
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

interface RecentWitness {
  name: string;
  phone: string;
}

function CreatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, session } = useAuth();
  const { resetVow } = useVowFlow();

  // Pre-populate from URL params (e.g. "Double down" from vow-broken page)
  const initialText = searchParams.get('text') || '';
  const initialStake = parseInt(searchParams.get('stake') || '0', 10);

  // Form state
  const [vowText, setVowText] = useState(initialText);
  const [suggestion, setSuggestion] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [witnessPhone, setWitnessPhone] = useState('');
  const [stakeAmount, setStakeAmount] = useState(
    STAKE_OPTIONS.includes(initialStake) ? initialStake : 10
  );
  const [consequence, setConsequence] = useState<ConsequenceType>('charity');
  const [destination, setDestination] = useState('ALS Association');
  const [deadlineLabel, setDeadlineLabel] = useState('In 7 days');
  const [customDate, setCustomDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [oathChecked, setOathChecked] = useState(false);
  const [recentWitnesses, setRecentWitnesses] = useState<RecentWitness[]>([]);
  const [showNewWitness, setShowNewWitness] = useState(false);

  // Seal state
  const [sealing, setSealing] = useState(false);
  const [error, setError] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [vowId, setVowId] = useState<string | null>(null);
  const [witnessToken, setWitnessToken] = useState<string | null>(null);
  const [sealed, setSealed] = useState(false);
  const [showSealAnimation, setShowSealAnimation] = useState(false);
  const [sealAnimationSkippable, setSealAnimationSkippable] = useState(false);
  const [isDevBypass, setIsDevBypass] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const isLocal = window.location.hostname === 'localhost';
    setIsDevBypass(isLocal);
  }, []);

  // Compute suggestion as user types.
  // Strip time-window suffixes from the generated suggestion since the deadline
  // is always selected separately via the date picker shown below the input.
  useEffect(() => {
    if (vowText.trim().length < 3) {
      setSuggestion('');
      return;
    }
    const analysis = analyzeVow(vowText);
    if (analysis.type === 'vague') {
      setSuggestion(stripTimeSuffix(generateSuggestion(vowText)));
    } else {
      setSuggestion('');
    }
  }, [vowText]);

  // Load recent witnesses from DB
  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('vows')
        .select('witness_name, witness_phone')
        .eq('user_id', session.user.id)
        .not('witness_name', 'eq', 'Just me')
        .not('witness_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) {
        const seen = new Set<string>();
        const unique: RecentWitness[] = [];
        for (const row of data) {
          const key = `${row.witness_name}|${row.witness_phone || ''}`;
          if (!seen.has(key) && row.witness_name) {
            seen.add(key);
            unique.push({ name: row.witness_name, phone: row.witness_phone || '' });
          }
          if (unique.length >= 5) break;
        }
        setRecentWitnesses(unique);
        // Pre-select last witness for returning users
        if (unique.length > 0 && !witnessName) {
          setWitnessName(unique[0].name);
          setWitnessPhone(unique[0].phone);
        }
      }

      // Smart defaults
      try {
        const saved = localStorage.getItem('quickvow-defaults');
        if (saved) {
          const defaults = JSON.parse(saved);
          if (defaults.stakeAmount !== undefined) setStakeAmount(defaults.stakeAmount);
          if (defaults.consequence) setConsequence(defaults.consequence);
          if (defaults.deadlineLabel) setDeadlineLabel(defaults.deadlineLabel);
        }
      } catch {}
    })();
  }, [session?.user?.id]);

  // Compute end date
  const endDate = useMemo(() => {
    if (showCustomDate && customDate) {
      return new Date(customDate + 'T23:59:59');
    }
    const preset = DEADLINE_PRESETS.find((p) => p.label === deadlineLabel);
    if (!preset) { const f = new Date(); f.setDate(f.getDate() + 7); f.setHours(23, 59, 59, 0); return f; }
    const days = preset.days();
    if (days === -1) { const f = new Date(); f.setDate(f.getDate() + 7); f.setHours(23, 59, 59, 0); return f; }
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 59, 0);
    return d;
  }, [deadlineLabel, customDate, showCustomDate]);

  const destinations = consequence === 'charity' ? charities : antiCauses;

  // Ensure destination is valid for selected consequence type
  useEffect(() => {
    const list = consequence === 'charity' ? charities : antiCauses;
    if (!list.includes(destination)) {
      setDestination(list[0]);
    }
  }, [consequence, destination]);

  const activeText = suggestion || vowText;
  const formattedText = activeText.trim().charAt(0).toUpperCase() + activeText.trim().slice(1);

  const handleDeadlineSelect = (label: string) => {
    setDeadlineLabel(label);
    if (label === 'Pick date') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
      setCustomDate('');
    }
  };

  const acceptSuggestion = () => {
    if (suggestion) {
      setVowText(suggestion);
      setSuggestion('');
    }
  };

  // Seal logic
  const handleSeal = useCallback(async () => {
    if (!oathChecked || sealing) return;
    setError('');

    // refreshSession() ensures a fresh access token — getSession() returns cached
    // tokens that may have expired during the multi-step vow creation flow.
    const { data: { session: currentSession } } = await supabase.auth.refreshSession();
    if (!currentSession) {
      setShowAuth(true);
      return;
    }

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
          stake_amount: stakeAmount * 100, // cents
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
        // $0 vow: call seal-vow directly, no payment
        // Use the access token from the session we already refreshed above
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
        try { localStorage.setItem('quickvow-defaults', JSON.stringify({ stakeAmount, consequence, deadlineLabel })); } catch {}
        resetVow();
        setShowSealAnimation(true);
        setSealed(true);
        return;
      }

      // Staked vow: create payment intent
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
      console.error('Create error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSealing(false);
    }
  }, [oathChecked, sealing, vowText, formattedText, witnessName, witnessPhone, stakeAmount, consequence, destination, endDate, resetVow, router]);

  const handlePaymentSuccess = useCallback(async () => {
    setShowPayment(false);
    try { localStorage.setItem('quickvow-defaults', JSON.stringify({ stakeAmount, consequence, deadlineLabel })); } catch {}
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
    setSealed(true);
  }, [vowId, resetVow]);

  const handleAuthSuccess = async () => {
    setShowAuth(false);
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (freshSession) {
        handleSeal();
        return;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    setError('Session not found after sign-in. Please try again.');
  };

  const witnessUrl = witnessToken && typeof window !== 'undefined'
    ? `${window.location.origin}/w/${witnessToken}`
    : '';
  const isSolo = !witnessName;
  const truncatedVow = formattedText.replace(/\.$/, '').length > 60
    ? formattedText.replace(/\.$/, '').slice(0, 57) + '...'
    : formattedText.replace(/\.$/, '');
  const shareText = stakeAmount > 0
    ? `I made a vow: "${truncatedVow}" — $${stakeAmount} on the line and you're the judge →`
    : `I made a vow: "${truncatedVow}" — and named you the judge →`;

  // Analytics helper (fire-and-forget)
  const trackEvent = useCallback((eventType: string) => {
    if (!vowId) return;
    supabase.from('audit_events').insert({
      vow_id: vowId,
      event_type: eventType,
      actor_type: 'maker',
      actor_id: session?.user?.id || null,
      metadata: {},
    }).then(() => {});
  }, [vowId, session?.user?.id]);

  // Seal animation lifecycle
  useEffect(() => {
    if (sealed && showSealAnimation) {
      const skipTimer = setTimeout(() => setSealAnimationSkippable(true), 500);
      const autoAdvance = setTimeout(() => setShowSealAnimation(false), 1800);
      return () => { clearTimeout(skipTimer); clearTimeout(autoAdvance); };
    }
  }, [sealed, showSealAnimation]);

  const handleSealAnimationTap = () => {
    if (sealAnimationSkippable) setShowSealAnimation(false);
  };

  // Seal animation overlay
  if (sealed && showSealAnimation) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8 cursor-pointer"
        style={{ backgroundColor: '#0A0A0F' }}
        onClick={handleSealAnimationTap}
      >
        <p
          className="text-[22px] font-serif font-medium leading-[30px] text-center animate-fade-in"
          style={{ color: 'var(--gold)', textShadow: '0 0 40px rgba(212,162,79,0.3)' }}
        >
          &ldquo;{formattedText}&rdquo;
        </p>
        <p
          className="text-[17px] font-semibold mt-6 animate-fade-in-delayed"
          style={{ color: 'var(--text)', opacity: 0.9 }}
        >
          No turning back.
        </p>
      </div>
    );
  }

  if (sealed) {
    const handleResetForAnother = () => {
      setSealed(false);
      setShowSealAnimation(false);
      setSealAnimationSkippable(false);
      setVowId(null);
      setWitnessToken(null);
      setClientSecret(null);
      setVowText('');
      setSuggestion('');
      setWitnessName('');
      setWitnessPhone('');
      setShowNewWitness(false);
      setOathChecked(false);
      setError('');
    };

    return (
      <RitualScreen
        footer={
          <div className="flex flex-col gap-2">
            {isSolo ? (
              <PrimaryButton label="The clock starts now" onPress={() => router.push('/live')} />
            ) : (
              <PrimaryButton label="The clock starts now" onPress={() => router.push('/live')} />
            )}
            <button
              onClick={handleResetForAnother}
              className="min-h-[44px] flex items-center justify-center"
            >
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Make another vow</span>
            </button>
          </div>
        }
      >
        <FadeUp>
          <div className="flex items-center justify-between">
            <div />
            <HamburgerMenu />
          </div>
        </FadeUp>

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

        {/* Share CTA — sole primary action when witness exists */}
        {!isSolo && witnessUrl && (
          <FadeUp delay={0.2}>
            <div className="flex flex-col gap-3">
              <div onClick={() => trackEvent('share_initiated')}>
                <ShareButton
                  url={witnessUrl}
                  text={shareText}
                  buttonText={`Send to ${witnessName}`}
                />
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

        {/* Vow details card */}
        <FadeUp delay={0.25}>
          <RitualCard>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Witness</span>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {witnessName || 'Just me'}
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

        {/* What happens next — migrated from /sent */}
        <FadeUp delay={0.3}>
          <RitualCard>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>What happens next</span>
            <div className="flex flex-col gap-3">
              {[
                { n: '1', text: isSolo ? 'Live your vow for the next 7 days.' : 'Your witness taps the link to accept.' },
                { n: '2', text: isSolo ? "When time's up, you decide: kept or broken." : 'Live your vow. They\'re watching.' },
                { n: '3', text: isSolo ? 'If broken, your stake goes to the cause.' : 'On verdict day, they call it: kept or broken.' },
              ].map(({ n, text }) => (
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

  return (
    <>
      <RitualScreen
        footer={
          <div>
            <PrimaryButton
              label="Seal this vow"
              onPress={handleSeal}
              disabled={!oathChecked || !vowText.trim()}
              loading={sealing}
            />
            {stakeAmount > 0 && (
              <p className="text-center text-[12px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                ${stakeAmount} held until verdict
              </p>
            )}
          </div>
        }
      >
        {/* Header */}
        <FadeUp>
          <div className="flex items-center justify-between">
            <h1
              className="text-[28px] leading-[34px] font-bold font-serif tracking-[-0.5px]"
              style={{ color: 'var(--text)' }}
            >
              New Vow
            </h1>
            <HamburgerMenu />
          </div>
        </FadeUp>

        {/* Vow text input */}
        <FadeUp delay={0.1}>
          <RitualCard>
            <SectionLabel>Your vow</SectionLabel>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={vowText}
                onChange={(e) => setVowText(e.target.value)}
                placeholder="I will..."
                rows={3}
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

            {/* Inline deadline */}
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

        {/* Witness section */}
        <FadeUp delay={0.15}>
          <RitualCard>
            <SectionLabel>Your witness</SectionLabel>
            {recentWitnesses.length > 0 && !showNewWitness && (
              <div className="flex flex-wrap">
                {recentWitnesses.map((w) => (
                  <ChoiceChip
                    key={w.name + w.phone}
                    label={w.name}
                    active={witnessName === w.name && witnessPhone === w.phone}
                    onPress={() => { setWitnessName(w.name); setWitnessPhone(w.phone); setShowNewWitness(false); }}
                  />
                ))}
                <ChoiceChip
                  label="+ New"
                  active={showNewWitness}
                  onPress={() => { setShowNewWitness(true); setWitnessName(''); setWitnessPhone(''); }}
                />
              </div>
            )}
            {(showNewWitness || recentWitnesses.length === 0) && (
              <input
                type="text"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                placeholder="Name your witness"
                className="w-full bg-transparent text-[15px] outline-none py-2 px-3 rounded-xl"
                style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
              />
            )}
          </RitualCard>
        </FadeUp>

        {/* Dare a friend link — only for returning users */}
        {recentWitnesses.length > 0 && (
          <FadeUp delay={0.18}>
            <div className="flex justify-center">
              <button
                onClick={() => router.push('/cast')}
                className="text-[13px] font-semibold py-2"
                style={{ color: 'var(--gold)' }}
              >
                or <span className="underline">dare a friend →</span>
              </button>
            </div>
          </FadeUp>
        )}

        {/* Stake */}
        <FadeUp delay={0.25}>
          <RitualCard>
            <SectionLabel>Stake</SectionLabel>
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

                {/* Toggle: A good cause / An anti-cause */}
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

                {/* Destination chips */}
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

                {/* Flavor text — anti-cause only */}
                {consequence === 'anti' && (
                  <p className="text-[12px] italic" style={{ color: 'var(--text-muted)' }}>
                    Maximum pain. Maximum motivation.
                  </p>
                )}
              </>
            )}
          </RitualCard>
        </FadeUp>

        {/* Deadline card removed — merged into vow text card above */}

        {/* Preview */}
        {vowText.trim() && (
          <FadeUp delay={0.35}>
            <RitualCard>
              <SectionLabel>Preview</SectionLabel>
              <VowPreview text={formattedText} />
              <div className="grid grid-cols-2 gap-2 text-[13px]">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {witnessName || 'Just me'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
                  <span style={{ color: 'var(--gold)' }}>${stakeAmount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {stakeAmount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{destination}</span>
                  </div>
                )}
              </div>
            </RitualCard>
          </FadeUp>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--danger-muted)' }}>
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        )}

        {/* Oath */}
        <FadeUp delay={0.4}>
          <OathCheckbox
            checked={oathChecked}
            onChange={setOathChecked}
            label="I solemnly swear to honor this vow and accept the consequences."
          />
        </FadeUp>

        {/* Guided flow link */}
        <FadeUp delay={0.45}>
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/?guided=1')}
              className="text-[13px] font-medium underline py-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Use guided flow instead
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
          clientSecret={clientSecret}
          onSuccess={handlePaymentSuccess}
          onCancel={async () => {
            setShowPayment(false);
            setSealing(false);
            // Void the orphaned draft vow to prevent leaks
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
            // Testing bypass: seal without capturing payment
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
            try { localStorage.setItem('quickvow-defaults', JSON.stringify({ stakeAmount, consequence, deadlineLabel })); } catch {}
            resetVow();
            setShowSealAnimation(true);
            setSealed(true);
          } : undefined}
        />
      )}
    </>
  );
}

export default function CreatePage() {
  return (
    <Suspense>
      <CreatePageContent />
    </Suspense>
  );
}
