'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, User, DollarSign, Calendar, Scale, Plus } from 'lucide-react';
import {
  RitualScreen, RitualCard, PrimaryButton, ChoiceChip,
  OathCheckbox, VowPreview, SectionLabel, FadeUp,
} from '@/components/ui';
import { AuthModal } from '@/components/auth-modal';
import { PaymentModal } from '@/components/payment-form';
import { useVowFlow } from '@/providers/vow-flow';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import {
  analyzeVow, generateSuggestion, charities, antiCauses,
  consequenceOptions, type ConsequenceType,
} from '@/lib/vow-logic';

const STAKE_OPTIONS = [0, 10, 25, 50, 100];

const DEADLINE_PRESETS = [
  { label: 'This Friday', days: () => { const d = new Date(); const diff = 5 - d.getDay(); return diff <= 0 ? diff + 7 : diff; } },
  { label: 'End of week', days: () => { const d = new Date(); const diff = 7 - d.getDay(); return diff === 0 ? 7 : diff; } },
  { label: 'In 7 days', days: () => 7 },
  { label: 'Pick date', days: () => -1 },
];

interface RecentWitness {
  name: string;
  phone: string;
}

export default function CreatePage() {
  const router = useRouter();
  const { isAuthenticated, session } = useAuth();
  const { vow, setRawInput, setVowType, setTarget, resetVow } = useVowFlow();

  // Form state
  const [vowText, setVowText] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [vowType, setLocalVowType] = useState<'self' | 'challenge'>('self');
  const [witnessName, setWitnessName] = useState('');
  const [witnessPhone, setWitnessPhone] = useState('');
  const [targetName, setTargetName] = useState('');
  const [targetPhone, setTargetPhone] = useState('');
  const [stakeAmount, setStakeAmount] = useState(0);
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Compute suggestion as user types
  useEffect(() => {
    if (vowText.trim().length < 3) {
      setSuggestion('');
      return;
    }
    const analysis = analyzeVow(vowText);
    if (analysis.type === 'vague') {
      setSuggestion(generateSuggestion(vowText));
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
      }
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
      const isChallenge = vowType === 'challenge';

      const { data: newVow, error: vowError } = await supabase
        .from('vows')
        .insert({
          user_id: currentSession.user.id,
          raw_input: vowText,
          refined_text: finalText,
          vow_type: vowType,
          witness_name: isChallenge ? (currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'Maker') : (witnessName || 'Just me'),
          witness_phone: isChallenge ? null : (witnessPhone || null),
          witness_invite_token: crypto.randomUUID(),
          stake_amount: stakeAmount * 100, // cents
          consequence,
          destination: stakeAmount > 0 ? destination : 'None',
          status: 'draft' as const,
          starts_at: new Date().toISOString(),
          ends_at: endDate.toISOString(),
          ...(isChallenge ? {
            target_phone: targetPhone || null,
            challenge_invite_token: crypto.randomUUID(),
            challenge_status: 'pending' as const,
            witness_user_id: currentSession.user.id,
          } : {}),
        })
        .select()
        .single();

      if (vowError) throw new Error(`Vow creation failed: ${vowError.message}`);
      setVowId(newVow.id);

      if (stakeAmount === 0) {
        // $0 vow: call seal-vow directly, no payment
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
          throw new Error(sealData?.error || `Seal failed: ${sealRes.status}`);
        }
        resetVow();
        router.push('/dashboard');
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
        const detail = piData?.error || `HTTP ${piRes.status}`;
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
  }, [oathChecked, sealing, vowText, formattedText, vowType, witnessName, witnessPhone, targetName, targetPhone, stakeAmount, consequence, destination, endDate, resetVow, router]);

  const handlePaymentSuccess = useCallback(async () => {
    setShowPayment(false);
    if (vowId) {
      try {
        const { data: { session: sealSession } } = await supabase.auth.refreshSession();
        const sealUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/seal-vow`;
        await fetch(sealUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sealSession?.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ vow_id: vowId }),
        });
      } catch (sealErr) {
        console.error('Failed to seal vow:', sealErr);
      }
    }
    resetVow();
    router.push(`/certificate/${vowId}`);
  }, [vowId, resetVow, router]);

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

  return (
    <>
      <RitualScreen
        footer={
          <PrimaryButton
            label={stakeAmount > 0 ? `Seal vow & pay $${stakeAmount}` : 'Seal this vow'}
            onPress={handleSeal}
            disabled={!oathChecked || !vowText.trim()}
            loading={sealing}
          />
        }
      >
        {/* Back to Dashboard */}
        <FadeUp>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 py-2"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Dashboard</span>
          </button>
        </FadeUp>

        {/* Title */}
        <FadeUp delay={0.05}>
          <h1
            className="text-[28px] leading-[34px] font-bold font-serif tracking-[-0.5px]"
            style={{ color: 'var(--text)' }}
          >
            New Vow
          </h1>
        </FadeUp>

        {/* Vow text input */}
        <FadeUp delay={0.1}>
          <RitualCard>
            <SectionLabel>What are you committing to?</SectionLabel>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={vowText}
                onChange={(e) => setVowText(e.target.value)}
                placeholder="e.g. Go to the gym 3x this week"
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
          </RitualCard>
        </FadeUp>

        {/* Vow type toggle */}
        <FadeUp delay={0.15}>
          <RitualCard>
            <SectionLabel>Who is this vow for?</SectionLabel>
            <div className="flex flex-wrap">
              <ChoiceChip label="Me" active={vowType === 'self'} onPress={() => setLocalVowType('self')} />
              <ChoiceChip label="Someone else" active={vowType === 'challenge'} onPress={() => setLocalVowType('challenge')} />
            </div>
          </RitualCard>
        </FadeUp>

        {/* Witness / Target section */}
        <FadeUp delay={0.2}>
          <RitualCard>
            {vowType === 'self' ? (
              <>
                <SectionLabel>Witness (optional)</SectionLabel>
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
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={witnessName}
                      onChange={(e) => setWitnessName(e.target.value)}
                      placeholder="Witness name"
                      className="w-full bg-transparent text-[15px] outline-none py-2 px-3 rounded-xl"
                      style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
                    />
                    <input
                      type="tel"
                      value={witnessPhone}
                      onChange={(e) => setWitnessPhone(e.target.value)}
                      placeholder="Phone number"
                      className="w-full bg-transparent text-[15px] outline-none py-2 px-3 rounded-xl"
                      style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <SectionLabel>Who are you challenging?</SectionLabel>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    placeholder="Their name"
                    className="w-full bg-transparent text-[15px] outline-none py-2 px-3 rounded-xl"
                    style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
                  />
                  <input
                    type="tel"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    placeholder="Their phone number"
                    className="w-full bg-transparent text-[15px] outline-none py-2 px-3 rounded-xl"
                    style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
                  />
                </div>
              </>
            )}
          </RitualCard>
        </FadeUp>

        {/* Stake */}
        <FadeUp delay={0.25}>
          <RitualCard>
            <SectionLabel>Stake</SectionLabel>
            <div className="flex flex-wrap">
              {STAKE_OPTIONS.map((amt) => (
                <ChoiceChip
                  key={amt}
                  label={amt === 0 ? '$0 (free)' : `$${amt}`}
                  active={stakeAmount === amt}
                  onPress={() => setStakeAmount(amt)}
                />
              ))}
            </div>

            {stakeAmount > 0 && (
              <>
                <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
                <SectionLabel>If you break your vow, money goes to...</SectionLabel>
                <div className="flex flex-wrap">
                  {consequenceOptions.map((opt) => (
                    <ChoiceChip
                      key={opt.id}
                      label={opt.label}
                      active={consequence === opt.id}
                      onPress={() => setConsequence(opt.id)}
                    />
                  ))}
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
              </>
            )}
          </RitualCard>
        </FadeUp>

        {/* Deadline */}
        <FadeUp delay={0.3}>
          <RitualCard>
            <SectionLabel>Deadline</SectionLabel>
            <div className="flex flex-wrap">
              {DEADLINE_PRESETS.map((p) => (
                <ChoiceChip
                  key={p.label}
                  label={p.label}
                  active={deadlineLabel === p.label}
                  onPress={() => handleDeadlineSelect(p.label)}
                />
              ))}
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
              Ends {endDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </RitualCard>
        </FadeUp>

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
                    {vowType === 'challenge' ? `Challenge: ${targetName || '...'}` : (witnessName || 'Just me')}
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
          onCancel={() => { setShowPayment(false); setSealing(false); }}
          onSkip={async () => {
            if (vowId) {
              await supabase.from('vows').update({
                stripe_payment_intent_id: null,
                stake_amount: 0,
              }).eq('id', vowId);
            }
            handlePaymentSuccess();
          }}
        />
      )}
    </>
  );
}
