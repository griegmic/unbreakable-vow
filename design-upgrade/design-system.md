# Unbreakable Vow — Design System v1.0

**Status:** Authoritative. This document is ground truth for every styling decision.
**Audience:** Claude Code executing the `design-upgrade` branch build.
**Rule:** If a component in code doesn't match something in this file, the file wins — update the code.

---

## 0. Philosophy (three sentences, memorize)

1. **The ceremony is the product.** Every screen should feel like an event, not a form submission.
2. **A friend who calls you out gently.** Copy is direct and slightly accusatory; styling is warm, serif, confident.
3. **Gold is a resource.** Used sparingly it signals weight. Used everywhere it signals nothing. When in doubt, muted.

---

## 1. Color tokens

All colors are expressed as CSS custom properties on `:root` in `web/src/app/globals.css`. Never hardcode hex values in components.

### 1.1 Background hierarchy (darkest → brightest)

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#0a0907` | App background. Near-black with warm tint. Not pure black. |
| `--bg-card` | `#100d09` | Default card background on `--bg` surfaces. |
| `--bg-elev` | `#15110c` | Elevated surface (bottom sheet, modal body, review cards). |
| `--bg-input` | `#1a1612` | Form inputs, radio rows, stake pills (unselected). |
| `--bg-selected` | `#2a2015` | Selected state on radio rows, stake pills, cause chips. |
| `--bg-overlay` | `rgba(5, 4, 4, 0.72)` | Modal/sheet backdrop (dimmed app behind). |

Never use `#000000` anywhere. Never use `#fff` anywhere (see text tokens).

### 1.2 Border tokens

| Token | Value | Usage |
|---|---|---|
| `--border` | `#1a1612` | Default divider (same hex as `--bg-input`; visually recedes into surface). |
| `--border-strong` | `#2a231b` | Cards, inputs, radio rows (visible but subtle). |
| `--border-gold` | `var(--gold)` | Active input, selected stake pill, gold-bordered card. |
| `--border-gold-soft` | `rgba(212, 168, 74, 0.24)` | Gold-tinted card border (key decision callouts). |

### 1.3 Text hierarchy (brightest → faintest)

| Token | Hex | Usage |
|---|---|---|
| `--text` | `#f5f0e4` | Primary copy, headlines, input values. |
| `--text-muted` | `#a8a193` | Supporting copy, subheads, descriptions. |
| `--text-dim` | `#8a8275` | Muted labels, chip text, witness relation text. |
| `--text-faint` | `#6b6354` | Meta labels ("STAKE", "JUDGE"), timestamps, footnote disclaimers. |
| `--text-invisible` | `#4a443a` | Placeholder text (italic), disabled label text. |
| `--text-on-gold` | `#1a1205` | Text that sits on a `--gold` fill (primary CTA, logo mark). |

### 1.4 Accent — gold

| Token | Hex | Usage |
|---|---|---|
| `--gold` | `#d4a84a` | Primary accent. CTAs, section labels, progress fill, brand chrome, active borders. |
| `--gold-bright` | `#f0c86e` | Hover state on primary CTA, gold gradient high-end. |
| `--gold-dim` | `#8a7540` | Gold text that needs to recede (secondary gold like "Change ›"). |
| `--gold-deep` | `#8c6423` | Gold gradient low-end, pressed state. |
| `--gold-bg` | `#2a2015` | Tinted background for selected gold chip/pill (matches `--bg-selected`). |
| `--gold-glow` | `rgba(212, 168, 74, 0.28)` | Ambient background orb on ceremonial screens. |

### 1.5 Signals

| Token | Hex | Usage |
|---|---|---|
| `--success` | `#4ade80` | Kept-vow celebration, "Clear and time-bound" validation, live-feed dot, verdict-kept button. |
| `--success-bg` | `#0f2916` | Selected "cause you believe in" card background. |
| `--success-border` | `#1f6b3f` | Selected "cause you believe in" card border. |
| `--danger` | `#f87171` | Broken-vow accent, error text, verdict-broken button, destructive settings row. |
| `--danger-bg` | `#2a1612` | Broken-vow tinted background. |
| `--warn-bg` | `#2a1f14` | 48h+ pending "Continue on your honor" callout. |
| `--warn-border` | `#5a4520` | Warn callout border. |

### 1.6 Status colors (dashboard + badges)

Previously hardcoded in `dashboard-card.tsx`. Move to tokens:

