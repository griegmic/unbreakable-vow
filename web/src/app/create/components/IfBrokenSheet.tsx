'use client';

import React, { useState } from 'react';
import { RitualScreen, GoldCTA } from '@/components/primitives';
import { ChevronLeft } from 'lucide-react';

interface IfBrokenSheetProps {
  destination: string;
  destinationKind: 'charity' | 'anti';
  onSelect: (dest: string, kind: 'charity' | 'anti') => void;
  onClose: () => void;
}

type Tab = 'anti' | 'charity' | 'witness';

const ANTI_CAUSES = [
  { name: 'NRA', sub: 'National Rifle Association' },
  { name: 'PETA', sub: 'People for the Ethical Treatment of Animals' },
];

const CHARITIES = [
  { name: 'ALS Association', sub: 'ALS research & support' },
  { name: 'St. Jude', sub: 'Childhood cancer' },
  { name: 'Ronald McDonald House', sub: 'Sick kids\' families' },
  { name: 'Feeding America', sub: 'Hunger relief' },
  { name: 'Doctors Without Borders', sub: 'Global medical aid' },
];

export function IfBrokenSheet({ destination, destinationKind, onSelect, onClose }: IfBrokenSheetProps) {
  // Default to charity (safe default, left tab)
  const [tab, setTab] = useState<Tab>(destinationKind === 'anti' ? 'anti' : 'charity');
  const [selectedDest, setSelectedDest] = useState(destination || 'ALS Association');
  const [selectedKind, setSelectedKind] = useState<'charity' | 'anti'>(destinationKind);

  const handleOrgSelect = (name: string, kind: 'charity' | 'anti') => {
    setSelectedDest(name);
    setSelectedKind(kind);
  };

  const handleTabSwitch = (t: Tab) => {
    if (t === 'witness') return; // disabled
    setTab(t);
    if (t === 'anti' && selectedKind !== 'anti') {
      setSelectedKind('anti');
      setSelectedDest(ANTI_CAUSES[0].name);
    } else if (t === 'charity' && selectedKind !== 'charity') {
      setSelectedKind('charity');
      setSelectedDest(CHARITIES[0].name);
    }
  };

  const tabs: { id: Tab; label: string; disabled?: boolean }[] = [
    { id: 'charity', label: 'A cause you believe in' },
    { id: 'anti', label: 'A cause you hate' },
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
            cursor: 'pointer', marginBottom: 16, marginLeft: -8,
          }}
        >
          <ChevronLeft size={20} color="var(--uv-text-dim)" />
        </button>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 24, fontWeight: 400,
          color: 'var(--uv-text)', margin: '0 0 20px', lineHeight: 1.2,
        }}>
          Where does it go if you fail?
        </h1>

        {/* Three-tab toggle */}
        <div style={{
          display: 'flex', gap: 0,
          background: 'var(--uv-bg-input)',
          borderRadius: 12,
          padding: 3,
          marginBottom: 16,
        }}>
          {tabs.map(t => {
            const active = tab === t.id;
            const disabled = t.disabled;
            const accentColor = t.id === 'anti' ? 'var(--uv-danger)'
              : t.id === 'charity' ? 'var(--uv-success)'
              : 'var(--uv-gold)';
            const activeBg = t.id === 'anti' ? 'var(--uv-danger-bg)'
              : t.id === 'charity' ? 'var(--uv-success-bg)'
              : 'var(--uv-gold-bg)';
            const activeBorder = t.id === 'anti' ? 'rgba(248,113,113,0.3)'
              : t.id === 'charity' ? 'rgba(74,222,128,0.2)'
              : 'var(--uv-gold-selected-shadow)';

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabSwitch(t.id)}
                disabled={disabled}
                style={{
                  flex: 1, padding: '9px 4px',
                  background: active ? activeBg : 'transparent',
                  border: active ? `1px solid ${activeBorder}` : '1px solid transparent',
                  borderRadius: 10, cursor: disabled ? 'default' : 'pointer',
                  fontFamily: 'var(--uv-font-sans)',
                  fontSize: 11, fontWeight: 500,
                  color: disabled ? 'var(--uv-text-faint)' : active ? accentColor : 'var(--uv-text-faint)',
                  transition: 'all 200ms',
                  opacity: disabled ? 0.4 : 1,
                  position: 'relative',
                  lineHeight: 1.3,
                }}
              >
                {t.label}
                {disabled && (
                  <span style={{
                    display: 'block',
                    fontSize: 8, fontWeight: 600,
                    letterSpacing: '0.5px',
                    color: 'var(--uv-gold)',
                    marginTop: 2,
                  }}>
                    SOON
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab description */}
        <p style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 13,
          fontStyle: 'italic',
          color: tab === 'anti' ? 'var(--uv-danger)' : 'var(--uv-success)',
          opacity: 0.7,
          margin: '0 0 16px',
          transition: 'color 200ms',
        }}>
          {tab === 'anti'
            ? 'Maximum pain. Maximum motivation.'
            : 'Your loss, someone\'s gain.'}
        </p>

        {/* Org list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(tab === 'anti' ? ANTI_CAUSES : CHARITIES).map(org => {
            const active = selectedDest === org.name && selectedKind === tab;
            const accent = tab === 'anti' ? 'var(--uv-danger)' : 'var(--uv-success)';
            const activeBg = tab === 'anti' ? 'var(--uv-danger-bg)' : 'var(--uv-success-bg)';
            const activeBorder = tab === 'anti' ? 'rgba(248,113,113,0.35)' : 'var(--uv-success-border, #1f6b3f)';

            return (
              <button
                key={org.name}
                type="button"
                onClick={() => handleOrgSelect(org.name, tab as 'charity' | 'anti')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: active ? activeBg : 'var(--uv-bg-input)',
                  border: `1.5px solid ${active ? activeBorder : 'var(--uv-border-strong)'}`,
                  borderRadius: 14, cursor: 'pointer',
                  transition: 'all 150ms', textAlign: 'left', width: '100%',
                }}
              >
                <div>
                  <span style={{
                    fontFamily: 'var(--uv-font-sans)', fontSize: 15,
                    color: active ? accent : 'var(--uv-text)',
                    fontWeight: 500, display: 'block',
                  }}>
                    {org.name}
                  </span>
                  <span style={{
                    fontFamily: 'var(--uv-font-sans)', fontSize: 12,
                    color: 'var(--uv-text-faint)', marginTop: 2, display: 'block',
                  }}>
                    {org.sub}
                  </span>
                </div>
                {active && (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ color: 'var(--uv-text)', fontSize: 13, fontWeight: 600 }}>✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Warning for anti-cause */}
        {tab === 'anti' && (
          <p style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 12,
            color: 'var(--uv-text-faint)',
            margin: '12px 0 0',
            lineHeight: 1.5,
          }}>
            If you break your vow, your money goes to <strong style={{ color: 'var(--uv-text)', fontWeight: 500 }}>{selectedDest}</strong>. No refund. No undo.
          </p>
        )}

        <div style={{ flex: 1, minHeight: 24 }} />

        <GoldCTA label="Lock it in →" onPress={() => onSelect(selectedDest, selectedKind)} />
      </div>
    </RitualScreen>
  );
}
