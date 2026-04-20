'use client';

import React, { useState } from 'react';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';

interface IfBrokenSheetProps {
  destination: string;
  destinationKind: 'charity' | 'anti';
  onSelect: (dest: string, kind: 'charity' | 'anti') => void;
  onClose: () => void;
}

const CHARITIES = [
  { name: 'American Red Cross', emoji: '🩸' },
  { name: 'Doctors Without Borders', emoji: '🌍' },
  { name: 'Local food bank', emoji: '🍞' },
  { name: 'Wikipedia', emoji: '📚' },
];

const ANTI_CAUSES = [
  { name: 'The NRA', sub: 'National Rifle Association', emoji: '🔫' },
  { name: 'PETA', sub: 'People for the Ethical Treatment of Animals', emoji: '🐄' },
];

export function IfBrokenSheet({ destination, destinationKind, onSelect, onClose }: IfBrokenSheetProps) {
  const [selectedDest, setSelectedDest] = useState(destination);
  const [selectedKind, setSelectedKind] = useState<'charity' | 'anti'>(destinationKind);

  const handleSelect = (name: string, kind: 'charity' | 'anti') => {
    setSelectedDest(name);
    setSelectedKind(kind);
  };

  const isCharity = (name: string) => selectedDest === name && selectedKind === 'charity';
  const isAnti = (name: string) => selectedDest === name && selectedKind === 'anti';

  return (
    <RitualScreen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Hero */}
        <h1 style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 26, fontWeight: 400,
          color: 'var(--uv-text)', margin: '0 0 4px', lineHeight: 1.1,
        }}>
          If you break it,
        </h1>
        <h1 style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 26, fontWeight: 400,
          fontStyle: 'italic', color: 'var(--uv-gold)', margin: '0 0 24px', lineHeight: 1.1,
        }}>
          where does it go?
        </h1>

        {/* ── CAUSE YOU BELIEVE IN ── */}
        <button
          type="button"
          onClick={() => { if (selectedKind !== 'charity') handleSelect(CHARITIES[0].name, 'charity'); }}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 28 }}>💚</span>
          <div>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 15, fontWeight: 500,
              color: selectedKind === 'charity' ? 'var(--uv-success)' : 'var(--uv-text)',
              display: 'block',
            }}>
              A cause you believe in
            </span>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 12,
              color: 'var(--uv-text-dim)',
            }}>
              At least someone wins.
            </span>
          </div>
        </button>

        {selectedKind === 'charity' && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24,
            paddingLeft: 8, borderLeft: '2px solid var(--uv-success-border, #1f6b3f)',
          }}>
            {CHARITIES.map((c) => {
              const active = isCharity(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleSelect(c.name, 'charity')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    background: active ? 'var(--uv-success-bg)' : 'var(--uv-bg-input)',
                    border: `1px solid ${active ? 'var(--uv-success-border, #1f6b3f)' : 'var(--uv-border-strong)'}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{c.emoji}</span>
                  <span style={{
                    fontFamily: 'var(--uv-font-sans)', fontSize: 14,
                    color: active ? 'var(--uv-success)' : 'var(--uv-text)',
                    fontWeight: active ? 500 : 400,
                  }}>
                    {c.name}
                  </span>
                  {active && (
                    <span style={{ marginLeft: 'auto', color: 'var(--uv-success)', fontSize: 16 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── CAUSE YOU'D HATE TO FUND ── */}
        <button
          type="button"
          onClick={() => { if (selectedKind !== 'anti') handleSelect(ANTI_CAUSES[0].name, 'anti'); }}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 28 }}>🔥</span>
          <div>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 15, fontWeight: 500,
              color: selectedKind === 'anti' ? 'var(--uv-gold)' : 'var(--uv-text)',
              display: 'block',
            }}>
              A cause you&apos;d hate to fund
            </span>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 12,
              color: 'var(--uv-text-dim)',
            }}>
              Maximum motivation not to break.
            </span>
          </div>
        </button>

        {/* "Max pain" badge */}
        {selectedKind === 'anti' && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 9999,
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
            alignSelf: 'flex-start', marginBottom: 12, marginLeft: 40,
          }}>
            <span style={{ fontSize: 12 }}>💀</span>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 600,
              color: 'var(--uv-danger)', letterSpacing: '0.5px', textTransform: 'uppercase' as const,
            }}>
              MAX PAIN MODE
            </span>
          </div>
        )}

        {selectedKind === 'anti' && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16,
            paddingLeft: 8, borderLeft: '2px solid var(--uv-gold-deep)',
          }}>
            {ANTI_CAUSES.map((c) => {
              const active = isAnti(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleSelect(c.name, 'anti')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px',
                    background: active ? 'var(--uv-bg-selected)' : 'var(--uv-bg-input)',
                    border: `1px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{c.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontFamily: 'var(--uv-font-sans)', fontSize: 14,
                      color: active ? 'var(--uv-gold)' : 'var(--uv-text)',
                      fontWeight: 500, display: 'block',
                    }}>
                      {c.name}
                    </span>
                    <span style={{
                      fontFamily: 'var(--uv-font-sans)', fontSize: 11,
                      color: 'var(--uv-text-dim)',
                    }}>
                      {c.sub}
                    </span>
                  </div>
                  {active && (
                    <span style={{ color: 'var(--uv-gold)', fontSize: 16 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Anti-cause warning */}
        {selectedKind === 'anti' && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--uv-warn-bg)', border: '1px solid var(--uv-warn-border)',
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 16, marginTop: 1 }}>⚠️</span>
            <p style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 12, color: 'var(--uv-text-muted)',
              margin: 0, lineHeight: 1.5,
            }}>
              If you break this, your money goes to <strong style={{ color: 'var(--uv-text)', fontWeight: 500 }}>{selectedDest}</strong>. We can&apos;t un-send it. Sure?
            </p>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 24, paddingBottom: 16 }}>
          <PrimaryButton onClick={() => onSelect(selectedDest, selectedKind)}>
            Lock it in →
          </PrimaryButton>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none', border: 'none', padding: '8px 0', cursor: 'pointer',
              fontFamily: 'var(--uv-font-sans)', fontSize: 13,
              color: 'var(--uv-text-muted)', textAlign: 'center',
            }}
          >
            ← Back
          </button>
        </div>
      </div>
    </RitualScreen>
  );
}
