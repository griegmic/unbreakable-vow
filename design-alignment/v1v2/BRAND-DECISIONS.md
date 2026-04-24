# Brand Decisions Log

Design decisions made during V6 implementation that normalize or override pre-V6 values. Each entry should be revisited post-V6-ship for final sign-off.

---

## ChoicePill (PR #3J)

**ChoicePill canonical border: 1px** — was 1.5px on pre-#3J StakeChip in /c/[token]. Normalized during #3J consolidation. Logged for revisit.

**ChoicePill canonical fontSize: 14px default / 15px flex** — Deadline pills in /quick-vow bumped +1px from pre-#3J 13px. Normalized during #3J consolidation. Logged for revisit.

---

## /stake selected-state tints (PR #3M)

**Selected-state tints normalized.** Three alpha values (0.08, 0.12, 0.15) and one gold base (212,162,79) collapsed into two tokens (`--uv-gold-selected-bg` at `rgba(200,155,60,0.12)`, `--uv-gold-selected-shadow` at `rgba(200,155,60,0.15)`). Two out of five usages were normalized (0.08→0.12 on consequence card bg, 0.15→0.12 on consequence icon bg). Base color shifted from 212,162,79 to V6 canonical 200,155,60 across all five. Revisit post-V6-ship if any specific selected state looks wrong in design audit.

**RitualCard visual:** V6 canonical borderRadius 18 and boxShadow `0 8px 24px rgba(0,0,0,0.2)` applied. Pre-V6 values (borderRadius 22, heavier shadow) superseded. V6 primitive is source of truth for card styling across the app.

---

## New tokens (PR #3P)

**--uv-danger-border: rgba(248, 113, 113, 0.25)** — Mirrors --uv-success-border naming. Used for danger-state borders (dev test verdict "broken" button). Distinct from --uv-danger-bg (0.10 alpha) which is for backgrounds.

**--uv-info: #60A5FA** — Blue semantic token for neutral "waiting/pending" states distinct from success (green), warn (amber), danger (red). Used for challenge-pending status pill and verdict-waiting state.

**--uv-info-bg: rgba(96, 165, 250, 0.15)** — Background tint for info states. Used for challenge-pending icon background and verdict status pill.

---

## PR #3Q — Primitive reconciliation against HTML mocks

Full primitive-level audit and reconciliation. Every value below was pulled directly from the HTML mock files in `design-alignment/v1v2/flow/html/`. If the primitives ever drift again, re-audit against these source files.

### FrauncesH1

| Property | Old | New | Source mock |
|----------|-----|-----|-------------|
| font-weight | 500 | **400** | 01-home.html h1 |
| letter-spacing | `-0.035em` (xl), `-0.025em` (lg) | **`-0.02em`** (hero/page), **`-0.012em`** (card) | 01-home.html h1, 03-pitch.html .vow-text |
| font-variation-settings | `"opsz" 144` | **`"opsz" 144, "SOFT" 30`** | 01-home.html h1 |
| size prop | `'lg' \| 'xl'` | **`'hero' \| 'page' \| 'card'`** | hero=01-home (52px/0.98), page=04-auth (38px/1.05), card=03-pitch (24px/1.15) |

### FrauncesSub

| Property | Old | New | Source mock |
|----------|-----|-----|-------------|
| font-family | `var(--uv-font-serif)` | **`var(--uv-font-sans)`** | 01-home.html .sub (Inter Tight) |
| font-size | 17px | **14px** | 01-home.html .sub |
| font-style | italic | **normal** | 01-home.html .sub |
| line-height | 1.45 | **1.5** | 01-home.html .sub |

### GoldCTA

