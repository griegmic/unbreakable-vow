'use client';

import React from 'react';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { AmountPill } from '@/components/uv/AmountPill';

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
}

const AMOUNTS = [10, 25, 50, 100];

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
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
}: StakesStepProps) {
  const vowSnippet = vowText.length > 30 ? vowText.slice(0, 27) + '...' : vowText;

  return (
    <RitualScreen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Progress step={3} total={3} />

        {/* Context pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 'var(--uv-radius-pill, 999px)',
            background: 'var(--uv-bg-input)',
            border: '1px solid var(--uv-border-strong)',
            marginBottom: 20,
            alignSelf: 'flex-start',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)' }}>
            {vowSnippet}
          </span>
          <span style={{ fontSize: 12, color: 'var(--uv-border-strong)' }}>&middot;</span>
          <span style={{ fontSize: 12, color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)' }}>
            {witnessName}
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 22,
            fontWeight: 500,
            color: 'var(--uv-text)',
            margin: '0 0 8px',
            lineHeight: 1.2,
          }}
        >
          What&apos;s on the line?
        </h1>

        <p
          style={{
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 14,
            color: 'var(--uv-text-dim)',
            margin: '0 0 24px',
          }}
        >
          Real money. You get it back if you keep your word.
        </p>

        {/* Amount pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {AMOUNTS.map((amt) => (
            <AmountPill
              key={amt}
              amount={`$${amt}`}
              selected={stakeAmount === amt}
              onClick={() => setStakeAmount(amt)}
            />
          ))}
        </div>

        {/* If you break this */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 0',
            borderTop: '1px solid var(--uv-border-strong)',
            borderBottom: '1px solid var(--uv-border-strong)',
          }}
        >
          <div>
            <span
              style={{
                fontFamily: 'var(--uv-font-sans)',
                fontSize: 13,
                color: 'var(--uv-text-muted)',
              }}
            >
              If you break this
            </span>
            <p
              style={{
                fontFamily: 'var(--uv-font-sans)',
                fontSize: 14,
                color: 'var(--uv-text)',
                margin: '2px 0 0',
                fontWeight: 500,
              }}
            >
              ${stakeAmount} &rarr; {destination}
            </p>
          </div>
          <button
            type="button"
            onClick={onIfBroken}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 13,
              color: 'var(--uv-gold)',
              fontWeight: 500,
            }}
          >
            Change &rsaquo;
          </button>
        </div>

        <p
          style={{
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 12,
            color: 'var(--uv-text-dim)',
            marginTop: 20,
            lineHeight: 1.5,
          }}
        >
          You keep the money if you keep the vow. We hold it in escrow until your judge calls it.
        </p>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 24, paddingBottom: 16 }}>
          <PrimaryButton onClick={onNext}>
            Review &rarr;
          </PrimaryButton>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 0',
              cursor: 'pointer',
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 13,
              color: 'var(--uv-text-muted)',
              textAlign: 'center',
            }}
          >
            &larr; Back
          </button>
        </div>
      </div>
    </RitualScreen>
  );
}
