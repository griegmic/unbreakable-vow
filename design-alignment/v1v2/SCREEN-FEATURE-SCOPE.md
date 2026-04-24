# Screen Feature Scope Decisions

Decisions about what features to keep vs strip when rebuilding screens to match HTML mocks.
Check this doc FIRST when starting a P0 screen rebuild to avoid re-asking the same scope question.

---

## /stake (PR #3S)

**Decision:** Option A — Keep all features, restyle to match mock layout.
**Date:** 2026-04-24
**Mock:** `03-pitch.html`

**Features in current code but NOT in mock:**
1. Consequence type selector (charity vs anti-cause vs witness) — 3 radio cards → KEPT, restyled
2. Destination picker (list of charities/causes as pills) → KEPT, collapsed behind "change" link
3. Deadline picker (shown when vow text doesn't imply deadline) → KEPT, in RitualCard below tiles
4. "Enter other amount" text link → replaces mock's "other" tile; allows custom amounts including $0

**Tile decisions (product, not visual drift):**
- Tiles: $10 / $25 / $50 / $100, with $50 selected by default
- Deviation from mock (which shows $25 / $50 / $100 / other) is intentional: $10 preserved as lowest-friction accessible entry point for first-time users
- "Enter other amount": serif italic dim text link below tile grid (separate from tiles, not a 4th tile) — when tapped, opens inline input with $200 as default/placeholder value. Accepts any amount including $0, which routes through the existing $0 Stripe-skip path. Kept as separate text link rather than 4th tile to keep the grid clean.
- Verdict date format includes time to match mock: "Sun, Apr 26 · 9pm"

**FrauncesH1 opsz readability fix:**
- FrauncesH1 card size (24px, used in vow card) uses `opsz` matching actual font size (24) instead of hardcoded 144
- Deviation from mock (which uses `opsz 144` at all sizes) is intentional: at 24px, `opsz 144` produces overly delicate strokes that hurt readability on dark backgrounds. The OpenType `opsz` axis is designed to match optical size to rendered size.

**Reasoning:** Features exist for real product reasons. Mock is a visual target for the screen's primary content (vow card → tiles → pill CTA), not a feature spec.

---

## / (home) — PR #3T

**Decision:** Full rebuild of unauthenticated landing to match mock layout.
**Date:** 2026-04-24
**Mock:** `01-home.html`

**What was replaced:**
- Old gold-filled-square logo + "UNBREAKABLE VOW" sans wordmark → diamond seal (rotated 45deg square, gold border, gold inner dot) + Fraunces "Unbreakable *Vow*" wordmark
- Old H1 "You say a lot. / This time vow it." → "Make a vow. / Mean it." (italic gold)
- Old subtitle about "$$ on a goal" → mock subtitle about telling a friend / putting money on it
- Live feed table (FEED_ROWS) → "I vow to..." functional input + verdict date pill + starter chips
- Two CTAs (GoldCTA "Make your vow" + OutlinedGoldCTA "Dare a friend") → Single GoldCTA "Make my vow →"

**Mock-match checklist:**
- Copy: "Make a vow. / Mean it." matches mock
- Input: functional, stores to VowFlowProvider, routes to /stake (specific) or /refine (vague)
- Date pill: functional with smart parsing, default 7 days. Presets: This Sunday, 1 week, 30 days, Pick date
- Starter chips: match mock exactly
- Live feed: REMOVED (was not in mock)
- "Dare a friend" CTA: REMOVED (was not in mock, single CTA per mock)
- Footer note: "60 seconds. No account needed yet." matches mock

**New features added (from mock):**
1. Functional text input with smart date parsing (inferDeadline + duration parser for "N weeks/days")
2. Verdict date pill — shows computed deadline, updates in real-time as user types
3. "change" link on pill toggles preset date options: This Sunday, 1 week, 30 days, Pick date (native date input)
4. 5 starter chips that populate the input on tap
5. "Sign in" link in brand header (opens AuthModal, matching settings page pattern)
6. Footer note: "60 seconds. No account needed yet."

**Routing logic:**
- On submit: stores rawInput + deadline to VowFlowProvider
- Vague vows (analyzeVow() returns 'vague') → /refine
- Specific vows → /stake (skips /refine)
- Uses existing shouldSkipRefine pattern from VowFlowProvider

**Preserved unchanged:**
- CeremonyOverlay (full component, all phases, all animations)
- Auth redirect logic (useEffect checking isAuthenticated, return paths, cookie-based redirects)
- Authenticated user spinner
- Ceremony check logic (localStorage 'uv_ceremony_seen')

**Refine page change (same PR):**
- Headline changed from "Sharpen your vow." to "Is this specific enough?" — removes dependency on knowing witness name at refine stage

---

## /refine — PR #3T (headline override)

**Decision:** Override mock headline
**Date:** 2026-04-24
**Mock:** `02-refine.html`

- Mock headline: "Will Nick know if you did it?" (references witness name)
- Production headline: "Is this specific enough?" (no witness name dependency — witness isn't chosen yet at this stage)
- Note: Refine layout is still full-page, not bottom-sheet overlay per mock. Bottom-sheet rebuild queued as separate PR.

---

## /quick-vow — PR #3U

**Decision:** Option A — Full layout rebuild to match mock, keep all state/handler logic.
**Date:** 2026-04-24
**Mock:** `08-quick-vow.html`

**Layout changes (old -> new):**
- Old: RitualScreen utility wrapper, FrauncesH1 "Quick vow." heading, vertical form sections (input, deadline pills, witness input, stake pills, if-broken card), single GoldCTA + OutlinedGoldCTA
- New: Full-bleed screen matching mock layout. Topbar (live pulse + avatar menu trigger), vow card with inline meta-pills, one-tap suggestion chips, dual CTA footer

**Topbar:**
- Left: "2 VOWS LIVE" green pulse (static for now, real count is follow-up)
- Right: AvatarMenuTrigger primitive (28px visual avatar in 44x44 touch target, opens navigation menu)
- No heading — removed per Joey's approval. Mock has no heading.

**Avatar-as-menu trigger (addition a + c):**
- Created new `AvatarMenuTrigger` primitive at `web/src/components/primitives/AvatarMenuTrigger.tsx`
- Pattern appears in multiple mocks (08-quick-vow, s20-dashboard-*), so primitive is reusable
- 44x44 transparent touch target wrapping 28px visual avatar circle
- display_name fallback chain: first letter of displayName -> first letter of email -> "?"
- Opens same navigation menu as HamburgerMenu (same links, same portal pattern)

**Vow card:**
- Surface bg, gold-line border, 18px radius, gold gradient ::before top line
- Header: "A NEW VOW" eyebrow + "need an idea?" link (scrolls to suggestions)
- Input: Fraunces serif 23px, transparent, opsz 144, placeholder "walk 10,000 steps every day"
- Meta-pill row (below dashed divider): verdict pill, stake pill, witness pill
- Tapping any pill expands inline options below the card (deadline presets, stake tiles, witness input)

**One-tap suggestions (5 rows from mock):**
- First row featured (subtle gold gradient bg, gold-line border)
- Each: serif vow text + "$amount . deadline" in gold
- Tapping fills card with suggestion values

**Footer (dual CTA):**
- Primary (flex 2.2): pill-shape gold gradient "Lock it in -- $50 ->" (Expo copy improvement)
- Secondary (flex 1): outlined "Dare a friend / -> them" (adapts to "Dare [name]" when witness set)
- Reassurance: "Keep your word. Keep your $50." (dynamic amount, Expo copy improvement)

**Preserved from current code:**
- All useVowFlow() hooks and state management
- Auth check via useAuth()
- handleSeal handler (saves to VowFlowProvider, routes to /seal)
- IfBrokenSheet modal
- inferDeadline() smart date parsing
- All deadline/stake computation helpers

**Copy changes from mock (Expo improvements):**
- CTA: "Lock it in -- $50" instead of mock's "Make my vow -- $50"
- Reassurance: "Keep your word. Keep your $50." instead of mock's "Held by Stripe..."
- Secondary CTA: adapts text when witness name available

**Three additions (Joey-approved):**
- (a) Avatar touch target: 44x44 transparent wrapper on 28px visual
- (b) display_name fallback: matches auth-provider.tsx chain (full_name -> email prefix -> "?")
- (c) Primitive reuse: AvatarMenuTrigger created as reusable primitive (used in multiple mocks)
