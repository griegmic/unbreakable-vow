'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { RitualScreen, GoldCTA } from '@/components/primitives';
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
  const isValid = !isEmpty && !isTooShort; // vague is a nudge, not a blocker
  const hasDeadline = !!inferredDeadline || !!endsAt;
  const canContinue = isValid && hasDeadline;
  const verdictDate = endsAt || inferredDeadline;

  const handleInputChange = useCallback((val: string) => {
    setVowText(val);
    if (!touched) setTouched(true);
    setSelectedChip(null);
    if (byWhenTimerRef.current) clearTimeout(byWhenTimerRef.current);
    const deadline = inferDeadline(val);
    if (val.trim().length >= 10 && !deadline) {
      byWhenTimerRef.current = setTimeout(() => setShowByWhen(true), 2000);
    }
  }, [touched, setVowText]);

  const handleChipTap = (chip: string) => {
    setVowText(chip);
    setSelectedChip(chip);
    if (!touched) setTouched(true);
    const deadline = inferDeadline(chip);
    if (deadline) setEndsAt(deadline);
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
          {/* Progress */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i === 0 ? 'var(--uv-gold)' : 'var(--uv-border-strong)',
              }} />
            ))}
          </div>

          {/* Hero — sans for readability */}
          <h1 style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 28, fontWeight: 600,
            color: 'var(--uv-text)', margin: 0, lineHeight: 1.15, letterSpacing: '-0.5px',
          }}>
            What&apos;s your vow?
          </h1>
          <p style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 15,
            color: 'var(--uv-text-dim)', margin: '8px 0 24px',
          }}>
            You know the one.
          </p>

          {/* Input */}
          <div style={{ position: 'relative', marginBottom: 4 }}>
            <input
              type="text"
              value={vowText}
              onChange={e => handleInputChange(e.target.value)}
              placeholder="I will..."
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--uv-bg-input)',
                border: `1px solid ${isValid ? 'var(--uv-gold)' : touched && isVague && !isEmpty ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
                borderRadius: isValid && verdictDate ? '12px 12px 0 0' : 12,
                padding: '14px 16px',
                fontFamily: 'var(--uv-font-sans)', fontSize: 16,
                color: 'var(--uv-text)',
                outline: 'none',
                transition: 'border-color 150ms',
              }}
            />
            <style>{`input::placeholder { color: var(--uv-text-invisible); font-style: italic; }`}</style>
          </div>

          {/* Deadline tag — simple, no jargon */}
          {isValid && verdictDate && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px',
              background: 'var(--uv-bg-input)',
              border: '1px solid var(--uv-gold)',
              borderTop: '1px solid var(--uv-gold-selected-shadow)',
              borderRadius: '0 0 12px 12px',
              marginTop: -1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 12, color: 'var(--uv-text-faint)' }}>
                  By
                </span>
                <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 500, color: '#e0c070' }}>
                  {formatDeadline(verdictDate)}
                </span>
                <button
                  type="button"
                  onClick={handleByWhenOpen}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                    fontFamily: 'var(--uv-font-sans)', fontSize: 11, color: 'var(--uv-gold)',
                  }}
                >
                  change
                </button>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '3px 8px', borderRadius: 20,
                background: 'rgba(74,222,128,0.08)',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--uv-success)' }} />
                <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 11, color: 'var(--uv-success)', fontWeight: 500 }}>
                  Ready
                </span>
              </div>
            </div>
          )}

          {/* Needs deadline — show when valid but no date */}
          {isValid && !verdictDate && (
            <button
              type="button"
              onClick={handleByWhenOpen}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '10px 16px',
                background: 'var(--uv-bg-input)',
                border: '1px solid var(--uv-gold)',
                borderTop: '1px solid rgba(200,152,64,0.15)',
                borderRadius: '0 0 12px 12px',
                marginTop: -1, cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 12, color: 'var(--uv-text-faint)' }}>By</span>
                <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 14, color: 'var(--uv-warn)' }}>Set a deadline →</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 20, background: 'rgba(232,160,64,0.08)' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--uv-warn)' }} />
                <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 11, color: 'var(--uv-warn)', fontWeight: 500 }}>Needs date</span>
              </div>
            </button>
          )}

          {/* Vague hint — soft nudge, not a blocker */}
          {touched && isVague && !isEmpty && !isTooShort && (
            <p style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 12,
              color: 'var(--uv-text-faint)', margin: '8px 0 0', lineHeight: 1.4,
              fontStyle: 'italic',
            }}>
              Tip: the more specific, the easier for your friend to judge.
            </p>
          )}

          {/* Error */}
          {touched && isTooShort && (
            <p style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 12,
              color: 'var(--uv-danger)', margin: '8px 0 0',
            }}>
              Too short. Add the details.
            </p>
          )}

          {/* Chips — 2 column, larger touch targets */}
          <div style={{ marginTop: 24 }}>
            <p style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 11, fontWeight: 500,
              letterSpacing: '1px', textTransform: 'uppercase' as const,
              color: 'var(--uv-text-faint)', marginBottom: 10,
            }}>
              {selectedChip ? 'Or try something else' : 'Or start with one of these'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {CHIPS.map(chip => {
                const active = selectedChip === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChipTap(chip)}
                    style={{
                      background: active ? 'var(--uv-gold-selected-bg)' : 'var(--uv-bg-card)',
                      border: `1px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
                      borderRadius: 10,
                      padding: '12px 14px',
                      minHeight: 44,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 150ms',
                      fontFamily: 'var(--uv-font-sans)', fontSize: 13,
                      color: active ? 'var(--uv-gold)' : 'var(--uv-text-muted)',
                      lineHeight: 1.3,
                    }}
                  >
                    {chip}{active ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 20 }} />

          {/* Quick vow link */}
          <p style={{
            fontFamily: 'var(--uv-font-sans)', fontSize: 12,
            color: 'var(--uv-text-faint)', margin: '0 0 12px', textAlign: 'center',
          }}>
            Want to do it all at once?{' '}
            <a href="/quick-vow" style={{ color: 'var(--uv-gold)', textDecoration: 'none', fontWeight: 500 }}>
              Quick vow &rarr;
            </a>
          </p>

          {/* CTA */}
          <GoldCTA label="Next →" onPress={handleContinue} disabled={!canContinue} />
        </div>
      </RitualScreen>

      {/* By When sheet */}
      {showByWhen && (
        <div
          onClick={() => setShowByWhen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
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
            <div style={{ width: 32, height: 3, borderRadius: 9999, background: 'var(--uv-border-strong)', margin: '0 auto 20px' }} />

            <h2 style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 20, fontWeight: 600,
              color: 'var(--uv-text)', margin: '0 0 4px',
            }}>
              By when?
            </h2>
            <p style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 13,
              color: 'var(--uv-text-faint)', margin: '0 0 16px',
            }}>
              When should your friend judge it?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEADLINE_OPTIONS.map(opt => {
                const active = selectedDeadline === opt.id;
                return (
                  <button
                    key={opt.id} type="button"
                    onClick={() => handleDeadlineSelect(opt.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', minHeight: 48,
                      background: active ? 'var(--uv-gold-bg)' : 'var(--uv-bg-input)',
                      border: `1px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
                      borderRadius: 12, cursor: 'pointer', width: '100%', textAlign: 'left',
                      transition: 'all 150ms',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 15, color: active ? 'var(--uv-gold)' : 'var(--uv-text)', fontWeight: active ? 500 : 400 }}>
                      {opt.label}
                    </span>
                    <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 12, color: 'var(--uv-text-faint)' }}>
                      {formatDeadline(opt.getDate())}
                    </span>
                  </button>
                );
              })}

              <button type="button"
                onClick={() => { setSelectedDeadline('custom'); setTimeout(() => dateInputRef.current?.showPicker?.(), 50); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '14px 16px', minHeight: 48,
                  background: selectedDeadline === 'custom' ? 'var(--uv-gold-bg)' : 'var(--uv-bg-input)',
                  border: `1px solid ${selectedDeadline === 'custom' ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
                  borderRadius: 12, cursor: 'pointer', width: '100%', textAlign: 'left',
                }}
              >
                <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 15, color: 'var(--uv-gold)' }}>
                  {selectedDeadline === 'custom' && customDate ? formatDeadline(new Date(customDate + 'T12:00:00')) : '📅 Pick a date'}
                </span>
              </button>

              <input ref={dateInputRef} type="date" value={customDate}
                onChange={e => { setCustomDate(e.target.value); setSelectedDeadline('custom'); if (e.target.value) { setEndsAt(new Date(e.target.value + 'T23:59:00')); setShowByWhen(false); } }}
                min={minDate} max={maxDate}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                tabIndex={-1}
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <GoldCTA label="Set deadline →" onPress={() => setShowByWhen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
