'use client';

import React, { useState, useMemo } from 'react';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { Input } from '@/components/uv/Input';
import { Chip } from '@/components/uv/Chip';
import { analyzeVow, getContextualSuggestions, inferDeadline } from '@/lib/vow-logic';

interface VowInputProps {
  vowText: string;
  setVowText: (text: string) => void;
  onNext: () => void;
  onByWhen: () => void;
}

const PRESET_CHIPS = [
  'Gym 3x this week',
  '10k steps a day this week',
  'No alcohol, 2 weeks',
  'Delete TikTok for a week',
  'Actually call my mom weekly',
];

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: i < step ? 'var(--uv-gold)' : 'var(--uv-border-strong)',
            transition: 'background 200ms',
          }}
        />
      ))}
    </div>
  );
}

export function VowInput({ vowText, setVowText, onNext, onByWhen }: VowInputProps) {
  const [touched, setTouched] = useState(false);

  const analysis = useMemo(() => {
    if (!vowText.trim()) return null;
    return analyzeVow(vowText);
  }, [vowText]);

  const suggestions = useMemo(() => {
    if (!vowText.trim()) return [];
    return getContextualSuggestions(vowText);
  }, [vowText]);

  const isVague = analysis?.type === 'vague';
  const isTooShort = vowText.trim().length > 0 && vowText.trim().length < 10;
  const isEmpty = !vowText.trim();
  const isValid = !isEmpty && !isTooShort;

  const helperText = useMemo(() => {
    if (isEmpty) return null;
    if (isTooShort) return 'Too short. Add the details.';
    return null;
  }, [isEmpty, isTooShort]);

  const handleContinue = () => {
    if (!isValid) return;
    const deadline = inferDeadline(vowText);
    if (deadline) {
      onNext();
    } else {
      onByWhen();
    }
  };

  return (
    <RitualScreen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Progress step={1} total={3} />

        <h1
          style={{
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 24,
            fontWeight: 500,
            color: 'var(--uv-text)',
            margin: '0 0 8px',
            lineHeight: 1.2,
          }}
        >
          What are you swearing to?
        </h1>

        <p
          style={{
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 14,
            color: 'var(--uv-text-dim)',
            margin: '0 0 24px',
          }}
        >
          One vow. One sentence. Make it count.
        </p>

        <Input
          value={vowText}
          onChange={(val) => {
            setVowText(val);
            if (!touched) setTouched(true);
          }}
          placeholder="I will..."
          active={vowText.length > 0}
          error={touched && helperText ? helperText : undefined}
        />

        {/* Preset chips when empty */}
        {isEmpty && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            {PRESET_CHIPS.map((chip) => (
              <Chip
                key={chip}
                label={chip}
                onClick={() => setVowText(chip)}
              />
            ))}
          </div>
        )}

        {/* Suggestion chips when vague */}
        {isVague && suggestions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p
              style={{
                fontFamily: 'var(--uv-font-sans)',
                fontSize: 12,
                color: 'var(--uv-text-dim)',
                marginBottom: 8,
              }}
            >
              Or try:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {suggestions.slice(0, 3).map((s) => (
                <Chip
                  key={s}
                  label={s}
                  suggestion
                  onClick={() => setVowText(s)}
                />
              ))}
            </div>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ paddingTop: 24, paddingBottom: 16 }}>
          <PrimaryButton
            onClick={handleContinue}
            disabled={!isValid}
          >
            Continue &rarr;
          </PrimaryButton>
        </div>
      </div>
    </RitualScreen>
  );
}
