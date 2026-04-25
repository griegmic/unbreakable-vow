'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Check } from 'lucide-react';
import { RitualScreen, GoldCTA, MutedSecondary } from '@/components/primitives';
import { PaymentModal } from '@/components/payment-form';
import { HamburgerMenu } from '@/components/hamburger-menu';
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

/** Format a raw digit string as (xxx) xxx-xxxx */
function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function SealPage() {
  const router = useRouter();
  const { vow, activeVowText, isSelfWitness, setVowId } = useVowFlow();
  const { isAuthenticated, session, loading: authLoading } = useAuth();
  const [step, setStep] = useState<SealStep>('review');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [sealAnimPhase, setSealAnimPhase] = useState(0);
  const [sealing, setSealing] = useState(false);
  const sealingRef = useRef(false);
  const [isDevBypass, setIsDevBypass] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Phone auth state
  const [phone, setPhone] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const verdictInfo = getVowVerdictDate(activeVowText, vow.deadlineIso);

  const witnessName = isSelfWitness ? 'Just me' : (vow.witnessName || 'Witness');
  const sealLabel = isAuthenticated ? 'Seal this vow' : 'Seal this vow';

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
    if (authLoading) return;
    if (!vow.rawInput) {
      try {
        const stored = localStorage.getItem('unbreakable-vow-flow');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.rawInput) return;
        }
      } catch {}
      router.replace('/');
    }
  }, [vow.rawInput, router, authLoading]);

  // ── Shared: ensure a draft vow row exists ──
  const draftCreatingRef = useRef(false);
  const draftPromiseRef = useRef<Promise<{ id: string } | null> | null>(null);
  const ensureDraftVow = useCallback(async (): Promise<{ id: string; error?: string } | null> => {
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

    if (draftCreatingRef.current && draftPromiseRef.current) {
      return draftPromiseRef.current;
    }

    draftCreatingRef.current = true;

    const doCreate = async (): Promise<{ id: string; error?: string } | null> => {
      try {
        // Try getSession first (works for freshly-created sessions like phone OTP),
        // fall back to refreshSession if the token might be stale.
        let s = (await supabase.auth.getSession()).data.session;
        if (!s) {
          const { data, error: sessErr } = await supabase.auth.refreshSession();
          s = data.session;
          if (sessErr || !s) return { id: '', error: 'Not signed in. Please sign in and try again.' };
        }

        await ensurePublicUser(s.user.id, s.user.user_metadata, s.user.email ?? undefined);

        const endDate = vow.deadlineIso ? new Date(vow.deadlineIso) : new Date(Date.now() + 7 * 86400000);
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

  // ── Eagerly create draft on page load when authed ──
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
        // Proactively refresh session before each seal attempt to prevent token expiry
        await supabase.auth.refreshSession();
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!s) return { ok: false, error: 'Session expired. Please sign in again.' };
        const { error: sealError } = await supabase.functions.invoke('seal-vow', {
          body: { vow_id: vowId, ...(opts?.skip_payment ? { skip_payment: true } : {}) },
        });
        if (!sealError) return { ok: true };
        let detail = sealError.message;
        try {
          if (typeof (sealError as any).context?.json === 'function') {
            const body = await (sealError as any).context.json();
            detail = body?.error || body?.message || detail;
          }
        } catch {}
        lastError = detail;
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

      // Proactively refresh session before payment flow to prevent token expiry
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      const currentSession = refreshed?.session ?? (await supabase.auth.getSession()).data.session;
      if (!currentSession || refreshErr) {
        // Session truly gone — force re-auth
        setError('');
        setStep('auth');
        sealingRef.current = false;
        setSealing(false);
        return;
      }

      const draft = await ensureDraftVow();
      if (!draft || !draft.id) throw new Error(draft?.error || 'Could not create vow. Please try again.');

      const { data: siData, error: siError } = await supabase.functions.invoke('save-card', {
        body: { vow_id: draft.id },
      });

      if (siError) {
        let detail = siError.message;
        try {
          if (typeof (siError as any).context?.json === 'function') {
            const body = await (siError as any).context.json();
            detail = body?.error || body?.message || detail;
          } else if (typeof (siError as any).context?.text === 'function') {
            const text = await (siError as any).context.text();
            detail = text || detail;
          }
        } catch {}

        if (detail?.includes('Unauthorized') || detail?.includes('JWT') || detail?.includes('401')) {
          setError('Session expired — please sign in again.');
          setStep('auth');
          sealingRef.current = false;
          setSealing(false);
          return;
        }
        throw new Error(`Payment: ${detail}`);
      }

      const secret = siData?.clientSecret || siData?.client_secret;
      if (!secret) {
        throw new Error(`No client secret. Response: ${JSON.stringify(siData)}`);
      }

      setClientSecret(secret);
      setStep('payment');
    } catch (err) {
      console.error('Seal error:', err);
      setError(err instanceof Error ? err.message : 'Payment setup failed. Please try again.');
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
      // Proactively refresh session before zero-stake seal
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      const currentSession = refreshed?.session ?? (await supabase.auth.getSession()).data.session;
      if (!currentSession || refreshErr) {
        setStep('auth');
        sealingRef.current = false;
        setSealing(false);
        return;
      }

      const draft = await ensureDraftVow();
      if (!draft || !draft.id) throw new Error(draft?.error || 'Could not create vow. Please try again.');

      const result = await callSealVow(draft.id, { skip_payment: true });
      if (!result.ok) {
        throw new Error(result.error || 'Could not activate your vow. Please try again.');
      }
      router.push('/sent');
    } catch (err) {
      console.error('Zero-stake seal error:', err);
      setError(err instanceof Error ? err.message : 'Could not seal your vow. Please try again.');
      sealingRef.current = false;
      setSealing(false);
    }
  }, [vow, ensureDraftVow, callSealVow, router]);

  const handleSealTap = async () => {
    if (authLoading) return;
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

      await supabase.from('vows').update({
        status: 'active',
        sealed_at: new Date().toISOString(),
      }).eq('id', draft.id);

      setStep('sealing');
      setSealAnimPhase(1);
      const t1 = setTimeout(() => setSealAnimPhase(2), 400);
      const t2 = setTimeout(() => setSealAnimPhase(3), 800);
      const t3 = setTimeout(() => {
        setStep('done');
        router.push('/sent');
      }, 1400);
      timersRef.current.push(t1, t2, t3);
    } catch (err) {
      console.error('Dev bypass error:', err);
      setError(err instanceof Error ? err.message : 'Dev bypass failed. Check console for details.');
      setSealing(false);
    }
  }, [ensureDraftVow, sealing, router]);

  const handleAuthSuccess = async () => {
    setStep('review');
    // Poll for session availability after auth callback
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      // Try refresh first to ensure we have a fresh token
      await supabase.auth.refreshSession();
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (freshSession) {
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

    setSealAnimPhase(1);
    const t1 = setTimeout(() => setSealAnimPhase(2), 400);
    const t2 = setTimeout(() => setSealAnimPhase(3), 800);
    const t3 = setTimeout(() => {
      setStep('done');
      router.push('/sent');
    }, 1400);
    timersRef.current.push(t1, t2, t3);
  };

  // ── Phone auth: Google OAuth trigger ──
  const triggerGoogleOAuth = useCallback(async () => {
    // Store return path everywhere — belt AND suspenders
    const returnPath = '/seal';
    try { document.cookie = `auth_return_path=${encodeURIComponent(returnPath)}; path=/; max-age=600; SameSite=Lax`; } catch {}
    try { localStorage.setItem('auth-return-path', returnPath); } catch {}
    try { sessionStorage.setItem('auth-return-path', returnPath); } catch {}
    try {
      const flow = localStorage.getItem('unbreakable-vow-flow');
      if (flow) document.cookie = `vow_flow_backup=${encodeURIComponent(flow)}; path=/; max-age=600; SameSite=Lax`;
    } catch {}

    const callbackUrl = new URL('/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('return_to', returnPath);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });
    if (error) {
      setPhoneError(error.message);
      setPhoneBusy(false);
    }
  }, []);

  // ── Cooldown timer for OTP resend ──
  const startCooldown = useCallback(() => {
    setOtpCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setOtpCooldown((c) => {
        if (c <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  // Clean up cooldown on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // ── Phone "Continue" handler — send OTP ──
  const handlePhoneContinue = useCallback(async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setPhoneError('Please enter a valid 10-digit phone number.');
      return;
    }
    setPhoneError('');
    setPhoneBusy(true);

    // Check if already authenticated (auth may have loaded late)
    const { data: { session: existingSession } } = await supabase.auth.getSession();
    if (existingSession) {
      window.location.reload();
      return;
    }

    const formattedPhone = `+1${digits}`;
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
    setPhoneBusy(false);

    if (otpError) {
      console.warn('Phone OTP failed:', otpError.message);
      if (otpError.message?.toLowerCase().includes('rate')) {
        setPhoneError('Too many attempts. Please wait a minute and try again.');
      } else {
        setPhoneError(otpError.message || 'Failed to send code. Please try again.');
      }
      return;
    }

    // OTP sent — show verification UI
    startCooldown();
    setOtp(['', '', '', '', '', '']);
    setPhoneStep('otp');
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  }, [phone, startCooldown]);

  // ── OTP verification ──
  const handleVerifyOtp = useCallback(async (code?: string) => {
    const codeStr = code || otp.join('');
    if (codeStr.length !== 6 || phoneBusy) return;
    setPhoneBusy(true);
    setPhoneError('');

    const digits = phone.replace(/\D/g, '');
    const formattedPhone = `+1${digits}`;
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: codeStr,
      type: 'sms',
    });
    setPhoneBusy(false);

    if (verifyError) {
      setPhoneError(verifyError.message?.includes('expired')
        ? 'Code expired. Please request a new one.'
        : 'Invalid code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      return;
    }

    // Save phone to public.users
    if (data.user) {
      await supabase.from('users').upsert(
        { id: data.user.id, display_name: formattedPhone, phone: formattedPhone },
        { onConflict: 'id' },
      );
    }

    // Auth success — trigger the seal flow
    handleAuthSuccess();
  }, [otp, phone, phoneBusy]);

  // ── OTP input handlers ──
  const handleOtpChange = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      // Auto-submit when all 6 digits entered
      if (digit && next.every(d => d !== '')) {
        setTimeout(() => handleVerifyOtp(next.join('')), 50);
      }
      return next;
    });
    setPhoneError('');
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }, [handleVerifyOtp]);

  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const digits = pasted.split('');
    setOtp((prev) => {
      const next = [...prev];
      digits.forEach((d, i) => { next[i] = d; });
      if (next.every(d => d !== '')) {
        setTimeout(() => handleVerifyOtp(next.join('')), 50);
      }
      return next;
    });
    const focusIndex = Math.min(digits.length, 5);
    otpRefs.current[focusIndex]?.focus();
  }, [handleVerifyOtp]);

  const handleResendOtp = useCallback(async () => {
    if (otpCooldown > 0 || phoneBusy) return;
    setPhoneBusy(true);
    setPhoneError('');
    const digits = phone.replace(/\D/g, '');
    const { error } = await supabase.auth.signInWithOtp({ phone: `+1${digits}` });
    setPhoneBusy(false);
    if (error) {
      setPhoneError(error.message?.toLowerCase().includes('rate')
        ? 'Too many attempts. Please wait a minute.'
        : error.message);
      return;
    }
    startCooldown();
    setOtp(['', '', '', '', '', '']);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  }, [otpCooldown, phoneBusy, phone, startCooldown]);

  // ── Phone input handler with formatting ──
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(raw);
    setPhoneError('');
  };

  // ── Sealing animation ──
  if (step === 'sealing') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--uv-bg)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          {/* Seal ring */}
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `3px solid ${sealAnimPhase >= 1 ? 'var(--uv-success)' : 'var(--uv-gold)'}`,
              boxShadow: `0 0 ${sealAnimPhase >= 1 ? 40 : 20}px ${sealAnimPhase >= 1 ? 'rgba(82,214,154,0.4)' : 'rgba(212,162,79,0.3)'}`,
              transform: sealAnimPhase === 1 ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 500ms',
            }}
          >
            {sealAnimPhase < 2 ? (
              <Star style={{ width: 40, height: 40, color: 'var(--uv-gold)' }} />
            ) : (
              <Check style={{ width: 40, height: 40, color: 'var(--uv-success)', animation: 'uv-scale-in 300ms ease' }} />
            )}
          </div>

          {/* Flash text */}
          {sealAnimPhase >= 2 && (
            <p
              style={{
                textAlign: 'center',
                fontSize: 22,
                fontFamily: 'var(--uv-font-serif)',
                maxWidth: 280,
                color: 'var(--uv-gold)',
                animation: 'uv-fade-in 400ms ease',
              }}
            >
              {activeVowText ? `\u201C${activeVowText}\u201D` : 'Your vow is sealed.'}
            </p>
          )}
        </div>
        <style>{`
          @keyframes uv-scale-in { from { transform: scale(0); } to { transform: scale(1); } }
          @keyframes uv-fade-in { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    );
  }

  // ── Format deadline for review card ──
  const deadlineLabel = vow.deadlineIso
    ? new Date(vow.deadlineIso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '7 days';

  // ── NOT AUTHENTICATED: all-in-one seal page ──
  if (!isAuthenticated && !authLoading) {
    return (
      <RitualScreen>
        <style>{`
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus {
            -webkit-box-shadow: 0 0 0 30px var(--uv-bg-input, #10141C) inset !important;
            -webkit-text-fill-color: var(--uv-text, #F6F7FB) !important;
            caret-color: var(--uv-text, #F6F7FB);
          }
        `}</style>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Hero */}
          <h1 style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 26, fontWeight: 600,
            color: 'var(--uv-text)', margin: '0 0 6px', textAlign: 'center',
          }}>
            {phoneStep === 'otp' ? 'Enter the code.' : 'Almost done.'}
          </h1>
          <p style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 14,
            color: 'var(--uv-text-muted)', margin: '0 0 24px', textAlign: 'center',
          }}>
            {phoneStep === 'otp'
              ? `We texted a 6-digit code to (${phone.slice(0,3)}) ${phone.slice(3,6)}-${phone.slice(6)}`
              : 'Enter your number to seal.'}
          </p>

          {phoneStep === 'otp' ? (
            /* ── OTP VERIFICATION ── */
            <>
              {/* 6-digit OTP input */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }} onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                    style={{
                      width: 48, height: 56, borderRadius: 12,
                      textAlign: 'center', fontSize: 22, fontWeight: 700,
                      backgroundColor: 'var(--uv-bg-input, #10141C)',
                      border: `1.5px solid ${otp.filter(d => d).length === i ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
                      color: 'var(--uv-text)',
                      outline: 'none',
                      caretColor: 'var(--uv-gold)',
                    }}
                  />
                ))}
              </div>

              <p style={{
                fontSize: 12, fontFamily: 'var(--uv-font-sans)',
                color: 'var(--uv-text-faint)', textAlign: 'center', margin: '4px 0 16px',
              }}>
                Auto-fills from your texts on iOS.
              </p>

              {phoneError && (
                <p style={{ fontSize: 13, color: 'var(--uv-danger)', margin: '0 0 8px', textAlign: 'center', fontFamily: 'var(--uv-font-sans)' }}>{phoneError}</p>
              )}

              {phoneBusy && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                  <div style={{ width: 20, height: 20, border: '2px solid var(--uv-gold)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, margin: '8px 0' }}>
                <button
                  onClick={handleResendOtp}
                  disabled={otpCooldown > 0 || phoneBusy}
                  style={{
                    background: 'none', border: 'none', cursor: otpCooldown > 0 ? 'default' : 'pointer',
                    fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 600,
                    color: otpCooldown > 0 ? 'var(--uv-text-faint)' : 'var(--uv-gold)',
                    padding: '8px 0',
                  }}
                >
                  {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend code'}
                </button>
              </div>

              <button
                onClick={() => { setPhoneStep('input'); setPhoneError(''); setOtp(['', '', '', '', '', '']); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--uv-font-sans)', fontSize: 12,
                  color: 'var(--uv-text-faint)', padding: '4px 0',
                  textAlign: 'center',
                }}
              >
                Use a different number
              </button>

              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </>
          ) : (
            /* ── PHONE INPUT ── */
            <>
              {/* Review card */}
              <div style={{
                background: 'var(--uv-bg-elev)',
                border: '1px solid var(--uv-border-strong)',
                borderRadius: 14,
                padding: '16px 18px',
                marginBottom: 20,
              }}>
                <span style={{
                  fontFamily: 'var(--uv-font-sans)', fontSize: 10, fontWeight: 500,
                  letterSpacing: '2px', textTransform: 'uppercase',
                  color: 'var(--uv-text-faint)',
                }}>
                  I VOW TO
                </span>
                <p style={{
                  fontFamily: 'var(--uv-font-serif)', fontSize: 18,
                  fontStyle: 'italic', color: 'var(--uv-text)',
                  margin: '6px 0 12px', lineHeight: 1.3,
                }}>
                  {activeVowText}
                </p>
                <div style={{ height: 1, background: 'var(--uv-border-strong)', margin: '0 0 12px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-text-faint)', display: 'block' }}>STAKE</span>
                    <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 16, fontWeight: 600, color: 'var(--uv-gold)' }}>${vow.stake.amount}</span>
                  </div>
                  <div>
                    <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-text-faint)', display: 'block' }}>JUDGE</span>
                    <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 14, color: 'var(--uv-text)' }}>{witnessName === 'TBD' || witnessName === 'Witness' ? 'You decide' : witnessName}</span>
                  </div>
                  <div>
                    <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--uv-text-faint)', display: 'block' }}>BY</span>
                    <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 14, color: 'var(--uv-text)' }}>{deadlineLabel}</span>
                  </div>
                </div>
              </div>

              {/* Phone input */}
              <div
                style={{
                  display: 'flex', alignItems: 'center',
                  background: 'var(--uv-bg-input, #10141C)',
                  border: '1px solid var(--uv-border-strong)',
                  borderRadius: 14, padding: '0 16px',
                  transition: 'border-color 200ms',
                  marginBottom: 6,
                }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 15, fontFamily: 'var(--uv-font-sans)', color: 'var(--uv-text-muted)',
                  paddingRight: 10, borderRight: '1px solid var(--uv-border-strong)',
                  marginRight: 10, whiteSpace: 'nowrap', userSelect: 'none',
                }}>
                  <span role="img" aria-label="US flag">&#x1F1FA;&#x1F1F8;</span>
                  <span>+1</span>
                </span>
                <input
                  type="tel" inputMode="numeric" autoComplete="tel-national"
                  placeholder="(555) 867-5309"
                  value={formatPhoneDisplay(phone)}
                  onChange={handlePhoneChange}
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePhoneContinue(); }}
                  onFocus={(e) => { const w = e.target.closest('div'); if (w) (w as HTMLElement).style.borderColor = 'var(--uv-gold)'; }}
                  onBlur={(e) => { const w = e.target.closest('div'); if (w) (w as HTMLElement).style.borderColor = 'var(--uv-border-strong)'; }}
                  style={{
                    flex: 1, border: 'none', outline: 'none', background: 'transparent',
                    fontSize: 16, fontFamily: 'var(--uv-font-sans)', color: 'var(--uv-text)',
                    padding: '14px 0', WebkitAppearance: 'none',
                  }}
                />
              </div>

              {phoneError && (
                <p style={{ fontSize: 13, color: 'var(--uv-danger)', margin: '4px 0 0', fontFamily: 'var(--uv-font-sans)' }}>{phoneError}</p>
              )}

              <p style={{
                fontSize: 12, fontFamily: 'var(--uv-font-sans)',
                color: 'var(--uv-text-faint)', margin: '4px 0 0',
              }}>
                We&apos;ll text you a code. No password ever.
              </p>

              {error && (
                <div style={{ borderRadius: 10, padding: 12, backgroundColor: 'var(--uv-danger-bg)', marginTop: 12 }}>
                  <p style={{ fontSize: 13, color: 'var(--uv-danger)', margin: 0 }}>{error}</p>
                </div>
              )}

              {/* Trust lines */}
              <p style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 13,
                color: 'var(--uv-success)', textAlign: 'center',
                margin: '24px 0 4px',
              }}>
                Keep your word, get every cent back
              </p>
              <p style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 11,
                color: 'var(--uv-text-faint)', textAlign: 'center',
                margin: '0 0 16px',
              }}>
                No charge unless you break your vow
              </p>

              {/* Seal CTA */}
              <GoldCTA
                label={phoneBusy ? 'Sending...' : `Seal my vow${vow.stake.amount > 0 ? ` — $${vow.stake.amount}` : ''}`}
                onPress={handlePhoneContinue}
                disabled={phoneBusy}
              />

              {/* Google fallback */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                <button
                  onClick={triggerGoogleOAuth}
                  disabled={phoneBusy}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--uv-font-sans)', fontSize: 12,
                    color: 'var(--uv-text-faint)', padding: '8px 0',
                    opacity: phoneBusy ? 0.3 : 0.5,
                  }}
                >
                  or sign in with Google
                </button>
              </div>
            </>
          )}
        </div>
      </RitualScreen>
    );
  }

  // ── AUTHENTICATED: review + payment flow ──
  return (
    <>
      {isAuthenticated && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 50 }}>
          <HamburgerMenu />
        </div>
      )}
      <RitualScreen>
        {/* Progress indicator */}
        <p style={{ fontSize: 11, fontFamily: 'var(--uv-font-sans)', color: 'var(--uv-text-faint)', marginBottom: 8 }}>
          5 / 5
        </p>

        {isDevBypass && (
          <div style={{ borderRadius: 8, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: 'rgba(212,162,79,0.08)', border: '1px dashed rgba(212,162,79,0.3)', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: 'var(--uv-gold)' }}>Testing mode</span>
          </div>
        )}

        {/* Hero */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 28, fontWeight: 400, color: 'var(--uv-text)', margin: 0, marginBottom: 6 }}>
            Almost done.
          </h1>
          <p style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 14, color: 'var(--uv-text-muted)', margin: 0 }}>
            One tap to seal.
          </p>
        </div>

        {/* Review card */}
        <div
          style={{
            background: 'var(--uv-bg-elev)',
            border: '1px solid var(--uv-border-strong)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 20,
          }}
        >
          {/* Vow label + text */}
          <p style={{ fontSize: 11, fontFamily: 'var(--uv-font-sans)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--uv-text-faint)', margin: '0 0 4px' }}>
            I VOW TO
          </p>
          <p style={{ fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--uv-text)', margin: '0 0 10px', lineHeight: 1.4 }}>
            {activeVowText}
          </p>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--uv-border-strong)', margin: '10px 0' }} />

          {/* 3-col grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <p style={{ fontSize: 10, fontFamily: 'var(--uv-font-sans)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--uv-text-faint)', margin: '0 0 2px' }}>STAKE</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-gold)', margin: 0 }}>
                {vow.stake.amount > 0 ? `$${vow.stake.amount}` : 'My word'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, fontFamily: 'var(--uv-font-sans)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--uv-text-faint)', margin: '0 0 2px' }}>JUDGE</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--uv-text)', margin: 0 }}>
                {witnessName}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, fontFamily: 'var(--uv-font-sans)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--uv-text-faint)', margin: '0 0 2px' }}>BY</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--uv-text)', margin: 0 }}>
                {deadlineLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ borderRadius: 10, padding: 12, backgroundColor: 'var(--uv-danger-bg, rgba(220,50,50,0.08))', marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--uv-danger, #dc3232)', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* CTA area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
          <GoldCTA
            label={sealing ? 'Sealing...' : sealLabel}
            onPress={handleSealTap}
            disabled={sealing}
          />
          <MutedSecondary label="Back" onPress={() => router.push('/create')} />

          {isDevBypass && (
            <button
              onClick={handleDevBypass}
              disabled={sealing}
              style={{
                minHeight: 44,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 12,
                color: 'var(--uv-gold)',
                border: '1px dashed var(--uv-gold)',
                background: 'rgba(212,162,79,0.06)',
                cursor: sealing ? 'not-allowed' : 'pointer',
                opacity: sealing ? 0.3 : 1,
              }}
            >
              Skip payment (testing)
            </button>
          )}
        </div>

        {/* Fine print */}
        {vow.stake.amount > 0 && (
          <p style={{ fontSize: 11, textAlign: 'center', color: 'var(--uv-text-faint)', marginTop: 12 }}>
            No charge unless you break your vow
          </p>
        )}
        <p style={{ fontSize: 10, textAlign: 'center', color: 'var(--uv-text-faint)', marginTop: 8, opacity: 0.6, lineHeight: 1.5 }}>
          By signing in, you agree to receive transactional SMS (verification codes, vow updates). Your witness will receive a text when you seal. Reply STOP to opt out anytime.
        </p>
      </RitualScreen>

      {clientSecret && step === 'payment' && (
        <PaymentModal
          mode="setup"
          clientSecret={clientSecret}
          amount={vow.stake.amount}
          onSuccess={handlePaymentSuccess}
          onCancel={() => { setStep('review'); sealingRef.current = false; setSealing(false); }}
          onSkip={isDevBypass ? async () => {
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
            setSealAnimPhase(1);
            const t1 = setTimeout(() => setSealAnimPhase(2), 400);
            const t2 = setTimeout(() => setSealAnimPhase(3), 800);
            const t3 = setTimeout(() => {
              setStep('done');
              router.push('/sent');
            }, 1400);
            timersRef.current.push(t1, t2, t3);
          } : undefined}
        />
      )}
    </>
  );
}
