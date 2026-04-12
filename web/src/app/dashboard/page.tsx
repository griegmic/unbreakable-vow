'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Plus, ArrowLeft, Menu, X, Zap, Clock, LayoutGrid, Send } from 'lucide-react';
import { RitualScreen, HeaderBadge, SectionLabel, StatPill, PrimaryButton, FadeUp } from '@/components/ui';
import VowCard from '@/components/vow-card';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types';

type VowRow = Database['public']['Tables']['vows']['Row'];

function SlideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const nav = (path: string) => { onClose(); router.push(path); };

  const items = [
    { icon: Zap, label: 'QuickVow', description: 'Create a vow in seconds', path: '/create' },
    { icon: Send, label: 'Dare a friend', description: 'Cast a vow on someone', path: '/cast' },
    { icon: LayoutGrid, label: 'My Vows', description: 'All your active vows', path: '/dashboard' },
    { icon: Clock, label: 'History', description: 'Past vows and outcomes', path: '/history' },
    { icon: Settings, label: 'Settings', description: 'Account and preferences', path: '/settings' },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-200"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className="fixed top-0 left-0 bottom-0 z-50 w-[280px] flex flex-col transition-transform duration-200 safe-top safe-bottom"
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

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, displayName } = useAuth();
  const [myVows, setMyVows] = useState<VowRow[]>([]);
  const [witnessingVows, setWitnessingVows] = useState<VowRow[]>([]);
  const [challenges, setChallenges] = useState<VowRow[]>([]);
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
      // Accepted challenges where I'm the vow keeper (target)
      supabase
        .from('vows')
        .select('*')
        .eq('target_user_id', session.user.id)
        .eq('challenge_status', 'accepted')
        .in('status', ['active', 'awaiting_verdict', 'kept', 'broken'])
        .order('created_at', { ascending: false }),
    ]);

    // Merge accepted challenges into myVows so they appear in active/stats
    const myVowsData = myRes.data ?? [];
    const acceptedChallenges = acceptedChallengeRes.data ?? [];
    const newAcceptedIds = new Set(acceptedChallenges.map(v => v.id));
    setAcceptedChallengeIds(newAcceptedIds);
    // Avoid duplicates (in case user is both maker and target somehow)
    const merged = [...myVowsData, ...acceptedChallenges.filter(v => !myVowsData.some(m => m.id === v.id))];

    setMyVows(merged);
    setWitnessingVows(witnessRes.data ?? []);
    setChallenges(challengeRes.data ?? []);
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
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isAuthenticated, authLoading, router, fetchData]);

  // Section derivations
  const needsAttention = [
    ...myVows.filter(v => v.status === 'awaiting_verdict'),
    ...witnessingVows.filter(v => v.status === 'awaiting_verdict'),
    ...challenges,
  ];
  const active = myVows
    .filter(v => ['active', 'sealed'].includes(v.status) ||
      // Include pending challenge dares (draft, waiting for target to accept)
      (v.vow_type === 'challenge' && v.challenge_status === 'pending' && v.status === 'draft'))
    .sort((a, b) => (a.ends_at ?? '').localeCompare(b.ends_at ?? ''));
  const witnessing = witnessingVows.filter(v => v.status === 'active');
  const recent = myVows.filter(v => ['kept', 'broken', 'voided'].includes(v.status)).slice(0, 5);

  // Stats
  const activeCount = myVows.filter(v => ['active', 'sealed', 'awaiting_verdict'].includes(v.status)).length;
  const keptCount = myVows.filter(v => v.status === 'kept').length;
  const streak = (() => {
    const completed = myVows.filter(v => ['kept', 'broken'].includes(v.status));
    let count = 0;
    for (const v of completed) {
      if (v.status === 'kept') count++;
      else break;
    }
    return count;
  })();

  const handleAcceptChallenge = async (vowId: string) => {
    const vow = challenges.find(v => v.id === vowId);
    if (!vow?.challenge_invite_token) return;
    // Redirect to the full challenge accept page with stake selection UX
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

  const getRoleForVow = (vow: VowRow, section: 'mine' | 'witnessing' | 'challenge'): 'maker' | 'witness' | 'target' => {
    if (section === 'witnessing') return 'witness';
    if (section === 'challenge') return 'target';
    // Accepted challenges where I'm the target show as 'target' not 'maker'
    if (vow.vow_type === 'challenge' && acceptedChallengeIds.has(vow.id)) return 'target';
    return 'maker';
  };

  // Route accepted challenges (where I'm the target) to /c/[token] for the full
  // active dare experience (text-darer button, countdown, etc.)
  const getVowDetailPath = (vow: VowRow): string => {
    if (vow.vow_type === 'challenge' && acceptedChallengeIds.has(vow.id) && vow.challenge_invite_token) {
      return `/c/${vow.challenge_invite_token}`;
    }
    return `/vow/${vow.id}`;
  };

  if (loading || authLoading) {
    return (
      <RitualScreen>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
        </div>
      </RitualScreen>
    );
  }

  const isEmpty = myVows.length === 0 && witnessingVows.length === 0 && challenges.length === 0;

  if (isEmpty) {
    return (
      <RitualScreen
        footer={<PrimaryButton label="+ Make a Vow" onPress={() => router.push('/create')} />}
      >
        <FadeUp>
          <div className="flex items-center justify-between">
            <HeaderBadge />
            <button
              onClick={() => router.push('/settings')}
              aria-label="Settings"
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <Settings className="w-[18px] h-[18px]" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </FadeUp>
        <FadeUp delay={0.1}>
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5">
            <p className="text-[20px] font-serif font-bold text-center" style={{ color: 'var(--text)' }}>
              No vows yet.
            </p>
            <p className="text-[15px] text-center" style={{ color: 'var(--text-secondary)' }}>
              Make your first commitment.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {['No phone in bed', 'Exercise 3x/week', 'Read 20 pages/day'].map(ex => (
                <div
                  key={ex}
                  className="px-3.5 py-2.5 rounded-full"
                  style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{ex}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>
      </RitualScreen>
    );
  }

  return (
    <>
    <SlideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    <RitualScreen
      footer={
        <button
          onClick={() => router.push('/create')}
          className="w-full rounded-[18px] min-h-[56px] flex items-center justify-center gap-2 transition-transform active:scale-[0.975]"
          style={{
            background: 'linear-gradient(135deg, var(--gold-bright), var(--gold), var(--gold-deep))',
            boxShadow: '0 12px 24px rgba(212,162,79,0.28)',
          }}
        >
          <Plus className="w-5 h-5" color="#0B0D11" />
          <span className="text-[15px] font-extrabold" style={{ color: '#0B0D11' }}>Make a Vow</span>
        </button>
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
            {displayName && (
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {displayName}
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

      {/* Resume in-progress vow banner */}
      <InProgressBanner />

      {/* Stats */}
      <FadeUp delay={0.05}>
        <div className="flex gap-3">
          <StatPill value={String(activeCount)} label="Active" />
          <StatPill value={String(keptCount)} label="Kept" tone="success" />
          <StatPill value={streak > 0 ? `${streak}` : '—'} label="Streak" />
        </div>
      </FadeUp>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <FadeUp delay={0.1}>
          <div className="flex flex-col gap-3">
            <SectionLabel>Needs Attention</SectionLabel>
            {needsAttention.map(v => {
              const isChallenge = challenges.some(c => c.id === v.id);
              const isWitnessing = witnessingVows.some(w => w.id === v.id);
              const role = isChallenge ? 'target' : isWitnessing ? 'witness' : 'maker';
              return (
                <VowCard
                  key={v.id}
                  vow={v}
                  role={role}
                  onTap={() => router.push(getVowDetailPath(v))}
                  onAcceptChallenge={() => handleAcceptChallenge(v.id)}
                  onDeclineChallenge={() => handleDeclineChallenge(v.id)}
                />
              );
            })}
          </div>
        </FadeUp>
      )}

      {/* Active */}
      {active.length > 0 && (
        <FadeUp delay={0.15}>
          <div className="flex flex-col gap-3">
            <SectionLabel>Active</SectionLabel>
            {active.map(v => (
              <VowCard
                key={v.id}
                vow={v}
                role={getRoleForVow(v, 'mine')}
                onTap={() => router.push(getVowDetailPath(v))}
              />
            ))}
          </div>
        </FadeUp>
      )}

      {/* Witnessing */}
      {witnessing.length > 0 && (
        <FadeUp delay={0.2}>
          <div className="flex flex-col gap-3">
            <SectionLabel>Witnessing</SectionLabel>
            {witnessing.map(v => (
              <VowCard
                key={v.id}
                vow={v}
                role="witness"
                onTap={() => router.push(`/vow/${v.id}`)}
              />
            ))}
          </div>
        </FadeUp>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <FadeUp delay={0.25}>
          <div className="flex flex-col gap-3">
            <SectionLabel>Recent</SectionLabel>
            {recent.map(v => (
              <VowCard
                key={v.id}
                vow={v}
                role={getRoleForVow(v, 'mine')}
                onTap={() => router.push(getVowDetailPath(v))}
              />
            ))}
          </div>
        </FadeUp>
      )}
    </RitualScreen>
    </>
  );
}
