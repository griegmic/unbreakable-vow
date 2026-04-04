# Prompt 11: Wire Real Data — History, Settings, Live Screen, Sent Screen

## Context
Unbreakable Vow app. Backend is working (Supabase + Stripe + Twilio). Screens have been cleaned up (Prompt 10). Now we need to replace hardcoded/mock data with real Supabase queries.

## Files to modify

### 1. `app/history.tsx`
**Current:** Uses `historyEntries` hardcoded array from `constants/unbreakable.ts`.

**Replace with:**
```typescript
import { supabase } from '@/lib/supabase';

// In component:
const [vows, setVows] = useState<VowRow[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function loadHistory() {
    const { data } = await supabase
      .from('vows')
      .select('*')
      .in('status', ['kept', 'broken'])
      .order('created_at', { ascending: false });
    setVows(data ?? []);
    setLoading(false);
  }
  loadHistory();
}, []);
```

Map vow rows to the existing UI format:
- `text` → `vow.refined_text`
- `witness` → `vow.witness_name`
- `amount` → `vow.stake_amount / 100` (cents to dollars)
- `date` → format `starts_at` and `ends_at` as range
- `kept` → `vow.verdict === 'kept'`

Calculate stats from real data:
- `keptCount`, `brokenCount` from array filter
- `moneyProtected` = sum of kept vow amounts
- `moneyLost` = sum of broken vow amounts

Show loading spinner while fetching. Show "No vows yet" empty state.

### 2. `app/live.tsx`
**Current:** Shows VowFlow state (local only).

**Replace with:**
```typescript
// On mount: fetch the user's active vow from Supabase
const [activeVow, setActiveVow] = useState<VowRow | null>(null);

useEffect(() => {
  async function loadActiveVow() {
    const vow = await getActiveVow(); // from lib/vow-api.ts
    setActiveVow(vow);
  }
  loadActiveVow();

  // Subscribe to realtime changes
  const channel = supabase
    .channel('vow-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'vows',
      filter: `id=eq.${activeVow?.id}`,
    }, (payload) => {
      setActiveVow(payload.new as VowRow);
      // If status changed to 'kept' or 'broken', navigate to outcome screen
      if (payload.new.status === 'kept') router.replace('/vow-kept');
      if (payload.new.status === 'broken') router.replace('/vow-broken');
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);
```

Display:
- Vow text from `activeVow.refined_text`
- Witness name from `activeVow.witness_name`
- Stake from `activeVow.stake_amount / 100`
- Time remaining: calculate from `activeVow.ends_at` vs now
- Status badge: "ACTIVE" / "AWAITING VERDICT"

### 3. `app/sent.tsx`
**Current:** Shows local VowFlow state after seal.

**Changes:**
- After sealing (coming from seal.tsx), the vow ID should be available. Store it in VowFlow state or pass via route params.
- Generate the real share URL: `${SUPABASE_URL}/functions/v1/verdict-page?token=${vow.witness_invite_token}`
- Wire the copy/share functionality to use the real URL
- The "Preview what your witness sees" button should open the verdict page URL in a WebView or browser

### 4. `app/settings.tsx`
**Current:** Toggle switches, hardcoded version string, no real data.

**Changes:**
- Show user's display name from auth provider
- Show email (from Supabase auth session)
- Wire "Sign Out" button to real `signOut()` function → navigate to home
- Wire "Notifications" setting to actually check/toggle push permission
- Keep version string as-is
- Remove any settings that aren't functional (payment methods, etc.) or mark them as "Coming Soon"

### 5. `app/vow-kept.tsx` and `app/vow-broken.tsx`
**Current:** Show local VowFlow state.

**Changes:**
- These can continue using VowFlow state for now (the data is populated before navigation)
- But add: on mount, if VowFlow state is empty, try to load the most recent completed vow from Supabase as fallback
- Wire the "Make a new vow" button to also call `resetVow()` to clear VowFlow state

### 6. `app/witness-verdict.tsx`
**Current:** Uses local VowFlow state for verdict submission.

**Wire to real backend:**
- This screen is only used in-app (for development/testing). The real witness uses the web verdict page.
- For v1, keep this screen functional but wire it to call the `submit-verdict` Edge Function instead of just updating local state.
- After verdict submission, navigate to appropriate outcome screen.

### 7. `providers/vow-flow.tsx`
**Add:**
- A `vowId` field to VowState (set after vow is created in Supabase)
- A `setVowId` setter
- Export it in the context

### 8. `constants/unbreakable.ts`
**Remove hardcoded data that's now in the database:**
- Remove `historyEntries` array (or keep it but stop importing it anywhere)
- Remove `witnessContacts` array (already removed from witness.tsx in Prompt 10)
- Keep everything else (palette, vowExamples, stakeAmounts, consequenceOptions, charities, antiCauses, sharpening logic)

## Do NOT modify
- `app/index.tsx`
- `app/refine.tsx`
- `components/vow-ui.tsx`

## Important notes
- All Supabase queries should handle loading and error states gracefully.
- Use `useFocusEffect` from expo-router for screens that need to refresh data when navigated to.
- The realtime subscription on live.tsx is important — it lets the vow owner see verdict updates immediately.
- Don't remove VowFlow context — it's still useful for the creation flow. The database is for persistence.
