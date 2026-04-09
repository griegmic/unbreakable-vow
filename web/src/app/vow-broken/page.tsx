'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Share2, AlertTriangle } from 'lucide-react';
import { RitualScreen, TitleBlock, PrimaryButton, SecondaryButton, FadeUp } from '@/components/ui';

function VowBrokenContent() {
  const router = useRouter();
  const params = useSearchParams();
  const vowText = params.get('text') || 'Your vow';
  const amount = params.get('amount') || '0';
  const destination = params.get('destination') || 'charity';
  const isZeroStake = !amount || amount === '0';
  const [copied, setCopied] = useState(false);

  // Anti-causes get the viral "I just donated to X" framing
  const isAntiCause = ['Donald Trump', 'NRA', 'Flat Earth Society'].some(
    c => destination.toLowerCase().includes(c.toLowerCase())
  ) || destination !== 'charity';

  const handleShare = () => {
    let text: string;
    if (isZeroStake) {
      text = `I broke my vow: "${vowText}" — unbreakablevow.app`;
    } else if (isAntiCause && destination !== 'charity') {
      text = `I broke my vow and just donated $${amount} to ${destination}. unbreakablevow.app`;
    } else {
      text = `I broke my vow: "${vowText}" — $${amount} donated to ${destination}. unbreakablevow.app`;
    }
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <RitualScreen
      footer={
        <>
          <PrimaryButton label="Make a redemption vow" onPress={() => router.push('/create')} />
          <SecondaryButton label="My Vows" onPress={() => router.push('/dashboard')} />
        </>
      }
    >
      <FadeUp>
        <TitleBlock
          title="You were honest."
          subtitle={isZeroStake ? 'The vow was broken, but you told the truth.' : `Your $${amount} goes to ${destination}. But you told the truth.`}
        />
      </FadeUp>

      {/* Receipt card */}
      <FadeUp delay={0.1}>
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--warm-amber)',
            borderRadius: 22,
            padding: '28px 22px',
            boxShadow: '0 16px 28px rgba(0,0,0,0.26), 0 0 0 1px rgba(212,162,79,0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
          }}
        >
          {/* Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: 'var(--warm-amber-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AlertTriangle style={{ width: 14, height: 14, color: 'var(--warm-amber)' }} />
            </div>
            <span style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '1.6px',
              textTransform: 'uppercase' as const,
              color: 'var(--warm-amber)',
            }}>
              Vow Broken
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: '100%', height: 1, backgroundColor: 'var(--border)' }} />

          {/* Vow text */}
          <p style={{
            fontSize: 17,
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontWeight: 500,
            color: 'var(--text)',
            textAlign: 'center',
            lineHeight: '26px',
            margin: 0,
          }}>
            &ldquo;{vowText}&rdquo;
          </p>

          {/* Amount */}
          {!isZeroStake && (
            <span style={{
              fontSize: 28,
              fontWeight: 800,
              color: 'var(--warm-amber)',
              letterSpacing: '-0.5px',
            }}>
              ${amount} donated
            </span>
          )}

          {/* Destination */}
          {!isZeroStake && (
            <span style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text)',
            }}>
              to {destination}
            </span>
          )}

          {isZeroStake && (
            <span style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--warm-amber)',
            }}>
              Broken
            </span>
          )}

          {/* Divider */}
          <div style={{ width: '100%', height: 1, backgroundColor: 'var(--border)' }} />

          {/* Branding */}
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.8px',
            color: 'var(--text-muted)',
          }}>
            unbreakablevow.app
          </span>
        </div>
      </FadeUp>

      {/* Share */}
      <FadeUp delay={0.15}>
        <button
          onClick={handleShare}
          className="w-full rounded-[18px] min-h-[48px] flex items-center justify-center gap-2 transition-transform active:scale-[0.975]"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)' }}
        >
          <Share2 className="w-4 h-4" style={{ color: 'var(--warm-amber)' }} />
          <span className="text-[14px] font-bold" style={{ color: 'var(--warm-amber)' }}>
            {copied ? 'Copied!' : 'Share'}
          </span>
        </button>
      </FadeUp>

      <FadeUp delay={0.2}>
        <p className="text-[14px] text-center" style={{ color: 'var(--text-secondary)' }}>
          You were honest. Now come back stronger.
        </p>
      </FadeUp>
    </RitualScreen>
  );
}

export default function VowBrokenPage() {
  return (
    <Suspense>
      <VowBrokenContent />
    </Suspense>
  );
}
