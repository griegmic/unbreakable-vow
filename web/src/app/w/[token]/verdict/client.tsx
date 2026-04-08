'use client';
import { useState, useRef } from 'react';
import { Check, DollarSign, Sparkles, Share2, CheckCheck } from 'lucide-react';
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

export default function VerdictClient({ vow, token, makerName }: { vow: Vow; token: string; makerName: string }) {
  const [choice, setChoice] = useState<VerdictChoice>(null);
  const [view, setView] = useState<ViewState>('choose');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [shared, setShared] = useState(false);

  const handleChoose = (verdict: VerdictChoice) => {
    setChoice(verdict);
    setView('confirm');
    setError('');
  };

  const handleConfirm = async () => {
    if (!choice || busyRef.current) return;
    busyRef.current = true;
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
          : detail === 'refund_failed' ? 'Refund could not be processed right now. Please try again in a moment.'
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
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (view === 'done') {
    const isKept = choice === 'kept';
    const outcomeUrl = `https://unbreakablevow.app/outcome/${vow.id}`;

    const handleShareOutcome = async () => {
      const text = isKept
        ? `Vow kept: "${vow.refined_text}" — $${vow.stake_amount / 100} protected.`
        : `Vow broken: "${vow.refined_text}" — $${vow.stake_amount / 100} to ${vow.destination}.`;

      if (navigator.share) {
        try {
          await navigator.share({ text, url: outcomeUrl });
          return;
        } catch {}
      }

      await navigator.clipboard.writeText(`${text}\n${outcomeUrl}`);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    };

    return (
      <RitualScreen>
        <FadeUp><HeaderBadge /></FadeUp>
        <FadeUp delay={0.1}>
          <div className="flex justify-center mt-6">
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
              : `$${vow.stake_amount / 100} will be donated to ${vow.destination}.`
            }
          />
        </FadeUp>
        <FadeUp delay={0.2}>
          <p className="text-center text-[14px]" style={{ color: 'var(--text-muted)' }}>
            Thank you for being an honest witness.
          </p>
        </FadeUp>

        {/* Share outcome */}
        <FadeUp delay={0.25}>
          <button
            onClick={handleShareOutcome}
            className="w-full rounded-[14px] min-h-[48px] flex items-center justify-center gap-2.5 transition-transform active:scale-[0.975]"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border-strong)',
            }}
          >
            {shared ? (
              <>
                <CheckCheck className="w-4 h-4" style={{ color: 'var(--success)' }} />
                <span className="text-[14px] font-semibold" style={{ color: 'var(--success)' }}>Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <span className="text-[14px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Share the outcome</span>
              </>
            )}
          </button>
        </FadeUp>

        {/* Reciprocity CTA */}
        <FadeUp delay={0.35}>
          <div className="flex flex-col gap-2">
            <TitleBlock
              title="Your turn."
              subtitle={`Make a vow and pick ${makerName} to hold you accountable.`}
            />
            <a
              href={`https://unbreakablevow.app/?ref=witness&from=${encodeURIComponent(makerName)}`}
              className="w-full rounded-[18px] min-h-[56px] flex items-center justify-center transition-transform active:scale-[0.975]"
              style={{
                background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
                boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
              }}
            >
              <span className="text-[15px] font-extrabold tracking-[0.2px]" style={{ color: '#0B0D11' }}>
                Make my vow
              </span>
            </a>
          </div>
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
              ? `They followed through. $${vow.stake_amount / 100} stays safe.`
              : `This is final. $${vow.stake_amount / 100} goes to ${vow.destination}. No take-backs.`
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
          disabled={busy}
          className="w-full rounded-[22px] p-5 flex items-center gap-4 text-left transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
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
          disabled={busy}
          className="w-full rounded-[22px] p-5 flex items-center gap-4 text-left transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
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
