# Phase 7: Certificate + Witness Polish + Void

## Context
Phases 1-6 built the core experience. This phase adds the shareable certificate, improves the verdict UX, and wires up vow cancellation.

## Objective
Shareable certificate page for viral moments. Verdict UX improved with undo toast. Makers can cancel active vows.

## Tasks

### 1. Create certificate page
Create `web/src/app/certificate/[vowId]/page.tsx` (server component for metadata)
Create `web/src/app/certificate/[vowId]/client.tsx` (client component for display)

**Server component:**
```typescript
// Fetch vow by ID (service role for public access to metadata)
// Generate metadata:
export async function generateMetadata({ params }) {
  const vow = // fetch vow
  const isResolved = ['kept', 'broken'].includes(vow.status);
  return {
    title: isResolved
      ? `${vow.verdict === 'kept' ? 'Kept' : 'Broken'}: "${vow.refined_text}"`
      : `Unbreakable Vow: "${vow.refined_text}"`,
    description: `Witnessed by ${vow.witness_name}. ${vow.stake_amount > 0 ? `$${vow.stake_amount / 100} on the line.` : 'Accountability vow.'}`,
    openGraph: {
      title: // same as above
      description: // same as above
      type: 'website',
    }
  };
}
```

**Client component — dark-and-gold aesthetic:**
```
┌─────────────────────────────────┐
│                                 │
│         ✦ UNBREAKABLE VOW ✦    │
│                                 │
│   "Run 3 miles before Friday"   │  ← serif font, large
│                                 │
│   Witnessed by David            │
│   $25 on the line               │  ← or "Accountability vow"
│   Sealed: April 8, 2026         │
│                                 │
│   [If resolved:]                │
│   ────────────────              │
│   ✅ VOW KEPT                   │  ← or ❌ VOW BROKEN
│   April 10, 2026                │
│                                 │
│   [ Share ]                     │
│                                 │
│   [Back to Dashboard]           │
│                                 │
└─────────────────────────────────┘
```

- Background: var(--bg) (#030508)
- Accent: var(--gold) (#D4A24F) for border, stars, text highlights
- Vow text: serif font (system serif or Playfair Display if available)
- Share button: uses ShareButton component from `components/share-button.tsx`
- Share text: "I made an Unbreakable Vow: '{text}' — {url}"

### 2. Wire certificate into seal flow
After successful seal of a STAKED vow, redirect to `/certificate/[vowId]` instead of `/sent`.

**In create/page.tsx** (Phase 4):
- Staked vow seal → redirect to `/certificate/${vow.id}`
- $0 vow seal → redirect to `/dashboard`

**In seal/page.tsx** (existing first-time flow):
- After successful seal → redirect to `/certificate/${vowId}` instead of `/sent`
- Read seal/page.tsx carefully. Find where it navigates to `/sent` and change to `/certificate/${vowId}`
- The `/sent` page still exists (don't delete it) but new seals go to certificate

### 3. Improve verdict UX — undo toast
Update `web/src/app/w/[token]/verdict/client.tsx`

**Current behavior:** Tap verdict → confirmation modal → confirm → submit
**New behavior:** Tap verdict → 3-second undo toast → auto-submit

```typescript
const [pendingVerdict, setPendingVerdict] = useState<'kept' | 'broken' | null>(null);
const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null);

function handleVerdictTap(verdict: 'kept' | 'broken') {
  setPendingVerdict(verdict);
  const timeout = setTimeout(() => {
    submitVerdict(verdict); // existing submit logic
    setPendingVerdict(null);
  }, 3000);
  setUndoTimeout(timeout);
}

function handleUndo() {
  if (undoTimeout) clearTimeout(undoTimeout);
  setPendingVerdict(null);
}
```

**Toast UI:** Fixed position at bottom of screen, shows:
```
Submitting verdict: KEPT  [Undo]
━━━━━━━━━━━━━━━━━━━━━━░░░░ (3s countdown bar)
```

Remove the existing confirmation modal. Replace with this toast pattern.

### 4. Add challenge-back CTA after verdict
In `web/src/app/w/[token]/verdict/client.tsx`, in the "done" state (after verdict submitted):

Add below the existing success content:
```tsx
<div style={{ marginTop: '2rem', textAlign: 'center' }}>
  <p style={{ color: 'var(--muted)', marginBottom: '0.5rem' }}>
    Your turn?
  </p>
  <a
    href="/"
    style={{
      color: 'var(--gold)',
      textDecoration: 'underline',
      fontSize: '1rem',
    }}
  >
    Challenge {makerName} back →
  </a>
</div>
```

### 5. Wire void/cancel on vow detail page
Update `web/src/app/vow/[id]/page.tsx` (from Phase 3):

Replace "Withdraw vow" placeholder with working button:

```typescript
async function handleVoid() {
  if (!confirm('This will cancel your vow' + (vow.stake_amount > 0 ? ' and refund your stake' : '') + '. Continue?')) {
    return;
  }

  setVoiding(true);
  const { data, error } = await supabase.functions.invoke('void-vow', {
    body: { vow_id: vow.id }
  });

  if (error) {
    alert('Failed to withdraw vow. Please try again.');
    setVoiding(false);
    return;
  }

  router.push('/dashboard');
}
```

Only show void button if:
- User is the maker (vow.user_id === session.user.id)
- Status is 'active' or 'awaiting_verdict'

## Reference Files
- `web/src/app/outcome/[vowId]/page.tsx` — server component with OG metadata pattern
- `web/src/app/outcome/[vowId]/client.tsx` — outcome display pattern
- `web/src/components/share-button.tsx` — ShareButton and CopyLinkButton
- `web/src/app/w/[token]/verdict/client.tsx` — READ BEFORE MODIFYING (verdict flow)
- `web/src/app/seal/page.tsx` — READ for post-seal redirect location
- `web/src/app/create/page.tsx` — from Phase 4 (post-seal redirect)
- `web/src/app/vow/[id]/page.tsx` — from Phase 3 (void button)
- `web/src/components/ui.tsx` — RitualCard, PrimaryButton, FadeUp

## Verification
- [ ] `/certificate/[vowId]` renders with dark-and-gold aesthetic
- [ ] Certificate shows vow text, witness, stake, seal date
- [ ] Resolved certificate shows verdict badge
- [ ] Share button works (Web Share API mobile, clipboard desktop)
- [ ] OG tags generate preview when link pasted in messages/social
- [ ] Staked vow seal → redirects to certificate
- [ ] $0 vow seal → redirects to dashboard
- [ ] First-time flow seal → redirects to certificate (not /sent)
- [ ] Verdict tap → 3-second undo toast appears
- [ ] Undo within 3s → verdict NOT submitted
- [ ] Let toast expire → verdict submitted normally
- [ ] Challenge-back CTA shows after verdict, links to /
- [ ] Void button appears on active vow detail (maker only)
- [ ] Void button hidden for kept/broken/voided vows
- [ ] Void button hidden for witnesses (not their vow)
- [ ] Confirm void → vow status = voided, redirect to dashboard
- [ ] Staked void → refund issued
- [ ] $0 void → status change only, no refund
- [ ] Voided vow shows in dashboard Recent as withdrawn

## Do Not Touch
- `/sent/page.tsx` — keep it (backwards compat), just don't redirect there from new flows
- `/w/[token]/page.tsx` — witness invite page (not verdict)
- `/w/[token]/client.tsx` — witness invite client (not verdict)
- Dashboard structure (Phase 3)
- Creation form (Phase 4)
- Challenge page (Phase 5)
- Timeline component (Phase 6)
- All edge functions
- All Expo files
