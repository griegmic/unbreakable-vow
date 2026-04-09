'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Step = 'pick' | 'email' | 'otp';

export function AuthModal({ visible, onDismiss, onSuccess }: { visible: boolean; onDismiss: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<Step>('pick');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setStep('pick');
      setEmail('');
      setOtp('');
      setError('');
      setBusy(false);
      setCooldown(0);
    }
  }, [visible]);

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
    setStep('otp');
    setTimeout(() => otpInputRef.current?.focus(), 100);
  };

  const handleVerifyOtp = async (code: string) => {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSuccess();
  };

  const handleOtpChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setOtp(cleaned);
    if (cleaned.length === 6) {
      handleVerifyOtp(cleaned);
    }
  };

  const handleGoogleSignIn = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    // Save current path so the auth callback can return here after OAuth
    try { localStorage.setItem('auth-return-path', window.location.pathname); } catch {}
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
      },
    });
    // If we get here, the redirect didn't happen (error case)
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
              <button onClick={() => { setStep('email'); setOtp(''); setError(''); }} className="p-1">
                <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text)' }} />
              </button>
              <div>
                <h2 className="text-xl font-bold font-serif" style={{ color: 'var(--text)' }}>Enter code</h2>
                <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Sent to {email}</p>
              </div>
            </div>

            {/* OTP Boxes */}
            <div className="relative">
              <div className="flex gap-2 justify-center">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-[42px] h-[50px] rounded-xl flex items-center justify-center text-[22px] font-bold"
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: `1.5px solid ${i === otp.length ? 'var(--gold-bright)' : otp[i] ? 'var(--border-strong)' : 'var(--border)'}`,
                      color: 'var(--text)',
                    }}
                  >
                    {otp[i] || ''}
                  </div>
                ))}
              </div>
              <input
                ref={otpInputRef}
                type="tel"
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="Enter 6-digit verification code"
                value={otp}
                onChange={(e) => handleOtpChange(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full"
                autoFocus
              />
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
      </div>
    </div>
  );
}