| Token | Hex | Meaning |
|---|---|---|
| `--status-active` | `#52d69a` | Active vow (countdown in progress). |
| `--status-pending` | `#fb923c` | Witness hasn't accepted yet. |
| `--status-verdict` | `#60a5fa` | Awaiting verdict (deadline passed, witness deciding). |
| `--status-neutral` | `#5a5650` | Voided, legacy, inert. |

### 1.7 Anti-cause theme (outcome screens only)

Used exclusively when a broken vow funded an anti-cause. Never used in creation flow.

| Token | Hex | Usage |
|---|---|---|
| `--anti-red` | `#c04040` | "You played yourself" headline, anti-cause gradient top. |
| `--anti-red-deep` | `#5a1a1a` | Anti-cause gradient bottom. |

---

## 2. Typography

### 2.1 Font loading (`web/src/app/layout.tsx`)

Use `next/font/google` — never CDN links, never CSS imports from URLs.

```ts
import { Playfair_Display, Inter } from 'next/font/google';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});
```

Apply `${playfair.variable} ${inter.variable}` to `<html>`.

### 2.2 Font stack tokens (CSS)

```css
--font-serif: var(--font-serif), 'Playfair Display', Georgia, serif;
--font-sans:  var(--font-sans),  'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono:  ui-monospace, 'SF Mono', Menlo, monospace;
```

Body default: `font-family: var(--font-sans)`.

### 2.3 Type scale

Every heading-level element in the app uses one of these. No arbitrary sizes.

| Role | Font | Size | Line-height | Weight | Letter-spacing | When to use |
|---|---|---|---|---|---|---|
| `display-xl` | serif | 56px | 1.0 | 400 | -0.5px | Landing hero on desktop; `/vow-kept` + `/vow-broken` outcome headline. |
| `display-lg` | serif | 36px | 1.0 | 400 | -0.3px | Mobile landing hero ("You say a lot. / Back it up."). |
| `display-md` | serif | 32px | 1.04 | 400 | -0.2px | Primary flow heros ("What's your vow?"). |
| `display-sm` | serif | 26px | 1.08 | 400 | 0 | Witness + stakes heros ("Name the one who'll judge you."). |
| `display-xs` | serif | 22px | 1.1 | 500 | 0 | Bottom-sheet titles ("By when?"), section heads in long docs. |
| `heading` | sans | 18px | 1.3 | 500 | 0 | Card titles, seal-success title, menu section heads. |
| `body` | sans | 15px | 1.55 | 400 | 0 | Default prose, subheads, descriptions. |
| `body-sm` | sans | 13px | 1.5 | 400 | 0 | Secondary copy, card content, list rows. |
| `label` | sans | 11px | 1.3 | 500 | 1.5px, uppercase | Section labels ("I VOW TO", "STAKE", "SUGGESTED FOR YOU"). |
| `meta` | sans | 10px | 1.3 | 500 | 1.5px, uppercase | Progress indicator ("1 / 5"), tiny metadata. |
| `caption` | sans | 12px | 1.4 | 400 | 0 | Footnote disclaimer ("No charge unless you break your vow"). |
| `input` | sans | 14px | 1.3 | 400 | 0 | All form inputs, textarea. `font-size ≥ 16px` on actual `<input>` elements to prevent iOS zoom — set the VISUAL size via scale/line-height if needed, not via font-size. |
| `button-lg` | sans | 14px | 1.2 | 500 | 0 | Primary CTAs. |
| `button-md` | sans | 13px | 1.2 | 500 | 0 | Secondary CTAs, "Change ›", inline buttons. |
| `button-sm` | sans | 11px | 1.2 | 500 | 0 | Chip buttons, pick buttons, pill CTAs. |

### 2.4 Italic + gold rules

Italic is never decorative. It carries meaning:

- **Gold italic serif**: emotional accent in a serif hero. One phrase per screen, max. (`*vow?*`, `*who'll judge you.*`, `*are you?*`)
- **Gold italic sans**: suggestion chip text ("Ship the side project by Friday") — signals "these aren't your words yet."
- **Dim italic sans**: placeholder text in input fields.
- **Muted italic sans**: the whisper under a hero ("You know the one.").

Never italicize for mere emphasis. Never italicize in CTAs.

### 2.5 Weight ceiling

Max weight is 600. No 700/bold anywhere. Use color (`--text`) or size to add weight, not font-weight. This is a deliberate typographic discipline — it keeps the aesthetic restrained.

