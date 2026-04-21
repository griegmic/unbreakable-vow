'use client';

import React, { useState, useMemo, useRef } from 'react';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { Input } from '@/components/uv/Input';
import { Chip } from '@/components/uv/Chip';
import { analyzeVow, getContextualSuggestions, inferDeadline } from '@/lib/vow-logic';

interface VowInputProps {
  vowText: string;
  setVowText: (text: string) => void;
  endsAt: Date | null;
  setEndsAt: (date: Date | null) => void;
  onNext: () => void;
}

const PRESET_CHIPS = [
  'Gym 3x this week',
  '10k steps a day this week',
  'No alcohol, 2 weeks',
  'Delete TikTok for a week',
  'Actually call my mom weekly',
];

type DeadlineId = 'eow' | 'tomorrow' | '1week' | '2weeks' | 'month' | 'custom';

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

function getTwoWeeks(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(23, 59, 0, 0);
  return d;
}

function getEndOfMonth(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 0, 0);
  return d;
}

function formatDeadline(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < step ? 'var(--uv-gold)' : 'var(--uv-border-strong)',
            transition: 'background 200ms',
          }}
        />
      ))}
    </div>
  );
}

const DEADLINE_OPTIONS: { id: DeadlineId; label: string; getDate: () => Date }[] = [
  { id: 'eow', label: 'End of week', getDate: getEndOfWeek },
  { id: 'tomorrow', label: 'Tomorrow', getDate: getTomorrow },
  { id: '1week', label: '1 week', getDate: getOneWeek },
  { id: '2weeks', label: '2 weeks', getDate: getTwoWeeks },
  { id: 'month', label: 'End of month', getDate: getEndOfMonth },
];

