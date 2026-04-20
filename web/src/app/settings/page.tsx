'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { Card } from '@/components/uv/Card';
import { AuthModal } from '@/components/auth-modal';
import { useAuth } from '@/providers/auth-provider';

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, displayName, session, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <RitualScreen>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 16 }}>
        {/* Back */}
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--uv-text-muted)',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--uv-font-sans)',
            textAlign: 'left',
            padding: '4px 0',
          }}
        >
          &larr; Dashboard
        </button>

        {/* Hero */}
        <h1
          style={{
            fontFamily: 'var(--uv-font-serif)',
            fontSize: 32,
            fontWeight: 500,
            color: 'var(--uv-text)',
            lineHeight: 1.2,
          }}
        >
          Settings.
        </h1>

        {isAuthenticated ? (
          <>
            {/* Account card */}
            <Card variant="elevated">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--uv-gold-bg)',
                    fontSize: 18,
                    fontFamily: 'var(--uv-font-serif)',
                    color: 'var(--uv-gold)',
                    fontWeight: 500,
                  }}
                >
                  {(displayName || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--uv-text)',
                      display: 'block',
                      fontFamily: 'var(--uv-font-sans)',
                    }}
                  >
                    {displayName || 'User'}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--uv-text-muted)',
                      fontFamily: 'var(--uv-font-sans)',
                    }}
                  >
                    {session?.user?.email || ''}
                  </span>
                </div>
              </div>
            </Card>

            {/* Vow history */}
            <Card onClick={() => router.push('/history')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: 'var(--uv-text)',
                    fontFamily: 'var(--uv-font-sans)',
                  }}
                >
                  Vow history
                </span>
                <span style={{ fontSize: 18, color: 'var(--uv-text-muted)' }}>&rsaquo;</span>
              </div>
            </Card>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              style={{
                width: '100%',
                borderRadius: 'var(--uv-radius-2xl)',
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--uv-bg-card)',
                border: '1px solid var(--uv-border-strong)',
                cursor: 'pointer',
                transition: 'opacity 120ms',
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'var(--uv-danger)',
                  fontFamily: 'var(--uv-font-sans)',
                }}
              >
                Sign out
              </span>
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 16 }}>
            <p style={{ fontSize: 15, color: 'var(--uv-text-muted)', fontFamily: 'var(--uv-font-sans)', margin: 0 }}>Not signed in</p>
            <PrimaryButton onClick={() => setShowAuth(true)}>Sign in</PrimaryButton>
          </div>
        )}
      </div>

      <AuthModal
        visible={showAuth}
        onDismiss={() => setShowAuth(false)}
        onSuccess={() => setShowAuth(false)}
      />
    </RitualScreen>
  );
}
