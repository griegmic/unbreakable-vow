'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, ArrowLeft, Menu, X, Zap, Clock, LayoutGrid, Send } from 'lucide-react';
import { RitualScreen, HeaderBadge, FadeUp } from '@/components/ui';
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

// --- SlideMenu (preserved exactly) ---

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
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />
      <div
        className="fixed top-0 left-0 bottom-0 z-[51] w-[280px] flex flex-col transition-transform duration-200 safe-top safe-bottom"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          backgroundColor: 'var(--surface-elevated)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <span className="text-[13px] font-bold tracking-[1.3px] uppercase" style={{ color: 'var(--gold)' }}>Menu</span>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
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
                style={{ backgroundColor: item.path === '/create' ? 'rgba(212,162,79,0.15)' : 'var(--surface)' }}
              >
                <item.icon className="w-[18px] h-[18px]" style={{ color: item.path === '/create' ? 'var(--gold-bright)' : 'var(--text-muted)' }} />
              </div>
              <div>
                <span className="text-[15px] font-semibold block" style={{ color: item.path === '/create' ? 'var(--gold-bright)' : 'var(--text)' }}>
                  {item.label}
                </span>
                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{item.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// --- InProgressBanner (preserved exactly) ---

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
        border: '1.5px solid var(--gold)',
        boxShadow: '0 0 20px rgba(212,162,79,0.12)',
      }}
    >
      <div
        className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'rgba(212,162,79,0.15)' }}
      >
        <ArrowLeft className="w-5 h-5" style={{ color: 'var(--gold-bright)' }} />
      </div>
      <div>
        <span className="text-[15px] font-semibold block" style={{ color: 'var(--text)' }}>
          You have an unfinished vow
        </span>
        <span className="text-[13px]" style={{ color: 'var(--gold)' }}>
          Tap to continue where you left off
        </span>
      </div>
    </button>
  );
}

// --- Dashboard Page ---

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
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

  // --- Loading state ---
  if (loading || authLoading) {
    return (
      <RitualScreen>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
        </div>
      </RitualScreen>
    );
  }

  // --- Empty / redirect logic ---
  const isEmpty = myVows.length === 0 && witnessingVows.length === 0 && challenges.length === 0;

  if (isEmpty) {
    router.replace('/?new=1');
    return null;
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
      <RitualScreen
        footer={
          !isHero ? (
            <button
              onClick={() => router.push('/create')}
              className="w-full rounded-[16px] min-h-[56px] flex items-center justify-center gap-2 transition-transform active:scale-[0.975]"
              style={{
                background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
                boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
              }}
            >
              <span className="text-[15px] font-extrabold" style={{ color: '#0B0D11' }}>Make a Vow</span>
            </button>
          ) : undefined
        }
      >
        {/* Header */}
        <FadeUp>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                className="p-1 -ml-1"
              >
                <Menu className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
              <HeaderBadge />
            </div>
            <div className="flex items-center gap-3">
              {keptCount > 0 && (
                <span className="text-[12px] font-semibold" style={{ color: '#5a5650' }}>
                  <span style={{ color: '#52d69a' }}>{keptCount}</span> kept
                  {streak >= 2 && <> · {streak} streak</>}
                </span>
              )}
              <button
                onClick={() => router.push('/settings')}
                aria-label="Settings"
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <Settings className="w-[18px] h-[18px]" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          </div>
        </FadeUp>

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
          <>
            <InProgressBanner />

            {/* Your vows section */}
            {myDashboardVows.length > 0 && (
              <>
                {theirDashboardVows.length > 0 && (
                  <FadeUp>
                    <h2 className="text-[11px] font-bold tracking-[1.2px] uppercase pb-1" style={{ color: '#5a5650' }}>
                      Your vows
                    </h2>
                  </FadeUp>
                )}
                <div className="flex flex-col gap-2">
                  {myDashboardVows.map((item, i) => (
                    <FadeUp key={item.vow.id} delay={i * 0.03}>
                      <DashboardCard
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
                    </FadeUp>
                  ))}
                </div>
              </>
            )}

            {/* Their vows section */}
            {theirDashboardVows.length > 0 && (
              <>
                <FadeUp delay={myDashboardVows.length * 0.03}>
                  <h2 className="text-[11px] font-bold tracking-[1.2px] uppercase pt-4 pb-1" style={{ color: '#60A5FA' }}>
                    Their vows
                  </h2>
                </FadeUp>
                <div className="flex flex-col gap-2">
                  {theirDashboardVows.map((item, i) => (
                    <FadeUp key={item.vow.id} delay={(myDashboardVows.length + i) * 0.03}>
                      <DashboardCard
                        item={item}
                        onTap={() => router.push(getTapTarget(item))}
                      />
                    </FadeUp>
                  ))}
                </div>
              </>
            )}

            {/* History link */}
            {completedCount > 0 && (
              <div className="flex flex-col items-center gap-1 pt-2 pb-4">
                <span className="text-[11px]" style={{ color: '#3a3530' }}>
                  {completedCount} vow{completedCount !== 1 ? 's' : ''} completed
                </span>
                <button
                  onClick={() => router.push('/history')}
                  className="text-[12px] transition-opacity active:opacity-70"
                  style={{ color: '#5a5650' }}
                >
                  View history →
                </button>
              </div>
            )}
          </>
        )}
      </RitualScreen>
    </>
  );
}
