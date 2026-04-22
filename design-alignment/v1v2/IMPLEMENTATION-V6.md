# UNBREAKABLE VOW — V6 IMPLEMENTATION HANDOFF
## The single source of truth for shipping the V6 design across web, expo, and supabase

**Author:** Joe (Product), with Claude as drafting partner
**Date:** 2026-04-22
**Status:** Authoritative. Engineering should treat this as the spec.

---

## HOW TO READ THIS DOC

This is a **wide, deep handoff**. It is not a quick reference. Engineering should read it end-to-end before opening a single file. The doc is organized into nine parts:

1. **Foundational decisions** — what's locked, what changed since last build, the identity question, the SMS template, the "heckle" promise
2. **Design tokens & pixel-fidelity contract** — colors, fonts, animations, haptics, the rules a designer can run a screen against
3. **Screen-by-screen implementation map** — every designed screen mapped to specific files in `/web` and `/expo`, with copy, components, and behavior
4. **Backend implementation** — schema migrations, edge functions, OG card service, SMS pipeline, push notifications, Stripe edges, RLS, idempotency, the CTO checklist
5. **Outcome flows (currently undesigned)** — the M11 / M11B trophy and "Crisis averted" screens Joe explicitly called out, plus destination picker, broken-vow flow
6. **Settings, account, edge states** — every screen design hasn't covered yet, with copy and component spec
7. **Web ↔ Expo parity** — what's identical, what's intentionally different, how mobile-web behaves
8. **Analytics, observability, testing** — what to instrument, what to test, what to monitor
9. **Sequencing, risks, what we're punting** — the order of work, the known unknowns, what's explicitly out of scope

Throughout: when a design exists, we link to the HTML mock and PNG render. When it doesn't, we spec it in prose with concrete copy and components.

---

# PART 1 — FOUNDATIONAL DECISIONS (LOCKED)

## 1.1 The witness identity — DECIDED

**Witness is the persistent identity. Judge is the verb for the Sunday moment.**

See `/design-alignment/v1v2/WITNESS-IDENTITY-DECISION.md` for the full panel debate.

What this means concretely:

- **Identity language** uses "witness" everywhere (in-app, OG card, SMS, witness-accepted screen, dashboard hints). When we ask the witness to *act* on Sunday, the verb shifts to "judge" or "verdict."
- **Four notifications total** during the active period: (1) witness invite/accept confirmation, (2) Day 1 "it's live", (3) 24h heads-up before verdict day, (4) verdict request. Midpoint nudge is dropped — for vows under 7 days the midpoint and 24h heads-up collapse anyway, and for longer vows the 24h heads-up is more actionable. No daily reminders, no spam.
- **No witness dashboard**, no witness feed, no list of vows you're witnessing, no witness streaks. The witness is *present* via notifications, not via a surface.
- **Maker's active-vow screen** acknowledges the witness with a single line ("Nick is witnessing this"). No interactive element.
- **Verdict screen** adds one line of context ("You've been witnessing Joey's commitment for 8 days") then the same Kept/Broken buttons.

Every copy decision in this handoff respects this.

## 1.2 The SMS template — UNIVERSAL, GRAMMAR-SAFE

**Old (current code, has the grammar bug):**
```
I vowed to ${vowText}. $${stake} on the line — you're the judge. Takes 5 sec to accept: ${witnessUrl}
```
Produces "I vowed to I'll go to the gym 4x..." — broken on most user-supplied vow text.

**New (V6 universal template, ships immediately):**
```
I just made a vow and put $${stake} on it — hold me to it!  ${witnessUrl}
```

**Why the SMS doesn't include the vow itself:** the vow lives in the OG link-preview card (server-rendered at `/w/{token}`), where it's typeset properly in Fraunces. The SMS bubble is just the voice-y opener that gets the user to tap. One template works for every vow regardless of phrasing — no interpolation, no grammar bugs, no embarrassing parses. **This is non-negotiable.**

## 1.3 The "Heckle him" promise — being kept via notifications

The V6 sealed-sent screen says: *"He's got 24 hours to accept. Heckle him until he does."*

This is a real promise we are now keeping:

- **24h "still no acceptance" reminder to maker:** push notification at +24h ("Nick still hasn't tapped. Want to heckle him?") with a deep-link to the maker's `/vow/[id]` screen, where a "Nudge Nick" CTA fires another SMS to the witness.
- **24h "you accepted but the vow is live" reminder to witness:** push at acceptance ("Joey's vow is live and you're the witness").
- **Midpoint reminder to witness:** push at vow midpoint ("Joey's halfway through — going strong").
- **Verdict request to witness:** push at end_at ("Joey's vow is up. Time to judge.")
- **Outcome notification to maker:** push when verdict is recorded.

Everything lives in `push_queue` and is processed by `cron-runner`. Cadence is in §4.6.

## 1.4 Pixel fidelity is a release-gate

> **The single most important rule in this entire document.**

Joe explicitly stated: *"the most important thing ever and I mean ever, is that the expo app and the app as well as mobile web get coded up in design that looks beautiful and exactly as designed I will not stand for the code not having it look like we have designed."*

This means:

- **No "close enough."** If the design has a 112px wax seal with a breathing halo at 3.2s ease-in-out and a 14px gold-glow box-shadow with 0.32 opacity, the implementation must match those values. Engineering does not get to round to 100px or skip the halo because "it's just a circle."
- **Every screen ships with a QA pixel-comparison.** Open the HTML mock at 393×852 in Chromium at devicePixelRatio=3. Open the live build in iPhone 15 Pro simulator. Side-by-side. Diff visually. If they don't match, it doesn't ship.
- **Token drift is a bug.** If the design uses `#C89B3C` for primary gold but the codebase has `#D4A84A`, that's a bug to file, not a "ship and fix later." See §2.1 for the canonical token table and the token reconciliation we need to do BEFORE building anything else.
- **Animations are part of the design.** The breathing halo on the seal, the OTP caret blink, the pulse dots, the seal pop-in — these are designed treatments, not decoration. They ship or the screen doesn't.

If a screen can't be built to match the design, the right move is to flag it in PR review and ask the designer (Joe, with me drafting) to revise the design, not to silently ship a degraded version.

## 1.5 Token reconciliation — DO THIS FIRST

There's a real divergence between the design tokens used in the V6 HTML mocks and the tokens currently in `/web/src/app/globals.css`. This needs to be reconciled in one PR before any screen work begins, or every screen will drift.

