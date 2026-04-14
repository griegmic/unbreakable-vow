// Dashboard sort algorithm — pure TypeScript, no React
// Ported from web/src/lib/dashboard-sort.ts with Expo-native types

export interface DashboardVow {
  id: string;
  user_id: string;
  refined_text: string;
  raw_input: string;
  status: string;
  vow_type: string;
  witness_name: string;
  witness_phone?: string | null;
  witness_user_id: string | null;
  witness_accepted_at: string | null;
  witness_declined: boolean;
  witness_invite_token?: string | null;
  target_user_id?: string | null;
  target_phone?: string | null;
  stake_amount: number;
  destination?: string;
  starts_at: string | null;
  ends_at: string | null;
  challenge_status: string | null;
  challenge_invite_token: string | null;
  created_at: string;
  verdict: string | null;
  verdict_at: string | null;
  // Resolved display names (added by dashboard fetch)
  maker_display_name?: string | null;
  target_display_name?: string | null;
}

export type DashboardRole = 'maker' | 'witness' | 'target';

export type CardState =
  | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9' | 'M10' | 'M11'
  | 'W1' | 'W2'
  | 'T1' | 'T2' | 'T3';

export type UrgencyTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface SortedVow {
  vow: DashboardVow;
  role: DashboardRole;
  state: CardState;
  tier: UrgencyTier;
}

// --- Classification ---

export function classifyCardState(vow: DashboardVow, role: DashboardRole): CardState {
  if (role === 'witness') {
    return vow.status === 'awaiting_verdict' ? 'W1' : 'W2';
  }
  if (role === 'target') {
    if (vow.challenge_status === 'pending') return 'T1';
    if (vow.status === 'awaiting_verdict') return 'T3';
    return 'T2';
  }
  // Maker
  if (vow.vow_type === 'challenge') {
    if (vow.challenge_status === 'pending') return 'M9';
    if (vow.status === 'awaiting_verdict') return 'M11';
    return 'M10';
  }
  if (vow.status === 'draft') return 'M8';
  if (vow.status === 'awaiting_verdict') {
    if (vow.witness_name === 'Just me') return 'M1';
    if (!vow.witness_accepted_at) return 'M3';
    return 'M2';
  }
  if (vow.status === 'active' || vow.status === 'sealed') {
    if (vow.witness_name === 'Just me') return 'M5';
    if (vow.witness_accepted_at) return 'M4';
    return 'M6';
  }
  return 'M7';
}

// --- Tier Assignment ---

export function getTier(state: CardState): UrgencyTier {
  switch (state) {
    case 'M1': case 'M3': case 'M11': case 'W1': case 'T1': return 1;
    case 'M2': case 'T3': return 2;
    case 'M4': case 'M5': case 'M6': case 'M7': case 'M10': case 'T2': return 3;
    case 'W2': return 4;
    case 'M9': return 5;
    case 'M8': return 6;
  }
}

// --- Sorting ---

function compareEndsAtAsc(a: DashboardVow, b: DashboardVow): number {
  if (!a.ends_at && !b.ends_at) return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  if (!a.ends_at) return 1;
  if (!b.ends_at) return -1;
  return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
}

function compareCreatedAtDesc(a: DashboardVow, b: DashboardVow): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export function sortDashboardVows(vows: SortedVow[]): SortedVow[] {
  return [...vows].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    switch (a.tier) {
      case 1: case 2: return compareEndsAtAsc(a.vow, b.vow);
      case 3: case 4: return compareEndsAtAsc(a.vow, b.vow);
      case 5: case 6: return compareCreatedAtDesc(a.vow, b.vow);
      default: return 0;
    }
  });
}

// --- Top-level builder ---

export function buildDashboardList(
  myVows: DashboardVow[],
  witnessingVows: DashboardVow[],
  challenges: DashboardVow[],
  acceptedChallengeIds: Set<string>,
): SortedVow[] {
  const items: SortedVow[] = [];

  for (const vow of myVows) {
    if (['kept', 'broken', 'voided'].includes(vow.status)) continue;
    const role: DashboardRole = (vow.vow_type === 'challenge' && acceptedChallengeIds.has(vow.id))
      ? 'target' : 'maker';
    const state = classifyCardState(vow, role);
    items.push({ vow, role, state, tier: getTier(state) });
  }
  for (const vow of witnessingVows) {
    const state = classifyCardState(vow, 'witness');
    items.push({ vow, role: 'witness', state, tier: getTier(state) });
  }
  for (const vow of challenges) {
    const state = classifyCardState(vow, 'target');
    items.push({ vow, role: 'target', state, tier: getTier(state) });
  }

  return sortDashboardVows(items);
}

// --- Stats ---

export function computeStats(allVows: DashboardVow[]): { keptCount: number; streak: number } {
  const keptCount = allVows.filter(v => v.status === 'kept').length;
  const terminal = allVows
    .filter(v => ['kept', 'broken', 'voided'].includes(v.status))
    .sort((a, b) => {
      const aDate = a.verdict_at || a.created_at;
      const bDate = b.verdict_at || b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  let streak = 0;
  for (const v of terminal) {
    if (v.status === 'voided') continue;
    if (v.status === 'kept') streak++;
    else break;
  }
  return { keptCount, streak };
}

// --- Helpers ---

export function getCountdownText(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  if (isNaN(end)) return null;
  const diff = end - Date.now();
  if (diff <= 0) return "Time's up";
  const days = Math.ceil(diff / 86400000);
  if (days === 1) return '1d left';
  if (days <= 7) {
    const hours = Math.floor(diff / 3600000);
    return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
  }
  return `${days}d left`;
}

export function getProgress(startsAt: string | null, endsAt: string | null): number | null {
  if (!startsAt || !endsAt) return null;
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return null;
  return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
}

export function getProgressColor(pct: number): string {
  if (pct >= 1) return '#EF4444';
  if (pct >= 0.8) return '#FB923C';
  return '#d4a24f';
}

export function getStakeLabel(amount: number): string {
  return amount > 0 ? `$${Math.round(amount / 100)}` : 'no stake';
}

export function getDayProgress(startsAt: string | null, endsAt: string | null): string | null {
  if (!startsAt || !endsAt) return null;
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const totalDays = Math.max(1, Math.round((end - start) / 86400000));
  const elapsedDays = Math.max(1, Math.min(totalDays, Math.ceil((Date.now() - start) / 86400000)));
  return `Day ${elapsedDays} of ${totalDays}`;
}

export function getTapTarget(item: SortedVow): { pathname: string; params?: Record<string, string> } {
  const { vow, state } = item;
  switch (state) {
    case 'M1': return { pathname: '/self-resolve', params: { vowId: vow.id } };
    case 'M4': return { pathname: '/live', params: { vowId: vow.id } };
    case 'M5': return { pathname: '/live', params: { vowId: vow.id } };
    case 'M6': return { pathname: '/live', params: { vowId: vow.id } };
    case 'M8': return { pathname: '/seal', params: { vowId: vow.id } };
    case 'W1': return { pathname: '/witness-verdict', params: { vowId: vow.id } };
    case 'T1': return { pathname: '/vow-detail', params: { vowId: vow.id } };
    default: return { pathname: '/vow-detail', params: { vowId: vow.id } };
  }
}
