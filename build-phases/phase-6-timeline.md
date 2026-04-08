# Phase 6: Audit Trail + Timeline + Check-ins

## Context
Phases 1-5 built the backend, dashboard, creation, and challenge flows. Audit events are being logged by edge functions (Phase 2). This phase makes them visible and adds check-in capability.

## Objective
Every vow has a visible timeline of events. Makers can check in during active period. Witnesses and challenge targets can see progress.

## Tasks

### 1. Create Timeline component
Create `web/src/components/timeline.tsx`

**Props:**
```typescript
interface TimelineProps {
  vowId: string
  endsAt?: string  // to show future "Verdict day" marker
  useServiceRole?: boolean  // for witness/challenge pages
}
```

**Query:**
```typescript
const { data: events } = await supabase
  .from('audit_events')
  .select('*')
  .eq('vow_id', vowId)
  .order('created_at', { ascending: true });
```

Note: For witness/challenge pages (token-based, no auth), pass events as props from the server component instead of querying client-side.

**Event rendering map:**
```typescript
const eventDisplay: Record<string, { icon: string, label: (meta) => string }> = {
  vow_sealed:          { icon: '🔒', label: () => 'Vow sealed' },
  witness_invited:     { icon: '📩', label: () => 'Witness invited' },
  witness_accepted:    { icon: '✅', label: (m) => `${m.witness_name || 'Witness'} accepted` },
  witness_declined:    { icon: '❌', label: (m) => `${m.witness_name || 'Witness'} declined` },
  challenge_sent:      { icon: '⚔️', label: () => 'Challenge sent' },
  challenge_accepted:  { icon: '✅', label: () => 'Challenge accepted' },
  challenge_declined:  { icon: '❌', label: () => 'Challenge declined' },
  check_in:            { icon: '📋', label: (m) => `Checked in: ${formatCheckInType(m.type)}` },
  verdict_submitted:   { icon: '⚖️', label: (m) => `Verdict: ${m.verdict}` },
  auto_resolved:       { icon: '⏰', label: () => 'Auto-resolved: Kept' },
  vow_voided:          { icon: '🚫', label: () => 'Vow withdrawn' },
  refund_issued:       { icon: '💰', label: () => 'Refund issued' },
  refund_failed:       { icon: '⚠️', label: () => 'Refund pending' },
};

function formatCheckInType(type: string): string {
  switch (type) {
    case 'on_track': return 'On track';
    case 'struggling': return 'Struggling';
    case 'done_early': return 'Done early';
    default: return type;
  }
}
```

**Visual design:**
- Vertical line on the left (gold, thin)
- Each event: dot on the line + icon + text + relative timestamp ("2 days ago", "just now")
- If endsAt is in the future: show upcoming marker "⏳ Verdict day — {date}"
- Use FadeUp for staggered entry animation

### 2. Wire timeline into vow detail page
Update `web/src/app/vow/[id]/page.tsx` (from Phase 3):
- Replace "Timeline loading..." placeholder with `<Timeline vowId={vowId} endsAt={vow.ends_at} />`
- Timeline appears below the people block

### 3. Create check-in block
Add to `web/src/app/vow/[id]/page.tsx`:

```typescript
// Check-in block — only show for maker on active vows
{role === 'maker' && vow.status === 'active' && (
  <CheckInBlock vowId={vow.id} userId={session.user.id} />
)}
```

Create check-in as either inline in the page or a small component:

**Three buttons:** "On track" / "Struggling" / "Done early"

**On tap:**
```typescript
async function handleCheckIn(type: 'on_track' | 'struggling' | 'done_early') {
  const { error } = await supabase.from('audit_events').insert({
    vow_id: vowId,
    event_type: 'check_in',
    actor_type: 'maker',
    actor_id: userId,
    metadata: { type },
  });
  if (!error) {
    setLastCheckIn(new Date());
    // Refresh timeline
  }
}
```

**Cooldown:** Disable buttons if last check_in event was < 4 hours ago.
```typescript
const lastCheckIn = events?.filter(e => e.event_type === 'check_in').pop();
const cooldownActive = lastCheckIn &&
  (Date.now() - new Date(lastCheckIn.created_at).getTime()) < 4 * 60 * 60 * 1000;
```

**Button styling:** Use ChoiceChip from ui.tsx or similar. Show selected state briefly on tap. Disabled state when cooling down with "Next check-in in Xh" text.

### 4. Show last check-in on dashboard vow cards
Update `web/src/components/vow-card.tsx` (from Phase 3):
- Accept optional `lastCheckIn` prop (event_type metadata)
- Display small text below progress bar: "Last: On track · 3h ago" or "Last: Struggling · 1d ago"

To get last check-in per vow efficiently, add to the dashboard queries:
```typescript
// Fetch latest check-in for each active vow
const { data: checkIns } = await supabase
  .from('audit_events')
  .select('vow_id, metadata, created_at')
  .in('vow_id', activeVowIds)
  .eq('event_type', 'check_in')
  .order('created_at', { ascending: false });

// Group by vow_id, take first (most recent)
const latestCheckIns = new Map();
for (const ci of checkIns || []) {
  if (!latestCheckIns.has(ci.vow_id)) {
    latestCheckIns.set(ci.vow_id, ci);
  }
}
```

### 5. Add timeline to witness page
Update `web/src/app/w/[token]/client.tsx`:
- When vow status is 'active' or 'awaiting_verdict', show timeline below vow details
- Since witness may not be authenticated, fetch audit_events in the SERVER component (`w/[token]/page.tsx`) using service role and pass as props
- Add `events` prop to the client component

This is a SMALL modification to an existing file. Only add a timeline section in the "accepted" state view. Do not change any existing behavior.

### 6. Add timeline to challenge page
Update `web/src/app/c/[token]/client.tsx` (from Phase 5):
- Same approach: fetch events in server component, pass to client
- Show timeline in "accepted" state

## Reference Files
- `web/src/app/vow/[id]/page.tsx` — from Phase 3 (wire in timeline + check-in)
- `web/src/components/vow-card.tsx` — from Phase 3 (add last check-in)
- `web/src/app/w/[token]/page.tsx` — server component (add events fetch)
- `web/src/app/w/[token]/client.tsx` — client component (add timeline section)
- `web/src/app/c/[token]/page.tsx` — from Phase 5 (add events fetch)
- `web/src/app/c/[token]/client.tsx` — from Phase 5 (add timeline section)
- `web/src/components/ui.tsx` — FadeUp, ChoiceChip, RitualCard

## Verification
- [ ] Seal a vow → timeline shows "Vow sealed" and "Witness invited" events
- [ ] Accept witness → timeline shows "Witness accepted"
- [ ] Tap "On track" check-in → event appears in timeline immediately
- [ ] Check-in buttons disabled for 4 hours after use
- [ ] Cooldown text shows "Next check-in in Xh"
- [ ] Dashboard vow cards show last check-in status
- [ ] Timeline on vow detail shows all events in chronological order
- [ ] Future verdict day shown as upcoming marker
- [ ] Witness page (/w/[token]) shows timeline when vow is active
- [ ] Challenge page (/c/[token]) shows timeline when accepted
- [ ] Submit verdict → timeline shows "Verdict: kept/broken"
- [ ] Relative timestamps display correctly ("just now", "2 hours ago", "3 days ago")
- [ ] Timeline renders well on mobile (375px)

## Do Not Touch
- Witness accept/decline logic in client.tsx (only ADD timeline section)
- Verdict submission logic
- Dashboard queries (only add check-in fetch alongside)
- All edge functions
- All Expo files
