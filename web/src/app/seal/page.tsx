'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Sparkles, Check, DollarSign } from 'lucide-react';
import { RitualScreen, BackButton, TitleBlock, RitualCard, VowPreview, PrimaryButton, SecondaryButton, FadeUp } from '@/components/ui';
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
  const [smsExpanded, setSmsExpanded] = useState(false);
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
    const isLocal = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
    setIsDevBypass(isLocal);
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
  const draftPromiseRef = useRef<Promise<{ id: string } | null> | null>(null);
  const ensureDraftVow = useCallback(async (): Promise<{ id: string; error?: string } | null> => {
    // Reuse existing draft — but sync current flow state to DB
    // (user may have gone back and changed stake, witness, deadline, etc.)
    if (vow.vowId) {
      const endDate = vow.deadlineIso ? new Date(vow.deadlineIso) : new Date(Date.now() + 7 * 86400000);
      const { data: existing } = await supabase.from('vows')
        .update({
          refined_text: activeVowText,
          witness_name: isSelfWitness ? 'Just me' : vow.witnessName,
          witness_phone: vow.witnessPhone || null,
          stake_amount: vow.stake.amount * 100,
          consequence: vow.stake.consequence,
          destination: vow.stake.destination,
          ends_at: endDate.toISOString(),
        })
        .eq('id', vow.vowId)
        .eq('status', 'draft')
        .select('id')
        .maybeSingle();
      if (existing) return existing;
    }

    // If a draft creation is already in flight, wait for it instead of returning null
    if (draftCreatingRef.current && draftPromiseRef.current) {
      return draftPromiseRef.current;
    }

    draftCreatingRef.current = true;

    const doCreate = async (): Promise<{ id: string; error?: string } | null> => {
      try {
        const { data: { session: s }, error: sessErr } = await supabase.auth.refreshSession();
        if (sessErr || !s) return { id: '', error: 'Not signed in. Please sign in and try again.' };

        await ensurePublicUser(s.user.id, s.user.user_metadata, s.user.email ?? undefined);

        const endDate = vow.deadlineIso ? new Date(vow.deadlineIso) : new Date(Date.now() + 7 * 86400000);
        // Always generate a fresh token to avoid UNIQUE constraint conflicts with old drafts
        const { data: newVow, error: vowError } = await supabase.from('vows').insert({
          user_id: s.user.id,
          raw_input: vow.rawInput,
          refined_text: activeVowText,
          witness_name: isSelfWitness ? 'Just me' : vow.witnessName,
          witness_phone: vow.witnessPhone || null,
          witness_invite_token: crypto.randomUUID(),
          stake_amount: vow.stake.amount * 100,
          consequence: vow.stake.consequence,
          destination: vow.stake.destination,
          status: 'draft',
          starts_at: new Date().toISOString(),
          ends_at: endDate.toISOString(),
        }).select('id, witness_invite_token').single();

        if (vowError) {
          console.error('Draft creation failed:', vowError.message, vowError.details, vowError.hint);
          return { id: '', error: `Vow creation failed: ${vowError.message}` };
        }
        setVowId(newVow.id, newVow.witness_invite_token);
        return newVow;
      } finally {
        draftCreatingRef.current = false;
        draftPromiseRef.current = null;
      }
    };

    const promise = doCreate();
    draftPromiseRef.current = promise;
    return promise;
  }, [vow, activeVowText, isSelfWitness, setVowId]);

  // ── Eagerly create draft on page load when authed (makes witness link live) ──
  useEffect(() => {
    if (isAuthenticated && vow.rawInput && !vow.vowId) {
      ensureDraftVow();
    }
  }, [isAuthenticated, vow.rawInput, vow.vowId, ensureDraftVow]);

  // ── Shared: call seal-vow with silent retries ──
  const callSealVow = useCallback(async (vowId: string, opts?: { skip_payment?: boolean }): Promise<{ ok: boolean; error?: string }> => {
    const maxRetries = 3;
    let lastError = '';
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data: { session: s } } = await supabase.auth.refreshSession();
        if (!s) return { ok: false, error: 'Session expired. Please sign in again.' };
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/seal-vow`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${s.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ vow_id: vowId, ...(opts?.skip_payment ? { skip_payment: true } : {}) }),
        });
        if (res.ok) return { ok: true };
        const data = await res.json().catch(() => null);
        lastError = data?.error || `HTTP ${res.status}`;
        console.error(`Seal attempt ${attempt + 1} failed:`, lastError);
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`Seal attempt ${attempt + 1} error:`, err);
      }
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
    return { ok: false, error: lastError || 'Could not reach server' };
  }, []);

  const createVowAndPay = useCallback(async () => {
    if (sealingRef.current) return;
    sealingRef.current = true;
    setSealing(true);
    try {
      setError('');

      // Always try to refresh the session first for a fresh access token
      const { data: { session: freshSession }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !freshSession) {
        console.warn('Session refresh failed, redirecting to auth:', refreshError?.message);
        setStep('auth');
        sealingRef.current = false;
        setSealing(false);
        return;
      }

      const draft = await ensureDraftVow();
      if (!draft || !draft.id) throw new Error(draft?.error || 'Could not create vow. Please try again.');

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

      // If 401, session is truly dead — force re-auth
      if (piRes.status === 401) {
        console.warn('Edge function returned 401 — forcing re-auth. Detail:', piData);
        await supabase.auth.signOut();
        setError('Session expired — please sign in again.');
        setStep('auth');
        sealingRef.current = false;
        setSealing(false);
        return;
      }

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
      const { data: { session: currentSession }, error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr || !currentSession) {
        console.warn('Session refresh failed in zero-stake seal:', refreshErr?.message);
        setStep('auth');
        sealingRef.current = false;
        setSealing(false);
        return;
      }

      // ensureDraftVow syncs current flow state (including $0 stake) to DB
      const draft = await ensureDraftVow();
      if (!draft || !draft.id) throw new Error(draft?.error || 'Could not create vow. Please try again.');

      const result = await callSealVow(draft.id, { skip_payment: true });
      if (!result.ok) {
        throw new Error(result.error || 'Could not activate your vow. Please try again.');
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
      if (!draft || !draft.id) throw new Error(draft?.error || 'Could not create vow. Please try again.');

      // Mark vow as active directly (simulates successful payment + seal — no fake Stripe IDs)
      await supabase.from('vows').update({
        status: 'active',
        sealed_at: new Date().toISOString(),
      }).eq('id', draft.id);

      // Skip callSealVow — vow is already active. Just run the animation and redirect.
      setStep('sealing');
      setSealAnimPhase(1);
      const t1 = setTimeout(() => setSealAnimPhase(2), 400);
      const t2 = setTimeout(() => setSealAnimPhase(3), 800);
      const t3 = setTimeout(() => {
        setStep('done');
        router.push('/live');
      }, 1400);
      timersRef.current.push(t1, t2, t3);
    } catch (err) {
      console.error('Dev bypass error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSealing(false);
    }
  }, [ensureDraftVow, sealing, router]);

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

    if (vow.vowId) {
      const result = await callSealVow(vow.vowId);
      if (!result.ok) {
        setError(result.error || 'Your payment went through but we couldn\'t finish sealing. Please try again.');
        setStep('review');
        sealingRef.current = false;
        setSealing(false);
        return;
      }
    }

    // Seal animation sequence with cleanup refs
    setSealAnimPhase(1);
    const t1 = setTimeout(() => setSealAnimPhase(2), 400);
    const t2 = setTimeout(() => setSealAnimPhase(3), 800);
    const t3 = setTimeout(() => {
      setStep('done');
      router.push('/live');
    }, 1400);
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
              loading={sealing}
            />
            <SecondaryButton label="Back" onPress={() => router.back()} />
            {isDevBypass && (
              <button
                onClick={handleDevBypass}
                disabled={sealing}
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
            subtitle="No takebacks. No excuses."
          />
        </FadeUp>

        {/* Seal ring */}
        <FadeUp delay={0.1}>
          <div className="flex justify-center my-1">
            <div
              className="w-[48px] h-[48px] rounded-full flex items-center justify-center"
              style={{
                border: '2px solid var(--gold)',
                boxShadow: '0 0 20px rgba(212,162,79,0.2)',
              }}
            >
              <Star className="w-5 h-5" style={{ color: 'var(--gold)' }} />
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

            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 shrink-0" style={{ color: 'var(--gold)' }} />
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>At Stake</span>
                <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{vow.stake.amount > 0 ? `$${vow.stake.amount}` : 'My word'}</span>
              </div>
            </div>

            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{verdictInfo.verdictLabel}</span>
          </RitualCard>
        </FadeUp>

        {/* SMS preview — collapsed with expand */}
        {hasWitnessPhone && (
          <FadeUp delay={0.18}>
            <div
              className="rounded-[16px] p-3.5 flex flex-col gap-2"
              style={{ backgroundColor: 'rgba(212,162,79,0.04)', border: '1px solid rgba(212,162,79,0.15)' }}
            >
              <button
                onClick={() => setSmsExpanded(!smsExpanded)}
                className="flex items-center justify-between gap-3 w-full text-left"
              >
                <span className="text-[13px] leading-[18px]" style={{ color: 'var(--text-secondary)' }}>
                  {vow.witnessName} will get a text with your vow and a link to accept
                </span>
                <span className="text-[12px] font-semibold shrink-0" style={{ color: 'var(--gold)' }}>
                  {smsExpanded ? 'Hide' : 'Preview'}
                </span>
              </button>
              {smsExpanded && (
                <p
                  className="text-[13px] leading-[19px] italic pt-2"
                  style={{ color: 'var(--text-muted)', borderTop: '1px solid rgba(212,162,79,0.1)' }}
                >
                  {smsPreview}
                </p>
              )}
            </div>
          </FadeUp>
        )}

        {error && (
          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--danger-muted)' }}>
            <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        )}

        {vow.stake.amount > 0 && (
          <FadeUp delay={0.2}>
            <p className="text-[12px] text-center" style={{ color: 'var(--text-muted)' }}>
              You'll confirm payment after tapping seal.
            </p>
          </FadeUp>
        )}
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
            // Skip payment: seal as a $0 vow atomically via edge function
            if (!vow.vowId) {
              setError('Could not skip payment. Please try again.');
              sealingRef.current = false;
              setSealing(false);
              return;
            }
            setStep('sealing');
            const result = await callSealVow(vow.vowId, { skip_payment: true });
            if (!result.ok) {
              setError(result.error || 'Could not activate your vow. Please try again.');
              setStep('review');
              sealingRef.current = false;
              setSealing(false);
              return;
            }
            // Success — run seal animation and redirect
            setSealAnimPhase(1);
            const t1 = setTimeout(() => setSealAnimPhase(2), 400);
            const t2 = setTimeout(() => setSealAnimPhase(3), 800);
            const t3 = setTimeout(() => {
              setStep('done');
              router.push('/live');
            }, 1400);
            timersRef.current.push(t1, t2, t3);
          } : undefined}
        />
      )}
    </>
  );
}
