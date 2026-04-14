# Dashboard Redesign — PRD (Final)

**Date:** 2026-04-14
**Source of truth:** `dashboard-final-mockups.html`
**Scope:** Replace the current sectioned dashboard (`/dashboard`) with a single-vow hero view (1 vow) or urgency-sorted Smart Stack (2+ vows).
**Reviewed by:** Shreyas Doshi (product), Julie Zhuo (design), Soren Iversen (visual systems), CTO Architect (technical), QA Lead (verification)

---

## 0. Job to Be Done

**"When I open this app, I need to know — in under 2 seconds — whether I need to do something right now, and if not, whether my vows are on track."**

The dashboard is a motivation management tool, not an information display. Users arrive in one of three emotional states:
1. **Guilt/anxiety** — "I might be failing." → Show clear action or reassurance.
2. **Pride/momentum** — "I'm crushing it." → Acknowledge with stats.
3. **Obligation** — "Someone sent me something." → Fast path to respond.

Every design decision below serves this JTBD.

---

## 1. State Machine — Every Card State

Each row defines exactly how a vow renders on the dashboard. "Role" is relative to the authenticated user. Urgent dot color is `#FB923C` (orange) to visually separate from active gold (`#d4a24f`).

### 1.1 My Vows (role = maker)

| # | Status | Vow Type | Challenge Status | Witness State | Card Style | Status Label | Dot Color | Pulse? | Time Text | Meta Line | Action Buttons | Tap Target |
|---|--------|----------|-----------------|---------------|------------|-------------|-----------|--------|-----------|-----------|----------------|------------|
| M1 | `awaiting_verdict` | `self` | — | `witness_name = 'Just me'` | `c-urgent` (orange glow) | **Your call** | `#FB923C` | Yes | "Time's up" | (none — buttons replace meta) | `Kept ✓` → `/self-resolve?id={id}&choice=kept`, `Broken ✗` → `/self-resolve?id={id}&choice=broken` | `/self-resolve?id={id}` |
| M2 | `awaiting_verdict` | `self` | — | accepted (`witness_accepted_at` set) | `c-waiting` (dim amber, left accent) | **Awaiting verdict** | `#FB923C` | Yes | "Time's up" | "{witness_name} deciding" | None | `/vow/{id}` |
| M3 | `awaiting_verdict` | `self` | — | pending (no `witness_accepted_at`, name ≠ 'Just me') | `c-urgent` (orange glow) | **Unwitnessed** | `#FB923C` | Yes | "Time's up" | "{witness_name} never accepted" (orange text) | `Self-resolve →` (orange full-width) → `/self-resolve?id={id}` | `/vow/{id}` |
| M4 | `active` | `self` | — | accepted | `c-active` (gold border) | **Active** | `#52d69a` | No | "{X} days left" | "{witness_name} · watching" | None | `/vow/{id}` |
| M5 | `active` | `self` | — | `witness_name = 'Just me'` | `c-active` (gold border) | **Active** | `#52d69a` | No | "{X} days left" | "Just you · {stake_label}" | None | `/vow/{id}` |
| M6 | `active` | `self` | — | pending (no `witness_accepted_at`, name ≠ 'Just me') | `c-active` (gold border) | **Active** | `#52d69a` | No | "{X} days left" | "{witness_name} · hasn't accepted" (orange text) | None | `/vow/{id}` |
| M7 | `sealed` | `self` | — | any | `c-active` (gold border) | **Active** | `#52d69a` | No | "{X} days left" | Same as M4/M5/M6 logic | None | `/vow/{id}` |
| M8 | `draft` | `self` | — | any | `c-draft` (dashed, 75% opacity) | **Draft** | `#5a5650` | No | (none) | "Tap to seal →" (gold text) | None | `/seal?id={vow.id}` |
| M9 | `draft` | `challenge` | `pending` | — | `c-pending` (dim, 75% opacity) | **Dare sent** | `#8a8578` | No | "Waiting on {target}" | (none) | None | `/vow/{id}` |
| M10 | `active` | `challenge` | `accepted` | — | `c-active` (gold border) | **Active** | `#52d69a` | No | "{X} days left" | "Dared {target} · watching" | None | `/vow/{id}` |
| M11 | `awaiting_verdict` | `challenge` | `accepted` | — | `c-urgent` (orange glow) | **Your call** | `#FB923C` | Yes | "Time's up" | "You're judging {target}" | `Deliver verdict →` (full-width gold) → verdict flow | `/vow/{id}` |

