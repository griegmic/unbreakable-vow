'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, ArrowLeft, Menu, X, Zap, Clock, LayoutGrid, Send } from 'lucide-react';
import { FrauncesH1, WaxSeal, GoldCTA, EyebrowTag, WitnessChip, NeedsNowCard } from '@/components/primitives';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import type { DashboardVow } from '@/lib/dashboard-sort';

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
    { icon: Zap, label: 'New Vow', description: 'Create a vow in seconds', path: '/quick-vow' },
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
          backgroundColor: 'var(--uv-bg-elevated)',
          borderRight: '1px solid var(--uv-border)',
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
              style={{ backgroundColor: item.path === '/quick-vow' ? 'rgba(212,162,79,0.08)' : 'transparent' }}
            >
              <div
                className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: item.path === '/quick-vow' ? 'rgba(212,162,79,0.15)' : 'var(--uv-bg-card)' }}
              >
                <item.icon className="w-[18px] h-[18px]" style={{ color: item.path === '/quick-vow' ? 'var(--uv-gold-bright)' : 'var(--uv-text-faint)' }} />
              </div>
              <div>
                <span
                  className="block"
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: item.path === '/quick-vow' ? 'var(--uv-gold-bright)' : 'var(--uv-text)',
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
    let frame: number | null = null;
    try {
      const flow = localStorage.getItem('unbreakable-vow-flow');
      if (flow) {
        const parsed = JSON.parse(flow);
        if (parsed.rawInput && !parsed.vowId) {
          frame = window.requestAnimationFrame(() => {
            setFlowTarget(parsed.refinedText ? '/seal' : '/refine');
          });
        }
      }
    } catch {}
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
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
        <span style={{ fontSize: 15, fontWeight: 500, display: 'block', color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)' }}>
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
  // Extract first name — skip if display_name looks like a phone number or is missing
  const rawFirst = displayName?.split(' ')[0] || '';
  const isPhoneNumber = /^\+?\d[\d\s()-]{6,}$/.test(rawFirst);
  const firstName = isPhoneNumber ? '' : rawFirst;

  /*
   * S20 Dashboard — V6 layout (§3.4)
   *
   * Dashboard vow cards are screen-local compositions (not VowDocCard) because
   * they have dashboard-specific features: 2px gold left border (ownership),
   * time-right-aligned, witness chip, tap-to-/vow/[id], 3 visual variants
   * (active, awaiting-witness, awaiting-verdict). See clarification A in plan.
   */

  // Separate witnessing vows into urgent (Needs You Now) and regular
  const urgentWitnessing = witnessingVows.filter(v =>
    v.status === 'awaiting_verdict' && v.ends_at &&
    (Date.now() - new Date(v.ends_at).getTime()) < 24 * 3600000
  );
  const regularWitnessing = witnessingVows.filter(v =>
    !urgentWitnessing.some(u => u.id === v.id)
  ).slice(0, 3); // Cap at 3 per §3.4

  // Active vows for "Your Vows" section
  const activeVows = myVows.filter(v =>
    ['active', 'sealed', 'awaiting_verdict'].includes(v.status)
  );

  // --- Loading state ---
  if (loading || authLoading) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--uv-bg)', padding: '24px 22px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 80, borderRadius: 18, background: 'var(--uv-bg-card)', marginBottom: 12, animation: 'shimmer 1.5s ease-in-out infinite', backgroundImage: 'linear-gradient(90deg, var(--uv-bg-card) 25%, var(--uv-bg-elevated) 50%, var(--uv-bg-card) 75%)', backgroundSize: '200% 100%' }} />
          ))}
        </div>
      </div>
    );
  }

  // --- Empty state (S20-EMPTY per §3.4) ---
  const isEmpty = myVows.length === 0 && witnessingVows.length === 0 && challenges.length === 0;

  if (isEmpty) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--uv-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 22px' }}>
        <SlideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        {/* Header */}
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Menu className="w-5 h-5" style={{ color: 'var(--uv-text-muted)' }} />
          </button>
          <span style={{ fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--uv-text)' }}>Unbreakable Vow</span>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--uv-gold-bright), var(--uv-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--uv-font-serif)', fontSize: 13, color: 'var(--uv-text-on-gold)' }}>
            {firstName ? firstName.charAt(0) : '⟡'}
          </div>
        </div>
        {/* Empty content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', maxWidth: 300 }}>
          <div style={{ opacity: 0.6 }}>
            <WaxSeal size="sm" showHalo={false} />
          </div>
          <FrauncesH1 italic size="page">No vows on the line.</FrauncesH1>
          <p style={{ fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--uv-text-muted)', margin: 0 }}>
            Sealed commitments will show up here.
          </p>
          <div style={{ width: '100%', marginTop: 16 }}>
            <GoldCTA label="Make your first vow →" onPress={() => router.push('/')} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SlideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="dashboard-screen-with-cta" style={{ minHeight: '100dvh', background: 'var(--uv-bg)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 22px 0' }}>

        {/* V6 Header per §3.4: hamburger + wordmark + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Menu className="w-5 h-5" style={{ color: 'var(--uv-text-muted)' }} />
          </button>
          <span style={{ fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--uv-text)' }}>Unbreakable Vow</span>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--uv-gold-bright), var(--uv-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--uv-font-serif)', fontSize: 13, color: 'var(--uv-text-on-gold)' }}>
            {firstName ? firstName.charAt(0) : '⟡'}
          </div>
        </div>

        {/* Greeting per §3.4 */}
        <div style={{ marginBottom: 24 }}>
          <FrauncesH1 italic size="page">{firstName ? `Hey, ${firstName}.` : 'Your vows.'}</FrauncesH1>
        </div>

        <InProgressBanner />

        {/* Section 1: YOUR VOWS */}
        {activeVows.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--uv-gold-line)' }}>
              <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 12.5, fontWeight: 600, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--uv-gold-bright)' }}>
                Your vows
              </span>
              <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 12.5, color: 'var(--uv-text-muted)' }}>· {activeVows.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeVows.map(vow => {
                const stakeDollars = Math.round(vow.stake_amount / 100);
                const isAwaitingWitness = vow.status === 'sealed' && !vow.witness_accepted_at;
                const isAwaitingVerdict = vow.status === 'awaiting_verdict';
                const daysLeft = vow.ends_at ? Math.ceil((new Date(vow.ends_at).getTime() - Date.now()) / 86400000) : null;
                const totalDays = (vow.starts_at && vow.ends_at)
                  ? Math.ceil((new Date(vow.ends_at).getTime() - new Date(vow.starts_at).getTime()) / 86400000)
                  : null;
                const dayNumber = (totalDays !== null && daysLeft !== null) ? Math.max(1, totalDays - daysLeft + 1) : null;
                const witnessFirst = vow.witness_name?.split(' ')[0] || 'Witness';

                // Time display for awaiting-witness: "Sealed X hrs ago"
                const sealedHoursAgo = vow.sealed_at
                  ? Math.max(1, Math.round((Date.now() - new Date(vow.sealed_at).getTime()) / 3600000))
                  : null;

                // Time display for awaiting-verdict: "Maya replies in X hrs"
                const verdictHoursLeft = vow.ends_at
                  ? Math.max(0, Math.round((new Date(vow.ends_at).getTime() - Date.now()) / 3600000))
                  : null;

                // Pill content per mock
                const pillContent = isAwaitingWitness
                  ? `Awaiting ${witnessFirst}`
                  : isAwaitingVerdict
                    ? 'Awaiting verdict'
                    : (dayNumber !== null && totalDays !== null)
                      ? `Active \u00B7 Day ${dayNumber} of ${totalDays}`
                      : 'Active';

                return (
                  <button
                    key={vow.id}
                    onClick={() => router.push(`/vow/${vow.id}`)}
                    style={{
                      width: '100%',
                      padding: '14px 16px 12px',
                      borderRadius: 14,
                      borderLeft: `2px solid ${isAwaitingWitness ? 'var(--uv-gold-deep)' : 'var(--uv-gold)'}`,
                      border: '1px solid var(--uv-border)',
                      borderLeftWidth: 2,
                      borderLeftColor: isAwaitingWitness ? 'var(--uv-gold-deep)' : 'var(--uv-gold)',
                      background: isAwaitingWitness
                        ? 'linear-gradient(180deg, var(--uv-bg-card), rgba(24,21,18,0.7))'
                        : 'var(--uv-bg-card)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                    }}
                  >
                    {/* Top row: pill + time */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <EyebrowTag tone={isAwaitingWitness || isAwaitingVerdict ? 'amber' : 'gold'}>
                        {pillContent}
                      </EyebrowTag>
                      <span style={{ fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 10.5, color: 'var(--uv-text-muted)', fontFeatureSettings: '"tnum"' }}>
                        {isAwaitingWitness
                          ? <>Sealed <b style={{ color: 'var(--uv-text)', fontStyle: 'normal', fontWeight: 500 }}>{sealedHoursAgo ?? '?'} hrs</b> ago</>
                          : isAwaitingVerdict
                            ? <>{witnessFirst} replies in <b style={{ color: 'var(--uv-text)', fontStyle: 'normal', fontWeight: 500 }}>{verdictHoursLeft ?? '?'} hrs</b></>
                            : daysLeft !== null
                              ? (daysLeft <= 0 ? <b style={{ color: 'var(--uv-text)', fontStyle: 'normal', fontWeight: 500 }}>Time&apos;s up</b> : <><b style={{ color: 'var(--uv-text)', fontStyle: 'normal', fontWeight: 500 }}>{daysLeft} days</b> left</>)
                              : ''
                        }
                      </span>
                    </div>
                    {/* Vow text */}
                    <p style={{
                      fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 17,
                      lineHeight: 1.28, color: isAwaitingWitness ? 'var(--uv-text-muted)' : 'var(--uv-text)',
                      margin: '4px 0 12px',
                    }}>
                      {vow.refined_text}
                    </p>
                    {/* Meta row — structured 2-col + witness chip per mock */}
                    <div style={{
                      display: 'flex', gap: 14, paddingTop: 8,
                      borderTop: '1px dashed var(--uv-border)',
                      alignItems: 'center',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span style={{ fontSize: 8.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--uv-text-muted)', fontWeight: 500, fontFamily: 'var(--uv-font-sans)' }}>
                          On hold
                        </span>
                        <span style={{ fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 13, color: stakeDollars > 0 ? 'var(--uv-gold-bright)' : 'var(--uv-text-muted)', fontFeatureSettings: '"tnum"' }}>
                          {stakeDollars > 0 ? `$${stakeDollars}` : '$0'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span style={{ fontSize: 8.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--uv-text-muted)', fontWeight: 500, fontFamily: 'var(--uv-font-sans)' }}>
                          {isAwaitingWitness ? 'Starts when' : isAwaitingVerdict ? 'If broken' : 'Until'}
                        </span>
                        <span style={{ fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 13, color: isAwaitingWitness ? 'var(--uv-warn)' : 'var(--uv-text)', fontFeatureSettings: '"tnum"' }}>
                          {isAwaitingWitness
                            ? `${witnessFirst} accepts`
                            : isAwaitingVerdict
                              ? `\u2192 ${vow.destination}`
                              : vow.ends_at ? `${new Date(vow.ends_at).toLocaleDateString('en-US', { weekday: 'short' })} \u00B7 9pm` : '\u2014'
                          }
                        </span>
                      </div>
                      <span style={{ marginLeft: 'auto' }}>
                        <WitnessChip
                          status={vow.witness_accepted_at ? 'accepted' : 'pending'}
                          name={witnessFirst}
                        />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 2: NEEDS YOU NOW */}
        {(urgentWitnessing.length > 0 || challenges.length > 0) && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '22px 6px 10px' }}>
              <div className="animate-pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--uv-warn)', boxShadow: '0 0 0 3px rgba(241,169,60,0.20)' }} />
              <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 12.5, fontWeight: 600, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--uv-warn)' }}>
                Needs you now
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {urgentWitnessing.map(vow => {
                const hoursAgo = Math.round((Date.now() - new Date(vow.ends_at!).getTime()) / 3600000);
                return (
                  <NeedsNowCard
                    key={vow.id}
                    kind="witness"
                    makerName={vow.maker_display_name || 'Someone'}
                    vowText={vow.refined_text}
                    stake={Math.round(vow.stake_amount / 100)}
                    hoursLeft={Math.max(0, 24 - hoursAgo)}
                    onPress={() => router.push(`/w/${vow.witness_invite_token}/verdict`)}
                  />
                );
              })}
              {/* Pending dares — separate card per mock with Accept/Decline buttons */}
              {challenges.map(vow => {
                const challengerName = vow.maker_display_name || 'Someone';
                const stakeDollars = Math.round(vow.stake_amount / 100);
                return (
                  <div
                    key={vow.id}
                    style={{
                      background: 'var(--uv-bg-elevated)',
                      border: '1px solid var(--uv-gold-line)',
                      borderRadius: 12,
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ fontSize: 9.5, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--uv-gold-bright)', fontWeight: 500, marginBottom: 6, fontFamily: 'var(--uv-font-sans)' }}>
                      &mdash; Pending dare &mdash;
                    </div>
                    <p style={{ fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 14.5, color: 'var(--uv-text)', marginBottom: 10, margin: '0 0 10px' }}>
                      <b style={{ fontStyle: 'normal', fontWeight: 500, color: 'var(--uv-gold-bright)' }}>{challengerName}</b> dared you: <em>&ldquo;{vow.refined_text}{stakeDollars > 0 ? `, $${stakeDollars} to ${vow.destination}` : ''}.&rdquo;</em>
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleAcceptChallenge(vow.id)}
                        disabled={actionBusy === vow.id}
                        style={{
                          flex: 1, height: 36, borderRadius: 10,
                          background: 'linear-gradient(180deg, var(--uv-gold-bright), var(--uv-gold))',
                          color: 'var(--uv-text-on-gold)',
                          fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 13,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: 'none', cursor: 'pointer',
                          opacity: actionBusy === vow.id ? 0.6 : 1,
                        }}
                      >
                        Accept →
                      </button>
                      <button
                        onClick={() => handleDeclineChallenge(vow.id)}
                        disabled={actionBusy === vow.id}
                        style={{
                          flex: 1, height: 36, borderRadius: 10,
                          background: 'transparent',
                          border: '1px solid var(--uv-border)',
                          color: 'var(--uv-text-muted)',
                          fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 13,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          opacity: actionBusy === vow.id ? 0.6 : 1,
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 3: YOU'RE WITNESSING */}
        {regularWitnessing.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--uv-gold-line)' }}>
              <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 12.5, fontWeight: 600, letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--uv-gold-bright)' }}>
                You&apos;re witnessing
              </span>
              <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 12.5, color: 'var(--uv-text-muted)' }}>· {witnessingVows.length - urgentWitnessing.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {regularWitnessing.map(vow => {
                const makerName = vow.maker_display_name || 'Someone';
                const isUrgent = vow.status === 'awaiting_verdict';
                const wDaysLeft = vow.ends_at ? Math.ceil((new Date(vow.ends_at).getTime() - Date.now()) / 86400000) : null;
                return (
                  <button
                    key={vow.id}
                    onClick={() => isUrgent ? router.push(`/w/${vow.witness_invite_token}/verdict`) : router.push(`/vow/${vow.id}?as=witness`)}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 12,
                      background: 'var(--uv-bg-card)', border: '1px solid var(--uv-border)',
                      cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    {/* Avatar */}
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--uv-bg-elevated)', border: '1px solid var(--uv-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--uv-font-serif)', fontSize: 13, fontWeight: 500, color: 'var(--uv-text-muted)', flexShrink: 0 }}>
                      {makerName.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
                        <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--uv-text)' }}>{makerName}</span>
                        <span style={{ fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontSize: 11, color: isUrgent ? 'var(--uv-warn)' : 'var(--uv-text-muted)', fontFeatureSettings: '"tnum"', ...(isUrgent ? { fontStyle: 'normal', fontWeight: 500 } : {}) }}>
                          {wDaysLeft !== null ? (wDaysLeft <= 0 ? "Time's up" : `${wDaysLeft} days left`) : ''}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'var(--uv-font-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 14, color: 'var(--uv-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                        {vow.refined_text}
                      </div>
                    </div>
                    {vow.stake_amount > 0 && (
                      <span style={{ fontFamily: 'var(--uv-font-serif)', fontWeight: 500, fontSize: 12, color: 'var(--uv-gold-bright)', flexShrink: 0, fontFeatureSettings: '"tnum"' }}>${Math.round(vow.stake_amount / 100)}</span>
                    )}
                  </button>
                );
              })}
              {/* "All N you're witnessing →" overflow card */}
              {witnessingVows.length - urgentWitnessing.length > 3 && (
                <button
                  onClick={() => router.push('/witnessing')}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12,
                    background: 'var(--uv-gold-bg)', border: '1px solid var(--uv-gold-line)',
                    cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--uv-gold-bright)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span>All {witnessingVows.length - urgentWitnessing.length} you&apos;re witnessing</span>
                  <span>→</span>
                </button>
              )}
            </div>
          </div>
        )}

        </div>{/* end maxWidth container */}

        {/* Sticky footer CTA */}
        <div className="dashboard-floating-cta">
          <div className="dashboard-floating-cta-inner">
            <GoldCTA label="Make a vow →" onPress={() => router.push('/')} />
          </div>
        </div>
      </div>{/* end screen */}
    </>
  );
}
