'use client';
import { useState } from 'react';
import { Check, DollarSign, Sparkles, Share2, Copy, CheckCheck } from 'lucide-react';
import { RitualScreen, TitleBlock, FadeUp, HeaderBadge } from '@/components/ui';

interface Vow {
  id: string;
  refined_text: string;
  verdict: string;
  stake_amount: number;
  destination: string;
  witness_name: string;
}

export default function OutcomeClient({ vow }: { vow: Vow }) {
  const [shared, setShared] = useState(false);
  const isKept = vow.verdict === 'kept';
  const amount = Math.round(vow.stake_amount / 100);
  const outcomeUrl = `https://unbreakablevow.app/outcome/${vow.id}`;

  const handleShare = async () => {
    const text = isKept
      ? `Vow kept: "${vow.refined_text}" — $${amount} protected.`
      : `Vow broken: "${vow.refined_text}" — $${amount} to ${vow.destination}.`;

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

      {/* Outcome badge */}
      <FadeUp delay={0.05}>
        <div className="flex justify-center mt-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: isKept
                ? 'linear-gradient(135deg, rgba(82,214,154,0.2), rgba(82,214,154,0.08))'
                : 'linear-gradient(135deg, rgba(220,38,38,0.2), rgba(220,38,38,0.08))',
              border: isKept
                ? '2px solid rgba(82,214,154,0.3)'
                : '2px solid rgba(220,38,38,0.3)',
              boxShadow: isKept
                ? '0 0 40px rgba(82,214,154,0.15)'
                : '0 0 40px rgba(220,38,38,0.15)',
            }}
          >
            {isKept ? (
              <Check className="w-9 h-9" style={{ color: 'var(--success)' }} />
            ) : (
              <DollarSign className="w-9 h-9" style={{ color: 'var(--danger)' }} />
            )}
          </div>
        </div>
      </FadeUp>

      {/* Title */}
      <FadeUp delay={0.1}>
        <TitleBlock
          title={isKept ? 'Vow kept.' : 'Vow broken.'}
          subtitle={isKept
            ? `The vow was honored. $${amount} stays safe.`
            : `$${amount} goes to ${vow.destination}.`
          }
        />
      </FadeUp>

      {/* Vow quote */}
      <FadeUp delay={0.15}>
        <div
          className="flex items-stretch overflow-hidden rounded-[14px]"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
        >
          <div
            className="w-[3px] shrink-0"
            style={{ backgroundColor: isKept ? 'var(--success)' : 'var(--danger)' }}
          />
          <div className="flex-1 py-3 px-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-3 h-3" style={{ color: 'var(--gold)' }} />
              <span className="text-[10px] font-bold tracking-[1.2px] uppercase" style={{ color: 'var(--gold)' }}>THE VOW</span>
            </div>
            <p className="text-[16px] leading-[23px] font-serif font-medium" style={{ color: 'var(--text)' }}>
              &ldquo;{vow.refined_text}&rdquo;
            </p>
            <p className="text-[12px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
              ${amount} at stake &middot; Witnessed by {vow.witness_name}
            </p>
          </div>
        </div>
      </FadeUp>

      {/* Share button */}
      <FadeUp delay={0.2}>
        <button
          onClick={handleShare}
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
              <span className="text-[14px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Share this outcome</span>
            </>
          )}
        </button>
      </FadeUp>

      {/* Make your own vow CTA */}
      <FadeUp delay={0.25}>
        <div className="flex flex-col gap-3">
          <a
            href="https://unbreakablevow.app"
            className="w-full rounded-[18px] min-h-[56px] flex items-center justify-center transition-transform active:scale-[0.975]"
            style={{
              background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
              boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
            }}
          >
            <span className="text-[15px] font-extrabold tracking-[0.2px]" style={{ color: '#0B0D11' }}>
              Make a vow of your own
            </span>
          </a>
          <p className="text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Put money on the line. Pick a witness. Keep your word.
          </p>
        </div>
      </FadeUp>
    </RitualScreen>
  );
}
