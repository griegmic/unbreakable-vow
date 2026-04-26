# Visual Density Audit — A (Contract) vs B2 (Monument)

## Per-Screen Density Scoring

### A—Home (Fraunces)
- **Distinct type levels:** 7 (hero label 10px, h1 56px, h1 em italic, sub 14.5px, input label 13px italic, input 22px, chips 13px)
- **Scannability:** 4/5 — Hero dominates (56px), sub copy reads easily. Chips compete slightly.
- **Grid discipline:** Loose. Margins: 54px top, 28px sides, 56px after brand. H1 margin 22px. Inconsistent baseline.
- **Worst offender:** 4 chips in 2×2 wrap (7px gap) feel cramped relative to 56px headline above. Visual weight imbalance.
- **Best move:** Input-label serif italic (13px #C89B3C) creates visual hierarchy without color clutter. Restrained.

### A—Stake (Fraunces)
- **Distinct type levels:** 9 (step 10px, h1 32px, h1 em, section-label 10px, amount-label serif 22px, amount.sel golden, dest-name 17px, dest-desc 11.5px, selected-box serif 17px, pre-cta 13px italic)
- **Scannability:** 3/5 — 32px headline shrinks energy. 4-column amount grid with 8px gap is efficient but dense. Destination cards compete (17px name vs 22px input).
- **Grid discipline:** Tighter. Amounts: 4-col, 8px gap. Destinations: 2-col, 8px gap. Selected box borders left-accent. But headline margin (22px) breaks the rhythm from home (56px).
- **Worst offender:** Section labels (10px, all-caps, muted color) are barely scannable — visual weight too light relative to amount grid weight.
- **Best move:** Amount selection (gold-soft bg + border) is crisp — glanceable without needing color interpretation.

### A—Witness (Fraunces)
- **Distinct type levels:** 8 (wordmark 13px, summons 13px italic gold, h1 30px, h1 .name italic, ask 14px, doc-label 9.5px, vow-quote 22px italic, meta-v 16px serif, ask-line 14px italic)
- **Scannability:** 4/5 — Compact (30px h1 + 22px quote). Meta grid (2-col, 14px/18px gap) readable. Doc container provides framing.
- **Grid discipline:** Strong local. Witness screen has tight container (padding 30px). Meta uses consistent gaps. But overall padding (30px vs stake's 54px) is inconsistent.
- **Worst offender:** Meta keys (9.5px uppercase) too small relative to values (16px). Creates >1.5× weight swing per row.
- **Best move:** Dashed border under vow-quote (1px, rule color) is subtle but anchors the emotional core.

### B2—Home (Newsreader)
- **Distinct type levels:** 6 (masthead sans 10px, est serif 12px italic, eyebrow sans 10px, h1 52px, h1 em, sub serif 17px italic, input-label 10px, input 22px, example-num sans 10px, example serif 15px)
- **Scannability:** 5/5 — Masthead rule below (1px, subtle) creates clear anchor. 52px headline has breathing room. Examples list (4 rows, 12px padding, dashed rule bottom) editorial and scannable.
- **Grid discipline:** Editorial grid. Masthead rule → 56px margin. Examples: consistent 12px row padding, rule between. Baseline ~12-14px rhythm holds.
- **Worst offender:** None. Helper text (13px italic serif, muted) sits clearly under input.
- **Best move:** Examples as editorial list (not chips) — serif numerals (01–04), brass + glyphs — more restrained and mature than A's chip grid.

### B2—Stake (Newsreader)
- **Distinct type levels:** 8 (topbar sans 10px, eyebrow sans 10px brass, h1 38px, h1 em, section-label 10px, amount-label serif 12px, amount serif 28px, dest-name 20px serif, dest-desc 12px, selected-row 10px/17px, pre-cta 13px serif italic)
- **Scannability:** 5/5 — 38px headline (vs A's 32px) gives breathing room. Amounts: 4-col with **1px gaps that become grid rules** — crisp visual grid, not clutter. Brass top accent on selected dest is sharp.
- **Grid discipline:** Strong. Amounts grid: `grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--rule)` — grid lines visible, 20px padding per cell. Dest grid: ruled border, 1px sep between columns. Selected-row uses top/bottom borders as rules, not boxes.
- **Worst offender:** None. Pre-CTA italic serif (13px) is small but intentional (context hint).
- **Best move:** Amounts as typographic grid (serif numerals 28px, $ label small) — no background color needed, just grid lines. Functional and elegant.

### B2—Witness (Newsreader)
- **Distinct type levels:** 7 (masthead sans 10px, edition serif 11px italic, dateline serif 13px brass, h1 34px, h1 .name italic, ask serif 15px italic, quote serif 24px italic, meta-k 10px, meta-v serif 16px, role serif 14.5px italic)
- **Scannability:** 5/5 — Pull-quote layout (border-top/bottom, padding 28px, label floating) is editorial and clear. Meta table (3 rows, 12px padding, ruled) reads instantly. Role callout (center, italic, 14.5px) drives home the ask.
- **Grid discipline:** Strong. Pull uses centered label at -7px offset. Meta: consistent row padding (12px), ruled borders. Role centered for emphasis.
- **Worst offender:** None. Typography is restrained and purposeful.
- **Best move:** Pull-quote styling (border + floating label) elevates the vow moment. Serif quote (24px italic, centered) treats it as a document artifact, not just text.

---

## Cross-Direction Comparison

### Type System Clarity
- **A (Contract):** 7–9 type levels per screen. Serifs compete with sans. Italic used liberally for emphasis (input-label, sub, pre-cta). Margin rhythm inconsistent across screens (56px → 22px → 30px).
- **B2 (Monument):** 6–8 type levels per screen. Sans (Inter) reserved for labels/caps; serif (Newsreader) for body/input/quotes. Italic serif used sparingly (sub, dateline, quote, ask, role) — more restrained. Margin rhythm more editorial (56px → 34px on stake, consistent 30px padding).

**Winner:** B2. Cleaner separation of concerns. Serif doesn't fight with sans; sans is clearly hierarchical (labels, caps). Consistent use of serif weight (300/400/500) instead of A's mix of 400/500/600.

### Hierarchy Breakpoints
- **A:** 
  - Home: Headline dominates, chips feel secondary but not clearly de-emphasized.
  - Stake: Shrinking headline (56px → 32px) loses energy. Section labels (10px, muted) are too light relative to amount grid.
  - Witness: Compact but works — h1 (30px) + quote (22px) create two focal points.

- **B2:**
  - Home: Headline (52px) + editorial examples (not chips) feel like two equal acts; eyebrow (10px brass) separates them cleanly.
  - Stake: Headline (38px, larger than A's 32px) maintains visual weight. Amount grid is functional (1px separators, not visual clutter). Dest cards have top-accent (2px brass) instead of full bg — lighter.
  - Witness: Pull-quote dominates (24px italic, centered, bordered). Meta table is secondary (10px/16px). Role is tertiary (14.5px, centered, italic). Three-tier clarity.

**Winner:** B2. Hierarchy doesn't compress on task-heavy screens. Witness screen in B2 especially — pull-quote feels like *the document*, not just text to read.

### Color Contrast: Gold vs Brass
- **Gold (#C89B3C):** Warmer, slightly denser. On #0F0D0A (A's bg), reads crisply at small sizes (10px labels, 13px input-label). Amount.sel border is readable.
- **Brass (#D2BC8C):** Lighter, more open. On #1A1816 (B2's bg), needs careful weight pairing. Eyebrow (10px sans 500) reads cleanly. Dest top-accent (2px) is crisp. Selected amount background (full cell colored) is stronger than A's border approach.

**Technical note:** At 3x retina (e.g., 180ppi), gold reads sharper due to higher chroma. Brass reads warmer but requires more weight (500+ sans, 400+ serif) to match legibility. B2's use of brass on sans labels (uppercase, 500 weight, 0.3–0.42em letter-spacing) compensates with density. A's gold benefits from tighter spacing and higher serif weights (400–500).

---

## Density Contracts: v1 (Tight) and v2 (Loose)

### A-Contract v1 (Tight)
**Goal:** Fraunces + gold contract DNA, maximum information density without sacrificing hierarchy.

**Type matrix:**
- Headline: 48px (down from 56px home) / 28px (down from 32px stake) / 28px (witness)
- Body copy: 14.5px (unchanged)
- Labels: 10px uppercase (unchanged)
- Input/serif accent: 20px (down from 22px)
- Line-height on body: 1.4 (down from 1.55)

**Spacing unit:** 12px base
- Margins: top 44px (56px → 44px), sides 24px, between sections 16px (down from 22px)
- After h1: 16px (down from 22px)
- Padding in containers: 12px (down from 14px)

**Grid & rules:**
- Chips: 6px gap (down from 7px), 8px padding (down from 9/13px)
- Amounts: maintain 4-col, reduce gap to 6px
- Destination cards: 8px padding (down from 14px)
- Borders: keep gold-line but reduce from rgba(…, 0.22) to 0.18

**Elements to cut:**
- Remove dashed rule under vow-quote on witness (save 1px)
- Reduce dest-desc from 11.5px to 11px
- Collapse pre-cta margin from 12px to 8px

**Scannability target:** 3.5/5. Headlines smaller but still lead. Chips denser but still discrete.

---

### A-Contract v2 (Loose)
**Goal:** Same DNA, more generosity. Hierarchy maintained but breathing room added.

**Type matrix:**
- Headline: 60px (home) / 36px (stake) / 32px (witness) — each up 4-8px
- Body copy: 15px (up 0.5px)
- Input/serif accent: 24px (up 2px)
- Line-height on body: 1.6 (up from 1.55)

**Spacing unit:** 16px base
- Margins: top 64px (from 54px in original), sides 32px, between sections 28px
- After h1: 28px (from 22px)
- Padding in containers: 16px (from 14px)

**Grid & rules:**
- Chips: 10px gap (from 7px), 12px padding (from 9/13px)
- Amounts: maintain 4-col, increase gap to 12px
- Destination cards: 18px padding (from 14px)
- Borders: gold-line at rgba(…, 0.22) (unchanged — line weight, not color)

**Elements to keep/expand:**
- Keep dashed rule under vow-quote (adds breathing room in doc)
- Increase dest-desc to 12px
- Add 16px margin above pre-cta

**Scannability target:** 4.5/5. Headline breathing matches home baseline. Chips feel less crowded. Witness doc feels like a real artifact.

---

### B2-Monument v1 (Tight)
**Goal:** Newsreader + brass editorial DNA, maximum density while preserving rhythm.

**Type matrix:**
- Headline: 46px (home, down from 52px) / 34px (stake, down from 38px) / 30px (witness, down from 34px)
- Sub/body serif: 15px (down from 17px), line-height 1.4 (down from 1.45)
- Examples list: 14px (down from 15px)
- Line-height overall: 1.35 (down from 1.45)

**Spacing unit:** 10px base
- Margins: 44px top (from 54px), 28px sides (from 32px), section gap 12px (from 14px/22px)
- After h1: 16px (from 20px on home; 28px from 32px on stake)
- Row padding: 10px (from 12px in examples, 18px in meta)

**Grid & rules:**
- Amounts: 1px gaps (unchanged — they read as rules, not space)
- Examples: padding 10px 0 (from 12px), rule unchanged
- Meta table: padding 10px 0 (from 12px)
- Masthead rule: unchanged (1px, rule color)

**Elements to cut:**
- Reduce dest-desc from 12px to 11px
- Collapse pre-cta margin from 14px to 10px
- Edition stamp to 10px (from 11px)

**Scannability target:** 4.5/5. Grid still reads; breathing room tighter but editorial structure holds.

---

### B2-Monument v2 (Loose)
**Goal:** Maximum editorial breathing. Headline-led design with generous white space.

**Type matrix:**
- Headline: 56px (home) / 42px (stake) / 38px (witness) — all up 4-8px
- Sub/body serif: 18px (from 17px), line-height 1.55 (from 1.45)
- Examples list: 16px (from 15px)
- Line-height overall: 1.55 (from 1.45)

**Spacing unit:** 18px base
- Margins: 72px top (from 54px), 36px sides (from 32px), section gap 28px (from 14px/22px)
- After h1: 32px (from 20px on home; 36px from 32px on stake)
- Row padding: 14px 0 (from 12px), column gap 18px (from 14px)

**Grid & rules:**
- Amounts: 1px gaps + increased cell padding (from 20px to 24px vertical)
- Examples: padding 14px 0, rule unchanged
- Meta table: padding 14px 0, row gap 18px
- Masthead rule: unchanged but margin below increases to 60px (from 56px)

**Elements to keep/expand:**
- Keep all italic serif weights — add breathing room emphasizes them
- Pull-quote padding: 32px (from 28px)
- Increase dest-desc to 13px
- Add 18px margin above pre-cta

**Scannability target:** 5/5. Feels like a magazine. Every section is a breathing act.

---

## Consistency Rules (All 4 Versions)

1. **Type anchor:** Fraunces or Newsreader serif only for h1, input, quotes, meta-values. Sans (Inter Tight or Inter) only for caps, labels, buttons. No serif footnotes or button text.

2. **Accent color:** Gold (#C89B3C) for A; brass (#D2BC8C) for B2. Use only on: labels, emphasis within copy (italics), borders, accent rules. Never as background fill for primary content.

3. **Headline-to-body ratio:** Headline line-height must be ≤1.1. Body copy must be ≥1.4. (Prevents headline from feeling loose, body from feeling cramped.)

4. **Rule hierarchy:** Primary dividers (between sections) = full-width borders. Secondary dividers (between grid items) = 1px gaps with matching background color as rule. Never use color-filled backgrounds for grid separation.

5. **Button size:** CTA height must be 58–60px across all versions. Font size inside button (serif, 14–17px) stays readable; button never shrinks to accommodate density.

---

## Specific Cuts & Keeps

| Element | A-v1 Cut? | A-v2 Keep? | B2-v1 Cut? | B2-v2 Keep? |
|---------|----------|----------|-----------|-----------|
| Dashed rule under quote (witness) | Yes (save 1px space) | Keep | No (already ruled) | Keep + expand padding |
| Chips (A home) | Keep (core UX) | Expand gap | N/A | N/A |
| Examples list (B2 home) | N/A | N/A | Keep (functional) | Keep + larger type |
| Dest-grid cards (both stake) | Keep, tighter | Expand | Keep, add top accent | Keep, increase padding |
| Pre-CTA copy (both stake) | Shrink margin | Expand | Shrink margin | Expand |
| Masthead rule (B2 all screens) | N/A | N/A | Keep | Keep (editorial anchor) |
| Edition/est stamp (B2 witness/home) | N/A | N/A | Shrink type | Keep at 11px |

---

## Summary

**A (Contract):** Dense, legal-document intent. Type system is flexible but can feel chaotic (7–9 levels coexist). Works best at v2 (loose) where breathing room elevates the contract feel. Gold is crisp; the system benefits from tighter spacing to compensate.

**B2 (Monument):** Editorial, authoritative. Type system is restrained (6–8 levels, clear roles). Works at both v1 (tight, magazine-like) and v2 (loose, coffee-table-book). Brass is warmer; the system breathes naturally even at tight density.

**Best for tight:** B2-v1. Grid discipline + editorial structure means density doesn't sacrifice clarity.
**Best for loose:** Both v2s work, but A-v2 feels more like a *brand*, while B2-v2 feels more like *product*.
