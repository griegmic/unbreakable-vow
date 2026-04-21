'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { Input } from '@/components/uv/Input';
import { analyzeVow, getContextualSuggestions, inferDeadline } from '@/lib/vow-logic';

interface VowInputProps {
  vowText: string;
  setVowText: (text: string) => void;
  endsAt: Date | null;
  setEndsAt: (date: Date | null) => void;
  onNext: () => void;
}

const CHIPS = [
  'Gym 3x this week',
  'No alcohol, 2 weeks',
  'Delete TikTok',
  'No phone til noon',
  'Call my mom',
  '10k steps daily for a week',
];

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

function formatDeadline(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

type DeadlineId = 'eow' | 'tomorrow' | '1week' | '30days' | 'custom';

const DEADLINE_OPTIONS: { id: DeadlineId; label: string; getDate: () => Date }[] = [
  { id: 'eow', label: 'End of this week', getDate: getEndOfWeek },
  { id: 'tomorrow', label: 'Tomorrow', getDate: getTomorrow },
  { id: '1week', label: '7 days', getDate: getOneWeek },
  { id: '30days', label: '30 days', getDate: getThirtyDays },
];

export function VowInput({ vowText, setVowText, endsAt, setEndsAt, onNext }: VowInputProps) {
  const [touched, setTouched] = useState(false);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [showByWhen, setShowByWhen] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<DeadlineId | null>(null);
  const [customDate, setCustomDate] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);
  const byWhenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const analysis = useMemo(() => {
    if (!vowText.trim()) return null;
    return analyzeVow(vowText);
  }, [vowText]);

  const inferredDeadline = useMemo(() => {
    if (!vowText.trim()) return null;
    return inferDeadline(vowText);
  }, [vowText]);

  const isVague = analysis?.type === 'vague';
  const isTooShort = vowText.trim().length > 0 && vowText.trim().length < 10;
  const isEmpty = !vowText.trim();
  const isValid = !isEmpty && !isTooShort && !isVague;
  const hasDeadline = !!inferredDeadline || !!endsAt;
  const canContinue = isValid && hasDeadline;

  const verdictDate = endsAt || inferredDeadline;

  // Auto-open by-when sheet if vow is valid but no deadline
  const handleInputChange = useCallback((val: string) => {
    setVowText(val);
    if (!touched) setTouched(true);
    setSelectedChip(null);

    // Clear existing timer
    if (byWhenTimerRef.current) clearTimeout(byWhenTimerRef.current);

    // If valid but no deadline, auto-open by-when after 2s
    const deadline = inferDeadline(val);
    const result = analyzeVow(val);
    if (val.trim().length >= 10 && result?.type === 'already_good' && !deadline) {
      byWhenTimerRef.current = setTimeout(() => setShowByWhen(true), 2000);
    }
  }, [touched, setVowText]);

  const handleChipTap = (chip: string) => {
    setVowText(chip);
    setSelectedChip(chip);
    if (!touched) setTouched(true);

    // Infer deadline from chip
    const deadline = inferDeadline(chip);
    if (deadline) {
      setEndsAt(deadline);
    }
  };

  const handleDeadlineSelect = (id: DeadlineId) => {
    if (id === 'custom') {
      setSelectedDeadline('custom');
      setTimeout(() => dateInputRef.current?.showPicker?.(), 50);
      return;
    }
    const opt = DEADLINE_OPTIONS.find(o => o.id === id);
    if (opt) {
      setSelectedDeadline(id);
      setEndsAt(opt.getDate());
      setShowByWhen(false);
    }
  };

  const handleContinue = () => {
    if (!canContinue) return;
    if (inferredDeadline && !endsAt) setEndsAt(inferredDeadline);
    onNext();
  };

  // Auto-select "End of week" as default when by-when opens
  const handleByWhenOpen = () => {
    if (!endsAt && !selectedDeadline) {
      setSelectedDeadline('eow');
      setEndsAt(getEndOfWeek());
    }
    setShowByWhen(true);
  };

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

  return (
    <>
      <RitualScreen>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Progress — 4 segments (vow is step 1) */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i === 0 ? 'var(--uv-gold)' : 'var(--uv-border-strong)',
              }} />
            ))}
          </div>

          {/* Hero */}
          <h1 style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 38, fontWeight: 400,
            color: '#f5f0e4', margin: 0, lineHeight: 1.1, letterSpacing: '-0.5px',
          }}>
            What&apos;s your
          </h1>
          <h1 style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 38, fontWeight: 400,
            fontStyle: 'italic', color: 'var(--uv-gold)',
            margin: '4px 0 0', lineHeight: 1.1,
          }}>
            vow?
          </h1>

          {/* Subhead */}
          <p style={{
            fontFamily: 'var(--uv-font-serif)', fontSize: 14,
            fontStyle: 'italic', color: 'var(--uv-text-dim)',
            margin: '14px 0 24px',
          }}>
            You know the one.
          </p>

          {/* Input with verdict row */}
          <div style={{ marginBottom: 4 }}>
            <Input
              value={vowText}
              onChange={handleInputChange}
              placeholder="Type your vow..."
              active={isValid}
              error={touched && isTooShort ? 'Too short. Be specific.' : undefined}
            />

            {/* Verdict row — only when valid */}
            {isValid && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--uv-bg-input)',
                border: '1px solid var(--uv-gold)',
                borderTop: '1px solid rgba(212,168,74,0.2)',
                borderRadius: '0 0 11px 11px',
                marginTop: -1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>
                    <span style={{
                      fontFamily: 'var(--uv-font-sans)', fontSize: 10, fontWeight: 500,
                      letterSpacing: '1.5px', textTransform: 'uppercase' as const,
                      color: 'var(--uv-text-faint)', display: 'block',
                    }}>
                      VERDICT
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <span style={{
                        fontFamily: 'var(--uv-font-sans)', fontSize: 13,
                        color: '#e0c070',
                      }}>
                        {verdictDate ? formatDeadline(verdictDate) : '?'}
                      </span>
                      <button
                        type="button"
                        onClick={handleByWhenOpen}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          fontFamily: 'var(--uv-font-sans)', fontSize: 11,
                          color: 'var(--uv-gold)',
                        }}
                      >
                        change
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: hasDeadline ? '#4ade80' : '#e8a040',
                  }} />
                  <span style={{
                    fontFamily: 'var(--uv-font-serif)', fontSize: 12,
                    fontStyle: 'italic',
                    color: hasDeadline ? '#4ade80' : '#e8a040',
                  }}>
                    {hasDeadline ? 'judgeable' : 'needs deadline'}
                  </span>
                </div>
              </div>
            )}

            {/* Vague coaching hint */}
            {touched && isVague && !isEmpty && (
              <p style={{
                fontFamily: 'var(--uv-font-serif)', fontSize: 11,
                fontStyle: 'italic', color: '#e8a040',
                margin: '8px 0 0',
              }}>
                Your friend needs to know if you pulled it off. Be specific.
              </p>
            )}
          </div>

          {/* Chips */}
          <div style={{ marginTop: 20 }}>
            <p style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 10, fontWeight: 500,
              letterSpacing: '1.5px', textTransform: 'uppercase' as const,
              color: 'var(--uv-text-faint)', marginBottom: 10,
            }}>
              {selectedChip ? 'Or try something else' : 'Or start with one of these'}
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 6,
            }}>
              {CHIPS.map(chip => {
                const active = selectedChip === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChipTap(chip)}
                    style={{
                      background: active ? 'rgba(212,168,74,0.1)' : '#15110c',
                      border: `1px solid ${active ? 'var(--uv-gold)' : '#2a231b'}`,
                      borderRadius: 10,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 150ms',
                      fontFamily: 'var(--uv-font-sans)',
                      fontSize: 12,
                      color: active ? 'var(--uv-gold)' : '#e8e0cc',
                      lineHeight: 1.35,
                    }}
                  >
                    {chip}{active ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 24 }} />

          {/* CTA — "Lock it" dimensional button */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, width: '100%',
              padding: '16px 24px',
              borderRadius: 14,
              border: 'none',
              cursor: canContinue ? 'pointer' : 'not-allowed',
              transition: 'all 200ms ease-out',
              background: canContinue
                ? 'linear-gradient(to bottom, #faf5ea, #efe8d9)'
                : '#2a231b',
              boxShadow: canContinue
                ? 'inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 20px rgba(0,0,0,0.28)'
                : 'none',
            }}
          >
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 15, fontWeight: 500,
              color: canContinue ? '#1a1612' : '#6b6354',
            }}>
              Lock it
            </span>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: canContinue ? '#1a1612' : '#1a1612',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 12, color: canContinue ? '#faf5ea' : '#6b6354',
                lineHeight: 1,
              }}>
                →
              </span>
            </div>
          </button>
        </div>
      </RitualScreen>

      {/* By When bottom sheet */}
      {showByWhen && (
        <div
          onClick={() => setShowByWhen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 440,
              background: 'var(--uv-bg-elev)',
              borderRadius: '22px 22px 0 0',
              padding: '16px 20px 32px',
              animation: 'slideUp 240ms ease-out',
            }}
          >
            {/* Handle */}
            <div style={{
              width: 32, height: 3, borderRadius: 9999,
              background: '#2a231b', margin: '0 auto 20px',
            }} />

            {/* Hero */}
            <h2 style={{
              fontFamily: 'var(--uv-font-serif)', fontSize: 22, fontWeight: 400,
              color: 'var(--uv-text)', margin: '0 0 4px',
            }}>
              When&apos;s the <span style={{ fontStyle: 'italic', color: 'var(--uv-gold)' }}>verdict?</span>
            </h2>
            <p style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 11,
              color: 'var(--uv-text-faint)', margin: '0 0 16px',
            }}>
              When does your friend judge it?
            </p>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEADLINE_OPTIONS.map(opt => {
                const active = selectedDeadline === opt.id;
                const dateStr = formatDeadline(opt.getDate());
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleDeadlineSelect(opt.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: active ? 'var(--uv-gold-bg)' : 'var(--uv-bg-input)',
                      border: `1px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
                      borderRadius: 12, cursor: 'pointer',
                      transition: 'all 150ms', width: '100%', textAlign: 'left',
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--uv-font-sans)', fontSize: 14,
                      color: active ? 'var(--uv-gold)' : 'var(--uv-text)',
                      fontWeight: active ? 500 : 400,
                    }}>
                      {opt.label}
                    </span>
                    <span style={{
                      fontFamily: 'var(--uv-font-sans)', fontSize: 12,
                      color: 'var(--uv-text-faint)',
                    }}>
                      {dateStr}
                    </span>
                  </button>
                );
              })}

              {/* Custom date */}
              <button
                type="button"
                onClick={() => {
                  setSelectedDeadline('custom');
                  setTimeout(() => dateInputRef.current?.showPicker?.(), 50);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '12px 14px',
                  background: selectedDeadline === 'custom' ? 'var(--uv-gold-bg)' : 'var(--uv-bg-input)',
                  border: `1px solid ${selectedDeadline === 'custom' ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
                  borderRadius: 12, cursor: 'pointer', width: '100%', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 14 }}>📅</span>
                <span style={{
                  fontFamily: 'var(--uv-font-sans)', fontSize: 14,
                  color: 'var(--uv-gold)',
                }}>
                  {selectedDeadline === 'custom' && customDate
                    ? formatDeadline(new Date(customDate + 'T12:00:00'))
                    : 'Pick a date'}
                </span>
              </button>

              <input
                ref={dateInputRef}
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setSelectedDeadline('custom');
                  if (e.target.value) {
                    setEndsAt(new Date(e.target.value + 'T23:59:00'));
                    setShowByWhen(false);
                  }
                }}
                min={minDate}
                max={maxDate}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                tabIndex={-1}
              />
            </div>

            {/* CTA */}
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShowByWhen(false)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, width: '100%', padding: '14px 24px',
                  borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(to bottom, #faf5ea, #efe8d9)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 20px rgba(0,0,0,0.28)',
                }}
              >
                <span style={{
                  fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 500,
                  color: '#1a1612',
                }}>
                  Lock it in →
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
