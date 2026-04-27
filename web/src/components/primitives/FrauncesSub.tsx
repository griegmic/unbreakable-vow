import { type ReactNode } from 'react';

interface FrauncesSubProps {
  children: ReactNode;
  dim?: boolean;
}

export function FrauncesSub({ children, dim = false }: FrauncesSubProps) {
  return (
    <p
      style={{
        fontFamily: 'var(--uv-font-sans)',
        fontSize: 15,
        fontWeight: 450,
        fontStyle: 'normal',
        lineHeight: 1.45,
        color: dim ? 'var(--uv-text-dim)' : 'var(--uv-text-muted)',
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}
