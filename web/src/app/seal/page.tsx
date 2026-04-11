'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Sparkles, Check, User, DollarSign, Calendar, Scale } from 'lucide-react';
import { RitualScreen, BackButton, TitleBlock, RitualCard, VowPreview, PrimaryButton, SecondaryButton, OathCheckbox, FadeUp } from '@/components/ui';
import { AuthModal } from '@/components/auth-modal';
import { PaymentModal } from '@/components/payment-form';
import { useVowFlow } from '@/providers/vow-flow';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { getVowVerdictDate } from '@/lib/vow-logic';

type SealStep = 'review' | 'auth' | 'payment' | 'sealing' | 'done';

/** Ensure a public.users row exists before inserting a vow (foreign key requirement). */
async function ensurePublicUser(userId: string, meta?: Record<string, unknown>, email?: string) {
  await supabase.from('users').upsert(
    { id: userId, display_name: (meta?.full_name as string) || email?.split('@')[0] || null },
    { onConflict: 'id', ignoreDuplicates: true },
  );
}

export default function SealPage() {
  const router = useRouter();
  const { vow, activeVowText, isSelfWitness, setVowId } = useVowFlow();
  const { isAuthenticated, session } = useAuth();
  const [oathChecked, setOathChecked] = useState(false);
  const [step, setStep] = useState<SealStep>('review');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [sealAnimPhase, setSealAnimPhase] = useState(0);
  const [sealing, setSealing] = useState(false);
  const sealingRef = useRef(false);
  const [isDevBypass, setIsDevBypass] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const verdictInfo = getVowVerdictDate(activeVowText, vow.deadlineIso);

  const hasWitnessPhone = !isSelfWitness && !!vow.witnessPhone;
  const displayName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || null;
  const smsPreview = (() => {
    if (!hasWitnessPhone) return '';
    const senderName = displayName || 'You';
    const stakeText = vow.stake.amount > 0
      ? `with $${vow.stake.amount} on the line`
      : 'accountability only — no money, just their word';
    const vowPreview = activeVowText.length > 100
      ? activeVowText.substring(0, 97) + '...'
      : activeVowText;
    return `${senderName} just made an Unbreakable Vow: "${vowPreview}" — ${stakeText}. You're the witness.`;
  })();

  const sealLabel = hasWitnessPhone ? `Seal & text ${vow.witnessName}` : 'Seal this vow';

  useEffect(() => {
    setIsDevBypass(window.location.hostname === 'localhost');
  }, []);

  // Clean up seal animation timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!vow.rawInput) {
      // Double-check localStorage directly — context might not have hydrated yet
      try {
        const stored = localStorage.getItem('unbreakable-vow-flow');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.rawInput) return; // state exists, context will catch up
        }
      } catch {}
      router.replace('/');
    }
  }, [vow.rawInput, router]);

  // ── Shared: ensure a draft vow row exists ──
  const draftCreatingRef = useRef(false);
  const ensureDraftVow = useCallback(async (): Promise<{ id: string } | null> => {
    // Reuse existing draft
    if (vow.vowId) {
      const { data: existing } = await supabase.from('vows')
        .select('id')
        .eq('id', vow.vowId)
        .eq('status', 'draft')
        .maybeSingle();
      if (existing) return existing;
    }

    if (draftCreatingRef.current) return null;
    draftCreatingRef.current = true;

    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) return null;

      await ensurePublicUser(s.user.id, s.user.user_metadata, s.user.email ?? undefined);

      const endDate = vow.deadlineIso ? new Date(vow.deadlineIso) : new Date(Date.now() + 7 * 86400000);
      const { data: newVow, error: vowError } = await supabase.from('vows').insert({
        user_id: s.user.id,
        raw_input: vow.rawInput,
        refined_text: activeVowText,
        witness_name: isSelfWitness ? 'Just me' : vow.witnessName,
        witness_phone: vow.witnessPhone || null,
        witness_invite_token: vow.witnessInviteToken || crypto.randomUUID(),
        stake_amount: vow.stake.amount * 100,
        consequence: vow.stake.consequence,
        destination: vow.stake.destination,
        status: 'draft',
        starts_at: new Date().toISOString(),
        ends_at: endDate.toISOString(),
      }).select('id, witness_invite_token').single();

      if (vowError) { console.error('Draft creation failed:', vowError.message); return null; }
      setVowId(newVow.id, newVow.witness_invite_token);
      return newVow;
    } finally {
      draftCreatingRef.current = false;
    }
  }, [vow, activeVowText, isSelfWitness, setVowId]);

  // ── Eagerly create draft on page load when authed (makes witness link live) ──
  useEffect(() => {
    if (isAuthenticated && vow.rawInput && !vow.vowId) {
      ensureDraftVow();
    }
  }, [isAuthenticated, vow.rawInput, vow.vowId, ensureDraftVow]);

  // ── Shared: call seal-vow with silent retries ──
  const callSealVow = useCallback(async (vowId: string): Promise<boolean> => {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data: { session: s } } = await supabase.auth.refreshSession();
        if (!s) return false;
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/seal-vow`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${s.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ vow_id: vowId }),
        });
        if (res.ok) return true;
        const data = await res.json().catch(() => null);
        console.error(`Seal attempt ${attempt + 1} failed:`, data?.error || res.status);
      } catch (err) {
        console.error(`Seal attempt ${attempt + 1} error:`, err);
      }
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
    return false;
  }, []);

  const createVowAndPay = useCallback(async () => {
    if (sealingRef.current) return;
    sealingRef.current = true;
    setSealing(true);
    try {
      setError('');
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        setStep('auth');
        sealingRef.current = false;
        setSealing(false);
        return;
      }

      const draft = await ensureDraftVow();
      if (!draft) throw new Error('Could not create vow. Please try again.');

      // Refresh session for fresh access token
      const { data: { session: freshSession } } = await supabase.auth.refreshSession();
      if (!freshSession) {
        setStep('auth');
        sealingRef.current = false;
        setSealing(false);
        return;
      }

      const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`;
      const piRes = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freshSession.access_token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ vow_id: draft.id, amount: vow.stake.amount * 100 }),
      });

      const piData = await piRes.json().catch(() => null);

      if (!piRes.ok) {
        const detail = piData?.error || `HTTP ${piRes.status}`;
        throw new Error(`Payment: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
      }

      const secret = piData?.clientSecret || piData?.client_secret;
      if (!secret) {
        throw new Error(`No client secret. Response: ${JSON.stringify(piData)}`);
      }

      setClientSecret(secret);
      setStep('payment');
    } catch (err) {
      console.error('Seal error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      sealingRef.current = false;
      setSealing(false);
    }
  }, [vow, ensureDraftVow]);

  const handleZeroStakeSeal = useCallback(async () => {
    if (sealingRef.current) return;
    sealingRef.current = true;
    setSealing(true);
    try {
      setError('');
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        setStep('auth');
        sealingRef.current = false;
        setSealing(false);
        return;
      }

      // For $0 vows, update the draft to have zero stake before sealing
      const draft = await ensureDraftVow();
      if (!draft) throw new Error('Could not create vow. Please try again.');

      // Ensure stake is $0 on the draft
      await supabase.from('vows').update({
        stake_amount: 0,
        consequence: 'none',
        destination: 'none',
      }).eq('id', draft.id).eq('status', 'draft');

      const sealed = await callSealVow(draft.id);
      if (!sealed) {
        throw new Error('Could not activate your vow. Please try again.');
      }
      router.push('/live');
    } catch (err) {
      console.error('Zero-stake seal error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      sealingRef.current = false;
      setSealing(false);
    }
  }, [vow, ensureDraftVow, callSealVow, router]);

  const handleSealTap = () => {
    if (!oathChecked) return;
    if (!isAuthenticated) {
      setStep('auth');
    } else if (vow.stake.amount === 0) {
      handleZeroStakeSeal();
    } else {
      createVowAndPay();
    }
  };

  const handleDevBypass = useCallback(async () => {
    if (sealing) return;
    setSealing(true);
    try {
      setError('');
      const draft = await ensureDraftVow();
      if (!draft) throw new Error('Could not create vow. Please try again.');

      // Mark vow as active directly (simulates successful payment + seal — no fake Stripe IDs)
      await supabase.from('vows').update({
        status: 'active',
        sealed_at: new Date().toISOString(),
      }).eq('id', draft.id);

      handlePaymentSuccess();
    } catch (err) {
      console.error('Dev bypass error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSealing(false);
    }
  }, [ensureDraftVow, sealing]);

  const handleAuthSuccess = async () => {
    setStep('review');
    // Poll for session — OAuth callback may not have propagated yet
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (freshSession) {
        // Eagerly create draft so witness link resolves immediately
        await ensureDraftVow();
        if (vow.stake.amount === 0) {
          handleZeroStakeSeal();
        } else {
          createVowAndPay();
        }
        return;
      }
      await new Promise(r => setTimeout(r, 300));
    }
    setError('Session not found after sign-in. Please try again.');
  };

  const handlePaymentSuccess = async () => {
    setStep('sealing');

    // Silent retry: payment succeeded, so seal optimistically with retries
    if (vow.vowId) {
      const sealed = await callSealVow(vow.vowId);
      if (!sealed) {
        console.error('All seal retries failed after payment — cron will recover');
      }
    }

    // Seal animation sequence with cleanup refs
    setSealAnimPhase(1);
    const t1 = setTimeout(() => setSealAnimPhase(2), 800);
    const t2 = setTimeout(() => setSealAnimPhase(3), 1600);
    const t3 = setTimeout(() => {
      setStep('done');
      router.push('/sent');
    }, 3800);
    timersRef.current.push(t1, t2, t3);
  };

  if (step === 'sealing') {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-6">
          {/* Seal ring */}
          <div
            className="w-[100px] h-[100px] rounded-full flex items-center justify-center transition-all duration-500"
            style={{
              border: `3px solid ${sealAnimPhase >= 1 ? 'var(--success)' : 'var(--gold)'}`,
              boxShadow: `0 0 ${sealAnimPhase >= 1 ? 40 : 20}px ${sealAnimPhase >= 1 ? 'rgba(82,214,154,0.4)' : 'rgba(212,162,79,0.3)'}`,
              transform: sealAnimPhase === 1 ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {sealAnimPhase < 2 ? (
              <Star className="w-10 h-10" style={{ color: 'var(--gold)' }} />
            ) : (
              <div className="animate-scale-in">
                <Check className="w-10 h-10" style={{ color: 'var(--success)' }} />
              </div>
            )}
          </div>

          {/* Flash text */}
          {sealAnimPhase >= 2 && (
            <p
              className="text-center text-[22px] font-serif max-w-[280px] animate-fade-in"
              style={{ color: 'var(--gold)' }}
            >
              {activeVowText ? `"${activeVowText}"` : 'Your vow is sealed.'}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <RitualScreen
        footer={
          <>
            <PrimaryButton
              label={sealLabel}
              onPress={handleSealTap}
              disabled={!oathChecked}
              loading={sealing}
            />
            <SecondaryButton label="Back" onPress={() => router.back()} />
            {isDevBypass && (
              <button
                onClick={handleDevBypass}
                disabled={!oathChecked || sealing}
                className="min-h-[44px] w-full flex items-center justify-center gap-2 text-sm font-medium rounded-xl transition-opacity disabled:opacity-30"
                style={{ color: 'var(--gold)', border: '1px dashed var(--gold)', background: 'rgba(212,162,79,0.06)' }}
              >
                Skip payment (testing)
              </button>
            )}
          </>
        }
      >
        <FadeUp><BackButton /></FadeUp>

        {isDevBypass && (
          <div className="rounded-lg px-3 py-1.5 flex items-center justify-center gap-1.5" style={{ backgroundColor: 'rgba(212,162,79,0.08)', border: '1px dashed rgba(212,162,79,0.3)' }}>
            <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--gold)' }}>Testing mode — localhost</span>
          </div>
        )}

        <FadeUp delay={0.05}>
          <TitleBlock
            title="Your Unbreakable Vow"
            subtitle="Once you seal it, there's no going back."
          />
        </FadeUp>

        {/* Seal ring */}
        <FadeUp delay={0.1}>
          <div className="flex justify-center my-2">
            <div
              className="w-[100px] h-[100px] rounded-full flex items-center justify-center"
              style={{
                border: '2px solid var(--gold)',
                boxShadow: '0 0 30px rgba(212,162,79,0.25)',
              }}
            >
              <Star className="w-8 h-8" style={{ color: 'var(--gold)' }} />
            </div>
          </div>
        </FadeUp>

        {/* Vow summary card */}
        <FadeUp delay={0.15}>
          <RitualCard>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
              <span className="text-[11px] font-bold tracking-[1.3px] uppercase" style={{ color: 'var(--gold)' }}>THE VOW</span>
            </div>
            <p className="text-xl font-semibold font-serif" style={{ color: 'var(--text)' }}>
              {activeVowText}
            </p>

            <div className="h-px my-1" style={{ backgroundColor: 'var(--border)' }} />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <div>
                  <span className="text-[11px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                    {isSelfWitness ? 'Accountability' : 'Witness'}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {isSelfWitness ? 'Just me' : vow.witnessName}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 shrink-0" style={{ color: 'var(--gold)' }} />
                <div>
                  <span className="text-[11px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>At Stake</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>${vow.stake.amount}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <div>
                  <span className="text-[11px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>Duration</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{verdictInfo.range}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <div>
                  <span className="text-[11px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>If Broken</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{vow.stake.destination}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{verdictInfo.verdictLabel}</span>
            </div>
          </RitualCard>
        </FadeUp>

        {/* SMS preview — what the witness will receive */}
        {hasWitnessPhone && (
          <FadeUp delay={0.18}>
            <div
              className="rounded-[16px] p-4 flex flex-col gap-2"
              style={{ backgroundColor: 'rgba(212,162,79,0.04)', border: '1px solid rgba(212,162,79,0.15)' }}
            >
              <span className="text-[10px] font-bold tracking-[1.2px] uppercase" style={{ color: 'var(--gold)' }}>
                TEXT TO {vow.witnessName.toUpperCase()}
              </span>
              <p className="text-[14px] leading-[20px] italic" style={{ color: 'var(--text-secondary)' }}>
                {smsPreview}
              </p>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Includes a link to accept or decline
              </span>
            </div>
          </FadeUp>
        )}

        {error && (
          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--danger-muted)' }}>
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        )}

        <FadeUp delay={0.2}>
          <OathCheckbox
            checked={oathChecked}
            onChange={setOathChecked}
            label="I solemnly swear to honor this vow and accept the consequences."
          />
        </FadeUp>
      </RitualScreen>

      <AuthModal
        visible={step === 'auth'}
        onDismiss={() => setStep('review')}
        onSuccess={handleAuthSuccess}
      />

      {clientSecret && step === 'payment' && (
        <PaymentModal
          clientSecret={clientSecret}
          onSuccess={handlePaymentSuccess}
          onCancel={() => { setStep('review'); setSealing(false); }}
          onSkip={isDevBypass ? async () => {
            // Testing bypass: seal the vow without capturing payment.
            // Clear the Stripe PI so verdict logic won't try to refund it.
            if (vow.vowId) {
              await supabase.from('vows').update({
                stripe_payment_intent_id: null,
                stake_amount: 0,
              }).eq('id', vow.vowId);
            }
            handlePaymentSuccess();
          } : undefined}
        />
      )}
    </>
  );
}
