'use client';

import React, { useState, useMemo, useRef } from 'react';
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

function formatCustomDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function ByWhenSheet({ open, onClose, onSelect }: ByWhenSheetProps) {
  const [selected, setSelected] = useState<OptionId>('friday');
  const [customDate, setCustomDate] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  const options: { id: OptionId; label: string }[] = useMemo(() => [
    { id: 'tonight', label: 'Tonight (11:59pm)' },
    { id: 'tomorrow', label: 'Tomorrow (9pm)' },
    { id: 'friday', label: 'This Friday (9pm)' },
    { id: 'week', label: 'One week from now' },
  ], []);

  const handleCustomTap = () => {
    setSelected('custom');
    // Immediately open the native date picker
    setTimeout(() => dateInputRef.current?.showPicker?.(), 50);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDate(e.target.value);
    setSelected('custom');
  };

  const handleConfirm = () => {
    let date: Date;
    switch (selected) {
      case 'tonight': date = getTonight(); break;
      case 'tomorrow': date = getTomorrow(); break;
      case 'friday': date = getNextFriday(); break;
      case 'week': date = getOneWeek(); break;
      case 'custom':
        if (!customDate) return;
        date = new Date(customDate + 'T23:59:00');
        break;
      default: date = getNextFriday();
    }
    onSelect(date);
  };

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{
          fontFamily: 'var(--uv-font-serif)', fontSize: 20, fontWeight: 500,
          color: 'var(--uv-text)', margin: 0,
        }}>
          By when?
        </h2>
        <p style={{
          fontFamily: 'var(--uv-font-sans)', fontSize: 14,
          color: 'var(--uv-text-dim)', margin: '0 0 4px',
        }}>
          Deadline for judgment.
        </p>

        <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((opt) => (
            <RadioCard
              key={opt.id}
              label={opt.label}
              selected={selected === opt.id}
              onClick={() => { setSelected(opt.id); setCustomDate(''); }}
            />
          ))}

          {/* Custom date — styled as a RadioCard-like row */}
          <button
            type="button"
            onClick={handleCustomTap}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px',
              background: selected === 'custom' ? 'var(--uv-gold-bg)' : 'var(--uv-bg-input)',
              border: `1px solid ${selected === 'custom' ? 'var(--uv-gold)' : 'var(--uv-border-strong)'}`,
              borderRadius: 12, cursor: 'pointer',
              transition: 'all 150ms', width: '100%',
            }}
          >
            <span style={{
              fontFamily: 'var(--uv-font-sans)', fontSize: 14,
              color: selected === 'custom' ? 'var(--uv-gold)' : 'var(--uv-gold)',
              fontWeight: selected === 'custom' ? 500 : 400,
            }}>
              {selected === 'custom' && customDate
                ? `📅 ${formatCustomDate(customDate)}`
                : '📅 Pick a date'}
            </span>
            <span style={{ color: 'var(--uv-gold)', fontSize: 14 }}>›</span>
          </button>

          {/* Hidden native date input — triggered by the button above */}
          <input
            ref={dateInputRef}
            type="date"
            value={customDate}
            onChange={handleDateChange}
            min={minDate}
            max={maxDate}
            style={{
              position: 'absolute', opacity: 0, pointerEvents: 'none',
              width: 0, height: 0, overflow: 'hidden',
            }}
            tabIndex={-1}
          />
        </div>

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
