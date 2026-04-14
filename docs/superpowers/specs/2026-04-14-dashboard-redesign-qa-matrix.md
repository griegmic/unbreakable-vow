# Dashboard Redesign — QA Verification Matrix

**Date:** 2026-04-14
**Companion to:** `2026-04-14-dashboard-redesign-prd.md`
**Total test cases:** 108
**P0 (merge blocker): 48 | P1 (release blocker): 40 | P2 (non-blocking): 20**

---

## A. State Rendering — Hero View (dashboardVows.length === 1)

| # | Precondition | Action | Expected Result | Pri |
|---|-------------|--------|-----------------|-----|
| A1 | 1 vow: M1 (self-resolve, just me) | Load /dashboard | Hero view. "Your call" label, orange pulsing dot, "Time's up", progress bar 100% (orange-red), two buttons "I kept it" / "I broke it", "Make a vow →" link | P0 |
| A2 | A1 state | Tap "I kept it" | Navigates to /self-resolve?id={id}&choice=kept. Choice pre-selected. | P0 |
| A3 | A1 state | Tap "I broke it" | Navigates to /self-resolve?id={id}&choice=broken. Choice pre-selected. | P0 |
| A4 | 1 vow: M2 (awaiting verdict, witness accepted) | Load /dashboard | Hero view. "Awaiting verdict" label, orange pulsing dot, "Time's up", witness block "{name} has the call" amber border, CTA "Make a new vow", secondary "Nudge {name}" | P0 |
| A5 | A4 state | Tap "Nudge {name}" | Opens SMS/message compose to witness phone | P1 |
| A6 | 1 vow: M3 (unwitnessed) | Load /dashboard | Hero view. "Unwitnessed" label, orange dot, "{name} never accepted" orange text, "Self-resolve →" button | P0 |
| A7 | A6 state | Tap "Self-resolve →" | Navigates to /self-resolve?id={id} | P0 |
| A8 | 1 vow: M4 (active, witness accepted) | Load /dashboard | Hero. "Active", green dot, "{X} days left", witness block "{name} is watching" green dot + chevron, CTA "Send {name} a message" | P0 |
| A9 | 1 vow: M5 (active, just me) | Load /dashboard | Hero. "Active", green dot, "{X} days left", no witness block, CTA "Check in", "Just you · {stake}" | P0 |
| A10 | 1 vow: M6 (active, witness pending) | Load /dashboard | Hero. "Active", green dot, "{X} days left", witness block "{name} hasn't accepted" orange text | P1 |
| A11 | 1 vow: M7 (sealed) | Load /dashboard | Hero. Same as M4/M5/M6 depending on witness state. Status "Active" | P1 |
| A12 | 1 vow: M8 (draft) | Load /dashboard | Hero. "Draft", muted dot, no progress bar, no countdown, CTA "Seal this vow" | P0 |
| A13 | A12 state | Tap "Seal this vow" | Navigates to /seal?id={id} | P0 |
| A14 | 1 vow: M9 (dare sent) | Load /dashboard | Hero. "Dare sent", muted dot, "Waiting on {target}", CTA "Nudge {target}" | P1 |
| A15 | 1 vow: M10 (challenge active) | Load /dashboard | Hero. "Active", green dot, "{X} days left", "Dared {target} · watching" | P1 |
| A16 | 1 vow: M11 (challenge verdict) | Load /dashboard | Hero. "Your call", orange pulsing dot, "Time's up", "You're judging {target}", "Deliver verdict" gold CTA | P0 |
| A17 | 1 vow: W1 (witness verdict due) | Load /dashboard | Hero. "You judge", blue pulsing dot, "Time's up", "By {maker_display_name}" (NOT "By someone"), "Deliver your verdict" blue CTA | P0 |
| A18 | A17 state | Tap "Deliver your verdict" | Navigates to /w/{token}/verdict | P0 |
| A19 | 1 vow: W2 (witnessing active) | Load /dashboard | Hero. "Witnessing", blue dot, "{X} days left", "By {maker_display_name}" (NOT "By someone"), CTA "Send {maker} a message" | P0 |
| A20 | 1 vow: T1 (challenge received) | Load /dashboard | Hero. "Dare from {maker_name}", orange dot, "Accept" (gold 52px) / "Decline" (muted 52px) | P0 |
| A21 | A20 state | Tap "Accept" | API call. Green checkmark animation (1s). Card transitions to T2 on refresh. | P0 |
| A22 | A20 state | Tap "Decline" | Confirm dialog. On confirm: decline API. Vow voided. Dashboard updates. | P0 |
| A23 | 1 vow: T2 (accepted challenge, active) | Load /dashboard | Hero. "Your dare", green dot, "{X} days left", "Dared by {maker_name} · {stake}" | P1 |
| A24 | 1 vow: T3 (accepted challenge, awaiting) | Load /dashboard | Hero. "Time's up", orange pulsing dot, "Dared by {maker_name}", no action buttons | P1 |
| A25 | Hero view, any state | Tap vow text | Navigates to /vow/{id} | P1 |
| A26 | Hero with witness block | Tap witness block chevron | Navigates to /vow/{id} | P1 |
| A27 | Hero, vow has no ends_at | Load /dashboard | No progress bar, no countdown. Witness block and CTA still present | P1 |
| A28 | Hero, user has 3 kept + 2 streak | Check header | Stats "3 kept · 2 streak" inline near gear | P1 |
| A29 | Hero, user has 0 kept | Check header | No stats. Hamburger + badge + gear only | P1 |

