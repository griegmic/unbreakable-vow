'use client';

import React, { useState } from 'react';
import { RitualScreen, GoldCTA } from '@/components/primitives';

interface WitnessStepProps {
  witnessName: string;
  setWitnessName: (name: string) => void;
  witnessPhone: string;
  setWitnessPhone: (phone: string) => void;
  vowText: string;
  endsAt: Date | null;
  onNext: () => void;
  onBack: () => void;
}

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

export function WitnessStep({
  witnessName,
  setWitnessName,
  witnessPhone,
  setWitnessPhone,
  vowText,
  endsAt,
  onNext,
  onBack,
}: WitnessStepProps) {
  const [showPhone, setShowPhone] = useState(false);

  const vowSnippet = vowText.length > 40 ? vowText.slice(0, 37) + '...' : vowText;
  const deadlineLabel = endsAt
    ? endsAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : '';

  const isValid = witnessName.trim().length >= 2;

  return (
    <RitualScreen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Progress step={2} total={3} />

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
          {deadlineLabel && (
            <>
              <span style={{ fontSize: 12, color: 'var(--uv-border-strong)' }}>&middot;</span>
              <span style={{ fontSize: 12, color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)' }}>
                {deadlineLabel}
              </span>
            </>
          )}
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
          Who&apos;s your judge?
        </h1>

        <p
          style={{
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 14,
            color: 'var(--uv-text-muted)',
            margin: '0 0 24px',
          }}
        >
          One friend who&apos;ll hold you to it. They decide if you kept your word.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--uv-text-muted)' }}>Their first name</label>
          <input type="text" value={witnessName} onChange={(e) => setWitnessName(e.target.value)} placeholder="e.g. Sarah" style={{ width: '100%', padding: '12px 14px', fontFamily: 'var(--uv-font-sans)', fontSize: 15, color: 'var(--uv-text)', background: 'var(--uv-bg-input)', border: '1px solid var(--uv-border)', borderRadius: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {!showPhone && (
          <button
            type="button"
            onClick={() => setShowPhone(true)}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 0',
              cursor: 'pointer',
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 13,
              color: 'var(--uv-gold)',
              textAlign: 'left',
            }}
          >
            Add their phone (optional) &rarr;
          </button>
        )}

        {showPhone && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--uv-text-muted)' }}>Phone number</label>
              <input type="tel" value={witnessPhone} onChange={(e) => setWitnessPhone(e.target.value)} placeholder="+1 555 123 4567" style={{ width: '100%', padding: '12px 14px', fontFamily: 'var(--uv-font-sans)', fontSize: 15, color: 'var(--uv-text)', background: 'var(--uv-bg-input)', border: '1px solid var(--uv-border)', borderRadius: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
        )}

        <p
          style={{
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 12,
            color: 'var(--uv-text-dim)',
            marginTop: 24,
          }}
        >
          You&apos;ll send them the vow after you seal it.
        </p>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 24, paddingBottom: 16 }}>
          <GoldCTA label="Continue →" onPress={onNext} disabled={!isValid} />
          <button
            type="button"
            onClick={() => {
              setWitnessName('');
              onNext();
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 0',
              cursor: 'pointer',
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 13,
              color: 'var(--uv-gold-dim, #8a7540)',
              textAlign: 'center',
            }}
          >
            Decide later — share the link yourself
          </button>
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
