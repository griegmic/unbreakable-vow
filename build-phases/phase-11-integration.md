# Phase 11: Mobile Integration + Final QA

## Context
Phase 9 built the data layer. Phase 10 (Rork) generated the dashboard and detail screens. This phase wires them together and runs final cross-platform QA.

## Objective
Rork-generated screens connected to real data. Cross-platform consistency verified. All features working on both web and Expo.

## Tasks

### 1. Wire Rork dashboard to data layer
Open the Rork-generated dashboard screen. Verify it imports from `@/lib/vow-api`. If not, wire the imports:

```typescript
import {
  getMyVows,
  getWitnessingVows,
  getIncomingChallenges,
  getRecentVows,
  acceptChallenge,
  declineChallenge,
} from '@/lib/vow-api';
```

Verify the data fetching pattern. If Rork used mock data, replace with real calls:

```typescript
const [myVows, setMyVows] = useState<VowRow[]>([]);
const [witnessingVows, setWitnessingVows] = useState<VowRow[]>([]);
const [challenges, setChallenges] = useState<VowRow[]>([]);
const [recentVows, setRecentVows] = useState<VowRow[]>([]);
const [loading, setLoading] = useState(true);

async function fetchAll() {
  const [my, witnessing, incoming, recent] = await Promise.all([
    getMyVows(),
    getWitnessingVows(),
    getIncomingChallenges(),
    getRecentVows(5),
  ]);
  setMyVows(my);
  setWitnessingVows(witnessing);
  setChallenges(incoming);
  setRecentVows(recent);
  setLoading(false);
}

useEffect(() => { fetchAll(); }, []);
```

Wire pull-to-refresh:
```typescript
<FlatList
  refreshing={refreshing}
  onRefresh={async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }}
/>
```

Wire accept/decline challenge handlers:
```typescript
async function handleAcceptChallenge(token: string) {
  const success = await acceptChallenge(token);
  if (success) await fetchAll(); // refresh
}
```

### 2. Wire Rork detail screen to data layer
Open the Rork-generated detail screen. Wire imports:

```typescript
import {
  getVowDetail,
  getVowTimeline,
  submitCheckIn,
  voidVowV2,
} from '@/lib/vow-api';
```

Wire data fetching:
```typescript
const [vow, setVow] = useState<VowRow | null>(null);
const [timeline, setTimeline] = useState<AuditEvent[]>([]);

useEffect(() => {
  getVowDetail(vowId).then(setVow);
  getVowTimeline(vowId).then(setTimeline);
}, [vowId]);
```

Wire check-in:
```typescript
async function handleCheckIn(type: 'on_track' | 'struggling' | 'done_early') {
  const success = await submitCheckIn(vowId, type);
  if (success) {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Refresh timeline
    const updated = await getVowTimeline(vowId);
    setTimeline(updated);
  }
}
```

Wire void:
```typescript
async function handleVoid() {
  Alert.alert(
    'Withdraw Vow',
    `This will cancel your vow${vow.stake_amount > 0 ? ' and refund your stake' : ''}. Continue?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          const result = await voidVowV2(vowId);
          if (result.success) {
            router.back(); // return to dashboard
          }
        },
      },
    ]
  );
}
```

### 3. Fix navigation
Ensure the dashboard screen is accessible:
- If using tabs: verify "Vows" tab appears in bottom navigation
- If using stack: add navigation from appropriate entry points
- Card tap navigates to detail: `router.push(`/vow/${vowId}`)`
- "+ Make a Vow" button navigates to existing creation flow: `router.push('/')`
- Detail "back" button returns to dashboard

### 4. Fix Rork-generated code issues
Common things to fix after Rork generation:
- Import paths may be wrong (ensure `@/lib/vow-api` resolves)
- Type mismatches between Rork's expected shapes and actual VowRow
- Missing null checks (ends_at, starts_at can be null)
- Countdown logic edge cases (null dates, past dates)
- Progress bar NaN when starts_at or ends_at is null

### 5. Cross-platform testing

**Test: Create on web, view on Expo**
- [ ] Create a self-vow on web via /create
- [ ] Open Expo app → dashboard should show the vow
- [ ] Tap card → detail view shows correct data
- [ ] Timeline shows seal event

**Test: Create on Expo, view on web**
- [ ] Create a vow via Expo's existing creation flow
- [ ] Open web → /dashboard should show the vow

**Test: Witness interaction cross-platform**
- [ ] Create vow on web with David as witness
- [ ] David accepts on web (/w/[token])
- [ ] Joey's Expo dashboard shows witness accepted
- [ ] Joey checks in on Expo → web timeline shows check-in

**Test: Challenge cross-platform**
- [ ] Create challenge on web
- [ ] Target accepts on web (/c/[token])
- [ ] Both parties see updated status on Expo dashboard

**Test: Verdict cross-platform**
- [ ] Submit verdict on web
- [ ] Expo dashboard shows resolved vow in "Recent"

**Test: Void cross-platform**
- [ ] Void a vow on Expo
- [ ] Web dashboard shows it as voided

### 6. Concurrent vow stress test
- [ ] Create 5+ vows with different statuses
- [ ] Dashboard renders all without performance issues
- [ ] Each vow has independent countdown
- [ ] Scrolling is smooth (FlatList performance)

### 7. Final regression
- [ ] Expo home screen works (vow creation input)
- [ ] Expo refine flow works
- [ ] Expo witness/stake/seal flow works
- [ ] Expo certificate screen works
- [ ] Expo live screen still works (shows single active vow)
- [ ] Expo settings/history still work
- [ ] Web first-time flow still works
- [ ] Web witness flow still works
- [ ] Web verdict flow still works

### 8. Bug fixes
Fix any issues found. Keep a log of changes made.

## Reference Files
- Rork-generated screen files (from Phase 10)
- `expo/lib/vow-api.ts` (Phase 9 additions)
- `expo/app/_layout.tsx` (navigation)
- `expo/components/vow-ui.tsx` — DO NOT MODIFY

## Verification
- [ ] Expo dashboard loads all four sections with real data
- [ ] Vow cards show correct progress, countdown, status
- [ ] Tap card → detail view with real timeline
- [ ] Check-in works, timeline updates
- [ ] Challenge accept/decline works
- [ ] Void works with confirmation
- [ ] Pull-to-refresh fetches fresh data
- [ ] Cross-platform data consistency (all 6 scenarios above)
- [ ] 5+ concurrent vows render smoothly
- [ ] ALL existing Expo screens still work
- [ ] ALL web flows still work
- [ ] No TypeScript errors
- [ ] No runtime crashes

## Do Not Touch
- `expo/components/vow-ui.tsx` — NEVER MODIFY
- Existing Expo screen files (home, refine, witness, stake, auth, seal, certificate, live, self-resolve, vow-kept, vow-broken, history, settings)
- All web files (unless fixing a cross-platform bug)
- All Supabase edge functions
- Database schema
