'use client';
import { useState } from 'react';

interface Contact {
  name: string;
  phone: string;
}

interface ContactPickerProps {
  onSelect: (contact: Contact) => void;
  label?: string;
}

export function ContactPicker({ onSelect, label = 'Pick someone' }: ContactPickerProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onSelect({ name: name.trim(), phone: phone.trim() });
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 12,
      }}
    >
      <label
        style={{
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--uv-text-muted)',
        }}
      >
        {label}
      </label>
      <input
        type="text"
        placeholder="Their name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{
          width: '100%',
          height: 48,
          padding: '0 16px',
          borderRadius: 14,
          border: '1px solid var(--uv-border)',
          background: 'var(--uv-bg-input)',
          color: 'var(--uv-text)',
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 16,
          outline: 'none',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--uv-gold)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--uv-border)'; }}
      />
      <input
        type="tel"
        placeholder="Their phone (optional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{
          width: '100%',
          height: 48,
          padding: '0 16px',
          borderRadius: 14,
          border: '1px solid var(--uv-border)',
          background: 'var(--uv-bg-input)',
          color: 'var(--uv-text)',
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 16,
          outline: 'none',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--uv-gold)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--uv-border)'; }}
      />
      <button
        onClick={handleSubmit}
        disabled={!name.trim()}
        style={{
          height: 44,
          borderRadius: 12,
          border: '1px solid var(--uv-gold)',
          background: name.trim() ? 'var(--uv-gold-bg)' : 'transparent',
          color: name.trim() ? 'var(--uv-gold-bright)' : 'var(--uv-text-faint)',
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 14,
          fontWeight: 500,
          cursor: name.trim() ? 'pointer' : 'not-allowed',
        }}
      >
        Done
      </button>
    </div>
  );
}
