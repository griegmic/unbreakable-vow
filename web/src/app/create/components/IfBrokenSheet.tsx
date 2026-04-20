'use client';

import React, { useState } from 'react';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { ChevronLeft } from 'lucide-react';

interface IfBrokenSheetProps {
  destination: string;
  destinationKind: 'charity' | 'anti';
  onSelect: (dest: string, kind: 'charity' | 'anti') => void;
  onClose: () => void;
}

type Mode = 'charity' | 'witness' | 'anti';

const CHARITIES = [
  { name: 'St. Jude', sub: 'Childhood cancer research' },
  { name: 'Ronald McDonald House', sub: 'Families with sick kids' },
  { name: 'Feeding America', sub: 'Feeds families nationwide' },
  { name: 'Doctors Without Borders', sub: 'Global medical aid' },
];

const ANTI_CAUSES = [
  { name: 'The NRA', sub: 'National Rifle Association' },
  { name: 'PETA', sub: 'People for the Ethical Treatment of Animals' },
];

export function IfBrokenSheet({ destination, destinationKind, onSelect, onClose }: IfBrokenSheetProps) {
  const [mode, setMode] = useState<Mode>(destinationKind === 'anti' ? 'anti' : 'charity');
  const [selectedDest, setSelectedDest] = useState(destination);
  const [selectedKind, setSelectedKind] = useState<'charity' | 'anti'>(destinationKind);

  const handleModeSelect = (m: Mode) => {
    setMode(m);
    if (m === 'charity' && selectedKind !== 'charity') {
      setSelectedKind('charity');
      setSelectedDest(CHARITIES[0].name);
    } else if (m === 'anti' && selectedKind !== 'anti') {
      setSelectedKind('anti');
      setSelectedDest(ANTI_CAUSES[0].name);
    }
  };

  const handleOrgSelect = (name: string, kind: 'charity' | 'anti') => {
    setSelectedDest(name);
    setSelectedKind(kind);
  };

  const modes: { id: Mode; icon: string; title: string; sub: string; accent: string; bg: string; border: string; disabled?: boolean }[] = [
    {
      id: 'charity',
      icon: '💚',
      title: 'A cause you believe in',
      sub: 'Your money does some good.',
      accent: 'var(--uv-success)',
      bg: 'var(--uv-success-bg)',
      border: 'var(--uv-success-border, #1f6b3f)',
    },
    {
      id: 'witness',
      icon: '👁️',
      title: 'Your witness gets it',
      sub: 'They profit from your failure.',
      accent: 'var(--uv-gold)',
      bg: 'var(--uv-gold-bg)',
      border: 'var(--uv-gold)',
      disabled: true,
    },
    {
      id: 'anti',
      icon: '🔥',
      title: 'A cause you hate',
      sub: 'Maximum pain. Maximum motivation.',
      accent: 'var(--uv-danger)',
      bg: 'var(--uv-danger-bg)',
      border: 'var(--uv-danger)',
    },
  ];

  return (
    <RitualScreen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Back */}
        <button
          type="button"
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: '50%',
            background: 'transparent', border: 'none',
            cursor: 'pointer', marginBottom: 20, marginLeft: -8,
          }}
        >
          <ChevronLeft size={20} color="var(--uv-text-dim)" />
        </button>

        {/* Hero */}
        <h1 style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 24, fontWeight: 400,
          color: 'var(--uv-text)', margin: '0 0 32px', lineHeight: 1.2,
        }}>
          Where does it go if you fail?
        </h1>

        {/* Three mode cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {modes.map(m => {
            const active = mode === m.id;
            const disabled = m.disabled;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => !disabled && handleModeSelect(m.id)}
                disabled={disabled}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 18px',
                  background: active ? m.bg : 'var(--uv-bg-input)',
                  border: `1.5px solid ${active ? m.border : 'var(--uv-border-strong)'}`,
                  borderRadius: 16,
                  cursor: disabled ? 'default' : 'pointer',
                  transition: 'all 200ms cubic-bezier(0.22,1,0.36,1)',
                  textAlign: 'left', width: '100%',
                  opacity: disabled ? 0.45 : 1,
                  boxShadow: active ? `0 0 20px ${m.bg}` : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Radio circle */}
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${active ? m.accent : 'var(--uv-text-faint)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color 200ms',
                }}>
                  {active && (
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: m.accent,
                    }} />
                  )}
                </div>

                {/* Icon */}
                <span style={{ fontSize: 22 }}>{m.icon}</span>

                {/* Text */}
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontFamily: 'var(--uv-font-sans)', fontSize: 15, fontWeight: 500,
                    color: active ? m.accent : 'var(--uv-text)',
                    display: 'block', transition: 'color 200ms',
                  }}>
                    {m.title}
                  </span>
                  <span style={{
                    fontFamily: 'var(--uv-font-sans)', fontSize: 12,
                    color: active ? m.accent : 'var(--uv-text-dim)',
                    opacity: active ? 0.7 : 1,
                    transition: 'color 200ms',
                  }}>
                    {m.sub}
                  </span>
                </div>

                {/* Coming soon badge */}
                {disabled && (
                  <span style={{
                    fontFamily: 'var(--uv-font-sans)', fontSize: 9, fontWeight: 600,
                    letterSpacing: '1px', textTransform: 'uppercase' as const,
                    color: 'var(--uv-gold)', background: 'rgba(212,168,74,0.12)',
                    padding: '3px 8px', borderRadius: 20,
                  }}>
                    SOON
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Org picker — appears below the active mode */}
        {mode === 'charity' && (
          <div style={{
            marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6,
            animation: 'fadeIn 200ms ease',
          }}>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 500,
              letterSpacing: '1.5px', textTransform: 'uppercase' as const,
              color: 'var(--uv-text-faint)', marginBottom: 4,
            }}>
              PICK ONE
            </span>
            {CHARITIES.map(c => {
              const active = selectedDest === c.name && selectedKind === 'charity';
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleOrgSelect(c.name, 'charity')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 14px',
                    background: active ? 'var(--uv-success-bg)' : 'transparent',
                    border: `1px solid ${active ? 'var(--uv-success-border, #1f6b3f)' : 'var(--uv-border)'}`,
                    borderRadius: 10, cursor: 'pointer',
                    transition: 'all 150ms', textAlign: 'left', width: '100%',
                  }}
                >
                  <div>
                    <span style={{
                      fontFamily: 'var(--uv-font-sans)', fontSize: 14,
                      color: active ? 'var(--uv-success)' : 'var(--uv-text)',
                      fontWeight: active ? 500 : 400,
                    }}>
                      {c.name}
                    </span>
                    <span style={{
                      fontFamily: 'var(--uv-font-sans)', fontSize: 11,
                      color: 'var(--uv-text-faint)', marginLeft: 8,
                    }}>
                      {c.sub}
                    </span>
                  </div>
                  {active && <span style={{ color: 'var(--uv-success)' }}>✓</span>}
                </button>
              );
            })}
          </div>
        )}

        {mode === 'anti' && (
          <div style={{
            marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6,
            animation: 'fadeIn 200ms ease',
          }}>
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 500,
              letterSpacing: '1.5px', textTransform: 'uppercase' as const,
              color: 'var(--uv-text-faint)', marginBottom: 4,
            }}>
              PICK YOUR POISON
            </span>
            {ANTI_CAUSES.map(c => {
              const active = selectedDest === c.name && selectedKind === 'anti';
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleOrgSelect(c.name, 'anti')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 14px',
                    background: active ? 'var(--uv-danger-bg)' : 'transparent',
                    border: `1px solid ${active ? 'var(--uv-danger)' : 'var(--uv-border)'}`,
                    borderRadius: 10, cursor: 'pointer',
                    transition: 'all 150ms', textAlign: 'left', width: '100%',
                  }}
                >
                  <div>
                    <span style={{
                      fontFamily: 'var(--uv-font-sans)', fontSize: 14,
                      color: active ? 'var(--uv-danger)' : 'var(--uv-text)',
                      fontWeight: active ? 500 : 400,
                    }}>
                      {c.name}
                    </span>
                    <span style={{
                      fontFamily: 'var(--uv-font-sans)', fontSize: 11,
                      color: 'var(--uv-text-faint)', marginLeft: 8,
                    }}>
                      {c.sub}
                    </span>
                  </div>
                  {active && <span style={{ color: 'var(--uv-danger)' }}>✓</span>}
                </button>
              );
            })}

            {/* Warning */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8, marginTop: 4,
              background: 'rgba(248,113,113,0.05)',
            }}>
              <span style={{ fontSize: 12 }}>⚠️</span>
              <span style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 11,
                color: 'var(--uv-text-faint)', fontStyle: 'italic',
              }}>
                ${selectedDest}. For real. No refund if you break it.
              </span>
            </div>
          </div>
        )}

        <div style={{ flex: 1, minHeight: 24 }} />

        <PrimaryButton onClick={() => onSelect(selectedDest, selectedKind)}>
          Lock it in →
        </PrimaryButton>
      </div>
    </RitualScreen>
  );
}
