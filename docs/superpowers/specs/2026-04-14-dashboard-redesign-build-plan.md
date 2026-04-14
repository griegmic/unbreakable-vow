# Dashboard Redesign — Build Plan

**Date:** 2026-04-14
**Companion to:** `2026-04-14-dashboard-redesign-prd.md`, `2026-04-14-dashboard-redesign-qa-matrix.md`
**Build order is strict** — each phase depends on the one before it. Do not skip ahead.

---

## Phase 1: Database Migration

### File: `supabase/migrations/20260414000001_get_display_name.sql`

**Create new file.**

```sql
-- SECURITY DEFINER function to resolve display_name for any user.
-- Used by witnessing vow queries so the dashboard can show "By {maker_name}"
-- instead of "By someone". Read-only, non-sensitive field.
CREATE OR REPLACE FUNCTION public.get_display_name(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT display_name FROM public.users WHERE id = user_uuid;
$$;

-- Grant execute to authenticated users (needed for client-side .rpc() calls)
GRANT EXECUTE ON FUNCTION public.get_display_name(uuid) TO authenticated;
```

**Verification:** After applying, run `supabase db reset` or push migration. Then test:
```sql
SELECT get_display_name('some-known-user-uuid');
-- Should return their display_name
```

---

## Phase 2: Sort Algorithm — `web/src/lib/dashboard-sort.ts`

**Create new file.** Pure functions, no React, no imports except types. Easily testable.

### Types to define

```ts
import type { Database } from '@/lib/types';

type VowRow = Database['public']['Tables']['vows']['Row'];

// Extended VowRow with optional maker_display_name (for witnessing vows)
export type DashboardVow = VowRow & {
  maker_display_name?: string | null;
};

export type DashboardRole = 'maker' | 'witness' | 'target';

// The card state identifiers from PRD Section 1
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
```

### Function: `classifyCardState(vow, role) → CardState`

Determines which of the 16 card states applies. Logic tree:

```ts
export function classifyCardState(vow: DashboardVow, role: DashboardRole): CardState {
  // --- WITNESS ROLE ---
  if (role === 'witness') {
    if (vow.status === 'awaiting_verdict') return 'W1';
    return 'W2'; // active or sealed
  }

  // --- TARGET ROLE ---
  if (role === 'target') {
    if (vow.challenge_status === 'pending') return 'T1';
    if (vow.status === 'awaiting_verdict') return 'T3';
    return 'T2'; // active (accepted challenge)
  }

  // --- MAKER ROLE ---
  // Challenge vows (maker = witness of challenge)
  if (vow.vow_type === 'challenge') {
    if (vow.challenge_status === 'pending') return 'M9';  // dare sent
    if (vow.status === 'awaiting_verdict') return 'M11';  // maker judges target
    return 'M10'; // challenge active
  }

  // Self vows
  if (vow.status === 'draft') return 'M8';

  if (vow.status === 'awaiting_verdict') {
    // M1: self-vow, witness = "Just me"
    if (vow.witness_name === 'Just me') return 'M1';
    // M3: witness never accepted (pending, name != "Just me")
    if (!vow.witness_accepted_at) return 'M3';
    // M2: witness accepted, they're deciding
    return 'M2';
  }

  // Active/sealed
  if (vow.status === 'active' || vow.status === 'sealed') {
    if (vow.witness_name === 'Just me') return 'M5';
    if (vow.witness_accepted_at) return 'M4';
    // witness pending (hasn't accepted yet)
    return 'M6';
  }

  // M7: sealed (fallthrough — sealed is handled above with active)
  return 'M7';
}
```

### Function: `getTier(state) → UrgencyTier`

```ts
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
```

### Function: `sortDashboardVows(vows: SortedVow[]) → SortedVow[]`

Sorts by tier, then by tier-specific tiebreaker per PRD Section 3.2:

```ts
export function sortDashboardVows(vows: SortedVow[]): SortedVow[] {
  return [...vows].sort((a, b) => {
    // Primary: tier ascending
    if (a.tier !== b.tier) return a.tier - b.tier;

    // Tiebreaker per tier
    switch (a.tier) {
      case 1: // Oldest ends_at first (longest overdue)
      case 2:
        return compareEndsAtAsc(a.vow, b.vow);
      case 3: // Soonest ends_at first (closest deadline)
      case 4:
        return compareEndsAtSoonest(a.vow, b.vow);
      case 5: // Newest created_at first
      case 6:
        return compareCreatedAtDesc(a.vow, b.vow);
      default:
        return 0;
    }
  });
}
```

