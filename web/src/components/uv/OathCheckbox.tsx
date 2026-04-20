'use client';

import React, { useId } from 'react';
import { Check } from 'lucide-react';

interface OathCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function OathCheckbox({ checked, onChange, label }: OathCheckboxProps) {
  const id = useId();

  return (
    <>
      <label
        htmlFor={id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            border: checked ? 'none' : '1.5px solid var(--uv-border-strong)',
            background: checked ? 'var(--uv-gold)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            animation: checked ? 'checkBounce 200ms ease-out' : undefined,
          }}
        >
          {checked && <Check size={12} color="white" strokeWidth={3} />}
        </span>
        <span
          style={{
            fontSize: 13,
            color: 'var(--uv-text-muted)',
            fontFamily: 'var(--uv-font-sans)',
          }}
        >
          {label}
        </span>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            whiteSpace: 'nowrap',
            borderWidth: 0,
          }}
        />
      </label>
      <style>{`
        @keyframes checkBounce {
          0% { transform: scale(0.8); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        label:has(input:focus-visible) > span:first-child {
          outline: 2px solid var(--uv-gold);
          outline-offset: 2px;
        }
      `}</style>
    </>
  );
}