**Key changes from v1:** M1/M3 buttons pass `&choice=` param. M3 renamed "Unwitnessed" with self-resolve action (Tier 1). M8 tap target resolved to `/seal`. M11 promoted to `c-urgent` with verdict button (Tier 1). Dot colors shifted from amber `#F59E0B` to orange `#FB923C` for all urgent states.

### 1.2 Vows I'm Witnessing (role = witness)

| # | Status | Card Style | Status Label | Dot Color | Pulse? | Time Text | Meta Line | Action Buttons | Tap Target |
|---|--------|------------|-------------|-----------|--------|-----------|-----------|----------------|------------|
| W1 | `awaiting_verdict` | `c-action-blue` (blue glow) | **You judge** | `#60A5FA` | Yes | "Time's up" | "By {maker_display_name} · {stake_label}" | `Deliver your verdict →` (full-width blue) | `/w/{witness_invite_token}/verdict` |
| W2 | `active` | `c-witness` (dim blue, left accent) | **Witnessing** | `#60A5FA` | No | "{X} days left" | "By {maker_display_name} · {stake_label}" | None | `/vow/{id}` |

**Key change:** `{maker_display_name}` resolved via server-side function (see Section 10.2). Never shows "By someone."

### 1.3 Challenges I Received (role = target)

| # | Challenge Status | Vow Status | Card Style | Status Label | Dot Color | Pulse? | Time Text | Meta Line | Action Buttons | Tap Target |
|---|-----------------|-----------|------------|-------------|-----------|--------|-----------|-----------|----------------|------------|
| T1 | `pending` | any | `c-urgent` (orange glow) | **Dare from {maker_name}** | `#FB923C` | No | (none) | (none — buttons replace meta) | `Accept` (gold) / `Decline` (muted). On accept: green checkmark animation (1s) before transition. | Card tap → `/c/{challenge_invite_token}` |
| T2 | `accepted` | `active` | `c-active` (gold border) | **Your dare** | `#52d69a` | No | "{X} days left" | "Dared by {maker_name} · {stake_label}" | None | `/vow/{id}` |
| T3 | `accepted` | `awaiting_verdict` | `c-waiting` (dim amber, left accent) | **Time's up** | `#FB923C` | Yes | "Time's up" | "Dared by {maker_name}" | None (maker/witness judges) | `/vow/{id}` |

### 1.4 States That Do NOT Appear on Dashboard

| Status | Why |
|--------|-----|
| `kept` | Lives in History page only |
| `broken` | Lives in History page only |
| `voided` | Lives in History page only |
| `challenge_status = 'declined'` | Vow becomes voided → not shown |
| `challenge_status = 'expired'` | Vow becomes voided → not shown |

**Rule: No terminal vows on the dashboard. Ever.**

---

## 2. Branching Logic — Hero vs Smart Stack

### 2.1 What Counts

Define `dashboardVows` as the union of:
- My non-terminal vows: `myVows.filter(v => !['kept', 'broken', 'voided'].includes(v.status))`
- Witnessing vows: all `witnessingVows` (already filtered to `active` + `awaiting_verdict`)
- Pending challenges I received: all `challenges` (already filtered to `challenge_status = 'pending'`)

### 2.2 Threshold

| Count of `dashboardVows` | User History | View |
|---------------------------|-------------|------|
| 0 | `keptCount > 0` (returning user) | Redirect to `/?new=1&returning=1` (landing page adapts for returning users) |
| 0 | `keptCount === 0` (truly new) | Redirect to `/?new=1` |
| 1 | any | **Single-vow hero view** |
| 2+ | any | **Multi-vow Smart Stack** |

### 2.3 Edge Cases

| Scenario | Result |
|----------|--------|
| 1 active vow + 0 witnessing + 0 challenges | Hero |
| 0 active + 1 witnessing | Hero (witnessing vow gets hero treatment) |
| 1 draft only | Hero (draft gets hero treatment) |
| 1 active + 1 draft | Stack (2 vows) |
| 0 non-terminal my-vows + 0 witnessing + 0 challenges, but 5 kept vows | Redirect to `/?new=1&returning=1` |
| 1 active + 1 pending challenge received | Stack (2 vows) |
| 0 vows total, 0 history | Redirect to `/?new=1` |

### 2.4 All-Terminal Redirect

When `dashboardVows.length === 0` AND `keptCount > 0`, redirect to `/?new=1&returning=1`. The landing page can use the `returning` param to show a "Welcome back" message instead of treating the user as brand new. This avoids building a separate victory component while still acknowledging the user's history.