export function VowInput({ vowText, setVowText, endsAt, setEndsAt, onNext }: VowInputProps) {
  const [touched, setTouched] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<DeadlineId | null>(null);
  const [customDate, setCustomDate] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  const analysis = useMemo(() => {
    if (!vowText.trim()) return null;
    return analyzeVow(vowText);
  }, [vowText]);

  const suggestions = useMemo(() => {
    if (!vowText.trim()) return [];
    return getContextualSuggestions(vowText);
  }, [vowText]);

  const inferredDeadline = useMemo(() => {
    if (!vowText.trim()) return null;
    return inferDeadline(vowText);
  }, [vowText]);

  const isVague = analysis?.type === 'vague';
  const isTooShort = vowText.trim().length > 0 && vowText.trim().length < 10;
  const isEmpty = !vowText.trim();
  const isValid = !isEmpty && !isTooShort;

  // Deadline is needed if text doesn't imply one
  const needsDeadline = isValid && !inferredDeadline;
  const hasDeadline = !!inferredDeadline || !!endsAt;
  const canContinue = isValid && hasDeadline;

  const helperText = useMemo(() => {
    if (isEmpty) return null;
    if (isTooShort) return 'Too short. Add the details.';
    return null;
  }, [isEmpty, isTooShort]);

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
    }
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomDate(val);
    setSelectedDeadline('custom');
    if (val) {
      const d = new Date(val + 'T23:59:00');
      setEndsAt(d);
    }
  };

  const handleContinue = () => {
    if (!isValid) return;
    if (inferredDeadline && !endsAt) {
      setEndsAt(inferredDeadline);
    }
    onNext();
  };

  // Auto-select "End of week" as default when deadline section first appears
  const deadlineShownRef = useRef(false);
  if (needsDeadline && !deadlineShownRef.current && !endsAt) {
    deadlineShownRef.current = true;
    // Set default on next tick to avoid setState during render
    setTimeout(() => {
      setSelectedDeadline('eow');
      setEndsAt(getEndOfWeek());
    }, 0);
  }

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

  return (
    <RitualScreen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Progress step={1} total={3} />

        <h1 style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 24, fontWeight: 600,
          color: 'var(--uv-text)', margin: '0 0 4px', lineHeight: 1.15,
        }}>
          What are you swearing to?
        </h1>

        <p style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 14,
          color: 'var(--uv-text-dim)', margin: '0 0 20px',
        }}>
          One vow. One sentence. Make it count.
        </p>

        <Input
          value={vowText}
          onChange={(val) => {
            setVowText(val);
            if (!touched) setTouched(true);
            // Reset deadline if text changes and had inferred one
            if (inferredDeadline) {
              setEndsAt(null);
              setSelectedDeadline(null);
            }
          }}
          placeholder="I will..."
          active={vowText.length > 0}
          error={touched && helperText ? helperText : undefined}
        />

        {/* Preset chips when empty */}
        {isEmpty && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRESET_CHIPS.map((chip) => (
                <Chip key={chip} label={chip} onClick={() => setVowText(chip)} />
              ))}
            </div>
          </div>
        )}

        {/* Suggestion chips when vague */}
        {isVague && suggestions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 12,
              color: 'var(--uv-text-dim)', marginBottom: 8,
            }}>
              Or try:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {suggestions.slice(0, 3).map((s) => (
                <Chip key={s} label={s} suggestion onClick={() => setVowText(s)} />
              ))}
            </div>
          </div>
        )}

        {/* Inferred deadline confirmation */}
        {isValid && inferredDeadline && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginTop: 16, padding: '8px 12px',
            background: 'var(--uv-bg-input)', borderRadius: 10,
            border: '1px solid var(--uv-border-strong)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--uv-text-dim)', fontFamily: 'var(--uv-font-sans)' }}>
              Verdict by
            </span>
            <span style={{ fontSize: 13, color: 'var(--uv-gold)', fontWeight: 500, fontFamily: 'var(--uv-font-sans)' }}>
              {formatDeadline(inferredDeadline)}
            </span>
            <span style={{ fontSize: 13, color: 'var(--uv-success)', marginLeft: 'auto' }}>✓</span>
          </div>
        )}

        {/* Inline deadline selector — shows when vow is valid but has no inferred deadline */}
        {needsDeadline && (
          <div style={{
            marginTop: 20,
            padding: '16px',
            background: 'var(--uv-bg-card)',
            border: '1px solid var(--uv-border-strong)',
            borderRadius: 14,
            animation: 'fadeIn 300ms ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{
                fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 500,
                color: 'var(--uv-text)',
              }}>
                By when?
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DEADLINE_OPTIONS.map((opt) => {
                const active = selectedDeadline === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleDeadlineSelect(opt.id)}
                    style={{
                      padding: '8px 14px',
                      background: active ? 'var(--uv-gold-bg)' : 'var(--uv-bg-input)',
                      border: `1px solid ${active ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
                      borderRadius: 20,
                      cursor: 'pointer',
                      fontFamily: 'var(--uv-font-sans)',
                      fontSize: 13,
                      color: active ? 'var(--uv-gold)' : 'var(--uv-text-muted)',
                      fontWeight: active ? 500 : 400,
                      transition: 'all 150ms',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}

              {/* Custom date pill */}
              <button
                type="button"
                onClick={() => handleDeadlineSelect('custom')}
                style={{
                  padding: '8px 14px',
                  background: selectedDeadline === 'custom' ? 'var(--uv-gold-bg)' : 'var(--uv-bg-input)',
                  border: `1px solid ${selectedDeadline === 'custom' ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
                  borderRadius: 20,
                  cursor: 'pointer',
                  fontFamily: 'var(--uv-font-sans)',
                  fontSize: 13,
                  color: selectedDeadline === 'custom' ? 'var(--uv-gold)' : 'var(--uv-gold-dim)',
                  fontWeight: selectedDeadline === 'custom' ? 500 : 400,
                  transition: 'all 150ms',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedDeadline === 'custom' && customDate
                  ? `📅 ${new Date(customDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : '📅 Pick date'}
              </button>
            </div>

            {/* Verdict date preview */}
            {endsAt && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                marginTop: 10, paddingTop: 10,
                borderTop: '1px solid var(--uv-border)',
              }}>
                <span style={{
                  fontFamily: 'var(--uv-font-sans)', fontSize: 12,
                  color: 'var(--uv-text-faint)',
                }}>
                  Deadline:
                </span>
                <span style={{
                  fontFamily: 'var(--uv-font-sans)', fontSize: 12,
                  color: 'var(--uv-gold)', fontWeight: 500,
                }}>
                  {formatDeadline(endsAt)}
                </span>
              </div>
            )}

            {/* Hidden native date input */}
            <input
              ref={dateInputRef}
              type="date"
              value={customDate}
              onChange={handleCustomDateChange}
              min={minDate}
              max={maxDate}
              style={{
                position: 'absolute', opacity: 0, pointerEvents: 'none',
                width: 0, height: 0, overflow: 'hidden',
              }}
              tabIndex={-1}
            />
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ paddingTop: 24, paddingBottom: 16 }}>
          <PrimaryButton onClick={handleContinue} disabled={!canContinue}>
            Continue →
          </PrimaryButton>
        </div>
      </div>
    </RitualScreen>
  );
}
