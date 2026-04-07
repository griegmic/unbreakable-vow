'use client';
import { useState } from 'react';
import { Check, DollarSign, Sparkles } from 'lucide-react';
import { RitualScreen, TitleBlock, RitualCard, PrimaryButton, FadeUp, HeaderBadge } from '@/components/ui';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Vow {
  id: string;
  refined_text: string;
  stake_amount: number;
  destination: string;
  witness_name: string;
  status: string;
}

type VerdictChoice = 'kept' | 'broken' | null;
type ViewState = 'choose' | 'confirm' | 'done';

export default function VerdictClient({ vow, token }: { vow: Vow; token: string }) {
  const [choice, setChoice] = useState<VerdictChoice>(null);
  const [view, setView] = useState<ViewState>('choose');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleChoose = (verdict: VerdictChoice) => {
    setChoice(verdict);
    setView('confirm');
    setError('');
  };

  const handleConfirm = async () => {
    if (!choice || busy) return;
    setBusy(true);
    setError('');

    try {
      const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-verdict`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ token, verdict: choice }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const detail = data?.error || `HTTP ${res.status}`;
        const msg = detail === 'already_judged' ? 'This vow has already been judged.'
          : detail === 'invalid_token' ? 'Could not find this vow. The link may have expired.'
          : detail === 'invalid_status' ? 'This vow is not ready for a verdict yet.'
          : typeof detail === 'string' ? detail : 'Something went wrong.';
        setError(msg);
        setBusy(false);
        return;
      }

      if (data?.error) {
        const msg = data.error === 'already_judged' ? 'This vow has already been judged.'
          : typeof data.error === 'string' ? data.error : 'Something went wrong.';
        setError(msg);
        setBusy(false);
        return;
      }

      setView('done');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (view === 'done') {
    const isKept = choice === 'kept';
    return (
      <RitualScreen>
        <FadeUp><HeaderBadge /></FadeUp>
        <FadeUp delay={0.1}>
          <div className="flex justify-center mt-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center animate-scale-in"
              style={{ backgroundColor: isKept ? 'var(--success-muted)' : 'var(--warm-amber-muted)' }}
            >
              {isKept ? (
                <Check className="w-8 h-8" style={{ color: 'var(--success)' }} />
              ) : (
                <DollarSign className="w-8 h-8" style={{ color: 'var(--warm-amber)' }} />
              )}
            </div>
          </div>
        </FadeUp>
        <FadeUp delay={0.15}>
          <TitleBlock
            title={isKept ? 'Verdict: Kept.' : 'Verdict: Broken.'}
            subtitle={isKept
              ? 'The vow was honored. Their money stays safe.'
              : `${vow.stake_amount / 100} will be donated to ${vow.destination}.`
            }
          />
        </FadeUp>
        <FadeUp delay={0.2}>
          <p className="text-center text-[14px]" style={{ color: 'var(--text-muted)' }}>
            Thank you for being an honest witness.
          </p>
        </FadeUp>
      </RitualScreen>
    );
  }

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
              onClick={() => setView('choose')}
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
                <Check className="w-8 h-8" style={{ color: 'var(--success)' }} />
              ) : (
                <DollarSign className="w-8 h-8" style={{ color: 'var(--warm-amber)' }} />
              )}
            </div>
          </div>
        </FadeUp>
        <FadeUp delay={0.15}>
          <TitleBlock
            title={isKept ? 'Confirm: Kept.' : 'Are you sure?'}
            subtitle={isKept
              ? `They followed through. ${vow.stake_amount / 100} stays safe.`
              : `This is final. ${vow.stake_amount / 100} goes to ${vow.destination}. No take-backs.`
            }
          />
        </FadeUp>
      </RitualScreen>
    );
  }

  return (
    <RitualScreen>
      <FadeUp><HeaderBadge /></FadeUp>

      <FadeUp delay={0.05}>
        <TitleBlock
          title="Did they keep it?"
          subtitle="Be honest. That's the whole point."
        />
      </FadeUp>

      <FadeUp delay={0.1}>
        <RitualCard>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
            <span className="text-[11px] font-bold tracking-[1.3px] uppercase" style={{ color: 'var(--gold)' }}>THE VOW</span>
          </div>
          <p className="text-[17px] font-serif font-medium" style={{ color: 'var(--text)' }}>{vow.refined_text}</p>
          <div className="h-px" style={{ backgroundColor: 'var(--border)' }} />
          <div className="flex items-center justify-between">
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>At stake</span>
            <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>${vow.stake_amount / 100}</span>
          </div>
        </RitualCard>
      </FadeUp>

      {/* Verdict buttons */}
      <FadeUp delay={0.15}>
        <button
          onClick={() => handleChoose('kept')}
          className="w-full rounded-[22px] p-5 flex items-center gap-4 text-left transition-all active:scale-[0.98]"
          style={{ backgroundColor: 'var(--success-muted)', border: '1.5px solid rgba(82,214,154,0.3)' }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(82,214,154,0.2)' }}>
            <Check className="w-6 h-6" style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <span className="text-[17px] font-semibold block" style={{ color: 'var(--success)' }}>Vow kept</span>
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              They did what they said. ${vow.stake_amount / 100} stays safe.
            </span>
          </div>
        </button>
      </FadeUp>

      <FadeUp delay={0.2}>
        <button
          onClick={() => handleChoose('broken')}
          className="w-full rounded-[22px] p-5 flex items-center gap-4 text-left transition-all active:scale-[0.98]"
          style={{ backgroundColor: 'var(--warm-amber-muted)', border: '1.5px solid var(--warm-amber-border)' }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(212,162,79,0.2)' }}>
            <DollarSign className="w-6 h-6" style={{ color: 'var(--warm-amber)' }} />
          </div>
          <div>
            <span className="text-[17px] font-semibold block" style={{ color: 'var(--warm-amber)' }}>Vow broken</span>
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              ${vow.stake_amount / 100} to {vow.destination}.
            </span>
          </div>
        </button>
      </FadeUp>

      <FadeUp delay={0.25}>
        <p className="text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
          Your honesty is what makes this work.
        </p>
      </FadeUp>
    </RitualScreen>
  );
}