---

## B. State Rendering — Smart Stack (dashboardVows.length >= 2)

| # | Precondition | Action | Expected Result | Pri |
|---|-------------|--------|-----------------|-----|
| B1 | 2+ vows, includes M1 | Load /dashboard | Stack. M1 card: c-urgent (orange glow), "Your call", orange pulsing dot, "Kept ✓"/"Broken ✗" buttons (44px) | P0 |
| B2 | B1 state | Tap "Kept ✓" on M1 card | Navigates to /self-resolve?id={id}&choice=kept. stopPropagation prevents card tap | P0 |
| B3 | 2+ vows, includes M2 | Load /dashboard | M2 card: c-waiting (left amber accent), "Awaiting verdict", "{name} deciding", chevron, no buttons | P0 |
| B4 | 2+ vows, includes M3 | Load /dashboard | M3 card: c-urgent (orange glow), "Unwitnessed", "{name} never accepted" orange text, "Self-resolve →" button | P0 |
| B5 | 2+ vows, includes M4 | Load /dashboard | M4 card: c-active (gold border), "Active", green dot, "{X} days left", "{name} · watching", 3px progress bar, chevron | P0 |
| B6 | 2+ vows, includes M8 | Load /dashboard | M8 card: c-draft (dashed, 75% opacity), "Draft", muted dot, "Tap to seal →" gold text | P1 |
| B7 | B6 state | Tap M8 card body | Navigates to /seal?id={id} | P1 |
| B8 | 2+ vows, includes M11 | Load /dashboard | M11 card: c-urgent, "Your call", "You're judging {target}", "Deliver verdict →" gold button | P0 |
| B9 | 2+ vows, includes W1 | Load /dashboard | W1 card: c-action-blue (blue glow), "You judge", blue pulsing dot, "By {maker_display_name}", "Deliver your verdict →" blue button | P0 |
| B10 | 2+ vows, includes W2 | Load /dashboard | W2 card: c-witness (left blue accent), "Witnessing", blue dot, "By {maker_display_name}", chevron | P0 |
| B11 | 2+ vows, includes T1 | Load /dashboard | T1 card: c-urgent, "Dare from {name}", Accept (gold 44px) / Decline (muted 44px) | P0 |
| B12 | B11 state | Tap "Accept" on T1 | API call. Green checkmark (1s). Card transitions on refresh | P0 |
| B13 | 2+ vows, includes T2 | Load /dashboard | T2 card: c-active, "Your dare", green dot, "Dared by {maker_name}" | P1 |
| B14 | 2+ vows, includes T3 | Load /dashboard | T3 card: c-waiting (left amber accent), "Time's up", "Dared by {maker_name}" | P1 |
| B15 | 2+ vows, includes M9 | Load /dashboard | M9 card: c-pending (75% opacity), "Dare sent", muted dot, "Waiting on {target}" | P1 |
| B16 | Non-action card | Verify chevron | Small right-chevron visible in c-top row | P1 |
| B17 | Action button card | Tap action button | stopPropagation works — card body tap NOT triggered | P0 |

---

## C. Hero/Stack Threshold & Edge Cases

