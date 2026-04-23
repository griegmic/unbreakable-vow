import { type ReactNode } from 'react';

interface FrauncesH1Props {
  children: ReactNode;
  italic?: boolean;
  size?: 'lg' | 'xl';
}

export function FrauncesH1({ children, italic = false, size = 'xl' }: FrauncesH1Props) {
  const fontSize = size === 'xl' ? 52 : 34;
  return (
    <h1
      style={{
        fontFamily: 'var(--uv-font-serif)',
        fontSize,
        fontWeight: 500,
        fontStyle: italic ? 'italic' : 'normal',
        fontVariationSettings: '"opsz" 144',
        letterSpacing: size === 'xl' ? '-0.035em' : '-0.025em',
        lineHeight: 1,
        color: 'var(--uv-text)',
        margin: 0,
      }}
    >
      {children}
    </h1>
  );
}
