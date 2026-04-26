'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarMenuTrigger, ChoicePill } from '@/components/primitives';
import { IfBrokenSheet } from '@/app/create/components/IfBrokenSheet';
import { useVowFlow } from '@/providers/vow-flow';
import { useAuth } from '@/providers/auth-provider';
import { inferDeadline } from '@/lib/vow-logic';

/**
 * Quick Vow — S21 / 08-quick-vow.html
 *
 * Returning-user power flow: card-based vow input with inline meta-pills
 * (deadline, stake, witness), one-tap suggestion chips, and dual CTA footer.
 * Routes to /seal?quick=1 so returning users skip the redundant review page.
 */

type DeadlineId = 'eow' | 'tomorrow' | '7days' | '30days' | 'custom';
type JudgeMode = 'share' | 'self';

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
  { text: 'Dry, 2 weeks', amount: 100, deadlineLabel: '$100 \u00b7 14d', deadlineId: '30days' },
  { text: 'No texting my ex', amount: 50, deadlineLabel: '$50 \u00b7 30d', deadlineId: '30days' },
];

function getStakeNote(amount: number): string {
  if (amount <= 10) return 'A little sting. Enough to notice.';
  if (amount <= 25) return 'Respectable pain. Still sane.';
  if (amount <= 50) return 'Enough to sting. Not enough to be stupid.';
  return 'Max pain. Choose wisely.';
}

