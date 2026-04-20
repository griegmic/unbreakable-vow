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

const AMOUNTS: { value: number; tag: string }[] = [
  { value: 10, tag: 'a nudge.' },
  { value: 25, tag: 'a real stake.' },
  { value: 50, tag: 'a real stake.' },
  { value: 100, tag: 'all in.' },
];

function getTag(amount: number): string {
  if (amount <= 10) return 'a nudge.';
  if (amount <= 25) return 'a real stake.';
  if (amount <= 50) return 'a real stake.';
  if (amount >= 100) return 'all in.';
  return 'a real stake.';
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
    ? witnessName
    : 'Witness picked next';

  return (
    <RitualScreen>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: 'var(--uv-bg-card)',
        border: '1px solid var(--uv-border-strong)',
        borderRadius: 22,
        padding: '20px 24px 28px',
        margin: '0 -4px',
      }}>
        {/* Top bar: back + progress */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: '50%',
              background: 'transparent', border: 'none',
              cursor: 'pointer',
              marginLeft: -8,
            }}
          >
            <ChevronLeft size={20} color="var(--uv-text-dim)" />
          </button>
          <div style={{ flex: 1, display: 'flex', gap: 6, marginLeft: 16, marginRight: 16 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i < 2 ? 'var(--uv-gold)' : 'var(--uv-border-strong)',
              }} />
            ))}
          </div>
        </div>

        {/* YOUR VOW recap */}
        <div style={{ marginBottom: 32 }}>
          <span style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 500,
            letterSpacing: '2px', textTransform: 'uppercase' as const,
            color: 'var(--uv-text-faint)',
          }}>
            YOUR VOW
          </span>
          <h2 style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 18, fontWeight: 500,
            color: 'var(--uv-text)', margin: '6px 0 4px', lineHeight: 1.3,
          }}>
            {vowText}
          </h2>
          <span style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 13,
            color: 'var(--uv-text-faint)',
          }}>
            {[deadlineLabel, witnessLabel].filter(Boolean).join(' · ')}
          </span>
        </div>

        {/* Hero */}
        <h1 style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 30, fontWeight: 400,
          color: 'var(--uv-text)', margin: 0, lineHeight: 1.1,
        }}>
          How serious
        </h1>
        <h1 style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 30, fontWeight: 400,
          fontStyle: 'italic', color: 'var(--uv-gold)', margin: '2px 0 20px', lineHeight: 1.1,
        }}>
          are you.
        </h1>

        {/* Big amount + tag */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 24 }}>
          <span style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 72, fontWeight: 400,
            color: 'var(--uv-text)', lineHeight: 1, letterSpacing: '-2px',
          }}>
            ${stakeAmount}
          </span>
          <span style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 18,
            fontStyle: 'italic', color: 'var(--uv-gold-dim)',
            lineHeight: 1.2,
          }}>
            {getTag(stakeAmount)}
          </span>
        </div>

        {/* Slider-style amount selector */}
        <div style={{ marginBottom: 8 }}>
          {/* Track */}
          <div style={{
            position: 'relative', height: 20,
            display: 'flex', alignItems: 'center',
          }}>
            {/* Line */}
            <div style={{
              position: 'absolute', left: 0, right: 0, top: '50%',
              height: 2, background: 'var(--uv-border-strong)',
              transform: 'translateY(-50%)',
            }} />
            {/* Dots */}
            {AMOUNTS.map((amt, i) => {
              const active = stakeAmount === amt.value;
              const pct = (i / (AMOUNTS.length - 1)) * 100;
              return (
                <button
                  key={amt.value}
                  type="button"
                  onClick={() => setStakeAmount(amt.value)}
                  style={{
                    position: 'absolute',
                    left: `${pct}%`,
                    transform: 'translateX(-50%)',
                    width: active ? 20 : 8,
                    height: active ? 20 : 8,
                    borderRadius: '50%',
                    background: active ? 'var(--uv-gold)' : 'var(--uv-text-faint)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
                    boxShadow: active ? '0 0 12px rgba(212,168,74,0.4)' : 'none',
                    padding: 0,
                    zIndex: active ? 2 : 1,
                  }}
                />
              );
            })}
          </div>
          {/* Labels */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: 6, padding: '0 0',
          }}>
            {AMOUNTS.map(amt => {
              const active = stakeAmount === amt.value;
              return (
                <button
                  key={amt.value}
                  type="button"
                  onClick={() => setStakeAmount(amt.value)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
                    fontFamily: 'var(--uv-font-sans)',
                    fontSize: active ? 15 : 14,
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--uv-text)' : 'var(--uv-text-faint)',
                    transition: 'all 200ms',
                    minWidth: 44,
                  }}
                >
                  ${amt.value}
                </button>
              );
            })}
          </div>
        </div>

        {/* $5 option */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setStakeAmount(5)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--uv-font-sans)', fontSize: 13,
              fontStyle: 'italic',
              color: stakeAmount === 5 ? 'var(--uv-gold)' : 'var(--uv-text-faint)',
              padding: '4px 8px',
              transition: 'color 200ms',
            }}
          >
            not ready? start with $5
          </button>
        </div>

        {/* Divider */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, var(--uv-border-strong), transparent)',
          marginBottom: 16,
        }} />

        {/* If broken row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 14,
              color: 'var(--uv-text-muted)',
            }}>
              Break it, ${stakeAmount} goes to
            </span>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 14,
              color: 'var(--uv-text)', fontWeight: 500,
            }}>
              {destination}
            </span>
          </div>
          <button
            type="button"
            onClick={onIfBroken}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--uv-font-sans)', fontSize: 13,
              color: 'var(--uv-gold-dim)', fontStyle: 'italic',
            }}
          >
            change
          </button>
        </div>

        {/* Trust line */}
        <p style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 15,
          fontStyle: 'italic', color: 'var(--uv-success)',
          margin: '0 0 0', lineHeight: 1.4,
        }}>
          Keep it — every penny stays yours. No charge now.
        </p>

        <div style={{ flex: 1, minHeight: 24 }} />

        {/* CTA */}
        <PrimaryButton onClick={onNext}>
          Seal my vow — ${stakeAmount}
        </PrimaryButton>
      </div>
    </RitualScreen>
  );
}
