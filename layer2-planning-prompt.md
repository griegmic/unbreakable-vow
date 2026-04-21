# Unbreakable Vow — Layer 2 Planning Prompt

You are a world-class consumer product designer, product manager, CTO, and QA lead — all in one. Your job is to plan a complete design upgrade of the Unbreakable Vow app and produce build artifacts that a coding agent (Claude Code) can execute with minimal human intervention.

## Context

### What is Unbreakable Vow?
A commitment/accountability app. Users create vows, assign witnesses, optionally stake money, and track outcomes. If they keep their word, they get their money back. If they break it, the money goes to charity (or an "anti-cause" for maximum motivation).

### What exists today
A working Next.js 16 web app + Expo mobile app with a functional but utilitarian design. The app works — all flows are implemented — but the visual design is basic (system fonts, generic dark theme, no ceremonial feeling).

**Tech stack:**
- Web: Next.js 16.2.2, React 19, TypeScript, Tailwind CSS 4, Supabase JS v2
- Mobile: Expo 54, React Native, expo-router
- Backend: Supabase (PostgreSQL, Edge Functions, RLS)
- Payments: Stripe (manual capture → refund on kept, capture stays on broken)

### The design upgrade
Two designers produced design specifications as HTML files:

**Designer A (`unbreakable-vow-designs.html`):** The aesthetic north star. Warm, ceremonial, premium. Playfair Display serif for display moments, Inter sans-serif for body. Near-black backgrounds with warm tint (#0a0907), gold accents (#d4a84a), layered dark surfaces. Tone: "a friend who calls you out gently." BUT — only covers 12 sections (landing page through sealed+share and witness SMS). Missing 60%+ of the app's screens and states.

**Designer B (`index.html`):** Comprehensive screen map — 35 unique screens/states across native, mobile web, and desktop web. Covers the full lifecycle: ceremony intro, home, witness picker (first-time + returning), auth, stakes, sealed+share, pending (regular + 48h solo option), active vow, waiting on verdict, vow kept (charity + anti-cause variants), vow broken (charity + anti-cause variants), witness flow (invite → accepted → verdict day → after verdict), dare flow (send → receive → accept → sealed), navigation menu, history/your vows, empty states, settings, returning user home, refine bottom sheet, group challenges (coming soon). BUT — uses a slightly different, cooler design language.

**The directive:** Take Designer A's aesthetic and apply it to every screen Designer B mapped out, plus ensure zero gaps versus the current codebase. Where the two docs disagree on UX decisions, merge the best of both — lean toward Designer A on tiebreaks (it has stronger, more opinionated design reasoning).

### Key design decisions already locked

1. **Opening ceremony (first-time users only):** Two-screen animation sequence:
   - Screen 1: "Every promise you've ever broken had one thing in common."
   - Screen 2: "It was free." (gold, prominent)
   - Then: "An Unbreakable Vow — a vow to be better, sworn to a friend. Break it, and you'll pay."
   - Skip button available. localStorage flag so returning users go straight to home.

2. **Design system:** Playfair Display (serif) for display/ceremonial text, Inter (sans-serif) for body. Color palette from Designer A. Gold (#d4a84a) as primary accent. Near-black backgrounds (#0a0907 / #100d09). Green (#4ade80) for success. Muted red for danger.

3. **No $0 stake option.** Stakes start at $10. A stakes-based app shouldn't train users toward the weak version.

4. **No named politicians** in anti-cause options. Use: NRA Foundation, PETA, "Write your own..." Custom input is where virality lives.

5. **Deferred auth.** User builds entire vow as guest, authenticates at commit (seal screen).

6. **/sent page is a cliffhanger, not a confirmation.** It should feel like "almost done — one step left." Copy: "Your vow is sealed. Now your witness needs to see it." Share button is the next step, not optional. Copy link must be prominent (not buried). On desktop, visible URL preview + copy-to-clipboard since there's no share sheet.

7. **Kill premature share on /witness page.** The current app fires a share dialog before the shared thing exists. Remove completely.

8. **Anti-cause approach:** "A cause you'd hate to fund" (not "a cause you hate") — describes the user's emotion about funding, not a judgment about the recipient. Safer legally.

9. **Phone-only auth** preferred (from Designer A). But the current app uses Supabase Auth with Google OAuth — keep what's already implemented. Don't rip out working auth.

10. **Restyle everything.** The CLAUDE.md "do not modify" list was for feature work. For this design overhaul, every page gets the new look. Update styling and copy everywhere, but preserve all functional logic/behavior.

11. **Quick vow page (lower priority):** The returning-user single-page creation experience should be redesigned with all key inputs visible on one screen — vow input, stake amount pills, witness picker, "By when" selector, consequence, and seal button. Think: "Break your word. Pay the price." hero with everything below it.

### Scope
- **Web app** (Next.js) — primary target, all routes
- **Expo mobile app** — update to match new design language
- **DO NOT modify:** `expo/components/vow-ui.tsx` (never), existing Supabase Edge Functions API contracts, existing RLS policies, Stripe flow logic
- **Git safety:** Create a branch (`design-upgrade`) from current state before any changes. Existing main branch must remain untouched.

### Quality bar
The output must survive review by the world's best QA engineer. Zero bugs, zero copy mismatches, zero missing flows, zero marketing-to-product inconsistencies, nothing out of order, everything pixel-perfect to the design spec. The QA person who tests after the first QA person should find zero issues.

---

## Your Process

You are running a planning conversation with me (Joey). You will walk through the steps below sequentially, completing each one before moving on. You make decisions autonomously on most things, but pause to check in with me on 3-5 major calls.

### Rules for this conversation

1. **Concrete over abstract.** Every spec must be implementable. No "make it feel premium" — say exactly what font, size, color, spacing, animation.
2. **Verify, don't guess.** When you need to establish facts about the current codebase, APIs, or technical feasibility, use web search or ask me. Don't assume.
3. **Challenge bad assumptions.** If something in the design docs is technically infeasible, contradicts the codebase, or would create a bad user experience, say so.
4. **Track assumptions.** Maintain a running list of assumptions the plan depends on. Surface them at the end.
5. **Copy is product.** Every string on every screen must be specified. Don't leave copy as "TBD" or "lorem ipsum."
6. **State machines matter.** For every screen, specify all possible states and transitions. A screen with 3 states is 3 specs.
7. **Mobile-first.** Design for mobile viewport first. Desktop adaptations are secondary.
8. **The ceremony is the product.** This app's differentiator is that making a vow feels like an event, not a form submission. Every design choice should reinforce that.

---

## Step 1: Deep Codebase Audit

Before designing anything, you must understand exactly what exists. Read the current codebase thoroughly.

### What to establish:

**A. Complete route inventory.** Every page in the web app's `app/` directory. For each:
- Route path
- What it renders (summary)
- Current design state (styled / unstyled / placeholder)
- States it handles (loading, error, empty, populated, etc.)

**B. Component inventory.** Every reusable component in `components/`. For each:
- What it does
- Where it's used
- Current styling approach (Tailwind classes, inline styles, CSS modules)

**C. Current design system.** Extract the actual CSS variables, color palette, typography, spacing, component patterns currently in use. Note inconsistencies.

**D. User flows end-to-end.** Trace each flow from entry to completion:
1. First-time vow creation (landing → input → refine → stake → seal → sent/share)
2. Returning user creation (/create or /dashboard → quick creation)
3. Witness invite flow (/w/[token] → accept/decline → verdict)
4. Challenge/dare flow (/cast → share → /c/[token] → accept → seal)
5. Active vow tracking (/live, /dashboard)
6. Verdict + outcome (/self-resolve, /vow-kept, /vow-broken, /outcome/[vowId])
7. Certificate sharing (/certificate/[vowId])
8. Settings + history

**E. Edge cases and error states.** What happens when:
- Witness never accepts (48h+ timeout)
- Payment fails
- SMS fails
- User is not authenticated when they should be
- Vow is voided mid-flow
- User visits a token link for a declined/voided vow

### Output:
Present a complete inventory organized by flow. Identify any screens or states that exist in the codebase but aren't in either design doc. Identify any screens in the design docs that don't exist yet.

---

## Step 2: Design System Specification

Reconcile the two design docs into a single, authoritative design system. This becomes a resource file that Claude Code references during the build.

### What to specify:

**Colors** — Every color token with exact hex values and usage rules. Background hierarchy (bg → bg-card → bg-elevated → bg-input). Text hierarchy (text → text-muted → text-dim → text-faint). Accent colors (gold, green success, red danger). Border colors. Selection/hover states.

**Typography** — Font families, weights, sizes for every use case. H1 display (serif), H2, H3, body, caption, label, button text, input text, chip text. Line heights. Letter spacing. When to use serif vs sans. When to use italic. When to use gold color on text.

**Spacing** — Padding/margin system. Card padding. Screen padding. Gap between elements. Section spacing.

**Components** — For each reusable component pattern:
- Buttons (primary gold CTA, secondary, muted/disabled, danger)
- Cards (ritual card, review card, contact card, cause card)
- Inputs (text input, phone input, active/focus states)
- Chips (preset chips, suggestion chips with dashed border, stake pills)
- Progress indicators (progress bar, step indicators)
- Badges/pills (status badges, live indicators)
- Bottom sheets
- Radio rows
- Validation messages
- App chrome (header bar, logo mark, brand text)

**Animations** — Entrance animations (fadeUp, scaleIn), transition durations, easing curves. Seal ceremony animation. Ceremony intro animation.

**Shadows** — Card shadows, button shadows, bottom sheet shadows.

**Border radii** — Consistent radius tokens for different element types.

### Output:
A complete `design-system.md` file ready to be saved to the repo. Claude Code will read this file during execution.

---

## Step 3: Screen-by-Screen Spec

This is the bulk of the work. For every screen and state in the app, produce a complete specification.

### For each screen, specify:

1. **Route / location** — Where this lives in the codebase
2. **Entry conditions** — How the user gets here, what state is required
3. **Layout** — Top to bottom, what's on screen. Component hierarchy.
4. **Copy** — Every string. Exact text. No placeholders.
5. **Visual treatment** — Which design system tokens apply. Any special treatments (glow effects, ceremony moments, etc.)
6. **States** — Every possible state this screen can be in (loading, empty, populated, error, success, etc.) and how each looks.
7. **Interactions** — What's tappable, what happens on tap, transitions, animations.
8. **Edge cases** — Null states, error handling, what shows if data is missing.
9. **Platform differences** — If mobile web or desktop web differs from the default mobile experience.

### Screen inventory (minimum — add any you discover in Step 1):

**Ceremony (first-time only):**
- Ceremony screen 1: "Every promise you've ever broken..."
- Ceremony screen 2: "It was free." + "An Unbreakable Vow..."

**Home / Landing:**
- First-time user home (marketing surface)
- Returning user home (with active vows / quick creation)
- Empty state (returning user, no active vows)

**Vow Creation Flow:**
- Vow input screen (empty state, valid state, vague-with-suggestions state)
- By When bottom sheet (conditional)
- Witness picker (first-time / contacts granted / manual entry)
- Stakes screen (collapsed charity / expanded charity / expanded anti-cause)
- Seal screen (review + auth + payment all-in-one)
- Sealed + share (the cliffhanger — NOT a dead end)

**Refine:**
- Refine page or bottom sheet (vague vow → specific)

**Active Vow:**
- Vow pending (waiting on witness acceptance)
- Vow pending 48h+ (solo option appears)
- Vow active (witness accepted, tracking in progress)
- Waiting on verdict (deadline passed, witness hasn't decided)

**Outcomes:**
- Vow kept (charity variant)
- Vow kept (anti-cause variant — "Crisis averted. You saved $25 from NRA.")
- Vow broken (charity variant — "It happens.")
- Vow broken (anti-cause variant — "You played yourself.")

**Witness Flow (external — no account required):**
- Witness invite page (/w/[token]) — pending
- Witness phone number capture
- Witness accepted confirmation
- Witness verdict page (/w/[token]/verdict)
- Witness after verdict
- Witness invite — declined state
- Witness invite — vow already resolved state

**Challenge/Dare Flow:**
- Cast/dare creation page
- Dare text received (SMS mockup for reference)
- Dare acceptance page (/c/[token])
- Dare auth (if needed)
- Dare set stakes
- Dare sealed
- Dare notification to original sender

**Dashboard:**
- Dashboard with active vows (card stack)
- Dashboard hero mode (single active vow, full display)
- Dashboard with "their vows" (witnessing section)
- Dashboard empty state

**Navigation:**
- Slide-out menu
- History / Your Vows page
- History empty state
- Settings page

**Certificate / Sharing:**
- Certificate page (/certificate/[vowId])
- Outcome page (/outcome/[vowId]) — public shareable

**Auth:**
- Auth modal (if kept as modal) or auth screen
- OTP entry

**Quick Vow (lower priority):**
- Returning user single-page creation (the screenshot-style layout)

### Conflict Resolution
For each place Designer A and Designer B disagree, note the conflict, evaluate both options, and pick one with reasoning. Major conflicts (3-5) should be presented to me for approval before proceeding. Examples of major conflicts:
- Auth flow structure (phone-only vs multi-option)
- Home page layout and copy
- Whether witness picker uses contacts API or manual entry on web
- Dashboard structure (hero mode vs card list)
- Stakes screen label copy ("How serious are you?" vs "How much?")

### Output:
A complete `screen-specs.md` file organized by flow. Every screen, every state, every string.

---

## Step 4: Copy System

Extract every user-facing string into a single reference document. Organized by screen/flow.

### What to include:
- Heroes / headlines
- Subheads / descriptions
- Button labels (all states — active, disabled, loading)
- Placeholder text
- Validation messages
- Error messages
- Success messages
- SMS templates (witness invite, verdict request, nudge)
- Share text templates (pre-composed messages for different contexts)
- Empty state messages
- Chip labels
- Status labels
- Toast/notification copy

### Copy principles (from Designer A):
- Direct + slightly accusatory tone. Assumes the user is someone who talks without doing.
- Short. Never lectures.
- "I vowed" not "I bet" (avoids two-sided wager mental model)
- "Judge" not "witness" in user-facing copy (judge is active, witness is passive)
- Use the person's name in CTAs when available ("Lock Dan in →", "Tell Sarah 📱")

### Output:
A complete `copy-spec.md` file.

---

## Step 5: QA Checklist

Build the most thorough QA checklist possible. This gets embedded in the Layer 1 prompt so Claude Code self-verifies.

### Categories:

**Flow completeness:**
- Every flow can be completed end-to-end
- Every screen is reachable
- Every back button works
- Every CTA leads somewhere
- No dead ends

**Copy consistency:**
- Every string matches the copy spec
- No placeholder text ("lorem ipsum", "TODO", etc.)
- Button labels match their function
- Error messages are human-readable
- Status labels are consistent across screens

**Visual consistency:**
- Every screen uses the design system tokens (no hardcoded colors/fonts)
- Gold accent is the same gold everywhere
- Typography hierarchy is consistent
- Component patterns are reused (not recreated with slight differences)
- Dark background hierarchy is consistent

**State handling:**
- Loading states for every async operation
- Error states for every async operation
- Empty states for every list/collection
- Null handling (what if witness_name is null? stake_amount is 0?)

**Platform parity:**
- Mobile web matches native design (except documented differences)
- Desktop web has appropriate adaptations (copy link instead of share sheet, etc.)

**Edge cases:**
- Witness never accepts → 48h solo option
- Payment fails → clear error, retry path
- SMS fails → fallback messaging
- Token link for voided vow → appropriate message
- Token link for already-resolved vow → appropriate message
- User not authenticated → redirect or auth modal
- Browser back button at every step
- Page refresh at every step (state preserved or recovered)

**Accessibility:**
- Sufficient color contrast (gold on dark backgrounds)
- Touch targets ≥ 44px
- Screen reader labels on icon-only buttons

**Performance:**
- No layout shift on load
- Images/assets optimized
- Animations respect prefers-reduced-motion

### Output:
A complete `qa-checklist.md` file organized by category.

---

## Step 6: Build Plan

Determine the optimal build order for Claude Code. The build should be structured so each phase produces a working (if incomplete) app, and nothing breaks between phases.

### Recommended phasing:

**Phase 0: Safety**
- Create `design-upgrade` branch from current HEAD
- Save resource files (design-system.md, copy-spec.md, screen-specs.md, qa-checklist.md) to repo

**Phase 1: Design System Foundation**
- Update globals.css with new CSS custom properties
- Update/create shared component library with new design tokens
- Update layout.tsx with new fonts (Playfair Display + Inter via Google Fonts or next/font)
- Verify build compiles

**Phase 2: Core Creation Flow**
- Ceremony intro (first-time only)
- Home/landing page
- Vow input screen (all 3 states)
- By When bottom sheet
- Witness picker
- Stakes screen (all states)
- Seal screen
- Sealed + share (the cliffhanger)

**Phase 3: Post-Seal Lifecycle**
- Active vow / live page
- Pending states
- Waiting on verdict
- Outcome pages (kept/broken, all variants)
- Certificate page

**Phase 4: External Flows**
- Witness invite page (/w/[token])
- Witness verdict page
- Challenge accept page (/c/[token])
- Dare creation flow

**Phase 5: Dashboard + Navigation**
- Dashboard (all states)
- Slide menu
- History page
- Settings page

**Phase 6: Expo Mobile**
- Apply design system to Expo app
- Update relevant screens (DO NOT touch vow-ui.tsx)

**Phase 7: Quick Vow (lower priority)**
- Returning user single-page creation experience

**Phase 8: QA Sweep**
- Run through entire QA checklist
- Fix every issue found
- Run through a second time to verify

### For each phase, specify:
- Files to create/modify
- Dependencies (what must be done first)
- Verification criteria (how to know the phase is complete)

### Output:
Build plan with phases, file lists, and verification criteria. This becomes the main Layer 1 prompt structure.

---

## Step 7: Assemble Layer 1 Artifacts

Produce the final build artifacts. These are what actually get handed to Claude Code.

### Artifact 1: `design-system.md`
Complete design system specification (from Step 2). Saved to repo root or `.claude/` directory.

### Artifact 2: `screen-specs.md`
Complete screen-by-screen specifications (from Step 3). Saved to repo.

### Artifact 3: `copy-spec.md`
Complete copy system (from Step 4). Saved to repo.

### Artifact 4: `qa-checklist.md`
Complete QA checklist (from Step 5). Saved to repo.

### Artifact 5: The Main Prompt
A single comprehensive prompt for Claude Code that:

1. **Opens with context** — What the project is, what the upgrade entails, where to find the resource files.
2. **Sets the git safety protocol** — Branch before touching anything.
3. **Walks through the build phases** — Each phase with specific files to modify, what to change, and verification steps.
4. **Embeds the design system** — Key tokens inline so Claude Code doesn't have to constantly re-read the file.
5. **Embeds the copy spec** — At minimum, inline the copy for whatever phase is being built.
6. **Includes the QA checklist** — As the final phase, with instructions to self-verify every item.
7. **Includes critical constraints:**
   - DO NOT modify `expo/components/vow-ui.tsx`
   - DO NOT change Supabase Edge Function API contracts
   - DO NOT change RLS policies
   - DO NOT change Stripe flow logic (PaymentIntent creation, capture, refund)
   - PRESERVE all functional behavior — this is a design upgrade, not a rewrite
   - When restyling a page, keep all React hooks, state management, Supabase queries, and event handlers intact. Only change JSX structure, className strings, and inline styles.

### Output:
All 5 artifacts as downloadable files. The main prompt should be copy-pasteable into Claude Code.

---

## Step 8: Stress Test

Before delivering, walk through the entire plan as if you were Claude Code executing it.

### Verify:
1. **Can Claude Code actually do this?** Are there any steps that require human judgment, access to external systems, or information not in the prompt?
2. **Are there ambiguities?** Any place where Claude Code would have to guess what to do?
3. **Are there contradictions?** Any place where the spec says two different things?
4. **Are there missing screens?** Walk through every user journey end-to-end. Is there a screen or state not covered?
5. **Is the copy complete?** Every string on every screen specified?
6. **Is the build order safe?** Will intermediate states compile and work?
7. **What could go wrong?** List the top 5 risks and mitigation strategies.

### Fix everything you find before delivering.

Present your stress test findings and any fixes you made.

---

## Step 9: Deliver

Present all Layer 1 artifacts as downloadable files:
1. `design-system.md`
2. `screen-specs.md`
3. `copy-spec.md`
4. `qa-checklist.md`
5. `build-prompt.md` (the main Claude Code prompt)

Confirm with me that everything looks good. Make any final adjustments I request.

---

## Reference: Current App Architecture

### Database Schema (key tables)

**`public.vows`** — Core entity. Fields include: id, user_id (maker), raw_input, refined_text, status (draft/sealed/active/awaiting_verdict/kept/broken/voided), vow_type (self/challenge), witness_name, witness_phone, witness_invite_token, witness_user_id, witness_accepted_at, witness_declined, target_user_id, target_phone, challenge_status (pending/accepted/declined), challenge_invite_token, stake_amount (cents, 0 = no stake), consequence (charity), destination, stripe_payment_intent_id, starts_at, ends_at, verdict, verdict_at, sealed_at.

**`public.users`** — id, display_name, phone, stripe_customer_id, push_token.

**`public.audit_events`** — All state changes logged. Event types: vow_created, vow_sealed, witness_invited, witness_accepted, witness_declined, challenge_sent, challenge_accepted, challenge_declined, check_in, verdict_submitted, verdict_self_resolved, auto_resolved, vow_voided, refund_issued, refund_failed, sms_failed, sms_retried.

### Vow State Machine
```
draft → sealed → active → awaiting_verdict → kept | broken
                active → voided (maker cancels)
                awaiting_verdict → voided (maker cancels)
                awaiting_verdict → kept (72h auto-resolve)
Challenge: challenge_status: pending → accepted | declined
           declined → vow voided
```

### Stripe Flow
```
$0 vow:  seal-vow (skip Stripe) → activate
Staked:  create-payment-intent (manual capture) → user pays → seal-vow (capture) → activate
Kept:    submit-verdict → full refund
Broken:  submit-verdict → money stays captured
Voided:  void-vow → full refund
```

### Web App Routes (current)
**Existing:** `/`, `/refine`, `/stake`, `/witness`, `/seal`, `/sent`, `/live`, `/self-resolve`, `/vow-kept`, `/vow-broken`, `/history`, `/settings`, `/auth/callback`, `/w/[token]`, `/w/[token]/verdict`, `/outcome/[vowId]`

**Newer:** `/dashboard`, `/create`, `/vow/[id]`, `/c/[token]`, `/certificate/[vowId]`, `/cast`

### Key Patterns
- Token-based access for witnesses and challenge targets (no account required)
- Audit events for all state changes
- $0 vows skip ALL Stripe operations
- Challenge vows: maker = witness, target = person challenged
- Idempotency keys on Stripe refunds

### Files That Must NOT Be Modified (functional behavior)
- `expo/components/vow-ui.tsx` — NEVER
- Supabase Edge Function request/response contracts
- RLS policies
- Stripe manual capture → refund flow logic

### Files Where You May Change Styling But Must Preserve Logic
- Every web page file — restyle freely, keep hooks/state/queries/handlers
- `components/ui.tsx` — update component styling, keep component interfaces
- `components/share-button.tsx` — update styling, keep share/copy logic
- `components/dashboard-card.tsx` — update styling, keep state machine logic
- `components/auth-modal.tsx` — update styling, keep auth flow
- `components/payment-form.tsx` — update styling, keep Stripe integration
- `providers/auth-provider.tsx` — do not modify
- `lib/supabase.ts` — do not modify
- `lib/vow-logic.ts` — do not modify
- `middleware.ts` — do not modify
