'use client';

import React, { useState } from 'react';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { Card } from '@/components/uv/Card';

interface IfBrokenSheetProps {
  destination: string;
  destinationKind: 'charity' | 'anti';
  onSelect: (dest: string, kind: 'charity' | 'anti') => void;
  onClose: () => void;
}

const CHARITIES = [
  { name: 'American Red Cross', sub: '' },
  { name: 'Doctors Without Borders', sub: '' },
  { name: 'Local food bank', sub: '' },
  { name: 'Wikipedia', sub: '' },
];

const ANTI_CAUSES = [
  { name: 'The NRA', sub: 'National Rifle Association' },
  { name: 'PETA', sub: 'People for the Ethical Treatment of Animals' },
];

export function IfBrokenSheet({ destination, destinationKind, onSelect, onClose }: IfBrokenSheetProps) {
  const [selectedDest, setSelectedDest] = useState(destination);
  const [selectedKind, setSelectedKind] = useState<'charity' | 'anti'>(destinationKind);

  const handleSelect = (name: string, kind: 'charity' | 'anti') => {
    setSelectedDest(name);
    setSelectedKind(kind);
  };

  const handleConfirm = () => {
    onSelect(selectedDest, selectedKind);
  };

  return (
    <RitualScreen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
          If you break it
        </h1>

        <p
          style={{
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 14,
            color: 'var(--uv-text-dim)',
            margin: '0 0 24px',
          }}
        >
          Where does your money go? Pick the version that&apos;ll hurt most.
        </p>

        {/* Charity section */}
        <p
          style={{
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--uv-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: '0 0 10px',
          }}
        >
          Give to something good
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {CHARITIES.map((c) => (
            <Card
              key={c.name}
              variant={selectedDest === c.name && selectedKind === 'charity' ? 'elevated' : 'default'}
              onClick={() => handleSelect(c.name, 'charity')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontFamily: 'var(--uv-font-sans)',
                    fontSize: 14,
                    color: selectedDest === c.name && selectedKind === 'charity' ? 'var(--uv-gold)' : 'var(--uv-text)',
                    fontWeight: selectedDest === c.name && selectedKind === 'charity' ? 500 : 400,
                  }}
                >
                  {c.name}
                </span>
                {selectedDest === c.name && selectedKind === 'charity' && (
                  <span style={{ color: 'var(--uv-gold)', fontSize: 16 }}>&#10003;</span>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Anti-cause section */}
        <p
          style={{
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--uv-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: '0 0 10px',
          }}
        >
          Give to something you&apos;ll hate
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {ANTI_CAUSES.map((c) => (
            <Card
              key={c.name}
              variant={selectedDest === c.name && selectedKind === 'anti' ? 'elevated' : 'default'}
              onClick={() => handleSelect(c.name, 'anti')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span
                    style={{
                      fontFamily: 'var(--uv-font-sans)',
                      fontSize: 14,
                      color: selectedDest === c.name && selectedKind === 'anti' ? 'var(--uv-gold)' : 'var(--uv-text)',
                      fontWeight: selectedDest === c.name && selectedKind === 'anti' ? 500 : 400,
                    }}
                  >
                    {c.name}
                  </span>
                  {c.sub && (
                    <p style={{ fontSize: 12, color: 'var(--uv-text-muted)', margin: '2px 0 0' }}>
                      {c.sub}
                    </p>
                  )}
                </div>
                {selectedDest === c.name && selectedKind === 'anti' && (
                  <span style={{ color: 'var(--uv-gold)', fontSize: 16 }}>&#10003;</span>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Anti-cause warning */}
        {selectedKind === 'anti' && (
          <p
            style={{
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 12,
              color: 'var(--uv-warn-text, #f59e0b)',
              fontStyle: 'italic',
              marginBottom: 16,
            }}
          >
            Maximum pain. Maximum motivation. Your money goes here if your witness says you broke it.
          </p>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 24, paddingBottom: 16 }}>
          <PrimaryButton onClick={handleConfirm}>
            Lock it in &rarr;
          </PrimaryButton>
          <button
            type="button"
            onClick={onClose}
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