| Property | Old | New | Source mock |
|----------|-----|-----|-------------|
| height | 62px | **58px** | 01-home.html .cta |
| background (gradient) | `135deg, 3-stop (bright→gold→deep)` | **`180deg, 2-stop (#D4A94A → #B88930)`** | 01-home.html .cta |
| font-size | 18px | **17px** | 01-home.html .cta |
| box-shadow | `0 0 20px var(--uv-gold-glow), inset 0 1px 0 rgba(255,255,255,0.18)` | **`0 1px 0 rgba(255,220,140,0.25) inset, 0 10px 30px rgba(200,155,60,0.18)`** | 01-home.html .cta |
| variant prop | `'filled-gold' \| 'filled-imsg-green'` | **`'default' \| 'pill' \| 'filled-imsg-green'`** | 03-pitch.html .cta (pill: 999px radius, solid #F4ECDB, arrow-pill sub-element) |

**Non-tokenized gradient hex values:** `#D4A94A` and `#B88930` (default gold CTA), `#F4ECDB` and `#1A1205` (pill variant) are intentionally not tokenized. These are gradient construction values that appear only in GoldCTA and don't map to any semantic token. Source: 01-home.html .cta, 03-pitch.html .cta.

### OutlinedGoldCTA

| Property | Old | New | Source mock |
|----------|-----|-----|-------------|
| height | 62px | **52px** | m11b-vow-kept-cause-you-hate.html .cta-outline |
| border | `1.5px solid var(--uv-gold)` | **`1px solid var(--uv-gold-line)`** | m11b .cta-outline, s19-declined.html .cta-outline |
| font-size | 18px | **14.5px** | m11b .cta-outline |
| font-style | normal | **italic** | m11b .cta-outline |
| box-shadow | `0 0 0 4px rgba(200,155,60,0.07)` | **none** | m11b .cta-outline |

### MutedSecondary (new component)

Created from mock pattern. Used for cancel/dismiss/step-back actions.

| Property | Value | Source mock |
|----------|-------|-------------|
| height | 44px | 02-refine-nudge.html .btn-secondary |
| border-radius | 12px | 02-refine-nudge.html .btn-secondary |
| border | `1px solid var(--uv-border-soft)` | 02-refine-nudge.html .btn-secondary (`rgba(240,233,219,0.08)` = `--rule`) |
| color | `var(--uv-text-muted)` | 02-refine-nudge.html .btn-secondary (`#A49A85`) |
| font-family | `var(--uv-font-sans)` | 02-refine-nudge.html .btn-secondary (Inter Tight) |
| font-size | 13px | 02-refine-nudge.html .btn-secondary |
| font-weight | 500 | 02-refine-nudge.html .btn-secondary |

### RitualCard

| Property | Old | New (ceremony) | New (dashboard) | Source mock |
|----------|-----|----------------|-----------------|-------------|
| border | `1px solid var(--uv-border)` (#322D24) | **`1px solid var(--uv-gold-line)`** | **`1px solid var(--uv-border-soft)`** | 03-pitch.html .vow-card (ceremony), s20-dashboard-multi.html .vow-card (dashboard) |
| box-shadow | `0 8px 24px rgba(0,0,0,0.2)` | **`0 20px 50px rgba(0,0,0,0.4)`** | **none** | 03-pitch.html .vow-card |
| ::before | none | **gold gradient line** | none | 03-pitch.html .vow-card::before |
| variant prop | `compact?: boolean` | **`variant?: 'ceremony' \| 'dashboard'`** | | — |
| border-radius (dashboard) | 18px | — | **14px** | s20-dashboard-multi.html |

### RitualScreen

| Property | Old | New (ceremony) | New (utility) | Source mock |
|----------|-----|----------------|---------------|-------------|
| padding | `0 36px`, paddingTop 120 (ceremony); `0 22px`, paddingTop 24 (utility) | **`54px 28px 36px`** | **`24px 22px 24px`** | 01-home.html .screen (ceremony), 03-pitch.html .screen (utility) |
| max-width | 480px | **393px mobile / 440px desktop** (`@media (min-width: 768px)`) | same | HTML mocks use 393px iPhone viewport |
| background | flat `var(--uv-bg)` + radial gold gradient | unchanged | unchanged | — |
| floating orbs | present in ui.tsx version | **removed** (already absent in primitives/ version) | — | no orbs in any HTML mock |

### New token

| Token | Value | Source mock |
|-------|-------|-------------|
| `--uv-gold-soft` | `rgba(200, 155, 60, 0.10)` | 01-home.html `:root` `--gold-soft` |

Added to both `globals.css` and `expo/lib/uv-tokens.ts` for parity.

### CSS class

`.ritual-card-ceremony::before` added to globals.css — renders the `linear-gradient(90deg, transparent, var(--uv-gold), transparent)` top border decoration. Source: 03-pitch.html `.vow-card::before`.

---

## FrauncesH1 opsz scaling (PR #3S)

**opsz now scales with font size for card variant.** Previous behavior: `"opsz" 144` at all sizes. New behavior: `"opsz" 144` for hero/page sizes (fontSize > 30), `"opsz" {fontSize}` for card size (24px). This is a deliberate deviation from the HTML mocks (which use `opsz 144` universally) — at 24px, opsz 144 produces overly delicate strokes that hurt readability on dark backgrounds. The OpenType `opsz` axis is designed to match optical size to rendered size; using the actual font size at small scales follows the axis's intent.

- **Source:** Readability observation during /stake layout rebuild
- **Deviation from mock:** Yes — mock uses `opsz 144` at all sizes
- **Rationale:** Readability at 24px on dark backgrounds; follows OpenType opsz axis design intent
- **File:** `web/src/components/primitives/FrauncesH1.tsx`