Helper comparators:

```ts
// Oldest ends_at first. No ends_at pushed to bottom.
function compareEndsAtAsc(a: DashboardVow, b: DashboardVow): number {
  if (!a.ends_at && !b.ends_at) return compareCreatedAtAsc(a, b);
  if (!a.ends_at) return 1;  // no deadline = bottom
  if (!b.ends_at) return -1;
  return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
}

// Soonest ends_at first (nearest deadline = most urgent). No ends_at = bottom.
function compareEndsAtSoonest(a: DashboardVow, b: DashboardVow): number {
  if (!a.ends_at && !b.ends_at) return compareCreatedAtAsc(a, b);
  if (!a.ends_at) return 1;
  if (!b.ends_at) return -1;
  return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
}

function compareCreatedAtDesc(a: DashboardVow, b: DashboardVow): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function compareCreatedAtAsc(a: DashboardVow, b: DashboardVow): number {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}
```

### Function: `buildDashboardList(myVows, witnessingVows, challenges, acceptedChallengeIds) → SortedVow[]`

The top-level function called by the dashboard page. Filters out terminal vows, assigns roles, classifies, and sorts:

```ts
export function buildDashboardList(
  myVows: DashboardVow[],
  witnessingVows: DashboardVow[],
  challenges: DashboardVow[],
  acceptedChallengeIds: Set<string>,
): SortedVow[] {
  const items: SortedVow[] = [];

  // My non-terminal vows
  for (const vow of myVows) {
    if (['kept', 'broken', 'voided'].includes(vow.status)) continue;
    const role: DashboardRole = (vow.vow_type === 'challenge' && acceptedChallengeIds.has(vow.id))
      ? 'target'
      : 'maker';
    const state = classifyCardState(vow, role);
    items.push({ vow, role, state, tier: getTier(state) });
  }

  // Witnessing vows (already filtered to active + awaiting_verdict)
  for (const vow of witnessingVows) {
    const state = classifyCardState(vow, 'witness');
    items.push({ vow, role: 'witness', state, tier: getTier(state) });
  }

  // Pending challenges I received
  for (const vow of challenges) {
    const state = classifyCardState(vow, 'target');
    items.push({ vow, role: 'target', state, tier: getTier(state) });
  }

  return sortDashboardVows(items);
}
```

### Function: `computeStats(myVows) → { keptCount, streak }`

```ts
export function computeStats(myVows: DashboardVow[]): { keptCount: number; streak: number } {
  const keptCount = myVows.filter(v => v.status === 'kept').length;

  // Streak: sort terminal vows by verdict_at (or created_at fallback) descending
  // Count consecutive 'kept', skip 'voided', break on 'broken'
  const terminal = myVows
    .filter(v => ['kept', 'broken', 'voided'].includes(v.status))
    .sort((a, b) => {
      const aDate = a.verdict_at || a.created_at;
      const bDate = b.verdict_at || b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

  let streak = 0;
  for (const v of terminal) {
    if (v.status === 'voided') continue; // skip voided
    if (v.status === 'kept') streak++;
    else break; // broken breaks streak
  }

  return { keptCount, streak };
}
```

---

## Phase 3: Dashboard Card Component — `web/src/components/dashboard-card.tsx`

**Create new file.** This renders a single card in the Smart Stack.

### Props

```ts
import type { SortedVow, CardState } from '@/lib/dashboard-sort';

interface DashboardCardProps {
  item: SortedVow;
  onTap: () => void;
  onAcceptChallenge?: () => void;
  onDeclineChallenge?: () => void;
}
```

### Internal Functions

#### `getCardStyle(state: CardState) → React.CSSProperties`

Returns the visual style per PRD Section 5.3 (7 card styles). Map `CardState` → style class:

