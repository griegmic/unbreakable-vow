'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Check, DollarSign, Hand, ShieldCheck } from 'lucide-react';
import { RitualScreen, TitleBlock, RitualCard, PrimaryButton, OathCheckbox, FadeUp, HeaderBadge } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types';

type Vow = Database['public']['Tables']['vows']['Row'];
type VerdictChoice = 'kept' | 'broken' | null;
type ViewState = 'choose' | 'confirm' | 'done';

export default function SelfResolvePage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [vow, setVow] = useState<Vow | null>(null);
  const [loading, setLoading] = useState(true);
  const [sworn, setSworn] = useState(false);
  const [choice, setChoice] = useState<VerdictChoice>(null);
  const [view, setView] = useState<ViewState>('choose');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }

    const fetchVow = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase.from('vows')
        .select('*')
        .eq('user_id', session.user.id)
        .in('status', ['active', 'awaiting_verdict'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) {
        router.replace('/live');
        return;
      }

      setVow(data);
      setLoading(false);
    };

    fetchVow();
  }, [isAuthenticated, authLoading, router]);

  const handleChoose = (verdict: VerdictChoice) => {
    if (!sworn) return;
    setChoice(verdict);
    setView('confirm');
    setError('');
  };

  const handleConfirm = async () => {
    if (!choice || busyRef.current || !vow) return;
    busyRef.current = true;
    setBusy(true);
    setError('');

    try {
      const response = await supabase.functions.invoke('submit-verdict', {
        body: { token: vow.witness_invite_token, verdict: choice },
      });

      const fnError = response.error;
      const fnData = response.data;

      if (fnError) {
        const detail = fnData?.error || fnError.message || 'Unknown error';
        console.error('Verdict submission error:', detail, fnData);
        const msg = detail === 'already_judged' ? 'This vow has already been judged.'
          : detail === 'invalid_token' ? 'Could not find this vow.'
          : detail === 'invalid_status' ? 'This vow is not ready for a verdict yet.'
          : detail === 'refund_failed' ? 'Refund could not be processed right now. Please try again in a moment.'
          : typeof detail === 'string' ? detail : 'Something went wrong.';
        setError(msg);
        busyRef.current = false;
        setBusy(false);
        return;
      }

      if (fnData?.error) {
        console.error('Verdict response error:', fnData.error);
        const msg = fnData.error === 'already_judged' ? 'This vow has already been judged.'
          : fnData.error === 'refund_failed' ? 'Refund could not be processed right now. Please try again in a moment.'
          : typeof fnData.error === 'string' ? fnData.error : 'Something went wrong.';
        setError(msg);
        busyRef.current = false;
        setBusy(false);
        return;
      }
    } catch (err) {
      console.error('Verdict exception:', err);
      setError('Network error. Please try again.');
      busyRef.current = false;
      setBusy(false);
      return;
    }

    busyRef.current = false;
    setBusy(false);

    const amountDollars = Math.round(vow.stake_amount / 100);
    const text = encodeURIComponent(vow.refined_text || 'Your vow');
    const dest = encodeURIComponent(vow.destination || '');
    if (choice === 'kept') {
      router.push(`/vow-kept?amount=${amountDollars}&text=${text}&destination=${dest}`);
    } else {
      router.push(`/vow-broken?amount=${amountDollars}&text=${text}&destination=${dest}`);
    }
  };

  const handleBack = () => {
    if (view === 'confirm') {
      setView('choose');
      setChoice(null);
      setError('');
    } else {
      router.back();
    }
  };

  if (loading || authLoading) {
    return (
      <RitualScreen>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
        </div>
      </RitualScreen>
    );
  }

  if (!vow) return null;

  const isZeroStake = vow.stake_amount === 0;
  const stakeDisplay = isZeroStake ? '' : `$${Math.round(vow.stake_amount / 100)}`;
  const destination = vow.destination || 'charity';

  // Confirmation view
  if (view === 'confirm') {
    const isKept = choice === 'kept';
    return (
      <RitualScreen
        footer={
          <>
            {error && (
              <div className="rounded-xl p-3 mb-2" style={{ backgroundColor: 'var(--danger-muted)' }}>
                <p className="text-sm text-center" style={{ color: 'var(--danger)' }}>{error}</p>
              </div>
            )}
            <PrimaryButton
              label="Confirm"
              onPress={handleConfirm}
              loading={busy}
            />
            <button
              onClick={handleBack}
              className="min-h-[46px] flex items-center justify-center w-full"
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Go back</span>
            </button>
          </>
        }
      >
        <FadeUp><HeaderBadge /></FadeUp>
        <FadeUp delay={0.1}>
          <div className="flex justify-center mt-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: isKept ? 'var(--success-muted)' : 'var(--warm-amber-muted)' }}
            >
              {isKept ? (
                <ShieldCheck className="w-8 h-8" style={{ color: 'var(--success)' }} />
              ) : (
                <DollarSign className="w-8 h-8" style={{ color: 'var(--warm-amber)' }} />
              )}
            </div>
          </div>
        </FadeUp>
        <FadeUp delay={0.15}>
          <TitleBlock
            title={isKept ? 'You kept your word.' : 'Honest. Respect.'}
            subtitle={isKept
              ? (isZeroStake ? 'Word honored.' : `${stakeDisplay} stays safe. No charge.`)
              : (isZeroStake ? 'The record stands. This cannot be undone.' : `${stakeDisplay} will be donated to ${destination}. This cannot be undone.`)
            }
          />
        </FadeUp>
      </RitualScreen>
    );
  }

  // Main choose view
  return (
    <RitualScreen>
      <FadeUp><HeaderBadge /></FadeUp>

      {/* Hand icon */}
      <FadeUp delay={0.05}>
        <div className="flex justify-center">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--gold-glow)', transform: 'scale(1.4)' }}
            />
            <div
              className="relative w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(212,162,79,0.12)', border: '1px solid var(--border-strong)' }}
            >
              <Hand className="w-6 h-6" style={{ color: 'var(--gold-bright)' }} />
            </div>
          </div>
        </div>
      </FadeUp>

      <FadeUp delay={0.1}>
        <TitleBlock
          title="Time to be honest."
          subtitle="No one knows but you."
        />
      </FadeUp>

      {/* Vow card */}
      <FadeUp delay={0.15}>
        <RitualCard>
          <p className="text-[17px] font-serif font-semibold" style={{ color: 'var(--text)' }}>
            {vow.refined_text}
          </p>
          <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
          <div className="flex items-center justify-between">
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>At stake</span>
            <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{stakeDisplay}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>If broken</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Donated to {destination}</span>
          </div>
        </RitualCard>
      </FadeUp>

      {/* Oath checkbox */}
      <FadeUp delay={0.2}>
        <div
          className="rounded-[20px] p-[18px]"
          style={{
            backgroundColor: 'var(--surface)',
            border: `1px solid ${sworn ? 'var(--border-strong)' : 'var(--border)'}`,
            boxShadow: sworn ? '0 6px 12px rgba(212,162,79,0.06)' : 'none',
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}
        >
          <OathCheckbox
            checked={sworn}
            onChange={setSworn}
            label="I swear to tell the truth, even if it costs me money."
          />
        </div>
      </FadeUp>

      {/* Verdict buttons */}
      {sworn ? (
        <>
          <FadeUp delay={0}>
            <button
              onClick={() => handleChoose('kept')}
              disabled={busy}
              className="w-full rounded-[22px] p-5 flex items-center gap-4 text-left transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              style={{ backgroundColor: 'var(--success-muted)', border: '1.5px solid rgba(82,214,154,0.3)' }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(82,214,154,0.2)' }}>
                <ShieldCheck className="w-6 h-6" style={{ color: 'var(--success)' }} />
              </div>
              <div>
                <span className="text-[17px] font-semibold block" style={{ color: 'var(--success)' }}>I kept my vow</span>
                <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  {isZeroStake ? 'Word honored.' : `${stakeDisplay} stays safe.`}
                </span>
              </div>
            </button>
          </FadeUp>

          <FadeUp delay={0.05}>
            <button
              onClick={() => handleChoose('broken')}
              disabled={busy}
              className="w-full rounded-[22px] p-5 flex items-center gap-4 text-left transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              style={{ backgroundColor: 'var(--warm-amber-muted)', border: '1.5px solid var(--warm-amber-border)' }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(212,162,79,0.2)' }}>
                <DollarSign className="w-6 h-6" style={{ color: 'var(--warm-amber)' }} />
              </div>
              <div>
                <span className="text-[17px] font-semibold block" style={{ color: 'var(--warm-amber)' }}>I broke it</span>
                <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  {isZeroStake ? 'The record stands.' : `${stakeDisplay} goes to ${destination}.`}
                </span>
              </div>
            </button>
          </FadeUp>
        </>
      ) : (
        <FadeUp delay={0.25}>
          <p className="text-center text-[13px] italic" style={{ color: 'var(--text-muted)' }}>
            Take the oath to unlock your verdict.
          </p>
        </FadeUp>
      )}
    </RitualScreen>
  );
}
