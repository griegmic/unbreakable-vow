import { type ReactNode } from 'react';

interface FrauncesH1Props {
  children: ReactNode;
  italic?: boolean;
  size?: 'hero' | 'page' | 'card';
}

const SIZES = {
  hero: { fontSize: 48, lineHeight: 1.03, letterSpacing: '0' },
  page: { fontSize: 34, lineHeight: 1.06, letterSpacing: '0' },
  card: { fontSize: 24, lineHeight: 1.13, letterSpacing: '0' },
} as const;

export function FrauncesH1({ children, italic = false, size = 'page' }: FrauncesH1Props) {
  const s = SIZES[size];
  return (
    <h1
      style={{
        fontFamily: 'var(--uv-font-serif)',
        fontSize: s.fontSize,
        fontWeight: 500,
        fontStyle: italic ? 'italic' : 'normal',
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
