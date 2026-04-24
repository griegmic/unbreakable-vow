'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GoldCTA, AvatarMenuTrigger, ChoicePill } from '@/components/primitives';
import { IfBrokenSheet } from '@/app/create/components/IfBrokenSheet';
import { useVowFlow } from '@/providers/vow-flow';
import { useAuth } from '@/providers/auth-provider';
import { inferDeadline } from '@/lib/vow-logic';

/**
 * Quick Vow — S21 / 08-quick-vow.html
 *
 * Returning-user power flow: card-based vow input with inline meta-pills
 * (deadline, stake, witness), one-tap suggestion chips, and dual CTA footer.
 * Routes to /seal -> /sent -> /live. Same seal-vow edge function as first-time flow.
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
function formatDeadlineShort(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const DEADLINE_PRESETS: { id: DeadlineId; label: string }[] = [
  { id: 'eow', label: 'This Sunday' },
  { id: '7days', label: '1 week' },
  { id: '30days', label: '30 days' },
  { id: 'custom', label: 'Pick date' },
];

const STAKE_OPTIONS = [10, 25, 50, 100];

interface QuickSuggestion {
  text: string;
  amount: number;
  deadlineLabel: string;
  deadlineId: DeadlineId;
}

const SUGGESTIONS: QuickSuggestion[] = [
  { text: 'Gym 3x this week', amount: 50, deadlineLabel: '$50 \u00b7 Sun', deadlineId: 'eow' },
  { text: 'Delete TikTok for a week', amount: 25, deadlineLabel: '$25 \u00b7 Mon', deadlineId: '7days' },
  { text: 'No texting my ex', amount: 75, deadlineLabel: '$75 \u00b7 30d', deadlineId: '30days' },
  { text: 'No DoorDash this week', amount: 25, deadlineLabel: '$25 \u00b7 Sun', deadlineId: 'eow' },
  { text: 'In bed by 11pm', amount: 25, deadlineLabel: '$25 \u00b7 7d', deadlineId: '7days' },
];

export default function QuickVowPage() {
  const router = useRouter();
  const { isAuthenticated, session, displayName } = useAuth();
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

  // Expand states for meta-pills
  const [expandedPill, setExpandedPill] = useState<'deadline' | 'stake' | 'witness' | null>(null);

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

  const handleSuggestionTap = (s: QuickSuggestion) => {
    setVowText(s.text);
    setStakeAmount(s.amount);
    setSelectedDeadline(s.deadlineId);
    setExpandedPill(null);
  };

  const togglePill = (pill: 'deadline' | 'stake' | 'witness') => {
    setExpandedPill(prev => prev === pill ? null : pill);
  };

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

  const userEmail = session?.user?.email ?? null;

  return (
    <>
      <div
        style={{
          minHeight: '100dvh',
          background: 'var(--uv-bg)',
          backgroundImage: 'radial-gradient(ellipse at top, rgba(200,155,60,0.05), transparent 60%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '54px 22px 24px',
        }}
      >
        <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1 }}>

          {/* ── Topbar ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            padding: '0 4px',
          }}>
            {/* Live pulse */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 10.5,
              letterSpacing: '0.2em',
              textTransform: 'uppercase' as const,
              color: 'var(--uv-gold)',
              fontWeight: 500,
              fontFamily: 'var(--uv-font-sans)',
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--uv-success)',
                boxShadow: '0 0 6px var(--uv-success)',
                display: 'inline-block',
              }} />
              2 vows live
            </div>

            {/* Avatar menu trigger */}
            {isAuthenticated && (
              <AvatarMenuTrigger
                displayName={displayName}
                email={userEmail}
              />
            )}
          </div>

          {/* ── Vow Card ── */}
          <div style={{
            background: 'var(--uv-bg-card)',
            border: '1px solid var(--uv-gold-line)',
            borderRadius: 18,
            padding: '18px 20px 18px',
            marginBottom: 18,
            position: 'relative',
            boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
          }}>
            {/* Gold gradient top line */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 26,
              right: 26,
              height: 1,
              background: 'linear-gradient(90deg, transparent, var(--uv-gold), transparent)',
            }} />

            {/* Card header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <span style={{
                fontSize: 9.5,
                letterSpacing: '0.3em',
                textTransform: 'uppercase' as const,
                color: 'var(--uv-text-dim)',
                fontWeight: 500,
                fontFamily: 'var(--uv-font-sans)',
              }}>
                A new vow
              </span>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('suggestions-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--uv-font-serif)',
                  fontStyle: 'italic',
                  fontSize: 12,
                  color: 'var(--uv-gold)',
                  padding: 0,
                }}
              >
                need an idea?
              </button>
            </div>

            {/* Vow input */}
            <input
              type="text"
              value={vowText}
              onChange={e => setVowText(e.target.value)}
              placeholder="walk 10,000 steps every day"
              style={{
                width: '100%',
                fontFamily: 'var(--uv-font-serif)',
                fontWeight: 400,
                fontVariationSettings: '"opsz" 144',
                fontSize: 23,
                lineHeight: 1.18,
                letterSpacing: '-0.01em',
                color: 'var(--uv-text)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                padding: 0,
                marginBottom: 12,
              }}
            />

            {/* Meta-pill row */}
            <div style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              paddingTop: 10,
              borderTop: '1px dashed var(--uv-border-soft)',
            }}>
              {/* Deadline pill */}
              <button
                type="button"
                onClick={() => togglePill('deadline')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 11px',
                  background: 'var(--uv-gold-soft)',
                  border: `1px solid ${expandedPill === 'deadline' ? 'var(--uv-gold)' : 'var(--uv-gold-line)'}`,
                  borderRadius: 9999,
                  fontFamily: 'var(--uv-font-serif)',
                  fontSize: 12,
                  color: 'var(--uv-text)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--uv-gold)', display: 'inline-block' }} />
                <span style={{ color: 'var(--uv-text-muted)', fontStyle: 'italic' }}>verdict</span>
                <span style={{ fontWeight: 500 }}>{formatDeadlineShort(effectiveDeadline)}</span>
              </button>

              {/* Stake pill */}
              <button
                type="button"
                onClick={() => togglePill('stake')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 11px',
                  background: 'var(--uv-gold-soft)',
                  border: `1px solid ${expandedPill === 'stake' ? 'var(--uv-gold)' : 'var(--uv-gold-line)'}`,
                  borderRadius: 9999,
                  fontFamily: 'var(--uv-font-serif)',
                  fontSize: 12,
                  color: 'var(--uv-text)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--uv-gold)', display: 'inline-block' }} />
                <span style={{ color: 'var(--uv-text-muted)', fontStyle: 'italic' }}>on the line</span>
                <span style={{ fontWeight: 500 }}>${stakeAmount}</span>
              </button>

              {/* Witness pill */}
              <button
                type="button"
                onClick={() => togglePill('witness')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 11px',
                  background: 'var(--uv-gold-soft)',
                  border: `1px solid ${expandedPill === 'witness' ? 'var(--uv-gold)' : 'var(--uv-gold-line)'}`,
                  borderRadius: 9999,
                  fontFamily: 'var(--uv-font-serif)',
                  fontSize: 12,
                  color: 'var(--uv-text)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--uv-success)', display: 'inline-block' }} />
                <span style={{ color: 'var(--uv-text-muted)', fontStyle: 'italic' }}>judge</span>
                <span style={{ fontWeight: 500 }}>{witnessName.trim() || 'Pick'}</span>
              </button>
            </div>
          </div>

          {/* ── Expanded pill content (inline below card) ── */}
          {expandedPill === 'deadline' && (
            <div style={{
              marginBottom: 18,
              padding: '12px 16px',
              background: 'var(--uv-bg-card)',
              border: '1px solid var(--uv-border-soft)',
              borderRadius: 12,
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DEADLINE_PRESETS.map(preset => (
                  <ChoicePill
                    key={preset.id}
                    label={preset.label}
                    active={selectedDeadline === preset.id}
                    onPress={() => handleDeadlineClick(preset.id)}
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
            </div>
          )}

          {expandedPill === 'stake' && (
            <div style={{
              marginBottom: 18,
              padding: '12px 16px',
              background: 'var(--uv-bg-card)',
              border: '1px solid var(--uv-border-soft)',
              borderRadius: 12,
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
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
              <button
                type="button"
                onClick={() => setShowIfBroken(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'var(--uv-font-serif)',
                  fontStyle: 'italic',
                  fontSize: 12,
                  color: 'var(--uv-text-dim)',
                }}
              >
                If broken: {destination} <span style={{ color: 'var(--uv-gold)' }}>change</span>
              </button>
            </div>
          )}

          {expandedPill === 'witness' && (
            <div style={{
              marginBottom: 18,
              padding: '12px 16px',
              background: 'var(--uv-bg-card)',
              border: '1px solid var(--uv-border-soft)',
              borderRadius: 12,
            }}>
              <input
                type="text"
                value={witnessName}
                onChange={e => setWitnessName(e.target.value)}
                placeholder="Who's judging? (optional)"
                autoFocus
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--uv-bg-input)',
                  border: '1px solid var(--uv-border-strong)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontFamily: 'var(--uv-font-sans)',
                  fontSize: 14,
                  color: 'var(--uv-text)',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* ── One-tap suggestions ── */}
          <div id="suggestions-section">
            <div style={{
              fontSize: 9.5,
              letterSpacing: '0.24em',
              textTransform: 'uppercase' as const,
              color: 'var(--uv-text-dim)',
              margin: '14px 4px 10px',
              fontWeight: 500,
              fontFamily: 'var(--uv-font-sans)',
            }}>
              Or one-tap
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={s.text}
                  type="button"
                  onClick={() => handleSuggestionTap(s)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 14px',
                    background: i === 0
                      ? 'linear-gradient(135deg, rgba(200,155,60,0.06), transparent 60%), var(--uv-bg-card)'
                      : 'var(--uv-bg-card)',
                    border: `1px solid ${i === 0 ? 'var(--uv-gold-line)' : 'var(--uv-border-soft)'}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    flex: 1,
                    fontFamily: 'var(--uv-font-serif)',
                    fontSize: 14.5,
                    fontWeight: 400,
                    color: 'var(--uv-text)',
                    letterSpacing: '-0.005em',
                  }}>
                    {s.text}
                  </span>
                  <span style={{
                    fontFamily: 'var(--uv-font-serif)',
                    fontWeight: 500,
                    fontSize: 14.5,
                    color: 'var(--uv-gold-bright)',
                    fontFeatureSettings: '"tnum"',
                    borderLeft: '1px solid var(--uv-border-soft)',
                    paddingLeft: 12,
                    letterSpacing: '-0.005em',
                    whiteSpace: 'nowrap',
                  }}>
                    {s.deadlineLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Spacer to push footer to bottom */}
          <div style={{ flex: 1, minHeight: 12 }} />

          {/* ── Footer ── */}
          <div style={{ padding: '0 2px' }}>
            {/* Dual CTA row */}
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Primary CTA */}
              <div style={{ flex: 2.2 }}>
                <button
                  onClick={handleSeal}
                  disabled={!canSeal}
                  style={{
                    width: '100%',
                    height: 60,
                    borderRadius: 9999,
                    border: 'none',
                    background: canSeal
                      ? 'linear-gradient(180deg, #D4A94A, #B88930)'
                      : 'var(--uv-bg-elevated)',
                    color: canSeal ? 'var(--uv-text-on-gold)' : 'var(--uv-text-dim)',
                    fontFamily: 'var(--uv-font-serif)',
                    fontWeight: 500,
                    fontSize: 16,
                    letterSpacing: '0.005em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '0 18px 0 22px',
                    cursor: canSeal ? 'pointer' : 'not-allowed',
                    opacity: canSeal ? 1 : 0.5,
                    boxShadow: canSeal
                      ? '0 1px 0 rgba(255,220,140,0.25) inset, 0 10px 30px rgba(200,155,60,0.18)'
                      : 'none',
                    transition: 'transform 100ms ease',
                  }}
                  onMouseDown={(e) => { if (canSeal) (e.currentTarget.style.transform = 'scale(0.97)'); }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  Lock it in <span style={{ color: 'var(--uv-text-on-gold)', opacity: 0.7, fontFeatureSettings: '"tnum"' }}>{'\u2014'} ${stakeAmount}</span> {'\u2192'}
                </button>
              </div>

              {/* Secondary CTA — Dare a friend */}
              <div style={{ flex: 1 }}>
                <button
                  onClick={() => router.push('/cast')}
                  style={{
                    width: '100%',
                    height: 60,
                    borderRadius: 9999,
                    background: 'var(--uv-bg-card)',
                    border: '1px solid var(--uv-gold-line)',
                    color: 'var(--uv-gold-bright)',
                    fontFamily: 'var(--uv-font-serif)',
                    fontWeight: 500,
                    fontSize: 14.5,
                    letterSpacing: '0.005em',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0,
                    cursor: 'pointer',
                    transition: 'transform 100ms ease',
                  }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <span style={{ lineHeight: 1.05 }}>
                    {witnessName.trim() ? `Dare ${witnessName.trim().split(' ')[0]}` : 'Dare a friend'}
                  </span>
                  <span style={{
                    fontSize: 9.5,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase' as const,
                    color: 'var(--uv-text-dim)',
                    fontWeight: 500,
                    fontFamily: 'var(--uv-font-sans)',
                    marginTop: 2,
                    fontStyle: 'normal',
                  }}>
                    {'\u2192'} them
                  </span>
                </button>
              </div>
            </div>

            {/* Reassurance text */}
            <p style={{
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--uv-text-dim)',
              marginTop: 12,
              fontFamily: 'var(--uv-font-sans)',
            }}>
              <em style={{ color: 'var(--uv-text-muted)', fontStyle: 'italic' }}>
                Keep your word. Keep your ${stakeAmount}.
              </em>
            </p>
          </div>
        </div>
      </div>

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
