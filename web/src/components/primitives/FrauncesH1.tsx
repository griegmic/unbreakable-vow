import { type ReactNode } from 'react';

interface FrauncesH1Props {
  children: ReactNode;
  italic?: boolean;
  size?: 'hero' | 'page' | 'card';
}

const SIZES = {
  hero: { fontSize: 52, lineHeight: 0.98, letterSpacing: '-0.02em' },
  page: { fontSize: 38, lineHeight: 1.05, letterSpacing: '-0.02em' },
  card: { fontSize: 24, lineHeight: 1.15, letterSpacing: '-0.012em' },
} as const;

export function FrauncesH1({ children, italic = false, size = 'page' }: FrauncesH1Props) {
  const s = SIZES[size];
  return (
    <h1
      style={{
        fontFamily: 'var(--uv-font-serif)',
        fontSize: s.fontSize,
        fontWeight: 400,
        fontStyle: italic ? 'italic' : 'normal',
        fontVariationSettings: '"opsz" 144, "SOFT" 30',
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
