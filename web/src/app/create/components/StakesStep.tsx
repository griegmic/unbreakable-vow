'use client';

import React from 'react';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { ChevronLeft } from 'lucide-react';

interface StakesStepProps {
  stakeAmount: number;
  setStakeAmount: (amount: number) => void;
  destination: string;
  destinationKind: 'charity' | 'anti';
  onIfBroken: () => void;
  onNext: () => void;
  onBack: () => void;
  vowText: string;
  witnessName: string;
  endsAt: Date | null;
}

const AMOUNTS = [10, 25, 50, 100];

function getTag(amount: number): string {
  if (amount <= 5) return 'just testing the waters.';
  if (amount <= 10) return 'a nudge.';
  if (amount <= 25) return 'a real stake.';
  if (amount <= 50) return 'a real stake.';
  return 'all in.';
}

export function StakesStep({
  stakeAmount,
  setStakeAmount,
  destination,
  destinationKind,
  onIfBroken,
  onNext,
  onBack,
  vowText,
  witnessName,
  endsAt,
}: StakesStepProps) {
  const deadlineLabel = endsAt
    ? `Ends ${endsAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
    : '';
  const witnessLabel = witnessName && witnessName !== 'TBD'
    ? `${witnessName} judging`
    : '';
  const metaParts = [deadlineLabel, witnessLabel].filter(Boolean).join(' · ');

  return (
    <RitualScreen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: '50%',
              background: 'transparent', border: 'none',
              cursor: 'pointer', marginLeft: -6,
            }}
          >
            <ChevronLeft size={18} color="var(--uv-text-dim)" />
          </button>
          <div style={{ flex: 1, display: 'flex', gap: 6, marginLeft: 12, marginRight: 12 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i < 2 ? 'var(--uv-gold)' : 'var(--uv-border-strong)',
              }} />
            ))}
          </div>
        </div>

        {/* Your vow recap — left gold bar */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 28,
          paddingLeft: 12,
          borderLeft: '3px solid var(--uv-gold-deep)',
        }}>
          <div>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 10, fontWeight: 500,
              letterSpacing: '2px', textTransform: 'uppercase' as const,
              color: 'var(--uv-text-faint)',
              display: 'block', marginBottom: 4,
            }}>
              YOUR VOW
            </span>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 16, fontWeight: 500,
              color: 'var(--uv-text)', display: 'block', lineHeight: 1.3,
            }}>
              {vowText}
            </span>
            {metaParts && (
              <span style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 12,
                color: 'var(--uv-text-faint)', display: 'block', marginTop: 3,
              }}>
                {metaParts}
              </span>
            )}
          </div>
        </div>

        {/* Hero */}
        <h1 style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 26, fontWeight: 600,
          color: 'var(--uv-text)', margin: '0 0 4px', lineHeight: 1.15,
        }}>
          Put money on it.
        </h1>
        <p style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 14,
          color: 'var(--uv-text-dim)', margin: '0 0 24px',
        }}>
          You get it back if you keep your word.
        </p>

        {/* Big amount + tag */}
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 28,
        }}>
          <span style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 64, fontWeight: 600,
            color: 'var(--uv-gold)', lineHeight: 1, letterSpacing: '-2px',
          }}>
            ${stakeAmount}
          </span>
          <span style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 16,
            fontStyle: 'italic', color: 'var(--uv-text-dim)',
            lineHeight: 1.2,
          }}>
            {getTag(stakeAmount)}
          </span>
        </div>

        {/* Slider track */}
        <div style={{ marginBottom: 6, position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
          {/* Track line */}
          <div style={{
            position: 'absolute', left: 6, right: 6, top: '50%',
            height: 2, background: 'var(--uv-border-strong)',
            transform: 'translateY(-50%)', borderRadius: 1,
          }} />
          {/* Active fill */}
          <div style={{
            position: 'absolute', left: 6, top: '50%',
            height: 2,
            width: `${(AMOUNTS.indexOf(stakeAmount) / (AMOUNTS.length - 1)) * (100 - 3)}%`,
            background: 'var(--uv-gold-deep)',
            transform: 'translateY(-50%)', borderRadius: 1,
            transition: 'width 200ms cubic-bezier(0.22,1,0.36,1)',
          }} />
          {/* Dots */}
          {AMOUNTS.map((amt, i) => {
            const active = stakeAmount === amt;
            const pct = (i / (AMOUNTS.length - 1)) * 100;
            return (
              <button
                key={amt}
                type="button"
                onClick={() => setStakeAmount(amt)}
                style={{
                  position: 'absolute', left: `${pct}%`,
                  transform: 'translateX(-50%)',
                  width: active ? 18 : 6, height: active ? 18 : 6,
                  borderRadius: '50%',
                  background: active ? 'var(--uv-gold)' : 'var(--uv-text-faint)',
                  border: active ? '2px solid var(--uv-gold-bright)' : 'none',
                  cursor: 'pointer', padding: 0,
                  transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
                  boxShadow: active ? '0 0 12px rgba(212,168,74,0.35)' : 'none',
                  zIndex: active ? 2 : 1,
                }}
              />
            );
          })}
        </div>

        {/* Labels */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginBottom: 28,
          paddingLeft: 0, paddingRight: 0,
        }}>
          {AMOUNTS.map(amt => {
            const active = stakeAmount === amt;
            return (
              <button
                key={amt}
                type="button"
                onClick={() => setStakeAmount(amt)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px',
                  fontFamily: 'var(--uv-font-sans)',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--uv-gold)' : 'var(--uv-text-faint)',
                  transition: 'all 200ms',
                  minWidth: 40,
                }}
              >
                ${amt}
              </button>
            );
          })}
        </div>

        {/* Trust + destination block */}
        <div style={{ marginBottom: 0 }}>
          <p style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 14,
            fontStyle: 'italic', color: '#6ee7a0',
            margin: '0 0 8px', lineHeight: 1.4,
          }}>
            Keep it and every cent stays yours.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 4 }}>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 14,
              color: 'var(--uv-text-muted)',
            }}>
              Break it and ${stakeAmount} goes to
            </span>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 14,
              color: 'var(--uv-text)', fontWeight: 500,
            }}>
              {destination}.
            </span>
          </div>
          <button
            type="button"
            onClick={onIfBroken}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
              fontFamily: 'var(--uv-font-sans)', fontSize: 13,
              color: 'var(--uv-gold)', marginTop: 2,
            }}
          >
            change
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 24 }} />

        {/* Fine print */}
        <p style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 12,
          fontStyle: 'italic', color: 'var(--uv-text-faint)',
          textAlign: 'center', margin: '0 0 12px',
        }}>
          No charge now. Only if you break it.
        </p>

        {/* CTA */}
        <PrimaryButton onClick={onNext}>
          Seal my vow — ${stakeAmount} →
        </PrimaryButton>
      </div>
    </RitualScreen>
  );
}