---

## 3. Spacing

8px grid. Every margin, padding, and gap is a multiple of 4px; most are multiples of 8.

| Token | px | Use |
|---|---|---|
| `--space-1` | 4px | Between a label and its value (meta rows). |
| `--space-2` | 8px | Between chips, between stake pills. |
| `--space-3` | 12px | Inside small cards, between tight list rows. |
| `--space-4` | 16px | Default card padding, standard gap. |
| `--space-5` | 20px | Section spacing, card-to-card gap. |
| `--space-6` | 24px | Screen padding left/right (mobile). |
| `--space-7` | 32px | Gap between hero and next block. |
| `--space-8` | 40px | Top spacing under app chrome on large screens. |
| `--space-9` | 56px | Landing hero breathing room. |
| `--space-10` | 80px | Marketing section spacer (desktop landing). |

### 3.1 Screen padding (container)

- Mobile: `padding: 24px 20px 40px;` (top/side/bottom; bottom accounts for CTA)
- Desktop: max-width 440px centered, same padding as mobile

### 3.2 Card padding

- Ritual card (default): `20px`
- Review card (seal screen): `16px 18px`
- Small card (stake pill, chip): `8px 14px`
- Contact card: `22px 16px`

---

## 4. Border radius

Semantic names, not pixel values in component code.

| Token | px | Use |
|---|---|---|
| `--radius-xs` | 4px | Tiny chip, progress bar end-cap. |
| `--radius-sm` | 8px | Pill buttons, stake pills, small chips, inline badges. |
| `--radius-md` | 12px | Primary CTA, review cards, if-broken inline row, secondary buttons. |
| `--radius-lg` | 14px | Chips (preset vow suggestions), contact-pick button. |
| `--radius-xl` | 18px | Input fields, radio rows, cause cards, bottom-sheet body. |
| `--radius-2xl` | 22px | Ritual cards, dashboard cards, bottom-sheet container. |
| `--radius-3xl` | 28px | Phone-frame screen container (certificate page). |
| `--radius-pill` | 9999px | Fully round (live dot, avatar circle, status indicators). |

---

## 5. Shadows

Every shadow token serves a specific elevation role. No ad-hoc `box-shadow: 0 4px 8px rgba(0,0,0,0.2)` in component code.