| States | Style |
|--------|-------|
| M1, M3, T1, M11 | `c-urgent` |
| W1 | `c-action-blue` |
| M2, T3 | `c-waiting` |
| M4, M5, M6, M7, M10, T2 | `c-active` |
| W2 | `c-witness` |
| M9 | `c-pending` |
| M8 | `c-draft` |

Each returns the exact `backgroundColor`, `border`, `borderLeft` (if applicable), `boxShadow`, and `opacity` from PRD Section 5.3.

#### `getStatusLabel(state: CardState, vow) → { label: string, color: string }`

Maps each state to its exact label text and color per PRD Section 1:
- M1: "Your call", `#FB923C`
- M2: "Awaiting verdict", `#FB923C`
- M3: "Unwitnessed", `#FB923C`
- M4/M5/M6/M7/M10: "Active", `#52d69a`
- M8: "Draft", `#5a5650`
- M9: "Dare sent", `#8a8578`
- M11: "Your call", `#FB923C`
- W1: "You judge", `#60A5FA`
- W2: "Witnessing", `#60A5FA`
- T1: `Dare from {vow.witness_name}` (maker IS witness for challenges), `#FB923C`
- T2: "Your dare", `#52d69a`
- T3: "Time's up", `#FB923C`

#### `getDotConfig(state: CardState) → { color: string, pulse: boolean }`

Per PRD Section 1:
- Orange pulsing: M1, M2, M3, M11, T3 → `{ color: '#FB923C', pulse: true }` (M3 and T1 pulse=false per PRD)
  - Actually per PRD: M1 pulse=yes, M2 pulse=yes, M3 pulse=yes, M11 pulse=yes, T1 pulse=no, T3 pulse=yes
  - W1 pulse=yes (blue)
- Green no-pulse: M4, M5, M6, M7, M10, T2 → `{ color: '#52d69a', pulse: false }`
- Blue pulsing: W1 → `{ color: '#60A5FA', pulse: true }`
- Blue no-pulse: W2 → `{ color: '#60A5FA', pulse: false }`
- Muted: M8 → `{ color: '#5a5650', pulse: false }`, M9 → `{ color: '#8a8578', pulse: false }`
- Orange no-pulse: T1 → `{ color: '#FB923C', pulse: false }`

#### `getTimeText(state: CardState, vow) → string | null`

- States with `ends_at` past: "Time's up" (M1, M2, M3, M11, W1, T3)
- Active states with `ends_at` future: "{X} days left" (reuse countdown logic from vow-card.tsx — but simplified)
- M8, M9, T1: `null` (no time text)

For countdown: replicate `getCountdownText` logic from `vow-card.tsx` but simplified. For dashboard cards, use shorter format:
- > 7 days: `{N}d left`
- 1-7 days: `{N}d {H}h left`
- < 1 day: `{H}h {M}m left`
- Past: "Time's up"

#### `getMetaLine(state: CardState, vow, role) → { text: string, color: string } | null`

Per PRD Section 1:
- M1: `null` (buttons replace meta)
- M2: `{ text: "{witness_name} deciding", color: '#5a5650' }`
- M3: `{ text: "{witness_name} never accepted", color: '#FB923C' }`
- M4: `{ text: "{witness_name} · watching", color: '#5a5650' }`
- M5: `{ text: "Just you · {stake_label}", color: '#5a5650' }`
- M6: `{ text: "{witness_name} · hasn't accepted", color: '#FB923C' }`
- M7: Same as M4/M5/M6 logic
- M8: `{ text: "Tap to seal →", color: '#d4a24f' }`
- M9: `{ text: "Waiting on {target}", color: '#5a5650' }` — target = determine from vow fields (target_phone or target_user_id display)
- M10: `{ text: "Dared {target} · watching", color: '#5a5650' }`
- M11: `{ text: "You're judging {target}", color: '#5a5650' }`
- W1: `{ text: "By {maker_display_name} · {stake_label}", color: '#5a5650' }`
- W2: `{ text: "By {maker_display_name} · {stake_label}", color: '#5a5650' }`
- T1: `null` (buttons replace meta)
- T2: `{ text: "Dared by {maker_name} · {stake_label}", color: '#5a5650' }` — maker_name = vow.witness_name (in challenges, maker = witness)
- T3: `{ text: "Dared by {maker_name}", color: '#5a5650' }`