| # | Precondition | Action | Expected Result | Pri |
|---|-------------|--------|-----------------|-----|
| C1 | 0 vows total (new user) | Navigate to /dashboard | Redirect to /?new=1 | P0 |
| C2 | 0 non-terminal, 5 kept vows | Navigate to /dashboard | Redirect to /?new=1&returning=1 | P0 |
| C3 | 0 non-terminal, 3 kept + 1 broken | Navigate to /dashboard | Redirect to /?new=1&returning=1 (keptCount > 0) | P0 |
| C4 | 0 non-terminal, 0 kept, 2 voided | Navigate to /dashboard | Redirect to /?new=1 | P1 |
| C5 | Exactly 1 active vow | Load /dashboard | Hero view (not stack) | P0 |
| C6 | Exactly 1 witnessing vow | Load /dashboard | Hero with witnessing vow | P0 |
| C7 | Exactly 1 draft vow | Load /dashboard | Hero with draft | P0 |
| C8 | 1 active + 1 draft | Load /dashboard | Stack view (2 vows) | P0 |
| C9 | 1 active + 1 witnessing | Load /dashboard | Stack view (2 vows) | P0 |
| C10 | 1 active + 1 challenge pending | Load /dashboard | Stack view (2 vows) | P0 |
| C11 | 5+ vows | Load /dashboard | Stack. Cards scroll normally (fade gradient deferred) | P2 |

---

## D. Sort Order Verification

| # | Precondition | Action | Expected Result | Pri |
|---|-------------|--------|-----------------|-----|
| D1 | M1 + M4 + M8 | Load /dashboard | Order: M1 (tier 1) → M4 (tier 3) → M8 (tier 6) | P0 |
| D2 | W1 + M2 + M5 | Load /dashboard | Order: W1 (tier 1) → M2 (tier 2) → M5 (tier 3) | P0 |
| D3 | T1 + M1 + W1 | Load /dashboard | All tier 1. Oldest ends_at first | P0 |
| D4 | M3 + M1 | Load /dashboard | Both tier 1. Older ends_at first | P1 |
| D5 | M11 + W1 | Load /dashboard | Both tier 1. Oldest ends_at first | P1 |
| D6 | Two M4s: 3 days left vs 10 days | Load /dashboard | 3-day vow appears first | P0 |
| D7 | M4 (with ends_at) + M4 (no ends_at) | Load /dashboard | With-ends_at first | P1 |
| D8 | Two M9s: created today vs yesterday | Load /dashboard | Today's first (newest) | P2 |
| D9 | Two M8s: created today vs 3 days ago | Load /dashboard | Today's first (newest) | P2 |
| D10 | W2 + M4 | Load /dashboard | M4 (tier 3) before W2 (tier 4) | P1 |

---

## E. Stats Display