export default function QuickVowPage() {
  const router = useRouter();
  const { isAuthenticated, session, displayName } = useAuth();
  const vowFlow = useVowFlow();

  // Form state
  const [vowText, setVowText] = useState('');
  const [selectedDeadline, setSelectedDeadline] = useState<DeadlineId>('7days');
  const [customDate, setCustomDate] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [judgeMode, setJudgeMode] = useState<JudgeMode>('share');
  const [stakeAmount, setStakeAmount] = useState(50);
  const [destination, setDestination] = useState('ALS Association');
  const [destinationKind, setDestinationKind] = useState<'charity' | 'anti'>('charity');
  const [showIfBroken, setShowIfBroken] = useState(false);

  const [expandedPill, setExpandedPill] = useState<'deadline' | 'witness' | null>(null);

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

    try {
      localStorage.removeItem('auth-return-path');
      sessionStorage.removeItem('auth-return-path');
      document.cookie = 'auth_return_path=; path=/; max-age=0';
    } catch {}

    if (judgeMode === 'self') {
      vowFlow.setWitnessType('self');
      vowFlow.setWitnessName('Just me');
    } else {
      vowFlow.setWitnessType('friend');
      vowFlow.setWitnessName(witnessName.trim() || 'Your witness');
    }

    vowFlow.setStake({
      amount: stakeAmount,
      consequence: destinationKind,
      destination,
    });

    router.push('/seal?quick=1');
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

  const togglePill = (pill: 'deadline' | 'witness') => {
    setExpandedPill(prev => prev === pill ? null : pill);
  };

  const { minDate, maxDate } = useMemo(() => {
    const now = new Date();
    const max = new Date(now.getTime() + 90 * 86400000);
    return {
      minDate: now.toISOString().split('T')[0],
      maxDate: max.toISOString().split('T')[0],
    };
  }, []);

  const userEmail = session?.user?.email ?? null;

  return (
    <>
      <style>{`
        @keyframes uv-stake-pulse {
          0% { transform: scale(0.985); opacity: 0.84; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div
        style={{
          height: '100dvh',
          overflow: 'hidden',
          background: 'var(--uv-bg)',
          backgroundImage: 'radial-gradient(ellipse at top, rgba(200,155,60,0.05), transparent 60%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '18px 20px 16px',
        }}
      >
        <div style={{ maxWidth: 480, width: '100%', height: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* ── Topbar ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{
                width: 22,
                height: 22,
                border: '1px solid var(--uv-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: 'rotate(45deg)',
                flexShrink: 0,
              }}>
                <div style={{ width: 6, height: 6, background: 'var(--uv-gold)' }} />
              </div>
              <span style={{
                fontFamily: 'var(--uv-font-serif)',
                fontSize: 15,
                fontWeight: 500,
                color: 'var(--uv-text)',
              }}>
                Unbreakable <em style={{ color: 'var(--uv-gold)', fontStyle: 'italic' }}>Vow</em>
              </span>
            </div>

            <AvatarMenuTrigger
              displayName={isAuthenticated ? displayName : null}
              email={isAuthenticated ? userEmail : null}
            />
          </div>

          {/* ── Vow Card ── */}
          <div style={{
            background: 'var(--uv-bg-card)',
            border: '1px solid var(--uv-border-soft)',
            borderRadius: 16,
            padding: '18px 18px 14px',
            marginBottom: 10,
            position: 'relative',
            boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
          }}>
            {/* Vow input */}
            <input
              type="text"
              value={vowText}
              onChange={e => setVowText(e.target.value)}
              placeholder="I vow to..."
              style={{
                width: '100%',
                fontFamily: 'var(--uv-font-sans)',
                fontWeight: 500,
                fontSize: 26,
                lineHeight: 1.12,
                letterSpacing: 0,
                color: 'var(--uv-text)',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(200,155,60,0.24)',
                outline: 'none',
                padding: '0 0 13px',
                marginBottom: 0,
              }}
            />

            {/* Deadline */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 8,
            }}>
              <button
                type="button"
                onClick={() => togglePill('deadline')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 0',
                  margin: '-4px 0',
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--uv-font-sans)',
                  fontSize: 12,
                  color: 'var(--uv-text-muted)',
                  cursor: 'pointer',
                  minHeight: 44,
                }}
              >
                Verdict <em style={{ fontStyle: 'italic', color: 'var(--uv-text-dim)' }}>by</em>{' '}
                <span style={{ color: 'var(--uv-text)', fontWeight: 500 }}>{formatDeadlineShort(effectiveDeadline)}</span>
              </button>
            </div>
          </div>

          {/* ── One-tap suggestions ── */}
          <div id="suggestions-section">
            <div style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              margin: '0 -20px 15px 0',
              paddingRight: 20,
              scrollbarWidth: 'none',
            }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  type="button"
                  onClick={() => handleSuggestionTap(s)}
                  style={{
                    flex: '0 0 auto',
                    padding: '8px 12px',
                    background: 'rgba(240,233,219,0.025)',
                    border: '1px solid var(--uv-border-soft)',
                    borderRadius: 9999,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--uv-font-sans)',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--uv-text-muted)',
                    letterSpacing: 0,
                  }}>
                  {s.text}
                </button>
              ))}
            </div>
          </div>

          {/* ── Stake selector ── */}
          <div style={{ marginBottom: 12 }}>
            <div
              key={stakeAmount}
              style={{
                textAlign: 'center',
                fontFamily: 'var(--uv-font-serif)',
                fontSize: 56,
                lineHeight: 0.95,
                fontWeight: 500,
                color: 'var(--uv-gold)',
                fontFeatureSettings: '"tnum"',
                textShadow: '0 10px 34px rgba(200,155,60,0.18)',
                margin: '5px 0 12px',
                animation: 'uv-stake-pulse 180ms ease-out',
              }}
            >
              ${stakeAmount}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {STAKE_OPTIONS.map((amt) => {
                const active = stakeAmount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setStakeAmount(amt)}
                    style={{
                      height: 52,
                      borderRadius: 14,
                      border: active ? '1px solid var(--uv-gold)' : '1px solid var(--uv-border-soft)',
                      background: active ? 'linear-gradient(180deg, rgba(232,182,86,0.22), rgba(200,155,60,0.13))' : 'rgba(240,233,219,0.025)',
                      color: active ? 'var(--uv-gold-bright)' : 'var(--uv-text-muted)',
                      fontFamily: 'var(--uv-font-sans)',
                      fontSize: 18,
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: active ? '0 0 0 1px rgba(232,182,86,0.08), 0 16px 34px rgba(200,155,60,0.10)' : 'none',
                    }}
                  >
                    ${amt}
                  </button>
                );
              })}
            </div>
            <div style={{
              minHeight: 17,
              textAlign: 'center',
              color: 'var(--uv-text-dim)',
              fontFamily: 'var(--uv-font-sans)',
              fontStyle: 'italic',
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.25,
              marginTop: 8,
            }}>
              {getStakeNote(stakeAmount)}
            </div>
          </div>

          {/* ── Witness + consequence ── */}
          <button
            type="button"
            onClick={() => togglePill('witness')}
            style={{
              width: '100%',
              minHeight: 58,
              borderRadius: 16,
              background: 'var(--uv-bg-card)',
              border: '1px solid rgba(200,155,60,0.22)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 15px',
              cursor: 'pointer',
              marginBottom: 12,
              textAlign: 'left',
            }}
          >
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(200,155,60,0.14)', border: '1px solid rgba(200,155,60,0.16)', color: 'var(--uv-gold-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--uv-font-sans)', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
              {judgeMode === 'self' ? '✓' : witnessName.trim() ? witnessName.trim().charAt(0).toUpperCase() : '+'}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 16, fontWeight: 600, color: 'var(--uv-text)' }}>
                {judgeMode === 'self'
                  ? 'Judge it myself'
                  : witnessName.trim()
                    ? `Share with ${witnessName.trim()}`
                    : 'Share judge link after sealing'}
              </span>
              <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 12.5, fontWeight: 500, color: 'var(--uv-text-dim)' }}>
                {judgeMode === 'self' ? 'No witness, just your word.' : 'Send the judge link after you seal.'}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowIfBroken(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginBottom: 4,
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 14.5,
              lineHeight: 1.3,
              color: 'var(--uv-text)',
              textAlign: 'center',
            }}
          >
            If broken, <span style={{ color: 'var(--uv-text)', fontWeight: 600 }}>${stakeAmount}</span> &rarr; <span style={{ color: 'var(--uv-text)', fontWeight: 600 }}>{destination}</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/?guided=1')}
            style={{
              alignSelf: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '7px 10px',
              margin: '0 auto 2px',
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--uv-text-dim)',
              textAlign: 'center',
            }}
          >
            Need the guided flow?
          </button>

          {/* Spacer to push footer to bottom */}
          <div style={{ flex: 1, minHeight: 4 }} />

          {/* ── Footer ── */}
          <div style={{ padding: '0 2px' }}>
            <button
              onClick={handleSeal}
              disabled={!canSeal}
              style={{
                width: '100%',
                height: 56,
                borderRadius: 999,
                border: 'none',
                background: canSeal
                  ? 'linear-gradient(180deg, #EDC66B, #D6A339 62%, #B88930)'
                  : 'linear-gradient(180deg, rgba(237,198,107,0.38), rgba(184,137,48,0.32))',
                color: canSeal ? 'var(--uv-text-on-gold)' : 'rgba(21,16,10,0.5)',
                fontFamily: 'var(--uv-font-sans)',
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '0 18px',
                cursor: canSeal ? 'pointer' : 'not-allowed',
                boxShadow: canSeal
                  ? '0 1px 0 rgba(255,244,210,0.35) inset, 0 22px 48px rgba(200,155,60,0.18)'
                  : '0 10px 30px rgba(216,174,78,0.08), inset 0 1px 0 rgba(255,255,255,0.2)',
                transition: 'transform 100ms ease',
              }}
              onMouseDown={(e) => { if (canSeal) (e.currentTarget.style.transform = 'scale(0.97)'); }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Stake ${stakeAmount} {'\u2192'}
            </button>
          </div>
        </div>
      </div>

      {expandedPill && (
        <div
          onClick={() => setExpandedPill(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            background: 'rgba(0,0,0,0.58)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 440,
              borderRadius: '24px 24px 0 0',
              background: 'var(--uv-bg-elevated)',
              border: '1px solid var(--uv-border-soft)',
              padding: '18px 20px max(22px, env(safe-area-inset-bottom))',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.45)',
            }}
          >
            {expandedPill === 'deadline' ? (
              <>
                <div style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 22, color: 'var(--uv-text)', marginBottom: 12 }}>When is verdict day?</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {DEADLINE_PRESETS.map(preset => (
                    <ChoicePill
                      key={preset.id}
                      label={preset.label}
                      active={selectedDeadline === preset.id}
                      onPress={() => {
                        handleDeadlineClick(preset.id);
                        if (preset.id !== 'custom') setExpandedPill(null);
                      }}
                    />
                  ))}
                </div>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={customDate}
                  onChange={e => { setCustomDate(e.target.value); setSelectedDeadline('custom'); setExpandedPill(null); }}
                  min={minDate}
                  max={maxDate}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                  tabIndex={-1}
                />
              </>
            ) : (
              <>
                <div style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 22, color: 'var(--uv-text)', marginBottom: 6 }}>Who judges?</div>
                <p style={{ margin: '0 0 14px', fontFamily: 'var(--uv-font-sans)', fontSize: 14, lineHeight: 1.4, color: 'var(--uv-text-muted)' }}>
                  Fastest path: seal the vow, then share one judge link. No phone number hunt right now.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setJudgeMode('share');
                    setExpandedPill(null);
                  }}
                  style={{
                    width: '100%',
                    minHeight: 56,
                    borderRadius: 14,
                    border: judgeMode === 'share' ? '1px solid var(--uv-gold)' : '1px solid var(--uv-border-strong)',
                    background: judgeMode === 'share' ? 'rgba(200,155,60,0.12)' : 'var(--uv-bg-input)',
                    color: 'var(--uv-text)',
                    fontFamily: 'var(--uv-font-sans)',
                    fontSize: 15,
                    fontWeight: 650,
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: '12px 14px',
                    marginBottom: 10,
                  }}
                >
                  Share judge link after sealing
                  <span style={{ display: 'block', marginTop: 3, fontSize: 12.5, fontWeight: 500, color: 'var(--uv-text-dim)' }}>
                    Native share, text, or copy link on the next screen.
                  </span>
                </button>
                <input
                  type="text"
                  value={witnessName}
                  onChange={e => { setWitnessName(e.target.value); setJudgeMode('share'); }}
                  placeholder="Optional: their first name"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--uv-bg-input)',
                    border: '1px solid var(--uv-border-strong)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    fontFamily: 'var(--uv-font-sans)',
                    fontSize: 16,
                    color: 'var(--uv-text)',
                    outline: 'none',
                    marginBottom: 10,
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setJudgeMode('self');
                    setWitnessName('');
                    setExpandedPill(null);
                  }}
                  style={{
                    width: '100%',
                    height: 48,
                    borderRadius: 12,
                    border: judgeMode === 'self' ? '1px solid var(--uv-gold)' : '1px solid var(--uv-border-soft)',
                    background: judgeMode === 'self' ? 'rgba(200,155,60,0.12)' : 'transparent',
                    color: judgeMode === 'self' ? 'var(--uv-gold-bright)' : 'var(--uv-text-muted)',
                    fontFamily: 'var(--uv-font-sans)',
                    fontSize: 15,
                    fontWeight: 650,
                    cursor: 'pointer',
                    marginBottom: 10,
                  }}
                >
                  Judge it myself
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedPill(null)}
                  style={{
                    width: '100%',
                    height: 50,
                    borderRadius: 12,
                    border: 'none',
                    background: 'var(--uv-gold)',
                    color: 'var(--uv-text-on-gold)',
                    fontFamily: 'var(--uv-font-sans)',
                    fontSize: 15,
                    fontWeight: 750,
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
