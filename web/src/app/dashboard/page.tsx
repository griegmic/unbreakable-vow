'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, ArrowLeft, Menu, X, Zap, Clock, LayoutGrid, Send } from 'lucide-react';
import { RitualScreen } from '@/components/uv/RitualScreen';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { SecondaryButton } from '@/components/uv/SecondaryButton';
import { SkeletonRow } from '@/components/uv/SkeletonRow';
import DashboardCard from '@/components/dashboard-card';
import DashboardHero from '@/components/dashboard-hero';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import {
  buildDashboardList,
  computeStats,
  getTapTarget,
  type DashboardVow,
  type SortedVow,
} from '@/lib/dashboard-sort';

// --- SlideMenu (restyled with --uv-* tokens) ---

function SlideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const nav = (path: string) => { onClose(); router.push(path); };

  const items = [
    { icon: Zap, label: 'New Vow', description: 'Create a vow in seconds', path: '/create' },
    { icon: Send, label: 'Dare a friend', description: 'Cast a vow on someone', path: '/cast' },
    { icon: LayoutGrid, label: 'My Vows', description: 'All your active vows', path: '/dashboard' },
    { icon: Clock, label: 'History', description: 'Past vows and outcomes', path: '/history' },
    { icon: Settings, label: 'Settings', description: 'Account and preferences', path: '/settings' },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-50 transition-opacity duration-200"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', backgroundColor: 'var(--uv-bg-overlay)' }}
        onClick={onClose}
      />
      <div
        className="fixed top-0 left-0 bottom-0 z-[51] w-[280px] flex flex-col transition-transform duration-200 safe-top safe-bottom"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          backgroundColor: 'var(--uv-bg-elev)',
          borderRight: '1px solid var(--uv-border-strong)',
        }}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '1.3px',
              textTransform: 'uppercase',
              color: 'var(--uv-gold)',
              fontFamily: 'var(--uv-font-sans)',
            }}
          >
            Menu
          </span>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5" style={{ color: 'var(--uv-text-faint)' }} />
          </button>
        </div>
        <div className="flex flex-col gap-1 px-3">
          {items.map((item) => (
            <button
              key={item.path}
              onClick={() => nav(item.path)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors active:opacity-80"
              style={{ backgroundColor: item.path === '/create' ? 'rgba(212,162,79,0.08)' : 'transparent' }}
            >
              <div
                className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: item.path === '/create' ? 'rgba(212,162,79,0.15)' : 'var(--uv-bg-card)' }}
              >
                <item.icon className="w-[18px] h-[18px]" style={{ color: item.path === '/create' ? 'var(--uv-gold-bright)' : 'var(--uv-text-faint)' }} />
              </div>
              <div>
                <span
                  className="block"
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: item.path === '/create' ? 'var(--uv-gold-bright)' : 'var(--uv-text-primary)',
                    fontFamily: 'var(--uv-font-sans)',
                  }}
                >
                  {item.label}
                </span>
                <span style={{ fontSize: 12, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>
                  {item.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// --- InProgressBanner (restyled with --uv-* tokens) ---

function InProgressBanner() {
  const router = useRouter();
  const [flowTarget, setFlowTarget] = useState<string | null>(null);

  useEffect(() => {
    try {
      const flow = localStorage.getItem('unbreakable-vow-flow');
      if (flow) {
        const parsed = JSON.parse(flow);
        if (parsed.rawInput && !parsed.vowId) {
          setFlowTarget(parsed.refinedText ? '/seal' : '/refine');
        }
      }
    } catch {}
  }, []);

  if (!flowTarget) return null;

  return (
    <button
      onClick={() => router.push(flowTarget)}
      className="w-full rounded-[18px] p-4 flex items-center gap-3 text-left transition-all active:scale-[0.98]"
      style={{
        backgroundColor: 'rgba(212,162,79,0.08)',
        border: '1.5px solid var(--uv-gold)',
        boxShadow: '0 0 20px var(--uv-gold-glow)',
      }}
    >
      <div
        className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'rgba(212,162,79,0.15)' }}
      >
        <ArrowLeft className="w-5 h-5" style={{ color: 'var(--uv-gold-bright)' }} />
      </div>
      <div>
        <span style={{ fontSize: 15, fontWeight: 500, display: 'block', color: 'var(--uv-text-primary)', fontFamily: 'var(--uv-font-sans)' }}>
          You have an unfinished vow
        </span>
        <span style={{ fontSize: 13, color: 'var(--uv-gold)', fontFamily: 'var(--uv-font-sans)' }}>
          Tap to continue where you left off
        </span>
      </div>
    </button>
  );
}

// --- Dashboard Page ---

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, displayName } = useAuth();
  const [myVows, setMyVows] = useState<DashboardVow[]>([]);
  const [witnessingVows, setWitnessingVows] = useState<DashboardVow[]>([]);
  const [challenges, setChallenges] = useState<DashboardVow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [acceptedChallengeIds, setAcceptedChallengeIds] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [myRes, witnessRes, challengeRes, acceptedChallengeRes] = await Promise.all([
      supabase
        .from('vows')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('vows')
        .select('*')
        .eq('witness_user_id', session.user.id)
        .neq('user_id', session.user.id)
        .in('status', ['active', 'awaiting_verdict'])
        .order('ends_at', { ascending: true }),
      supabase
        .from('vows')
        .select('*')
        .eq('target_user_id', session.user.id)
        .eq('challenge_status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('vows')
        .select('*')
        .eq('target_user_id', session.user.id)
        .eq('challenge_status', 'accepted')
        .in('status', ['active', 'awaiting_verdict', 'kept', 'broken'])
        .order('created_at', { ascending: false }),
    ]);

    // Merge accepted challenges into myVows so they appear in active/stats
    const myVowsData = (myRes.data ?? []) as DashboardVow[];
    const acceptedChallenges = (acceptedChallengeRes.data ?? []) as DashboardVow[];
    const newAcceptedIds = new Set(acceptedChallenges.map(v => v.id));
    setAcceptedChallengeIds(newAcceptedIds);
    const merged: DashboardVow[] = [
      ...myVowsData,
      ...acceptedChallenges.filter(v => !myVowsData.some(m => m.id === v.id)),
    ];

    // Resolve maker display names for witnessing vows
    const witnessingData = (witnessRes.data ?? []) as DashboardVow[];
    const witnessingWithNames: DashboardVow[] = await Promise.all(
      witnessingData.map(async (vow) => {
        try {
          const { data: name } = await supabase.rpc('get_display_name', { user_uuid: vow.user_id });
          return { ...vow, maker_display_name: (name as string) ?? null };
        } catch {
          return { ...vow, maker_display_name: null };
        }
      })
    );

    // Resolve target display names for challenge vows where I'm the maker
    const mergedWithTargetNames: DashboardVow[] = await Promise.all(
      merged.map(async (vow) => {
        if (vow.vow_type === 'challenge' && vow.target_user_id) {
          try {
            const { data: name } = await supabase.rpc('get_display_name', { user_uuid: vow.target_user_id });
            return { ...vow, target_display_name: (name as string) ?? null };
          } catch {
            return vow;
          }
        }
        return vow;
      })
    );

    setMyVows(mergedWithTargetNames);
    setWitnessingVows(witnessingWithNames);
    setChallenges((challengeRes.data ?? []) as DashboardVow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }
    fetchData();
    intervalRef.current = setInterval(fetchData, 30000);

    // Refresh data when page becomes visible (prevents stale state after back-nav)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchData();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthenticated, authLoading, router, fetchData]);

  // --- Computed state ---
  const { keptCount, streak } = computeStats(myVows);
  const dashboardVows = buildDashboardList(myVows, witnessingVows, challenges, acceptedChallengeIds);
  const myDashboardVows = dashboardVows.filter(v => v.role !== 'witness');
  const theirDashboardVows = dashboardVows.filter(v => v.role === 'witness');
  const completedCount = myVows.filter(v => ['kept', 'broken', 'voided'].includes(v.status)).length;

  // --- Challenge handlers (preserved) ---
  const handleAcceptChallenge = async (vowId: string) => {
    const vow = challenges.find(v => v.id === vowId);
    if (!vow?.challenge_invite_token) return;
    router.push(`/c/${vow.challenge_invite_token}`);
  };

  const handleDeclineChallenge = async (vowId: string) => {
    if (!confirm('Decline this challenge? The vow will be withdrawn.')) return;
    setActionBusy(vowId);
    try {
      const vow = challenges.find(v => v.id === vowId);
      if (!vow?.challenge_invite_token) return;
      await supabase.functions.invoke('accept-challenge', {
        body: { token: vow.challenge_invite_token, action: 'decline' },
      });
      await fetchData();
    } catch (err) {
      console.error('Decline challenge failed:', err);
    } finally {
      setActionBusy(null);
    }
  };

  // --- Greeting ---
  const firstName = displayName?.split(' ')[0] || '';
  const activeCount = myDashboardVows.length + theirDashboardVows.length;
  const subGreeting = activeCount === 0
    ? 'Nothing on the line.'
    : activeCount === 1
    ? 'One on the line.'
    : `You've got ${activeCount} on the line.`;

  // --- Loading state ---
  if (loading || authLoading) {
    return (
      <RitualScreen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 40 }}>
          <SkeletonRow count={4} />
        </div>
      </RitualScreen>
    );
  }

  // --- Empty / redirect logic ---
  const isEmpty = myVows.length === 0 && witnessingVows.length === 0 && challenges.length === 0;

  if (isEmpty) {
    return (
      <RitualScreen>
        <SlideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="p-1 -ml-1">
            <Menu className="w-5 h-5" style={{ color: 'var(--uv-text-faint)' }} />
          </button>
          <button
            onClick={() => router.push('/settings')}
            aria-label="Settings"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--uv-bg-card)',
              border: '1px solid var(--uv-border-strong)',
            }}
          >
            <Settings className="w-[18px] h-[18px]" style={{ color: 'var(--uv-text-faint)' }} />
          </button>
        </div>

        {/* Empty state */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 40 }}>
          <p style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 15, color: 'var(--uv-text-muted)', textAlign: 'center' }}>
            No promises yet.
          </p>
          <p style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 13, color: 'var(--uv-text-faint)', textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
            Make one. Swear on it. See if you can keep it.
          </p>
          <div style={{ marginTop: 16, width: '100%', maxWidth: 280 }}>
            <PrimaryButton onClick={() => router.push('/create')}>+ Make your first vow</PrimaryButton>
          </div>
        </div>
      </RitualScreen>
    );
  }

  // Only redirect if no active own vows AND no witness vows
  if (myDashboardVows.length === 0 && theirDashboardVows.length === 0) {
    if (keptCount > 0) {
      router.replace('/?new=1&returning=1');
    } else {
      router.replace('/?new=1');
    }
    return null;
  }

  const isHero = myDashboardVows.length === 1 && theirDashboardVows.length === 0;

  return (
    <>
      <SlideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <RitualScreen>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="p-1 -ml-1"
            >
              <Menu className="w-5 h-5" style={{ color: 'var(--uv-text-faint)' }} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {keptCount > 0 && (
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>
                <span style={{ color: 'var(--uv-status-active)' }}>{keptCount}</span> kept
                {streak >= 2 && <> &middot; {streak} streak</>}
              </span>
            )}
            <button
              onClick={() => router.push('/settings')}
              aria-label="Settings"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--uv-bg-card)',
                border: '1px solid var(--uv-border-strong)',
              }}
            >
              <Settings className="w-[18px] h-[18px]" style={{ color: 'var(--uv-text-faint)' }} />
            </button>
          </div>
        </div>

        {/* Greeting */}
        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              fontFamily: 'var(--uv-font-serif)',
              fontSize: 'clamp(24px, 6vw, 32px)',
              fontWeight: 400,
              fontStyle: 'italic',
              color: 'var(--uv-gold)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {firstName}.
          </h1>
          <p style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 14, color: 'var(--uv-text-muted)', marginTop: 4 }}>
            {subGreeting}
          </p>
        </div>

        {/* + New vow button */}
        {!isHero && (
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => router.push('/create')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--uv-gold)',
                fontSize: 13,
                fontWeight: 500,
                fontFamily: 'var(--uv-font-sans)',
                padding: '6px 0',
                cursor: 'pointer',
              }}
            >
              + New vow
            </button>
          </div>
        )}

        {isHero ? (
          // --- HERO VIEW (1 own vow, no witness vows) ---
          <DashboardHero
            item={myDashboardVows[0]}
            keptCount={keptCount}
            streak={streak}
            onAcceptChallenge={
              myDashboardVows[0].state === 'T1'
                ? () => handleAcceptChallenge(myDashboardVows[0].vow.id)
                : undefined
            }
            onDeclineChallenge={
              myDashboardVows[0].state === 'T1'
                ? () => handleDeclineChallenge(myDashboardVows[0].vow.id)
                : undefined
            }
          />
        ) : (
          // --- SMART STACK ---
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <InProgressBanner />

            {/* Your vows section */}
            {myDashboardVows.length > 0 && (
              <>
                {theirDashboardVows.length > 0 && (
                  <h2
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '1.2px',
                      textTransform: 'uppercase',
                      color: 'var(--uv-text-faint)',
                      fontFamily: 'var(--uv-font-sans)',
                      paddingBottom: 4,
                      margin: 0,
                    }}
                  >
                    Your vows
                  </h2>
                )}
                <div className="flex flex-col gap-2">
                  {myDashboardVows.map((item) => (
                    <DashboardCard
                      key={item.vow.id}
                      item={item}
                      onTap={() => router.push(getTapTarget(item))}
                      onAcceptChallenge={
                        item.state === 'T1'
                          ? () => handleAcceptChallenge(item.vow.id)
                          : undefined
                      }
                      onDeclineChallenge={
                        item.state === 'T1'
                          ? () => handleDeclineChallenge(item.vow.id)
                          : undefined
                      }
                    />
                  ))}
                </div>
              </>
            )}

            {/* Their vows section */}
            {theirDashboardVows.length > 0 && (
              <>
                <h2
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '1.2px',
                    textTransform: 'uppercase',
                    color: 'var(--uv-status-verdict)',
                    fontFamily: 'var(--uv-font-sans)',
                    paddingTop: 16,
                    paddingBottom: 4,
                    margin: 0,
                  }}
                >
                  Their vows
                </h2>
                <div className="flex flex-col gap-2">
                  {theirDashboardVows.map((item) => (
                    <DashboardCard
                      key={item.vow.id}
                      item={item}
                      onTap={() => router.push(getTapTarget(item))}
                    />
                  ))}
                </div>
              </>
            )}

            {/* History link */}
            {completedCount > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 16 }}>
                <span style={{ fontSize: 11, color: 'var(--uv-text-faint)', fontFamily: 'var(--uv-font-sans)' }}>
                  {completedCount} vow{completedCount !== 1 ? 's' : ''} completed
                </span>
                <SecondaryButton onClick={() => router.push('/history')}>
                  View history
                </SecondaryButton>
              </div>
            )}
          </div>
        )}

        {/* Footer CTA */}
        {!isHero && (
          <div style={{ marginTop: 'auto', paddingTop: 24 }}>
            <PrimaryButton onClick={() => router.push('/create')}>Make a Vow</PrimaryButton>
          </div>
        )}
      </RitualScreen>
    </>
  );
}
