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

## /quick-vow — PR #3U (pending)

**Decision:** TBD — will be proposed when #3U starts.
**Mock:** `08-quick-vow.html`
**Known features to evaluate:** Current vertical form vs mock's card-based layout + one-tap suggestions + dual pill CTA