| # | Precondition | Action | Expected Result | Pri |
|---|-------------|--------|-----------------|-----|
| E1 | kept=0, streak=0 | Load /dashboard | No stats in header | P0 |
| E2 | kept=5, streak=1 | Load /dashboard | "5 kept" only | P0 |
| E3 | kept=5, streak=3 | Load /dashboard | "5 kept · 3 streak" | P0 |
| E4 | kept=1, streak=0 | Load /dashboard | "1 kept" | P1 |
| E5 | Stats text | Inspect | 12px, green (#52d69a) for number | P1 |
| E6 | 3 kept, 1 voided, 2 kept (chronological) | Check streak | Streak = 5 (voided skipped) | P0 |
| E7 | 2 kept, 1 broken, 5 kept (chronological) | Check streak | Streak = 2 (broken breaks) | P0 |

---

## F. Navigation Targets

| # | Precondition | Action | Expected Result | Pri |
|---|-------------|--------|-----------------|-----|
| F1 | Any view | Tap hamburger | SlideMenu opens | P0 |
| F2 | Any view | Tap gear icon | /settings | P0 |
| F3 | Stack, M4 card | Tap card body | /vow/{id} | P0 |
| F4 | Stack, W1 card | Tap "Deliver verdict" button | /w/{token}/verdict | P0 |
| F5 | Stack, M8 card | Tap card body | /seal?id={id} | P0 |
| F6 | Stack | Tap footer "Make a vow" | /create | P0 |
| F7 | Stack, completed vows exist | Tap "View history →" | /history | P1 |
| F8 | Hero | Tap "Make a vow →" | /create | P1 |
| F9 | Stack, 0 completed vows | Check below cards | No history link | P1 |
| F10 | 0 non-terminal, keptCount > 0 | Navigate to /dashboard | Redirect to /?new=1&returning=1 | P0 |
| F11 | (removed — victory state cut) | — | — | — |

---

## G. Edge Cases & Error States

| # | Precondition | Action | Expected Result | Pri |
|---|-------------|--------|-----------------|-----|
| G1 | Not authenticated | Navigate to /dashboard | Redirect to / | P0 |
| G2 | Auth loading | Navigate to /dashboard | Spinner | P0 |
| G3 | Data loading | Navigate to /dashboard | Spinner until resolved | P0 |
| G4 | Vow with no starts_at/ends_at (card) | Load /dashboard | No progress bar, no time text, all else normal | P1 |
| G5 | Unfinished flow in localStorage | Load /dashboard (stack) | InProgressBanner appears between header and cards | P1 |
| G6 | No unfinished flow | Load /dashboard | No banner | P2 |
| G7 | Network error on "Accept" | Tap Accept offline | Toast with error + retry. Card unchanged | P1 |
| G8 | Network error on "Deliver verdict" | Tap button, API fails | Toast with error + retry | P1 |
| G9 | Network error on "Decline" | Tap Decline, confirm, API fails | Toast with error. Card unchanged | P1 |
| G10 | challenge_status = 'expired' | Load /dashboard | NOT shown on dashboard | P1 |
| G11 | witness_declined = true | Load /dashboard | Vow renders based on status (may be M3 path) | P2 |

---

## H. Stale Data / Refresh

| # | Precondition | Action | Expected Result | Pri |
|---|-------------|--------|-----------------|-----|
| H1 | Dashboard loaded, 30s pass | Wait | Auto-refresh. State changes reflected | P0 |
| H2 | Resolve vow on /self-resolve, press back | Return to /dashboard | visibilitychange fires fetchData(). Resolved vow gone. Victory state if last vow. | P0 |
| H3 | Switch browser tab, switch back | Tab visible | visibilitychange fires. Fresh data. | P1 |
| H4 | Challenge accepted on another device | Wait 30s or tab-switch | Card transitions T1 → T2 | P2 |

---

## I. Visual / Accessibility

| # | Precondition | Action | Expected Result | Pri |
|---|-------------|--------|-----------------|-----|
| I1 | Card with action buttons | Measure height | All buttons ≥ 44px (Apple HIG) | P0 |
| I2 | Hero buttons | Measure height | 52px | P1 |
| I3 | Footer button | Measure height | 56px | P1 |
| I4 | c-waiting card | Inspect | Left orange border accent (3px) visible | P1 |
| I5 | c-witness card | Inspect | Left blue border accent (3px) visible | P1 |
| I6 | c-draft card | Inspect | Dashed border, 75% opacity, legible text | P1 |
| I7 | Urgent dot | Inspect | Orange #FB923C, distinct from gold #d4a24f | P1 |
| I8 | Hero vow text | Inspect font | Georgia, 24px, weight 400 (normal) | P1 |
| I9 | Card padding | Inspect | 14px uniform | P2 |
| I10 | Border-radius | Inspect | Cards: 16px. Card btns: 12px. Hero btns: 14px. Footer: 16px | P2 |
| I11 | Card progress bar (3px) | Inspect | Solid color, NOT gradient | P2 |
| I12 | Hero progress bar (6px) | Inspect | Gradient | P2 |
| I13 | Stack 5+ cards | Scroll | Cards scroll normally (fade gradient deferred) | P2 |
| I14 | Footer CTA | Scroll content | Sticky bottom (gradient fade deferred) | P2 |
| I15 | Urgent dot pulse | Inspect | opacity 1→0.4 over 2s infinite | P2 |
| I16 | Card tap | Tap card | scale(0.98) on active | P2 |
| I17 | Button tap | Tap button | scale(0.97) on active | P2 |
| I18 | Screen reader | VoiceOver | Card announces state, vow text, time. Buttons focusable | P2 |

---

## J. Component Isolation

| # | Precondition | Action | Expected Result | Pri |
|---|-------------|--------|-----------------|-----|
| J1 | VowCard component | Check /history page | Renders identically. No changes. | P0 |
| J2 | SlideMenu | Open from dashboard | All items present, same animation | P0 |
| J3 | InProgressBanner | Trigger unfinished flow | Banner appears, tapping continues | P1 |
| J4 | /self-resolve with ?choice=kept | Navigate | Choice pre-selected. Oath still required. | P0 |
| J5 | /self-resolve without choice param | Navigate | Works as before. No pre-selection. | P0 |
