# Phase 3: Web Dashboard + Vow Detail

## Context
Phase 1 deployed schema. Phase 2 deployed all edge functions. Backend is complete. Now building the primary web UI: the dashboard that shows all vows, and the detail view for individual vows.

## Objective
Authenticated users land on a dashboard showing all their active vows, vows they're witnessing, incoming challenges, and recent outcomes. Tapping any vow opens a detail view with countdown and status.

## Tasks

### 1. Create VowCard component
Create `web/src/components/vow-card.tsx`

**Props:**
```typescript
interface VowCardProps {
  vow: VowRow
  role: 'maker' | 'witness' | 'target'
  onTap?: () => void
  onAcceptChallenge?: () => void
  onDeclineChallenge?: () => void
}
```

**Renders:**
- Vow text (refined_text, truncated to 2 lines)
- Status indicator dot + label:
  - active + witness not accepted → "Witness pending" (blue)
  - active + witness accepted → "Active" (green)
  - awaiting_verdict → "Verdict due" (amber, pulsing)
  - challenge pending → "Challenge received" (orange)
  - kept → "Kept" (green check)
  - broken → "Broken" (red x)
  - voided → "Withdrawn" (gray)
- Progress bar: `(now - starts_at) / (ends_at - starts_at)` clamped 0-100%
  - Gold (#D4A24F) 0-50%, amber 50-80%, red 80-100%
- Countdown text:
  - \> 7d: "12 days left"
  - 1-7d: "3 days, 4 hours left"
  - < 24h: "6 hours, 23 minutes left"
  - < 1h: "42 minutes left"
  - Expired: "Ended 2h ago"
- Witness/maker name depending on role
- Stake display: "$25 stake" or "no stake" (if 0)
- If challenge pending (role=target): Accept / Decline buttons inline

Use existing design system from `components/ui.tsx`: RitualCard for the card wrapper, FadeUp for animation. Match the dark theme + gold accent.

### 2. Create Dashboard page
Create `web/src/app/dashboard/page.tsx` (client component, 'use client')

**Layout:**
```
Header: Settings gear (left), User avatar + name (right)
Stats: "X active · Y kept · Z streak"
Section: NEEDS ATTENTION (verdict due + incoming challenges)
Section: ACTIVE (your running vows)
Section: WITNESSING (vows you're witnessing for others)
Section: RECENT (last 5 completed)
Footer: "+ Make a Vow" button → /create
```

**Queries (using Supabase client with auth):**
```typescript
// My vows as maker
const { data: myVows } = await supabase
  .from('vows')
  .select('*')
  .eq('user_id', session.user.id)
  .order('created_at', { ascending: false });

// Vows I'm witnessing
const { data: witnessingVows } = await supabase
  .from('vows')
  .select('*')
  .eq('witness_user_id', session.user.id)
  .in('status', ['active', 'awaiting_verdict'])
  .order('ends_at', { ascending: true });

// Incoming challenges
const { data: challenges } = await supabase
  .from('vows')
  .select('*')
  .eq('target_user_id', session.user.id)
  .eq('challenge_status', 'pending')
  .order('created_at', { ascending: false });
```

**Section logic:**
- Needs Attention: myVows where status='awaiting_verdict' + witnessingVows where status='awaiting_verdict' + challenges
- Active: myVows where status in ('active','sealed') sorted by ends_at asc
- Witnessing: witnessingVows where status='active' sorted by ends_at asc
- Recent: myVows where status in ('kept','broken','voided') limit 5

**Stats computation:**
- Active count: myVows.filter(v => ['active','sealed','awaiting_verdict'].includes(v.status)).length
- Kept count: myVows.filter(v => v.status === 'kept').length
- Streak: count consecutive kept vows from most recent backward (break on first non-kept)

**Empty state:** If no vows at all, show centered content:
"No vows yet. Make your first commitment." + big "+ Make a Vow" button + example vow chips

**Polling:** Refresh queries every 30 seconds via setInterval. Update countdown every 60 seconds.

**Accept/Decline challenge:** Call accept-challenge edge function via supabase.functions.invoke, then refresh queries.

### 3. Create Vow Detail page
Create `web/src/app/vow/[id]/page.tsx` (client component)

**Fetch:** `supabase.from('vows').select('*').eq('id', params.id).single()`
- Verify the user has access (is maker, witness, or target)

**Layout:**
```
Back button → /dashboard
Vow text (large, serif)

STATUS block:
  Status label + colored indicator
  Progress bar (full width)
  Countdown text
  Start date — End date

PEOPLE block:
  Maker: name (you) or name
  Witness: name + accepted/pending/declined status
  Target: name (if challenge)
  Stake: $X → destination, or "no stake"

CHECK-IN block: (placeholder — wired in Phase 6)
  "How's it going?"
  [On track] [Struggling] [Done early]

TIMELINE block: (placeholder — wired in Phase 6)
  "Timeline loading..."

ACTIONS block:
  [Share vow] — share button
  [Text witness] — opens SMS with pre-filled message (if witness_phone)
  [Withdraw vow] — (placeholder — wired in Phase 7)
```

### 4. Modify home page redirect
Read `web/src/app/page.tsx` first.

Add at the top of the component (before any rendering):
```typescript
const { isAuthenticated, loading } = useAuth();
const router = useRouter();

useEffect(() => {
  if (!loading && isAuthenticated) {
    router.replace('/dashboard');
  }
}, [isAuthenticated, loading]);
```

If authenticated, show nothing (or a loading spinner) while redirecting. Unauthenticated users see the existing home page unchanged.

## Reference Files
- `web/src/components/ui.tsx` — RitualCard, PrimaryButton, FadeUp, StatPill, SectionLabel, TitleBlock, BackButton
- `web/src/app/live/page.tsx` — polling pattern, vow display, countdown logic
- `web/src/app/history/page.tsx` — vow list query pattern
- `web/src/providers/auth-provider.tsx` — useAuth() hook
- `web/src/lib/supabase.ts` — Supabase client
- `web/src/lib/types.ts` — updated with new columns in Phase 1
- `web/src/app/page.tsx` — READ BEFORE MODIFYING (add redirect only)

## Verification
- [ ] Authenticated user at `/` redirects to `/dashboard`
- [ ] Unauthenticated user at `/` sees original home page
- [ ] Dashboard loads with all four sections
- [ ] Multiple active vows display simultaneously
- [ ] Witnessing section shows vows where user is witness_user_id
- [ ] Incoming challenges show with Accept/Decline buttons
- [ ] Accept challenge → challenge_status updates, card refreshes
- [ ] Decline challenge → vow voided, card disappears
- [ ] Stats bar shows correct counts
- [ ] Progress bars render with correct fill and color
- [ ] Countdowns are accurate
- [ ] Tap vow card → /vow/[id] detail page
- [ ] Detail page shows status, people, dates correctly
- [ ] Back button returns to dashboard
- [ ] Empty state renders when no vows exist
- [ ] Mobile responsive at 375px width
- [ ] Polling refreshes data every 30 seconds

## Do Not Touch
- `/refine`, `/stake`, `/witness`, `/seal`, `/sent`, `/live`
- `/self-resolve`, `/vow-kept`, `/vow-broken`
- `/history`, `/settings`
- `/w/[token]/*`, `/outcome/*`, `/auth/callback`
- All existing components (ui.tsx, auth-modal.tsx, payment-form.tsx, share-button.tsx)
- All providers except: one redirect line in page.tsx
- All lib files
- All Supabase edge functions
- All Expo files
