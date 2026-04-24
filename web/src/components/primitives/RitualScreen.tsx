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
  const isCeremony = variant === 'ceremony';
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: GRADIENTS[gradient],
        backgroundColor: 'var(--uv-bg)',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        padding: isCeremony ? '54px 28px 36px' : '24px 22px 24px',
      }}
    >
      <div className="ritual-screen-inner" style={{ width: '100%' }}>
        {children}
      </div>
    </div>
  );
}