**Stake label:** `vow.stake_amount > 0 ? '$' + Math.round(vow.stake_amount / 100) : 'no stake'`

**Target name resolution:** For M9/M10/M11, the target is `vow.target_phone` or a display name if available. We don't have `get_display_name` for target — use phone or "them" as fallback. Actually — look at the vow. For challenge vows, the maker created the vow. `vow.witness_name` is the maker's name (since maker = witness in challenges). The target is someone else. We might not have their display name. Use the first part of `vow.target_phone` or "them".

Wait — actually in the current codebase, challenge vows use `witness_name` for the challenger/maker (who is the witness), and the target info is in `target_user_id`/`target_phone`. The PRD says "Dared {target}" — we need target's name. Since we don't currently store target display name on the vow, and the `get_display_name` function exists, we could call it for target_user_id too. But the witnessing query already adds `maker_display_name`. For challenge vows in `myVows`, the user IS the maker, so they know who they dared. We can either:
1. Use target_phone (e.g. "Dared 555-1234")
2. Add another query for target display name

**Decision:** For now, use `vow.target_phone ? vow.target_phone.slice(-4) : 'them'` as a short label, or better — store it. Actually, let's check if there's a `target_name` or similar field... No, there isn't. For MVP, display "target" using whatever info we have. The PRD uses `{target}` — we'll resolve this by adding a `target_display_name` field to the dashboard query. Actually simpler: for challenge vows where user is maker, we can call `get_display_name(target_user_id)` in the fetch. Let's handle this in the dashboard page's fetchData — add a second pass that resolves target names for challenge vows.

**Simplest approach:** In `fetchData`, after getting myVows, for any challenge vow with `target_user_id`, call `get_display_name` via RPC. Batch them. Add `target_display_name` to the `DashboardVow` type.

Update `DashboardVow` type:
```ts
export type DashboardVow = VowRow & {
  maker_display_name?: string | null;
  target_display_name?: string | null;
};
```

#### `getActionButtons(state: CardState, vow) → ActionButton[]`

Only certain states have buttons. Per PRD:
- M1: Two side-by-side: "Kept ✓" (green, 44px) + "Broken ✗" (red, 44px)
- M3: One full-width: "Self-resolve →" (orange, 44px)
- M11: One full-width: "Deliver verdict →" (gold, 44px)
- W1: One full-width: "Deliver your verdict →" (blue, 44px)
- T1: Two side-by-side: "Accept" (gold, 44px) + "Decline" (muted, 44px)
- All other states: no buttons

#### `hasChevron(state: CardState) → boolean`

Chevron shows on cards WITH a tap target but NO action buttons:
- M2, M4, M5, M6, M7, M9, M10, W2, T2, T3: `true`
- M1, M3, M8, M11, W1, T1: `false`
- M8: No chevron (it has "Tap to seal →" in meta text instead)

#### `showProgressBar(state, vow) → boolean`

Show on vows with `starts_at` AND `ends_at` that aren't drafts or pending dares:
- NOT M8, M9, T1
- Must have both `vow.starts_at` and `vow.ends_at`

#### Progress bar color (card = solid, 3px)

```ts
function getCardProgressColor(pct: number): string {
  if (pct >= 100) return '#EF4444';
  if (pct >= 80) return '#FB923C';
  return '#d4a24f';
}
```

### Render Structure

