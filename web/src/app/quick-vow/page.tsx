'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RitualScreen, FrauncesH1, GoldCTA, OutlinedGoldCTA, ChoicePill } from '@/components/primitives';
import { HamburgerMenu } from '@/components/hamburger-menu';
import { IfBrokenSheet } from '@/app/create/components/IfBrokenSheet';
import { useVowFlow } from '@/providers/vow-flow';
import { useAuth } from '@/providers/auth-provider';
import { inferDeadline } from '@/lib/vow-logic';

/**
 * Quick Vow — §3.5 S21
 *
 * Returning-user power flow: vow input + inline pills (deadline, stake,
 * charity) on one screen. CTA "Seal it." routes to /seal → /sent → /live.
 * Same seal-vow edge function as first-time flow.
 */

type DeadlineId = 'eow' | 'tomorrow' | '7days' | '30days' | 'custom';

function getEndOfWeek(): Date {
  const d = new Date();
  const diff = 7 - d.getDay();
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  d.setHours(23, 59, 0, 0);
  return d;
}
function getTomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(21, 0, 0, 0);
  return d;
}
function getOneWeek(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 0, 0);
  return d;
}
function getThirtyDays(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  d.setHours(23, 59, 0, 0);
  return d;
}
function getDateForPreset(id: DeadlineId): Date {
  switch (id) {
    case 'eow': return getEndOfWeek();
    case 'tomorrow': return getTomorrow();
    case '7days': return getOneWeek();
    case '30days': return getThirtyDays();
    default: return getOneWeek();
  }
}
function formatDeadline(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const DEADLINE_PILLS: { id: DeadlineId; label: string }[] = [
  { id: 'eow', label: 'End of week' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: '7days', label: '7 days' },
  { id: '30days', label: '30 days' },
  { id: 'custom', label: 'Pick date' },
];

const STAKE_OPTIONS = [10, 25, 50, 100];


export default function QuickVowPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const vowFlow = useVowFlow();

  // Form state
  const [vowText, setVowText] = useState('');
  const [selectedDeadline, setSelectedDeadline] = useState<DeadlineId>('7days');
  const [customDate, setCustomDate] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [stakeAmount, setStakeAmount] = useState(50);
  const [destination, setDestination] = useState('ALS Association');
  const [destinationKind, setDestinationKind] = useState<'charity' | 'anti'>('charity');
  const [showIfBroken, setShowIfBroken] = useState(false);

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Compute deadline date
  const deadlineDate = useMemo(() => {
    if (selectedDeadline === 'custom' && customDate) {
      return new Date(customDate + 'T23:59:00');
    }
    return getDateForPreset(selectedDeadline);
  }, [selectedDeadline, customDate]);

  // Infer deadline from text
  const inferredDeadline = useMemo(() => {
    if (!vowText.trim()) return null;
    return inferDeadline(vowText);
  }, [vowText]);

  const effectiveDeadline = inferredDeadline || deadlineDate;

  const canSeal = vowText.trim().length >= 10;

  const handleSeal = () => {
    if (!canSeal) return;

    // Save to VowFlowProvider
    vowFlow.setRawInput(vowText);
    vowFlow.setRefinedText(vowText);
    vowFlow.setDeadline(effectiveDeadline.toISOString());

    if (witnessName.trim()) {
      vowFlow.setWitnessType('friend');
      vowFlow.setWitnessName(witnessName.trim());
    } else {
      vowFlow.setWitnessType('self');
      vowFlow.setWitnessName('Just me');
    }

    vowFlow.setStake({
      amount: stakeAmount,
      consequence: destinationKind,
      destination,
    });

    router.push('/seal');
  };

  const handleDeadlineClick = (id: DeadlineId) => {
    if (id === 'custom') {
      setSelectedDeadline('custom');
      setTimeout(() => dateInputRef.current?.showPicker?.(), 50);
      return;
    }
    setSelectedDeadline(id);
  };

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

  return (
    <>
      <RitualScreen variant="utility">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <FrauncesH1 italic size="lg">Quick vow.</FrauncesH1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <a
                href="/create"
                style={{
                  fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 500,
                  color: 'var(--uv-gold)', textDecoration: 'none',
                }}
              >
                Guided flow &rarr;
              </a>
              {isAuthenticated && <HamburgerMenu />}
            </div>
          </div>

          {/* Vow input */}
          <div>
            <input
              type="text"
              value={vowText}
              onChange={e => setVowText(e.target.value)}
              placeholder="I will..."
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--uv-bg-input)',
                border: '1px solid var(--uv-border-strong)',
                borderRadius: 12,
                padding: '14px 16px',
                fontFamily: 'var(--uv-font-sans)', fontSize: 16,
                color: 'var(--uv-text)',
                outline: 'none',
              }}
            />
          </div>

          {/* Deadline pills */}
          <div>
            <label style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 600,
              letterSpacing: '1px', textTransform: 'uppercase' as const,
              color: 'var(--uv-text-faint)', display: 'block', marginBottom: 8,
            }}>
              Deadline
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DEADLINE_PILLS.map(pill => (
                <ChoicePill
                  key={pill.id}
                  label={pill.label}
                  active={selectedDeadline === pill.id}
                  onPress={() => handleDeadlineClick(pill.id)}
                />
              ))}
            </div>
            <input
              ref={dateInputRef}
              type="date"
              value={customDate}
              onChange={e => { setCustomDate(e.target.value); setSelectedDeadline('custom'); }}
              min={minDate}
              max={maxDate}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
              tabIndex={-1}
            />
            <p style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 12,
              color: 'var(--uv-text-faint)', margin: '6px 0 0',
            }}>
              {formatDeadline(effectiveDeadline)}
            </p>
          </div>

          {/* Witness */}
          <div>
            <label style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 600,
              letterSpacing: '1px', textTransform: 'uppercase' as const,
              color: 'var(--uv-text-faint)', display: 'block', marginBottom: 8,
            }}>
              Witness
            </label>
            <input
              type="text"
              value={witnessName}
              onChange={e => setWitnessName(e.target.value)}
              placeholder="Who's judging? (optional)"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--uv-bg-input)',
                border: '1px solid var(--uv-border-strong)',
                borderRadius: 12,
                padding: '12px 16px',
                fontFamily: 'var(--uv-font-sans)', fontSize: 14,
                color: 'var(--uv-text)',
                outline: 'none',
              }}
            />
          </div>

          {/* Stake */}
          <div>
            <label style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 600,
              letterSpacing: '1px', textTransform: 'uppercase' as const,
              color: 'var(--uv-text-faint)', display: 'block', marginBottom: 8,
            }}>
              Stake
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {STAKE_OPTIONS.map(amt => (
                <ChoicePill
                  key={amt}
                  label={`$${amt}`}
                  active={stakeAmount === amt}
                  onPress={() => setStakeAmount(amt)}
                  flex
                />
              ))}
            </div>
          </div>

          {/* If broken */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--uv-bg-card)',
            border: '1px solid var(--uv-border-strong)',
            borderRadius: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 12, color: 'var(--uv-text-faint)' }}>
                If broken:
              </span>
              <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--uv-text)' }}>
                {destination}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowIfBroken(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                fontFamily: 'var(--uv-font-sans)', fontSize: 12, color: 'var(--uv-gold)', fontWeight: 500,
              }}
            >
              change
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 12 }} />

          {/* CTA */}
          <GoldCTA
            label={`Seal my vow \u2014 $${stakeAmount}`}
            onPress={handleSeal}
            disabled={!canSeal}
          />

          {/* Secondary — dare a friend */}
          <OutlinedGoldCTA
            label="Dare a friend \u2192"
            onPress={() => router.push('/cast')}
          />
        </div>
      </RitualScreen>

      {/* IfBroken sheet */}
      {showIfBroken && (
        <div
          onClick={() => setShowIfBroken(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: '90dvh', overflow: 'auto' }}>
            <IfBrokenSheet
              destination={destination}
              destinationKind={destinationKind}
              onSelect={(dest, kind) => {
                setDestination(dest);
                setDestinationKind(kind);
                setShowIfBroken(false);
              }}
              onClose={() => setShowIfBroken(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
