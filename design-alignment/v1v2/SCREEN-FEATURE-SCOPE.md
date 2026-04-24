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

## / (home) — PR #3T (pending)

**Decision:** TBD — will be proposed when #3T starts.
**Mock:** `01-home.html`
**Known features to evaluate:** Live feed table (current) vs "I vow to..." input + verdict pill + starter chips (mock)

---

## /quick-vow — PR #3U (pending)

**Decision:** TBD — will be proposed when #3U starts.
**Mock:** `08-quick-vow.html`
**Known features to evaluate:** Current vertical form vs mock's card-based layout + one-tap suggestions + dual pill CTA
