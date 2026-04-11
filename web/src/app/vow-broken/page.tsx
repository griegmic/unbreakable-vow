'use client';
import { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Share2, AlertTriangle, Camera } from 'lucide-react';
import { RitualScreen, TitleBlock, PrimaryButton, SecondaryButton, FadeUp } from '@/components/ui';
import { antiCauses } from '@/lib/vow-logic';

function isAntiCause(destination: string): boolean {
  return antiCauses.some(c => destination.toLowerCase().includes(c.toLowerCase()));
}

function VowBrokenContent() {
  const router = useRouter();
  const params = useSearchParams();
  const vowText = params.get('text') || 'Your vow';
  const amount = params.get('amount') || '0';
  const destination = params.get('destination') || 'charity';
  const witness = params.get('witness') || '';
  const selfWitness = params.get('self') === '1';
  const isZeroStake = !amount || amount === '0';
  const antiCause = isAntiCause(destination);
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const firstName = selfWitness ? 'You' : (witness.split(' ')[0] || 'Your witness');

  const title = selfWitness ? 'You took the L.' : `${firstName} called it.`;

  const subtitle = (() => {
    if (antiCause && !isZeroStake) {
      return `Yeah... $${amount} just went to ${destination}. Time for a redemption arc.`;
    }
    if (!isZeroStake) {
      return `$${amount} → ${destination}. Honesty noted.`;
    }
    return "Broken. But you told the truth.";
  })();

  const getShareText = () => {
    if (isZeroStake) {
      return `I broke my Unbreakable Vow: "${vowText}" — Could you do better? → unbreakablevow.app`;
    }
    if (antiCause) {
      return `I broke my vow and $${amount} just went to ${destination}. Don't be me. → unbreakablevow.app`;
    }
    return `I broke my vow: "${vowText}" — $${amount} went to ${destination}. Could you do better? → unbreakablevow.app`;
  };

  const handleShare = () => {
    const text = getShareText();
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
          <PrimaryButton
            label="Try again"
            onPress={() => router.push(`/create?text=${encodeURIComponent(vowText)}&stake=${amount}`)}
          />
          <SecondaryButton
            label="Challenge a friend"
            onPress={() => router.push('/cast')}
          />
          <SecondaryButton
            label="View your record"
            onPress={() => router.push('/dashboard')}
          />
        </>
      }
    >
      {/* Dramatic icon */}
      <FadeUp>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 4 }}>
          <div
            className="animate-scale-in"
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,123,123,0.14)',
              border: '1px solid rgba(255,123,123,0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(255,123,123,0.2)',
            }}
          >
            <AlertTriangle style={{ width: 32, height: 32, color: '#FF7B7B' }} />
          </div>
        </div>
      </FadeUp>

      {/* Title + subtitle */}
      <FadeUp delay={0.05}>
        <TitleBlock title={title} subtitle={subtitle} />
      </FadeUp>

      {/* Shareable receipt card — gradient border via wrapper */}
      <FadeUp delay={0.1}>
        <div
          ref={receiptRef}
          className="vow-broken-card"
          style={{
            background: 'linear-gradient(135deg, var(--warm-amber), #FF7B7B)',
            borderRadius: 22,
            padding: 1,
            boxShadow: '0 16px 28px rgba(0,0,0,0.26), 0 0 0 1px rgba(255,123,123,0.12)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 21,
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Subtle BROKEN watermark */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-18deg)',
              fontSize: 48,
              fontWeight: 900,
              letterSpacing: '6px',
              color: 'rgba(255,123,123,0.06)',
              textTransform: 'uppercase',
              pointerEvents: 'none',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}>
              BROKEN
            </div>

            {/* Header stamp */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '3px',
                color: '#FF7B7B',
                textTransform: 'uppercase',
              }}>
                VOW BROKEN
              </span>
            </div>

            {/* Vow text in serif */}
            <p style={{
              fontSize: 18,
              fontFamily: 'var(--font-serif, Georgia, serif)',
              fontWeight: 500,
              color: 'var(--text)',
              textAlign: 'center',
              lineHeight: '28px',
              margin: 0,
              position: 'relative',
            }}>
              &ldquo;{vowText}&rdquo;
            </p>

            {/* Divider */}
            <div style={{ width: '100%', height: 1, backgroundColor: 'var(--border)' }} />

            {/* Witness */}
            {witness && !selfWitness && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Witness</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{witness}</span>
              </div>
            )}

            {/* Payment line (staked) or accountability line ($0) */}
            {!isZeroStake ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--warm-amber)',
                }}>
                  ${amount} → {destination} · Processed ✓
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                }}>
                  Accountability only
                </span>
              </div>
            )}

            {/* Watermark */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
              <span style={{
                fontSize: 10,
                letterSpacing: '1px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                opacity: 0.5,
              }}>
                unbreakablevow.app
              </span>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* Share section */}
      <FadeUp delay={0.15}>
        <button
          onClick={handleShare}
          className="w-full rounded-[18px] min-h-[52px] flex items-center justify-center gap-2 transition-transform active:scale-[0.975]"
          style={{
            backgroundColor: antiCause && !isZeroStake ? 'rgba(255,123,123,0.12)' : 'rgba(212,162,79,0.12)',
            border: `1px solid ${antiCause && !isZeroStake ? 'rgba(255,123,123,0.28)' : 'var(--border-strong)'}`,
          }}
        >
          <Share2 className="w-4 h-4" style={{ color: antiCause && !isZeroStake ? '#FF7B7B' : 'var(--warm-amber)' }} />
          <span className="text-[14px] font-extrabold" style={{ color: antiCause && !isZeroStake ? '#FF7B7B' : 'var(--warm-amber)' }}>
            {copied ? 'Copied!' : 'Share the damage'}
          </span>
        </button>
      </FadeUp>

      {/* Screenshot hint */}
      <FadeUp delay={0.18}>
        <p style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          textAlign: 'center',
          margin: 0,
          opacity: 0.6,
        }}>
          Screenshot the receipt above to share as an image
        </p>
      </FadeUp>

      {/* CSS shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-3px); }
          40% { transform: translateX(3px); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
        }
        .vow-broken-card {
          animation: shake 0.15s ease-in-out 0.4s 2;
        }
        @keyframes scaleIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
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
