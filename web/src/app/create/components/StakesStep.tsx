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

const AMOUNTS: { value: number; label: string; sub: string }[] = [
  { value: 10, label: '$10', sub: 'Just a nudge' },
  { value: 25, label: '$25', sub: 'A real stake' },
  { value: 50, label: '$50', sub: 'This hurts' },
  { value: 100, label: '$100', sub: 'All in' },
];

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < step ? 'var(--uv-gold)' : 'var(--uv-border-strong)',
            transition: 'background 200ms',
          }}
        />
      ))}
    </div>
  );
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
  const vowSnippet = vowText.length > 30 ? `"${vowText.slice(0, 27)}..."` : `"${vowText}"`;
  const deadlineLabel = endsAt
    ? endsAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'This week';
  const witnessLabel = witnessName && witnessName !== 'TBD'
    ? `${witnessName}'s your witness`
    : 'No witness yet';

  return (
    <RitualScreen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Card container — everything lives inside */}
        <div style={{
          background: 'var(--uv-bg-card)',
          border: '1px solid var(--uv-border-strong)',
          borderRadius: 22,
          padding: '20px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <Progress step={3} total={3} />

          {/* Back button */}
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--uv-bg-input)', border: '1px solid var(--uv-border-strong)',
              cursor: 'pointer', marginBottom: 20,
            }}
          >
            <ChevronLeft size={18} color="var(--uv-text-muted)" />
          </button>

          {/* Hero */}
          <h1 style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 28, fontWeight: 400,
            color: 'var(--uv-text)', margin: 0, lineHeight: 1.1,
          }}>
            How serious
          </h1>
          <h1 style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 28, fontWeight: 400,
            fontStyle: 'italic', color: 'var(--uv-gold)', margin: '2px 0 16px', lineHeight: 1.1,
          }}>
            are you.
          </h1>

          {/* Context pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 9999,
            background: 'var(--uv-bg-input)', border: '1px solid var(--uv-border-strong)',
            marginBottom: 20, alignSelf: 'flex-start', maxWidth: '100%',
          }}>
            <span style={{
              fontSize: 13, color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {vowSnippet}
            </span>
            <span style={{ fontSize: 12, color: 'var(--uv-border-strong)' }}>·</span>
            <span style={{ fontSize: 12, color: 'var(--uv-text-dim)', whiteSpace: 'nowrap' }}>
              {deadlineLabel}
            </span>
            <span style={{ fontSize: 12, color: 'var(--uv-border-strong)' }}>·</span>
            <span style={{
              fontSize: 12, color: 'var(--uv-gold)', fontWeight: 500, whiteSpace: 'nowrap',
            }}>
              {witnessLabel}
            </span>
          </div>

          {/* Amount pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {AMOUNTS.map((amt) => {
              const active = stakeAmount === amt.value;
              return (
                <button
                  key={amt.value}
                  type="button"
                  onClick={() => setStakeAmount(amt.value)}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 2, padding: '12px 4px',
                    background: active ? 'var(--uv-gold-bg)' : 'var(--uv-bg-input)',
                    border: `1.5px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
                    borderRadius: 12, cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--uv-font-sans)', fontSize: 18, fontWeight: 600,
                    color: active ? 'var(--uv-gold)' : 'var(--uv-text)',
                  }}>
                    {amt.label}
                  </span>
                  <span style={{
                    fontFamily: 'var(--uv-font-sans)', fontSize: 10,
                    color: active ? 'var(--uv-gold-dim)' : 'var(--uv-text-faint)',
                    fontWeight: 500,
                  }}>
                    {amt.sub}
                  </span>
                </button>
              );
            })}
          </div>

          {/* $5 option */}
          <p style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 13,
            color: 'var(--uv-text-dim)', margin: '0 0 20px',
          }}>
            or{' '}
            <button
              type="button"
              onClick={() => setStakeAmount(5)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: 'var(--uv-font-sans)', fontSize: 13,
                color: 'var(--uv-gold)', fontWeight: 500,
                textDecoration: stakeAmount === 5 ? 'underline' : 'none',
              }}
            >
              $5
            </button>
            {' '}to get your feet wet
          </p>

          {/* If broken row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'var(--uv-bg-elev)',
            border: '1px solid var(--uv-border-strong)',
            borderRadius: 12, marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 13,
                color: 'var(--uv-text-faint)', fontStyle: 'italic',
              }}>
                If you break it
              </span>
              <span style={{ color: 'var(--uv-text-faint)' }}>→</span>
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
                color: 'var(--uv-gold)', fontWeight: 500,
              }}
            >
              Change ›
            </button>
          </div>

          {/* Trust copy */}
          <p style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 14,
            fontStyle: 'italic', color: 'var(--uv-success)',
            margin: '0 0 4px', lineHeight: 1.4,
          }}>
            Keep your word — every penny back.
          </p>
          <p style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 12,
            color: 'var(--uv-text-faint)', margin: 0,
          }}>
            No charge unless you break your vow.
          </p>
        </div>

        <div style={{ flex: 1 }} />

        {/* CTA */}
        <div style={{ paddingTop: 24, paddingBottom: 16 }}>
          <PrimaryButton onClick={onNext}>
            Seal my vow — ${stakeAmount}
          </PrimaryButton>
        </div>
      </div>
    </RitualScreen>
  );
}
