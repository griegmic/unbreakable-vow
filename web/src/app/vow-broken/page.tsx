'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { Card } from '@/components/uv/Card';
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

  // Two variants based on anti-cause
  const title = antiCause && !isZeroStake ? 'You played yourself.' : 'It happens.';
  const subtitle = (() => {
    if (antiCause && !isZeroStake) {
      return `$${amount} just went to ${destination}. Time for a redemption arc.`;
    }
    if (!isZeroStake) {
      return `$${amount} goes to ${destination}. Honesty noted.`;
    }
    return 'Broken. But you told the truth.';
  })();

  const getShareText = () => {
    if (isZeroStake) {
      return `I couldn't even keep a free vow: "${vowText}" -- unbreakablevow.app`;
    }
    if (antiCause) {
      return `I broke my vow and $${amount} just went to ${destination}. Don't be me. -> unbreakablevow.app`;
    }
    return `I broke my vow: "${vowText}" -- $${amount} went to ${destination}. Could you do better? -> unbreakablevow.app`;
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
    <RitualScreen variant={antiCause ? 'anti-cause-broken' : 'outcome-broken'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 48 }}>
        {/* Title */}
        <h1
          style={{
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 40,
            fontWeight: 500,
            color: 'var(--uv-text)',
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 15,
            color: 'var(--uv-text-muted)',
            textAlign: 'center',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {subtitle}
        </p>

        {/* Receipt card */}
        <Card variant="elevated">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* Watermark */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-18deg)',
                fontSize: 42,
                fontWeight: 600,
                letterSpacing: '6px',
                color: 'rgba(248,113,113,0.06)',
                textTransform: 'uppercase' as const,
                pointerEvents: 'none',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              BROKEN
            </div>

            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '3px',
                color: 'var(--uv-danger)',
                textTransform: 'uppercase' as const,
                fontFamily: 'var(--uv-font-sans)',
              }}
            >
              VOW BROKEN
            </span>
            <p
              style={{
                fontSize: 18,
                fontFamily: 'var(--uv-font-serif)',
                fontWeight: 500,
                color: 'var(--uv-text)',
                textAlign: 'center',
                lineHeight: '28px',
                margin: 0,
                position: 'relative',
              }}
            >
              &ldquo;{vowText}&rdquo;
            </p>
            <div style={{ width: '100%', height: 1, background: 'var(--uv-border-strong)' }} />

            {witness && !selfWitness && (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontSize: 13, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>Witness</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)' }}>{witness}</span>
              </div>
            )}

            {!isZeroStake ? (
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--uv-danger)', fontFamily: 'var(--uv-font-sans)' }}>
                  ${amount} &rarr; {destination}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)' }}>
                  Accountability only
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Share */}
        <button
          onClick={handleShare}
          style={{
            width: '100%',
            borderRadius: 'var(--uv-radius-md)',
            minHeight: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: antiCause && !isZeroStake ? 'rgba(248,113,113,0.12)' : 'rgba(212,162,79,0.12)',
            border: `1px solid ${antiCause && !isZeroStake ? 'rgba(248,113,113,0.28)' : 'var(--uv-border-gold-soft)'}`,
            cursor: 'pointer',
            transition: 'transform 120ms',
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: antiCause && !isZeroStake ? 'var(--uv-danger)' : 'var(--uv-gold)',
              fontFamily: 'var(--uv-font-sans)',
            }}
          >
            {copied ? 'Copied!' : 'Share the damage'}
          </span>
        </button>

        {/* CTA */}
        <PrimaryButton onClick={() => router.push('/create')}>
          + Try again
        </PrimaryButton>
      </div>
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
