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

## / (home) — PR #3AC (polish pass)

**Decision:** Copy + UX polish pass on unauthenticated landing.
**Date:** 2026-04-24

**Changes from PR #3T baseline:**
- Subtitle: "Stake cash on your word. Your friend judges. Flake and lose it all." (Joey's copy, overrides mock's longer subtitle)
- Hero label: REMOVED (was "YESTERDAY, YOU SAID TOMORROW." from mock — removed to reduce cognitive load, H1 is strong enough alone)
- Date pill: HIDDEN until user types at least 1 character (progressive disclosure, reduces decision anxiety on first impression)
- Chips: reduced from 5 to 3 — kept "Gym 3x this week", "No texting my ex", "No alcohol, 2 weeks" (Hick's law — fewer options, faster decision; removed "Delete TikTok for a week" and "No DoorDash this week" as weaker/more niche)

**Unchanged:** H1, brand wordmark, input, CTA, footer note, all flow logic, ceremony, auth redirect, smart date parsing.

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
- Note: Bottom-sheet rebuild completed in PR #3V (see below).

---

## /refine — PR #3V (bottom-sheet overlay rebuild)

**Decision:** Full layout rebuild from full-page to bottom-sheet overlay matching mock.
**Date:** 2026-04-24
**Mock:** `02-refine-nudge.html`

**Design approach:** Standalone page styled as a bottom-sheet (not a real overlay on home).
- Faux home content rendered at 18% opacity with 2px blur (pointer-events none)
- Dark backdrop overlay: rgba(15,13,10,0.72)
- Animated bottom sheet with slide-up entrance

**Layout elements (matching mock):**
- Drag handle pill (32x3px, rule color, centered at top)
- "?" glyph circle (36x36, gold border, gold-soft bg, serif italic)
- Headline: "Is this specific enough?" (Joey override — NOT mock's "Will Nick know if you did it?")
- Body text explaining why vague vows don't work (references user's raw input inline)
- Quoted vow block (surface-2 bg, gold left border, "YOUR VOW" uppercase label)
- GoldCTA "Tighten it" (routes to /stake with AI-generated refined text)
- MutedSecondary "Keep it as-is" (routes to /stake with original rawInput)

**Navigation chrome:** None (mock shows no topbar). "Keep it as-is" serves as dismissal path. Browser back goes to /.

**Preserved from current code:**
- useVowFlow() hooks (vow, setRefinedText)
- Redirect guard (no rawInput -> /)
- generateSuggestion() and getContextualSuggestions() from vow-logic
- All routing logic to /stake

**Intentional deviations from mock:**
1. Headline: "Is this specific enough?" (witness name not available at this stage)
2. GoldCTA height: 58px (primitive default) vs mock's 50px — kept for cross-screen consistency

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

---

## /vow-kept — PR #3X

**Decision:** Full rebuild to match mocks M11 (charity) + M11B (cause-you-hate).
**Date:** 2026-04-24
**Mocks:** `m11-vow-kept-charity.html`, `m11b-vow-kept-cause-you-hate.html`

**Layout changes (old -> new):**
- Old: emoji trophy (80px circle), FrauncesSub (sans 14px), RitualCard dashboard variant, plain text secondary
- New: full SVG trophy with halo + drop-shadow (96px wrap, 80x80 SVG), serif italic 16px sub, receipt card with "-- The Receipt --" label + dashed rows, gold secondary with flame icon

**Key fixes from PR #3R audit:**
1. H1 copy: already correct ("You actually did it.") but fontWeight fixed to 500
2. Sub font: changed from FrauncesSub (sans 14px) to inline serif italic 16px per mock
3. Receipt card: rebuilt with proper label, dashed-border rows, green "$X returned" with check mark, streak with flame icon
4. Confetti dots: added 8 static gold particles per mock
5. Secondary: now gold-colored text with flame icon, "Dare a friend" (not dim text)
6. Padding: fixed to 70px 28px 28px (was 100px 36px 40px)
7. Background gradient: corrected ellipse dimensions, position, opacity per mock

**M11B variant (cause-you-hate):**
- Shield SVG hero with heraldic red/gold gradient
- "Crisis averted." H1 + "$X saved from [cause]" gold line
- "Saved from" receipt row with ban glyph (circle + slash)
- "Tell everyone you saved $X from [cause] ->" CTA

**Hardcoded hex values (from mock, not tokens):**
- #4ade80 (mock's --green, used for money returned text/check)
- #E8B656 (mock's --gold-bright, used in saved-from text-shadow)
- #C8443A (mock's --red, used in ban glyph)

---

## /vow-broken — PR #3X

**Decision:** Full rebuild to match mocks (charity + cause-you-hate).
**Date:** 2026-04-24
**Mocks:** `vow-broken-charity.html`, `vow-broken-cause-you-hate.html`

**Layout changes (old -> new):**
- Old: div-with-crack "UV" glyph (80px), Stamp primitive above H1, FrauncesSub (sans 14px), RitualCard dashboard variant
- New: full SVG broken seal (96px, 4-piece cracked wax + jagged crack), H1 first, then sub, then receipt, then inline stamp below receipt

**Key fixes from PR #3R audit:**
1. Element order: stamp moved from above H1 to below receipt (matching mock)
2. Stamp styling: muted-red #A05248 (mock's --muted-red), serif 600 16px, 1.5px border, borderRadius 4, rotate(-3deg) — was uv-danger #F87171, sans 22px, 2px border, borderRadius 8, rotate(-2.5deg)
3. H1: "You broke it." for charity (no "Brutal." prefix). "Brutal. You broke it." for anti-cause only.
4. Sub font: changed from FrauncesSub (sans 14px) to inline serif italic 16px per mock
5. Receipt card: rebuilt with label, dashed-border rows, Money row ($X -> destination), Streak row
6. Padding: fixed to 84px 28px 28px (was 100px 36px 40px)

**Cause-you-hate variant:**
- Broken seal + red shield overlay SVG (44x50, with ban circle inside)
- "Brutal. You broke it." H1 with tighter letter-spacing
- "$X just went to [cause]" sub with red text-shadow
- Money row with red destination text + glow
- "Make a new vow -- let's make this back ->" CTA + "Post the damage ->" secondary

**Added URL param:** `streak` — for "Streak ended at X" display in receipt

**Hardcoded hex values (from mock, not tokens):**
- #A05248 (mock's --muted-red, stamp border + text)
- #C8443A (mock's --red, used in cause-you-hate destination styling)
