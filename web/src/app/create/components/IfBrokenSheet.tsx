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
  { name: 'St. Jude', emoji: '🏥', sub: 'Childhood cancer research' },
  { name: 'Ronald McDonald House', emoji: '🏠', sub: 'Families with sick kids' },
  { name: 'Feeding America', emoji: '🍽️', sub: 'Feeds families nationwide' },
  { name: 'American Red Cross', emoji: '🩸', sub: 'Disaster relief' },
  { name: 'Doctors Without Borders', emoji: '🌍', sub: 'Global medical aid' },
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
          fontStyle: 'italic', color: 'var(--uv-gold)', margin: '0 0 8px', lineHeight: 1.1,
        }}>
          where does it go?
        </h1>
        <p style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 13, color: 'var(--uv-text-dim)',
          margin: '0 0 24px', lineHeight: 1.4,
        }}>
          Pick the version that&apos;ll keep you honest.
        </p>

        {/* ── MODE TOGGLE ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {/* Nice way */}
          <button
            type="button"
            onClick={() => { if (selectedKind !== 'charity') handleSelect(CHARITIES[0].name, 'charity'); }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 4, padding: '14px 8px',
              background: selectedKind === 'charity' ? 'var(--uv-success-bg)' : 'var(--uv-bg-input)',
              border: `1.5px solid ${selectedKind === 'charity' ? 'var(--uv-success-border, #1f6b3f)' : 'var(--uv-border-strong)'}`,
              borderRadius: 14, cursor: 'pointer',
              transition: 'all 200ms',
              boxShadow: selectedKind === 'charity' ? '0 0 20px rgba(74,222,128,0.08)' : 'none',
            }}
          >
            <span style={{ fontSize: 24 }}>💚</span>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 600,
              color: selectedKind === 'charity' ? 'var(--uv-success)' : 'var(--uv-text-dim)',
            }}>
              Do some good
            </span>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 10,
              color: selectedKind === 'charity' ? 'rgba(74,222,128,0.7)' : 'var(--uv-text-faint)',
            }}>
              Someone wins either way
            </span>
          </button>

          {/* Nuclear option */}
          <button
            type="button"
            onClick={() => { if (selectedKind !== 'anti') handleSelect(ANTI_CAUSES[0].name, 'anti'); }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 4, padding: '14px 8px',
              background: selectedKind === 'anti' ? 'rgba(248,113,113,0.08)' : 'var(--uv-bg-input)',
              border: `1.5px solid ${selectedKind === 'anti' ? 'var(--uv-danger)' : 'var(--uv-border-strong)'}`,
              borderRadius: 14, cursor: 'pointer',
              transition: 'all 200ms',
              boxShadow: selectedKind === 'anti' ? '0 0 20px rgba(248,113,113,0.08)' : 'none',
            }}
          >
            <span style={{ fontSize: 24 }}>🔥</span>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 600,
              color: selectedKind === 'anti' ? 'var(--uv-danger)' : 'var(--uv-text-dim)',
            }}>
              Nuclear option
            </span>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 10,
              color: selectedKind === 'anti' ? 'rgba(248,113,113,0.7)' : 'var(--uv-text-faint)',
            }}>
              Max pain. Max motivation.
            </span>
          </button>
        </div>

        {/* ── CHARITY OPTIONS ── */}
        {selectedKind === 'charity' && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 6,
            animation: 'fadeIn 200ms ease',
          }}>
            {CHARITIES.map((c) => {
              const active = isCharity(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleSelect(c.name, 'charity')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    background: active ? 'var(--uv-success-bg)' : 'var(--uv-bg-input)',
                    border: `1px solid ${active ? 'var(--uv-success-border, #1f6b3f)' : 'var(--uv-border-strong)'}`,
                    borderRadius: 12, cursor: 'pointer',
                    transition: 'all 150ms', textAlign: 'left', width: '100%',
                  }}
                >
                  <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{c.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontFamily: 'var(--uv-font-sans)', fontSize: 14,
                      color: active ? 'var(--uv-success)' : 'var(--uv-text)',
                      fontWeight: 500, display: 'block',
                    }}>
                      {c.name}
                    </span>
                    <span style={{
                      fontFamily: 'var(--uv-font-sans)', fontSize: 11,
                      color: active ? 'rgba(74,222,128,0.6)' : 'var(--uv-text-faint)',
                    }}>
                      {c.sub}
                    </span>
                  </div>
                  {active && (
                    <span style={{ color: 'var(--uv-success)', fontSize: 16 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── ANTI-CAUSE OPTIONS ── */}
        {selectedKind === 'anti' && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            animation: 'fadeIn 200ms ease',
          }}>
            {/* Max pain badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 10,
              background: 'rgba(248,113,113,0.06)',
              border: '1px solid rgba(248,113,113,0.12)',
            }}>
              <span style={{ fontSize: 14 }}>💀</span>
              <span style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 12,
                color: 'var(--uv-text-muted)', lineHeight: 1.4,
              }}>
                Pick the org that would <em style={{ color: 'var(--uv-danger)', fontStyle: 'italic' }}>genuinely sting</em> to fund. That&apos;s the point.
              </span>
            </div>

            {ANTI_CAUSES.map((c) => {
              const active = isAnti(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleSelect(c.name, 'anti')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 14px',
                    background: active ? 'var(--uv-bg-selected)' : 'var(--uv-bg-input)',
                    border: `1.5px solid ${active ? 'var(--uv-danger)' : 'var(--uv-border-strong)'}`,
                    borderRadius: 12, cursor: 'pointer',
                    transition: 'all 150ms', textAlign: 'left', width: '100%',
                    boxShadow: active ? '0 0 16px rgba(248,113,113,0.06)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 24, width: 32, textAlign: 'center' }}>{c.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontFamily: 'var(--uv-font-sans)', fontSize: 15,
                      color: active ? 'var(--uv-danger)' : 'var(--uv-text)',
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
                    <span style={{ color: 'var(--uv-danger)', fontSize: 16, fontWeight: 600 }}>✓</span>
                  )}
                </button>
              );
            })}

            {/* Warning */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '10px 12px', borderRadius: 10,
              background: 'var(--uv-warn-bg)', border: '1px solid var(--uv-warn-border)',
              marginTop: 4,
            }}>
              <span style={{ fontSize: 14, marginTop: 1 }}>⚠️</span>
              <p style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 12, color: 'var(--uv-text-muted)',
                margin: 0, lineHeight: 1.5,
              }}>
                If you break this, your money goes to <strong style={{ color: 'var(--uv-text)', fontWeight: 500 }}>{selectedDest}</strong>. For real. We can&apos;t undo it.
              </p>
            </div>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 24, paddingBottom: 16 }}>
          <PrimaryButton onClick={() => onSelect(selectedDest, selectedKind)}>
            {selectedKind === 'anti' ? '🔥 Lock it in — I dare myself' : 'Lock it in →'}
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
