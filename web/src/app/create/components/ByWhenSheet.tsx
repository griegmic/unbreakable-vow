'use client';

import React, { useState, useMemo } from 'react';
import { BottomSheet } from '@/components/uv/BottomSheet';
import { RadioCard } from '@/components/uv/RadioCard';
import { PrimaryButton } from '@/components/uv/PrimaryButton';

interface ByWhenSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
}

type OptionId = 'tonight' | 'tomorrow' | 'friday' | 'week' | 'custom';

function getNextFriday(): Date {
  const now = new Date();
  const day = now.getDay();
  // days until Friday (5)
  let diff = 5 - day;
  if (diff <= 0) diff += 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + diff);
  friday.setHours(21, 0, 0, 0);
  return friday;
}

function getTonight(): Date {
  const d = new Date();
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

export function ByWhenSheet({ open, onClose, onSelect }: ByWhenSheetProps) {
  const [selected, setSelected] = useState<OptionId>('friday');
  const [customDate, setCustomDate] = useState('');

  const options: { id: OptionId; label: string; sub?: string }[] = useMemo(() => [
    { id: 'tonight', label: 'Tonight (11:59pm)' },
    { id: 'tomorrow', label: 'Tomorrow (9pm)' },
    { id: 'friday', label: 'This Friday (9pm)' },
    { id: 'week', label: 'One week from now' },
    { id: 'custom', label: 'Pick a date...' },
  ], []);

  const handleConfirm = () => {
    let date: Date;
    switch (selected) {
      case 'tonight':
        date = getTonight();
        break;
      case 'tomorrow':
        date = getTomorrow();
        break;
      case 'friday':
        date = getNextFriday();
        break;
      case 'week':
        date = getOneWeek();
        break;
      case 'custom':
        if (!customDate) return;
        date = new Date(customDate + 'T23:59:00');
        break;
      default:
        date = getNextFriday();
    }
    onSelect(date);
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2
          style={{
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 20,
            fontWeight: 500,
            color: 'var(--uv-text)',
            margin: 0,
          }}
        >
          By when?
        </h2>
        <p
          style={{
            fontFamily: 'var(--uv-font-sans)',
            fontSize: 14,
            color: 'var(--uv-text-dim)',
            margin: '0 0 4px',
          }}
        >
          Pick a deadline. You can&apos;t undo this later.
        </p>

        <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((opt) => (
            <RadioCard
              key={opt.id}
              label={opt.label}
              sub={opt.sub}
              selected={selected === opt.id}
              onClick={() => setSelected(opt.id)}
              special={opt.id === 'custom'}
            />
          ))}
        </div>

        {selected === 'custom' && (
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            min={minDate}
            style={{
              background: 'var(--uv-bg-input)',
              border: '1px solid var(--uv-border-strong)',
              borderRadius: 'var(--uv-radius-xl, 12px)',
              padding: '12px 14px',
              fontFamily: 'var(--uv-font-sans)',
              fontSize: 15,
              color: 'var(--uv-text)',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
        )}

        <div style={{ marginTop: 8 }}>
          <PrimaryButton
            onClick={handleConfirm}
            disabled={selected === 'custom' && !customDate}
          >
            Set deadline
          </PrimaryButton>
        </div>
      </div>
    </BottomSheet>
  );
}