| Token | Value | Use |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.3)` | Chip hover, subtle lift. |
| `--shadow-md` | `0 4px 12px rgba(0, 0, 0, 0.45)` | Dashboard card resting. |
| `--shadow-lg` | `0 12px 32px rgba(0, 0, 0, 0.55)` | Modal, auth sheet, payment modal. |
| `--shadow-xl` | `0 24px 48px rgba(0, 0, 0, 0.65)` | Seal-success card, certificate frame. |
| `--shadow-sheet` | `0 -20px 50px rgba(0, 0, 0, 0.6)` | Bottom sheet (cast upward). |
| `--shadow-gold-glow` | `0 0 24px rgba(212, 168, 74, 0.28)` | Seal button focus, ceremonial moment. |
| `--shadow-gold-press` | `inset 0 2px 4px rgba(0, 0, 0, 0.3)` | Primary CTA pressed. |

---

## 6. Animation

### 6.1 Easing curves

```css
--ease-out:   cubic-bezier(0.22, 1, 0.36, 1);     /* Default: element entering scene */
--ease-in:    cubic-bezier(0.65, 0, 0.85, 0);     /* Element leaving (rare) */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);    /* Transitions between states */
--ease-ceremonial: cubic-bezier(0.19, 1, 0.22, 1); /* Longer, drawn, for ceremony + seal moments */
```

### 6.2 Duration scale

| Token | ms | Use |
|---|---|---|
| `--dur-fast` | 120ms | Hover, chip tap, button press feedback. |
| `--dur-base` | 240ms | Fade-in, scale-in, standard transition. |
| `--dur-slow` | 400ms | Screen transitions, ritual card entry. |
| `--dur-ceremonial` | 800ms | Ceremony screens 1 → 2, seal success animation. |
| `--dur-ambient` | 8000ms | Gold-glow pulse, background orb drift. |

### 6.3 Named keyframes (globals.css)

Already-defined keyframes in the current codebase that stay: `fadeUp`, `scaleIn`, `checkBounce`, `shimmer`, `pulse-glow`, `slideUp`, `fadeIn`. Also add:

```css
@keyframes ceremonyFadeIn {
  0% { opacity: 0; transform: translateY(20px) scale(0.98); filter: blur(6px); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}

@keyframes ceremonyFadeOut {
  0% { opacity: 1; transform: translateY(0); filter: blur(0); }
  100% { opacity: 0; transform: translateY(-12px); filter: blur(4px); }
}

@keyframes sealSweep {
  /* gold sweep across review card on seal confirmation */
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes verdictFlipKept {
  0% { transform: rotateY(0deg); }
  50% { transform: rotateY(90deg); background-color: var(--bg-card); }
  100% { transform: rotateY(0deg); background-color: var(--success-bg); }
}

@keyframes goldDotPulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
  50% { opacity: 0.8; box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
}
```

### 6.4 Reduced motion

At the top of `globals.css` add:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Elements that MUST still animate (e.g., ceremony fade-in to avoid a hard snap) use `animation: ceremonyFadeIn var(--dur-slow) var(--ease-out) !important` in their own selector, overriding the above with a shortened duration.

---

## 7. Components

Every reusable component pattern. Component files live in `web/src/components/ui.tsx` unless noted. Exported names are stable — see API notes.

### 7.1 RitualScreen (container)

```tsx
<RitualScreen>
  <div className="screen-inner">{children}</div>
</RitualScreen>
```

**Behavior:** Full-viewport dark background (`--bg`). Ambient orb (gold-glow radial gradient) positioned top-right, 320px diameter, opacity 0.6, `blur(60px)`. Content max-width 440px, centered, min-height 100vh, flex column, `padding: 24px 20px 40px;`. Safe-area insets respected (`padding-top: max(24px, env(safe-area-inset-top))`).

**Variants:**
- `variant="ceremony"` — removes ambient orb, adds a gold-gradient vignette for ceremony screens.
- `variant="outcome-kept"` — adds `--success-bg` ambient wash.
- `variant="outcome-broken"` — adds `--danger-bg` ambient wash.
- `variant="anti-cause-broken"` — adds `--anti-red` gradient wash.

### 7.2 AppChrome (logo + brand wordmark)

18px gold square with a 7px inner dark diamond (rotated 45°). To its right: "UNBREAKABLE VOW" label in 11px gold, 1.5px letter-spacing, 500 weight. Top-left of RitualScreen, 44px margin-bottom before content.

### 7.3 Progress indicator

```tsx
<Progress step={1} total={5} />
```

Two-column flex: `1 / 5` text in `meta` style + flex-1 2px tall progress bar with gold fill. Animated width transition on step change, `var(--dur-base) var(--ease-out)`.

### 7.4 Buttons

Four variants. All buttons use `button-lg` type unless noted.

**PrimaryCTA (gold filled):**
- Background: `var(--gold)`, text: `var(--text-on-gold)`
- Padding: `14px 20px`, radius: `var(--radius-md)`, width: `100%`
- Hover: `background: var(--gold-bright)` (120ms transition)
- Active/press: `background: var(--gold-deep)`, `box-shadow: var(--shadow-gold-press)`, `transform: scale(0.985)`
- Disabled: `background: var(--bg-selected)`, text: `var(--text-faint)`
- Loading: spinner inside (2px border, `--text-on-gold` color)

**SecondaryCTA (gold text, no fill):**
- Background: transparent, text: `var(--gold)`, font: `button-md`
- No border. Optional underline on hover only.
- Used for: "Copy link instead", "Search all contacts", "Enter a number manually".

**SoftCTA (muted / "maybe"):**
- Background: `var(--bg-selected)`, text: `var(--text-dim)`
- Same geometry as PrimaryCTA
- Used for: Next button when vow is vague but user wants to proceed anyway.

**DangerCTA:**
- Background: `var(--danger-bg)`, border: `1px solid var(--danger)`, text: `var(--danger)`
- Used for: "Sign out", "Void this vow", "He didn't" (verdict broken).

### 7.5 Input

```tsx
<TextInput active={focused} placeholder="Run every morning this week" value={...} />
```

- Background: `var(--bg-input)`, border: `1px solid var(--border-strong)`, radius: `var(--radius-xl)` (18px)
- Padding: `13px 15px`, text: `input` style, color: `var(--text)`
- Placeholder: `--text-invisible`, italic
- **Active state:** `border-color: var(--gold)`, smooth transition (`120ms`)
- **Filled valid state:** border stays `--border-strong`, a tiny gold underline absolute-positioned inside the right edge (12px wide × 1.5px tall) indicates content is committed.
- **Error state:** `border-color: var(--danger)`, error message below in `caption` + `--danger` color.

### 7.6 Chips

Two variants, both defined on the ChoiceChip component.

**Preset chip:**
- Background: transparent
- Border: `1px solid var(--border-strong)`
- Text: `--text-dim`, `button-sm`
- Padding: `5px 10px`, radius: `var(--radius-lg)` (14px)
- Hover: border becomes `--border-gold-soft`, text becomes `--text`
- Tapped: border becomes `--gold`, background becomes `--gold-bg`, text becomes `--gold`

**Suggestion chip (vague-vow path):**
- Border: `1px dashed var(--gold)`
- Text: `--gold`, italic
- Same geometry as preset chip.
- Tap replaces the vow input value.

### 7.7 Stake pill

One of four pills in a row. Flex: `1`.
- Unselected: background `--bg-input`, text `--text-dim`, no border
- Selected: background `--gold-bg`, border `1px solid --gold`, text `--gold`, weight 500
- Geometry: padding `8px 0`, radius `var(--radius-sm)` (7-8px), gap between pills: 6px
- Font: `button-sm` (11-12px)

### 7.8 Radio row (bottom-sheet options)

- Background: `--bg-input`, border: `1px solid --border-strong`, radius: `var(--radius-xl)` (10-12px)
- Padding: `12px 14px`
- Flex between: label on left, radio circle on right
- Radio circle: 16×16, border `1.5px solid --border-strong`, on select → border becomes `--gold`, 7px gold dot centers
- Selected row: background `--gold-bg`, border `--gold`, label color `--gold`, label weight 500
- Special row ("Pick a date"): label color `--gold`, right edge is a `›` chevron instead of radio circle

### 7.9 Cause card (if-broken picker)

- Background: `--bg-input`, border: `1px solid --border-strong`, radius: `var(--radius-xl)`
- Padding: `11px 13px`
- Row layout: `[emoji] [title + sub] [selection indicator]`
- Title: `body-sm`, `--text`, weight 500
- Sub: `12px`, `--text-dim`
- Selected (believe-in): background `--success-bg`, border `--success-border`, title `--success`, `✓` in `--success`
- Selected (hate-to-fund): background `--bg-selected`, border `--gold`, title `--gold`, `✓` in `--gold`

### 7.10 Review card (seal screen)

- Background: `--bg-elev`, border: `1px solid --border-strong`, radius: `var(--radius-md)` (8px)
- Padding: `12px 14px`
- Structure:
  - Row 1: `label "I VOW TO"` (meta style)
  - Row 2: vow text in `display-xs` serif italic, `--text`
  - Divider (1px, `--border-strong`, 10px above and below)
  - Row 3: flex-between 3-column grid: `STAKE` `JUDGE` `BY` with gold dollar amount, name, date below
  - Dollar amount: `display-xs` serif, `--gold`

### 7.11 Context pill (breadcrumb)

Shown on screens after the first — reminds the user of their earlier choices.
- Background: `--bg-elev`, border-left: `2px solid --gold`, radius: `0 4px 4px 0`
- Padding: `5px 9px`
- Text: `11px`, `--text-muted`
- Content: `"Run every morning · Dan K."` (vow snippet + current context joined with middle dot)

### 7.12 Contact card (first-time witness primer)

- Background: `--bg-elev`, border: `1px solid --border`, radius: `var(--radius-md)`
- Padding: `22px 16px`, text-align: center
- Structure: 36×36 gold-outlined icon circle (top), title `body`, inline "Sync contacts" gold button below
- Icon: lucide-react `Users` or equivalent, 17×17, stroke `--gold`, stroke-width 1.8

### 7.13 Contact row (suggested list)

- No background, no border (divider line 1px `--border` between rows)
- Padding: `10px 0`
- Layout: `[avatar 34×34 circle, --bg-selected background, initials in --gold] [flex-1 name + relation] [Pick button]`
- Name: `body-sm`, `--text`
- Relation: `11px`, `--text-faint`
- Pick button (primary): gold fill, `--text-on-gold`, `11px`, padding `5px 12px`, radius `--radius-lg` (12px)
- Pick button (secondary): transparent, border `1px --border-strong`, `--text-dim`

### 7.14 Bottom sheet

- Position: `absolute` within its phone-frame parent; or `fixed` + full overlay on real screens
- Background: `--bg-elev`, border: `1px solid --border-strong`, radius: `22px 22px 0 0` (top-only)
- Padding: `16px 16px 14px`
- Entry: `slideUp` animation (240ms, `--ease-out`)
- Backdrop: `var(--bg-overlay)` fading in parallel (240ms)
- Handle: 36×3, `--border-strong`, `var(--radius-pill)`, centered, 14px below top edge
- Dismissable by: backdrop tap, swipe-down gesture, close button (if any)

### 7.15 Modal (auth / payment)

- Same geometry as bottom sheet on mobile (slides from bottom)
- On desktop: centered modal, max-width 420px, radius `var(--radius-2xl)` all sides, `--shadow-lg`

### 7.16 OathCheckbox

- 18×18 square, border `1.5px --border-strong`, radius `4px`
- Unchecked: empty
- Checked: `--gold` fill, white checkmark (Lucide `Check` icon), with `checkBounce` animation
- Label to right: `body-sm`, `--text-muted`
- Used for: verdict page "I solemnly swear..." oath

### 7.17 Badge

Inline status pill used throughout (dashboard cards, vow detail headers, navigation).

```tsx
<Badge variant="active" | "pending" | "verdict" | "kept" | "broken" | "voided" />
```

- Geometry: `padding: 4px 10px`, `radius: var(--radius-pill)`, `font: button-sm`, `letter-spacing: 0.5px`, uppercase
- Colors:

| Variant | Background | Text |
|---|---|---|
| `active` | `rgba(82, 214, 154, 0.14)` | `--status-active` |
| `pending` | `rgba(251, 146, 60, 0.14)` | `--status-pending` |
| `verdict` | `rgba(96, 165, 250, 0.14)` | `--status-verdict` |
| `kept` | `rgba(82, 214, 154, 0.18)` | `--status-active` |
| `broken` | `rgba(248, 113, 113, 0.14)` | `--danger` |
| `voided` | `rgba(90, 86, 80, 0.20)` | `--status-neutral` |

### 7.18 Live dot

6×6 circle, `--success`, `goldDotPulse` animation (2s loop). Sits left of "Live" label in the landing page's activity feed.

### 7.19 Feed row (landing activity feed)

- Flex between: `[vow text] [stake amount in gold]`
- Padding: `8px 0`
- Border-bottom: `1px --border`, except last row
- Vow text: `body-sm`, `--text-muted`
- Stake: `body-sm`, `--gold`, weight 500

### 7.20 Dashboard card (vow tile)

Replaces the existing `components/dashboard-card.tsx` implementation but keeps the same interface.

- Background: `--bg-card`, border: `1px solid --border-strong`, radius: `var(--radius-2xl)`
- Padding: `16px 18px`, `--shadow-md`
- Layout (mobile, stacked):
  - Top row: status badge (left) · meta right-aligned ("Day 3 of 7" or "24h left")
  - Vow text (middle): `display-xs` serif italic, `--text`
  - Bottom row: witness info ("Sarah M. is judging") `body-sm` `--text-dim`, + stake amount `button-md` gold right-aligned
- Tap: full card is the tap target, goes to `/vow/[id]`
- Hover (desktop): `--shadow-lg` + 1px translateY(-1px)

### 7.21 Timeline row

Event timeline shown on `/vow/[id]`.
- Left column: 8×8 gold dot, connected to next row by a 1px `--border-strong` vertical line
- Right column: `[event label in label style] [timestamp in meta]` + optional description in `body-sm`
- Special events (verdict, seal) have a larger 12×12 dot with gold glow

### 7.22 Validation message

Inline below an input.
- Background: `--bg-elev`, radius: `6px`, padding: `7px 11px`
- Icon (✓ or ⚠): 11px, left
- Text: `11px`, `--text-dim`
- Variants: success (✓ in `--success`), warning (⚠ in `--gold`), error (× in `--danger`)

### 7.23 SMS preview (sealed + share screen)

- Background: `--bg-elev`, border: `1px solid --border-strong`, radius: `var(--radius-md)`
- Padding: `12px 14px`
- Label: `"YOUR TEXT TO DAN"` in `meta` style, `--text-faint`
- Body: `body-sm`, `--text-muted`, line-height 1.5
- URL: `11px`, `--text-faint` (below body)

### 7.24 Phone frame (certificate + public outcome)

Visual container used on shareable surfaces.
- Background: `--bg` with warmer layer, border-radius: `36px`, padding: `10px`
- Inner: `--bg-card`, radius: `28px`, padding: `24px`
- `--shadow-xl`

---

## 8. Iconography

- Primary icon library: `lucide-react` (already in codebase). Stroke-width: 1.8 unless tiny.
- Size scale: 14 / 16 / 18 / 20 / 24 px.
- Color: match surrounding text token by default. Gold icons only for emotional accents (contact primer, seal icon).
- Never mix icon sets. No emoji replacing an icon that should be an icon. BUT:

### 8.1 Emoji usage (deliberate, sparing)

| Where | Emoji | Why |
|---|---|---|
| Share CTA ("Tell Dan 📱") | 📱 | Signals the verb (text them). |
| "Lock Dan in →" | → | ASCII arrow. |
| "Pick a date" in By-when sheet | 📅 | Visual affordance for date picker. |
| Cause believe-in card | 💚 | Heart, green. |
| Cause hate-to-fund card | 🔥 | Fire, urgency. |
| Vow-kept (charity) | 🏆 | Trophy. |
| Vow-kept (anti-cause) | 🛡️ | Shield ("Crisis averted"). |
| Vow-broken (charity) | 💔 | "It happens." |
| Vow-broken (anti-cause) | 💀 | "You played yourself." |
| Streak badge | 🔥 | Fire, streak count. |
| Dare | 🔥 | Orange urgency accent. |

All emoji rendered with `font-family: 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif` fallback to guarantee color rendering.

No other emoji anywhere in the app. No 👍 👏 😊 — wrong tone.

---

## 9. Layout + breakpoints

| Name | min-width | Use |
|---|---|---|
| Mobile | 0 | Default. All specs assume this. |
| Tablet | 640px | Slight adjustments (larger hero on outcome screens). |
| Desktop | 900px | Landing page switches to wider hero; dashboard can fit 2-col card grid. |

**Container rules:**
- Every screen except `/` landing: `max-width: 440px; margin: 0 auto;`
- Landing `/` on desktop: max-width: 1080px with centered 440px content column + optional right-side art/feed column
- Certificate + outcome public pages: `max-width: 420px` for mobile-first look regardless of viewport

### 9.1 Z-index scale

| Token | Value | Use |
|---|---|---|
| `--z-base` | 0 | Default |
| `--z-sticky` | 10 | Sticky headers (top bar, progress) |
| `--z-menu` | 50 | Slide-out nav menu |
| `--z-backdrop` | 90 | Modal/sheet backdrop |
| `--z-modal` | 100 | Modal/sheet content |
| `--z-toast` | 200 | Toast/notifications |

---

## 10. Accessibility

- **Contrast:** all text token pairs tested at AAA for body text, AA for large (≥18px). `--text-faint` (`#6b6354`) on `--bg` (`#0a0907`) = 4.8:1 — passes AA large only, do not use for body copy.
- **Focus ring:** all interactive elements: `outline: 2px solid var(--gold); outline-offset: 2px;` when `:focus-visible`. Never `outline: none` without a replacement.
- **Touch targets:** minimum 44×44px, including invisible padding. Chips and stake pills already get this via line-height + padding.
- **Screen reader labels:** every icon-only button gets an `aria-label`. Example: `<button aria-label="Back"><ChevronLeft /></button>`
- **Motion:** `prefers-reduced-motion` honored (§6.4).
- **Form inputs:** every `<input>` gets an associated `<label>`, even if visually-hidden.

---

## 11. Component API contract (for Claude Code)

Exports from `web/src/components/ui.tsx` — DO NOT change function names or prop shapes. Styling changes only.

```ts
// Container
export function RitualScreen({ children, variant?: 'default' | 'ceremony' | 'outcome-kept' | 'outcome-broken' | 'anti-cause-broken' }): JSX.Element

// Chrome
export function AppChrome({ showBack?: boolean, onBack?: () => void }): JSX.Element
export function BackButton({ onClick: () => void, label?: string }): JSX.Element

// Layout primitives
export function TitleBlock({ eyebrow?: string, title: ReactNode, subtitle?: string, centered?: boolean }): JSX.Element
export function SectionLabel({ children: ReactNode }): JSX.Element
export function FadeUp({ children, delay?: number }): JSX.Element

// Cards
export function RitualCard({ children, variant?: 'default' | 'elevated' | 'warn' }): JSX.Element
export function VowPreview({ text: string, variant?: 'default' | 'serif-italic' }): JSX.Element

// Form
export function PrimaryButton({ onClick, disabled?, loading?, children }): JSX.Element
export function SecondaryButton({ onClick, children }): JSX.Element
export function SoftButton({ onClick, children }): JSX.Element
export function DangerButton({ onClick, children }): JSX.Element
export function TextInput({ value, onChange, placeholder?, active?, error? }): JSX.Element
export function ChoiceChip({ label, selected?, suggestion?, onClick }): JSX.Element
export function StakePill({ amount, selected?, onClick }): JSX.Element
export function RadioRow({ label, sub?, selected?, onClick, special? }): JSX.Element
export function CauseCard({ icon, title, sub, variant: 'believe' | 'hate', selected?, onClick }): JSX.Element
export function OathCheckbox({ checked, onChange, label: string }): JSX.Element

// Status
export function Progress({ step, total }): JSX.Element
export function Badge({ variant: 'active' | 'pending' | 'verdict' | 'kept' | 'broken' | 'voided', children }): JSX.Element
export function StatPill({ value, label }): JSX.Element
export function HeaderBadge({ label }): JSX.Element

// Context
export function ContextPill({ children }): JSX.Element
```

New components being added (file remains `ui.tsx` unless noted):

```ts
// NEW — creation flow
export function SoftButton // see above
export function ContextPill // see above
export function StakePill // see above
export function RadioRow // see above
export function CauseCard // see above
export function SuggestionChip // variant of ChoiceChip with suggestion=true

// NEW — share
export function SmsPreview({ to: string, body: string, url: string }): JSX.Element

// NEW — ceremony (separate file: components/ceremony.tsx)
export function CeremonyScreen({ step: 1 | 2, onComplete: () => void }): JSX.Element
```

Existing components that change **internally only** (API unchanged):
- `AuthModal` → add phone-first primary path
- `PaymentModal` → restyle, unchanged Stripe logic
- `HamburgerMenu` → restyle
- `DashboardCard` → restyle, same onClick interface
- `ShareButton` / `CopyLinkButton` → restyle
- `Timeline` → restyle, same event shape

---

## 12. Dark mode / light mode

**Dark mode only.** The aesthetic explicitly depends on it. Do not add light mode. Respect OS `prefers-color-scheme` only in one place: `color-scheme: dark` on `<html>` so scrollbars and form controls render correctly.

---

## 13. Asset pipeline

- All icons: lucide-react (no new icon sets)
- No raster images in the design (no photos, no illustrations). The product's visual weight comes from typography and color.
- Favicons: keep existing `/public/favicon.ico`
- OpenGraph images (dynamic for certificate/outcome pages): next/og route handlers at `/og/...` already exist — restyle output but keep the dynamic rendering.

---

## 14. Writing this spec to code

### 14.1 File structure (post-overhaul)

```
web/src/app/globals.css          ← all tokens defined here; components reference via var(--token)
web/src/app/layout.tsx           ← next/font for Playfair + Inter; variables applied to <html>
web/src/components/ui.tsx        ← all core primitives
web/src/components/ceremony.tsx  ← NEW: CeremonyScreen
web/src/components/sms-preview.tsx ← NEW: SmsPreview
web/src/lib/design-tokens.ts     ← NEW: TS constants that mirror CSS vars, for use in components that need tokens at runtime (e.g., Stripe Elements theming)
```

### 14.2 Runtime token access

Stripe Elements needs colors passed via its Options API (CSS vars don't work inside the iframe). Create `lib/design-tokens.ts`:

```ts
export const tokens = {
  gold: '#d4a84a',
  goldBright: '#f0c86e',
  text: '#f5f0e4',
  textMuted: '#a8a193',
  bg: '#0a0907',
  bgInput: '#1a1612',
  borderStrong: '#2a231b',
  danger: '#f87171',
  radius: { md: 12, lg: 14, xl: 18 },
} as const;
```

Use for Stripe Elements `appearance` options.

---

## 15. Governance

Any deviation from this spec in component code is a bug and should be flagged during the QA sweep (Step 8 of the build plan). Only one person (Joey) approves changes to this document. The layer-1 build prompt treats this document as immutable reference material.

---

**End of design system spec.**
