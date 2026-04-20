# Unbreakable Vow — Screen Specifications v1.0

**Scope:** Every route, every state, every interaction. This is the authority for what each screen contains, how it looks, and what happens when the user taps anything.

**Rule:** If the code and this doc disagree, this doc wins — update the code.

**Typography / color / component references** in this file use the tokens defined in `design-system.md`. Do not invent new tokens here.

---

## 0. Navigation map

```
UNAUTHENTICATED:
/                            Marketing landing (first-time users, guests)
/w/[token]                   Witness invite (external, no-auth)
/w/[token]/verdict           Witness verdict page (external)
/c/[token]                   Challenge accept page (external, no-auth initially)
/outcome/[vowId]             Public outcome page (share target)
/certificate/[vowId]         Public certificate page (share target)
/privacy, /terms             Legal pages

AUTHENTICATED (middleware redirect if not signed in):
/dashboard                   Your vows (urgency-sorted home)
/create                      Full creation flow (primary path for new vows)
/vow/[id]                    Single-vow detail (timeline, actions)
/live                        Most-urgent active vow (legacy-compatible redirect target)
/self-resolve                Maker-initiated verdict (emergency, auto-resolve)
/history                     Past vows (kept/broken/voided)
/settings                    Account + payment + sign out
/cast                        Dare-a-friend creation
/vow-kept, /vow-broken       Outcome celebration (internal redirect)
/sent                        Sealed + share (cliffhanger, internal)

LEGACY FLOW (kept for back-compat, styled but de-emphasized):
/refine, /witness, /stake, /seal
  These stay on the existing mid-flow path IF the user is in the legacy multi-page flow
  (VowFlowProvider state). The primary new entry point is /create.

CEREMONY (first-time only, before /):
Rendered inline on / when localStorage flag `uv_ceremony_seen !== '1'`.
Not a separate route.
```

### 0.1 Middleware rules (extends `web/src/middleware.ts`)

- `/witness?token=X` → `/w/X` (existing)
- `/dashboard`, `/create`, `/vow/*`, `/live`, `/self-resolve`, `/history`, `/settings`, `/cast`, `/seal`, `/sent` — if no session, redirect to `/?next=<path>` with cookie preserving intent.
- `/` — always accessible. If authenticated AND has at least one non-void vow → `router.replace('/dashboard')` client-side (after mount, so marketing surface is never flashed).
- `/w/[token]`, `/w/[token]/verdict`, `/c/[token]`, `/outcome/[vowId]`, `/certificate/[vowId]` — public, no auth required, no redirect.

---

## 1. Ceremony (first-time only)

### 1.1 When it shows

**Trigger:** On `/` mount, if `localStorage.getItem('uv_ceremony_seen') !== '1'` AND user is unauthenticated AND not arriving via a token link (witness/challenge).

**Frequency:** Once per browser. After seeing it, the flag is set and user goes straight to landing.

### 1.2 Ceremony screen 1

**Layout:**
- Full-viewport `RitualScreen variant="ceremony"`.
- Centered vertically.
- Content: three lines of `display-md` serif on the user's screen width. Desktop: `display-lg`.

**Copy:**
- Line 1: "Every promise"
- Line 2: "you've ever broken"
- Line 3: "had one thing in common."

Each line fades in with `ceremonyFadeIn` staggered: 0ms, 600ms, 1200ms delays. Full sequence takes ~2s to settle.

**Auto-advance:** 3.2 seconds after line 3 settles. Or tap-anywhere to advance.

**Skip:** top-right corner, 16px from edges. `SecondaryButton` text "Skip →" in `--text-faint`, `caption` style. Only becomes clickable after 600ms (prevents accidental skip).

**Transition out:** `ceremonyFadeOut` 400ms before ceremony screen 2 fades in.

### 1.3 Ceremony screen 2

**Layout:**
- Same container.
- Centered hero with two lines + subtitle + CTA.

**Copy:**
- Line 1 (fades in first, `--text`): "It was"
- Line 2 (fades in 600ms later, `--gold`, italic, `display-lg` size, 1.2× line 1): "free."
- Subtitle (fades in 1400ms later, `body`, `--text-muted`, max-width 320px, centered): "An Unbreakable Vow — a vow to be better, sworn to a friend. Break it, and you'll pay."

**CTA** (fades in last, 2000ms): `PrimaryButton` "Begin →", full-width in the 440px column.

**On tap CTA:**
- `localStorage.setItem('uv_ceremony_seen', '1')`
- Ceremony fades out, landing page fades in in place (no route change).

**Skip button (same as screen 1):** also sets flag and reveals landing.

### 1.4 Accessibility

- Each ceremony screen has `role="dialog"` and `aria-live="polite"` on the fade-in copy so screen readers announce each line as it appears.
- `prefers-reduced-motion`: the fade-in durations shorten to 100ms and staggering to 200ms. Sequence completes in ~600ms.

---

## 2. Landing `/` (marketing surface, first-time + guest)

### 2.1 Who sees it

Unauthenticated users, or authenticated users with **zero** non-void vows (extremely rare edge case — normally dashboard shows empty state).

### 2.2 Layout (mobile)

Top to bottom:
1. `AppChrome` (logo + wordmark), top-left
2. Hero — two lines of `display-lg` serif (mobile) or `display-xl` (desktop)
   - Line 1 (`--text`, regular): "You say a lot."
   - Line 2 (`--gold`, italic): "*This time vow it.*"

   On narrow viewports the gold italic line wraps naturally after "This time" into "vow it." — matches the reference screenshot. Do not force a break; let the font metrics do it. Keep the period inside the italic.
3. Subhead: 16px `body-lg`, `--text` (not muted — this reads as body, not caption), `line-height: 1.5`, 20px top margin, max-width 340px.
   - "Put $$ on a goal. A friend decides if you pulled it off."
   - `$$` renders literal — don't substitute or escape.
4. Live feed (see §2.3)
5. `flex: 1` spacer (pushes CTAs to bottom)
6. Primary CTA: `PrimaryButton` "Make your vow →"
7. Secondary CTA: `SecondaryButton` "Dare a friend →", centered, 12px top margin

### 2.3 Live feed

- Header: `feed-header` flex-between, label "THIS WEEK" (`label` style, `--text-faint`) + live indicator (6px `--success` dot with `goldDotPulse` animation + "Live" in `body-sm` `--text-muted`)
- 5 rows (FeedRow component), 24px top margin:

| # | Vow (text-muted, body-sm) | Stake (gold, body-sm, weight 500) |
|---|---|---|
| 1 | Gym 3x this week | $50 |
| 2 | Out of bed by 8am, 7 days | $10 |
| 3 | No alcohol, 2 weeks | $25 |
| 4 | No texting my ex, 30 days | $75 |
| 5 | Delete TikTok for a week | $25 |

**These rows are static content.** Not fetched from DB. The "live" framing is marketing — don't wire to real data. Rotate the list every ~6 weeks via code commit to keep fresh.

### 2.4 States

| State | Trigger | Behavior |
|---|---|---|
| Default | First load, ceremony done | Render as above |
| Ceremony pending | `uv_ceremony_seen !== '1'` | Render ceremony INSTEAD (see §1) |
| Authenticated with vow | Session exists, vow count > 0 | `router.replace('/dashboard')` on mount |
| Coming from OAuth callback | `?from=auth` or cookie | Show small "Welcome" toast (3s auto-dismiss) then continue |

### 2.5 Interactions

