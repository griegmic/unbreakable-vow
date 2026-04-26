'use client';
import { FrauncesH1, FrauncesSub } from '@/components/primitives';

export default function ChallengeNotFound({ token }: { token: string }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--uv-bg)',
    }}>
      <div style={{
        textAlign: 'center', padding: '0 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        <FrauncesH1 italic size="page">Challenge not found</FrauncesH1>
        <FrauncesSub>
          This link may have expired or is invalid. Ask the person who sent it to share it again.
        </FrauncesSub>
        <a
          href="/quick-vow"
          style={{
            marginTop: 8, padding: '10px 20px', borderRadius: 12,
            fontFamily: 'var(--uv-font-sans)', fontSize: 14, fontWeight: 600,
            textDecoration: 'none',
            background: 'var(--uv-gold-bg)', border: '1px solid var(--uv-gold-line)',
            color: 'var(--uv-gold)',
          }}
        >
          Make your own vow
        </a>
      </div>
    </div>
  );
}