When `dashboardVows.length === 0` AND `keptCount === 0`, redirect to `/?new=1` (existing behavior).

---

## 3. Sort Order — Urgency Algorithm

All `dashboardVows` are sorted into a single flat list. No section headers. Visual hierarchy (colors, buttons, glows) replaces sections.

### 3.1 Tier Assignment

Each vow gets a tier number. Lower tier = higher in the list.

| Tier | Condition | Why |
|------|-----------|-----|
| 1 | M1: Self-resolve needed (`awaiting_verdict` + self-vow) | **I must act** — buttons on card |
| 1 | M3: Unwitnessed (`awaiting_verdict` + witness never accepted) | **I must act** — self-resolve button |
| 1 | M11: Challenge verdict (maker judges target's challenge) | **I must act** — verdict button |
| 1 | W1: Deliver verdict (witnessing vow `awaiting_verdict`) | **I must act** — verdict button |
| 1 | T1: Challenge received (`challenge_status = 'pending'`, `role = target`) | **I must act** — accept/decline buttons |
| 2 | M2: Awaiting verdict (witness is deciding) | **Waiting on others** — no buttons |
| 2 | T3: Challenge awaiting verdict (maker/witness judges, I'm target) | **Waiting on others** — no buttons |
| 3 | Active vows: `status` in `['active', 'sealed']` (M4-M7, M10, T2) | **In progress** — sorted by deadline |
| 4 | W2: Witnessing (active) | **Watching others** — lower priority |
| 5 | M9: Pending dares sent | **Waiting on response** — dim |
| 6 | M8: Drafts | **Unfinished** — dashed, lowest |

### 3.2 Tiebreakers Within Tiers

| Tier | Tiebreaker |
|------|------------|
| 1 (action needed) | Oldest `ends_at` first (longest overdue gets priority). If no `ends_at`, `created_at` ascending. |
| 2 (waiting) | Oldest `ends_at` first (longest overdue). |
| 3 (active) | Soonest `ends_at` first (closest deadline = most urgent). If no `ends_at`, `created_at` ascending. |
| 4 (witnessing) | Soonest `ends_at` first. |
| 5 (dares sent) | `created_at` descending (newest first). |
| 6 (drafts) | `created_at` descending (newest first). |

---

## 4. Single-Vow Hero View

When `dashboardVows.length === 1`, the single vow expands to fill the page. No card — the vow IS the page.

### 4.1 Layout (top to bottom)

1. **Header bar** — hamburger (left) + "Unbreakable Vow" badge + stats (if applicable, per 4.4) + settings gear (right)
2. **Vow text** — large serif, 24px, weight normal (400), quoted with curly quotes: `"Book France by Sunday."` **Tapping vow text navigates to `/vow/{id}`.**
3. **Progress bar** — full-width, 6px height (thicker than card version)
   - Gold gradient (`#d4a24f → #e8c36a`) for normal progress
   - Orange-to-red gradient (`#FB923C → #EF4444`) when time's up (100%)
4. **Countdown line** — left: "Day 22 of 30" or "Time's up" or "Time's up — your call". Right: "8 days left" or "Waiting for {name}'s verdict" or "Just you · no stake"
5. **Witness block** (only if witness ≠ 'Just me') — rounded card with:
   - Green dot + "{name} is watching" + "{stake} · {destination}" subtext + chevron → taps to `/vow/{id}`
   - If `awaiting_verdict`: orange dot (pulsing) + "{name} has the call" + amber border/bg
6. **Spacer** (flex: 1, pushes CTA to bottom)
7. **Primary CTA** — context-dependent (see 4.2)
8. **Secondary link** — "Make a vow →" (muted, centered)

### 4.2 Hero CTA by State

| State | CTA Button | Style | Action | Secondary |
|-------|-----------|-------|--------|-----------|
| M1: Self-resolve | Two side-by-side: "I kept it" (green) / "I broke it" (red) | Green/red bordered buttons with icons, 52px | "I kept it" → `/self-resolve?id={id}&choice=kept`, "I broke it" → `/self-resolve?id={id}&choice=broken` | "Make a vow →" |
| M2: Awaiting verdict (witness decides) | "Make a new vow →" | Gold gradient | Navigate to `/create` | "Nudge {name}" (muted link) |
| M3: Unwitnessed | "Self-resolve →" | Orange gradient | Navigate to `/self-resolve?id={id}` | "Make a vow →" |
| M4/M6/M7: Active (with witness) | "Send {name} a message" | Gold gradient, chat icon | Opens SMS compose | "Make a vow →" |
| M5: Active (self-vow) | "Check in" | Gold gradient | Check-in action | "Make a vow →" |
| M8: Draft | "Seal this vow" | Gold gradient | Navigate to `/seal?id={id}` | "Make a vow →" |
| M11: Challenge verdict | "Deliver verdict →" | Gold gradient | Navigate to verdict flow | "Make a vow →" |
| W1: Witnessing, verdict due | "Deliver your verdict →" | Blue gradient | Navigate to `/w/{token}/verdict` | "Make a vow →" |
| W2: Witnessing, active | "Send {maker} a message" | Gold gradient, chat icon | Opens SMS compose | "Make a vow →" |
| T1: Challenge received | Two side-by-side: "Accept" (gold) / "Decline" (muted) | 52px height | Accept → `/c/{token}`, Decline → confirm + decline | — |
| T2: Challenge active (target) | "Check in" | Gold gradient | Check-in action | "Make a vow →" |
| M9: Dare sent (pending) | "Nudge {target}" | Gold gradient | Opens SMS compose | "Make a vow →" |

### 4.3 Self-Resolve in Hero — Inline vs Navigate

**Decision: Navigate to `/self-resolve`.** The self-resolve page has an oath confirmation step that's critical for integrity. The hero shows the two buttons as the CTA, and tapping either navigates with `&choice=kept` or `&choice=broken` so the self-resolve page **pre-selects the choice**. The user still confirms via oath, but doesn't have to re-choose.

### 4.4 Hero — Stats

Stats show in the header whenever `keptCount > 0` OR `streak > 0`, regardless of hero vs stack view. Display rules per Section 6.2.

### 4.5 Hero — No ends_at

Some vows may not have `ends_at` (open-ended). In this case:
- No progress bar
- No countdown
- Witness block still shows
- CTA still shows

### 4.6 Hero — Witnessing Vow as Hero

If the single vow is a witnessing vow (not the user's own):
- Vow text shows normally
- Countdown line: right side shows "By {maker_display_name} · {stake_label}"
- No witness block (the user IS the witness)
- CTA: "Deliver your verdict →" if `awaiting_verdict`, or "Send {maker_display_name} a message" if active

---

## 5. Multi-Vow Smart Stack

When `dashboardVows.length >= 2`, show the urgency-sorted card list.

### 5.1 Layout (top to bottom)

1. **Header bar** — hamburger (left) + "Unbreakable Vow" badge + stats (right, inline) + settings gear (right)
2. **In-progress banner** (if applicable — see 5.5)
3. **Card stack** — flat list, no section headers, 8px gap between cards. Scrollable if content overflows viewport.
4. **History link** (if user has completed vows) — centered below cards: "{N} vows completed" (tiny, muted) + "View history →"
5. **Footer CTA** — "Make a vow" button (gold gradient). Sticky to viewport bottom with `position: sticky; bottom: 0`.

### 5.2 Card Anatomy

Every card follows this structure (fields shown/hidden per state):

```
┌─────────────────────────────────────┐
│ [dot] STATUS LABEL       TIME   [>] │  ← c-top (chevron on non-action cards)
│                                     │
│ "Vow text in serif font."          │  ← c-txt
│                                     │
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← c-bar (optional)
│                                     │
│ Meta text              $10 stake    │  ← c-bot (optional)
│                                     │
│ [ Kept ✓ ]    [ Broken ✗ ]         │  ← c-actions (optional)
│ [ Deliver your verdict → ]          │  ← c-btn-full (optional)
│ [ Accept ]    [ Decline ]           │  ← c-actions (optional)
└─────────────────────────────────────┘
```

**Chevron:** A small right-chevron (8px, `#3a3530`) appears right-aligned in c-top for all cards with a tap target but NO action buttons (M2, M4-M7, M9-M10, W2, T2, T3). Cards with action buttons (M1, M3, M11, W1, T1) do NOT show chevron — the buttons are the affordance.

### 5.3 Card Visual Styles

| Style Class | Background | Border | Extra | Glow | Opacity | Used For |
|------------|------------|--------|-------|------|---------|----------|
| `c-urgent` | `rgba(251,146,60,0.07)` | `1.5px solid rgba(251,146,60,0.32)` | — | `0 0 16px rgba(251,146,60,0.08)` | 1.0 | Self-resolve (M1), unwitnessed (M3), challenge received (T1), challenge verdict (M11) |
| `c-action-blue` | `rgba(96,165,250,0.07)` | `1.5px solid rgba(96,165,250,0.3)` | — | `0 0 16px rgba(96,165,250,0.08)` | 1.0 | Deliver verdict as witness (W1) |
| `c-waiting` | `rgba(251,146,60,0.04)` | `1.5px solid rgba(251,146,60,0.2)` | `border-left: 3px solid rgba(251,146,60,0.4)` | none | 1.0 | Awaiting verdict from witness (M2), challenge target awaiting (T3) |
| `c-active` | `rgba(212,162,79,0.05)` | `1.5px solid rgba(212,162,79,0.28)` | — | none | 1.0 | Active vows (M4-M7, M10, T2) |
| `c-witness` | `rgba(96,165,250,0.04)` | `1.5px solid rgba(96,165,250,0.18)` | `border-left: 3px solid rgba(96,165,250,0.3)` | none | 1.0 | Witnessing active (W2) |
| `c-pending` | `rgba(212,162,79,0.03)` | `1.5px solid rgba(212,162,79,0.15)` | — | none | 0.75 | Dare sent (M9) |
| `c-draft` | `#12141a` | `1.5px dashed #252320` | — | none | 0.75 | Drafts (M8) |

**Key changes from v1:** Urgent shifted to orange (`#FB923C`/`rgba(251,146,60,...)`). `c-waiting` and `c-witness` get left border accents for differentiation. Draft opacity bumped from 0.6 to 0.75.

### 5.4 Card Content by State

Refer to Section 1 (State Machine) for the exact label, dot color, pulse, time text, meta line, and action buttons per state.

**Progress bar rules:**
- Show on: active, sealed, awaiting_verdict (any vow with `starts_at` AND `ends_at` that isn't a draft or pending dare)
- Height: 3px (card version, vs 6px in hero)
- Card progress bar uses **solid color** (not gradient — imperceptible at 3px): `#d4a24f` for <80% elapsed, `#FB923C` for 80-99%, `#EF4444` for 100%
- Hero progress bar (6px) keeps gradient
- NOT shown on: drafts, pending dares, challenge received cards (T1)

**Stake label rules:**
- `stake_amount > 0`: Show `$XX` in gold text (`#d4a24f`)
- `stake_amount === 0`: Show `no stake` in muted text (`#5a5650`)

### 5.5 In-Progress Banner

The existing `InProgressBanner` component stays. It detects an incomplete vow creation flow in localStorage and shows "You have an unfinished vow — Tap to continue."

**Position:** Between the header and the first card in the stack. Same position as current.

### 5.6 History Link

Shown only when the user has at least 1 terminal vow (kept, broken, or voided).

```
{completedCount} vows completed        ← font-size: 11px, color: #3a3530
View history →                         ← font-size: 12px, color: #5a5650
```

Tapping navigates to `/history`.

Position: Below the last card, above the footer CTA. Centered. Generous padding above (16px+).

---

## 6. Stats Logic

### 6.1 What Counts

| Stat | Counts | Source |
|------|--------|--------|
| **Kept** | Number of vows with `status = 'kept'` where `user_id = me` OR (`target_user_id = me` AND `challenge_status = 'accepted'`) | `myVows` (includes accepted challenges merged in) |
| **Streak** | Consecutive kept vows from most recent backward. **Break on first `broken` terminal vow. `Voided` vows are skipped** (neither break nor extend streak). | Sort all terminal vows by `verdict_at` or `created_at` descending. Count consecutive `kept`, skipping `voided`. |

### 6.2 Display Rules

| Condition | What Shows |
|-----------|-----------|
| `keptCount === 0` AND `streak === 0` | **No stats shown at all** — clean header with just hamburger + badge + gear |
| `keptCount > 0` AND `streak <= 1` | Show: `{N} kept` |
| `keptCount > 0` AND `streak >= 2` | Show: `{N} kept` + `{N} streak` |

Stats show in the header whenever `keptCount > 0` OR `streak > 0`, regardless of hero vs stack vs victory view. Small font (12px), `kept` count in green (`#52d69a`), streak in default text. Positioned inline to the left of the settings gear.

### 6.3 No "Active" Count

The current dashboard shows an "Active" stat pill. **Remove it.** The user can see their active vows — they're literally the cards on the page.

### 6.4 StatPill Removal

The current large `StatPill` components (Active/Kept/Streak as big rounded boxes) are **removed entirely**. Stats move to the compact header format per the mockup.

---

## 7. Empty & Edge States

### 7.1 Zero Vows (Truly New User)

If `myVows.length === 0 AND witnessingVows.length === 0 AND challenges.length === 0`:
→ Redirect to `/?new=1` (existing behavior, preserved exactly)

### 7.2 All Terminal (Returning User)

If user has vows but `dashboardVows.length === 0` AND `keptCount > 0`:
→ Redirect to `/?new=1&returning=1` (see Section 2.4).

If `dashboardVows.length === 0` AND `keptCount === 0` AND only voided vows exist:
→ Redirect to `/?new=1`.

### 7.3 Loading State

Show the existing spinner (centered, gold border, spinning). No skeleton cards. Keep it simple.

### 7.4 Auth Redirect

If `!isAuthenticated && !authLoading`: redirect to `/` (existing behavior, preserved exactly).

### 7.5 Data Refresh

Keep the existing 30-second interval (`setInterval(fetchData, 30000)`).

Additionally, add a `visibilitychange` event listener that triggers `fetchData()` when the page becomes visible (user tabs back or returns from a sub-page). This prevents stale card states after resolving a vow on another page.

### 7.6 Vow With No `starts_at` or `ends_at`

- No progress bar
- No countdown text in the time position — time area in c-top is empty (collapses)
- Card still renders all other fields normally
- Sort: pushed to bottom of its tier (no deadline = lowest urgency within tier)

### 7.7 Error States

Network errors on action buttons (accept, decline, self-resolve, verdict) should show a toast notification with error message and retry option. Card state remains unchanged on failure.

---

## 8. Navigation Map

Every tappable element and where it goes.

### 8.1 Header

| Element | Action |
|---------|--------|
| Hamburger icon (☰) | Opens SlideMenu (existing component) |
| "Unbreakable Vow" badge | No action (decorative) |
| Stats text ("5 kept · 3 streak") | No action (decorative) |
| Settings gear icon | Navigate to `/settings` |

### 8.2 Cards (Smart Stack)

| Card State | Tap (card body) | Action Button(s) |
|-----------|----------------|-------------------|
| M1: Self-resolve | `/self-resolve?id={id}` | "Kept ✓" → `/self-resolve?id={id}&choice=kept`, "Broken ✗" → `/self-resolve?id={id}&choice=broken` |
| M2: Awaiting verdict | `/vow/{id}` | (none) |
| M3: Unwitnessed | `/vow/{id}` | "Self-resolve →" → `/self-resolve?id={id}` |
| M4/M5/M6/M7: Active | `/vow/{id}` | (none) |
| M8: Draft | `/seal?id={id}` | (none — "Tap to seal →" is meta text) |
| M9: Dare sent | `/vow/{id}` | (none) |
| M10: Challenge active | `/vow/{id}` | (none) |
| M11: Challenge verdict | `/vow/{id}` | "Deliver verdict →" → verdict flow |
| W1: Deliver verdict | `/w/{token}/verdict` | "Deliver your verdict →" → `/w/{token}/verdict` |
| W2: Witnessing (active) | `/vow/{id}` | (none) |
| T1: Challenge received | `/c/{token}` | "Accept" → `/c/{token}`, "Decline" → confirm dialog then decline API call. On accept success: green checkmark animation (1s). |
| T2: Challenge active (target) | `/vow/{id}` | (none) |
| T3: Challenge awaiting (target) | `/vow/{id}` | (none) |

**Important:** Action buttons use `e.stopPropagation()` to prevent card-level tap from firing.

### 8.3 Hero View

| Element | Action |
|---------|--------|
| Vow text | Navigate to `/vow/{id}` |
| Witness block (chevron) | Navigate to `/vow/{id}` |
| Primary CTA | Context-dependent (see Section 4.2) |
| "Make a vow →" link | Navigate to `/create` |
| "Nudge {name}" secondary (M2 only) | Opens SMS compose |

### 8.4 Footer & Links

| Element | Action |
|---------|--------|
| "Make a vow" footer button | Navigate to `/create` |
| "View history →" link | Navigate to `/history` |

---

## 9. Visual Spec — Mockup to Code Mapping

### 9.1 Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Vow text (hero) | Georgia / serif | 24px | 400 (normal) | `var(--text)` / `#e8e4dc` |
| Vow text (card) | Georgia / serif | 15px | 500 | `var(--text)` |
| Status label | System / sans | 11px | 700, tracking 0.7px, uppercase | Per-state color |
| Time text | System / sans | 12px | 600 | `#8a8578` default, `#FB923C` if urgent |
| Meta text | System / sans | 12px | 400 | `#5a5650` default, `#FB923C` if witness-pending/unwitnessed |
| Stake text | System / sans | 12px | 600 | `#d4a24f` if staked, `#5a5650` if no stake |
| Stats (header) | System / sans | 12px | 600 | `#5a5650` label, `#52d69a` for kept number |
| Button text (card) | System / sans | 13px | 700 | Per-button color |
| Button text (hero) | System / sans | 14px | 800 | Per-button color |
| "Make a vow" footer | System / sans | 15px | 800 | `#0B0D11` |
| History link | System / sans | 11-12px | 400 | `#3a3530` / `#5a5650` |

### 9.2 Spacing

| Element | Value |
|---------|-------|
| Card padding | 14px |
| Card gap (between cards) | 8px |
| Card border-radius | 16px |
| Card inner gap (between rows) | 7px |
| Hero progress bar height | 6px |
| Card progress bar height | 3px |
| Button height (card) | 44px |
| Button height (card full-width) | 44px |
| Button height (hero) | 52px |
| Button border-radius (card) | 12px |
| Button border-radius (hero) | 14px |
| Footer button height | 56px |
| Footer button border-radius | 16px |

### 9.3 Animations

| Element | Animation |
|---------|-----------|
| Dot pulse (urgent/verdict states) | `@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }` — 2s infinite |
| Card tap | `active:scale-[0.98]` transition |
| Button tap | `active:scale-[0.97]` transition |
| FadeUp on mount | Keep existing `animate-fade-up` with staggered delays |
| Challenge accept confirmation | Green checkmark animation, 1s duration, before card transitions |

### 9.4 Button Styles

| Style | Background | Border | Text Color |
|-------|-----------|--------|------------|
| Gold (accept, primary) | `linear-gradient(135deg, #e8c36a, #d4a24f, #b8882e)` | none | `#0B0D11` |
| Orange (self-resolve action) | `linear-gradient(135deg, #FB923C, #F97316)` | none | `#fff` |
| Green (kept) | `rgba(82,214,154,0.15)` | `1px solid rgba(82,214,154,0.3)` | `#52d69a` |
| Red (broken) | `rgba(239,68,68,0.1)` | `1px solid rgba(239,68,68,0.2)` | `#EF4444` |
| Blue (verdict) | `linear-gradient(135deg, #60A5FA, #3B82F6)` | none | `#fff` |
| Muted (decline) | `#14161c` | `1px solid #3a3530` | `#8a8578` |

---

## 10. Data Queries

### 10.1 Required Queries (same as current, with adjustments)

```
Query 1: My vows
  FROM vows WHERE user_id = me
  ORDER BY created_at DESC
  → myVows

Query 2: Witnessing vows
  FROM vows WHERE witness_user_id = me AND user_id != me
  AND status IN ('active', 'awaiting_verdict')
  ORDER BY ends_at ASC
  → witnessingVows

Query 3: Pending challenges (I'm the target)
  FROM vows WHERE target_user_id = me AND challenge_status = 'pending'
  ORDER BY created_at DESC
  → challenges

Query 4: Accepted challenges (I'm the target, vow is active)
  FROM vows WHERE target_user_id = me AND challenge_status = 'accepted'
  AND status IN ('active', 'awaiting_verdict')
  ORDER BY created_at DESC
  → acceptedChallenges (merged into myVows)
```

### 10.2 Maker Display Name for Witnessing Vows

**Problem:** Witnessing vow cards need the maker's display name ("By {maker_display_name}"), but the `users` RLS only allows reading your own record.

**Solution:** Create a Postgres function `get_display_name(user_uuid)` with `SECURITY DEFINER` that returns `display_name` from `public.users`. This bypasses RLS safely (read-only, non-sensitive field). Call it in the witnessing vows query:

```sql
SELECT *, get_display_name(user_id) as maker_display_name
FROM vows WHERE witness_user_id = $1 AND user_id != $1
AND status IN ('active', 'awaiting_verdict')
```

**Requires:** One new migration file to create the function.

**The meta line MUST show the real maker name. Never "By someone."**

### 10.3 Refresh

- 30-second `setInterval(fetchData, 30000)` (existing)
- `visibilitychange` listener → `fetchData()` on page becoming visible (new)

---

## 11. Destructive Audit — What Must NOT Break

### 11.1 Preserved Components

| Component | Behavior |
|-----------|----------|
| `SlideMenu` | Exact same menu items, exact same animation, exact same behavior |
| `InProgressBanner` | Exact same localStorage detection, exact same rendering |
| Challenge accept/decline | Same API calls (`supabase.functions.invoke('accept-challenge')`), same confirm dialog for decline |
| Auth redirect | `!isAuthenticated → router.replace('/')` |
| Empty redirect | `keptCount === 0` → `/?new=1`. `keptCount > 0` → `/?new=1&returning=1`. |
| 30s data refresh | `setInterval(fetchData, 30000)` + new `visibilitychange` listener |
| `VowCard` component | **NOT MODIFIED.** New card rendering is built as a NEW component. VowCard remains for any other pages that use it. |
| Accepted challenge merge | `myVows` merge logic from current code (line 188) preserved exactly. |

### 11.2 CLAUDE.md "Do Not Break" Verification

| Rule | Status |
|------|--------|
| `/dashboard` route exists | ✅ Same route, new rendering |
| Existing edge function API contracts | ✅ No API changes (verify `submit-verdict` for M11 — see 11.4) |
| Stripe flow | ✅ No payment changes |
| RLS policies | ✅ No policy changes (new function uses SECURITY DEFINER) |
| Other pages listed in CLAUDE.md | ✅ We only modify `/dashboard/page.tsx` |

### 11.3 New Component Strategy

**Do NOT modify `vow-card.tsx`.** It's used elsewhere (history, potentially other pages).

Create new components:
- `dashboard-card.tsx` — purpose-built for the dashboard's visual language
- `dashboard-hero.tsx` — hero view layout
- `dashboard-sort.ts` — tier assignment and sort algorithm (pure function, easily testable)

### 11.4 Action Item: Verify submit-verdict for M11

Before implementing M11's verdict button, verify that the `submit-verdict` edge function allows `user_id` (maker) to submit verdict when `vow_type = 'challenge'`. If not, add the check. This is a 3-line change.

---

## 12. Implementation Checklist

### Phase 1: Migration + Server Function
- [ ] Create `get_display_name(uuid)` SECURITY DEFINER function (migration)
- [ ] Verify `submit-verdict` handles maker-as-judge for challenge vows

### Phase 2: New Components
- [ ] `dashboard-sort.ts` — tier assignment + sort algorithm (pure function)
- [ ] `DashboardCard` component — all 7 card styles, all states from Section 1
- [ ] `DashboardHero` component — hero layout from Section 4

### Phase 3: Dashboard Page Rewrite
- [ ] Replace section-based rendering with hero/stack/victory branching (Section 2)
- [ ] Replace `StatPill` boxes with inline header stats (Section 6)
- [ ] Add history link for users with completed vows (Section 5.6)
- [ ] Add `visibilitychange` listener (Section 7.5)
- [ ] Add error toast for failed actions (Section 7.7)
- [ ] Preserve: SlideMenu, InProgressBanner, auth redirect, challenge handlers, 30s refresh, accepted challenge merge

### Phase 4: Self-Resolve Page Update
- [ ] Accept `?choice=kept` / `?choice=broken` query param and pre-select

---

## 13. What We're NOT Building

- No drag-to-reorder cards
- No card swipe gestures
- No card collapse/expand
- No filtering or search on dashboard
- No "completed" section on dashboard (History page handles this)
- No notification badges on cards
- No card long-press actions
- No animated transitions between hero ↔ stack when vow count changes (just re-render)
- No skeleton loading (keep simple spinner)
- No pull-to-refresh (auto-refresh on 30s interval + visibilitychange is sufficient)
- No intermediate 2-vow density layout (revisit post-launch if transition feels jarring)
- Scroll fade gradient at bottom of card stack (deferred to polish pass)
- Sticky footer gradient fade above "Make a vow" button (deferred to polish pass)
- Card entrance/exit animations deferred to polish pass
- Hero ambient motion (shimmer on progress bar) deferred to polish pass
- CTA pulse animation for self-resolve buttons deferred to polish pass

---

## 14. QA Verification Matrix

**108 test cases across 10 categories. See `2026-04-14-dashboard-redesign-qa-matrix.md` for the full matrix.**

Summary:
- **P0 (must pass before merge): 48 tests** — every state in hero + stack, threshold logic, sort, navigation, auth
- **P1 (must pass before release): 40 tests** — secondary states, stats edge cases, error handling, visual differentiation
- **P2 (should pass, non-blocking): 20 tests** — spacing, border-radius, animation timing, screen reader
