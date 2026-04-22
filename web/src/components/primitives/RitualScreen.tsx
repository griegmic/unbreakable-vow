import { type ReactNode } from 'react';

interface RitualScreenProps {
  children: ReactNode;
  gradient?: 'default' | 'verdict' | 'broken';
  variant?: 'ceremony' | 'utility';
}

const GRADIENTS = {
  default: 'radial-gradient(ellipse at 50% 20%, rgba(200,155,60,0.06) 0%, var(--uv-bg) 70%)',
  verdict: 'radial-gradient(ellipse at 50% 30%, rgba(74,222,128,0.06) 0%, var(--uv-bg) 70%)',
  broken: 'radial-gradient(ellipse at 50% 30%, rgba(248,113,113,0.06) 0%, var(--uv-bg) 70%)',
} as const;

export function RitualScreen({ children, gradient = 'default', variant = 'ceremony' }: RitualScreenProps) {
  const padding = variant === 'ceremony' ? '0 36px' : '0 22px';
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: GRADIENTS[gradient],
        backgroundColor: 'var(--uv-bg)',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        padding,
        paddingTop: variant === 'ceremony' ? 120 : 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 480 }}>
        {children}
      </div>
    </div>
  );
}
