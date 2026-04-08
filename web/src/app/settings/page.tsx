'use client';
import { useRouter } from 'next/navigation';
import { LogOut, User, History, ArrowLeft } from 'lucide-react';
import { RitualScreen, HeaderBadge, TitleBlock, RitualCard, PrimaryButton, FadeUp } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, displayName, session, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <RitualScreen>
      <FadeUp>
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 py-2">
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Dashboard</span>
        </button>
      </FadeUp>

      <FadeUp delay={0.05}>
        <TitleBlock title="Settings" subtitle="Manage your account" />
      </FadeUp>

      {isAuthenticated ? (
        <>
          <FadeUp delay={0.1}>
            <RitualCard>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <User className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                </div>
                <div>
                  <span className="text-[15px] font-semibold block" style={{ color: 'var(--text)' }}>
                    {displayName || 'User'}
                  </span>
                  <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    {session?.user?.email || ''}
                  </span>
                </div>
              </div>
            </RitualCard>
          </FadeUp>

          <FadeUp delay={0.15}>
            <button
              onClick={() => router.push('/history')}
              className="w-full rounded-[18px] p-4 flex items-center gap-3 transition-opacity active:opacity-80"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <History className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--text)' }}>Vow history</span>
            </button>
          </FadeUp>

          <FadeUp delay={0.2}>
            <button
              onClick={handleSignOut}
              className="w-full rounded-[18px] p-4 flex items-center gap-3 transition-opacity active:opacity-80"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <LogOut className="w-5 h-5" style={{ color: 'var(--danger)' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--danger)' }}>Sign out</span>
            </button>
          </FadeUp>
        </>
      ) : (
        <FadeUp delay={0.1}>
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-[15px]" style={{ color: 'var(--text-muted)' }}>Not signed in</p>
            <PrimaryButton label="Make a vow" onPress={() => router.push('/')} />
          </div>
        </FadeUp>
      )}
    </RitualScreen>
  );
}
