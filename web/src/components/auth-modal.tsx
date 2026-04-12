'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Step = 'pick' | 'email' | 'otp' | 'name';

export function AuthModal({ visible, onDismiss, onSuccess }: { visible: boolean; onDismiss: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<Step>('pick');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (visible) {
      setStep('pick');
      setEmail('');
      setOtp(['', '', '', '', '', '']);
      setDisplayName('');
      setError('');
      setBusy(false);
      setCooldown(0);
    }
  }, [visible]);

  // Listen for auth state changes (Google OAuth return, or magic link clicked as fallback)
  useEffect(() => {
    if (!visible) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const fullName = session.user?.user_metadata?.full_name;
        if (!fullName) {
          setStep('name');
        } else {
          onSuccess();
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [visible, onSuccess]);

  // Escape key to dismiss
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onDismiss]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (!email.trim() || busy) return;
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setBusy(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes('rate limit')
          ? 'Too many attempts. Please wait a minute and try again.'
          : error.message
      );
      return;
    }
    startCooldown();
    setOtp(['', '', '', '', '', '']);
    setStep('otp');
    // Focus first OTP input after render
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const handleGoogleSignIn = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    let returnPath = window.location.pathname;
    if (returnPath === '/') {
      try {
        // Use the pre-determined destination (set by handleContinue)
        const storedPath = localStorage.getItem('auth-return-path');
        if (storedPath) {
          returnPath = storedPath;
        } else {
          // Fallback: check flow state
          const flow = localStorage.getItem('unbreakable-vow-flow');
          if (flow) {
            const parsed = JSON.parse(flow);
            if (parsed.rawInput) returnPath = parsed.refinedText ? '/stake' : '/refine';
          }
        }
      } catch {}
    }
    try { document.cookie = `auth_return_path=${encodeURIComponent(returnPath)}; path=/; max-age=300; SameSite=Lax`; } catch {}
    try {
      const flow = localStorage.getItem('unbreakable-vow-flow');
      if (flow) document.cookie = `vow_flow_backup=${encodeURIComponent(flow)}; path=/; max-age=300; SameSite=Lax`;
    } catch {}
    try { localStorage.setItem('auth-return-path', returnPath); } catch {}
    const callbackUrl = new URL('/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('return_to', returnPath);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setBusy(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes('rate limit')
          ? 'Too many attempts. Please wait a minute and try again.'
          : error.message
      );
      return;
    }
    startCooldown();
    setOtp(['', '', '', '', '', '']);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const handleOtpChange = useCallback((index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    setError('');
    // Auto-advance to next input
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }, []);

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
      return next;
    });
    // Focus the input after the last pasted digit
    const focusIndex = Math.min(digits.length, 5);
    otpRefs.current[focusIndex]?.focus();
  }, []);

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError('');
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'email',
    });
    setBusy(false);
    if (error) {
      setError(error.message.includes('expired') ? 'Code expired. Please request a new one.' : 'Invalid code. Please try again.');
      return;
    }
    // Successful verification — check if name is needed
    const fullName = data.session?.user?.user_metadata?.full_name;
    if (!fullName) {
      setStep('name');
    } else {
      onSuccess();
    }
  };

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (step === 'otp' && otp.every(d => d !== '') && !busy) {
      handleVerifyOtp();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step]);

  const handleSaveName = async () => {
    if (!displayName.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await supabase.auth.updateUser({
        data: { full_name: displayName.trim() },
      });
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.user) {
        await supabase.from('users').upsert(
          { id: s.user.id, display_name: displayName.trim() },
          { onConflict: 'id' },
        );
      }
    } catch {
      // Non-critical — continue even if save fails
    }
    setBusy(false);
    onSuccess();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in" onClick={onDismiss}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-[440px] rounded-t-[28px] p-6 pb-8 safe-bottom animate-slide-up"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-9 h-1 rounded-full" style={{ backgroundColor: 'var(--text-muted)', opacity: 0.4 }} />
        </div>

        {/* Close */}
        <button
          onClick={onDismiss}
          aria-label="Close"
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        </button>

        {step === 'pick' && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-bold font-serif" style={{ color: 'var(--text)' }}>Quick sign-in</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Verify your identity before money goes on the line.
              </p>
            </div>
            <button
              onClick={handleGoogleSignIn}
              disabled={busy}
              className="w-full min-h-[52px] rounded-2xl flex items-center justify-center gap-2.5 transition-opacity active:opacity-80 disabled:opacity-60"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              {busy ? (
                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--text-secondary)', borderTopColor: 'transparent' }} />
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>Continue with Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
            </div>

            <button
              onClick={() => setStep('email')}
              disabled={busy}
              className="w-full min-h-[52px] rounded-2xl flex items-center justify-center gap-2 transition-opacity active:opacity-80 disabled:opacity-60"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <Mail className="w-[18px] h-[18px]" style={{ color: 'var(--gold)' }} />
              <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>Continue with email</span>
            </button>

            {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
          </div>
        )}

        {step === 'email' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('pick')} className="p-1">
                <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text)' }} />
              </button>
              <h2 className="text-xl font-bold font-serif" style={{ color: 'var(--text)' }}>Enter email</h2>
            </div>
            <div
              className="rounded-[18px] p-4 flex flex-col gap-2"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <label className="text-[11px] font-bold tracking-[1.3px] uppercase" style={{ color: 'var(--gold)' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                placeholder="you@example.com"
                autoFocus
                className="bg-transparent text-[17px] outline-none"
                style={{ color: 'var(--text)' }}
              />
            </div>
            {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
            <button
              onClick={handleSendOtp}
              disabled={!email.trim() || busy}
              className="w-full min-h-[52px] rounded-2xl flex items-center justify-center transition-transform active:scale-[0.975] disabled:active:scale-100"
              style={{
                background: !email.trim() || busy ? '#29303C' : 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
              }}
            >
              {busy ? (
                <div className="w-5 h-5 border-2 border-[#0B0D11] border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-[15px] font-extrabold" style={{ color: !email.trim() ? 'var(--text-muted)' : '#0B0D11' }}>
                  Send code
                </span>
              )}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <button onClick={() => { setStep('email'); setError(''); setOtp(['', '', '', '', '', '']); }} className="p-1">
                <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text)' }} />
              </button>
              <div>
                <h2 className="text-xl font-bold font-serif" style={{ color: 'var(--text)' }}>Enter code</h2>
                <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Sent to {email}</p>
              </div>
            </div>

            {/* 6-digit OTP input */}
            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
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
                  className="w-12 h-14 rounded-xl text-center text-[22px] font-bold outline-none transition-all focus:ring-2"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    caretColor: 'var(--gold)',
                    // @ts-expect-error CSS custom property
                    '--tw-ring-color': 'var(--gold)',
                  }}
                />
              ))}
            </div>

            {error && <p className="text-sm text-center" style={{ color: 'var(--danger)' }}>{error}</p>}

            {busy && (
              <div className="flex justify-center">
                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
              </div>
            )}

            <button
              onClick={handleResend}
              disabled={cooldown > 0 || busy}
              className="text-sm font-semibold mx-auto"
              style={{ color: cooldown > 0 ? 'var(--text-muted)' : 'var(--gold)' }}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        )}

        {step === 'name' && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-bold font-serif" style={{ color: 'var(--text)' }}>What should we call you?</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                This is how your name appears to witnesses.
              </p>
            </div>
            <div
              className="rounded-[18px] p-4 flex flex-col gap-2"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <label className="text-[11px] font-bold tracking-[1.3px] uppercase" style={{ color: 'var(--gold)' }}>
                YOUR NAME
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                placeholder="e.g. Alex"
                autoFocus
                className="bg-transparent text-[17px] outline-none"
                style={{ color: 'var(--text)' }}
              />
            </div>
            {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
            <button
              onClick={handleSaveName}
              disabled={!displayName.trim() || busy}
              className="w-full min-h-[52px] rounded-2xl flex items-center justify-center transition-transform active:scale-[0.975] disabled:active:scale-100"
              style={{
                background: !displayName.trim() || busy ? '#29303C' : 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
              }}
            >
              {busy ? (
                <div className="w-5 h-5 border-2 border-[#0B0D11] border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-[15px] font-extrabold" style={{ color: !displayName.trim() ? 'var(--text-muted)' : '#0B0D11' }}>
                  Continue
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
