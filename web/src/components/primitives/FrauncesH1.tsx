import { type ReactNode } from 'react';

interface FrauncesH1Props {
  children: ReactNode;
  italic?: boolean;
  size?: 'hero' | 'page' | 'card';
}

const SIZES = {
  hero: { fontSize: 48, lineHeight: 1.04, letterSpacing: '-0.015em' },
  page: { fontSize: 34, lineHeight: 1.08, letterSpacing: '-0.015em' },
  card: { fontSize: 24, lineHeight: 1.15, letterSpacing: '-0.012em' },
} as const;

export function FrauncesH1({ children, italic = false, size = 'page' }: FrauncesH1Props) {
  const s = SIZES[size];
  return (
    <h1
      style={{
        fontFamily: 'var(--uv-font-serif)',
        fontSize: s.fontSize,
        fontWeight: 450,
        fontStyle: italic ? 'italic' : 'normal',
        fontVariationSettings: `"opsz" ${s.fontSize > 30 ? 120 : s.fontSize}, "SOFT" 24`,
        letterSpacing: s.letterSpacing,
        lineHeight: s.lineHeight,
        color: 'var(--uv-text)',
        margin: 0,
      }}
    >
      {children}
    </h1>
  );
}