- Tap "Make your vow →" → `router.push('/create')` (no auth gate yet — that's at `/seal`)
- Tap "Dare a friend →" → `router.push('/cast')` (this IS auth-gated — tapping while unauth opens AuthModal with "Sign in to dare a friend" subtext; after auth, redirect to `/cast`)
- Tap logo → already on landing, no-op
- Live feed rows are decorative — no tap handler

### 2.6 Desktop variant (≥900px)

Same content, single column, centered in a 480px max-width container. The landing is one scrollable unit at every breakpoint — mobile-first, not mobile-only. No two-column grid, no desktop-exclusive explainer card band. The five-row live feed does the explanation at every size.

If desktop feels visually thin, scale up:
- Hero `display-xl` → increase to `display-2xl` (see design-system.md scale)
- Feed row height → 56px from 48px
- CTA pill width → same 480px column, taller (56px)

But the structure stays: one column, hero → subhead → feed → CTAs.

### 2.7 Copy (all strings, one place)

- Logo wordmark: "UNBREAKABLE VOW"
- Hero L1: "You say a lot."
- Hero L2 (gold italic): "*This time vow it.*"
- Subhead: "Put $$ on a goal. A friend decides if you pulled it off."
- Feed label: "THIS WEEK"
- Live indicator: "Live"
- Feed row 1: "Gym 3x this week" · "$50"
- Feed row 2: "Out of bed by 8am, 7 days" · "$10"
- Feed row 3: "No alcohol, 2 weeks" · "$25"
- Feed row 4: "No texting my ex, 30 days" · "$75"
- Feed row 5: "Delete TikTok for a week" · "$25"
- Primary CTA: "Make your vow →"
- Secondary CTA: "Dare a friend →"

---

## 3. Creation flow `/create`

This is the primary path for every new vow. Multi-step, no intermediate route changes — all steps render within `/create`.

### 3.1 Entry conditions

- No auth required to enter (deferred to step 5)
- On mount, `VowFlowProvider` state loaded from localStorage
- If a vow-in-progress exists, resume at the appropriate step

### 3.2 Step 1 — Vow input

**Layout:**
- `AppChrome`
- `Progress step={1} total={5}`
- Hero: two lines of `display-md` serif
  - Line 1 (`--text`): "What's your"
  - Line 2 (`--gold` italic): "vow?"
- Whisper: `body-sm`, `--text-dim`, italic, 12px top margin, `"You know the one."`
- `TextInput`: placeholder "Run every morning this week" — rotates through 5 static placeholders per session load
- Chip row below input (8px top margin): see states below
- `flex: 1` spacer
- Primary CTA "Next →"

#### 3.2.1 State: Empty (no input)

- TextInput: placeholder visible, not focused initially (auto-focus on desktop, not on mobile to avoid pop-up keyboard)
- Chip row: 5 **preset chips** (`ChoiceChip` non-suggestion variant)
  - "Gym 3x this week"
  - "10k steps a day this week"
  - "No alcohol, 2 weeks"
  - "Delete TikTok for a week"
  - "Actually call my mom weekly"
- Primary CTA: `SoftButton` (muted, not tappable yet)
- Whisper visible

#### 3.2.2 State: Valid (input passes `analyzeVow()`)

Triggers when: input length ≥ 10 chars AND passes specificity check (time-bound OR number-of-times OR both).

- TextInput: `active` state (gold border)
- Below input: `Validation` component with ✓ icon + "Clear and time-bound." in `--text-dim`
- Whisper hidden
- Chip row hidden
- Primary CTA: gold, tappable

#### 3.2.3 State: Vague (input fails `analyzeVow()`)

Triggers when: input length ≥ 5 chars AND fails specificity check.

- TextInput: `active` state
- Below input: small label "Or try:" in `body-sm`, `--text-dim`, 10px top margin
- Chip row below label: 3 **suggestion chips** (`ChoiceChip suggestion` variant, dashed gold border, italic)
  - Contextual, from `getContextualSuggestions(input)` in `lib/vow-logic.ts`
  - Example: if input is "be more productive", chips: "Ship the side project by Friday" / "Work 4 hours deep every day" / "No phone 'til noon, 7 days"
- Whisper hidden
- Primary CTA: **still tappable but soft** (`SoftButton`). Tapping it proceeds anyway — vague is a nudge, not a block.

**Interactions:**
- Type in input → on every keystroke, re-run `analyzeVow()` (debounced 200ms) to update state
- Tap preset chip → fill input with chip text, re-run analysis → advances to Valid
- Tap suggestion chip → replace input with chip text → advances to Valid
- Tap "Next →" → advance to Step 2 (if deadline is inferrable) or Step 1.5 (By-when sheet)

**Copy:**
- Hero L1: "What's your"
- Hero L2 (gold italic): "vow?"
- Whisper: "You know the one."
- Placeholder (rotating): ["Run every morning this week", "Gym 3x this week", "Call my mom weekly", "No alcohol for 2 weeks", "Ship the side project by Friday"]
- Valid validation: "✓ Clear and time-bound."
- Vague hint: "Or try:"
- CTA: "Next →"

### 3.3 Step 1.5 — By-when (bottom sheet, conditional)

**When it appears:** After "Next →" on Step 1, if `inferDeadline(vowText)` returns null.

**Behavior:**
- Background content (Step 1) dims to `brightness(0.35)`, pointer-events disabled
- Bottom sheet slides up (`slideUp`, 240ms, `--ease-out`)
- Backdrop fade-in parallel

**Layout:**
- Handle (36×3px)
- Title: `display-xs` serif, "By when?"
- Sub: `body-sm`, `--text-dim`, "Deadline for judgment."
- 14px gap
- 5 `RadioRow` entries:
  - "End of this week" / sub: calculated date like "Sun, Apr 26" — DEFAULT selected
  - "Tomorrow"
  - "7 days"
  - "30 days"
  - "📅 Pick a date" (special variant with chevron, opens native date picker)
- 14px gap
- `PrimaryButton` "Lock it in" (reduced padding: `10px 0`, font `button-md`)

**Interactions:**
- Tap radio row → selects that option
- Tap "Pick a date" row → opens native `<input type="date">` (or a custom picker on desktop) — on selection, adds that date as selected
- Tap "Lock it in" → sheet dismisses, deadline saved to VowFlowProvider, advance to Step 2
- Swipe down OR tap backdrop → sheet dismisses WITHOUT saving, user stays on Step 1

**Copy:**
- Title: "By when?"
- Sub: "Deadline for judgment."
- Option labels: as above
- Sub for "End of this week": `"Sun, {calculated date}"` — computed at open
- CTA: "Lock it in"

### 3.4 Step 2 — Witness (name-only, recent-picks for returners)

Per decision-3 lock-in: **no phone field**. Optional disclosure if user WANTS to add a number now.

**Layout:**
- `AppChrome` + `Progress step={2} total={5}`
- Context pill: `"<vow snippet> · <deadline pretty>"` e.g., `"Run every morning · Sun Apr 26"`
- Hero: `display-sm` serif 2-line
  - Line 1 (`--text`): "Name the one"
  - Line 2 (`--gold` italic): "who'll judge you."

**Sub-states:**

#### 3.4.1 Returning user WITH recent witnesses

Above the input, render a "Recent" row: small label "RECENT" (`label` style), then a horizontal-scroll row of `ChoiceChip`s — one per unique `witness_name` the user has used before (dedupe, most-recent first, max 5).

- Tap a chip → fills input with that name, advances state to `valid`
- Below chips: "Or enter someone new" in `body-sm`, `--text-dim`

Then the input.

#### 3.4.2 First-time user (no recent witnesses)

Skip the "Recent" row entirely. Render directly to the input.

**Input:**
- `TextInput` with placeholder "First name (e.g., Dan)"
- Auto-focus on desktop, not on mobile
- On any non-empty value, state becomes `valid`

**Optional disclosure:**
- Below input, a small dim link: "Add their number now (optional)"
- Tap reveals a second input below: `TextInput` with placeholder "+1 (555) 867-5309", labeled "Phone (so we can text them on seal)" in `caption` style above
- If the user adds a phone, save `witness_phone` in VowFlowProvider
- If not, `witness_phone` stays null — they'll share via the cliffhanger

**Validation:**
- Name must be 1-50 chars, no validation beyond that
- Phone (if provided) must be valid E.164 after Twilio normalization; invalid shows `--danger` error below

**Primary CTA:**
- Disabled if name is empty
- Label: dynamic — `"Lock {name} in →"` once name is entered, otherwise "Next →"

**Copy:**
- Context pill: `"<vow snippet> · <deadline pretty>"`
- Hero: "Name the one / who'll judge you."
- Recent label: "RECENT"
- Below-recent prompt: "Or enter someone new"
- Input placeholder: "First name (e.g., Dan)"
- Phone disclosure: "Add their number now (optional)"
- Phone input placeholder: "+1 (555) 867-5309"
- Phone input label: "Phone (so we can text them on seal)"
- Phone validation error: "That doesn't look like a phone number."
- CTA (empty): "Next →"
- CTA (filled): "Lock {name} in →"

### 3.5 Step 3 — Stakes

**Layout:**
- `AppChrome` + `Progress step={3} total={5}`
- Context pill: `"<vow snippet> · <witness name>"`
- Hero: `display-sm` serif
  - Line 1 (`--text`): "How serious"
  - Line 2 (`--gold` italic): "are you?"
- 20px gap
- Big stake display: `display-md` serif, `--gold`, centered, text `"${amount}"` e.g., "$50"
- 10px gap
- Row of 4 `StakePill`s: $10, $25, $50, $100 — default selected: **$50**
- 16px gap
- `if-broken` inline row showing current destination:
  - Left: label "IF BROKEN" (`label` style, `--text-faint`) + value (e.g., "ALS Association") in `body-sm`
  - Right: "Change ›" in `--gold`, `body-sm`
  - Tap "Change ›" → advance to Step 3.5 (If-broken expanded)
- `flex: 1` spacer
- `PrimaryButton` "Review →"

**Interactions:**
- Tap a stake pill → updates big stake display, saves amount
- Tap "Change ›" → expand if-broken picker (renders as Step 3.5, not a separate route, just a state change)
- Tap "Review →" → advance to Step 4 (Seal)

**Copy:**
- Context pill: dynamic
- Hero: "How serious / are you?"
- If-broken label: "IF BROKEN"
- If-broken default value: "ALS Association"
- If-broken action: "Change ›"
- CTA: "Review →"

### 3.6 Step 3.5 — If-broken expanded

Rendered in-place on the stakes screen (replaces the stakes content — NOT a separate route).

**Layout:**
- Context pill: `"<vow snippet> · $<stake> · <witness>"`
- Hero: `display-sm` serif
  - Line 1 (`--text`): "If you break it,"
  - Line 2 (`--gold` italic): "where does it go?"
- 16px gap
- `CauseCard variant="believe"` — DEFAULT selected
  - Emoji: 💚
  - Title: "A cause you believe in"
  - Sub: "At least someone wins."
  - Below card (indented 10px left, 8px gap): 4 `ChoiceChip`s for charity presets
    - "ALS Association" (default selected — gold fill)
    - "St. Jude"
    - "Feeding America"
    - "Habitat for Humanity"
- 14px gap
- `CauseCard variant="hate"`
  - Emoji: 🔥
  - Title: "A cause you'd hate to fund"
  - Sub: "Maximum motivation not to break."
  - Below card: 2 `ChoiceChip`s for anti-cause presets (named orgs; no custom/write-your-own in v1)
    - "The NRA" — subline: "National Rifle Association"
    - "PETA" — subline: "People for the Ethical Treatment of Animals"

  Rationale: two options cover both ideological poles. User picks whichever would genuinely sting. No free-text because T&S liability on an open field is high and the two options already do the job.
- `flex: 1` spacer
- `PrimaryButton` "Lock it in"

**Interactions:**
- Tap a cause card (believe vs hate) → selects that variant, shows its chip row expanded (other row collapses)
- Tap a preset chip → selects that destination, updates the if-broken row copy when returning to Step 3
- Tap "Lock it in" → returns to Step 3 (stakes), if-broken row now reflects choice
- Back button in header → same as Lock it in (discards unsaved changes? — NO, preserves as-is since it's not a commit)

**Copy:**
- Context pill: dynamic
- Hero: "If you break it, / where does it go?"
- Believe card title: "A cause you believe in"
- Believe card sub: "At least someone wins."
- Hate card title: "A cause you'd hate to fund"
- Hate card sub: "Maximum motivation not to break."
- Write-your-own chip label: "Write your own..."
- Write-your-own input placeholder: "e.g., my rival's political fund"
- CTA: "Lock it in"

### 3.7 Step 4 — Seal (`/seal` route, but reachable as Step 4 of `/create`)

**Entry:** From Step 3 "Review →". This IS where we hit the `/seal` route so the URL reflects the payment commitment. Everything from Step 1-3 was client-side state.

See §11 (`/seal` route spec). `/create`'s "Review →" fires `router.push('/seal')`.

### 3.8 Step 5 — Sealed + share (`/sent` route)

See §12 (`/sent` route spec).

---

## 4. Dashboard `/dashboard`

### 4.1 Who sees it

Authenticated users. Replaces "home" for returning users. Empty state handles no-vows case.

### 4.2 Layout

- `AppChrome` + `HamburgerMenu` button (top-right)
- Greeting + stats row (top of content):
  - Left: `display-sm` serif, italic gold wordmark "{firstName}." e.g., "Joey."
  - Right: compact stats "{kept} kept · {broken} broken · ${saved} saved" in `caption` `--text-dim`
  - Below (if streak > 0): "🔥 {n} vow streak" in `button-md` gold
- 28px gap

### 4.3 Sections (ordered by urgency, Designer B model)

Render only sections with at least one vow. Section label = `label` style, `--text-faint`, 10px bottom margin.

1. **⚡ Verdict needed** — vows in `awaiting_verdict` status where current user is the maker, witness is overdue (72h auto-resolve window). Urgent CTA on each card: "Submit verdict yourself →"
2. **🛡️ Watching** — vows where current user is the witness (`witness_user_id === me`), status `active` or `awaiting_verdict`. Tapping → `/vow/[id]`
3. **⏳ Pending** — own vows in `active` status where `witness_accepted_at IS NULL`. Extra sub-line on card: "Waiting on {witness_name}" + "Nudge" secondary button inline
4. **Active** — own vows in `active` status with `witness_accepted_at IS NOT NULL`. Shows countdown ("Day X of Y" or "Nh left")
5. **Challenge sent** — own vows in `draft`/`sealed` where `vow_type='challenge'` and `challenge_status='pending'`. "Waiting on {target_name} to accept"
6. **Past** — own vows in `kept`/`broken`/`voided` status, most recent 3. "See all →" link to `/history`

### 4.4 Dashboard card variants

All use the `DashboardCard` component. Variants by section:

- **Verdict needed:** Top badge "Verdict needed" (orange/red pending variant), countdown shows hours overdue in red, tap → `/self-resolve?vowId=X`
- **Watching:** Badge "Judging" (blue verdict variant), tap → `/vow/[id]` (witness view)
- **Pending:** Badge "Pending" (orange), sub-line "Waiting on {witness}", secondary "Nudge" button that triggers re-send of invite SMS
- **Active:** Badge "Active" (green), countdown like "Day 3 of 7" or "24h left"
- **Challenge sent:** Badge "Challenge sent" (gold), sub-line "Waiting on {target}"
- **Past:** Badge matching outcome (kept/broken/voided), date in meta, tap → `/outcome/[vowId]`

### 4.5 Empty state (no vows)

Show:
- Big serif hero `display-md`: "Your record."
- Subhead `body` `--text-muted`: "Every vow you've made, kept, and broken. Nothing here yet."
- Empty-state `RitualCard` centered:
  - Icon: Lucide `Sparkles` or gold diamond mark
  - Title: "Make your first vow."
  - Body: "One short sentence. Money on the line. A friend to judge. That's it."
  - CTA: `PrimaryButton` "Begin →" → `/create`

### 4.6 Loading state

Skeleton rows (3 cards) with shimmer animation. Greeting + stats shown with bars. No flash of empty state.

### 4.7 Interactions

- Tap hamburger → slide-out menu (see §14)
- Tap a card → `/vow/[id]` (or specific destination by variant)
- Tap "Begin →" in empty state → `/create`
- Tap "See all →" in Past section → `/history`
- Tap stat item (kept/broken/saved) → `/history?filter=<status>`

---

## 5. Vow detail `/vow/[id]`

Single-vow full page. Handles every role (maker / witness / target) and every state. This is the most complex screen — state machine has ~9 phases.

### 5.1 Phase detection

Based on `vow.status`, `vow.vow_type`, `vow.verdict`, witness/challenge fields, and `session.user.id`:

| Phase | Condition |
|---|---|
| `witness_pending_maker` | status='active', witness_accepted_at IS NULL, me=maker |
| `witness_pending_48h_maker` | same + now() > sealed_at + 48h |
| `witness_pending_witness` | same, me=witness_user_id (or token match) |
| `challenge_pending_maker` | vow_type='challenge', challenge_status='pending', me=maker |
| `challenge_pending_target` | same, me=target_user_id |
| `active_maker` | status='active', witness_accepted, me=maker |
| `active_witness` | same, me=witness |
| `verdict_waiting_maker` | status='awaiting_verdict', me=maker |
| `verdict_waiting_witness` | same, me=witness |
| `kept` | status='kept' |
| `broken` | status='broken' |
| `voided` | status='voided' |

### 5.2 Common layout

- `AppChrome` with `BackButton` (goes to dashboard)
- Phase-specific header (see below)
- Vow text hero: `display-sm` serif italic, centered
- Stake + deadline + witness strip
- Timeline section
- Phase-specific actions
- Audit trail (collapsed, expandable)

### 5.3 Phase: `witness_pending_maker`

- Header badge: "Pending" (orange)
- Hero text
- Stake/destination block
- Status message: "Waiting on {witness_name}." `body`, `--text-muted`
- Sub-message: "We sent them a text {N time ago}. They can accept anytime before your deadline." `body-sm`, `--text-dim`
- Primary action: `SecondaryButton` "Copy invite link" — copies `unbreakablevow.app/w/{token}`
- Sub-action: `SecondaryButton` "Re-send text" — triggers `send-sms` with witness template (if phone on file; else disabled)
- Tiny destructive action: `DangerButton` small variant "Void vow" — see §5.14

### 5.4 Phase: `witness_pending_48h_maker`

Same as 5.3 plus:
- Warning callout (`RitualCard variant="warn"`, `--warn-bg` background): "{witness_name} hasn't seen your vow yet."
- Primary action changes to: `PrimaryButton` "Nudge {witness_name}" (re-sends with slightly different copy)
- Below nudge: tiny muted `SecondaryButton` "Continue on your honor" — opens confirmation modal:
  - Title: "Go solo?"
  - Body: "Your vow becomes self-judged. You lose the social accountability that makes this work. We don't recommend this unless {witness_name} is unreachable."
  - Primary: "Go solo" (DangerButton) → converts vow to self-resolve mode (adds flag; TODO engineering note: the backend should set a `solo_fallback=true` flag; until migration exists, override via audit_events with type `auto_resolved` and metadata `{reason: 'witness_ghosted_48h'}`)
  - Secondary: "Keep waiting" (back)

### 5.5 Phase: `active_maker`

- Header badge: "Active" (green)
- Hero text
- Countdown strip (1 row):
  - Left: "Day X of Y" or "{N}h left" (days if >24h, hours if <24h, minutes if <1h)
  - Right: stake amount in `display-xs` gold
- Progress bar showing elapsed / total vow duration
- Witness info row: small avatar circle + "{witness_name} is judging." + time-until-verdict
- Timeline section (see §5.13)
- Primary action: none (vow is in progress, user does nothing)
- Sub-action: `SecondaryButton` "Share to a friend" — opens share sheet with copy "I'm on day X of: {vow}. ${stake} on the line. Judged by {witness}."
- Tiny: `DangerButton` small "Void vow"

### 5.6 Phase: `verdict_waiting_maker`

- Header badge: "Verdict pending" (blue)
- Hero text
- Message: "Deadline passed {N time ago}. Waiting on {witness_name} to decide."
- Sub-message: "They'll get a verdict request shortly. If they don't respond in 72 hours, you can submit your own verdict."
- Primary action: `SecondaryButton` "Re-send verdict request"
- After 72h: primary becomes `PrimaryButton` "Submit verdict yourself →" → `/self-resolve?vowId=X`

### 5.7 Phase: `witness_pending_witness` / `active_witness` / `verdict_waiting_witness`

Witness view — if the user is signed in and is the witness of this vow:

- Header badge: appropriate status
- Hero: "You're judging this vow." then the vow text
- Meta: "Made by {maker_name} · {stake} on the line · Deadline {date}"
- Primary action varies by sub-phase:
  - `witness_pending_witness`: `PrimaryButton` "Accept as judge" (+ `SecondaryButton` "Decline")
  - `active_witness`: no primary; "Deadline is {date}. We'll text you then." `body-sm` `--text-dim`
  - `verdict_waiting_witness`: `PrimaryButton` "Deliver verdict →" → the verdict page (embedded inline or `/w/[token]/verdict` if witness has a token)
- Timeline visible

### 5.8 Phase: `kept`

- Header badge: "Kept" (success)
- `display-sm` serif gold hero: "🏆 You kept it." (or for witness view: "🏆 They kept it.")
- Sub: "Sarah confirmed. Your ${stake} is on its way back to you."
- Stake block shows: original stake, "Refunded on {date}" (if applicable)
- CTA: `PrimaryButton` "Share this win" → share sheet with outcome URL
- Sub-CTA: `SecondaryButton` "Make another vow" → `/create`
- Timeline

### 5.9 Phase: `broken` (charity destination)

- Header badge: "Broken" (danger)
- `display-sm` serif hero: "💔 It happens."
- Sub: "{witness} called it. Your ${stake} went to {destination}."
- Stake block: shows where money went
- CTA: `SecondaryButton` "Make another vow" → `/create`
- No celebratory share CTA here — we do offer sharing on `/vow-broken` page with less urgency

### 5.10 Phase: `broken` (anti-cause destination)

- Header badge: "Broken" (danger)
- `display-sm` serif hero, `--anti-red` colored: "💀 You played yourself."
- Sub: "Your ${stake} just went to {destination}. {witness} called it."
- Pain meter: "Pain level: Maximum 🫠"
- Background uses `--anti-red` gradient (subtle)
- CTA: `SecondaryButton` "Try again" → `/create` with a gentle extra subtext "This one doesn't have to be like that."
- Audit timeline below

### 5.11 Phase: `challenge_pending_maker`

- Header badge: "Challenge sent" (gold)
- Hero: the dare text
- Message: "Waiting on {target_name} to accept."
- Sub: "They got a text {time ago}. They can accept anytime before expiry."
- Primary: `SecondaryButton` "Re-send text" (if phone), `SecondaryButton` "Copy link"
- Tiny: "Cancel dare" (voids the vow)

### 5.12 Phase: `challenge_pending_target`

If the target user is signed in and viewing their incoming dare:
- Header badge: "You've been dared" (gold)
- Hero: dare text
- Maker info: "{maker_name} dared you."
- Primary: `PrimaryButton` "Accept →" → `/c/[token]` for full accept flow
- Secondary: `SecondaryButton` "Not this time" (declines, voids the vow)

### 5.13 Timeline section

- Label: "TIMELINE" (`label` style, `--text-faint`)
- Renders `Timeline` component
- Events (from `audit_events` table, chronological):
  - `vow_created`: "Vow drafted" · timestamp
  - `vow_sealed`: "Vow sealed" · timestamp · stake amount (gold)
  - `witness_invited`: "Text sent to {witness}"
  - `witness_accepted`: "{witness} accepted"
  - `witness_declined`: "{witness} declined" (ERROR state — voids vow)
  - `challenge_sent`: "Dare sent to {target}"
  - `challenge_accepted`: "{target} accepted"
  - `check_in`: "Check-in" + optional note
  - `verdict_submitted`: "{witness} said: {verdict}"
  - `verdict_self_resolved`: "{maker} submitted verdict: {verdict}"
  - `auto_resolved`: "Auto-resolved after 72h"
  - `refund_issued`: "Refund issued" + amount
  - `vow_voided`: "Vow voided"

### 5.14 Void action (applicable to any maker phase)

Triggered by tiny `DangerButton` "Void vow". Opens modal:
- Title: "Void this vow?"
- Body (if pre-witness-accept): "Nothing has been charged. We'll cancel the payment hold."
- Body (if post-accept, pre-verdict): "You'll forfeit your ${stake} to {destination}. This is the 'I broke it' outcome — if you want your money back, wait for {witness}'s verdict."
- Primary: `DangerButton` "Void it"
- Secondary: `SecondaryButton` "Nevermind"

On confirm: calls `void-vow` Edge Function. On success: redirect to `/dashboard`, show toast "Vow voided. Refund processing."

### 5.15 Unauthorized access

If user tries to view `/vow/[id]` but isn't maker/witness/target:
- Show a simple 404-like screen: "This vow isn't yours." + `SecondaryButton` "Back to dashboard".
- Do NOT leak vow contents.

---

## 6. Self-resolve `/self-resolve`

Maker-initiated verdict after 72h auto-resolve window.

### 6.1 Entry

- From dashboard or vow detail "Submit verdict yourself →"
- Query param: `?vowId=X` required; else redirect to dashboard
- Only accessible if vow is in `awaiting_verdict` status AND 72h+ since deadline

### 6.2 Layout

- `AppChrome` + `BackButton`
- Warning callout (`--warn-bg`):
  - "{witness_name} hasn't submitted a verdict in 72 hours."
  - "You can self-report the outcome. Your word is all we have."
- Vow text hero: `display-sm` serif italic
- Stake + destination meta
- Two choice cards stacked vertically:
  - `CauseCard`-like "I kept it." — with `--success` treatment, emoji 🏆, body "Full refund. ${stake} back to you."
  - `CauseCard`-like "I broke it." — with `--danger` treatment, emoji 💔, body "${stake} goes to {destination}."
- 16px gap
- `OathCheckbox` required: "I solemnly swear. I'm reporting this honestly. Fraud voids the refund."
- `PrimaryButton` "Submit verdict" (disabled until choice made + checkbox checked)

### 6.3 Interactions

- Tap choice card → highlights it
- Check oath box → unlocks CTA
- Tap Submit → confirmation modal:
  - Title: "Submit verdict: {kept|broken}?"
  - Body: "This can't be undone."
  - Primary: `PrimaryButton` "Submit" → calls `submit-verdict` Edge Function with maker token
  - Secondary: "Cancel"
- On success: redirect to `/vow-kept?vowId=X` or `/vow-broken?vowId=X`

### 6.4 Copy

- Warning L1: "{witness_name} hasn't submitted a verdict in 72 hours."
- Warning L2: "You can self-report the outcome. Your word is all we have."
- Choice kept: title "I kept it." · body "Full refund. ${stake} back to you."
- Choice broken: title "I broke it." · body "${stake} goes to {destination}."
- Oath: "I solemnly swear. I'm reporting this honestly. Fraud voids the refund."
- Submit CTA: "Submit verdict"

---

## 7. Vow-kept `/vow-kept?vowId=X`

Celebratory outcome page. Internal redirect destination.

### 7.1 Two variants based on destination

If `vow.destination` was a charity preset (ALS / St. Jude / etc.) — show `variant="charity"`.
If `vow.destination` was anti-cause — show `variant="anti-cause"`.

### 7.2 Charity variant

- `RitualScreen variant="outcome-kept"` (success bg)
- Confetti burst on mount (subtle, `--success` + `--gold` particles)
- Hero `display-lg` serif: "🏆 You actually did it."
- Sub `body` `--text-muted`: "{witness_name} confirmed. Your word is gold."
- Big refund callout: `"$${stake} returned ✓"` in `--success`, `display-md`
- Stake card showing "Your money is headed back. Should land in 2-5 days."
- Streak row (if streak ≥ 2): "🔥 {n} vows kept" in gold
- CTA row: `PrimaryButton` "Share this win" + `SecondaryButton` "Make another vow"

### 7.3 Anti-cause variant (the highly shareable one)

- `RitualScreen variant="outcome-kept"`
- Hero `display-lg`: "🛡️ Crisis averted."
- Sub (bigger, `body` `--text`): "You saved ${stake} from {destination}."
- Sub-sub (`body-sm` `--text-muted`): "Not a single dollar left your wallet."
- Streak if applicable
- Big CTA: `PrimaryButton` "Share this win 🔥" — opens share sheet with text: "I saved $${stake} from {destination} by actually doing the thing. {link}"
- Secondary: `SecondaryButton` "Make another vow"

### 7.4 Shared behaviors

- On mount: fetch vow by ID, verify maker owns it, render
- If vow isn't `kept`: redirect to `/vow/[id]`
- Share uses the outcome `/outcome/[vowId]` URL as share target (public, fancy preview)

---

## 8. Vow-broken `/vow-broken?vowId=X`

### 8.1 Two variants

Same split by destination type.

### 8.2 Charity variant — "It happens."

- `RitualScreen variant="outcome-broken"` (subtle red bg)
- Hero `display-lg`: "💔 It happens."
- Sub: "{witness_name} called it. Vow broken."
- Positive spin: "At least your ${stake} went somewhere good."
- Destination block: `"${stake} → {destination}"`
- Sub-body: "Receipt sent to {email}. You'll get a tax-deductible letter from them."
- CTA: `SecondaryButton` "Make another vow"
- No share CTA (don't celebrate loss)

### 8.3 Anti-cause variant — "You played yourself."

- `RitualScreen variant="anti-cause-broken"` (harsher red gradient)
- Hero `display-lg` in `--anti-red`: "💀 You played yourself."
- Sub: "Your ${stake} just went to {destination}."
- Sub-sub: "{witness_name} called it."
- Pain meter (small card): "Pain level: Maximum 🫠"
- CTA: `SecondaryButton` "Try again" (no celebration)
- Tiny caption: "This one doesn't have to be like that."

---

## 9. Outcome public `/outcome/[vowId]`

Public-facing, share target for kept/broken outcomes.

### 9.1 Server-rendered

- Server fetches vow with service role (bypass RLS)
- Generates OG tags dynamically via `/og/outcome/[vowId]` route
- If vow doesn't exist or isn't resolved: show a minimal "Vow not found" page with `SecondaryButton` "Back to unbreakablevow.app"

### 9.2 Layout

Phone-frame style (certificate-esque):
- Gold brand chrome at top
- Big serif vow text
- Verdict block (KEPT or BROKEN) with color + emoji
- Stake amount + destination
- Maker's first name only (not full name, privacy)
- Date verdict delivered
- Witness first name
- Footer: "Make your own Unbreakable Vow." CTA → `/`

### 9.3 No auth required, no user-specific data

---

## 10. Certificate `/certificate/[vowId]`

Public share target for active/kept vows (not broken — we don't celebrate broken). Screenshottable.

### 10.1 Layout

- `PhoneFrame` container, `--shadow-xl`
- Gold brand chrome
- Label "CERTIFICATE OF" in `label` style
- Label (bigger, gold): "UNBREAKABLE VOW"
- Ornamental divider (gold, 1px, with small gold diamond in center)
- Vow text, `display-sm` serif italic, centered
- Meta grid (3-col): STAKE · JUDGE · BY (values)
- Timestamp and signature-style maker name
- Brand footer
- Below frame: `PrimaryButton` "Share" + `SecondaryButton` "Back"

### 10.2 States

- Active vow: normal certificate
- Kept vow: adds green "✓ KEPT" overlay stamp
- Voided vow: redirects to `/outcome/[vowId]` (no certificate for voided)

---

## 11. Seal `/seal`

The commitment moment. Review + auth + payment in one screen.

### 11.1 Entry

- From `/create` Step 3 "Review →"
- Requires vow state in VowFlowProvider — if missing, redirect to `/`

### 11.2 Layout (logged-OUT user)

- `AppChrome` + `Progress step={5} total={5}`
- Hero `display-sm` serif centered, `"Almost done."` 12px gap, sub `body-sm` `--text-muted` centered: `"Enter your number to seal."`
- `ReviewCard` (see §7.10 of design-system):
  - Label "I VOW TO"
  - Vow text
  - Divider
  - 3-col: STAKE ($X gold) · JUDGE (name) · BY (date)
- Phone input (`TextInput` styled, 🇺🇸 flag prefix visible): placeholder "+1 (555) 867-5309"
- Caption below: "We'll text you a code. No password ever."
- Below phone, a thin divider with text "OR" centered
- OAuth row (smaller, de-emphasized): "Continue with Google" (lucide or SVG Google mark) · "Continue with email"
- `flex: 1` spacer
- Primary CTA (bottom): `PrimaryButton` `"Seal my vow — ${stake}"` (for $10+ vows; since $0 is killed, always shows stake amount)
- Upside line (green, `--success`, `caption`): "Keep your word, get every cent back"
- Disclaimer (faint, `caption`, `--text-faint`): "No charge unless you break your vow"

### 11.3 Layout (logged-IN user)

Skip phone entry. Go directly to:
- `AppChrome` + `Progress step={5} total={5}`
- Hero `"Almost done."` + sub `"One tap to seal."`
- `ReviewCard`
- Payment section (Stripe Elements or Apple Pay button depending on device):
  - Mobile with Apple Pay capability: big Apple Pay button "Set Up with  Pay"
  - All users also see: "Or use a card ›" (SecondaryButton) → expands Stripe card form inline
- Primary CTA: same `"Seal my vow — ${stake}"`
- Upside + disclaimer lines

### 11.4 States

- **Phone entering:** input active, CTA muted until valid phone
- **OTP sent:** hide phone input, show 6-digit code input, label "Enter the 6-digit code we just texted you." Below: "Didn't get it? Re-send" (disabled for 30s after send)
- **OTP verifying:** loading state on CTA
- **OTP invalid:** error below input "That code didn't match. Try again."
- **Auth success, payment pending:** transitions to payment sub-state
- **Payment processing:** CTA shows spinner, disabled
- **Payment declined:** error above CTA with Stripe-specific message, CTA re-enabled
- **Seal success:** brief gold sweep animation (`sealSweep` keyframe) across the review card, then navigate to `/sent`

### 11.5 Interactions

- Enter phone + submit → `signInWithOtp({ phone })` via Supabase Auth → send OTP
- Enter OTP + submit → `verifyOtp()` → session established → proceed to payment
- Tap Google/email OAuth → opens `AuthModal` with OAuth flow, cookie preserves next step
- Tap Apple Pay → opens native sheet (SetupIntent flow — iOS shows "Set Up" not "Pay")
- Submit card → Stripe `confirmSetupIntent` → seal
- Tap seal (after auth + payment ready) → `seal-vow` Edge Function → on success, navigate to `/sent`

### 11.6 Copy

- Hero: "Almost done."
- Sub (unauth): "Enter your number to seal."
- Sub (auth): "One tap to seal."
- Phone placeholder: "+1 (555) 867-5309"
- Phone caption: "We'll text you a code. No password ever."
- Divider: "OR"
- OAuth button 1: "Continue with Google"
- OAuth button 2: "Continue with email"
- OTP label: "Enter the 6-digit code we just texted you."
- OTP resend: "Didn't get it? Re-send"
- OTP error: "That code didn't match. Try again."
- Review card label: "I VOW TO"
- Review meta labels: "STAKE" · "JUDGE" · "BY"
- Apple Pay button text: "Set Up with  Pay" (system-rendered)
- Card fallback: "Or use a card ›"
- Primary CTA: "Seal my vow — ${stake}"
- Upside: "Keep your word, get every cent back"
- Disclaimer: "No charge unless you break your vow"

---

## 12. Sent `/sent` — the cliffhanger

**Critical:** this is NOT a success page. It's the handoff moment. User isn't done until the witness is notified.

### 12.1 Layout

- `AppChrome` (no progress indicator — we're done with the funnel)
- Centered seal icon + title (visual weight):
  - `SealIcon` (48×48 gold rounded square with inner dark diamond), with `pulse-glow` animation
  - `display-md` serif `"Sealed."`
  - Sub `body` `--text-muted`, 2 lines centered:
    - Line 1: "Your vow is live."
    - Line 2: "Now tell {witness_name}."
- 20px gap
- `SmsPreview` component (see design-system §7.23):
  - Label "YOUR TEXT TO {witness_name}"
  - Body: the pre-composed SMS text (see copy below)
  - URL: `unbreakablevow.app/w/{token}`
- `flex: 1` spacer
- CTA block (bottom):
  - Primary: `PrimaryButton` `"Tell {witness_name} 📱"` — fires Web Share API on mobile (fallback to `sms:?body=...` link); on desktop, copies link + text to clipboard with toast confirmation
  - Secondary (12px gap): `SecondaryButton` "Copy link instead"
  - On desktop: ADDITIONAL prominent block: the URL displayed in a `--bg-elev` card with a copy button inline

### 12.2 Web Share API behavior

```ts
if (navigator.share && isMobile) {
  navigator.share({
    text: smsBody,  // the full SMS with link embedded
  });
} else if (isMobile) {
  window.location.href = `sms:?body=${encodeURIComponent(smsBody)}`;
} else {
  await navigator.clipboard.writeText(smsBody);
  showToast("Link + message copied. Paste it into your messenger.");
}
```

### 12.3 After share

No auto-redirect. The user can sit on this page as long as they want. A dismissible prompt appears after 10 seconds: "Done? See your vow →" → `/live` or `/vow/[id]`.

Browser back button from here goes to `/dashboard` (not `/seal`).

### 12.4 Desktop prominent copy block

On ≥900px viewport, add between the SMS preview and CTA:
- Visual URL display (selectable): `unbreakablevow.app/w/{token}` in `font-mono`, `--text` color, inside `--bg-elev` card with a copy icon button inline

### 12.5 Copy

- Hero: "Sealed."
- Sub L1: "Your vow is live."
- Sub L2: "Now tell {witness_name}."
- SMS preview label: "YOUR TEXT TO {witness_name}"
- SMS body (parameterized — this is canonical):
  - `"I vowed to {vow_refined_text_lowercased}. ${stake} on the line — you're the judge. Takes 5 sec to accept: {url}"`
- CTA primary: "Tell {witness_name} 📱"
- CTA secondary: "Copy link instead"
- After-10s prompt: "Done? See your vow →"
- Desktop toast: "Link + message copied. Paste it into your messenger."

---

## 13. Witness invite `/w/[token]`

No-auth route for the witness (or anyone the maker shared the link with).

### 13.1 Server component handles metadata

- Looks up vow by `witness_invite_token` using service role
- If token invalid: renders 404 with "This invitation isn't valid."
- If vow declined/voided/resolved: renders state-specific message (see §13.5)
- Generates OG tags for the SMS link preview

### 13.2 Default layout (pending acceptance)

- `AppChrome` with small "For {witness_name}" label
- Hero `display-sm` serif: "{maker_name} made an Unbreakable Vow."
- Sub (smaller): "They're asking you to judge."
- 24px gap
- Big serif-italic vow text (`display-md`): `"{vow_refined_text}"`
- Meta row: `${stake} on the line · Deadline {date}`
- 20px gap
- What-you-need-to-do card (`RitualCard`):
  - Label: "YOUR JOB"
  - Body: "On {deadline date}, we'll text you a link. One tap: kept or broken. That's it."
- `PrimaryButton` "Accept as judge →"
- `SecondaryButton` "Decline"

### 13.3 After "Accept" tap — phone collection screen

If the witness hasn't provided a phone yet:
- Hero: "One last thing."
- Sub: "Enter your number so we can text you on {deadline}."
- `TextInput` phone (🇺🇸 +1 prefix)
- Caption: "We'll only text you once — on verdict day."
- `PrimaryButton` "I'm in →"

On submit: calls `accept-witness` Edge Function with token + phone. On success: witness accepted, redirect to §13.4.

### 13.4 Witness accepted confirmation

- Big success icon
- Hero: "✓ You're in."
- Sub: `"{maker_name} is counting on you."`
- Sub-sub: "On {deadline}, we'll text you. One tap: kept or broken."
- Growth CTAs (primary ones on a witness-invite page):
  - `PrimaryButton` "Make your own vow →" → `/` (or directly `/create` if already authed)
  - `SecondaryButton` "Dare {maker} →" → `/cast?target={maker_id}` (pre-fills target)

### 13.5 Edge states

| State | Message |
|---|---|
| Witness already accepted | "You've already accepted. We'll text you on {date}." + `PrimaryButton` "View the vow" → `/vow/[id]` (or the outcome page) |
| Witness declined | "You declined this. It's done." |
| Vow voided | "{maker_name} voided this vow. Nothing for you to do." |
| Vow kept | "Verdict was submitted. {maker_name} kept it." + outcome link |
| Vow broken | "Verdict was submitted. {maker_name} broke it." + outcome link |
| Token invalid | "This invitation isn't valid. Ask {maker_name} to send a fresh link." |
| Deadline passed, witness never accepted | "This vow's deadline has passed without your acceptance. Nothing for you to do." |

### 13.6 Copy

- Label: "For {witness_name}"
- Hero: "{maker_name} made an Unbreakable Vow."
- Sub: "They're asking you to judge."
- Your-job label: "YOUR JOB"
- Your-job body: "On {deadline date}, we'll text you a link. One tap: kept or broken. That's it."
- Accept CTA: "Accept as judge →"
- Decline CTA: "Decline"
- Phone collect hero: "One last thing."
- Phone collect sub: "Enter your number so we can text you on {deadline}."
- Phone collect caption: "We'll only text you once — on verdict day."
- Phone collect CTA: "I'm in →"
- Accepted hero: "✓ You're in."
- Accepted sub: "{maker_name} is counting on you."
- Accepted sub-sub: "On {deadline}, we'll text you. One tap: kept or broken."
- Growth CTA 1: "Make your own vow →"
- Growth CTA 2: "Dare {maker} →"

---

## 14. Witness verdict `/w/[token]/verdict`

The one-tap moment. Externally linked from verdict-day SMS.

### 14.1 Entry

- Token must be valid, witness must have accepted, deadline must have passed, vow status must be `awaiting_verdict`
- Other states: see §14.5

### 14.2 Layout

- Minimal app chrome
- Hero: "Did {maker} keep their vow?"
- Big serif italic vow text (`display-md`)
- Meta: `${stake} · made {X days ago}`
- 24px gap
- Two big choice cards stacked (not side-by-side — more deliberate):
  - `CauseCard`-style "He/She did it ✓" — `--success-bg`, emoji 🏆
  - `CauseCard`-style "He/She didn't ✗" — `--danger-bg`, emoji 💔
- `OathCheckbox` "I'm judging this honestly. No favors."
- `PrimaryButton` "Deliver verdict" — disabled until choice + oath checked

**"He" vs "she"**: derive from maker's display name via basic inference, or default to "{maker} did it"/"{maker} didn't" to avoid gender guessing. Prefer name-based form to sidestep the issue.

### 14.3 After submit

- Confirmation modal: "Verdict: kept/broken. Can't undo."
- Call `submit-verdict` Edge Function
- Success: transition to §14.4

### 14.4 After-verdict screen

- Big icon (shield emoji 🛡️ with gold)
- Hero: "Verdict submitted."
- Sub: "{maker} has been notified. Thanks for keeping them honest."
- Growth CTAs:
  - `PrimaryButton` "Make your own vow →"
  - `SecondaryButton` "Dare {maker} →"

### 14.5 Edge states

| State | Message |
|---|---|
| Vow status not `awaiting_verdict` yet | "The deadline hasn't passed yet. Come back on {date}." |
| Already submitted | "You already delivered: {kept|broken}." + outcome link |
| Auto-resolved (72h passed) | "The maker submitted their own verdict when you didn't respond. Outcome: {kept|broken}." |
| Vow voided | "The maker voided this vow." |
| Token invalid | "This link isn't valid." |

### 14.6 Copy

- Hero: "Did {maker} keep their vow?"
- Option A: "{maker} did it ✓"
- Option B: "{maker} didn't ✗"
- Oath: "I'm judging this honestly. No favors."
- Submit CTA: "Deliver verdict"
- Confirm modal title: "Verdict: {kept|broken}?"
- Confirm modal body: "This can't be undone."
- After-verdict hero: "Verdict submitted."
- After-verdict sub: "{maker} has been notified. Thanks for keeping them honest."
- Growth CTA 1: "Make your own vow →"
- Growth CTA 2: "Dare {maker} →"

---

## 15. Cast (dare) `/cast`

Create a challenge for a friend.

### 15.1 Who sees it

Authenticated users only. Unauthed users get AuthModal.

### 15.2 Layout

- `AppChrome` + `BackButton`
- Hero `display-sm` serif:
  - Line 1 (`--text`): "Dare"
  - Line 2 (`--gold` italic): "a friend."
- Sub `body-sm` `--text-muted`: "Put them on the spot. They decide the stakes."

Form sections (top to bottom):
1. **Target** — `TextInput` "First name (e.g., Mike)" + optional phone disclosure (same pattern as witness picker §3.4)
2. **The dare** — `TextInput` "I dare you to..." placeholder "go to the gym 3x this week"
3. **Deadline** — inline `RadioRow` cluster with 4 options: "End of this week" / "7 days" / "30 days" / "Custom..."
4. **Optional message** — `TextInput` (small textarea) "Add a taunt (optional)" placeholder "Think you can handle it?"

- `PrimaryButton` "Send dare — {name} decides stakes →"

### 15.3 Interactions

- On submit: create vow with `vow_type='challenge'`, `challenge_status='pending'`, maker=me, target_user_id=null (until they accept), target_phone=optional, stake_amount=0 (they pick)
- After creation: redirect to `/vow/[id]` (challenge_pending_maker view) which shows the share state
- From vow detail, user can copy link / share via SMS same way as `/sent`

### 15.4 Copy

- Hero: "Dare / a friend."
- Sub: "Put them on the spot. They decide the stakes."
- Target label: "Who?"
- Target placeholder: "First name (e.g., Mike)"
- Phone disclosure: "Add their number now (optional)"
- Dare label: "The dare"
- Dare placeholder: "I dare you to..."
- Deadline label: "By when?"
- Message label: "Add a taunt (optional)"
- Message placeholder: "Think you can handle it?"
- Primary CTA: "Send dare — {target} decides stakes →"
- CTA disabled: "Send dare"

---

## 16. Challenge accept `/c/[token]`

External no-auth page. Challenge target lands here.

### 16.1 Default layout (challenge pending)

- `AppChrome` labeled "For {target_name}" (derived from maker's view of target, or "You" if target_user_id matches signed-in user)
- Big centered hero: `"YOU'VE BEEN DARED"` in `label` style `--gold`
- Maker info: `"{maker_name} dared you."`
- Big serif italic dare text (`display-md`)
- Optional taunt message in quotes: `"{message}"` `body` `--text-muted`
- 20px gap
- Primary: `PrimaryButton` "Accept the dare →"
- Secondary: `SecondaryButton` "Not this time"
- Tiny meta: "You pick the stakes and who judges."

### 16.2 After accept

- If unauthenticated: embed auth flow (phone-first same as /seal)
- After auth: transition to "Set stakes" sub-step (same as `/create` Step 3, but pre-filled: vow text from dare, witness pre-populated as the maker {joey}, deadline from dare)
- After set stakes: auth is already done; go straight to payment → seal
- After seal: notify maker via SMS ("Mike accepted your dare!") + redirect to `/sent` (cliffhanger, this time the accepter's "vow is live" moment)

### 16.3 Edge states

| State | Message |
|---|---|
| Already accepted | "You accepted this dare already. {link to vow}" |
| Already declined | "You declined this one." |
| Dare expired | "This dare expired on {date}." |
| Dare voided by maker | "{maker} canceled the dare." |
| Token invalid | "This dare link isn't valid." |

### 16.4 Copy

- Chrome label: "For {target}"
- Hero eyebrow: "YOU'VE BEEN DARED"
- Maker line: "{maker_name} dared you."
- Meta: "You pick the stakes and who judges."
- Primary CTA: "Accept the dare →"
- Secondary: "Not this time"
- Set-stakes sub-hero: "How serious are you?" (reuses /create Step 3)
- Pre-filled witness context: "{maker_name} is your judge. (You can change.)"

---

## 17. History `/history`

### 17.1 Layout

- `AppChrome` + `BackButton`
- Hero `display-sm` serif: "Your record."
- Sub `body-sm` `--text-muted`: "{kept} kept · {broken} broken · ${saved} saved"
- Filter chips row (optional): "All" / "Kept" / "Broken" / "Voided" / "Witnessed"
- List of `DashboardCard`s (past tense variant — no countdown, shows outcome badge + date)
- Empty state: reuses dashboard empty-state copy

### 17.2 Interactions

- Tap card → `/outcome/[vowId]` (kept/broken) or `/vow/[id]` (voided)
- Tap filter chip → update query `?filter=X`

### 17.3 Copy

- Hero: "Your record."
- Sub dynamic: "{N} kept · {N} broken · ${N} saved"
- Filter chips: "All" / "Kept" / "Broken" / "Voided" / "Witnessed"
- Empty (no vows): same as dashboard empty state

---

## 18. Settings `/settings`

### 18.1 Layout

- `AppChrome` + `BackButton`
- Hero `display-sm` serif: "Settings."
- Sections (each a `RitualCard`):
  1. **Account** — display name, phone (if phone-authed), email (if OAuth). Edit display name inline.
  2. **Payment methods** — card brand + last 4 (from Stripe customer). "Add card" button.
  3. **Notifications** — SMS reminders toggle (default on), Push toggle (default on if token exists).
  4. **Privacy** — link to `/privacy`, "Request data export" button, "Delete account" (DangerButton).
- Bottom: `DangerButton` "Sign out"
- Tiny meta: version number, build hash

### 18.2 Interactions

- Display name edit: inline editable text, save on blur
- Add card: opens `PaymentModal` in add-card mode (Stripe SetupIntent)
- Delete account: confirmation modal with typing confirmation ("type DELETE")
- Sign out: calls `supabase.auth.signOut()`, redirects to `/`

### 18.3 Copy

- Hero: "Settings."
- Account label: "ACCOUNT"
- Payment label: "PAYMENT METHODS"
- Notifications label: "NOTIFICATIONS"
- Privacy label: "PRIVACY"
- Sign-out: "Sign out"
- Delete account confirm: "This is permanent. Type DELETE to confirm."
- Delete account CTA: "Delete my account"

---

## 19. Hamburger menu

Slide-out nav (reused component `HamburgerMenu`).

### 19.1 Layout

- Fixed top-left button (3-line icon) on dashboard, home (when authed), vow detail, history, settings
- Slides in from right (80vw or 360px max), full height
- Dark-tinted backdrop

### 19.2 Menu items

1. **New vow** → `/create`
2. **My vows** → `/dashboard`
3. **History** → `/history`
4. **Dare a friend** → `/cast`
5. **Group Challenges** — disabled, shows "COMING SOON" badge in gold
6. **Settings** → `/settings`
7. Bottom: tiny link to `/privacy` and `/terms`, version

### 19.3 Copy

- Item labels as above
- Coming soon badge: "COMING SOON"
- Group challenges sub-text (tiny, below label): "Dry April. No phone in bed. Coming soon."

---

## 20. Legal pages `/privacy`, `/terms`

### 20.1 Layout

- Simple `RitualScreen` with full-width max-width 680px content column
- Serif `display-sm` headings, sans body
- Body: 15px, line-height 1.8, `--text-muted`
- `BackButton` top-left

Content stays whatever is there already — only restyle via design tokens.

---

## 21. Expo mobile app (parallel spec)

Follow Designer A's aesthetic. Port web's styling to React Native via:
- Colors: hardcode in `constants/colors.ts` mirroring web's `design-tokens.ts`
- Fonts: use `expo-font` to load Playfair Display + Inter
- `vow-ui.tsx` — DO NOT MODIFY (per CLAUDE.md)

Routes map 1:1. Restyle `expo/app/*.tsx` to use the new palette and component shapes. Major new component: `intro-ceremony.tsx` (already exists per audit — verify and update).

---

## 22. Summary of routes with design state

| Route | Priority | Scope | Notes |
|---|---|---|---|
| `/` + ceremony | P0 | Full redesign | Marketing surface. Ceremony on first visit. |
| `/create` | P0 | Full redesign | Primary creation flow (multi-step, in-place). |
| `/seal` | P0 | Full redesign | Commitment moment. Phone-first auth, keep OAuth fallback. |
| `/sent` | P0 | Full redesign | The cliffhanger. |
| `/dashboard` | P0 | Full redesign | Urgency-sorted sections. Reused DashboardCard. |
| `/vow/[id]` | P0 | Full redesign | Multi-phase detail page. Timeline. |
| `/w/[token]`, `/w/[token]/verdict` | P0 | Full redesign | Witness flow. External. |
| `/c/[token]` | P0 | Full redesign | Challenge flow. External. |
| `/vow-kept`, `/vow-broken` | P1 | Full redesign | Outcomes, split by destination type. |
| `/outcome/[vowId]` | P1 | Full redesign | Public share target. |
| `/certificate/[vowId]` | P1 | Full redesign | Shareable certificate. |
| `/history` | P1 | Full redesign | Past vows list. |
| `/self-resolve` | P1 | Full redesign | Emergency self-judgment. |
| `/cast` | P1 | Full redesign | Dare a friend. |
| `/settings` | P2 | Full redesign | Account/prefs. |
| `/privacy`, `/terms` | P3 | Style only | Legal pages. |
| `/auth/callback` | P3 | Style spinner only | OAuth handler. |
| `/witness-invite`, `/sent` legacy, `/witness`, `/refine`, `/stake` | P3 | Keep as redirects or minor styling | Back-compat. |

---

**End of screen specs.**