| Token | Mock value (V6 HTML) | Code value (current globals.css) | Decision |
|---|---|---|---|
| Primary gold | `#C89B3C` | `#d4a84a` | **Use mock value `#C89B3C`** (the V6 designs are canonical) |
| Bright gold | `#E8B656` | `#f0c86e` | **Use `#E8B656`** |
| Deep gold | `#8B6820` | `#8c6423` | **Use `#8B6820`** |
| Background | `#0F0D0A` | `#0a0907` | **Use `#0F0D0A`** (slightly warmer dark) |
| Surface | `#181512` | `#100d09` / `#15110c` | **Use `#181512`** (consolidate to one) |
| Text | `#F0E9DB` | `#f5f0e4` | **Use `#F0E9DB`** |
| Text muted | `#A49A85` | `#a8a193` | **Use `#A49A85`** |
| Text dim | `#726A5A` | `#8a8275` | **Use `#726A5A`** |
| Border hairline | `rgba(50,45,36,1)` (#322D24) | `#1a1612` | **Use `#322D24`** for visible hairlines, `rgba(240,233,219,0.08)` for super-soft rules |
| iMessage green | `#34C759` | not present | **Add `--uv-imessage: #34C759` and `--uv-imessage-deep: #2AA84A`** |
| Status success | `#4ade80` | `#4ade80` | Keep |
| Status danger | `#f87171` | `#f87171` | Keep |

**Action:** open one PR titled `chore(tokens): reconcile globals.css with V6 design tokens`. Update `globals.css`, `tailwind.config.ts`, and the Expo `unbreakable.ts` constants in lockstep. Run a diff render of the dashboard before/after to make sure nothing looks broken. This is a 1-day task and unblocks everything else.

---

## 1.6 BRAND & CINEMATIC DECISION LOG (LOCKED)

This section captures the decisions reached during V6 brand work that aren't obvious from the screen specs alone. If you're re-opening any of these, re-read this first — most of them have a long argument behind them.

### 1.6.1 The four-moment cinematic system

The product has exactly **four** moments that earn full-screen, animated, voice-of-the-brand treatment. Everything else is utility:

1. **Cold-open** (S0) — first time the app ever opens. Two-screen invitation. ~14s, skippable after second 4. AsyncStorage flag `coldOpenSeen` prevents replay.
2. **Initiation Oath** (post first-seal) — interactive "Place your hand on the seal. Mean it." Only fires for the user's first-ever sealed vow. Gated on `users.first_seal_completed_at IS NULL`.
3. **Seal Echo** ("Sworn." woven into the wax animation at the moment of seal). Fires every seal, but it's woven into the existing seal animation, not a takeover screen.
4. **Clock Starts** (the first tick of the countdown is the cinematic — a single beat where the digit replaces the seal, then the clock takes over). Fires every active vow.

That's it. **Nothing else gets a takeover.** Settings is utility. Dashboard is utility. Verdict pages are utility (with grace and seriousness, but utility). The discipline is the brand — if everything is cinematic, nothing is.

If a future PM proposes a fifth moment ("but what if we make the verdict feel epic?"), the answer is no by default. The four moments are load-bearing because they're rare. Adding more dilutes them.

### 1.6.2 Cold-open final language (LOCKED)

```
Screen 1 (~9s):
  there's a promise you keep breaking — you know the one.
  make the unbreakable vow.

Gap: 1.2 seconds of pure black

Screen 2 (~5s):
  break it, and pay the price.

Total: ~14 seconds, skippable after second 4
No wordmark in cold-open
Fraunces italic, lowercase, white + gold (line 2 + screen 2 in gold)
```

**Why this language won (over ~12 challengers):**

- **"there's a promise you keep breaking — you know the one"** — recognition, not indictment. The reader supplies the specific promise themselves. This is the difference between a sermon and a mirror. *You know the one* does almost all the work — it's the line the user finishes for us.
- **"make the unbreakable vow"** — imperative + product name in the same breath. Doubles as the CTA and as the brand introduction. We tried saying the product name separately ("Unbreakable Vow." as a wordmark beat) and it always felt corporate. Folding it into the imperative makes the product name disappear into the invitation.
- **"break it, and pay the price"** — the comma is doing real work. It separates the conditional from the consequence with the cadence of an oath. *Pay the price* is more ominous than *pay* (price implies cost beyond money — reputation, self-image, the friend who'll know).
- **The 1.2s black gap between screens 1 and 2** — does as much narrative work as the words. The user thinks the cold-open is over. The screen goes black. They reach to tap. Then the price line arrives like a second knock at the door. The gap is a structural device, not loading time.

### 1.6.3 Lines that lost (and why — so we don't relitigate)

| Contender | Why it lost |
|---|---|
| "yesterday you said tomorrow" | **Nike owns it.** One of their most famous campaign lines. Cannot use, even with attribution. Spirit lives on in "a promise you keep breaking" — same psychology, different words. |
| "every promise ever broken had one thing in common… it was free" | Clever, but didactic. Reads like a bullet point in a deck, not a cold-open. The user doesn't want a thesis; they want a reckoning. |
| "definition of unbreakable vow: a promise with money on it, sworn to a friend, break it and you pay" | Educational. Lovely as a footer; wrong as a cold-open. The cold-open is for *feeling*, not *defining*. |
| "make the unbreakable vow / keep your word, or pay the price" | Two imperatives back-to-back read as a slogan. The recognition opener ("there's a promise…") earns the imperative; the imperative-only version doesn't. |
| "break it and it's gone" / "break it and lose everything" | "Lose everything" is melodrama (we're not staking everything; we're staking what they staked). "It's gone" has no antecedent — at this point we haven't introduced money yet. **Pay the price** is the right pitch — ominous without overclaiming. |
| Three-screen versions (invitation → product name → price) | The middle screen always felt like a logo bump. Folding the product name into screen 1's imperative cut a beat without losing the brand introduction. |
| Versions using the word "witness" | No one knows what witness is yet. We can't use product-internal jargon in the first 14 seconds the user has ever seen. **Replaced with "a friend who'll know"** in any first-touch surface; *witness* is reintroduced on S14 (witness-link landing page) and inside the witness-side flow. |

### 1.6.4 Why no wordmark in the cold-open

We tested it. A static "UNBREAKABLE VOW" wordmark anywhere in the cold-open did one of two things: (a) read as a corporate splash screen and broke the spell, or (b) competed with the imperative for attention. Folding the product name into "make the unbreakable vow" lets the wordmark land *inside* the experience instead of in front of it.

The wordmark earns its first standalone appearance on S1 (home/start) — by then the cold-open has earned the user's attention.

### 1.6.5 Recognition over indictment (the posture decision)

The whole brand voice — not just the cold-open — leans on **recognition**, not **indictment**. We do not say:

- "You break your promises." (indictment)
- "Stop breaking your word." (correction)
- "You're not following through." (diagnosis)

We say:

- "There's a promise you keep breaking — you know the one." (recognition)
- "Mean it." (invitation)
- "Sworn." (witnessing)

The reader is not the patient. The reader is the witness to their own pattern. The product is the structure they impose on themselves to interrupt it. This posture should govern every piece of copy — settings, dashboard, error states, push notifications, SMS to witness. If a copy review surfaces a line that scolds, fix it.

### 1.6.6 Cause selection: pinned defaults

In S3.6 (IfBrokenSheet), each tab has a pinned default at the top:

- **Charity tab** — ALS Association pinned top. (Universal acceptability, name recognition, not politically coded.)
- **Love tab** — ALS Association pinned top *also*. (Cross-listed because giving to a cause your loved one cares about is itself an act of love. Most users who pick "love" want a charity their family member cares about.)
- **Cause you hate tab** — NRA + PETA pinned top. (Two opposing hate-magnets — one will land for almost everyone. The juxtaposition itself signals the tab's intent: pick something you'd hate to fund. Below the pinned pair is a curated list ordered for cross-political hate coverage.)

The "hate" tab is the most behaviorally powerful (loss aversion is sharper when the loss is to an enemy), but it's also the most politically loaded. Pinning **two** opposed defaults makes the tab's *function* legible without taking a side.

### 1.6.7 Maker name: Apple Pay first

Display name is sourced in this priority order:

1. **Apple Pay billing contact name** — captured from the PaymentRequest at S7. Most users will have a name attached to their Apple Pay; if so, we never ask. Source recorded as `'apple_pay'`.
2. **S6.5 manual entry** — only fires if Apple Pay didn't return a name (or the user is on the web fallback). Source `'manual'`.
3. **SMS-derived** — for witnesses/targets who arrive via token without an account, captured during account claim. Source `'sms'`.
4. **None** — fall back to "Anonymous" in all surfaces. Source `'none'`.

Schema columns `display_name_source` and `name_capture_prompted_at` track this so we can re-prompt later for users who landed in `'none'` without nagging the ones who explicitly skipped.

**Why Apple Pay first:** the highest-quality name in the product is the one Apple already validated against a payment instrument. We never want to ask for a name we can already get. The S6.5 screen is fallback-only.

### 1.6.8 Cinematic discipline (a rule, not a vibe)

A useful test for any future "let's make this feel epic" proposal:

> **Will the user see this once, or many times?**
>
> - Once → eligible for cinematic treatment.
> - Many times → utility. Make it fast and quiet.

Cold-open: once. Initiation Oath: once. Seal Echo: every seal, but it's < 800ms and woven into an existing animation, not a takeover. Clock Starts: once per vow, < 1.5s.

Dashboard load is many times. Settings open is many times. Verdict submission is many times (across all the user's vows, over a year). They all stay utility.

If you're tempted to add a flourish to a "many times" surface, the right move is almost always to remove a flourish elsewhere on it instead.

### 1.6.9 Skip behavior on cold-open

Skippable after second 4 (not earlier). The skip target appears as a faint `skip` text in the bottom-right corner — Inter Tight 12px, `--uv-text-faint` opacity 0.5. Tap target is generous (44pt minimum). Skipping advances directly to S1 and sets `coldOpenSeen = true`. No confirmation, no "are you sure" — once they've decided to skip, they've decided.

If they let it play through, the same `coldOpenSeen` flag is set on completion. Either path, we never play it twice.

### 1.6.10 Things that are NOT in the brand voice

For copy review, here's a quick negative-space list — words and patterns that should not appear in any user-facing surface:

- ❌ "Don't worry" / "Don't panic" — never say this; it is the thing it claims to prevent.
- ❌ "Oops" / "Whoops" / "Yikes" — error states should be calm, not casual.
- ❌ Exclamation marks in titles (one in body copy is fine if rare). The brand voice is low and direct, not enthusiastic.
- ❌ "Awesome" / "Great" / "Amazing" — empty praise. We earn approval by witnessing, not by cheerleading.
- ❌ Product name appearing more than once per screen. The wordmark is rare on purpose.
- ❌ Emoji in any first-party copy. (User-generated text — vow content, witness messages — preserves whatever the user typed, including emoji.)

If you find one of these in a draft, replace it. The voice is the brand.

---

# PART 2 — DESIGN TOKENS & PIXEL-FIDELITY CONTRACT

## 2.1 Color tokens (final, post-reconciliation)

```css
:root {
  /* Surfaces */
  --uv-bg:                #0F0D0A;
  --uv-bg-card:           #181512;
  --uv-bg-elev:           #1F1B16;
  --uv-bg-input:          #1A1612;
  --uv-bg-selected:       #2A2015;
  --uv-bg-overlay:        rgba(5, 4, 4, 0.72);

  /* Borders */
  --uv-border:            #322D24;          /* visible hairlines */
  --uv-border-strong:     #4A4036;
  --uv-border-soft:       rgba(240, 233, 219, 0.08);
  --uv-border-gold:       var(--uv-gold);
  --uv-border-gold-soft:  rgba(200, 155, 60, 0.22);

  /* Text */
  --uv-text:              #F0E9DB;
  --uv-text-muted:        #A49A85;
  --uv-text-dim:          #726A5A;
  --uv-text-faint:        #5A5346;
  --uv-text-on-gold:      #1A1205;

  /* Gold (PRIMARY ACCENT) */
  --uv-gold:              #C89B3C;
  --uv-gold-bright:       #E8B656;
  --uv-gold-deep:         #8B6820;
  --uv-gold-bg:           #2A2015;
  --uv-gold-glow:         rgba(200, 155, 60, 0.28);
  --uv-gold-line:         rgba(200, 155, 60, 0.22);

  /* Status (neutrals) */
  --uv-success:           #4ADE80;
  --uv-success-deep:      #2AA84A;
  --uv-success-bg:        rgba(52, 199, 89, 0.10);
  --uv-success-border:    rgba(52, 199, 89, 0.28);

  --uv-danger:            #F87171;
  --uv-danger-deep:       #C84A4A;
  --uv-danger-bg:         rgba(248, 113, 113, 0.10);

  --uv-warn:              #FB923C;
  --uv-warn-bg:           rgba(251, 146, 60, 0.10);

  /* iMessage / system */
  --uv-imessage:          #34C759;
  --uv-imessage-deep:     #2AA84A;
}
```

Expo: same values as JS constants in `/expo/constants/unbreakable.ts`. **Do not let them drift.** If you change one, change both.

## 2.2 Typography

**Web (`/web/src/app/layout.tsx`):**
- Fraunces — weights 400, 500, 600. Use `font-variation-settings: "opsz" 144` on hero h1s for proper optical sizing.
- Inter Tight — weights 400, 500, 600. Use `font-feature-settings: "tnum"` on numerics (countdown digits, currency).
- Both loaded via `next/font/google` to avoid FOIT/FOUT.

**Expo:**
- Same families via `expo-font` and `useFonts`. Load via the existing setup; do not introduce alternatives. Fallback chain: `Fraunces, Georgia, serif` and `Inter Tight, -apple-system, sans-serif`.

**Type scale:**

| Role | Size | Weight | Family | Letterspacing | Notes |
|---|---|---|---|---|---|
| Hero H1 (Sealed., Over to Nick.) | 52px | 500 | Fraunces | -0.035em | line-height 1, opsz 144 |
| Section H1 | 32–36px | 500 | Fraunces | -0.025em | opsz 144 |
| Card title | 24px | 500 | Fraunces | -0.015em | |
| Card subtitle (italic) | 17px | 400 italic | Fraunces | normal | line-height 1.45 |
| Body | 15px | 400 | Inter Tight | -0.005em | line-height 1.4 |
| Label / button | 14–18px | 500 | Fraunces or Inter Tight | varies | |
| Eyebrow / micro | 9.5–11px | 600 | Inter Tight | 0.18–0.22em | UPPERCASE |
| Numerics (countdown, currency) | varies | 500 | Inter Tight | tnum | |

**Italics matter.** Subtitles, emphasis, "Mean it", "Sealed.", witness annotations — all italic. The product's voice depends on it.

## 2.3 Spacing & radius

- **Screen padding:** 36px sides for ceremonial screens (sealed, outcome), 22px for utility (dashboard, settings).
- **Card padding:** 18–22px.
- **Card radius:** 14px (buttons), 18px (cards), 20–24px (sheets), 999px (pills).
- **Button height:** 56px (utility), 62px (primary CTA on hero screens).
- **Vertical rhythm on hero screens:** 120px top padding, 40px between hero element and H1, 16px H1→sub, 40px sub→spacer, 18px between primary CTA and fallback link.

## 2.4 Animations (every one is named, all are designed treatments)

```css
/* Breathing halo on the wax seal */
@keyframes halo {
  0%, 100% { transform: scale(1);    opacity: 1;    }
  50%      { transform: scale(1.08); opacity: 0.85; }
}
/* Apply: animation: halo 3.2s ease-in-out infinite; */

/* Seal pop-in (state A reveal after Apple Pay dismisses) */
@keyframes sealPopIn {
  0%   { transform: scale(0.85); opacity: 0; }
  60%  { transform: scale(1.04); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}
/* Apply: animation: sealPopIn 480ms cubic-bezier(0.2, 0.9, 0.3, 1.2) 1; */

/* Check-badge bounce (state B reveal after returning from Messages) */
@keyframes checkBounce {
  0%   { transform: scale(0);    opacity: 0; }
  60%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}
/* Apply: animation: checkBounce 420ms cubic-bezier(0.2, 0.9, 0.3, 1.2) 80ms 1; */

/* Generic fade-up for content reveals */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0);   }
}
/* Apply: animation: fadeUp 320ms ease-out forwards; */

/* OTP caret blink */
@keyframes blink {
  0%, 49%   { opacity: 1; }
  50%, 100% { opacity: 0; }
}
/* Apply: animation: blink 1s step-end infinite; */

/* Pulse dot (live status, judge-active indicator) */
@keyframes pulseDot {
  0%, 100% { box-shadow: 0 0 0 0   var(--uv-gold-glow); }
  50%      { box-shadow: 0 0 0 6px transparent; }
}
/* Apply: animation: pulseDot 1.6s ease-in-out infinite; */

/* Shimmer for skeleton rows */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200%  0; }
}
```

**All animations respect `@media (prefers-reduced-motion: reduce)` and degrade to static states.** This is required, not optional.

## 2.5 Haptics (Expo only — REQUIRED)

Joe explicitly called this out: *"within the app in the expo, make sure that haptics transfer over."*

Use `expo-haptics`. Map every interaction:

| Interaction | Feedback |
|---|---|
| Primary button press (Make my vow, Tell Nick, Seal it, etc.) | `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` |
| Secondary button press | `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` |
| Verdict button (Kept/Broken) | `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` (kept) or `Warning` (broken) |
| OTP digit entered | `Haptics.selectionAsync()` (per digit) |
| Stake tile selected | `Haptics.selectionAsync()` |
| Pull-to-refresh on dashboard | `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` on threshold |
| Seal animation completes | `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` (single, on the moment the wax stamps) |
| Wrong OTP entered | `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)` |
| Voiding/canceling a vow (destructive) | `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)` after confirmation |

**Haptics are subtle on web** — there's no equivalent. On web we lean harder on micro-animations (button scale-down on press, etc.) to fill the sensory gap.

**Haptics enforcement is structural via primitives; no legacy button wrappers exist.** The pre-V6 `PrimaryButton` and `SecondaryButton` referenced here were never built. V6 primitives (`GoldCTA`, `OutlinedGoldCTA`, `StakeTile`, `RadioCard`, `ContactPicker`) wrap typed haptics from `expo/lib/haptics.ts` internally — screens never call `expo-haptics` directly. The "no raw Pressable outside primitives" rule in CLAUDE.md enforces this structurally.

## 2.6 Pixel fidelity QA checklist (for every screen PR)

A designer (or you, Joe) should sign off using this checklist before merge:

1. **Screenshot the live build at 393×852 in iPhone 15 Pro simulator** (or equivalent).
2. **Open the HTML mock at 393×852 in Chromium at devicePixelRatio=3.**
3. Verify **font family, weight, style** for every text element. Italic titles are italic. Fraunces is Fraunces.
4. Verify **color values**. No "approximately gold." Match hex.
5. Verify **spacing** — outer paddings, inter-element gaps, button heights. Within 1–2 px tolerance.
6. Verify **radius** on cards, buttons, sheets, pills.
7. Verify **animations are present and respect `prefers-reduced-motion`**.
8. Verify **haptics fire on every interactive element** (Expo only).
9. **Take a side-by-side screenshot diff. Attach to PR.** Reviewer compares.
10. Test on **both light-mode-forced device** (UV is dark-only — should not flip) and **system dark mode**.

If any of these fails, the PR doesn't merge.

---

# PART 2.5 — PIXEL-FIDELITY ENFORCEMENT PROTOCOL

This section is the operating system for shipping the V6 design without drift. Part 2 told you *what* the tokens are. This section tells you *how* to keep them honest. **Joe's #1 stated requirement is pixel-faithful screens. The protocol below is how we deliver that — through architecture and process, not through reviewer discipline.**

The protocol has four pieces, in order of importance:
1. **Mock Manifest** — every screen has exactly one canonical visual source of truth
2. **Component Primitives Mandate** — drift becomes structurally impossible
3. **Forbidden Inventions** — the short list of things implementers will be tempted to add and must not
4. **Pixel-Diff Loop** — the per-screen merge gate

## 2.5A Mock Manifest

Every screen in Part 3 maps to exactly one of three canonical states:

- **V6 mock exists** — built or refreshed during the V6 design pass. Use this file as ground truth, no exceptions.
- **Pre-V6 mock exists** — the visual still holds but predates the V6 token reconciliation. Use the file as **layout + composition** ground truth, but **apply V6 tokens, V6 typography, and V6 animations from Part 2** when implementing. Mock colors will be slightly off; ignore them.
- **No mock exists** — only the prose spec in Part 3 / Part 5 / Part 6 exists. Use the spec as the only source of truth. Ask Joe before merging if the spec leaves visual decisions ambiguous. Do **not** invent a visual based on "what feels V6."

| Screen | Status | Canonical source(s) | Notes |
|---|---|---|---|
| S1 Home / Landing | V6 | `flow/html/01-home.html` | |
| S2 Refine nudge | V6 | `flow/html/02-refine-nudge.html` | |
| S3 Pitch / Stake (cheeky) | V6 | `flow/html/03b-pitch-cheeky.html` | Use cheeky variant, not `03-pitch.html` |
| S4 Witness pick (native) | V6 | `flow/html/04-witness-pick.html` | |
| S4-WEB Witness pick (web) | V6 | `flow/html/web-04-witness-pick.html` | |
| S5 Auth — phone | V6 | `flow/html/05c-auth-v4.html` | NOT v3 |
| S6 OTP | V6 | `flow/html/05d-otp-v4.html` (disabled) + `05d-otp-v4-active.html` (active) | Two states, same screen |
| S7 Apple Pay sheet | V6 | `flow/html/05e-applepay-sheet.html` | Native chrome — only merchant name + total are ours |
| S8 Sealed (state A) | **V6 CANONICAL** | `flow/html/05i-sealed-v6.html` | The most-tested screen. Pixel-perfect or fail. |
| S9 Sealed (state B) | **V6 CANONICAL** | `flow/html/05i-sealed-v6-sent.html` | Same file as S8 — state mutation, not new screen |
| S9-RECV Receiver iMessage (OG card preview) | **V6 CANONICAL** | `flow/html/05j-receiver-imessage.html` | Reference for OG card route output (§4.5). The iMessage chrome is iOS — only the OG card region is ours. |
| S10 Vow Detail (router) | Spec only | Part 3 §3.1 (S10) | No standalone mock — composes S11/S12/S13 + S10.4 + S10.7 |
| S10.4 Awaiting verdict state | **No mock** | Part 3 §3.1 (S10.4) prose | Build to spec; ask Joe before merge |
| S10.7 Voided state | **No mock** | Part 3 §3.1 (S10.7) prose | Build to spec; ask Joe before merge |
| S11 Active — Countdown | Pre-V6 | `flow/html/14-active-countdown.html` | Apply V6 tokens; layout holds |
| S12 Active — Streak | Pre-V6 | `flow/html/15-active-streak.html` | Apply V6 tokens; layout holds |
| S13 Witness Pending | Pre-V6 | `flow/html/16-witness-pending.html` | Apply V6 tokens; layout holds |
| S14 Witness Landing | Pre-V6 + COPY UPDATE | `flow/html/09-witness-landing.html` | Layout holds; copy from §3.2 S14 |
| S15 Witness Phone (W1B) | **No mock** (only the screenshot Joe shared) | Part 3 §3.2 (S15) prose | Build to spec referencing the screenshot Joe attached |
| S16 Witness Accepted | Pre-V6 + COPY UPDATE | `flow/html/10-witness-accepted.html` | Layout holds; copy from §3.2 S16 |
| S17 Verdict Prompt | Pre-V6 + COPY UPDATE | `flow/html/11-verdict-prompt.html` | Layout holds; add witness identity context line |
| S18 Verdict Confirm | Pre-V6 | `flow/html/12-verdict-submit.html` | Modal — apply V6 tokens |
| S19 Verdict Thanks | Pre-V6 + COPY UPDATE | `flow/html/13-verdict-thanks.html` | Layout holds; copy from §3.2 S19 |
| S20 Dashboard | **V6** (revised Apr 22 2026 — second pass) | `flow/html/s20-dashboard-A-revised-v2.html` (canonical multi-vow) + `flow/html/08-quick-vow.html` (single-vow hero state, first-vow user) | **Apr 22 second-pass changes (locked):** new AWAITING-WITNESS card variant with gold-deep border + muted vow text + "Awaiting [Maker]" amber pill; 2px `--gold` left border on YOUR VOWS cards (ownership signal); witness chip with name + status dot replaces witness column (green=accepted, amber-tinted+text=pending); vow line-height 1.18→1.28; meta-label color `--text-dim`→`--text-mute` (WCAG); section headers anchored on 1px `--gold-line` under-rule with bumped weight 600 + `--gold-bright` color. **NEW Section 2 "NEEDS YOU NOW"** — promotion zone with pulsing amber dot; receives any witnessing item with `verdict_due_at - now() < 24h` (promoted OUT of witnessing list, not duplicated) + pending-dare card. "All N you're witnessing →" overflow card (no urgency dot — urgent already promoted). **No segmented-control toggle** — see `S20-TOGGLE-DEBATE.md`. Earlier mocks `s20-dashboard-multi.html`, `s20-dashboard-A-tighten.html`, `s20-dashboard-B-split.html`, `s20-dashboard-A-revised.html` retained for design-history reference but not canonical. Full audit: `S20-PANEL-AUDIT.md`. |
| S6.5 Name capture (conditional) | **V6** | `flow/html/s6-5-name-capture.html` | Eyebrow "One more thing", italic Fraunces "What should your witness call you?", centered Fraunces-italic input (gold rim), gold "That's me →" CTA, skip text-link below |
| S14.5 First-time witness onboarding | **KILLED Apr 22 2026** | *(deleted)* | Screen cut. Reassurance line moved to S14 footer; cadence communicated diegetically on S16 timeline dots. Witnessing is now a 2-screen web flow (S14 → S16 + optional S15). See §3.2 S14 and §3.2 S14.5 (kill note). |
| S19-OUTCOME-RESOLVED Witness arrives at finished vow | **V6** (new Apr 22 2026) | `flow/html/s19-outcome-resolved.html` | Primary S19 variant. Full-opacity wax seal with halo + ✓ overlay bottom-right, gold eyebrow "Verdict sealed", italic Fraunces "[Maker]'s word held." (or "[Maker] broke it." for broken), vow recap card with stake + "Returned to [Maker]", gold primary CTA "See the full record →" (→ `/certificate/[vowId]` if kept, `/outcome/[vowId]` if broken), tertiary "Make one of your own? Make a vow →" |
| S19-DECLINED Witness who passed returns | **V6** (new Apr 22 2026) | `flow/html/s19-declined.html` | Faded wax seal (55% opacity), muted eyebrow "You passed on this one", italic Fraunces "You sat this one out.", sub explaining maker knows, outlined-gold secondary "Change of heart? Text [Maker] →" (SMS pre-fill), tertiary "Make one of your own? Make a vow →" |
| S19-VOIDED Maker pulled the vow | **No mock** (new Apr 22 2026) | Part 3 §3.2 S19-VOIDED prose | Side-by-side merge gate — Joe sign-off required. Same template as S19-DECLINED (faded seal, no primary CTA, tertiary only). Copy: eyebrow "Vow voided", H1 "[Maker] called it off.", sub "He pulled this vow before the verdict. Stake returned. Nothing left to judge." |
| S19-EXPIRED Edge case — vow ended without verdict | **V6** (rewritten Apr 22 2026) | `flow/html/s19-expired.html` | True edge case only (cron-runner missed auto-resolve). Faded wax seal (45% opacity), muted eyebrow "No verdict on record", italic Fraunces "That vow ended quietly.", sub "The verdict window closed before [Maker] got a decision recorded. No outcome was sealed.", tertiary text-link only. If rendered for non-edge-case user, fire analytics alert. |
| S20-EMPTY Dashboard empty state | **No mock** | Part 3 §3.4 prose | Build to spec |
| S20-WITNESSING-ALL All vows you're witnessing | **V6** | `flow/html/s20-witnessing-all.html` | Header (back chevron + italic page title), Active/Recent segmented control with gold underline, sectioned by Verdict-day vs Active, RitualCard compact rows with maker avatar/name/pill/vow/time/stake. Polling 60s. |
| S21 Quick Vow | V6 | `flow/html/08-quick-vow.html` | |
| S22 Create (full editor) | **No mock** | Part 3 §3.5 prose — recommendation: redirect to /refine for V6 | Don't build the standalone editor for V6 |
| **OUTCOME FLOWS — Part 5** | | | |
| M11 Vow Kept · Charity | **V6** (revised Apr 22 2026) | `flow/html/m11-vow-kept-charity.html` | Bier-audit CTA pass: **one** gold primary CTA **"Share your win →"** (was "Make another vow"), single text-link secondary "Dare a friend 🔥", **KILLED** "Make another vow" primary, "View your record →" and "Donate to ALS anyway" footer. Trophy SVG hero, "You actually did it.", receipt with money-returned + streak rows. |
| M11B Vow Kept · Cause-you-hate | **V6** (revised Apr 22 2026) | `flow/html/m11b-vow-kept-cause-you-hate.html` | Bier-audit CTA pass: **gold primary CTA "Tell everyone you saved $25 from Trump →"** (two-line wrap, min-height 64px, 16px, line-height 1.18). The brag IS the moment. Single text-link secondary "Make another vow →". **KILLED** outlined brag CTA, "Dare a friend", "View your record". Heraldic gold+red shield SVG hero, "Crisis averted." + "You saved $25 from Trump.", receipt with ban-glyph "Saved from Trump" row. Most-screenshotable screen in the app. |
| Vow Broken · Charity | **V6** (revised Apr 22 2026) | `flow/html/vow-broken-charity.html` | Bier-audit CTA pass: **gold primary CTA "Make a new vow →" is the ONLY CTA** (was primary + "View your record" secondary). **KILLED** "View your record" secondary — forward motion only. Cracked-wax broken seal SVG, "You broke it.", muted-red BROKEN stamp, receipt with destination row. |
| Vow Broken · Cause-you-hate | **V6** (revised Apr 22 2026) | `flow/html/vow-broken-cause-you-hate.html` | Bier-audit CTA pass: **gold primary CTA "Make a new vow — let's make this back →" is the ONLY CTA**. **KILLED** "View your record" secondary — redemption-only funnel. Broken seal + red shield overlay (double sting), "Brutal. You broke it.", red destination name with glow. |
| Destination picker (IfBrokenSheet) | **No mock** | Part 3 §3.6 + Part 5 §5.5 prose | Bottom sheet, three tabs |
| Outcome public/share page | **No mock** | Part 5 §5.6 prose | |
| Certificate page | **V6** (revised Apr 22 2026) | `flow/html/certificate.html` | Bier-audit typography pass: **single clean gold frame** (killed 1987-diploma corner brackets + double border), **vow action line in bold Inter Tight 26px weight 600** (the screenshot moment — was Fraunces italic and unreadable at thumbnail), everything else stays Fraunces italic. Added 22px italic-gold **maker-name** row + "pledged his word, on stake, to" prefix. **KEPT stamp rewritten as filled gold gradient** (180deg #E8B656 → #B88930), Inter Tight 700 28px, rotated -2.5° (was outlined, too small at thumbnail). 2×2 attribution grid (witnessed-by/stake; sealed/verdict). Share + save-image CTAs. |
| **EDGE STATES — Part 6** | | | |
| Settings | **No mock** | Part 6 §6.1 prose | |
| History | **No mock** | Part 6 §6.2 prose | |
| Auth callback | **No mock** | Part 6 §6.3 prose | |
| Error states (4xx, 5xx, network, expired token, refund failed) | **No mock** | Part 6 §6.4 prose | |
| Modals & sheets catalogue | **No mock** | Part 6 §6.5 prose | |
| Cast / Challenge flows (/cast, /c/[token]) | **No mock** | Part 6 §6.6 prose | |
| **WEB PARITY** | | | |
| S-WEB1 Web auth-pay | V6 | `flow/html/web-04-auth-pay.html` | |
| S-WEB2 Web share | V6 | `flow/html/web-05-share.html` | |
| S-WEB3 Web sealed | V6 | `flow/html/web-06-sealed.html` | |

**Critical:** the manifest is the single arbiter of "what does this screen look like." If a PR claims to implement S15 and there's no V6 mock, the implementer **must** cite the prose spec and the screenshot Joe shared, and the PR description **must** include a side-by-side render of (a) the implementation and (b) a re-render of the prose spec to a static asset for review. No "I think it should look like this" without that artifact.

**Triage rule for under-specced screens:** if the prose spec leaves any visual decision ambiguous (which corner radius, which gap, which animation), do not invent. Either (a) re-use a V6-canonical pattern from a sibling screen and cite it in the PR description, or (b) ask Joe before building. The default answer to ambiguity is "ask," not "guess."

## 2.5B Component Primitives Mandate

Drift between screens happens when six different screens each render their own wax seal, their own gold CTA, their own Fraunces h1. **The fix is architectural, not procedural.** Build the primitives once, with no API to override the visual, and import them everywhere. If the primitive can't be wrong, the screen can't drift.

The primitives below are **mandatory** for every screen that uses the corresponding pattern. Reaching for a custom div + radial-gradient instead of `<WaxSeal />` is a PR-blocking offense.

### Primitives to ship in PR #1.5 (web + Expo, identical APIs)

| Primitive | Web file | Expo file | Used by | API (data props only) |
|---|---|---|---|---|
| `<WaxSeal />` | `web/src/components/primitives/WaxSeal.tsx` | `expo/components/primitives/WaxSeal.tsx` | S8, S9, S20-EMPTY, M11, M11B, certificate, OG card | `monogram?: string` (default "UV"), `size?: "sm" \| "md" \| "lg"` (default "lg" = 112px), `showHalo?: boolean` (default true), `showCheck?: boolean` (default false) |
| `<SealHalo />` | inside WaxSeal | inside WaxSeal | (internal) | none — wraps WaxSeal |
| `<FrauncesH1 />` | `primitives/FrauncesH1.tsx` | same | every hero screen | `children: string`, `italic?: boolean` (default false), `size?: "lg" \| "xl"` (default "xl" = 52px) |
| `<FrauncesSub />` | `primitives/FrauncesSub.tsx` | same | every hero screen | `children: ReactNode`, `dim?: boolean` |
| `<GoldCTA />` | `primitives/GoldCTA.tsx` | same | S1, S3, S5, S6 (active), S14, S20 footer, S21, M11, M11B, witness-pending nudge | `label: string`, `onPress: () => void`, `disabled?: boolean`, `variant?: "filled-gold" \| "filled-imsg-green"` (default "filled-gold") |
| `<OutlinedGoldCTA />` | `primitives/OutlinedGoldCTA.tsx` | same | S9, vow-detail "see your vow", verdict thanks "make a vow back" | `label: string`, `onPress: () => void` |
| `<EyebrowTag />` | `primitives/EyebrowTag.tsx` | same | S5, S6, S14, S17 | `children: string`, `tone?: "gold" \| "imsg" \| "amber"` |
| `<DeliveredPill />` | `primitives/DeliveredPill.tsx` | same | S9 | `timestamp: Date` |
| `<TimestampPill />` | `primitives/TimestampPill.tsx` | same | iMessage receiver chrome simulation, activity log | `timestamp: Date`, `format?: "time" \| "datetime"` |
| `<OGCard />` | `primitives/OGCard.tsx` (also rendered by ImageResponse in `/api/og/[token]/route.tsx`) | not in Expo | OG card route only | `vow: string`, `makerName: string`, `stake: number`, `verdictDate: Date` |
| `<VowDocCard />` | `primitives/VowDocCard.tsx` | same | S14, S17, S18, S20 active vow rows, vow-detail | `vow: string`, `stake: number`, `destination: string`, `verdictDate: Date`, `compact?: boolean` |
| `<RitualCard />` | `primitives/RitualCard.tsx` | same | S11, S12 active states, S13 witness pending | `children: ReactNode`, `pulseColor?: "gold" \| "amber"` |
| `<RitualScreen />` | `primitives/RitualScreen.tsx` | same | every full-screen ritual moment (S1, S5, S6, S8, S9, S14, S16, S17, S19, M11, M11B, broken outcomes) | `children: ReactNode`, `gradient?: "default" \| "verdict" \| "broken"` |
| `<StakeTile />` | `primitives/StakeTile.tsx` | same | S3 stake picker, S21 quick-vow stake row | `amount: number`, `label: string`, `selected: boolean`, `onPress: () => void` |
| `<RadioCard />` | `primitives/RadioCard.tsx` | same | S2 refine, S3 destination row, IfBrokenSheet | `label: string`, `sublabel?: string`, `selected: boolean`, `onPress: () => void` |
| `<Countdown />` | `primitives/Countdown.tsx` | same | S11, S10.4 awaiting verdict | `endsAt: Date`, `onElapsed?: () => void` |
| `<StreakGrid />` | `primitives/StreakGrid.tsx` | same | S12 | `total: number`, `completed: number[]`, `today: number` |
| `<Stamp />` | `primitives/Stamp.tsx` | same | S10.7 voided ("VOIDED"), S19 verdict thanks ("KEPT" / "BROKEN"), certificate ("KEPT" filled-gold) | `text: "KEPT" \| "BROKEN" \| "VOIDED"`, `tone?: "gold" \| "muted-red" \| "muted-gray" \| "filled-gold"`, `variant?: "confirmed" \| "auto-resolved"` (default "confirmed"; "auto-resolved" renders sublabel "AUTO-RESOLVED · 72H" below stamp text) |
| `<ContactPicker />` | `primitives/ContactPicker.tsx` | same | S4 witness picker, C1 cast target picker | `onSelect: (contact: { name: string, phone: string }) => void`, `label?: string` |

**API constraint:** none of these primitives accept color props, size props, font props, padding props, or border-radius props. The variant enum on `<GoldCTA />`, the tone and variant enums on `<Stamp />`, and the label prop on `<ContactPicker />` are the only "visual choice" surfaces, and the choices are pre-baked. **If a screen needs a visual variant not listed above, the answer is to add a variant to the primitive — not to roll a one-off in the screen.**

**API constraint, structural:** primitives import tokens from `tokens.ts` directly. They do not accept tokens via props. There is no path for a screen to override a primitive's color.

### Primitives storybook page

PR #1.5 also ships `/web/src/app/_dev/primitives/page.tsx` (web) and `/expo/app/_dev/primitives.tsx` (Expo) — a single page that renders every primitive in every variant and every state. This is the visual regression target. Pixel-diff the storybook page against itself across PRs to catch drift in primitives over time.

### Why this matters more than any other gate

Six screens × independent implementations = six slightly different golds. Six screens × the same `<WaxSeal />` import = one gold, by construction. **The primitives PR is the single highest-leverage piece of work in V6.** Ship it before any screen PR.

## 2.5C Forbidden Inventions

Things implementers will be tempted to add. Each one is a PR-blocking offense.

**Visual:**
- A new color value, even "just slightly different gold." There are exactly four golds: `--gold`, `--gold-bright`, `--gold-deep`, `--gold-line`. Use them.
- A new font weight not in Part 2's type scale.
- A new animation timing curve. Animations are named in Part 2; reuse them.
- A new corner radius. The set in Part 2 is the set.
- A new shadow. Shadows are listed in tokens.
- "Just a little more padding here." If padding deviates from the mock by more than 2px, fix the mock OR fix the implementation — don't ship the deviation.

**Copy:**
- Rewriting any string. "Sealed." is sealed. "Over to Nick." is sealed. "Heckle him until he does." is sealed. "Joey · Unbreakable Vow" is sealed.
- Shortening copy "for fit." If it doesn't fit, the type scale or the layout is wrong — escalate, don't trim.
- Adding helper text not in the spec ("tap to learn more", "swipe up for options", etc.).
- Adding microcopy "for clarity." If clarity is missing, the spec needs an update, not the screen.

**Behavioral:**
- A streak badge on a screen that doesn't list one.
- A witness widget on the dashboard or anywhere outside the three approved surfaces (OG card, witness-accepted screen, verdict prompt). The witness identity decision (`WITNESS-IDENTITY-DECISION.md`) lists three. Three is the cap.
- An extra notification, push, SMS, or email beyond the catalogued cadence in §4.4 and §4.6.
- A "skip this step" affordance not in the spec.
- A "share this" button on a screen that doesn't list one.
- An "undo" path on irreversible actions. Verdicts are final by design.

**Architectural:**
- Inlining a component that has a primitive (e.g., a one-off wax-seal div).
- Importing tokens from a file that isn't `tokens.ts`.
- Hardcoding a hex value anywhere outside `tokens.ts`.
- Adding a new dependency to render an animation that the keyframes module already covers.

If an implementer feels strongly that something on this list deserves an exception, the path is: open a discussion in the PR description, link to the constraint here, propose the change, and wait for Joe. The path is **not** ship-and-justify.

## 2.5D Pixel-Diff Loop (per-screen merge gate)

Every screen PR runs this loop, every screen, no exceptions. The loop is mechanical and binary — no judgment calls, no "looks close enough."

**Step 1 — Render the implementation.**

Web: Playwright at exactly 393×852, `device_scale_factor=3`, headless Chromium. Snippet:

```ts
// scripts/render-screen.ts
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 });
await page.goto(`http://localhost:3000${ROUTE}?seed=${TEST_SEED}`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `renders/impl/${SCREEN_ID}.png`, fullPage: false });
```

Expo: iPhone 15 Pro simulator, screenshot via `xcrun simctl io booted screenshot renders/impl/${SCREEN_ID}.png` after navigating to the screen with seeded test data.

**Step 2 — Render the canonical mock.**

Use the existing pipeline (`planning/render_flow.py` — already wired for Playwright at 393×852, dpr=3) to produce `renders/mock/${SCREEN_ID}.png` from the file named in the Mock Manifest. For screens with no mock, render the closest sibling primitive composition for context, but the diff target is "implementation matches the prose spec," not pixel-equality.

**Step 3 — Diff.**

Use `pixelmatch` (npm) with threshold 0.1, or `looks-same` with strict mode. Output a third image, `renders/diff/${SCREEN_ID}.png`, highlighting differences in red.

```ts
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import fs from "fs";
const impl = PNG.sync.read(fs.readFileSync(`renders/impl/${SCREEN_ID}.png`));
const mock = PNG.sync.read(fs.readFileSync(`renders/mock/${SCREEN_ID}.png`));
const diff = new PNG({ width: impl.width, height: impl.height });
const numDiffPixels = pixelmatch(impl.data, mock.data, diff.data, impl.width, impl.height, { threshold: 0.1 });
fs.writeFileSync(`renders/diff/${SCREEN_ID}.png`, PNG.sync.write(diff));
console.log(`${SCREEN_ID}: ${numDiffPixels} px diff (${((numDiffPixels / (impl.width * impl.height)) * 100).toFixed(2)}%)`);
```

**Fail conditions** (any one fails the merge):
- Pixel diff > 0.5% of total pixels (modulo dynamic content like timestamps — see whitelist below).
- Any token mismatch (hex value comparison via DOM inspection or React Native style snapshot).
- Any font family, weight, or `font-variation-settings` mismatch.
- Any spacing deviation > 2px on any element.
- Any corner radius deviation > 1px.
- Any animation in the spec is missing or wrong duration.
- Any haptic in the spec is missing (Expo only — verified via instrumentation).
- Any copy character mismatch (whitespace counts, em-dash vs. hyphen counts).

**Dynamic content whitelist** (excluded from pixel diff): the timestamp pill ("9:41 AM"), the iOS status bar clock if visible, the avatar initial, the witness's name. Render these with deterministic test seeds where possible.

**Artifact requirement:** every screen PR description includes the three rendered PNGs (impl, mock, diff) inline. Reviewer cannot approve without them.

**For screens with no canonical mock** (S10.4, S10.7, S15, S20-EMPTY, M11, M11B, all of Part 5/6): the merge gate is a side-by-side of the implementation render and a markdown-rendered version of the prose spec, plus Joe's explicit sign-off in the PR. There is no automated diff to run — the gate is human review against the spec.

## 2.5E Visual regression in CI

PR #1.5 (Primitives) also wires the diff loop into CI:
- On every PR, render every screen in the Mock Manifest (V6 + pre-V6 categories only — "no mock" screens are skipped).
- Post the diff summary as a PR comment.
- Fail the build if any screen's diff exceeds 0.5%.
- Allow override only with an explicit `pixel-fidelity-override` label (used sparingly, e.g., when intentionally updating a mock and an implementation in the same PR).

This catches drift introduced by primitive changes, token changes, or unrelated PRs that accidentally change rendering.

---

# PART 2.7 — CROSS-SCREEN BEHAVIOR DEFAULTS

These are the rules every screen inherits unless its own spec explicitly overrides. They exist because in V5 we discovered Claude Code (and any implementer) will invent answers to these questions if we don't pre-decide them — and inventions cause structural drift across screens. Lock them once, here.

## 2.7.1 Loading states

Every async operation gets a loading state. Inventory of categories:

| Category | Treatment | Where it appears |
|----------|-----------|------------------|
| Initial screen mount with data fetch | Skeleton matching final layout in #1A1612 (palette.surfaceDim) at 40% opacity | Dashboard, history, vow detail |
| Inline action (button tap that triggers network) | Button text replaced by 3-dot pulse animation in same color, button stays same width | Every CTA that hits the network |
| Full-screen blocking operation (sealing, refunding) | Black overlay at 80% opacity + centered spinner (gold, 32pt) + single line of Fraunces italic copy describing what's happening | Seal flow during Stripe capture, void-vow during refund |
| Background fetch (already-rendered screen refreshing data) | No visual change. Refresh silently. | Dashboard polling for witness acceptance, vow detail polling for verdict |

**Forbidden:** generic "Loading..." text, native iOS spinner with no context, blank screens, layout shift (always reserve final layout space with skeleton).

**Per-screen override rule:** a screen's spec may override the category treatment, but cannot invent a new visual language. If existing categories don't fit, raise it as a primitive question, not a screen-local invention.

## 2.7.2 Screen-to-screen transitions

| From → To | Transition | Duration |
|-----------|------------|----------|
| Forward in flow (S1→S2, etc.) | Slide from right (iOS native default) | 350ms |
| Back in flow | Slide from left (iOS native default) | 350ms |
| Modal/sheet open | Slide from bottom (iOS sheet) | 400ms |
| Modal/sheet dismiss | Slide to bottom | 350ms |
| Cinematic moments (cold-open, oath) | Cross-fade through black | 600ms |
| Outcome reveal (kept/broken) | Cross-fade with subtle scale (0.96 → 1.0) | 800ms |
| Tab switch (within dashboard) | Cross-fade only, no slide | 200ms |

**Forbidden:** custom slide directions per screen, page-flip or 3D rotations anywhere, transitions longer than 800ms outside cinematic moments.

## 2.7.3 Back behavior

| Screen state | Back behavior |
|--------------|---------------|
| Mid-flow before seal (S1-S6) | Native back gesture preserves all entered data; user can reach S1 with everything still typed |
| At S7 (review/seal) | Back returns to S6, data preserved |
| AFTER successful seal | Back gesture is **disabled** on S9; user must tap "Done" or wait for auto-advance to dashboard. No way to return to seal flow once sealed. |
| On dashboard | Back gesture exits the app (native default) |
| Inside vow detail | Back returns to dashboard |
| During cinematic moments | Back is disabled (cinematic plays through) |

**Forbidden:** any back action that loses user-entered data without confirmation. If a back would discard data, intercept with a sheet: "Leave this vow? Your draft will be saved." [Save & exit] [Stay]

## 2.7.4 Network errors

Three categories of network failure, three treatments:

| Failure | Treatment | Recovery |
|---------|-----------|----------|
| Read failure (data fetch fails) | Inline retry banner: "Couldn't load. Tap to retry." (Inter Tight 14pt, white, with subtle gold underline on "tap to retry") | Tap retries the read |
| Write failure during flow (e.g., seal-vow edge function returns 5xx) | Modal sheet: "Something went wrong. Your vow wasn't sealed and you weren't charged." [Try again] [Save draft & exit] | Try again repeats the call; Save draft persists current flow state to localStorage/AsyncStorage and exits to home |
| Write failure during outcome (e.g., submit-verdict fails) | Inline error on the verdict screen: "We couldn't record the verdict. Try again? [Retry]" — verdict is NOT auto-resolved on client error | Retry repeats the call |

**Critical rule for write failures during seal:** the user MUST be told whether they were charged. The Stripe paymentIntent state determines this. If we don't know (timeout), the message is: "We're not sure if your payment went through. Check your card before retrying." Do not let the user re-tap "Seal" if there's any chance they were already charged.

## 2.7.5 Stake-change mid-flow

The user has set a stake on S5, then on S6 (review) decides to change it. Behavior:

- "Change stake" button on S6 returns to S5 with the current value pre-selected
- All other flow data preserved
- If the user has already passed Apple Pay (at S7), changing stake means **canceling the existing PaymentIntent and creating a new one**. Edge function `cancel-and-recreate-payment-intent` handles this. Old intent is voided server-side.
- If user changes stake after seal: NOT POSSIBLE. The contract is set. The dashboard shows the staked amount as immutable; if user wants different stake, they must void the vow and start a new one.

## 2.7.6 Date-change mid-flow

The user has set a verdict date inline on S1, then later wants to change it.

- A pencil icon next to the date pill on every flow screen until S7 opens `<DatePickerSheet />` — see 2.7.13 for the sheet spec
- After S7 (seal), the date is immutable for the duration of the vow

## 2.7.7 Cause-change mid-flow

User changes the destination on S6 by tapping "Change cause." Opens `<IfBrokenSheet />` (see §3.6 + §5.5). Behavior:

- Sheet shows current selection with checkmark
- Picking a new cause + "Use this" closes sheet and updates the flow state
- If user dismisses without picking, no change
- After seal: cause is immutable

## 2.7.8 Share fallback

Several screens use the iOS share sheet (S8 SMS handoff, certificate, outcome page). Fallback behavior when share is unavailable or fails:

| Platform | Primary | Fallback 1 | Fallback 2 |
|----------|---------|------------|------------|
| Expo | Native share sheet via expo-sharing | iOS Messages app via `sms:?body=` URL | Copy-to-clipboard with toast confirmation |
| Web (mobile) | navigator.share() if supported | `sms:?body=` link | Copy-to-clipboard |
| Web (desktop) | Copy-to-clipboard with toast | (none) | (none) |

If share is dismissed without sharing (user tapped Cancel), the calling screen does NOT advance. User must tap the share button again or navigate away manually.

## 2.7.9 Keyboard behavior

| Screen | Keyboard appears when | Keyboard dismiss |
|--------|----------------------|------------------|
| S1 vow input | On screen mount (autofocus) | Tap outside input area; primary CTA submit |
| S6 review | Never (no inputs) | N/A |
| Witness contact picker | On manual-entry mode only | Tap outside; "Done" button on keyboard |
| OTP screen | On screen mount | Auto-dismiss when 6 digits entered |
| Settings name field | On focus | Tap outside; submit |

**Forbidden:** keyboard that pushes critical CTAs out of viewport. All flow screens use `KeyboardAvoidingView` with `behavior="padding"` (Expo) or scroll-into-view on focus (web).

## 2.7.10 Deep links

Inventory of deep links the app must handle:

| URL pattern | Behavior |
|-------------|----------|
| `/w/[token]` | Witness landing — bypasses cold-open, lands directly on accept screen |
| `/c/[token]` | Challenge landing — bypasses cold-open, lands directly on accept screen |
| `/outcome/[vowId]` | Public outcome page — no auth required |
| `/certificate/[vowId]` | Certificate page — no auth required |
| `/vow/[id]` | Authenticated vow detail — requires login; if not logged in, redirect to auth then back |
| `/dashboard` | Authenticated; if not logged in, redirect to auth then back |
| `/create` | Authenticated; if not logged in, redirect to auth then back |
| Any unknown path | 404 page that links back to home |

**Cold-open never fires on a deep link.** Even if `coldOpenSeen` is false, deep links bypass it. Cold-open only fires on direct landing at `/` (web) or app launch (Expo).

## 2.7.11 SMS edge cases

Universal rules:

- Witness phone number must be E.164 format before SMS send (use `libphonenumber-js`)
- If number is invalid: block submit, show inline error: "That number doesn't look right."
- If Twilio returns delivery failure: write to `audit_events` (event_type: `sms_failed`), show maker a retry banner on dashboard: "We couldn't reach [witness name]. [Resend]"
- Twilio rate limit hit: show generic error, retry with exponential backoff (handled in cron-runner)
- International numbers: supported for landing-pad SMS, but flagged in `audit_events.metadata` for cost tracking

## 2.7.12 Multi-device polling

A user signs a vow on Expo, then opens the web dashboard. Expected behavior:

- Web dashboard fetches vows on mount, then polls every 30s while active
- Real-time updates via Supabase Realtime channel `vows:user_id=eq.<id>` — subscribe on mount, unsubscribe on unmount
- If a vow's status changes server-side (witness accepts, verdict submitted), client receives event and updates UI optimistically
- On reconnect after network loss: refetch full vow list

## 2.7.13 Component sheet primitives — additions to Part 2.5B

These primitives were referenced but not previously specced; capturing here:

**`<DatePickerSheet />`**
- Bottom-sheet wrapper around iOS native date picker
- Props: `value: Date`, `min: Date`, `max: Date`, `onConfirm(date)`, `onDismiss()`
- Constraints: min = today + 1 day, max = today + 90 days
- Used by: S1 inline date pill, S21 dashboard quick-vow date

**`<ChangeStakeSheet />`**
- Bottom-sheet for changing stake mid-flow
- Wraps the same `<StakeTile />` grid as S5
- Props: `currentValue: number`, `onConfirm(amount)`, `onDismiss()`
- Used by: S6 review screen "Change stake" button

**`<DismissDraftSheet />`**
- Confirmation sheet for back-out with unsaved data
- Copy: "Leave this vow? Your draft will be saved."
- Buttons: [Save & exit] (gold) / [Stay] (text)
- Used by: any back gesture mid-flow

## 2.7.14 Accessibility defaults

- All interactive elements have `accessibilityLabel` set (Expo) or `aria-label` set (web)
- All gold-on-black contrast meets WCAG AA at minimum (gold #C89B3C on black #0F0D0A passes at 22pt+; small body text uses white at 95%)
- All touch targets ≥ 44pt × 44pt
- Cinematic moments respect `prefers-reduced-motion` (Expo: check `Accessibility.isReduceMotionEnabled()`; web: media query). If true: skip animations, render final state directly, hold for the same total duration.
- VoiceOver reads cinematic copy in order; "skip" button is the first focused element when cinematic begins

## 2.7.15 Empty states

| Screen | Empty state copy + CTA |
|--------|-----------------------|
| Dashboard with zero vows | Centered Fraunces italic: "No vows. Yet." + gold CTA "Make a vow" |
| History with zero past vows | Centered: "Your record will live here." + text link "Make your first vow" |
| Witness landing for already-decided vow | Quiet state: "This vow has been [kept/broken]. Nothing left to decide." + link to outcome page |

## 2.7.16 Long-no-return state (S8/S9 abandonment)

If user reaches S8 (SMS handoff) but does not actually share, then closes the app, then returns:
- Vow is in `sealed` status (witness invited but not yet sent, OR sent but witness hasn't accepted)
- Returning to the app lands on dashboard (not S8)
- Dashboard shows the vow with a yellow nudge: "Tell [witness name] their oath is waiting. [Send SMS]"
- Tapping resends through native share sheet

## 2.7.17 Notification re-prompt

If user denied push notifications during onboarding:
- Dashboard shows a soft banner once per 7 days: "Witness updates need notifications. [Enable]"
- Tap opens iOS Settings deep link
- Banner is dismissible; if dismissed 3 times, never show again

---



This section walks every screen in the user journey. For each: where it lives in code, what design covers it, exact copy, components, behavior, and gaps.

Notation:
- 🎨 = Design exists (link to mock)
- 🚧 = Design needed — spec is written below in prose
- ⚠️ = Code exists but design and code disagree; reconcile

---

## 3.0 Cinematic Moments — the four ceremonial beats

These are the only places in the product where ceremony, copy-as-cinema, and the "Unbreakable Vow" brand voice get full air. Outside these four moments, the product is utility. Inside these four, it is liturgy. **Do not invent a fifth moment.** Adding ceremony elsewhere dilutes all four.

The four moments, in order of where they appear in a user's lifecycle:

| # | Moment | When it fires | Platform | Skippable? |
|---|--------|---------------|----------|------------|
| 1 | **Cold-Open** | First launch ever (per-device) | Expo (web shows static H1 instead) | After 4s |
| 2 | **Initiation Oath** | First seal ever (per-user, lifetime) | Expo + web | No |
| 3 | **Seal Echo** | Every seal | Expo + web | No (woven into existing animation) |
| 4 | **Clock Starts** | Every seal, immediately after Echo | Expo + web | No (woven into S9 transition) |

### 3.0.1 Cold-Open — the door

**Purpose:** make the user feel recognized in 5 seconds. Then warn them, on a separate beat, that this product has teeth. Two screens.

**When it fires:** first launch ever, per device. Tracked by AsyncStorage flag `coldOpenSeen` (Expo) and localStorage `coldOpenSeen` (web). Set to true after the cinematic completes OR is skipped. Never fires again on that device.

**Where it fires:** the very first thing the user sees, before the home/landing screen. On Expo, this is the entry point on first launch. On web, behavior depends on the route the user lands on:
- Direct `/` (organic landing): plays the cold-open
- `/w/[token]` (witness flow): does NOT play (witnesses are not the audience)
- `/c/[token]` (challenge flow): does NOT play (target users haven't downloaded the product)
- Any deep link: does NOT play
- Subsequent visits to `/` after first: does NOT play

Web parity note: full motion cold-open only fires on Expo. On mobile-web first-time visits, render a static composite of the final two-screen state stacked vertically, with no animation — copy is the same, presentation is collapsed.

**Total runtime:** ~14 seconds across two screens. Skippable after second 4 with a small *skip* in the bottom-right corner (Inter Tight 13pt, white at 40% opacity).

---

#### Screen 1 of 2 — *the invitation*

**Background:** pure black (#0F0D0A). No gradient, no texture, no chrome. No status bar visible (full-screen takeover).

**Copy:**

> *there's a promise you keep breaking — you know the one.*
>
> *make the unbreakable vow.*

**Typography:**
- Line 1: Fraunces italic, white at 95% opacity, 22pt, line-height 1.35, centered, max-width 320pt. Em dash is a real em dash (—), never two hyphens.
- Line 2: Fraunces italic, gold (#C89B3C), 28pt, line-height 1.35, centered. Vertical gap from line 1: 48pt.

**Choreography:**

| t | Event |
|---|-------|
| 0.0s | Pure black, no content |
| 1.5s | Line 1 begins fade-in (opacity 0 → 95%, duration 1.2s, easing cubic out) |
| 2.7s | Line 1 fully rendered |
| 5.2s | Hold ends (2.5s of recognition silence) |
| 5.2s | Line 2 begins fade-in (opacity 0 → 100%, duration 1.0s, easing cubic out) |
| 6.2s | Line 2 fully rendered |
| 8.2s | Hold ends (2s) |
| 8.2s | Both lines begin fade-out (opacity → 0, duration 0.8s) |
| 9.0s | Pure black again |

**Why these timings:** the 2.5s hold after line 1 is the most important second in the entire app. That is when the user thinks of their specific broken promise. Do not rush it. If user-testing shows the hold feels uncomfortably long, the answer is to leave it as designed — discomfort is the point.

---

#### The gap (1.2 seconds of pure black)

**Choreography:**

| t | Event |
|---|-------|
| 9.0s | Black hold begins |
| 10.2s | Black hold ends, Screen 2 begins |

**This is part of the cinematic, not a transition.** The user thinks the cold-open is over. They may even start to lift their finger toward the screen. The 1.2s of unexplained black is the menace — it makes them realize the product has more to say. Do not shorten this. Do not add a logo, a fade, or any visual cue during the gap. Pure black, total silence.

---

#### Screen 2 of 2 — *the price*

**Background:** pure black (#0F0D0A). Same as Screen 1.

**Copy:**

> *break it, and pay the price.*

**Typography:**
- Single line, Fraunces italic, white at 95% opacity, 30pt, line-height 1.4, centered both axes (vertical centering matters — the line should sit dead-center of the viewport with equal black above and below).

**Choreography:**

| t | Event |
|---|-------|
| 10.2s | Line begins fade-in (opacity 0 → 95%, duration 1.0s, easing cubic out) |
| 11.2s | Line fully rendered |
| 14.2s | Hold ends (3s of finality) |
| 14.2s | Line fades out + transition to S1 home screen begins (cross-fade, 0.6s) |
| 14.8s | S1 visible |

**Why isolate this line on its own screen:** on a single screen with the invitation, "pay the price" reads as part of the same thought — *here's the offer, and here's the catch.* On its own screen with a black gap before it, it becomes a *second arrival*, like a parting line. That structural isolation is the cinematic. *Pay the price* is cliché-adjacent in normal use; framed by isolation and silence, it becomes archetypal.

**Why no wordmark anywhere in the cold-open:** the wordmark is the seal stamp on the *product*, not the *cinematic*. Adding it after Screen 2 would deflate "pay the price" from a verdict into setup for branding. The user learns the product name from the line *make the unbreakable vow* in Screen 1. The wordmark first renders on the next screen (S1 home) where it belongs as ambient brand presence.

**Skip behavior:** If user taps *skip* during either screen, both screens are skipped (not just the current one). Cold-open ends, transition to S1. `coldOpenSeen` is set to true regardless of skip.

**Gesture defaults:** Tap anywhere except *skip* during the cinematic does nothing (no advance-on-tap). The user cannot rush the cinematic; the timing IS the cinematic. This is intentional — the only thing they can do is wait or skip.

---

### 3.0.2 Initiation Oath — the first seal

**Purpose:** make the first vow the user ever seals feel categorically heavier than every subsequent vow. They are crossing a threshold from "person who downloaded a commitment app" to "person who has staked something on a vow." Mark the threshold.

**When it fires:** the first time a given user successfully seals a vow, lifetime. Tracked by the proposed new column `users.first_seal_completed_at timestamptz` (see §4.1 schema patch). If null when a vow seals, the Initiation Oath fires AFTER payment confirms but BEFORE S9 (sealed confirmation). After it fires, write `now()` to `first_seal_completed_at`.

**Where it fires:** between successful payment confirmation and S9. On Expo and web both. Not skippable.

**Total runtime:** ~6 seconds.

---

**Background:** pure black (#0F0D0A), with the same gold radial glow that S9 uses but at 30% intensity (foreshadowing the S9 bloom).

**Copy beat 1 — the user's own vow, read back:**

The user's `refined_text` (the version they sealed, not the raw input) is rendered in the center of the screen as the cinematic. This is THEIR words, in OUR typography.

- Fraunces italic, gold (#E8B656), 26pt, line-height 1.4, centered, max-width 300pt
- Fades in over 1.2s
- Holds for 2s

**Copy beat 2 — the question:**

Below the vow, with 32pt vertical gap:

> *do you swear it?*

- Fraunces italic, white at 95% opacity, 22pt
- Fades in over 0.8s after the vow has held for 2s

**Copy beat 3 — the answer (interactive):**

Below "do you swear it?", with 48pt vertical gap, a single button:

> **I swear it.**

- Outlined gold CTA primitive (`<OutlinedGoldCTA />`)
- Width 220pt, height 52pt
- Fades in 0.5s after "do you swear it?" renders
- Tap → haptic (success), button fills gold, then fade-to-S9 over 0.6s

**Why interactive (unlike cold-open):** the cold-open is about being recognized; passivity is correct. The Initiation Oath is about active commitment; the user's tap IS the oath. They don't just see the words "I swear it" — they author them by tapping. That tap is the moment they become a vow-maker.

**Why only the first seal:** repetition dilutes ceremony. If we showed this every seal, by the third vow it would feel like a loading screen. By gating it to lifetime-first, the Oath remains an unrepeatable threshold. Subsequent seals get the Seal Echo + Clock Starts (which ARE repeatable because they're tighter and woven into existing animation).

**Failure mode:** if `first_seal_completed_at` is null and the Oath errors mid-render (e.g., refined_text is somehow empty, animation crashes), skip the Oath and go straight to S9. Do NOT block the seal flow on the cinematic. Log the error, continue.

---

### 3.0.3 Seal Echo — the woven word

**Purpose:** mark every seal with a single ceremonial word, woven into the existing wax-seal animation. Every-time, no skip.

**When it fires:** every successful seal (after Initiation Oath if it ran, otherwise immediately after payment).

**Where it fires:** during the wax-seal animation that precedes S9.

---

**Choreography:** the existing wax-seal animation already has a "press" frame where the signet stamps the wax. At that moment:

- The word *Sworn.* fades in over 0.4s, centered horizontally, positioned at the vertical center of the seal itself
- Fraunces italic, gold (#E8B656), 18pt
- Holds for 1.5s
- Fades out over 0.4s as the seal completes its formation

**Total addition to existing animation:** ~2.3s woven in (does not extend total animation time meaningfully — the existing seal animation is ~3.5s; the Echo overlays the central press-and-hold portion).

**Why it works every time without diluting:** the Echo is a single word, integrated into an animation users already see. It's not asking for additional attention — it's a label on a moment that's already happening. The Initiation Oath is the *threshold* (one-time); the Echo is the *receipt* (every time).

---

### 3.0.4 Clock Starts — the first tick

**Purpose:** the most narratively true moment in the entire product is the moment the countdown starts. We were burying this moment with a static post-seal screen. Now it IS the post-seal screen.

**When it fires:** every successful seal, immediately after Seal Echo completes (the seal animation finishes, glow blooms, then the clock starts ticking).

**Where it fires:** S9 entry. The bloom is the existing post-seal radial glow; the Clock Starts is the new beat appended to it.

---

**Choreography:**

| t | Event |
|---|-------|
| 0.0s | S9 enters, gold radial bloom at full intensity |
| 0.8s | Bloom holds at full intensity (existing behavior) |
| 1.6s | Countdown timer fades in at the top of S9 (`<Countdown />` primitive), reading the full duration: e.g., `6 days, 23:59:59` |
| 2.0s | First tick: timer changes to `6 days, 23:59:58` |
| 2.0s | Subtle gold glow pulse around the timer at the moment of first tick (0.4s pulse, peak opacity 60%, then settle) |
| 2.0s+ | Timer continues ticking normally; bloom dissipates over 1.5s; rest of S9 chrome fades in |

**No new copy added.** The cinematic is the tick. Words would interrupt.

**Haptic:** single soft haptic (Expo: `Haptics.ImpactFeedbackStyle.Soft`) at the moment of the first tick. Web: no haptic equivalent; the visual pulse carries the moment alone.

**Why this beats the prior post-seal design:** every prior version added a static state ("Sealed." or "Vow active." or similar). This version *makes the timer's first tick the cinematic*. The user sees the clock start moving for the first time on the first vow they sealed; this is also true for every subsequent seal, but the first tick of any individual vow is universally the most charged moment of that vow's existence. The product was hiding this moment. Now it leads with it.

---

### 3.0.5 What is explicitly NOT a cinematic moment

To prevent ceremony-creep, these moments are explicitly **NOT** cinematics, even though they may feel like they want to be:

- Witness-accepted notification on dashboard (use a quiet badge animation, no full-screen takeover)
- Verdict day arrival (notification + dashboard state change, no cinematic)
- Vow kept / vow broken outcome screens (these are *result* states, not *threshold* states; they get strong typography and stamping but no cinematic choreography)
- Quick Vow second-and-beyond seals (no Initiation Oath; just Seal Echo + Clock Starts)
- Account creation, OTP, Apple Pay (utility flows; no ceremony)

The discipline is: **only the four moments above use full-screen takeover, multi-second silent holds, or copy-as-cinema.** Everything else is utility.

---



### S1 · Home / Landing 🎨
- **Design:** `flow/html/01-home.html`, `flow/renders/01-home.png`
- **Web file:** `/web/src/app/page.tsx`
- **Expo file:** `/expo/app/index.tsx`
- **Copy:**
  - H1 (Fraunces, italic): *"Make a vow. Mean it."*
  - Sub: "One sentence. One witness. One stake. One verdict."
  - Vow input placeholder: "I'll …"
  - Inline date pill: "Verdict by Sun, Apr 26" (gold pulse dot)
  - Primary CTA: "Make my vow →"
  - Below: "Already have a vow? Sign in"
- **Primitives used:** `<RitualScreen gradient="default" />`, `<FrauncesH1 italic />`, `<FrauncesSub />`, `<GoldCTA variant="filled-gold" />`. Vow input + inline date pill are screen-local components (not yet primitives — promote in V7 if reused).
- **Behavior:** typing pre-fills vow flow state. Date pill opens a sheet for picking a different date. Tap CTA → if authed, → `/refine`; if not, store flow state and route through auth on `/seal`.
- **Authed users land here briefly then get auto-redirected to `/dashboard`** (or `/seal` if they have an in-progress flow in localStorage).

### S2 · Refine nudge 🎨
- **Design:** `flow/html/02-refine-nudge.html`
- **Web file:** `/web/src/app/refine/page.tsx`
- **Expo file:** `/expo/app/refine.tsx`
- **Copy:**
  - Sheet title (Fraunces): *"Will Nick know if you did it?"*
  - Quoted vow: maker's input shown verbatim in italic Fraunces
  - Suggested rewrites (up to 3): single line each, gold underline if selectable
  - Buttons: "Tighten it" (primary, replaces vow with selected suggestion) / "Keep as-is" (secondary)
- **Behavior:** **only shown if `analyzeVow()` flags vagueness.** If vow is already specific, skip directly to stake.
- **Primitives used:** `<RitualScreen />`, `<FrauncesH1 italic />`, `<RadioCard />` for suggestions, `<GoldCTA variant="filled-gold" />` (Tighten it). BottomSheet wrapper is screen-local.

### S3 · Pitch / Stake (cheeky) 🎨
- **Design:** `flow/html/03b-pitch-cheeky.html`
- **Web file:** `/web/src/app/stake/page.tsx`
- **Expo file:** `/expo/app/stake.tsx`
- **Copy:**
  - H1: *"How much would make you actually do it?"*
  - Stake tiles: $10 ("a nudge"), $25 ("a week of thinking"), $50 ("you'll remember") — default selected, $100 ("won't break it")
  - Below tiles: "If broken → ALS Association" (with "Change" link to destination picker)
  - Primary CTA: "Lock in $50 →" (number updates with selection)
- **Behavior:** stake tiles are radio. "Change" opens `IfBrokenSheet` (see S22). CTA proceeds to witness picker.
- **Critical:** $0 vows are not exposed in this flow. If we want a $0 path, build it as a separate "free vow" entry point (`/quick-vow` already exists).
- **Primitives used:** `<RitualScreen />`, `<FrauncesH1 italic />`, `<StakeTile />` × 4, `<GoldCTA variant="filled-gold" />`.

### S4 · Witness pick (contacts-first) 🎨
- **Design:** `flow/html/04-witness-pick.html`
- **Web file:** N/A (web uses link-share, see S4-WEB)
- **Expo file:** `/expo/app/witness.tsx`
- **Copy:**
  - H1: *"Pick someone who'll be honest."*
  - Sub: "They'll get a text. No app needed."
  - Recents: avatar + name + last-vow-with metadata
  - Secondary CTA: "Pick from contacts" (triggers iOS contacts permission)
  - Escape hatch (text link): "or send a link instead"
- **Behavior:** uses Expo `Contacts` API. On grant → contact picker. On deny → falls back to manual phone entry. After pick → vow flow state has `witness_name` and `witness_phone`. Proceeds to auth.
- **Primitives used:** `<RitualScreen />`, `<FrauncesH1 italic />`, `<FrauncesSub />`, `<GoldCTA variant="filled-gold" />` (Pick from contacts). Recents row + contact list cells are screen-local.

### S4-WEB · Witness pick (link-primary) 🎨
- **Design:** `flow/html/web-04-witness-pick.html`
- **Web file:** `/web/src/app/witness/page.tsx`
- **Copy:**
  - H1: same
  - "Type their name" + "Type their number (optional — they'll add it themselves)"
  - Primary CTA: "Get my link →"
- **Behavior:** if name only, generates witness invite token without phone. The witness adds their own phone when they accept. If phone provided, server sends SMS at seal time.
- **Primitives used:** `<RitualScreen />`, `<FrauncesH1 italic />`, `<GoldCTA variant="filled-gold" />`.

### S5 · Auth — phone (Step 1 of 2) 🎨
- **Design:** `flow/html/05c-auth-v4.html`
- **Web file:** `/web/src/app/seal/page.tsx` (auth gate component)
- **Expo file:** `/expo/app/auth.tsx`
- **Copy:**
  - Eyebrow: "Step 1 of 2"
  - H1: *"Put your card where your word is."*
  - Sub: "We'll text you a code, then capture the stake."
  - Vow chip anchor (showing the vow + stake + judge as confirmation breadcrumb)
  - Phone input with country selector
  - Primary CTA: "Send code →" (disabled until valid E.164)
- **Behavior:** Supabase phone OTP. On success → S6.
- **Primitives used:** `<RitualScreen />`, `<EyebrowTag tone="gold" />`, `<FrauncesH1 italic />`, `<FrauncesSub />`, `<VowDocCard compact />` (vow chip anchor), `<GoldCTA variant="filled-gold" />`. Phone input is screen-local.

### S6 · OTP (Step 2 of 2) 🎨
- **Designs:** `flow/html/05d-otp-v4.html` (disabled state), `flow/html/05d-otp-v4-active.html` (filled state)
- **Web file:** `/web/src/app/seal/page.tsx` (auth gate component, OTP step)
- **Expo file:** `/expo/app/auth.tsx`
- **Copy:**
  - Eyebrow: "Step 2 of 2"
  - H1: *"Just so it's you."*
  - 6 digit cells with blinking caret on the active one
  - Sub: "We sent a code to •••• 5309. Resend in 0:32" (countdown then "Resend")
  - Primary CTA (disabled): "Lock in $50  Pay" (with Apple Pay glyph inline)
  - When 6 digits entered → CTA goes gold (active state) and is tappable
- **Behavior:** auto-advance per digit, paste support for full code. On success → triggers Apple Pay sheet (S7).
- **Primitives used:** `<RitualScreen />`, `<EyebrowTag tone="gold" />`, `<FrauncesH1 italic />`, `<FrauncesSub />`, `<GoldCTA variant="filled-gold" />` (active state). OTP cells with blinking caret use the `blink` keyframe from §2.4 directly.

### S6.5 · Name capture (conditional) 🚧 — NEW SCREEN
- **Design:** `flow/html/s6-5-name-capture.html` (added pre-handoff)
- **Web file:** `/web/src/app/seal/page.tsx` (interstitial after OTP, before Apple Pay)
- **Expo file:** `/expo/app/auth.tsx` (interstitial after OTP)
- **When it shows:** AFTER successful OTP, BEFORE Apple Pay sheet, ONLY IF `users.display_name` is null AND `users.name_capture_prompted_at` is null OR > 24h ago
- **Why:** the maker's name appears on the certificate, in witness SMS templates, on the public outcome page. Without it we render "you" or "the maker," which deflates the product. Apple Pay's billing contact is the primary source (auto-extracted from the Apple Pay sheet on success); S6.5 is the fallback for cases where billing contact extraction fails or the user pays with a card that doesn't carry name metadata.
- **Copy:**
  - Eyebrow: "One more thing"
  - H1 (Fraunces italic): *"What should your witness call you?"*
  - Sub: "Goes on the contract. Goes in the text we send."
  - Single text input, placeholder: "Joey"
  - Primary CTA: "That's me →"
  - Tertiary text below: "Skip — they'll see 'a friend'"
- **Behavior:**
  - On submit: write to `users.display_name`, set `users.display_name_source = 'manual'`, set `users.name_capture_prompted_at = now()`. Continue to Apple Pay.
  - On skip: do NOT write display_name. Set `name_capture_prompted_at = now()` so we don't ask again for 24h. Continue to Apple Pay.
  - Apple Pay billing contact (S7) is checked AFTER payment success; if it returns a name and `display_name` is still null, write it with `display_name_source = 'apple_pay'`. This is the priority order: existing display_name > Apple Pay extraction > manual entry on this screen > none.
- **Primitives used:** `<RitualScreen />`, `<EyebrowTag />`, `<FrauncesH1 italic />`, `<FrauncesSub />`, screen-local text input, `<GoldCTA variant="filled-gold" />`, screen-local text-button for skip.

### S7 · Apple Pay sheet 🎨
- **Design:** `flow/html/05e-applepay-sheet.html`
- **Behavior:** native iOS Apple Pay sheet. We don't control the chrome — but we control the **merchant name** ("Unbreakable Vow"), **subtotal** (the stake), and **total**. Make sure those copy values are exactly right. On the web, this is Apple Pay via Stripe Payment Request API. Fallback to card entry via Stripe Elements if Apple Pay unavailable.
- **Apple Pay billing-contact extraction:** on successful payment, read the billing contact from the PKPaymentToken (Expo: `paymentMethod.billingContact`; web: Stripe `paymentRequestEvent.payerName`). If `users.display_name` is still null and we got a name, write it to `display_name` with `display_name_source = 'apple_pay'`. This is the primary source for maker name and is preferred over S6.5 manual entry. If extraction fails for any reason, fall back to whatever S6.5 captured (or null).
- **Primitives used:** none — chrome is iOS-owned. Only the merchant string and total are ours.

### S7-WEB · Card-entry fallback 🚧 — NO MOCK
- **No mock — spec-only.** Triage: side-by-side merge gate.
- **When it shows:** web only, when Apple Pay is not available (browser doesn't support, user is on desktop without Touch ID, etc.)
- Stripe Elements card form, embedded in the same `<RitualScreen />` background
- Copy: H1 (Fraunces italic): *"How you pay if you break it."* Sub: "Card details below. Nothing charges until you break the vow."
- Same primitives as S6.5 + Stripe Elements iframe

### S8 · Sealed (state A) 🎨 — V6 CANONICAL
- **Design:** `flow/html/05i-sealed-v6.html`, `flow/renders/05i-sealed-v6.png`
- **Web file:** `/web/src/app/sent/page.tsx` ⚠️ **REWRITE — currently has the SMS bug**
- **Expo file:** `/expo/app/sent.tsx` (or wherever post-pay routes today)
- **Copy:**
  - Wax seal "UV" monogram, 112px, gold gradient with breathing halo
  - H1 (Fraunces, 52px): *"Sealed."*
  - Sub (italic): *"Now tell **Nick**.* He doesn't know yet." — Nick's name is gold
  - Spacer
  - Primary CTA (iMessage green, full-width 62px): "Tell Nick →"
  - Fallback link: "or share link here"
  - Footer micro: "NOTHING CHARGES UNLESS YOU BREAK IT"
- **Behavior:**
  1. On mount: trigger `sealPopIn` animation on the seal, fire `Haptics.notificationAsync(Success)`.
  2. Tapping "Tell Nick" → opens iMessage via `sms:?&body=<encoded universal template>` with witness's phone pre-filled if known. If no phone → opens iMessage with no recipient (user picks from contacts in iMessage).
  3. **Tapping the fallback** → triggers iOS Share Sheet (Expo) or `navigator.share()` (web mobile) with the witness URL.
  4. **Listen for `visibilitychange`** — when document becomes visible again after being hidden, transition to State B (S9).
  5. **No SMS preview** in the screen. The compose UI is iMessage itself.
- **Primitives used:** `<RitualScreen />`, `<WaxSeal size="lg" showHalo />` (with `sealPopIn` animation on mount), `<FrauncesH1 />`, `<FrauncesSub />`, `<GoldCTA variant="filled-imsg-green" label="Tell Nick →" />`. Fallback link is a screen-local text button.

### S9 · Sealed (state B — returned from Messages) 🎨
- **Design:** `flow/html/05i-sealed-v6-sent.html`, `flow/renders/05i-sealed-v6-sent.png`
- **Same file as S8** — it's a state mutation, not a new screen
- **Copy:**
  - Same wax seal + 36px green ✓ badge appears via `checkBounce` animation
  - "DELIVERED · 9:41 AM" pill (real timestamp from when state B triggered)
  - H1 (Fraunces): *"Over to Nick."*
  - Sub (italic): *"He's got 24 hours to accept. Heckle him until he does."*
  - Primary CTA changes to **outlined gold** (1.5px border, gold text): "See your vow →"
- **Behavior:**
  1. Triggered by `visibilitychange` after user returns from Messages.
  2. CTA route → `/vow/[id]`.
  3. **Persist state B** in component state so refresh doesn't bounce back to State A. (Use `sentTo` flag in vow flow state, or check `vows.witness_invited_at` from DB.)
  4. After 10s of inactivity on State B, optionally show subtle "Done? See your vow →" affordance (already in current code; keep the pattern, update copy).
- **Primitives used:** `<RitualScreen />`, `<WaxSeal size="lg" showHalo showCheck />` (the green ✓ uses `checkBounce` on reveal), `<DeliveredPill timestamp={...} />`, `<FrauncesH1 />`, `<FrauncesSub />`, `<OutlinedGoldCTA label="See your vow →" />`.

**This is the single most-tested screen in the app. Every interaction path needs to be specced and tested.**

### S10 · Vow Detail (`/vow/[id]`) 🎨 partial — NEEDS DESIGN PASS
- **Design:** existing partial coverage in `14-active-countdown.html` and `15-active-streak.html`
- **Web file:** `/web/src/app/vow/[id]/page.tsx`
- **Expo file:** `/expo/app/vow-detail.tsx`
- **Phases (state machine, render different layouts based on `vow.status` and `witness_accepted_at`):**
  1. **Witness pending** (sealed but not accepted) — render `16-witness-pending.html` content
  2. **Active — countdown variant** (one-shot vow) — render `14-active-countdown.html` content
  3. **Active — streak variant** (daily vow) — render `15-active-streak.html` content
  4. **Awaiting verdict** — needs new state design 🚧 (spec below)
  5. **Kept** — see Outcome flows §5
  6. **Broken** — see Outcome flows §5
  7. **Voided** — needs new state design 🚧 (spec below)

#### S10.4 · Awaiting verdict (state design) 🚧
- **Copy:**
  - Header pill (amber pulse): "AWAITING VERDICT"
  - H1: *"Nick is judging."*
  - Vow card with the full vow text
  - Sub (italic): "Your vow ended at 9:00 PM tonight. Nick has 24 hours to deliver his verdict."
  - Countdown: "Auto-resolves to KEPT in 23:14:08"
  - Secondary action: "Nudge Nick" (sends a polite SMS reminder)
  - Tertiary text link: "Resolve it yourself" → `/self-resolve` (only after 24h elapsed)
- **Primitives used:** `<EyebrowTag tone="amber" />` (AWAITING VERDICT pulse pill), `<FrauncesH1 italic />`, `<VowDocCard />`, `<FrauncesSub />`, `<Countdown />`, `<OutlinedGoldCTA label="Nudge Nick" />`.

#### S10.7 · Voided (state design) 🚧
- **Copy:**
  - Stamp graphic: "VOIDED" in muted gray, not gold
  - H1 (Fraunces, muted): *"This one's off the table."*
  - Sub: "You voided this vow on Tuesday at 3:42 PM. Your $50 was refunded — should arrive in 5–7 days."
  - Receipt strip (vow text, refund status)
  - Primary CTA: "Make a new vow →"
- **Primitives used:** `<Stamp text="VOIDED" tone="muted-gray" />`, `<FrauncesH1 italic />`, `<FrauncesSub />`, `<VowDocCard compact />`, `<GoldCTA variant="filled-gold" />`.

### S11 · Active — Countdown variant 🎨
- **Design:** `flow/html/14-active-countdown.html`
- **Renders inside S10** when status=active and vow_type=one-shot
- **Copy:**
  - Live pulse pill (gold): "VOW LIVE"
  - Vow card
  - Countdown (4 cells, tnum, Fraunces): D / H / M / S → "Sun 9:00 PM"
  - Witness presence line: "Nick is witnessing this. Final judgment Sunday."
  - Tile row: Primary "Text Nick" (iMessage green, opens SMS with friendly check-in template), Secondary "Share"
  - Activity log (collapsed by default): "9:41 AM — You sealed. 9:43 AM — Nick accepted."
- **Primitives used:** `<EyebrowTag tone="gold" />` (VOW LIVE pulse pill), `<VowDocCard />`, `<Countdown />`, `<RitualCard pulseColor="gold" />`, `<GoldCTA variant="filled-imsg-green" label="Text Nick" />`. Activity log timeline is screen-local.

### S12 · Active — Streak variant 🎨
- **Design:** `flow/html/15-active-streak.html`
- **Renders inside S10** when vow_type=daily
- **Copy:**
  - "Day 4 of 7"
  - 7-day grid (filled circles for done, hollow gold for today, faint for future)
  - "3 in a row 🔥" (no emoji per global rule unless user adds; replace with serif fire glyph or just text "3 in a row")
  - Primary CTA: "Mark today done →"
  - Activity feed
- **Behavior:** "Mark today done" creates a `check_in` audit event with today's date. Idempotent — if already marked today, button is disabled with "Marked today ✓".
- **Primitives used:** `<EyebrowTag tone="gold" />`, `<VowDocCard />`, `<StreakGrid total={7} completed={[1,2,3]} today={4} />`, `<GoldCTA variant="filled-gold" />`.

### S13 · Witness Pending state 🎨
- **Design:** `flow/html/16-witness-pending.html`
- **Renders inside S10** when status=sealed (i.e., maker has paid but witness hasn't accepted)
- **Copy:**
  - Amber pulse pill: "WAITING ON NICK"
  - H1: *"Your vow needs a witness."*
  - Sub: "Nick hasn't tapped the link yet. We sent it 3 hours ago."
  - Avatar + "Nick · sent 3 hrs ago"
  - Primary CTA (gold): "Nudge Nick" (resends SMS, idempotency-protected to once per hour)
  - Tertiary action: "Resend the link"
- **Behavior:** "Pick someone else" is **hidden for V6** — witness rotation is not supported by the data model. Ships in V7. Do not render the link disabled; remove it entirely.
- **Primitives used:** `<EyebrowTag tone="amber" />` (WAITING ON NICK pulse pill), `<FrauncesH1 italic />`, `<FrauncesSub />`, `<GoldCTA variant="filled-gold" label="Nudge Nick" />`. Avatar row is screen-local.

## 3.2 Witness flow (token-based, no account)

### S14 · Witness Landing 🎨 — UPDATE COPY (revised Apr 22, 2026 — absorbs S14.5 reassurance)
- **Design:** `flow/html/09-witness-landing.html`
- **Web file:** `/web/src/app/w/[token]/page.tsx` (server component) + child client component
- **OG card:** server-rendered at `/w/[token]/og` (see §4.5)
- **Copy (UPDATED for witness identity decision + S14.5 kill):**
  - Eyebrow pill (gold): "UNBREAKABLE VOW"
  - H1 (Fraunces): *"Joey needs you to witness this."*
  - Vow document card:
    - Quoted vow (italic Fraunces)
    - Meta: "$50 on the line · If broken → ALS Association · Verdict due Sun 9:00 PM"
  - Body copy: *"Your job: 2-3 check-ins from us during the week, then one tap on Sunday to deliver your verdict. That's it. No app needed."*
  - Primary CTA: "I'm in →" (gold gradient)
  - Secondary: "Pass — I can't" (text link)
  - **Reassurance footer (NEW — moved here from the killed S14.5):** *"Zero cost to you. No account needed. Joey's your only connection."* — one line, italic Fraunces 12.5px, `--text-dim`, centered, 16px below the "Pass — I can't" link. Addresses spam-anxiety at the right moment: **before** they commit, not after.
  - **(REMOVED)** "First time? How this works ↗" footer link — no longer needed; S14.5 is gone.
- **Primitives used:** `<RitualScreen />`, `<EyebrowTag tone="gold" />`, `<FrauncesH1 italic />`, `<VowDocCard />`, `<FrauncesSub />`, `<GoldCTA variant="filled-gold" label="I'm in →" />`. Reassurance footer is screen-local.

### S14.5 · First-time witness onboarding 🗑️ — KILLED Apr 22, 2026

> **🎯 Decision (Apr 22, 2026).** S14.5 is **deleted**. The full-screen interstitial between "I'm in" and the accepted state does not pay for the attention it takes. A witness's job is one line — "tap a button when we text you" — and the rest of the flow already makes that obvious without didactic explanation.
>
> **Replacement mechanisms:**
> 1. **Reassurance lines moved to S14 footer** (see above) — spam-anxiety addressed *before* commitment, which is when it matters.
> 2. **Cadence communicated diegetically on S16** — the accepted-state timeline dots ("Now → Sat 24h before → Sun 9:00 PM") show the cadence in ~15 words without a separate screen.
> 3. **No localStorage flag needed** (previously `witnessOnboardingSeen`). No screen, no flag.
>
> **Impact on flow:** witnessing becomes a **2-screen web flow** — S14 (see the vow → accept or pass) → S16 (confirmed, here's when we'll hear from you), with S15 (phone capture) as an optional interstitial only when `vows.witness_phone IS NULL`. Clean, respectful of the witness's time, matches the actual scope of the job.
>
> **Implementation cleanup in Claude Code:**
> - Do **NOT** create the S14.5 intermediate step inside `/w/[token]/page.tsx`. Routing goes S14 → (S15 if needed) → S16 directly.
> - Do **NOT** write or read a `witnessOnboardingSeen` localStorage flag. It doesn't exist.
> - Do **NOT** reference `flow/html/s14-5-first-time-witness.html` — the mock has been deleted from the flow directory.

### S15 · Witness Phone (if not provided) 🎨
- **Design:** the second screenshot Joey shared shows "W1B · WITNESS PHONE NUMBER" with iPhone glyph + "One last thing." H1 + phone input + "Done →"
- **Web file:** new step inside `/w/[token]/page.tsx` after acceptance
- **Copy:**
  - Phone glyph illustration (small, gold-tinted)
  - H1 (Fraunces): *"One last thing."*
  - Sub: "Enter your number so we can text you on Sunday for the verdict."
  - Phone input with country selector
  - Primary CTA: "Done →"
  - Tertiary: "Skip — I'll check the link myself"
- **Behavior:**
  - **Only shown if `vows.witness_phone IS NULL`** (link-share flow).
  - On submit → updates `vows.witness_phone`.
  - On skip → witness gets no SMS reminders, must remember to come back. Verdict link still works.
- **Primitives used:** `<RitualScreen />`, `<FrauncesH1 italic />`, `<FrauncesSub />`, `<GoldCTA variant="filled-gold" label="Done →" />`. Phone glyph illustration + phone input are screen-local.

### S16 · Witness Accepted 🎨 — UPDATE COPY (witness identity decision)
- **Design:** `flow/html/10-witness-accepted.html`
- **Same file as S14**, mutated state after acceptance
- **Copy (UPDATED):**
  - Checkmark in gold circle (animated `checkBounce` on reveal)
  - H1: *"You're in. Joey knows."*
  - Sub (italic): *"You're now the witness to his vow. We'll text you 2-3 times this week, then one final ask on Sunday for your verdict."*
  - Timeline (3 dots, gold, vertical):
    - "Now" — Joey gets the green light
    - "Sat (24h before)" — heads-up text to you
    - "Sun 9:00 PM" — one tap to deliver your verdict
  - Primary CTA (iMessage green): "Text Joey: I've got you →" (opens SMS with pre-filled body)
  - Footer micro: "We'll only text you on the schedule above."
- **Behavior:** acceptance fires `accept-witness` edge function. UI mutates to this state. Witness gets a confirmation SMS.
- **Primitives used:** `<RitualScreen />`, `<WaxSeal size="md" showCheck />` (gold checkmark with `checkBounce`), `<FrauncesH1 italic />`, `<FrauncesSub />`, `<GoldCTA variant="filled-imsg-green" />`. Vertical timeline is screen-local.

### S17 · Verdict Prompt 🎨 — UPDATE COPY (witness identity)
- **Design:** `flow/html/11-verdict-prompt.html`
- **Web file:** `/web/src/app/w/[token]/verdict/page.tsx`
- **Copy (UPDATED):**
  - Brand header pill: "UNBREAKABLE VOW"
  - H1 (Fraunces): *"Verdict day — Joey's vow is up."*
  - Witness identity context line (NEW, per witness identity decision): *"You've been witnessing his commitment for 7 days. Time to deliver your testimony."*
  - Vow document card (full vow text, stake, destination)
  - Body: *"Your call: did Joey keep his word?"*
  - Two large buttons (stacked or side-by-side):
    - "Yes — Kept it" (gold gradient, ~120px tall)
    - "No — Broke it" (red outlined, ~120px tall)
- **Behavior:** Tapping "Broke it" → guard modal (S18). Tapping "Kept" → submit immediately, route to thanks (S19).
- **Primitives used:** `<RitualScreen gradient="verdict" />`, `<EyebrowTag tone="gold" />`, `<FrauncesH1 italic />`, `<VowDocCard />`, `<GoldCTA variant="filled-gold" label="Yes — Kept it" />`. The "No — Broke it" red outlined button is a screen-local variant (or extend `<OutlinedGoldCTA />` to accept a `tone="red"` enum if it gets reused — flag for primitives review).

### S18 · Verdict Confirm (Broken guard) 🎨
- **Design:** `flow/html/12-verdict-submit.html`
- **Modal overlay**
- **Copy:**
  - Gavel glyph (small, gold)
  - H1 (Fraunces): *"You're calling it broken."*
  - Sub: "This locks right after. No undo."
  - Preview pill: "Charge to ALS Association: $50"
  - Primary destructive: "Yes — he broke it" (red gradient)
  - Secondary: "Wait, I want to check first" (text link)
- **Primitives used:** `<FrauncesH1 italic />`, `<FrauncesSub />`. Modal wrapper, gavel glyph, preview pill, and red destructive button are screen-local.

### S19 · Verdict Thanks 🎨 — UPDATE COPY
- **Design:** `flow/html/13-verdict-thanks.html`
- **Copy (UPDATED for witness identity):**
  - Circular stamp: "KEPT" or "BROKEN" (gold for kept, muted red for broken)
  - H1: *"Done. Joey's been told."*
  - Sub (italic): *"Your testimony is recorded. He'll see it in the app."*
  - Receipt strip:
    - Vow: [vow text]
    - Verdict: Kept (green ✓)
    - Refund: $50 → Joey
  - Recruitment card (gold border): *"Now you. What would you put $50 on?"*
    - "Make my vow →" (gold)
    - "Dare Joey back →" (outline)
    - "Just look around" (text link)
- **Primitives used:** `<RitualScreen />`, `<Stamp text="KEPT" tone="gold" />` or `<Stamp text="BROKEN" tone="muted-red" />`, `<FrauncesH1 italic />`, `<FrauncesSub />`, `<GoldCTA variant="filled-gold" label="Make my vow →" />`, `<OutlinedGoldCTA label="Dare Joey back →" />`. Receipt strip is screen-local.

### S19 · Witness-link terminal states 🚧 — STATUS-AWARE VARIANTS (UPDATED Apr 22, 2026)

**Design decision (Apr 22, 2026):** Replace the single "S19-EXPIRED" page with three status-aware variants. Rationale: an "expired" page contradicts the "Unbreakable Vow" brand promise. The witness link should branch by **vow status**, not by **calendar age**. Most witnesses who land here actually want to see the outcome — not be told their link is dead. The literal "expired" copy now only appears in the rare edge case where the vow ran out without ever recording a verdict.

**Schema change:** `vows.witness_token_expires_at` is **DEPRECATED** as a behavioral driver. Token never expires by calendar TTL. The `/w/[token]/page.tsx` router branches on `vows.status`, `vows.verdict`, and `vows.witness_declined` to render the right variant. The column may stay in schema for analytics, but no UI gate uses it.

**Router logic for `/w/[token]/page.tsx`:**
```
if witness_declined = true:                                 → S19-DECLINED
else if verdict IS NOT NULL:                                → S19-OUTCOME-RESOLVED
else if status = 'voided':                                  → S19-VOIDED (copy below)
else if status IN ('sealed','active','awaiting_verdict'):   → S14 (accept) or S17 (verdict prompt) per existing logic
else (data inconsistency / orphaned token):                 → S19-EXPIRED (true edge case)
```

#### S19-OUTCOME-RESOLVED · Witness arrives at a finished vow ✨ — PRIMARY VARIANT
- **Design:** `flow/html/s19-outcome-resolved.html`
- **When it shows:** witness opens `/w/[token]` after `vows.verdict` is set (kept OR broken). This is the most common case — witness loses the SMS, finds it weeks later, clicks. They should see the outcome, not "expired."
- **Copy (verdict = kept):**
  - Eyebrow (gold): "Verdict sealed"
  - H1 (Fraunces italic): *"[Maker_name]'s word held."* (e.g., "Joey's word held.")
  - Sub: "[Maker_name] kept the vow. Witnessed by [Witness_name] on [Date]."
  - Vow recap card (vow text + stake + "Returned to [Maker]")
  - Primary CTA (gold): "See the full record →" → `/certificate/[vowId]` (kept vows get the celebratory certificate)
  - Tertiary: "Want one of your own? [Make a vow →]"
- **Copy (verdict = broken):** swap H1 → *"[Maker_name] broke it."* with muted-red treatment; sub → "Witnessed by [Witness_name] on [Date]. The $X went to [destination]." Recap card same shape but with destination row. Primary CTA links to `/outcome/[vowId]` (broken vows get the neutral public record).
- **Visual:** wax seal at full opacity (vow IS sealed and resolved — not faded), small ✓ overlay bottom-right, gold halo. Kept feels celebratory; broken feels honest but not punitive.
- **Behavior:** terminal state. Tapping primary CTA navigates to public outcome page.
- **Primitives used:** `<WaxSeal showCheck />`, `<EyebrowTag tone="gold" />`, `<FrauncesH1 italic />`, `<VowDocCard compact />`, `<GoldCTA />`.

#### S19-DECLINED · Witness who passed returns to the link 🚧
- **Design:** `flow/html/s19-declined.html` (added pre-handoff)
- **When it shows:** witness opens `/w/[token]` after they previously hit "Pass — I can't" on S14.
- **Copy:**
  - Eyebrow (muted): "You passed on this one"
  - H1 (Fraunces italic): *"You sat this one out."*
  - Sub: "[Maker_name] knows you declined. He found someone else, or let the vow go."
  - Outlined-gold secondary CTA: "Change of heart? Text [Maker_name] →" (opens SMS pre-fill: *"Hey — about that vow you asked me to witness. Still need someone?"*)
  - Tertiary: "Make one of your own? [Make a vow →]"
- **Visual:** faded wax seal (55% opacity), softer than S19-EXPIRED. Conveys "you stepped away from this one" not "this is broken."

#### S19-VOIDED · Maker pulled the vow before it resolved 🚧 — NO MOCK YET
- **No mock — spec-only. Side-by-side merge gate.** Joe sign-off required before build.
- **When it shows:** witness opens `/w/[token]` after `vows.status = 'voided'` (maker cancelled, refund issued).
- **Copy:**
  - Eyebrow (muted): "Vow voided"
  - H1 (Fraunces italic): *"[Maker_name] called it off."*
  - Sub: "He pulled this vow before the verdict. The stake was returned. Nothing left to judge."
  - Tertiary: "Make one of your own? [Make a vow →]"
- **Visual:** same template as S19-DECLINED (faded seal, no primary CTA, just the tertiary text link).

#### S19-EXPIRED · True edge case — vow ended without a recorded verdict 🚧
- **Design:** `flow/html/s19-expired.html` (rewritten Apr 22, 2026)
- **When it shows:** witness opens `/w/[token]` and the vow's deadline passed but somehow no verdict was recorded AND auto-resolve didn't fire (data inconsistency). Should be **rare to nonexistent** in practice if cron-runner is healthy.
- **Copy:**
  - Eyebrow (muted): "No verdict on record"
  - H1 (Fraunces italic): *"That vow ended quietly."*
  - Sub: "The verdict window closed before [Maker_name] got a decision recorded. No outcome was sealed."
  - Tertiary: "Want one of your own? [Make a vow →]"
- **Visual:** faded wax seal (45% opacity, dimmer gradient). True dead-end visual — but uncommon.
- **Operational note:** if S19-EXPIRED renders in production for a non-edge-case user, it's a bug — page-level analytics should fire an alert (cron-runner skipped this vow's auto-resolve).

### S19-AUTO-RESOLVED · Auto-resolved KEPT — copy variant 🚧
- **Affects:** maker outcome screens (M11) when verdict was auto-resolved (witness didn't respond in 72h)
- **Copy difference:** Standard KEPT outcome reads *"Your word is gold. Your witness called it kept."* — Auto-resolved KEPT reads *"Your word held. Your witness didn't return — we ruled in your favor after 72 hours."*
- **Why the distinction matters:** the maker should know the outcome wasn't actively confirmed. Soft-pedaling auto-resolution as if a witness ruled erodes trust over time when the maker realizes their witness ghosted.
- **Primitive:** use `<Stamp text="KEPT" tone="gold" variant="auto-resolved" />` instead of `<Stamp text="KEPT" tone="gold" variant="confirmed" />` — the `variant` prop controls a sublabel below the stamp text ("CONFIRMED BY [witness]" vs "AUTO-RESOLVED · 72H"). See §2.5B for the updated `<Stamp />` API.

## 3.3 Maker outcome flows — DESIGNS NEEDED

See **Part 5** for full outcome flow specs (M11 trophy, M11B "Crisis averted", destination picker).

## 3.4 Dashboard 🎨 partial — NEEDS REFRESH PASS

### S20 · Dashboard 🎨 partial (revised Apr 22, 2026 — second pass)
- **Design:** `flow/html/s20-dashboard-A-revised-v2.html` (canonical, multi-vow with Needs-You-Now promotion zone) + `flow/html/08-quick-vow.html` (single-vow hero state retained for first-vow user)
- **Earlier mocks (kept for reference, not canonical):** `s20-dashboard-multi.html` (V6 Apr 22 first-pass), `s20-dashboard-A-tighten.html` + `s20-dashboard-B-split.html` (Apr 22 second-pass exploration), `s20-dashboard-A-revised.html` (panel-fix interim)
- **Web file:** `/web/src/app/dashboard/page.tsx`
- **Expo file:** `/expo/app/dashboard.tsx`

> **🎯 Consumer-product-designer second-pass audit (Apr 22, 2026 — afternoon).** Joe's follow-up: *"is it easy to digest and read? add a state for pending witness acceptance. show me two options."* Built A-tighten + B-split, panel of 6 (Wei Huang, Rauno Freiberg, Jordan Singer, Gabriel Valdivia, Linda Dong, Tobias van Schneider) split B-leaning but Joe picked A's voice (italic Fraunces vow + gold "I'll" prefix). Then a separate panel debated "should there be a Mine|Witnessing toggle at the top?" — unanimous NO (would violate §1.1 "witness present via notifications, not via a surface" + fragments user identity). Resulting locked spec below. Full panel writeups: `S20-PANEL-AUDIT.md`, `S20-TOGGLE-DEBATE.md`.
>
> **Changes locked Apr 22 (second pass):**
> 1. **Pending-witness state added** (`status='sealed' AND witness_accepted_at IS NULL`). Card visually recedes: gold-deep left border instead of gold-bright, vow text dims to `--text-mute`, gradient background fade. Pill: `Awaiting [WitnessFirstName]` in amber. Meta swaps "Until" → "Starts when [Witness] accepts". Witness chip shows "Pending" with amber tint (color + text + background = three signals, accessibility per Linda Dong).
> 2. **Ownership signaling via 2px gold left border** on YOUR VOWS cards (Jordan Singer's note). YOUR VOWS get `--gold` border-left; AWAITING-WITNESS card gets `--gold-deep` border-left (signals "yours but waiting"). Witnessing rows have NO left border (not yours).
> 3. **"Needs You Now" promotion zone** (Wei Huang's note). Any witnessing item with `verdict_due_at - now() < 24h` is **promoted out** of the witnessing list into a dedicated `Needs you now` mini-section (amber pulsing dot + section header, amber-tinged action card with maker avatar, headline `[Maker]'s verdict · N hrs left`, vow + stake summary, `Verify →` CTA). The pending-dare card lives in the same section (also a "decide now" item). The promoted row is **removed** from the witnessing list below (not duplicated) — the witnessing count adjusts accordingly. This solves the hierarchy bug where Sarah's 6-hour verdict sat below Joey's 3-day vow.
> 4. **Section header anchoring:** under-rule of 1px `--gold-line` below each section title. Title weight 600, color `--gold-bright`, count in `--text-mute` after a `·` separator (e.g. "YOUR VOWS · 3").
> 5. **Witness chip** (right side of meta strip): name + status dot, no column header. Green dot = witness accepted; amber dot + amber-tinted background + text "Pending" = witness hasn't accepted yet. Replaces the previous awkward column-header treatment.
> 6. **Vow text leading bumped** from line-height 1.18 → 1.28 for italic Fraunces breathing room.
> 7. **Meta-label color** raised from `--text-dim` (#726A5A, 4.8:1 contrast) to `--text-mute` (#A49A85) for WCAG AA compliance (Linda Dong's note).
> 8. **No segmented-control toggle** at the top. The dashboard is one unified surface; witnessing lives as a section, never as a peer of "Your vows." See `S20-TOGGLE-DEBATE.md`.
>
> **Earlier first-pass changes (Apr 22 morning), still in effect:**
> 1. **History lives behind the hamburger menu** (Joe's explicit choice via AskUserQuestion). Dashboard stays focused on the *live* state; history, settings, account, and sign-out are all surfaced one tap away in the menu, so the scroll never grows long.
> 2. **"See all" is a tappable card**, not a tiny right-aligned text link. Gold-soft background, gold-line border, 12px radius, 11px 14px padding. Copy updated to **"All N you're witnessing →"** (states the count, doesn't sound like overflow). Full-row tap target that opens S20-WITNESSING-ALL.
> 3. **Pending-dare tile** lives in the new `Needs you now` section above the Witnessing list (was previously a stand-alone section between Your Vows and Witnessing — second-pass groups it with other "decide now" items).

- **Layout (top-to-bottom, locked Apr 22 second pass):**
  - **Header:** **hamburger menu** (left, 22px three-line icon, `--text-mute`) + "Unbreakable Vow" wordmark (center, Fraunces italic 16px `--text`) + avatar/initial circle (right, 28px, gold gradient bg, Fraunces 13px `#1A1205`)
  - **Hamburger menu drawer contents** (left-side slide-in, `--surface-2` bg, 80% screen width):
    - Avatar + display name + phone (top block)
    - **History** → `/history` — list of all past vows (kept/broken/voided), sorted newest first. Each row is a compact vow card with status pill + date. Tap → `/vow/[id]` read-only.
    - **Settings** → `/settings` — account, notifications, payment, defaults, legal, danger zone (§6.1 full spec)
    - **Account** → `/settings#account` — deep-link to account section
    - Divider
    - **Sign out** (text link, muted) — clears session, routes to `/`
    - Footer: app version + "Built with care" wordmark
  - **Greeting:** "*Hey, [FirstName].*" (Fraunces italic 28px, weight 500, opsz 144) — always shown
  - **Section 1 — Your vows (`title: "YOUR VOWS · N"`):** stacked `<VowDocCard compact />` cards, each with **2px `--gold` left border** to claim ownership. Three card variants:
    - **ACTIVE** (`status='active'`): pill `Active · Day X of N` (gold-soft bg), top-right time `<b>3 days</b> left`, vow text in Fraunces italic 17px line-height 1.28 with gold-bright italic "I'll" prefix, meta `On hold $X · Until [datetime] · [witness chip green]`.
    - **AWAITING WITNESS** (`status='sealed' AND witness_accepted_at IS NULL`) — NEW: card visually recedes via `border-left: 2px solid var(--gold-deep)` (deep gold instead of bright), `background: linear-gradient(180deg, var(--surface), rgba(24,21,18,0.7))` (slight fade), `vc-text` color → `--text-mute`. Pill: `Awaiting [WitnessFirstName]` (amber). Top-right time: `Sealed <b>2 hrs</b> ago`. Meta: `On hold $X · Starts when [Witness] accepts (amber) · [witness chip pending]`. The card communicates "this is yours, money is held, but the timer hasn't started — we're waiting on someone else."
    - **AWAITING VERDICT** (`status='awaiting_verdict'`): pill `Awaiting verdict` (amber), top-right time `[Witness] replies in <b>14 hrs</b>`, meta `On hold $X · If broken → [destination] · [witness chip green]`. Same gold-bright left border as ACTIVE — it's an action item.
    - **Witness chip** (right edge of every meta strip): `name + dot`, no column header. Green dot for accepted; amber dot + amber-tinted background + text "Pending" for not-yet-accepted. Border-radius 999px. Inter Tight 11px weight 500.
    - **Tap any card → `/vow/[id]`** (maker view, full detail + timeline + void action).
  - **Section 2 — Needs you now (`title: "NEEDS YOU NOW"` with pulsing amber dot to its left):** **NEW promotion zone**, only rendered if there's at least one item in it. Two kinds of items live here:
    - **Promoted urgent witnessing** (any vow where `witness_user_id = auth.uid()` AND `verdict_due_at - now() < 24h`): amber-tinged card (`background: linear-gradient(180deg, rgba(241,169,60,0.08), rgba(241,169,60,0.03))`, `border-left: 2px solid var(--amber)`). Layout: maker avatar (36px, amber border) + body (`<b class="amber">[Maker]'s verdict</b> · N hrs left` headline in Inter Tight 12.5px, vow + stake summary in Fraunces italic 13px muted) + `Verify →` CTA (gold gradient pill, Inter Tight 12px weight 600). Tap → `/w/[token]/verdict`.
    - **Pending dare** (`challenge_status='pending'`): unchanged from §3.10 dare-flow spec (gold-line border card, italic quoted dare, Accept/Decline buttons).
    - **The promoted witnessing item is REMOVED from the Section 3 list** (not duplicated). The witnessing count in Section 3 reflects post-promotion total.
  - **Section 3 — You're witnessing (`title: "YOU'RE WITNESSING · N"`):** smaller `<RitualCard />` rows, each shows maker avatar (32px) + name (Inter Tight 12px) + when (Fraunces italic 11px, urgent = amber roman) + vow (Fraunces italic 14px muted, single-line truncated) + stake (Fraunces 12px gold). Tap → `/w/[token]/verdict` if verdict time, else read-only `/vow/[id]?as=witness`.
    - **Filter rule (canonical):** show ONLY vows where `witness_user_id = auth.uid()` AND `vow.status IN ('active','awaiting_verdict')`. Do NOT show witnessing rows for vows the user-as-maker created (a user is never their own witness). Do NOT show witnessing rows for vows that have been kept/broken/voided — those move to `/history` (own) or are simply gone (others'). All other surfaces (notifications, verdict screen, witness OG link) inherit this filter.
    - **Cap rule:** show at most **3** rows on the dashboard, sorted by `ends_at ASC` (most time-urgent first), AFTER any urgent items have been promoted to "Needs you now". If post-promotion list is >3, render a **tappable "All N you're witnessing →" card** below:
      - Background: `--gold-soft`, border: 1px `--gold-line`, border-radius: 12px, padding: 12px 14px
      - Typography: Inter Tight 13px weight 500 `--gold-bright`, right-aligned arrow
      - Full-row tap target — opens **S20-WITNESSING-ALL**
      - **No urgency dot here** — the urgent item has already been promoted to "Needs you now" above. The see-all card is purely an overflow door.
      - Rationale: in the Cast scenario a power-user could be witness to 20+ active vows; an uncapped section would dominate the dashboard. Three rows + a clear "all N" card keeps dashboard pressure low and the overflow path obvious.
    - **No segmented-control toggle** at the top of the dashboard. Witnessing is a section, not a peer surface. (Per §1.1 "witness is present via notifications, not via a surface" + panel verdict in `S20-TOGGLE-DEBATE.md`.)
  - **Footer CTA bar (sticky bottom):** "Make a vow →" (gold gradient, 60px height, 14px radius, Fraunces 17px weight 500 `#1A1205`, with inset highlight + glow shadow + bottom inner shadow to lift off the scrolling content).
  - **Empty state:** if no active vows AND no witnessing AND no dare: render S20-EMPTY (separate spec below).
- **Section ordering rationale:** Your stuff first (cards with full agency) → Decide-now items second (high-attention, low-frequency) → Other people's stuff third (ambient, capped). The user always sees their own commitments before seeing what they owe others. The "Needs you now" zone exists because the dashboard's job is *"what should I think about right now?"* — and a witnessing item with a verdict due in 4 hours has higher cognitive priority than a 7-day vow on day 4.
- **Navigation model — "what happens when I click into each":**
  - Tap a **Your-vows card** (any of 3 variants) → `/vow/[id]` (maker view, full detail + timeline + void action)
  - Tap a **Needs-you-now witnessing card** (`Verify →`) → `/w/[token]/verdict`
  - Tap a **Pending-dare card** → `/c/[token]` (challenge accept/decline)
  - Tap a **Witnessing row** in Section 3 → `/w/[token]/verdict` if `awaiting_verdict`, else read-only `/vow/[id]?as=witness`
  - Tap **"All N you're witnessing"** → `/witnessing` (S20-WITNESSING-ALL — the overflow list view; filter tabs Active / Recent; tap any row takes you to the same destination as a dashboard witnessing row)
  - Tap **hamburger → History** → `/history` (read-only list of resolved vows — the "long scroll" lives here, not on the dashboard)
- **Behavior:** polling every 30s, refresh on visibilitychange. Pull-to-refresh on Expo. The pulsing amber dot on "Needs You Now" header uses CSS animation (1.6s ease-in-out infinite, `box-shadow` ring scale).
- **Primitives used:** `<FrauncesH1 italic />` (greeting), `<VowDocCard compact variant="active|awaiting-witness|awaiting-verdict" />` (per §3.4 layout), `<WitnessChip status="accepted|pending" name />` — NEW primitive (PR #1.5 must include), `<NeedsNowCard kind="witness|dare" />` — NEW primitive, `<RitualCard compact />` (witnessing rows), `<EyebrowTag tone="gold|amber|muted" />` (status pills), `<GoldCTA variant="filled-gold" label="Make a vow →" />` (sticky footer). Header chrome, hamburger drawer, section dividers, "Needs you now" pulsing-dot section header, and "All N you're witnessing →" tappable card are screen-local.

### S20-EMPTY · Dashboard empty state 🚧
- **Copy:**
  - Header same
  - Centered: small wax seal monogram (faded, 60% opacity, no halo)
  - H1: *"No vows on the line."*
  - Sub (italic): "Sealed commitments will show up here."
  - Primary CTA: "Make your first vow →"
- **Primitives used:** `<RitualScreen />`, `<WaxSeal size="sm" showHalo={false} />` rendered at 60% opacity (acceptable inline style override since it's an opacity wrapper, not a visual override), `<FrauncesH1 italic />`, `<FrauncesSub />`, `<GoldCTA variant="filled-gold" />`.

### S20-WITNESSING-ALL · All vows you're witnessing 🚧 — NEW SCREEN
- **Design:** `flow/html/s20-witnessing-all.html` (added pre-handoff)
- **Web file:** `/web/src/app/witnessing/page.tsx` (new route)
- **Expo file:** `/expo/app/witnessing.tsx` (new route)
- **Entry:** dashboard "See all N you're witnessing →" link (only shown when N > 3)
- **Why this exists:** the Cast flow lets a user dare many friends. A single power-user could end up witness to 20+ active vows. The dashboard caps witnessing at 3 rows; this screen is the overflow. **It is NOT a witness dashboard or feed** (per §1.1 — that decision still holds). It is a *list view of one section of the dashboard* — same posture, more rows.
- **Layout:**
  - Header: back chevron (left) + page title "Witnessing" (Fraunces italic, 24px, centered) + spacer (right)
  - Filter tabs (segmented control, gold-underline indicator):
    - **Active** (default) — `status IN ('active','awaiting_verdict')`, sorted by `ends_at ASC`
    - **Recent** — `status IN ('kept','broken','voided')` AND `verdict_at > now() - 30 days`, sorted by `verdict_at DESC`
  - List of `<RitualCard />` rows (compact variant), each showing:
    - Maker name + small avatar/initial circle
    - Vow text (Fraunces italic, 1 line, truncated)
    - Status pill (active/awaiting_verdict/kept/broken/voided) using `<EyebrowTag />`
    - Time-until-verdict (if active) or verdict-date (if resolved), Inter Tight 13px muted
    - Stake amount (small, gold)
  - Tap a row → `/w/[token]/verdict` if `awaiting_verdict`, else `/outcome/[vowId]` for resolved, else read-only summary at `/vow/[id]?as=witness`
  - Empty state for "Active" tab: "*Nothing active right now.*" + small text link "View recent →"
  - Empty state for "Recent" tab: "*Your recent verdicts will live here.*"
- **Behavior:** polling every 60s on this page (less aggressive than dashboard's 30s). Pull-to-refresh on Expo. No write actions on this screen — it's purely a navigation surface.
- **Primitives used:** `<RitualScreen variant="utility" />`, `<FrauncesH1 italic />` (page title), `<RitualCard compact />`, `<EyebrowTag />`. Header chrome (back chevron, segmented control) is screen-local.
- **Read view permission:** uses the new RLS policy `vows_select_as_witness` (added in §4.1 migration).

## 3.5 Quick Vow + Create

### S21 · Quick Vow 🎨 (returning user power flow)
- **Design:** `flow/html/08-quick-vow.html`
- **Web file:** `/web/src/app/quick-vow/page.tsx`
- **Copy + behavior:** vow input + inline pills (deadline, stake, charity), one CTA "Seal it." Optionally auto-route through Apple Pay (saved card) without re-auth.
- **CTA secondary:** "Dare a friend →" (routes to `/cast`)
- **Primitives used:** `<RitualScreen />`, `<FrauncesH1 italic />` (if any heading present), `<StakeTile />` row, `<GoldCTA variant="filled-gold" label="Seal it." />`, `<OutlinedGoldCTA label="Dare a friend →" />`. Vow input + inline pills are screen-local.

### S22 · Create (full editor) 🎨 partial — NEEDS DESIGN
- **Design:** none yet for this exact pattern (combines pitch + stake + IfBrokenSheet on one screen)
- **Web file:** `/web/src/app/create/page.tsx`
- **Spec (prose):** single-screen vow creation. Sectioned form. Step 1: vow text + verdict date. Step 2: stake + destination. Bottom: "Seal it →" CTA.
- **Recommendation:** for V6, **point `/create` to redirect to `/refine` flow** until design exists. Ship the multi-step flow first; reintroduce single-page later.

## 3.6 IfBrokenSheet (modal) 🚧 — NEEDS DESIGN

Triggered from Stake screen (S3), Quick Vow (S21), Cast flow (C5), and S6 review when user taps "Change" on the destination row.

- **Spec:**
  - Bottom sheet, 75% screen height, 24px top radius, scrim at 60% opacity
  - Title: *"If you break it…"*
  - Three tabs (gold underline indicator), default tab = the user's currently-selected category (or `Charity` for first-time):
    - **Charity** — vetted nonprofits, in fixed display order:
      1. **ALS Association** ← top of list (Joey-pinned)
      2. St. Jude Children's Research Hospital
      3. Ronald McDonald House Charities
      4. Feeding America
      5. Doctors Without Borders
      6. World Wildlife Fund
      7. (more — see `lib/causes.ts`)
    - **Cause you love** — opinionated list of orgs where the user wants the money to go for *positive* reasons (their alma mater fund, a niche nonprofit they care about). For V6 ship a curated list with a "Suggest one" link that opens a feedback form (no UGC writes to vow record). Default ordering same as Charity tab — **ALS at top**, then a "love" tier.
    - **Cause you hate** — *"Make sure it stings."* — opinionated list of orgs where the maker would HATE for the money to go. Display order is fixed and intentional:
      1. **NRA** ← top of list (Joey-pinned)
      2. **PETA** ← second (Joey-pinned)
      3. Donald Trump campaign
      4. Ted Cruz campaign
      5. Planned Parenthood (intentionally polarizing — appears here because for some users this is the sting; for others it would belong in Love. The list is not a value statement; it's a sting catalog.)
      6. (more — see `lib/causes.ts`)
    - Each option in any tab is a `<RadioCard />`. Selected has gold border + check icon. Hate-tab cards display a small red 🚫 glyph on the right; love-tab cards display a small gold heart; charity cards show no glyph.
  - Each card has the org name (Inter Tight, semibold, white) and a one-line description (Inter Tight, 13pt, white at 60%) below.
  - Footer: gold CTA "Lock destination →"
  - Tertiary text below CTA: "Money is sent at verdict. You can change this until you seal."
- **Behavior:** updates `vows.consequence` (`'charity'` | `'love'` | `'anti'`) and `vows.destination` (the entity name as a string). Updates flow state immediately; persists to DB on seal.
- **Data source:** lives in a hardcoded `lib/causes.ts` with this shape:
  ```ts
  export const CAUSES = {
    charity: [
      { id: 'als', name: 'ALS Association', desc: 'Funds research into ALS / Lou Gehrig\'s disease.', pinnedTop: true },
      { id: 'stjude', name: 'St. Jude...', ... },
      // ...
    ],
    love: [
      { id: 'als', name: 'ALS Association', desc: 'Same as charity but on the love list — top.' },
      // ...
    ],
    anti: [
      { id: 'nra', name: 'NRA', desc: 'National Rifle Association lobbying.', pinnedTop: true },
      { id: 'peta', name: 'PETA', desc: 'People for the Ethical Treatment of Animals.', pinnedTop: true },
      // ...
    ],
  };
  ```
- **Why ALS pinned to top of love + charity:** Joey's call. Personal connection / brand affinity. Document the decision in `lib/causes.ts` comment.
- **Why NRA + PETA top of hate:** Joey's call. NRA is the broadest single-org sting in US politics; PETA carries the second-broadest sting from a different ideological angle. Together they cover more of the maker base than any single pick.

## 3.7 Settings, History, Account — DESIGNS NEEDED

See **Part 6**.

## 3.8 Cast / Challenge flows

Full spec lives in §3.10 below. Brief version: maker challenges another person to make a vow. Maker IS the witness on a Cast. Target receives an SMS with `/c/[token]` link. Target accepts → vow becomes active with target as maker, maker as witness. Target declines → vow voids, no charge.

Edge cases and SMS templates: see §6.6.

## 3.9 Mobile-Web parity

### 3.9.0 Visual parity contract (READ THIS FIRST)

**Mobile-web is visually IDENTICAL to native iOS at 393×852.** This is not a "mobile-friendly adaptation" of the native design — it is the same design rendered in a browser. The contract:

- Same fonts (Fraunces + Inter Tight via `next/font`)
- Same colors (CSS variables match Expo `tokens.ts` exactly per §1.5)
- Same spacing, padding, radius, button heights — every value in §2.3 applies to web at the same numeric values
- Same animations (CSS keyframes match the React Native Animated specs in §2.4 — same durations, same easing curves)
- Same H1 sizes, same italics, same eyebrow letterspacing
- Same wax-seal treatment with breathing halo
- Same cinematic moments (cold-open, seal echo, clock starts) — full-fidelity on web. Initiation Oath is hand-on-screen interactive on native, tap-on-seal on web (the only intentional cinematic divergence — see §3.0.2).

**Where native ≠ web is functional, never visual.** A button that triggers Apple Pay on native triggers Stripe Payment Request API on mobile-web — but the button itself (color, size, copy, animation) is identical. A "Tell Nick" CTA opens iMessage on native and copies the link + opens `sms:` deep-link on web — but the CTA itself is identical.

**The 480px max-width rule.** On mobile-web at viewports ≤ 480px, the layout fills the screen edge-to-edge (matches native). On viewports > 480px (tablet/desktop), the app is centered in a 480px-wide column with a faint gold hairline border `1px solid rgba(200, 155, 60, 0.18)` and 24px of dark padding around it, so a desktop visitor sees "the app, centered" rather than a stretched-out mobile layout. **This is V6's only desktop accommodation — there is no desktop-native layout in V6.**

**For Claude Code:** if you build a screen and the web version doesn't render byte-identical to the native version at 393×852, that's a bug, not a degradation. Fix it before merging. The §10.1 visual fidelity audit gates this.

**Mock coverage caveat.** Only four screens have explicit web-variant mocks (S-WEB1, S-WEB2, S-WEB3, S4-WEB witness pick). For every other screen, **the native mock IS the web mock.** Render the same HTML mock at 393×852 in Chromium and pixel-diff your web build against it. The web build's job is to match — not to reinterpret.

### S-WEB1 · Web auth-pay 🎨
- **Design:** `flow/html/web-04-auth-pay.html`
- Adds the callout: "On web, you'll name your judge after by sending one text" — because there's no Contacts API in the browser.

### S-WEB2 · Web share 🎨
- **Design:** `flow/html/web-05-share.html`
- After sealing, show the witness URL with a "Copy link" button + "Send via SMS" deep link (using `sms:` URL scheme).

### S-WEB3 · Web sealed 🎨
- **Design:** `flow/html/web-06-sealed.html`
- Same V6 wax-seal treatment as native; CTA changes to "Send link to Nick →" (no native iMessage trigger).

### Web parity gaps (V7 territory):
- **Desktop-native layouts** — `/dashboard`, `/vow/[id]`, `/settings`, `/history` ship as the centered-480px mobile layout in V6. A true desktop layout (multi-column, wider) is V7.
- **Web push notifications** — V7. Web users get SMS for everything.
- **Native share sheet on desktop** — V6 falls back to copy-link + `sms:` deep link.

## 3.10 Cast / Dare flow — full spec

A **Cast** (also called a Dare) is a vow where the maker challenges someone else to do a thing. The maker becomes the witness; the target becomes the vow-maker. Same vow row, different role assignment. `vow_type = 'challenge'`.

This is a no-mock area — design via prose spec, side-by-side merge gate per §2.5A.

### 3.10.1 Why Cast exists

User research finding: people who download a commitment app often want to *impose* commitment on someone else as much as on themselves. ("My brother needs to quit vaping." "I want my partner to actually finish the half-marathon training.") The Cast flow lets the maker fund-and-frame a vow that another person must accept. If they accept, the contract binds the target. If they decline, the vow voids and the maker is refunded (or never charged for $0).

### 3.10.2 Entry point

Cast is reached from two places:

- Quick Vow screen (S22): the "Dare" peer-CTA next to "Make a vow" (already wired in PR #46 per task log)
- Dashboard FAB long-press (V7+ punt; V6 only via Quick Vow)

Tapping "Dare" sets a flow flag `vowType = 'challenge'` and routes to C1.

### 3.10.3 Screens C1–C6

**C1 · Cast input — *who is being dared?***
- Background: same default gradient as S1
- H1 (Fraunces italic): *"Who needs to be held to it?"*
- Sub: "You'll judge it. They'll do it."
- Single contact picker (uses same `<ContactPicker />` primitive as S3 witness picker)
- Primary CTA: "Next →"
- **Behavior:** picking a contact stores `target_phone` and `target_name` in flow state

**C2 · The dare itself — *what are they being dared to do?***
- H1 (Fraunces italic): *"What are you daring [target_name] to do?"*
- Vow input — same `<VowInput />` primitive as S1, placeholder: "They'll …"
- Inline date pill (verdict by) — uses `<DatePickerSheet />`
- Primary CTA: "Refine →"
- **Behavior:** stores `raw_input`. Refines into second-person ("You will…") on next screen.

**C3 · Refine — *the dare, polished***
- Same refine pattern as S2/S4
- Quoted refined text in Fraunces italic, gold
- Copy: *"Here's what they'll see. Sound right?"*
- Primary CTA: "Yes, dare them →"
- Secondary text: "Edit"

**C4 · Stake — *what's on the line?***
- Same `<StakeTile />` grid as S5
- Sub-copy override: "You're proposing the stakes. If they accept, they put up the money — not you."
- **Critical:** Cast vow shows the proposed stake amount, but **no payment is collected from the maker.** Stake is collected from the **target** on acceptance at `/c/[token]`. If target breaks, money goes to destination. If target keeps, refund to target. The maker proposes the dare with no money down — a dare you'd pay for yourself isn't a dare, it's a self-vow you happened to assign someone to witness.
- Primary CTA: "Set the cause →"

**C5 · Cause — *if they break, where does the money go?***
- Reuses `<IfBrokenSheet />` (see §3.6 + §5.5)
- Default destination: charity
- Pre-S6 review style screen — confirms: target name, dare text, verdict date, stake, destination
- Primary CTA: "Send the dare →"

**C6 · Sent — *waiting on [target_name]***
- After tap of "Send the dare", flow:
  1. **No payment collected from the maker.** The maker is proposing, not staking.
  2. Edge function `create-challenge` writes vow row with `vow_type='challenge'`, `challenge_status='pending'`, `user_id` = maker, `target_phone` = target, `stake_amount` = proposed stake, generates `challenge_invite_token`
  3. Twilio SMS sent to target with `/c/[token]` link (template in §4.3)
  4. C6 screen displays
- C6 layout:
  - Wax seal stamping animation (Seal Echo cinematic — lighter than self-vow since no money has changed hands yet)
  - Then state: "Sent to [target_name]. Waiting on them to accept."
  - Sub: "If they decline, nothing happens. If they don't reply in 24 hours, the dare voids."
  - Primary CTA: "Done"
  - Secondary: "Cancel dare" (voids the challenge row; no refund needed since no payment was taken)

### 3.10.4 Target-side flow at /c/[token]

The target receives an SMS:
> "[Maker name] dared you to keep an oath. They've put $[stake] on you doing it. See what it is: [shortlink]"

Tapping the link opens `/c/[token]` (web). The target sees:

**Screen — *Challenge landing***
- H1 (Fraunces italic): *"You've been dared."*
- Below: a `<VowDocCard />` showing:
  - "By [maker_name]"
  - The dare in Fraunces italic, gold
  - Verdict date
  - "$[stake] on the line — you put it up if you accept"
  - Destination: "If you break it, $[stake] goes to [destination]"
- Two CTAs:
  - Primary gold: "I accept the dare"
  - Outlined ghost: "Decline"

**Behavior on accept:**
- Target authenticates (phone OTP) and authorizes payment via Apple Pay / Stripe (manual capture, same flow as self-vow seal — the **target** pays, not the maker)
- Calls edge function `accept-challenge` (service role)
- `challenge_status` → `'accepted'`
- `target_user_id` linked to authenticated target
- `stripe_payment_intent_id` set from target's payment
- Vow `status` → `'active'`
- Maker receives push: "[target_name] accepted your dare."
- Target sees: confirmation screen with vow active state, countdown, "We'll text you on verdict day."

**Behavior on decline:**
- Calls `accept-challenge` with `decline=true`
- `challenge_status` → `'declined'`
- Vow `status` → `'voided'`
- No refund needed — no payment was ever collected from anyone
- Target sees: "Dare declined. Nothing happens."
- Maker receives push: "[target_name] declined your dare."

**Behavior on no-response (24h timeout):**
- Cron job (cron-runner) checks for `challenge_status='pending'` AND `created_at < now() - 24h`
- Voids the vow, marks `challenge_status='declined'`
- No refund needed — no payment was collected
- Audit event: `challenge_auto_voided`

### 3.10.5 Verdict-day for Cast vows

On verdict day:
- Maker (witness) receives push: "Did [target_name] keep their oath? [Open]"
- Maker opens app → vow detail page → submits verdict (kept/broken) using existing `<VerdictSubmit />` UI
- Target receives notification of verdict: "[Maker_name] ruled on your dare: kept" or "broken"
- Outcome screens (M11 / M11B / vow-broken) render normally; from target's POV the destination phrasing is "[stake] went to [destination]". If kept, refund goes to **target** (target paid). If broken, money goes to destination.
- Public outcome page renders with both names

### 3.10.6 Edge cases for Cast

- Maker tries to dare themselves (same phone) → block at C1: "You can't dare yourself. Make a vow instead."
- Target is already in the system as a user → link `target_user_id` on accept; otherwise create account via OTP at accept time
- Maker voids the cast before target accepts → vow voided, no refund needed (no payment was collected)
- Maker voids after target accepts → standard void-vow flow, refund to **target** (target was the one who paid). Target receives push: "[Maker_name] canceled the dare. You've been refunded."
- Target accepts twice (double-tap, two devices) → idempotent via `challenge_status` check; second accept is no-op

### 3.10.7 SMS templates for Cast

Templates added to §4.3 (full template sweep):

| Trigger | Recipient | Template |
|---------|-----------|----------|
| Dare sent | Target | "[Maker_name] dared you to keep an oath. $[stake] is on you doing it. See: [shortlink]" |
| Dare accepted | Maker | "[Target_name] accepted your dare. The clock is ticking." |
| Dare declined | Maker | "[Target_name] declined your dare." |
| Dare auto-voided | Maker | "[Target_name] didn't respond in 24h. Your dare voided." |
| Verdict day reminder | Maker (as witness) | "Time to rule on your dare to [target_name]. Did they keep it?" |
| Verdict outcome | Target | "[Maker_name] ruled: [kept/broken]. $[stake] went to [destination]." |

---

# PART 4 — BACKEND IMPLEMENTATION

## 4.1 Schema migrations needed for V6

```sql
-- Migration: 20260422000001_v6_witness_and_og.sql

-- Witness presence: track when each notification was sent so cron-runner is idempotent
alter table public.vows
  add column witness_notified_at timestamptz,           -- Day 1 push to witness
  add column witness_midpoint_notified_at timestamptz,  -- DEPRECATED: midpoint push dropped in V6 (Apr 22 decision). Column retained for potential V7 use.
  add column maker_24h_nudge_sent_at timestamptz,       -- "Nick still hasn't tapped" to maker
  add column witness_invited_at timestamptz,            -- when seal-vow sent the SMS
  add column witness_token_expires_at timestamptz default (now() + interval '30 days');

-- Indexes for cron-runner queries
create index idx_vows_status_ends_at on public.vows(status, ends_at)
  where status in ('active', 'awaiting_verdict');
create index idx_vows_witness_pending on public.vows(sealed_at)
  where status = 'sealed' and witness_accepted_at is null;
create index idx_vows_target_user_id on public.vows(target_user_id);
create index idx_vows_witness_user_id on public.vows(witness_user_id);

-- Push queue retry tracking
alter table public.push_queue
  add column attempts int default 0,
  add column last_attempt_at timestamptz,
  add column status text default 'queued'
    check (status in ('queued', 'sent', 'failed', 'dead'));
create index idx_push_queue_due on public.push_queue(send_after, status)
  where status = 'queued';

-- RLS gap: explicit witness/target select policies (currently service-role-only via tokens)
create policy "vows_select_as_witness" on public.vows
  for select using (auth.uid() = witness_user_id);
create policy "vows_select_as_target" on public.vows
  for select using (auth.uid() = target_user_id);

-- Audit event types: add the new ones we'll emit
-- (no schema change; just documenting that these will appear in metadata)
-- new event_types: witness_notified, witness_midpoint_notified, maker_24h_nudge,
-- witness_token_expired, vow_outcome_pushed,
-- initiation_oath_shown, cold_open_shown, cold_open_skipped,
-- challenge_auto_voided

-- Initiation Oath gating: track lifetime-first seal per user
alter table public.users
  add column first_seal_completed_at timestamptz,         -- gates the Initiation Oath cinematic
  add column display_name_source text                     -- where we got the name from
    check (display_name_source in ('apple_pay','manual','sms','none')),
  add column name_capture_prompted_at timestamptz;        -- when S6.5 last asked for name

-- Maker name capture: not all sources give us a name (web flow has no Apple Pay billing contact;
-- some Apple Pay sheets fail to surface the contact). When user_id has display_name = null
-- after sealing, S6.5 (name capture) is interstitially shown. See §3.1 patches.

-- (Optional V7) Public outcomes: add is_public flag — punted from V6, see §9.3
-- alter table public.vows add column is_public boolean default false;

-- Currency column — single-currency for V6, but ship the column now so we
-- never have to retrofit a NOT NULL with default backfill on a hot table.
alter table public.vows
  add column currency text not null default 'USD'
    check (currency in ('USD'));  -- expand check constraint when V7 adds others

-- Phone number normalization — store every phone in E.164 format
-- (e.g. "+14155551234"). Retrofit existing rows in this migration via the
-- helper below; from now on every write site MUST normalize before insert.
alter table public.users
  add column phone_e164 text unique;  -- nullable for backfill; will be backfilled then NOT NULL'd in a follow-up

alter table public.vows
  add column witness_phone_e164 text,
  add column target_phone_e164 text;

-- Backfill (idempotent — safe to re-run):
update public.users   set phone_e164         = normalize_e164(phone)         where phone_e164 is null and phone is not null;
update public.vows    set witness_phone_e164 = normalize_e164(witness_phone) where witness_phone_e164 is null and witness_phone is not null;
update public.vows    set target_phone_e164  = normalize_e164(target_phone)  where target_phone_e164  is null and target_phone  is not null;

create index idx_users_phone_e164    on public.users(phone_e164);
create index idx_vows_witness_phone  on public.vows(witness_phone_e164);
create index idx_vows_target_phone   on public.vows(target_phone_e164);

-- Channel preference + push receipt tracking (see §4.4.1)
alter table public.users
  add column last_push_receipt_ok_at timestamptz,
  add column last_push_receipt_failed_at timestamptz,
  add column sms_only_preference boolean default false;

-- Soft-delete column for §6.1.1 account deletion
alter table public.users
  add column deleted_at timestamptz;
create index idx_users_active on public.users(id) where deleted_at is null;

-- SMS retry queue — for transient Twilio failures (see §4.10)
create table public.sms_retry_queue (
  id          uuid primary key default gen_random_uuid(),
  vow_id      uuid references public.vows(id) on delete cascade,
  to_phone    text not null,                              -- E.164
  body        text not null,
  message_type text not null,                             -- matches sms_log.message_type
  attempts    int default 0,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz default now(),
  status      text default 'queued' check (status in ('queued','sent','failed','dead')),
  created_at  timestamptz default now()
);
create index idx_sms_retry_due on public.sms_retry_queue(next_attempt_at, status) where status = 'queued';
```

**Helper function for phone normalization** (Postgres side, since backfill needs it; mirrored client-side in `lib/phone.ts`):

```sql
-- Postgres-side normalization (for backfill + as a fallback)
create or replace function normalize_e164(input text) returns text
language plpgsql immutable as $$
declare
  digits text;
begin
  if input is null then return null; end if;
  -- Strip everything except digits and a leading +
  digits := regexp_replace(input, '[^\d+]', '', 'g');
  -- US default: 10 digits → prefix with +1
  if length(digits) = 10 and digits ~ '^\d{10}$' then
    return '+1' || digits;
  end if;
  -- 11 digits starting with 1 → +1XXXXXXXXXX
  if length(digits) = 11 and digits ~ '^1\d{10}$' then
    return '+' || digits;
  end if;
  -- Already E.164-ish
  if digits ~ '^\+\d{8,15}$' then
    return digits;
  end if;
  -- Unrecognized format — return null and let the application reject it
  return null;
end;
$$;
```

**Schema notes:**
- `first_seal_completed_at` is set by the `seal-vow` edge function on success ONLY if currently null. It is read by the client to decide whether to play the Initiation Oath cinematic before S9.
- `display_name_source` lets us prioritize sources: Apple Pay billing contact > manual entry on S6.5 > SMS reply parsing (V7+). Currently `none` means we have no name yet — the dashboard and certificates render "you" or "the maker" instead.
- `name_capture_prompted_at` rate-limits S6.5 — we ask once per seal at most, never twice in 24h.
- `currency` ships now (always `'USD'`) so V7 internationalization doesn't require a NOT-NULL retrofit on a hot table. **All money math uses `(amount, currency)` tuples from this migration forward.**
- `phone_e164` is the canonical phone column going forward. The legacy `phone`, `witness_phone`, `target_phone` columns stay during V6 transition; a follow-up migration removes them once all read sites are switched. **Every write site MUST call `normalizePhoneE164()` before insert** — there's a TypeScript helper in `/web/src/lib/phone.ts` and `/expo/lib/phone.ts` (identical implementations).
- `deleted_at` is the soft-delete column. **All queries that fetch users MUST add `WHERE deleted_at IS NULL`** — easiest enforcement: a `users_active` view that the codebase uses by convention. RLS policies should also gate on `deleted_at IS NULL`.

## 4.2 Edge function changes

### `seal-vow` (modify)
- After capturing payment, **update `vows.witness_invited_at = now()`**.
- Send the witness SMS (already does).
- **Enqueue push notifications** in `push_queue`:
  - To maker: 24h reminder if `witness_accepted_at` is still null at +24h ("Nick still hasn't tapped — heckle him?").
  - To witness: at the moment they accept, fire the "vow live" push (handled in `accept-witness`).
  - To witness: 24h before `ends_at`, "Heads up: Joey's vow ends tomorrow."
  - To witness: at `ends_at`, "Joey's vow is up. Time to judge."
  - To maker: at `ends_at`, "Your vow ends now. Awaiting Nick's verdict."

### `accept-witness` (modify)
- On accept: send Day 1 "vow is live" push to witness immediately (don't enqueue, send now).
- Set `witness_notified_at = now()`.

### `send-sms` (modify)
- **Update `sealMessage()` in `_shared/sms-templates.ts`** to use the V6 universal template:
  ```ts
  export function sealMessage(stake: number, witnessUrl: string): string {
    return `I just made a vow and put $${stake} on it — hold me to it!  ${witnessUrl}`;
  }
  ```
- The signature changes — callers no longer pass `vowText` or `name`. Audit all call sites and update accordingly.
- Other SMS templates (witness reminder, verdict request, etc.) need a sweep to align with the witness identity decision (use "witness" / "judge" consistently).

### `cron-runner` (modify)
- Add a job: every 5 minutes, scan `push_queue` for due items, send them via Expo push API, update `status` and `attempts`.
- Add a job: hourly, check vows with `status='sealed'` and `witness_accepted_at IS NULL` and `sealed_at < now() - 24 hours` and `maker_24h_nudge_sent_at IS NULL` → send maker the "Nick still hasn't tapped" push, set `maker_24h_nudge_sent_at`.
- Add a job: hourly, check vows with `witness_token_expires_at < now()` and `status='sealed'` → expire the token (set `status='voided'`, refund the stake).
- The auto-resolve job (already exists) extends to also handle: if no verdict by 72h, auto-resolve to KEPT and notify both sides via push.

### NEW: `og-card` edge function (or Next.js route handler)
- **Endpoint:** `GET /w/{token}/og` (and `/c/{token}/og`, `/outcome/{vowId}/og`, `/certificate/{vowId}/og`)
- **Returns:** a 1200×630 PNG (Open Graph standard) generated server-side.
- **Tech:** use Next.js `ImageResponse` from `next/og`. Renders JSX with edge runtime. **No browser screenshot service.**
- **Design (witness invite OG card):**
  - Background: dark `#0F0D0A` with subtle gold radial gradient
  - Centered: 240×240 wax seal "UV" monogram (gold gradient)
  - Below seal: Eyebrow text "JOEY · UNBREAKABLE VOW" (gold, letterspaced)
  - Title: `"I'll go to the gym 4× this week."` (Fraunces italic, ~48px)
  - Meta line: "$50 on it · Be the witness" (white/muted, ~24px)
  - Bottom: small "unbroken.vow" domain text
- **Caching:** set `Cache-Control: public, max-age=31536000, immutable` since vow content doesn't change once sealed (witness invite is locked at seal time).
- **Outcome OG card variants:**
  - Kept (charity): trophy glyph + "Joey kept his vow." + receipt
  - Kept (cause-you-hate): shield glyph + "Crisis averted. Joey saved $50 from Trump."
  - Broken: gavel + "Joey didn't keep his vow. $50 → ALS"
- **Twitter card meta:**
  ```html
  <meta property="og:image" content="https://unbroken.vow/w/{token}/og" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="https://unbroken.vow/w/{token}/og" />
  ```
- **Test on real iMessage** before merge. Apple's link-preview crawler is finicky about response time and HTTPS. Confirm renders correctly on a physical device, not just simulator.

## 4.3 SMS template sweep (full list, post-V6)

```ts
// _shared/sms-templates.ts — V6 versions

export function sealMessage(stake: number, witnessUrl: string) {
  return `I just made a vow and put $${stake} on it — hold me to it!  ${witnessUrl}`;
}

export function witnessReminderMessage(makerName: string, witnessUrl: string) {
  return `Heads up — ${makerName} is waiting on you to confirm. Takes 5 sec: ${witnessUrl}`;
}

export function witnessAcceptConfirmMessage(makerName: string) {
  return `You're now the witness for ${makerName}'s vow. We'll text you 2-3 times this week, then once on verdict day. That's it.`;
}

export function witnessMidpointMessage(makerName: string, daysLeft: number) {
  return `${makerName} is halfway through his vow. ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} until verdict. He's still going.`;
}

export function witness24hMessage(makerName: string) {
  return `Heads up: ${makerName}'s vow ends tomorrow. You'll get the verdict link.`;
}

export function verdictRequestMessage(makerName: string, verdictUrl: string) {
  return `Time to judge: did ${makerName} keep his word? One tap: ${verdictUrl}`;
}

export function outcomeMessage(makerName: string, verdict: 'kept' | 'broken', stake: number, destination: string) {
  if (verdict === 'kept') {
    return `${makerName} kept his vow. Your $${stake} is being refunded.`;
  }
  return `${makerName} broke his vow. $${stake} is going to ${destination}.`;
}

// Maker-side
export function makerSealConfirmMessage(stake: number) {
  return `Your vow is sealed. $${stake} on the line. We'll keep you posted.`;
}

export function makerWitnessAcceptedMessage(witnessName: string) {
  return `${witnessName} just accepted. Your vow is live. Don't break it.`;
}

export function maker24hMessage(stake: number) {
  return `24 hours left on your vow. $${stake} is still on the line.`;
}

export function makerVerdictTimeMessage(witnessName: string) {
  return `Your vow ends now. ${witnessName} is delivering the verdict.`;
}

export function makerOutcomeMessage(verdict: 'kept' | 'broken', stake: number, destination: string) {
  if (verdict === 'kept') {
    return `Your word is gold. $${stake} is being refunded.`;
  }
  return `Verdict: broken. $${stake} is going to ${destination}. Make a new one when you're ready.`;
}

// Cast / Dare — target-side
export function challengeMessage(challengerName: string, stake: number, acceptUrl: string) {
  // Note: dare text lives in the OG card at acceptUrl, NOT in the SMS body —
  // same rule as sealMessage(): one universal template, no interpolation of
  // user-supplied text into the SMS body. Prevents grammar bugs and weird
  // message renderings.
  return `${challengerName} dared you to keep an oath. $${stake} is on you doing it. See: ${acceptUrl}`;
}

// Cast / Dare — maker-side (the darer)
export function castAcceptedMessage(targetName: string) {
  return `${targetName} accepted your dare. The clock is ticking.`;
}

export function castDeclinedMessage(targetName: string) {
  return `${targetName} declined your dare.`;
}

export function castAutoVoidedMessage(targetName: string) {
  return `${targetName} didn't respond in 24h. Your dare voided.`;
}

export function castVerdictDayMessage(targetName: string, verdictUrl: string) {
  return `Time to rule on your dare to ${targetName}. Did they keep it? ${verdictUrl}`;
}

// Cast — verdict outcome to target (the dared person)
export function castOutcomeMessage(makerName: string, verdict: 'kept' | 'broken', stake: number, destination: string) {
  if (verdict === 'kept') {
    return `${makerName} ruled: kept. The dare is closed. Nothing owed.`;
  }
  return `${makerName} ruled: broken. $${stake} went to ${destination}.`;
}

// Refund retry outcomes (maker-side, fired after refund_failed=true was retried)
export function refundSucceededMessage(stake: number) {
  return `Good news — your $${stake} refund went through.`;
}

export function refundFailedFinalMessage(stake: number) {
  return `Heads up: we couldn't process your $${stake} refund after several tries. We're on it — reply HELP if you need us.`;
}

// Self-resolve (witness-side, fired when maker called the verdict themselves)
export function makerSelfResolvedToWitnessMessage(makerName: string, verdict: 'kept' | 'broken') {
  return `${makerName} called their vow ${verdict} themselves. Nothing for you to rule.`;
}
```

**Test every template** with vow text containing: emojis, quotes, ampersands, URLs, profanity, line breaks. Twilio handles most encoding but URL params need percent-encoding.

## 4.4 Push notification setup

### Expo (mobile)
- **Permission flow:** add post-onboarding screen "Get notified when…" with single CTA "Enable notifications." Use `Notifications.requestPermissionsAsync()`. Save the resulting Expo push token to `users.push_token`.
- **Receive:** wire `Notifications.addNotificationReceivedListener` to update local state if the user is in-app.
- **Tap-to-route:** `Notifications.addNotificationResponseReceivedListener` reads `notification.request.content.data` and routes accordingly. Each push includes `{ type: 'witness_verdict_request', vowId, token }` etc.

### Web push
- **V6 scope decision:** **defer web push.** Browser push is high-friction and low-conversion. Stick with SMS for web users on Day 1. Revisit V7.

### Push templates (data shape)

```ts
type PushPayload =
  // Witness-side
  | { type: 'witness_vow_live', vowId, makerName }
  | { type: 'witness_midpoint', vowId, makerName, daysLeft }
  | { type: 'witness_verdict_request', vowId, token, makerName }
  | { type: 'witness_maker_self_resolved', vowId, makerName, verdict }   // §6.1.2 — maker called it themselves; no need for witness to rule

  // Maker-side
  | { type: 'maker_witness_accepted', vowId, witnessName }
  | { type: 'maker_24h_no_acceptance', vowId, witnessName }
  | { type: 'maker_24h_warning', vowId, stake }
  | { type: 'maker_verdict_recorded', vowId, verdict, stake }
  | { type: 'maker_refund_succeeded', vowId, stake }                     // §4.5 — fired after refund_failed=true was retried successfully
  | { type: 'maker_refund_failed_final', vowId, stake }                  // §4.5 — fired after retry exhaustion (~24 attempts / 2 days)

  // Cast / Dare
  | { type: 'maker_cast_accepted', vowId, targetName }                   // §3.10.4 — target accepted the dare
  | { type: 'maker_cast_declined', vowId, targetName }                   // §3.10.4 — target declined; refund issued
  | { type: 'maker_cast_auto_voided', vowId, targetName }                // §3.10.4 — 24h timeout; refund issued
  | { type: 'target_verdict_recorded', vowId, verdict, makerName, destination };  // §3.10.5 — maker (as witness) ruled on the dare
```

Title + body for each is in §4.3-equivalent; render via the `cron-runner` push job.

### 4.4.1 Channel preference rule — NO DUPLICATE NOTIFICATIONS (decided)

For maker-recipient notifications **only**, the rule is: **push OR SMS, never both.** Sending both is the fastest way to lose the user.

The decision logic in `cron-runner` and any send site:

```ts
// _shared/notify.ts (new helper)
export async function notifyMaker(userId: string, push: PushPayload, sms: { to: string, body: string }) {
  const user = await getUser(userId);

  // Channel selection
  const pushIsHealthy =
    user.push_token != null &&
    user.last_push_receipt_ok_at != null &&
    Date.now() - user.last_push_receipt_ok_at.getTime() < 7 * 24 * 60 * 60 * 1000;

  if (pushIsHealthy) {
    const result = await sendPush(user.push_token, push);
    if (result.ok) {
      await updateUser(userId, { last_push_receipt_ok_at: new Date() });
      return; // do not also SMS
    }
    // push failed — fall through to SMS as fallback
  }

  await sendSms(sms.to, sms.body);
}
```

**Schema additions for this rule** (folded into the §4.1 migration):

```sql
alter table public.users
  add column last_push_receipt_ok_at timestamptz,        -- last successful push delivery
  add column last_push_receipt_failed_at timestamptz,    -- last push failure (for backoff)
  add column sms_only_preference boolean default false;  -- user-toggle in Settings (§6.1)
```

If `sms_only_preference = true`, push is skipped entirely for that user (set in Settings).

**Witness-recipient notifications are different:** witnesses by definition may not have the app installed. Witness side defaults to SMS-primary, push as bonus *only* if witness has the app + push token. No dedup logic needed witness-side — they get whichever channel they have, never both.

**Auditing this rule:** every `notifyMaker` call must emit an audit event `notification_sent` with `metadata = { channel: 'push'|'sms', payload_type, vow_id }`. The §4.9 observability dashboard counts daily channel distribution; if push share drops below 60% for users with `push_token != null`, alert (likely a push delivery regression).

## 4.5 Stripe edge cases (CTO checklist)

1. **Refund failures.** Today: `submit-verdict` calls Stripe refund with idempotency key `refund-{vow_id}`. If the call fails (network, Stripe outage), `refund_failed=true` is set on the vow but no retry is scheduled. **Fix:** add a cron job that retries `refund_failed=true` vows every 30 min with exponential backoff, max 24 attempts (~2 days), then alerts Joe via push and email if still failing.
2. **Capture failures at seal time.** If user's card declines at the manual-capture moment in `seal-vow`, the vow doesn't get sealed but the auth was held. Need to: (a) catch the exception, (b) set status back to `draft`, (c) tell user "Card declined — try a different card." Today the failure mode is silent.
3. **$0 vows.** Confirmed in code: `if (stake_amount === 0)` skips Stripe. Audit every Stripe call site (`create-payment-intent`, `seal-vow`, `submit-verdict`, `void-vow`) to ensure all four respect this. Add a unit test for $0 vow lifecycle.
4. **Setup intents.** Migration `20260420000001_setup_intent_columns.sql` added columns. Check whether the saved-card flow (used in Quick Vow for one-tap) is wired end-to-end. If not, scope it for V6 if Quick Vow is in scope, otherwise V7.
5. **Idempotency on the application side.** If two clients race to call `submit-verdict` (e.g., witness submits while maker self-resolves), Stripe's idempotency key prevents double-refund, but DB writes still race. **Fix:** wrap `submit-verdict` body in a Postgres transaction that selects the vow `FOR UPDATE` to lock the row.
6. **Webhook handling.** Today the app uses synchronous Stripe API calls. **Recommend adding a `stripe-webhook` edge function** to handle: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.refund.failed`. Reconcile DB state from webhooks (source of truth = Stripe, not us). This catches edge cases where our synchronous call thinks it succeeded but Stripe later reverses.

## 4.6 Cron schedule (final)

Run `cron-runner` every 5 minutes via Supabase pg_cron:

```sql
select cron.schedule(
  'cron-runner',
  '*/5 * * * *',
  $$ select net.http_post(
    'https://<project>.supabase.co/functions/v1/cron-runner',
    '{}',
    'application/json',
    array[net.http_header('Authorization', 'Bearer <service-role-key>')]
  ) $$
);
```

Inside `cron-runner`, with idempotency-protected actions for each:
1. **Push queue drain** — every run
2. **Maker 24h-no-acceptance push** — hourly check
3. **Witness 24h heads-up** — hourly check, fires when `ends_at - now() < 24h` (replaces dropped midpoint push)
4. **Witness verdict request** (push + SMS) — every 5 min once `ends_at < now()`
5. **Auto-resolve to kept** — hourly check, fires after 72h in `awaiting_verdict`
6. **Refund retry** — every 30 min for `refund_failed=true`
7. **Token expiry** — daily, expires unaccepted witness tokens after 30 days
8. **Challenge expiry** — daily, voids un-accepted challenges after 7 days

Each job: select target rows, process in a transaction, update the "last sent" timestamp before sending to make sure a crash mid-loop doesn't re-fire.

## 4.7 RLS audit & fixes

Existing policies are mostly correct. Fixes needed:

1. **Add witness/target select policies** (per migration above) so authenticated users who are witnesses/targets can read their vows directly without the service role. This unlocks the dashboard's "you're witnessing" section being read by the user themselves.
2. **Audit `audit_events` insert policy.** Today it allows insert if the actor owns the vow. Need to allow witnesses to insert their own `verdict_submitted` events too.
3. **`push_queue` should be service-role-only** (already is). Confirm.
4. **Add `audit_events` retention policy.** Schedule a monthly job to soft-delete events older than 1 year (move to `audit_events_archive` partition or just hard delete after 2 years).

## 4.8 Abuse vectors & rate limits

1. **`/cast` (challenge create) rate limit.** Cap one user to 10 dares/day. Server-side count in `cast` action.
2. **Vow creation rate limit.** Cap one user to 5 vows/day, max 3 active simultaneously.
3. **OTP rate limit.** Supabase has built-in. Confirm enabled.
4. **Witness invite SMS abuse.** A maker could create 100 vows targeting one phone to spam. Cap: same `witness_phone` can be invited at most 3 times/week from the same `user_id`.
5. **Content moderation on vow text.** Run vow text through a basic profanity / hate-speech filter before sealing. For V6 use a simple regex-based filter. Future: OpenAI moderation API. Reject vows containing slurs or threats with copy: "*Try again — we don't ship vows like this.*"

## 4.9 Observability

- **Sentry** for client-side error tracking (web + Expo).
- **Edge function logs** to Supabase log explorer; alert on >5 errors/hour.
- **Stripe dashboard** for payment health.
- **Twilio dashboard** for SMS deliverability; alert on >5% delivery failure rate.
- **Custom dashboard** in Supabase: vows created today, sealed today, verdicts today, refund failures.
- **Notification channel distribution:** track `notification_sent` audit events with `metadata.channel`; alert if push share drops below 60% for users with `push_token != null` (likely a push delivery regression). See §4.4.1.

## 4.10 Twilio A2P 10DLC, SMS retry queue, phone normalization

Three pieces of SMS infrastructure that Claude Code MUST handle in PR #1 + PR #2.

### 4.10.1 A2P 10DLC registration (PARALLEL TRACK — start Day 1)

**This is non-code work that runs in parallel with PR #1 — it's the longest-pole item in the V6 ship list.**

US carriers (T-Mobile, AT&T, Verizon) require Application-to-Person (A2P) 10DLC registration for any business sending SMS at scale through long codes. Without it, deliverability craters within days of launch — messages get filtered, marked spam, or silently dropped.

**Lead time:** typically 2–4 weeks from submission to approval. **Start the day Claude Code opens PR #1.** Do not wait until launch week.

**Steps (Joe owns, not Claude Code):**

1. **Register Brand** in Twilio console → Trust Hub → Customer Profile. Need: business legal name, EIN/Tax ID, business address, support email, website URL.
2. **Register Campaign** under the Brand. Campaign type: **`Mixed`** (we send both transactional notifications + a small marketing component on outcome screens). Sample messages: provide 3–5 from §4.3 templates verbatim.
3. **Attach phone number** to the approved campaign in Twilio.
4. **Wait for The Campaign Registry (TCR) approval.** Status visible in Twilio console.
5. **Verify deliverability** with a test send to all four major US carriers (Verizon/AT&T/T-Mobile/USCC) before flipping production traffic.

**Fallback if registration is delayed:** ship V6 to a small invite list using a **toll-free number** (no A2P required for toll-free, but sender reputation builds slowly — limited throughput). Don't open public signup until A2P approved.

**Compliance copy required by 10DLC:**
- Every SMS must contain a clear sender identity → handled by `${makerName}` interpolation in templates
- One opt-out instruction must be available → add `Reply STOP to unsubscribe` to the FIRST SMS a recipient ever receives. Track `users.has_received_stop_notice` so we don't repeat it on every message.
- HELP keyword must respond with a real help message → set up Twilio auto-responder for `HELP` → `"Unbreakable Vow: questions? hello@unbroken.vow. Reply STOP to unsubscribe."`

### 4.10.2 SMS retry queue (Twilio transient failure handling)

Today: `send-sms` calls Twilio synchronously. If Twilio 5xxs or times out, the SMS is silently lost. Set `vows.sms_failed=true` is the only signal, and there's no retry.

**Fix (PR #2):**

- New table `sms_retry_queue` (created in §4.1 migration above)
- `send-sms` edge function: wrap the Twilio call in try/catch. On 5xx / network error, insert into `sms_retry_queue` with `next_attempt_at = now() + 1 minute`. On 4xx (unrecoverable — bad number, etc.), set `sms_failed=true` on the vow and surface to user.
- New `cron-runner` job: every 5 minutes, scan `sms_retry_queue WHERE status='queued' AND next_attempt_at <= now()`. Process up to 100 per run. On retry success: `status='sent'`. On retry failure: increment `attempts`, set `next_attempt_at = now() + (2 ^ attempts) minutes` (exponential backoff: 1, 2, 4, 8, 16, 32, 64 min). After 8 attempts (~4 hours total), mark `status='dead'` and notify maker via push: *"We couldn't reach [witness_name] by SMS. Want to share the link manually?"*
- Audit: every queue insert/sent emits `sms_retry_queued` / `sms_retry_succeeded` / `sms_retry_dead` events.

### 4.10.3 Phone number normalization helper

Every phone goes through E.164 normalization before any DB write or Twilio send. **No exceptions.**

**TypeScript helper (identical implementation in `/web/src/lib/phone.ts` and `/expo/lib/phone.ts`):**

```ts
// lib/phone.ts — E.164 normalization, US default
// MUST be called at every write site that accepts a phone number.

export function normalizePhoneE164(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/[^\d+]/g, '');

  // 10 digits: assume US, prepend +1
  if (/^\d{10}$/.test(digits)) return `+1${digits}`;

  // 11 digits starting with 1: prepend +
  if (/^1\d{10}$/.test(digits)) return `+${digits}`;

  // Already E.164-ish: validate length 8-15 digits after +
  if (/^\+\d{8,15}$/.test(digits)) return digits;

  return null;  // unrecognized — caller must reject
}

export function isValidPhoneE164(input: string | null | undefined): boolean {
  return normalizePhoneE164(input) !== null;
}

export function displayPhone(e164: string | null | undefined): string {
  // Pretty-print for UI display: +14155551234 → "(415) 555-1234"
  if (!e164) return '';
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}
```

**Write sites that must call `normalizePhoneE164()`:**
- S6 OTP entry (maker phone) → write to `users.phone_e164`
- S3 witness picker → write to `vows.witness_phone_e164`
- C1 cast target picker → write to `vows.target_phone_e164`
- Witness account claim flow (when witness signs up via SMS link) → write to `users.phone_e164`
- Settings phone change → re-OTP flow

If `normalizePhoneE164` returns `null`, the form must show: *"That doesn't look like a valid phone number. Try again."* Do NOT silently coerce or accept the unnormalized value.

**De-duplication on write:** before inserting a new user with a given `phone_e164`, check for an existing soft-deleted user with the same number — if one exists, prompt user to re-claim the account (V7) or block with: *"That number was used by an account that was deleted. Contact support to reclaim."*

### 4.10.4 SMS opt-in / consent

**For the witness flow:** the maker sends the witness link; the witness has not opted in to receive SMS. We are not the sender of record for that initial message in the user's eyes (the maker is). 10DLC compliant because:
- The maker explicitly initiates the send by tapping "Send to Nick"
- The message body is from the maker's perspective ("I just made a vow…")
- Once the witness accepts via the link, they've opted in to receive subsequent transactional messages from us about that vow

**For the cast/dare target:** same logic. Maker initiates; target opt-in is the accept tap on `/c/[token]`.

**For self-vow re-engagement messages to the maker:** the maker opted in at the OTP step (S6) — display the opt-in copy *at the OTP screen*: "*By verifying, you agree to receive SMS about your vows. Reply STOP anytime.*" (Inter Tight 11px, muted, below the OTP cells.)

---

# PART 5 — OUTCOME FLOWS (UNDESIGNED, NOW SPECCED)

Joe explicitly called this out. None of these screens have HTML mocks yet. Below is the full spec for the implementation. **After reading: build the HTML mocks following the spec; render; confirm with Joe before coding.**

The user uploaded reference screenshots of two outcome variants: **M11 · VOW KEPT (CHARITY)** with a trophy and "You actually did it." headline, and **M11B · VOW KEPT (CAUSE YOU HATE)** with a shield and "Crisis averted. You saved $25 from Trump." Both are needed, plus Vow Broken variants.

> **🎯 Bier-audit decision (Apr 22, 2026) — "One screen, one emotion, one CTA."**
> Joe requested a Nikita-Bier-style CTA audit on all four outcome variants. Decision: every outcome screen gets **exactly one gold primary CTA** + **one text-link secondary** (max). Every extra button we had in V6 drafts dilutes the emotional beat — killing them makes the screen screenshot-worthy and funnels users into one next action. Share/brag behavior is owned by M11 and M11B (the kept variants); the broken variants push forward motion only. "View your record" is killed everywhere — users can reach it via the dashboard + hamburger menu.

## 5.1 Vow Kept — Charity destination (M11) 🚧

- **Route:** `/vow-kept` (web) / `vow-kept.tsx` (Expo) — also rendered inline in `/vow/[id]` when status=kept
- **Hero element:** trophy glyph (gold gradient, custom SVG; no emoji) — 80×80px, soft halo
- **H1 (Fraunces, 32px, italic):** *"You actually did it."*
- **Sub:** *"Sarah confirmed. Your word is gold."*
- **Receipt card (RitualCard):**
  - Vow: "Go to the gym 3x"
  - Money: "$25 returned ✓" (green)
  - Streak: "🔥 3 vows kept" (replace emoji with gold flame SVG)
- **Primary CTA (gold gradient, 62px):** **"Share your win →"** — opens native share sheet with pre-filled copy "I just kept a vow on @unbreakablevow. My word is gold."
- **Secondary (single text link, centered):** "Dare a friend 🔥" (with gold flame glyph) — opens a share sheet seeded with a challenge deep-link
- **KILLED (V6-draft cruft):** "Make another vow", "View your record", footer "Donate to ALS anyway" — all dilute the celebration. Make-another lives on the dashboard; record lives in History (hamburger menu); the "donate anyway" footer was a cute-but-off note that competed with the brag.
- **Animations:** trophy enters with `sealPopIn`. Receipt rows fade up sequentially. Confetti effect (subtle, gold particles) on initial render — respects reduced-motion.
- **Haptics:** `Haptics.notificationAsync(Success)` on mount.
- **Behavior:** if user returns to this screen later, no animations re-fire; static layout.
- **Primitives used:** `<RitualScreen />`, `<Stamp text="KEPT" tone="gold" />` (or trophy SVG as a screen-local glyph if Stamp doesn't fit the visual), `<FrauncesH1 italic />`, `<FrauncesSub />`, `<RitualCard />` (receipt card), `<GoldCTA variant="filled-gold" label="Share your win →" />`. Trophy SVG, gold flame SVG, and confetti effect are screen-local.
- **Canonical mock:** `flow/html/m11-vow-kept-charity.html`

## 5.2 Vow Kept — Cause-you-hate destination (M11B) 🚧

- **Route:** same `/vow-kept`, branched on `vow.consequence === 'anti'`
- **Hero element:** shield glyph (gold + red gradient — heraldic style; custom SVG)
- **H1:** *"Crisis averted."*
- **Subhead (gold, larger than usual):** *"You saved $25 from Trump."*
- **Sub (italic, smaller):** *"Sarah confirmed. Not a single dollar left your wallet."*
- **Receipt card:**
  - Vow: "Go to the gym 3x"
  - Money: "$25 returned ✓"
  - Saved from: "Trump 🚫" (replace with heraldic ban glyph)
  - Streak: "🔥 3 vows kept"
- **Primary CTA (gold gradient; two-line wrap; `min-height: 64px`, `font-size: 16px`, `line-height: 1.18`, `padding: 14px 18px`):** **"Tell everyone you saved $25 from Trump →"** — opens native share sheet with a pre-filled tweet/iMessage. **The brag IS the moment** per Joe's note ("most screenshotable screen in the app"): a "Make another vow" primary here would squander the emotional peak. The destination name in the CTA is interpolated from `vow.destination` (e.g., "saved $50 from the NRA").
- **Secondary (single text link, centered):** "Make another vow →"
- **KILLED (V6-draft cruft):** outlined gold brag CTA (the primary now IS the brag — one loud call, not two), "Dare a friend", "View your record". The screen is the screenshot; everything else is noise.
- **Note from Joe:** *"Most screenshotable screen in the app."* — design accordingly. The shield treatment, color combination, and the subhead must read as triumphant and politically-charged. The user should want to screenshot this and post it.
- **Implementation note:** the share template is opinionated. If the cause-you-hate is "Trump" → "I just kept a vow and saved $25 from going to Trump. I'm on a roll." Generate dynamically per cause.
- **Primitives used:** `<RitualScreen />`, `<FrauncesH1 italic />`, `<FrauncesSub />`, `<RitualCard />` (receipt), `<GoldCTA variant="filled-gold" />` (with the two-line sizing overrides above). Shield SVG (gold + red heraldic), heraldic ban glyph are screen-local — these are bespoke art, not reusable primitives.
- **Canonical mock:** `flow/html/m11b-vow-kept-cause-you-hate.html`

## 5.3 Vow Broken — Charity destination 🚧

- **Hero element:** broken seal glyph (the wax seal cracked in half, muted gold) — 80×80px
- **H1:** *"You broke it."*
- **Sub:** *"Sarah confirmed. The $25 is on its way to ALS Association."*
- **Receipt card:**
  - Vow: "Go to the gym 3x"
  - Money: "$25 → ALS Association"
  - Streak: "Streak ended at 3"
- **Primary CTA (gold gradient, the only CTA on the screen):** **"Make a new vow →"**
- **Secondary:** *none.* Forward motion only.
- **KILLED (V6-draft cruft):** "View your record →" secondary — sending users to a record of a broken vow in the moment of failure is the wrong move. If they want it later, it's in the dashboard + History.
- **Tone:** honest, not punishing. The sub line and the receipt are the only acknowledgments. The product respects the user's decision and offers immediate forward motion.
- **Primitives used:** `<RitualScreen gradient="broken" />`, `<Stamp text="BROKEN" tone="muted-red" />` (or broken-seal SVG as bespoke), `<FrauncesH1 italic />`, `<FrauncesSub />`, `<RitualCard />`, `<GoldCTA variant="filled-gold" label="Make a new vow →" />`. Broken-seal SVG is bespoke art.
- **Canonical mock:** `flow/html/vow-broken-charity.html`

## 5.4 Vow Broken — Cause-you-hate destination 🚧

- **Hero element:** broken seal — but with a small red shield icon overlaid (you broke the vow, AND the money you hated to give went to your hated cause — double sting)
- **H1:** *"Brutal. You broke it."*
- **Sub (red-tinted):** *"$25 just went to **Trump**."* (cause name in stronger red)
- **Receipt card** (with the destination prominently in red)
- **Primary CTA (gold gradient, the only CTA on the screen):** **"Make a new vow — let's make this back →"**
- **Secondary:** *none.* Forward motion only.
- **KILLED (V6-draft cruft):** "View your record →" secondary — same reasoning as §5.3. One loud call: redemption.
- **Tone:** more charged than the charity-broken variant. The user picked a hated cause to *increase* the sting; deliver on it. But don't be cruel — this is still your customer.
- **Primitives used:** `<RitualScreen gradient="broken" />`, `<FrauncesH1 italic />`, `<FrauncesSub />` (red-tinted variant — flag for primitives review), `<RitualCard />`, `<GoldCTA variant="filled-gold" />`. Broken-seal-with-shield-overlay SVG is bespoke art.
- **Canonical mock:** `flow/html/vow-broken-cause-you-hate.html`

## 5.5 Destination picker (IfBrokenSheet) 🚧

Already specced in §3.6. Re-reference here for outcome flow context: this is where users *choose* the destination. The outcome screens are where they *experience* the consequence.

## 5.6 Outcome public/share page 🚧 — THE NEUTRAL PUBLIC RECORD (BROKEN VOWS)

**Routing decision (Apr 22, 2026):** Certificate is for KEPT vows (celebratory, shareable). Outcome is for BROKEN vows (neutral public record). S19-OUTCOME-RESOLVED's "See the full record →" CTA links to `/certificate/[vowId]` if `verdict='kept'`, else `/outcome/[vowId]` if `verdict='broken'`.

- **Route:** `/outcome/[vowId]` (already exists, needs design pass)
- **Public, anonymous-friendly URL.** Used when sharing broken-vow outcomes.
- **OG card** (server-rendered):
  - Kept (charity): trophy + "Joey kept his vow."
  - Kept (anti): shield + "Joey saved $50 from Trump."
  - Broken: cracked seal + "Joey didn't keep his vow."
- **Page content:** H1, the vow text, the verdict, the destination, "Witnessed by Sarah." Maker name visible only if vow was made public (privacy setting; default private to non-signed-in viewers — show "Anonymous Vow Maker" in that case).
- **Bottom CTA for unauthenticated visitors:** "Make your own vow →"

## 5.7 Certificate page 🚧 — THE CELEBRATORY SHAREABLE (KEPT VOWS)

**This is the primary share destination for kept vows.** When a witness or maker shares a kept outcome, the link goes here, not to `/outcome/[vowId]`. The certificate is the brag artifact — screenshot-worthy, designed for iMessage thumbnails and Instagram Stories.

- **Route:** `/certificate/[vowId]`
- **Visual:** single clean gold frame (museum-placard style — NOT the 1987-diploma ornate frame with corner brackets + double borders). Paper background (`#14110D`) sits on the standard dark gradient.
- **Use case:** maker shares this as a brag/celebration; outcome page is the more functional view.

### 5.7.1 Typography revision (Apr 22, 2026)

> **🎯 Bier-audit decision.** Joe's critique: *"It's a lot of text to read that feels hard to read because of the font."* Fix: stop rendering the whole certificate in Fraunces italic. Give the eye a single place to land at thumbnail zoom. Only the **vow action** switches typefaces — everything else stays Fraunces italic for brand voice.

**Vertical content order (top → bottom, inside the frame):**

1. **Eyebrow** — "CERTIFICATE OF VOW" · Inter Tight, 9.5px, weight 500, letter-spacing 0.42em, `--gold`
2. **Wax seal** — 76px `<WaxSeal />` with monogram "UV" (no halo, no check — this is the sealed artifact, not the live verdict screen)
3. **Cert-header voice** — "Be it known that" · Fraunces italic, 13px, weight 400, `--text-dim`
4. **Maker name** — e.g. "Joey Schwartz" · Fraunces italic, 22px, weight 500, `--gold-bright`, letter-spacing -0.01em
5. **Vow prefix** — "pledged his word, on stake, to" · Fraunces italic, 13px, weight 400, `--text-dim`
6. **THE VOW ACTION — the screenshot moment** · **Inter Tight sans, 26px, weight 600, letter-spacing -0.018em, line-height 1.16**, `--text`. One word or short phrase wrapped in `<em>` renders in `--gold-bright` weight 700 (still non-italic — `em` is restyled). Example: *"**walk 10,000 steps** / every day for one week."*
7. **Decorative divider** — thin gold gradient line · gold diamond `◆` · thin gold gradient line
8. **KEPT stamp** — filled gold gradient (180deg #E8B656 → #B88930), Inter Tight 700, **28px**, letter-spacing 0.18em, color `#1A1205`, border `1.5px solid #5C4514`, rotated `-2.5deg`. Multi-shadow: `0 1px 0 rgba(255,228,150,0.45) inset, 0 0 28px rgba(232,182,86,0.32), 0 6px 16px rgba(140,90,20,0.30)`. Unmissable at thumbnail zoom.
9. **Attribution grid** (2×2) — WITNESSED BY / STAKE on row 1; SEALED / VERDICT on row 2. Labels Inter Tight 8.5px all-caps letter-spacing 0.32em `--text-dim`; values Fraunces 13px weight 500 (dates italic)
10. **Wordmark** — "— Unbreakable Vow —" · Fraunces italic, 11px, `--text-dim`

**Why sans for the action line specifically:** when the image is reshared (thumbnail in iMessage, tweet preview, Instagram Story), Fraunces italic at 26px smears. Inter Tight 600 holds. The certificate still *feels* literary because 90% of the text stays italic serif; the one sans moment is the thing the viewer must be able to read from across the room. This is also why the KEPT stamp went from outlined gold-text to filled-gold-gradient: outline stamps disappear at thumbnail zoom.

**Canonical mock:** `flow/html/certificate.html`

**Share / save affordances** (below the paper):
- "Save image" (secondary, surface fill) — renders the certificate to PNG via `html-to-image` / equivalent and triggers download
- "Share →" (primary, gold gradient) — native share sheet with the saved PNG + public URL

**Primitives used:** `<WaxSeal size="md" showHalo={false} showCheck={false} />`, `<Stamp text="KEPT" tone="filled-gold" />` (new variant — flag for primitives review), `<FrauncesH1 italic />` for the maker name, plus screen-local typography. The 2×2 attribution grid is screen-local — it doesn't need to be a primitive.

---

# PART 6 — SETTINGS, ACCOUNT, EDGE STATES (UNDESIGNED, NOW SPECCED)

## 6.1 Settings 🚧

- **Route:** `/settings` (web) / `settings.tsx` (Expo)
- **Sections (each a `RitualCard`):**

  **Account**
  - Display name (editable inline)
  - Phone number (read-only with "Change" link → re-OTP flow)
  - Email (optional; collected for receipts)

  **Notifications**
  - Master toggle: "Push notifications" (links to system settings if denied)
  - SMS preferences: "Verdict day reminders" / "Witness updates" (toggles)

  **Payment**
  - Default card (last 4)
  - "Add another card" / "Manage cards" (Stripe Customer Portal link)

  **Defaults**
  - Default stake: $10 / $25 / $50 / $100 (radio)
  - Default destination: ALS / Custom

  **Legal**
  - Terms of Service (link to /terms)
  - Privacy Policy (link to /privacy)
  - Data export (request via email, V7+)

  **Danger zone**
  - "Sign out" (text link, gray)
  - "Delete account" (red text link, opens confirmation modal)

- **Behavior:** all changes save inline. No "Save" button — autosave on blur with a tiny "Saved ✓" indicator (gold, fades out).

### 6.1.1 Account deletion flow (full spec)

- Tapping "Delete account" opens a modal:
  - H1 (Fraunces italic): *"Are you sure?"*
  - Sub: "Your record will be lost. Vows that are still active will void and refund automatically."
  - Type-to-confirm input: user must type `DELETE` (uppercase) into a text field
  - Primary destructive (red): "Delete my account" — disabled until input matches
  - Secondary: "Cancel"
- On confirm:
  1. Void all active vows (calls `void-vow` for each, refunds where applicable)
  2. Soft-delete `users` row (set `deleted_at = now()`); preserve `audit_events` with `actor_id` intact for legal/audit purposes
  3. Sign out the user
  4. Stripe customer is NOT deleted (preserves payment history); flag the customer with metadata `deleted_account: true`
  5. Show terminal screen: "*Your account is gone.*" / "Make a new one anytime." / [Make a vow] (CTA loops back to `/`)
- **Service-role edge function `delete-account` handles steps 1-4 atomically.** Failure at any step = full rollback; user sees error and account is intact.
- **Re-signup:** if a deleted user signs up again with the same phone, they get a fresh user row; old row's `display_name` etc. is NOT carried over.

### 6.1.2 Self-resolve flow (maker calling their own verdict)

The product allows the maker to self-resolve their vow as KEPT or BROKEN at any time during the active period. This exists for users whose witness is unreliable, or who simply want to close out a vow early.

- **Entry:** vow detail screen (S10) shows a "Resolve early" link (text-button, white at 60%, bottom of card area)
- **Behavior:** opens a sheet:
  - H1 (Fraunces italic): *"Calling it yourself?"*
  - Sub: "[Witness_name] hasn't ruled yet. You can record the verdict now."
  - Two large buttons stacked:
    - "I kept it" (gold gradient)
    - "I broke it" (red outlined)
  - Tertiary: "Cancel"
- **On "I kept it":** treat as a verdict `kept` submitted by maker. Audit event: `verdict_self_resolved` with `actor_type='maker'`. Refund as normal. Witness gets push: "[Maker_name] called it kept. No need for you to rule."
- **On "I broke it":** confirmation guard sheet (similar to S18): "*This is final. $[stake] goes to [destination].*" — red destructive primary, text-button cancel
- **On "I broke it" confirmed:** verdict `broken`. Money goes to destination. Witness gets push: "[Maker_name] called it broken themselves. Nothing for you to rule."
- **Edge case:** if witness has ALREADY submitted a verdict and the maker tries to self-resolve, the maker sees: "[Witness_name] already ruled this [kept/broken]. Open the outcome →"
- **Web file:** new sheet inside `/web/src/app/vow/[id]/page.tsx`
- **Expo file:** same idea inside `/expo/app/vow-detail.tsx`

## 6.2 History 🚧

- **Route:** `/history`
- **Layout:**
  - Filters (segmented control): "All" / "Kept" / "Broken" / "Voided"
  - Stats summary at top: "12 vows · 9 kept · 2 broken · 1 voided · 75% kept rate"
  - List of vow rows (each tappable → `/vow/[id]`):
    - Vow text (truncated to 1 line)
    - Witness name + verdict stamp (KEPT/BROKEN/VOIDED in mini badges)
    - Stake + destination
    - Date (relative: "3 weeks ago")
- **Empty state:** "*No verdicts yet. Your record will live here.*"

## 6.3 Auth callback 🚧

- **Route:** `/auth/callback`
- **Visual:** loading spinner (gold, simple), centered. "Just a sec…" copy.
- **Behavior:** processes Supabase auth token, routes to original destination (from `auth_return_path` cookie) or `/dashboard`.

## 6.4 Error states 🚧

For each, design a small error card overlay (modal or inline) with:
- Icon (red glyph)
- One-line H2 (Fraunces, italic)
- One-line explanation
- Primary action ("Try again" / "Use another card" / etc.)
- Secondary ("Contact support →" → opens email link)

Specific cases to handle:

- **Card declined at seal:** "*That card didn't go through.*" → "Try another card"
- **OTP wrong:** "*That code didn't match.*" → input clears, focus first cell
- **Witness declined:** maker sees in `/vow/[id]` — H1 "*Nick passed.*" → "Nudge someone new" CTA (resends witness invite flow; witness rotation is V7 — for V6 this voids the current vow and starts a new one)
- **Vow voided (by user):** outcome screen with VOIDED stamp (specced in S10.7)
- **SMS failed to deliver:** maker gets toast "*We couldn't reach Nick at that number.*" with "Resend" / "Edit number" actions
- **Refund failed:** maker sees on outcome screen "*Heads up — your refund hit a snag. We're retrying. Should land in 24h.*"
- **Network offline:** banner at top of app "You're offline. Some things won't work."
- **Auth expired:** redirect to home with toast "*Sign in again to continue.*"
- **Lost-phone recovery:** if user changed their phone number and can't OTP, they see at the OTP screen: "Don't have access to this number anymore? [Recover account →]" — opens a form requesting old phone + email + a description; routes to support email (no automated recovery in V6, manual triage)
- **Notification re-prompt:** if user denied push at onboarding, dashboard shows a soft banner once per 7 days (see §2.7.17). Tapping opens the iOS Settings deep link `app-settings:`. Banner is dismissible; if dismissed 3 times, never shown again.
- **Stripe payment-element load failure:** on web card-entry fallback (S7-WEB), if Stripe Elements iframe fails to load (network, blocked by extension), show: "*Card form didn't load. Try refreshing or use Apple Pay.*" with refresh CTA.
- **Twilio outage:** if seal-vow can't send the witness SMS due to Twilio failure, the vow still seals (don't block payment over SMS). Set `vows.sms_failed=true`. Show maker on S8: "*Sealed. SMS to [witness_name] failed — we'll retry. You can also share the link manually.*" — adds a "Copy link" affordance.

## 6.5 Modals & sheets (catalogue) 🚧

Beyond IfBrokenSheet (specced in §3.6) and the verdict-broken guard (designed):

- **Share sheet** — native iOS or `navigator.share()`; we don't design the chrome but provide the share content (title, text, URL, image)
- **Permissions request** (contacts, push) — system modals; we provide the *pre-prompt* card explaining why we need permission before triggering the system sheet. Standard pattern: "We need contacts to make picking a witness one tap. We never store them."
- **Sign-out confirmation** — small modal, "Sign out of Unbreakable Vow?" / "Cancel" / "Sign out"
- **Delete-account confirmation** — typed confirmation ("type DELETE to confirm"), warning copy
- **Void-vow confirmation** — "Void this vow? Your $50 will be refunded. This is final." / "Cancel" / "Void it"

## 6.6 Cast / Challenge flows 🚧

`/cast` and `/c/[token]` exist in code but lack designs.

### /cast (the dare creation page)
- **Layout:** mostly identical to `/create` but framed as "Dare a friend"
- **Inputs:** target name, target phone (required for SMS), dare text, deadline, stake
- **Maker-side copy:** "*What are they too chicken to do?*" placeholder for dare text
- **CTA:** "Send the dare →" (gold)

### /c/[token] (the challenge accept page)
- **OG card:** seal + "JOEY · UNBREAKABLE DARE" eyebrow + dare text + "$50 to back out · You decide today"
- **Page:**
  - H1: *"Joey thinks you can't do this."*
  - Vow card (the dare)
  - Body: *"$50 says he's wrong. If you accept, you're locked in. Witnesses will judge you Sunday."*
  - Primary CTA (red gradient): "Bet. I'm in →"
  - Secondary (text link): "Pass — not this time"
- **Flow on accept:** target signs auth, pays the stake (their own card), vow becomes active. **Important:** the dared person is the one who stakes, not the darer. The darer just provoked it.

---

# PART 7 — NATIVE iOS, MOBILE-WEB, AND DESKTOP-WEB: THE THREE SURFACES

This is the canonical reference for "what does each surface do, and why." Read it once, then use it as a lookup. **Visual parity rules in §3.9.0; this section covers FUNCTIONAL differences only.**

The three surfaces:
- **Native iOS** — the Expo app (`/expo`). Installed on the user's phone. Has full system access (Contacts, Push, Apple Pay sheet, Haptics, native Share sheet, iMessage handoff).
- **Mobile-web** — `/web` rendered on iPhone/Android Safari/Chrome. Same V6 design as native, capped at the phone viewport. No system APIs, no install required, just `unbroken.vow`.
- **Desktop-web** — `/web` rendered on a laptop browser. Same code as mobile-web; on viewports > 480px, the layout is centered in a 480px column with a faint gold hairline border. **Not a separate codebase — same routes, same components.**

## 7.1 Functional difference matrix (every behavior that differs across surfaces)

| Capability | Native iOS | Mobile-web | Desktop-web | Why it differs |
|---|---|---|---|---|
| **Pick witness from contacts** | ✅ Native Contacts API → `<ContactPicker />` opens system sheet | ⚠️ No Contacts API in browser → S4-WEB shows manual phone entry + `tel:` link to dialer | ⚠️ Same as mobile-web | Browsers don't expose Contacts. The S4-WEB callout makes this intentional, not a bug. |
| **Pay** | ✅ Native Apple Pay sheet via `expo-payments-stripe` | ✅ Stripe Payment Request API (renders as Apple Pay/Google Pay sheet on supporting browsers) | ⚠️ Stripe Payment Request rarely available on desktop → falls back to **Stripe Elements card form** (S7-WEB) | Apple Pay on the web is supported in Safari only; non-Safari desktop = no Pay sheet, Elements is the fallback. |
| **Send witness invite** | ✅ Opens iMessage with prefilled body via `MessageComposer` (or `mailto:` fallback) | ✅ Opens system SMS app via `sms:?&body=` deep link | ⚠️ No SMS app available → "Copy link" is the primary action; "Send via SMS" deep-link still shown but degrades gracefully | Desktop has no SMS app. The web-05-share design accommodates this with copy-link primary. |
| **Push notifications** | ✅ Expo Push (APNs) — full delivery | ❌ No web push in V6 (deferred to V7) | ❌ Same — no web push in V6 | Browser push is high-friction and low-conversion. SMS replaces push for web users in V6. |
| **SMS notifications** | ✅ Twilio (only fires when push is unavailable per `notifyMaker()` rule §4.4.1) | ✅ Twilio (always — push not available) | ✅ Twilio (always — push not available) | Web users get SMS for everything that native users get push for. The `notifyMaker()` helper handles this transparently. |
| **Haptics** | ✅ `expo-haptics` per §2.5 map | ⚠️ Silent — no Vibration API used (intentional; haptics on mobile-web are jarring without context) | ⚠️ Silent | Native haptics are part of the brand voice; web's vibration API doesn't replicate the feel reliably, so we're silent rather than fake. |
| **Native share sheet** | ✅ `Share.share()` from `react-native` | ✅ `navigator.share()` if available (most mobile browsers) | ⚠️ `navigator.share()` rarely available → fallback to "Copy link" + dropdown of Twitter/Email/SMS deep links | Standard web pattern. |
| **App-to-app deep links from SMS** | ✅ Universal links open the Expo app directly if installed | ✅ Opens Safari/Chrome → web app loads | ✅ Opens browser → web app loads | iOS prioritizes the installed app via universal link configuration. |
| **Cold-open cinematic (S0)** | ✅ Two-screen full-fidelity sequence, 14s, AsyncStorage flag | ⚠️ Static composite (no animation), localStorage flag still set | ⚠️ Static composite (no animation), localStorage flag still set | Full motion is Expo-only per §3.0.1. Web users are colder traffic; a 14s animation kills conversion. Mobile-web and desktop-web render the final two-screen state stacked vertically as a static composite. |
| **Initiation Oath cinematic (post-first-seal)** | ✅ Hand-on-screen interactive, full-fidelity | ✅ Tap-on-seal interactive (no hand-on-screen on mobile-web — touch model is too unreliable) | ⚠️ Click-on-seal interactive | Only intentional cinematic divergence. See §3.0.2 for the spec. |
| **Seal Echo + Clock Starts cinematics** | ✅ Full-fidelity, woven into seal animation | ✅ Full-fidelity (CSS keyframes match Animated specs) | ✅ Full-fidelity | These ship identically across surfaces. |
| **Witness landing page** (`/w/[token]`) | 🔗 Opens in webview (the `/w/[token]` web page is canonical; Expo doesn't have a native screen for this) | ✅ Native page, server-rendered | ✅ Native page, server-rendered | The witness link goes to whoever has the URL — they may not have the app, so the page must work standalone. |
| **Verdict page** (`/w/[token]/verdict`) | 🔗 Opens in webview from witness's notification | ✅ Native page | ✅ Native page | Same reasoning. |
| **Challenge accept page** (`/c/[token]`) | 🔗 Opens in webview if Expo user; otherwise web only | ✅ Native page | ✅ Native page | Same. |
| **Account creation** (auth flow) | ✅ S5 + S6 OTP screens, native | ✅ S5 + S6 OTP, identical visual design, web | ✅ Same as mobile-web; centered 480px column | Same screens, same flow. |
| **OTP autofill** | ✅ iOS auto-fills SMS code from Messages | ✅ iOS Safari auto-fills (via `autocomplete="one-time-code"`) | ⚠️ Desktop Safari sometimes auto-fills via Handoff; Chrome doesn't | Set the autocomplete attribute everywhere; let the browser do what it can. |
| **Pull-to-refresh on dashboard** | ✅ Native pull gesture | ⚠️ Disabled (mobile browsers' default pull-to-refresh reloads the page, which clears state) | ⚠️ N/A (no pull gesture on desktop) | Polling every 30s replaces it on web. |
| **Visibility-change detection** (S8 → S9 transition) | ✅ AppState change listener | ✅ `visibilitychange` + `pageshow` events (combined for iOS Safari reliability) | ✅ `visibilitychange` (more reliable on desktop) | The S9 "you returned" state needs to fire when the user comes back from Messages or another tab. |
| **Settings → "Manage cards"** | ✅ Opens Stripe Customer Portal in `expo-web-browser` (in-app browser) | ✅ Opens Stripe Customer Portal in new tab | ✅ Opens Stripe Customer Portal in new tab | Stripe-hosted page, no parity issue. |
| **Settings → "Push notifications"** | ✅ Toggle reflects native permission state; tap → `Linking.openSettings()` if denied | ❌ Hidden on web (no web push in V6) | ❌ Hidden on web | Conditional render based on platform. |
| **Settings → "SMS preferences"** | ✅ Visible, controls `users.sms_only_preference` | ✅ Visible (web users can also opt out of SMS — they'll just not get notified at all) | ✅ Visible | Available on every surface. |
| **Account deletion (§6.1.1)** | ✅ Type-DELETE confirmation modal, calls `delete-account` edge fn | ✅ Same | ✅ Same | Same UX everywhere. |
| **Cinematic skip target ("skip" link in cold-open)** | ✅ Tappable text, bottom-right, fades in after 4s | ✅ Same | ✅ Same | Same UX everywhere. |
| **Stake-change mid-flow** | ✅ `<ChangeStakeSheet />` bottom sheet | ✅ Same component, CSS-driven | ✅ Same component, CSS-driven | Identical sheet primitives. |
| **Date-picker** | ✅ Native `<DateTimePicker />` inside `<DatePickerSheet />` | ✅ HTML `<input type="date">` styled inside the sheet (matches §2.7.13 spec) | ✅ Same | The sheet primitive wraps the platform-appropriate picker. Visually identical chrome. |
| **In-app browser** (for Stripe portal, Twitter share, etc.) | ✅ `expo-web-browser` SFAuthenticationSession | ⚠️ Opens new tab (no in-app browser on mobile-web) | ⚠️ Opens new tab | Standard browser behavior. |
| **Share to Twitter** | ✅ Native share sheet → Twitter app if installed, else web | ✅ Native share sheet → Twitter app if installed | ⚠️ Direct link to `twitter.com/intent/tweet?text=...` | Desktop has no native share sheet; intent URL is the standard fallback. |
| **Notification permission soft-prompt** | ✅ Pre-prompt card before `requestPermissionsAsync()` | ❌ N/A (no web push) | ❌ N/A | Native-only. |
| **App icon badge count** | ✅ Reflects pending verdict requests for the user as witness | ❌ N/A (no app icon on web) | ❌ N/A | Native-only. |

## 7.2 File-mapping per surface

| Surface | Web file | Expo file | Notes |
|---|---|---|---|
| Home (S1) | `/web/src/app/page.tsx` | `/expo/app/index.tsx` | Visually identical per §3.9.0; native pulls saved card if returning user |
| Refine (S2) | `/web/src/app/refine/page.tsx` | `/expo/app/refine.tsx` | Identical |
| Stake (S3) | `/web/src/app/stake/page.tsx` | `/expo/app/stake.tsx` | Identical |
| Witness pick (S4) | `/web/src/app/witness/page.tsx` (link-share) | `/expo/app/witness-pick.tsx` (Contacts API) | **Intentional functional divergence — see §7.1 row 1** |
| Auth + OTP (S5–S6) | combined into `/web/src/app/seal/page.tsx` | `/expo/app/auth.tsx` | Identical visual; same OTP autocomplete attr |
| Name capture (S6.5) | `/web/src/app/name-capture/page.tsx` (new) | `/expo/app/name-capture.tsx` (new) | Conditional render after Apple Pay if no billing-contact name |
| Apple Pay (S7) | Stripe Payment Request API in `/seal/page.tsx` | Native Apple Pay sheet via Expo | **Functional divergence per §7.1 row 2** |
| Card-entry fallback (S7-WEB) | `/web/src/app/seal/card-fallback/page.tsx` (new) | N/A — never shown on native | Fires when Stripe Payment Request unavailable |
| Sealed (S8 / S9) | `/web/src/app/sent/page.tsx` | `/expo/app/sent.tsx` | Visually identical; iMessage handoff differs per §7.1 row 3 |
| Cold-open (S0) | `/web/src/app/page.tsx` (gated by localStorage flag) | `/expo/app/_layout.tsx` (gated by AsyncStorage flag) | Identical 14s sequence |
| Vow detail (S10) | `/web/src/app/vow/[id]/page.tsx` | `/expo/app/vow-detail.tsx` | Identical |
| Active states (S11–S13) | rendered inside `/vow/[id]` based on phase | rendered inside `vow-detail.tsx` based on phase | Identical |
| Witness landing (S14) | `/web/src/app/w/[token]/page.tsx` (server component) | N/A — opens webview if Expo user taps a witness link | Web is canonical |
| ~~First-time witness onboarding (S14.5)~~ | **KILLED Apr 22 2026** — reassurance absorbed into S14 footer, cadence lives on S16 timeline. No new screen needed. | N/A | N/A |
| Witness phone capture (S15) | inside `/w/[token]` | N/A | Web-only |
| Witness accepted (S16) | `/web/src/app/w/[token]/accepted/page.tsx` | N/A | Web-only |
| Verdict prompt (S17) | `/web/src/app/w/[token]/verdict/page.tsx` | N/A | Web-only |
| Verdict confirm (S18) | modal inside `/verdict/page.tsx` | N/A | Web-only |
| Verdict thanks (S19) | `/web/src/app/w/[token]/verdict/thanks/page.tsx` | N/A | Web-only |
| S19 expired/declined/auto-resolved | states inside `/w/[token]/page.tsx` | N/A | Web-only |
| Dashboard (S20) | `/web/src/app/dashboard/page.tsx` | `/expo/app/dashboard.tsx` | Identical visual; pull-to-refresh native-only |
| All vows witnessing (S20-WITNESSING-ALL) | `/web/src/app/witnessing/page.tsx` | `/expo/app/witnessing.tsx` | Identical |
| Quick Vow (S21) | `/web/src/app/quick-vow/page.tsx` | `/expo/app/quick-vow.tsx` | Identical |
| Create (S22) | `/web/src/app/create/page.tsx` | `/expo/app/create.tsx` | Both redirect to refine flow for V6 |
| Settings | `/web/src/app/settings/page.tsx` | `/expo/app/settings.tsx` | Identical visual; "Push notifications" row hidden on web |
| History | `/web/src/app/history/page.tsx` | `/expo/app/history.tsx` | Identical |
| Outcome (M11/M11B/broken) | `/web/src/app/vow-kept/page.tsx`, `/web/src/app/vow-broken/page.tsx` | `/expo/app/vow-kept.tsx`, `/expo/app/vow-broken.tsx` | Identical visual; share UX differs per §7.1 row 7 |
| Certificate | `/web/src/app/certificate/[vowId]/page.tsx` | `/expo/app/certificate.tsx` | Identical; share via platform-appropriate sheet |
| Cast (C1–C6) | `/web/src/app/cast/page.tsx` | `/expo/app/cast.tsx` | Identical visual; contact picker differs per §7.1 row 1 |
| Challenge accept (`/c/[token]`) | `/web/src/app/c/[token]/page.tsx` | N/A — opens webview | Web is canonical |
| Public outcome | `/web/src/app/outcome/[vowId]/page.tsx` | N/A — share opens web | Web is canonical |

## 7.3 Three responsive breakpoints (the only ones to support in V6)

| Viewport | Behavior |
|---|---|
| ≤ 480px wide (phone) | Edge-to-edge layout, identical to native iOS at 393×852 |
| 481–768px (small tablet) | 480px-wide column centered with 24px gold-hairline padding |
| ≥ 769px (laptop/desktop) | Same 480px-wide centered column + a soft radial dark backdrop behind it (`background: radial-gradient(ellipse at center, #181512 0%, #0F0D0A 70%)`) so the desktop visitor sees "the app, presented" rather than "the app, stranded in a sea of black" |

**That's it.** No tablet-specific layout, no desktop-specific layout. Every breakpoint shows the same 480px design. V7 will add a true desktop layout if metrics justify it.

## 7.4 Surface detection rules (for conditional logic)

When code needs to branch on surface (e.g., to show/hide the Push Notifications setting):

```ts
// /web/src/lib/surface.ts and /expo/lib/surface.ts (parallel implementations)

export type Surface = 'native-ios' | 'native-android' | 'mobile-web' | 'desktop-web';

// Web implementation
export function detectSurface(): Surface {
  if (typeof window === 'undefined') return 'desktop-web'; // SSR default; client hydrates correctly
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return isMobile ? 'mobile-web' : 'desktop-web';
}

// Expo implementation (in /expo/lib/surface.ts)
import { Platform } from 'react-native';
export function detectSurface(): Surface {
  return Platform.OS === 'ios' ? 'native-ios' : 'native-android';
}
```

**Use sparingly.** Most code paths should not branch on surface — the visual + functional contracts are unified. Only branch when a system API differs (Apple Pay vs Stripe Payment Request, Contacts vs link-share, etc.) and the difference is documented in §7.1.

## 7.5 What about Android?

V6 ships **iOS native + universal web**. Android users get the mobile-web experience by visiting `unbroken.vow` on Chrome. There is **no Android app build in V6.**

Android-as-mobile-web works because:
- Same V6 design renders identically in Android Chrome
- Stripe Payment Request API supports Google Pay on Android Chrome
- `sms:?&body=` deep link opens Android's default messaging app
- `navigator.share()` is well-supported on modern Android

The only Android gap vs mobile-web-on-iOS: no Apple Wallet integration for receipts (V7 if needed). No haptics (silent on web everywhere — same as mobile-web on iOS). No push (same — V7).

If Android users hit critical mass, V7 adds an Expo Android build. For V6, mobile-web is the canonical Android experience.

---

# PART 8 — ANALYTICS, OBSERVABILITY, TESTING

## 8.1 Analytics events to instrument (PostHog or Segment)

Maker funnel:
- `vow_input_started` (props: source = home | quick-vow | dashboard)
- `vow_refine_shown` (props: vagueness_score)
- `vow_refine_accepted`
- `vow_stake_selected` (props: amount, default_or_custom)
- `vow_destination_selected` (props: type = charity | cause-you-love | cause-you-hate, name)
- `vow_witness_picked` (props: source = contacts | manual | link-share)
- `vow_auth_started`
- `vow_otp_entered`
- `vow_otp_succeeded` / `vow_otp_failed`
- `vow_apple_pay_shown`
- `vow_apple_pay_succeeded` / `vow_apple_pay_canceled`
- `vow_sealed` (props: stake_cents, vow_type, has_witness_phone)
- `vow_sealed_state_a_viewed`
- `vow_sealed_cta_tapped` (props: cta = tell_nick | share_link)
- `vow_sealed_state_b_viewed` (visibilitychange fired)
- `vow_voided` (props: time_since_seal)
- `vow_verdict_recorded` (props: verdict, by = witness | maker | auto, days_active)

Witness funnel:
- `witness_invite_sms_sent`
- `witness_landing_viewed`
- `witness_accepted` / `witness_declined`
- `witness_phone_added`
- `witness_verdict_request_received`
- `witness_verdict_submitted` (props: verdict)

Engagement:
- `dashboard_viewed` (props: active_vow_count)
- `notification_received` (props: type)
- `notification_tapped` (props: type)
- `share_initiated` (props: surface, content_type)

## 8.2 Tests required before launch

- **Unit tests:** SMS template functions (every variant), vow-logic helpers (`inferDeadline`, `analyzeVow`), dashboard sort
- **Integration tests:** full vow lifecycle ($50 staked, $0, broken, voided, auto-resolved); witness accept; challenge accept-and-seal
- **E2E (Playwright on web):** home → seal → state A → state B; witness invite → accept → verdict; full cast flow
- **E2E (Detox or Maestro on Expo):** same flows
- **Visual regression (Chromatic or Percy):** snapshot every screen at 393×852; fail PR on any change > 0.1% pixel diff
- **Manual QA:** physical iPhone for the iMessage handoff and link-preview rendering. **Do not skip this.** Simulator does not show real iMessage previews.

## 8.3 Error monitoring

- Sentry for all client-side JS errors
- Edge function panics → Supabase log explorer, alert via webhook to Slack/email
- Stripe webhook failures → log + alert
- Twilio delivery failures → log + degrade gracefully (in-app banner to maker)

---

# PART 9 — SEQUENCING, RISKS, AND WHAT WE'RE PUNTING

## 9.1 Recommended sequencing (5 PRs, ~4 weeks)

The sequencing is structured as five PRs, in strict order. Each PR has a single owner and a single mergeable scope. **Do not merge a later PR before its predecessor lands.**

**PARALLEL TRACK — A2P 10DLC registration (start Day 1, runs alongside PR #1–#5)**
- Joe-owned, not Claude Code. See §4.10.1.
- Submit to Twilio Trust Hub on the day PR #1 opens. 2–4 week lead time.
- **PR #5 cannot ship to public production until A2P approval lands.**
- If approval delays launch: ship V6 to a small invite list via toll-free fallback per §4.10.1.

**PR #1 — Foundation** *(Week 1, first half)*
- Token reconciliation (§1.5) — replace every off-spec hex in `/web/src/app/globals.css`, `/expo`, and shared components
- Add full color/type/animation tokens as CSS variables (web) and a `tokens.ts` constants file (Expo)
- Font loading: Fraunces (with `opsz` axis) + Inter Tight, web + Expo
- Animation keyframes module from §2.4: `halo`, `sealPopIn`, `checkBounce`, `fadeUp`, `blink`, `pulseDot`
- Haptics module in Expo (`lib/haptics.ts`) implementing the full §2.5 map
- **Phone normalization helpers** at `/web/src/lib/phone.ts` and `/expo/lib/phone.ts` per §4.10.3 — identical implementations
- Schema migration `20260422000001_v6_witness_and_og.sql` per §4.1 — includes: V6 witness columns, `first_seal_completed_at`, `display_name_source`, `name_capture_prompted_at`, `currency`, `phone_e164` columns + backfill, `last_push_receipt_*`, `sms_only_preference`, `deleted_at`, `sms_retry_queue` table, `normalize_e164()` Postgres function
- OG card route via `next/og` ImageResponse at `/web/src/app/api/og/[token]/route.tsx` per §4.2
- SMS template sweep per §4.3 — every template in `_shared/sms-templates.ts` (including all Cast templates, refund retry templates, self-resolve template) and the grammar bug fix at `/web/src/app/sent/page.tsx:52`
- Cron schedule additions per §4.6 (skeleton only — handlers ship in PR #2)
- **No screens. No primitives. No edge function logic changes beyond what's listed.**

**PR #1.5 — Component Primitives** *(Week 1, second half)*
- Ship every primitive listed in §2.5.2, web + Expo, identical APIs
- Storybook page at `/_dev/primitives` rendering every primitive in every variant
- Pixel-diff each primitive against the V6 mocks before merge
- Wire visual regression into CI per §2.5.5
- **No screens are updated in this PR — primitives must exist in isolation first**
- **This PR is the highest-leverage piece of work in V6. Do not skip, compress, or bundle it into another PR.**

**PR #2 — Backend** *(Week 2, parallel to PR #3 if owners differ)*
- Edge function changes per §4.2: `seal-vow`, `accept-witness`, `submit-verdict`, `cron-runner` updates
- **`_shared/notify.ts` channel-dedup helper per §4.4.1** — every maker notification site MUST go through this; grep for direct `sendPush` / `sendSms` calls and route through `notifyMaker()` instead
- Push notification queue + full `PushPayload` type per §4.4 (including all Cast / refund / self-resolve types)
- **SMS retry queue + cron job per §4.10.2** — wraps every Twilio call; exponential backoff to dead at ~4h
- Stripe webhook handler for refund failures per §4.5
- **`delete-account` edge function per §6.1.1** — atomic void-all-vows + soft-delete + Stripe-flag + sign-out
- Wire all new audit event types (including `notification_sent`, `sms_retry_queued`, `sms_retry_dead`)
- Implement RLS policies and the audit per §4.7 (including `deleted_at IS NULL` gating on every user-fetch policy)
- Implement rate limits and abuse vectors per §4.8 — including 1/hour cap on user-initiated SMS resend ("Heckle him" button)
- Implement observability per §4.9 — including channel-distribution alert
- **No UI work. Witness identity decision applies to all notification copy and cadence.**

**PR #3 — Screens, batched** *(Weeks 2–3)*

Six themed batches, in this order. Each batch is its own sub-PR; do not bundle batches.

| Batch | Screens | Why grouped |
|---|---|---|
| 3A · Sealed loop | S8, S9, S-WEB3 web sealed, OG card visual sign-off | Most-tested screens; same primitives (`<WaxSeal />`, `<DeliveredPill />`); ship together for visual consistency |
| 3B · Witness path | S14, S15 (W1B), S16, S17, S18, S19 + witness identity copy update | Same flow; same primitives; copy from `WITNESS-IDENTITY-DECISION.md` |
| 3C · Active states | S10 router, S10.4 awaiting verdict (no mock), S10.7 voided (no mock), S11, S12, S13 | Same screen file with phase routing; build together |
| 3D · Outcome flows | M11 trophy, M11B shield, vow-broken-charity, vow-broken-cause-you-hate, certificate, IfBrokenSheet | All net-new (no V6 mocks); design sprint with Joe FIRST, then build |
| 3E · Dashboard, history, settings | S20, S20-EMPTY, **S20-WITNESSING-ALL**, S21 quick-vow, history, settings, error states | Mostly net-new (no V6 mocks); needs spec-only work |
| 3F · Web mobile parity | S-WEB1 auth-pay, S-WEB2 share, web versions of any Expo-first screens that diverge | Web-only sweep; runs after Expo screens are stable |

Every batch runs the §2.5.4 Pixel-Diff Loop on every screen before merge. **For batches 3C, 3D, and 3E, expect to pause mid-batch for design sign-off** on under-specced screens — Joe should produce a quick mock for each before code starts.

**PR #4 — Wiring** *(Week 4, first half)*
- Vow detail phase routing per §3.1 S10
- Dashboard concurrent-vow logic per §3.4
- `/cast` and `/c/[token]` challenge state machine per §6.6
- IfBrokenSheet wired into S3 stake screen and S21 quick-vow
- Error state routing per §6.4
- Push notification permission flow + soft prompt
- **No new screen UI — only routing, state, data fetching, and modal triggers**

**PR #5 — Polish & launch hardening** *(Week 4, second half)*
- Push notification cadence verification (matches §4.4 + §4.4.1 + WITNESS-IDENTITY-DECISION.md)
- **Channel-dedup audit:** grep every notification send site, confirm 100% go through `notifyMaker()` for maker notifications. No direct `sendPush`/`sendSms` calls outside the helper.
- Rate limit testing on every public endpoint per §4.8 + §4.10.2
- End-to-end test pass per §8.2
- Analytics event verification per §8.1
- Error monitoring sanity check per §8.3
- Final pixel-diff sweep across every Mock Manifest entry
- Visual regression CI green across web + Expo
- **A2P 10DLC approval verified live** — no production traffic until this is green
- **Twilio test send to all 4 major US carriers** verifies deliverability per §4.10.1

## 9.2 Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Pixel drift between code and design | High | High (Joe's #1 concern) | Token reconciliation PR + QA checklist + visual regression in CI |
| OG card render fails on iMessage | Medium | High (kills receiver conversion) | Test on physical device every PR; cache aggressively |
| `visibilitychange` doesn't fire reliably on iOS Safari | Medium | Medium (state B never triggers) | Combine with `pageshow` event + a fallback "Done? See your vow" affordance after 8s |
| Push notifications don't get permission | High | Medium | Soft-prompt before system prompt; explain value; SMS as fallback |
| Refund failures pile up silently | Medium | High (user trust) | Cron retry + admin alert + email user after 48h |
| Twilio delivery rate drops below 95% | Medium | High | Twilio dashboard monitoring + carrier backup (consider MessageBird) + A2P 10DLC registered (§4.10.1) + retry queue (§4.10.2) |
| A2P 10DLC approval delayed past launch | Medium | Critical | Start registration Day 1 per §4.10.1; toll-free fallback for invite list if delayed |
| Maker rage-quits from duplicate push + SMS | High | High | Channel-dedup helper `notifyMaker()` per §4.4.1 — 100% of maker notifications routed through it; PR #5 audit gates this |
| Phone number duplicates / mismatches break witness lookup | Medium | High | E.164 normalization at every write site per §4.10.3; backfill in §4.1 migration |
| Stripe disputes on broken vows | Low | High | Clear ToS disclosure at seal time; receipt emails; 30-day dispute window cushion |
| Witness ghosts (never delivers verdict) | High | Low | Auto-resolve to KEPT after 72h (maker doesn't get punished) |

## 9.3 What we're explicitly punting (V7+)

- **Witness dashboard / feed** — locked out by witness identity decision
- **Multi-witness vows** — out of scope
- **Vow editing post-seal** — by design, no
- **Witness rotation mid-vow** — V7
- **Email fallback for SMS** — V7
- **Web push notifications** — V7
- **Desktop-native layouts** — V7 (mobile-responsive on web for V6)
- **Group vows** — separate product decision
- **Charity Navigator API integration** — V7 (curated list for V6)
- **Public vow profiles / leaderboards** — separate Delivery 4 spec (#51)
- **Onboarding tutorial** — `/guided` route exists but unused; defer
- **Apple Watch companion** — distant future
- **Internationalization (i18n)** — US-only for V6

---

# PART 10 — QA AUDIT & ACCEPTANCE CRITERIA (one-shot gate)

This section is the **definition of done**. If any item here fails, the PR cannot merge. Claude Code MUST run through this checklist at the end of every PR (and at the end of PR #5 against the entire app) and report results in the PR description.

## 10.1 Self-audit checklist (PR-end)

After every PR, Claude Code runs through and reports pass/fail per item:

### Visual fidelity
- [ ] Every screen touched has a side-by-side diff (mock vs build) at 393×852, devicePixelRatio=3
- [ ] No off-spec hex values anywhere — `grep -r "#d4a84a\|#f0c86e\|#8c6423\|#0a0907\|#100d09\|#15110c\|#f5f0e4\|#a8a193\|#8a8275\|#1a1612"` returns zero hits in `/web/src` and `/expo` (excluding `/expo/components/vow-ui.tsx` and migration files)
- [ ] Every animation in §2.4 is implemented and runs (halo, sealPopIn, checkBounce, fadeUp, blink, pulseDot)
- [ ] All italics specified in §2.2 are italic (not regular)
- [ ] Fraunces is loaded with `opsz` axis on hero H1s

### Native ↔ mobile-web visual parity (per §3.9.0 contract)
- [ ] For every screen with both a native + web build: render web at 393×852 in Chromium, render native in iOS simulator at 393×852, side-by-side. Pixel diff < 2%.
- [ ] Color tokens match: web CSS variables in `globals.css` match Expo `tokens.ts` constants byte-for-byte (script: `node scripts/verify-token-parity.js` — write this in PR #1)
- [ ] Spacing: every value in §2.3 (button heights 56/62, card radius 14/18/20-24, screen padding 22/36, vertical rhythm 120/40/16/40/18) is identical native vs web — verified by spot-checking 5 screens per PR
- [ ] Animations: CSS keyframe durations match React Native Animated durations from §2.4 (halo 3.2s, sealPopIn timing, checkBounce, etc.). Use a verification script that diffs the two declarations.
- [ ] Cold-open plays for the same ~14s duration on web and native; black gap is 1.2s on both
- [ ] Wax seal renders at the same diameter (96/112/128 px) and the breathing halo runs at the same cadence

### Functional differences are documented (per §7.1)
- [ ] Every functional difference in the §7.1 matrix is implemented as specified — no undocumented divergence
- [ ] `lib/surface.ts` exists in both `/web/src` and `/expo` with parallel implementations
- [ ] Conditional rendering for surface-specific features (push toggle, contacts picker, Apple Pay vs Elements) uses `detectSurface()` — grep verifies no inline `Platform.OS` or `navigator.userAgent` branching in screen files

### Functional correctness
- [ ] $0 vow lifecycle works end-to-end (no Stripe calls fire)
- [ ] Staked vow lifecycle works end-to-end (manual capture → refund on kept, capture stays on broken)
- [ ] Witness flow accept → verdict (kept) → refund works
- [ ] Witness flow accept → verdict (broken) → destination receives works
- [ ] Witness decline → maker sees "passed" state → can pick someone else
- [ ] Cast flow: dare sent → accept → vow active → verdict
- [ ] Cast flow: dare sent → decline → maker refunded
- [ ] Cast flow: dare sent → 24h timeout → maker refunded
- [ ] Self-resolve flow: maker calls KEPT → witness gets "no need to rule" notification
- [ ] Self-resolve flow: maker calls BROKEN → confirmation guard → destination receives
- [ ] Auto-resolve at 72h post-verdict-deadline → KEPT, both sides notified
- [ ] Account deletion: type-DELETE confirm → all active vows void + refund → user signed out
- [ ] Cold-open plays once per fresh install, never on subsequent opens (`coldOpenSeen` flag respected)
- [ ] Initiation Oath plays only on user's first-ever sealed vow (`first_seal_completed_at` gating)

### Data integrity
- [ ] Every phone number in DB matches `^\+\d{8,15}$` (E.164)
- [ ] No `vows.witness_phone` write site bypasses `normalizePhoneE164()` — grep verifies
- [ ] No `vows` row exists with `stake_amount > 0` AND `stripe_payment_intent_id IS NULL` AND `status NOT IN ('draft')`
- [ ] No double-refund possible — Stripe idempotency key + DB row lock both verified by integration test
- [ ] Soft-deleted users (`deleted_at IS NOT NULL`) do not appear in any user-facing list

### Notifications
- [ ] Every maker notification routes through `notifyMaker()` per §4.4.1 — grep `_shared/notify.ts` is the only allowed sender for maker pushes
- [ ] No maker receives both push AND SMS for the same event (check audit log)
- [ ] Witness Day-1 notification fires within 60s of accept
- [ ] Witness midpoint fires within 1h of vow midpoint
- [ ] Verdict request fires at `ends_at` ± 5 min
- [ ] Refund retry job runs every 30 min, marks dead after ~24 attempts
- [ ] SMS retry queue drains within 5 min of new entry
- [ ] All Cast notifications (accept/decline/auto-void/verdict) implemented

### Accessibility
- [ ] All touch targets ≥ 44×44pt (Expo) / 44×44px (web)
- [ ] All gold-on-dark color combinations pass WCAG AA contrast (≥ 4.5:1)
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Every form field has an accessible label
- [ ] Every CTA has discernible text (no icon-only buttons without aria-label)

### Security
- [ ] RLS policies on `vows` tested: user A cannot read user B's vows except as witness/target
- [ ] No service-role key shipped to client (web or Expo bundle)
- [ ] Stripe webhook signature verification implemented and tested
- [ ] No PII in client-side analytics events
- [ ] Phone numbers never appear in URL parameters
- [ ] Witness/challenge tokens are cryptographically random (≥ 128 bits entropy)

### Backend health
- [ ] Every edge function has a `try/catch` around external calls (Stripe, Twilio, Expo Push)
- [ ] Every cron job sets its `*_notified_at` BEFORE sending (crash-safe = no resend)
- [ ] All audit events fire with `actor_type` set
- [ ] Migration `20260422000001_v6_witness_and_og.sql` is reversible (down migration exists)

## 10.2 Manual QA acceptance test (run on physical iPhone before PR #5 merges)

**Cannot be skipped, cannot be done in simulator.**

1. Fresh install → cold-open plays the two-screen sequence with a 1.2s black gap → tap CTA → home (S1)
2. Make a vow with $50 stake to a real witness (use a second device to receive the SMS)
3. On second device, receive iMessage with OG card link preview → tap → land on `/w/[token]` → accept
4. First device receives push within 60s: "[name] just accepted"
5. Both devices receive midpoint push at vow midpoint
6. At `ends_at`, witness device receives verdict request push
7. Witness submits "kept" → maker device receives outcome push within 60s → Stripe dashboard shows refund issued
8. Repeat with "broken" verdict → Stripe shows capture remains, destination logged
9. Repeat with $0 vow → no Stripe activity at any step
10. Make a Cast to second device → accept → verdict → both sides see correct outcome
11. Cast → decline → maker device sees decline + refund within 60s
12. Test account deletion: type DELETE → all 3 prior vows void/refund → cannot sign in with same number
13. Test refund retry: simulate Stripe outage (use Stripe test mode "card_error_during_refund") → verify retry queue picks it up
14. Test SMS retry: simulate Twilio outage (block Twilio API at network level) → verify queue retries

## 10.3 Regression test suite (CI gate)

Every PR must pass:

- All unit tests in `/web/__tests__/**` and `/expo/__tests__/**`
- All integration tests in `/supabase/tests/**`
- E2E suite (Playwright web + Maestro Expo) for: maker happy path, witness happy path, cast happy path, void happy path, account deletion happy path
- Visual regression CI green on every Mock Manifest entry
- Lighthouse score ≥ 90 on `/`, `/dashboard`, `/vow/[id]`, `/w/[token]` (web)
- TypeScript: zero errors, zero warnings (no `// @ts-ignore` net-new)
- ESLint: zero errors, zero new warnings

## 10.4 Pre-launch readiness gate (one final review before public)

Before flipping the toggle to public traffic:

1. **A2P 10DLC approved** — verified in Twilio console; test send to all four major US carriers passes
2. **Stripe live mode keys** rotated and configured; webhook endpoints registered with Stripe
3. **Sentry** receiving events from web + Expo production builds
4. **Push notification certificates** valid for Apple (APNs) and configured in Expo
5. **Domain** `unbroken.vow` SSL certificate valid; OG card URL renders correctly when scraped via `curl -A "facebookexternalhit/1.1"` and `curl -A "Twitterbot"`
6. **Privacy policy + ToS** live at `/privacy` and `/terms`
7. **Stripe disclosure** at seal time matches §9.2 dispute mitigation language
8. **Help / support email** `hello@unbroken.vow` is monitored
9. **Twilio HELP keyword** auto-responder configured and tested
10. **Backup contact for refund failures** confirmed (Joe's phone + email get the alert)

If any of these 10 fails, do not launch. Fix and re-run §10.2.

---

# CLOSING NOTE

This is a working document. As implementation reveals issues, update it in place rather than building parallel docs. The priority order if anything has to be cut:

1. **Pixel fidelity on the V6 sealed flow** (Sealed state A + B + receiver iMessage OG card) — these are the most-screenshotted, most-shared screens
2. **Outcome flows** (kept/broken, charity vs. cause-you-hate) — Joe explicitly flagged
3. **Witness identity language consistency** across every screen — the panel decision earns its keep only if the language ships unified
4. **Haptics on every Expo interaction**
5. **Push notification cadence** — keeps the "Heckle him" promise

Everything else is in service of these five.

**This is what consulting-grade product handoff looks like. Build it as designed.**