```tsx
<div onClick={hasActionButtons ? undefined : onTap} style={cardStyle} className="...">
  {/* c-top: dot + label + time + chevron */}
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${pulse ? pulseClass : ''}`} style={{ backgroundColor: dotColor }} />
    <span className="text-[11px] font-bold tracking-[0.7px] uppercase" style={{ color: labelColor }}>
      {label}
    </span>
    <span className="ml-auto text-[12px] font-semibold" style={{ color: timeColor }}>
      {timeText}
    </span>
    {showChevron && <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#3a3530' }} />}
  </div>

  {/* c-txt: vow text */}
  <p className="text-[15px] font-serif font-medium leading-[21px] line-clamp-2" style={{ color: 'var(--text)' }}>
    {vow.refined_text}
  </p>

  {/* c-bar: progress bar (conditional) */}
  {showProgress && (
    <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
    </div>
  )}

  {/* c-bot: meta line (conditional) */}
  {meta && (
    <div className="flex items-center justify-between">
      <span className="text-[12px]" style={{ color: meta.color }}>{meta.text}</span>
      {/* stake on right for W1, W2, T2 */}
    </div>
  )}

  {/* c-actions: buttons (conditional) */}
  {actionButtons}
</div>
```

**Critical:** All action buttons use `e.stopPropagation()` to prevent card tap.

### Card Tap Targets

Per PRD Section 8.2, each state maps to a specific URL. The `onTap` callback is set by the parent (dashboard page), which computes the URL:

```ts
function getTapTarget(item: SortedVow): string {
  const { vow, state } = item;
  switch (state) {
    case 'M1': return `/self-resolve?id=${vow.id}`;
    case 'M8': return `/seal?id=${vow.id}`;
    case 'W1': return `/w/${vow.witness_invite_token}/verdict`;
    case 'T1': return `/c/${vow.challenge_invite_token}`;
    default: return `/vow/${vow.id}`;
  }
}
```

### CSS: Pulse Animation

Add to the component (or use Tailwind's `animate-pulse` if close enough):
```css
@keyframes dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```
Duration: 2s infinite. Apply via inline style or a CSS class.

### Card Wrapper Styles

- `border-radius: 16px`
- `padding: 14px`
- `display: flex; flex-direction: column; gap: 7px`
- `transition: transform 0.1s`
- `active:scale-[0.98]` for tappable cards (all cards are tappable)

---

## Phase 4: Dashboard Hero Component — `web/src/components/dashboard-hero.tsx`

**Create new file.** Renders the expanded single-vow view.

### Props

```ts
import type { SortedVow } from '@/lib/dashboard-sort';

interface DashboardHeroProps {
  item: SortedVow;
  keptCount: number;
  streak: number;
  onAcceptChallenge?: () => void;
  onDeclineChallenge?: () => void;
}
```

### Layout (PRD Section 4.1)

```
1. Vow text — Georgia, 24px, weight 400, curly quotes, tappable → /vow/{id}
2. Progress bar — 6px, gold gradient (or orange-red at 100%)
3. Countdown line — left: "Day X of Y" or "Time's up". Right: context text
4. Witness block — conditional
5. Spacer (flex-1)
6. Primary CTA — context-dependent per Section 4.2
7. Secondary link — "Make a vow →" (muted)
```

### CTA Logic (PRD Section 4.2)

Use a switch on `item.state` to determine:
- Button text, style (gold/orange/green+red/blue/muted), action (router.push or SMS compose)
- For M1: Two buttons side-by-side (52px): "I kept it" (green) + "I broke it" (red)
- For T1: Two buttons side-by-side (52px): "Accept" (gold) + "Decline" (muted)
- For W1: "Deliver your verdict →" (blue gradient, 52px)
- All others: single button (52px)

### Witness Block

Shows when `role === 'maker'` and `witness_name !== 'Just me'`:
- If `awaiting_verdict` + witness accepted: orange dot (pulsing) + "{name} has the call" + amber border
- Else: green dot + "{name} is watching" + chevron
- If witness pending: "{name} · hasn't accepted" with orange text

Does NOT show when `role === 'witness'` (user IS the witness).

### Hero — No `ends_at`

Per PRD Section 4.5: No progress bar, no countdown. Everything else renders normally.

### Hero — Witnessing Vow (PRD Section 4.6)

If role === 'witness':
- Countdown right side: "By {maker_display_name} · {stake_label}"
- No witness block
- CTA: "Deliver your verdict →" if W1, "Send {maker_display_name} a message" if W2

### Progress Bar (Hero = 6px, gradient)

```ts
function getHeroProgressBar(startsAt: string | null, endsAt: string | null) {
  if (!startsAt || !endsAt) return null;
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const total = end - start;
  if (total <= 0) return { pct: 100, gradient: 'linear-gradient(90deg, #FB923C, #EF4444)' };
  const pct = Math.min(100, Math.max(0, ((now - start) / total) * 100));
  const gradient = pct >= 100
    ? 'linear-gradient(90deg, #FB923C, #EF4444)'
    : 'linear-gradient(90deg, #d4a24f, #e8c36a)';
  return { pct, gradient };
}
```

### Countdown Line

Left side:
- If `starts_at` and `ends_at`: "Day {elapsed} of {total}" format
- If time's up: "Time's up" or "Time's up — your call" (M1)
- If no dates: empty

Right side:
- M1: "Just you · no stake" or "Just you · $X stake"
- M2: "Waiting for {witness_name}'s verdict"
- M3: "{witness_name} never accepted"
- M4/M6/M7: "{witness_name} is watching"
- M5: "Just you · {stake_label}"
- Others: contextual

---

## Phase 5: Dashboard Page Rewrite — `web/src/app/dashboard/page.tsx`

**Modify existing file.** This is the largest change. Preserve: `SlideMenu`, `InProgressBanner`, auth redirect, `fetchData` queries, challenge handlers, 30s interval.

### What stays identical

1. `SlideMenu` component (lines 13-89) — copy verbatim
2. `InProgressBanner` component (lines 91-135) — copy verbatim
3. Auth redirect logic (lines 196-205) — identical
4. `handleAcceptChallenge` (lines 234-239) — identical
5. `handleDeclineChallenge` (lines 241-256) — identical
6. Loading spinner (lines 275-283) — identical
7. 30s interval setup — identical

### What changes

#### Imports

Remove: `SectionLabel`, `StatPill`, `VowCard`
Add: `DashboardCard` from `@/components/dashboard-card`, `DashboardHero` from `@/components/dashboard-hero`, `buildDashboardList`, `computeStats`, `DashboardVow` from `@/lib/dashboard-sort`, `ChevronRight` from `lucide-react`

#### `fetchData` modifications

After the 4 parallel queries (kept identical), add:

1. **Witnessing vows query change:** Use RPC to get `maker_display_name`:
```ts
// Replace the witnessing query with one that includes maker_display_name
const witnessRes = await supabase
  .from('vows')
  .select('*')
  .eq('witness_user_id', session.user.id)
  .neq('user_id', session.user.id)
  .in('status', ['active', 'awaiting_verdict'])
  .order('ends_at', { ascending: true });

// Resolve maker display names for witnessing vows
const witnessingData = witnessRes.data ?? [];
const witnessingWithNames: DashboardVow[] = await Promise.all(
  witnessingData.map(async (vow) => {
    const { data: name } = await supabase.rpc('get_display_name', { user_uuid: vow.user_id });
    return { ...vow, maker_display_name: name ?? null };
  })
);
```

2. **Resolve target display names for challenge vows:**
```ts
// For challenge vows where I'm the maker, resolve target display name
const mergedWithTargetNames: DashboardVow[] = await Promise.all(
  merged.map(async (vow) => {
    if (vow.vow_type === 'challenge' && vow.target_user_id) {
      const { data: name } = await supabase.rpc('get_display_name', { user_uuid: vow.target_user_id });
      return { ...vow, target_display_name: name ?? null };
    }
    return vow;
  })
);
```

**Performance note:** These are small queries (typically 0-3 vows being witnessed, 0-2 challenge vows). If perf becomes an issue, batch into a single query with `IN (uuid_list)` — but for MVP this is fine.

#### State computation

Replace the current section derivations (lines 207-219) and stats (lines 221-232) with:

```ts
const { keptCount, streak } = computeStats(myVows);
const dashboardVows = buildDashboardList(myVows, witnessingVows, challenges, acceptedChallengeIds);
const completedCount = myVows.filter(v => ['kept', 'broken', 'voided'].includes(v.status)).length;
```

#### Redirect logic

Replace the current empty check (lines 285-290) with:

```ts
// Zero dashboard vows → redirect
if (dashboardVows.length === 0) {
  if (keptCount > 0) {
    router.replace('/?new=1&returning=1');
  } else {
    router.replace('/?new=1');
  }
  return null;
}
```

#### `visibilitychange` listener (new)

Add inside the main `useEffect` alongside the interval:

```ts
const handleVisibility = () => {
  if (document.visibilityState === 'visible') fetchData();
};
document.addEventListener('visibilitychange', handleVisibility);

return () => {
  if (intervalRef.current) clearInterval(intervalRef.current);
  document.removeEventListener('visibilitychange', handleVisibility);
};
```

#### Header

Replace the current header with:

```tsx
<FadeUp>
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="p-1 -ml-1">
        <Menu className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
      </button>
      <HeaderBadge />
    </div>
    <div className="flex items-center gap-3">
      {/* Inline stats */}
      {keptCount > 0 && (
        <span className="text-[12px] font-semibold" style={{ color: '#5a5650' }}>
          <span style={{ color: '#52d69a' }}>{keptCount}</span> kept
          {streak >= 2 && <> · {streak} streak</>}
        </span>
      )}
      <button onClick={() => router.push('/settings')} aria-label="Settings"
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Settings className="w-[18px] h-[18px]" style={{ color: 'var(--text-secondary)' }} />
      </button>
    </div>
  </div>
</FadeUp>
```

**No `displayName` in header** — removed per new design (stats replace it).

#### Render: Hero vs Stack branching

```tsx
{dashboardVows.length === 1 ? (
  // HERO VIEW
  <DashboardHero
    item={dashboardVows[0]}
    keptCount={keptCount}
    streak={streak}
    onAcceptChallenge={
      dashboardVows[0].state === 'T1'
        ? () => handleAcceptChallenge(dashboardVows[0].vow.id)
        : undefined
    }
    onDeclineChallenge={
      dashboardVows[0].state === 'T1'
        ? () => handleDeclineChallenge(dashboardVows[0].vow.id)
        : undefined
    }
  />
) : (
  // SMART STACK
  <>
    <InProgressBanner />
    <div className="flex flex-col gap-2">
      {dashboardVows.map((item, i) => (
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
    {/* History link */}
    {completedCount > 0 && (
      <div className="flex flex-col items-center gap-1 pt-2 pb-4">
        <span className="text-[11px]" style={{ color: '#3a3530' }}>{completedCount} vows completed</span>
        <button onClick={() => router.push('/history')} className="text-[12px]" style={{ color: '#5a5650' }}>
          View history →
        </button>
      </div>
    )}
  </>
)}
```

#### Footer CTA

For Stack view, use `RitualScreen`'s `footer` prop:

```tsx
<RitualScreen
  footer={
    dashboardVows.length >= 2 ? (
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
```

For Hero view, the "Make a vow →" is a secondary link below the CTA inside the hero component itself (not the footer).

#### `getTapTarget` function (in page.tsx)

```ts
function getTapTarget(item: SortedVow): string {
  const { vow, state } = item;
  switch (state) {
    case 'M1': return `/self-resolve?id=${vow.id}`;
    case 'M8': return `/seal?id=${vow.id}`;
    case 'W1': return `/w/${vow.witness_invite_token}/verdict`;
    case 'T1': return `/c/${vow.challenge_invite_token}`;
    default: return `/vow/${vow.id}`;
  }
}
```

---

## Phase 6: Self-Resolve Page Update — `web/src/app/self-resolve/page.tsx`

**Modify existing file.** Two changes:

### Change 1: Accept `?id=` query param to fetch specific vow

Currently the page fetches the user's most recent active/awaiting vow. It needs to accept an `id` param to fetch a specific vow (when coming from dashboard with multiple vows).

Replace the `fetchVow` function (lines 33-52):

```ts
const fetchVow = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const params = new URLSearchParams(window.location.search);
  const vowId = params.get('id');

  let query = supabase.from('vows')
    .select('*')
    .eq('user_id', session.user.id)
    .in('status', ['active', 'awaiting_verdict']);

  if (vowId) {
    query = query.eq('id', vowId);
  } else {
    query = query.order('created_at', { ascending: false }).limit(1);
  }

  const { data } = await query.maybeSingle();

  if (!data) {
    router.replace('/dashboard');
    return;
  }

  setVow(data);
  setLoading(false);
};
```

### Change 2: Accept `?choice=kept|broken` and pre-select

After setting the vow, read the `choice` param:

```ts
// After setVow(data):
const choiceParam = params.get('choice');
if (choiceParam === 'kept' || choiceParam === 'broken') {
  setChoice(choiceParam);
  setSworn(true);  // auto-check oath
  setView('confirm');  // skip to confirmation
}
```

**Wait** — PRD Section 4.3 says "The user still confirms via oath, but doesn't have to re-choose." This means we should pre-select the choice but NOT skip the oath. Let me re-read...

PRD says: "tapping either navigates with `&choice=kept` or `&choice=broken` so the self-resolve page **pre-selects the choice**."

So the choice is pre-selected visually, but the user still needs to check the oath and confirm. Updated approach:

```ts
const choiceParam = params.get('choice');
if (choiceParam === 'kept' || choiceParam === 'broken') {
  // Pre-select the choice — user still needs to take oath and confirm
  // We go straight to the confirm view with oath pre-checked since the
  // dashboard button ("I kept it" / "I broke it") already implies intent
  setChoice(choiceParam);
  setSworn(true);
  setView('confirm');
}
```

Actually, re-reading the PRD: "The hero shows the two buttons as the CTA, and tapping either navigates with `&choice=` ... The user still confirms via oath, but doesn't have to re-choose."

The intent is: skip the choose step, go to confirm. The oath is on the confirm page already as the "Confirm" button. So pre-selecting + going to confirm is correct. The oath checkbox isn't on the confirm view — it's on the choose view. The confirm view just shows the confirmation message and a "Confirm" button.

Looking at the code: `view === 'confirm'` shows the confirmation UI with a "Confirm" button and "Go back". The oath checkbox is in the `choose` view. So if we skip to confirm, the user sees "You kept your word" (or "Honest. Respect.") with the confirm button. That's the intended flow — the oath ceremony happens on the dashboard implicitly by tapping the specific button.

So the approach is correct:

```ts
const choiceParam = params.get('choice');
if (choiceParam === 'kept' || choiceParam === 'broken') {
  setChoice(choiceParam);
  setView('confirm');
}
```

No need to set `sworn` since it's only checked in `handleChoose` (which we skip).

---

## Phase 7: Verification Checklist

After all phases are complete, run through these checks:

### Build verification
- [ ] `npm run build` passes with zero errors
- [ ] No TypeScript errors in new files
- [ ] No unused imports

### Functional verification (PRD cross-reference)
- [ ] 0 dashboard vows, 0 kept → redirects to `/?new=1`
- [ ] 0 dashboard vows, 3 kept → redirects to `/?new=1&returning=1`
- [ ] 1 dashboard vow → hero view renders
- [ ] 2+ dashboard vows → stack view renders
- [ ] Sort order matches tier assignments
- [ ] Stats display: 0 kept = no stats, >0 kept = shows, streak ≥ 2 = shows streak
- [ ] All 16 card states render with correct style, label, dot, time, meta, buttons
- [ ] Action buttons use stopPropagation
- [ ] visibilitychange fires fetchData
- [ ] 30s interval still works
- [ ] SlideMenu still works
- [ ] InProgressBanner still works
- [ ] Self-resolve ?choice= pre-selects correctly
- [ ] Self-resolve without params works as before
- [ ] VowCard component unmodified (check /history works)

### Files created
1. `supabase/migrations/20260414000001_get_display_name.sql`
2. `web/src/lib/dashboard-sort.ts`
3. `web/src/components/dashboard-card.tsx`
4. `web/src/components/dashboard-hero.tsx`

### Files modified
1. `web/src/app/dashboard/page.tsx` (major rewrite, preserve SlideMenu + InProgressBanner + auth + handlers)
2. `web/src/app/self-resolve/page.tsx` (add ?id= and ?choice= param support)

### Files NOT modified (verify unchanged)
- `web/src/components/vow-card.tsx`
- `web/src/components/ui.tsx`
- `web/src/lib/supabase.ts`
- `web/src/lib/types.ts`
- `web/src/providers/auth-provider.tsx`
- `web/src/app/history/page.tsx`
- All other pages listed in CLAUDE.md

---

## Implementation Order (strict)

```
1. Migration SQL file          → can be applied independently
2. dashboard-sort.ts           → pure functions, no dependencies on new components
3. dashboard-card.tsx          → depends on dashboard-sort.ts types
4. dashboard-hero.tsx          → depends on dashboard-sort.ts types
5. dashboard/page.tsx rewrite  → depends on all of 2, 3, 4
6. self-resolve/page.tsx       → independent of 2-5, can be done in parallel with 5
7. Build verification          → after all code changes
```
