# Phase 10: Mobile UI (Rork Prompt)

## Context
This phase is executed in Rork, NOT Claude Code. Phase 9 prepared the data layer with all query functions and types. This Rork prompt generates the Expo dashboard and vow detail screens.

## Rork Prompt

---

**IMPORTANT CONTEXT: This is an existing Expo/React Native app. You are ADDING new screens. Do NOT modify any existing files. Create new files only.**

### Project Info
- Existing Expo app with file-based routing (expo-router)
- Supabase backend (already configured in `lib/supabase.ts`)
- Dark theme: background `#030508`, gold accent `#D4A24F`, muted `#8A8A8E`
- Existing design components in `components/vow-ui.tsx` — DO NOT MODIFY this file
- Data functions already exist in `lib/vow-api.ts` (listed below)

### What to Build

#### Screen 1: Vow Dashboard
**File:** Create as appropriate for the app's routing structure (check _layout.tsx)

**Data functions available (import from `@/lib/vow-api`):**
```typescript
getMyVows(): Promise<VowRow[]>
getWitnessingVows(): Promise<VowRow[]>
getIncomingChallenges(): Promise<VowRow[]>
getRecentVows(limit?: number): Promise<VowRow[]>
acceptChallenge(token: string): Promise<boolean>
declineChallenge(token: string): Promise<boolean>
```

**Layout:**
- Header: greeting ("Hey {name}") + stats row ("X active · Y kept · streak")
- FlatList with section headers:
  1. **NEEDS ATTENTION** — vows with status='awaiting_verdict' (both mine and witnessing) + incoming challenges
  2. **YOUR VOWS** — active vows where I'm maker, sorted by deadline
  3. **WITNESSING** — active vows where I'm witness, sorted by deadline
  4. **RECENT** — last 5 completed (kept/broken/voided)
- Each section collapses if empty (don't show header)
- Pull-to-refresh: refetches all queries
- Bottom: "+ Make a Vow" button → navigates to existing home/creation flow
- Empty state: "No vows yet" with creation prompt

**VowCard component (create new):**
- Vow text (2 line max, truncated)
- Status indicator: colored dot + label
  - active: green "Active"
  - awaiting_verdict: amber pulsing "Verdict due"
  - challenge pending: orange "Challenge received"
  - kept: green "Kept" with checkmark
  - broken: red "Broken" with X
  - voided: gray "Withdrawn"
- Progress bar: `(now - starts_at) / (ends_at - starts_at)` clamped 0-100%
  - Gold 0-50%, amber 50-80%, red 80-100%
- Countdown text: "X days left" or "Ended Xh ago"
- Person name: witness name (for my vows) or maker name (for witnessing)
- Stake: "$25 stake" or "no stake"
- For incoming challenges: show Accept / Decline buttons

**Tap card → navigates to Vow Detail screen**

#### Screen 2: Vow Detail
**File:** Create new screen, navigated to with vowId parameter

**Data functions available:**
```typescript
getVowDetail(vowId: string): Promise<VowRow | null>
getVowTimeline(vowId: string): Promise<AuditEvent[]>
submitCheckIn(vowId: string, type: string): Promise<boolean>
voidVowV2(vowId: string): Promise<{ success: boolean; refunded?: boolean }>
```

**Layout:**
- Back button → dashboard
- Vow text (large)
- **Status block:**
  - Status label + colored indicator
  - Progress bar (full width)
  - Countdown text
  - "Started: {date}" / "Ends: {date}"
- **People block:**
  - Maker: name
  - Witness: name + accepted/pending/declined badge
  - Target: name (if challenge)
  - Stake: "$X → destination" or "no stake"
- **Check-in block** (only for maker, only when active):
  - "How's it going?"
  - Three buttons: "On track" / "Struggling" / "Done early"
  - Disable for 4 hours after last check-in
  - Haptic feedback on tap
- **Timeline block:**
  - Vertical timeline with events
  - Each: icon + description + relative time
  - Event types and icons:
    - vow_sealed: 🔒 "Vow sealed"
    - witness_invited: 📩 "Witness invited"
    - witness_accepted: ✅ "{name} accepted"
    - challenge_sent: ⚔️ "Challenge sent"
    - challenge_accepted: ✅ "Challenge accepted"
    - check_in: 📋 "Checked in: {type}"
    - verdict_submitted: ⚖️ "Verdict: {verdict}"
    - vow_voided: 🚫 "Vow withdrawn"
    - refund_issued: 💰 "Refund issued"
  - Future marker if active: "⏳ Verdict day — {date}"
- **Actions block:**
  - Share (Expo Share API)
  - Text witness/maker (Linking.openURL for SMS)
  - Withdraw vow (with confirmation Alert, calls voidVowV2)
    - Only show for maker, only when active/awaiting_verdict

### Design Requirements
- Background: `#030508`
- Primary accent: `#D4A24F` (gold)
- Text: `#F5F5F7` (primary), `#8A8A8E` (muted)
- Cards: `rgba(255,255,255,0.04)` background, `rgba(255,255,255,0.08)` border
- Border radius: 16px for cards
- Padding: 16px horizontal, 12px vertical on cards
- Touch targets: minimum 44px
- Font sizes: 24px title, 17px body, 13px caption
- Animations: FadeIn on mount, subtle scale on press for cards
- Progress bar height: 4px, rounded ends
- Status dots: 8px diameter

### VowRow type (for reference):
```typescript
interface VowRow {
  id: string
  user_id: string
  raw_input: string
  refined_text: string
  status: 'draft' | 'sealed' | 'active' | 'awaiting_verdict' | 'kept' | 'broken' | 'voided'
  vow_type: 'self' | 'challenge'
  witness_name: string
  witness_phone: string | null
  witness_user_id: string | null
  witness_accepted_at: string | null
  witness_declined: boolean
  target_user_id: string | null
  target_phone: string | null
  challenge_status: 'pending' | 'accepted' | 'declined' | null
  challenge_invite_token: string | null
  stake_amount: number
  consequence: string
  destination: string
  starts_at: string | null
  ends_at: string | null
  verdict: 'kept' | 'broken' | null
  sealed_at: string | null
  created_at: string
}
```

### AuditEvent type:
```typescript
interface AuditEvent {
  id: string
  vow_id: string
  event_type: string
  actor_type: 'maker' | 'witness' | 'target' | 'system'
  actor_id: string | null
  metadata: Record<string, any>
  created_at: string
}
```

---

## Expected Output from Rork
- Dashboard screen component (1 file)
- Vow detail screen component (1 file)
- VowCard component (1 file, or inline)
- Any supporting components (progress bar, timeline, etc.)

## Phase 11 Will
- Wire these screens to real data
- Fix any integration issues
- Add navigation from existing screens
- Test cross-platform
