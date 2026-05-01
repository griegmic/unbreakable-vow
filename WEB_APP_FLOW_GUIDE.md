# Unbreakable Vow Web App — End-to-End Flow Guide

**Current Date:** April 30, 2026  
**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase JS v2  
**Architecture:** Client-side React pages with SSR, server-side auth callbacks, token-based witness/challenge flows

---

## Table of Contents

1. [Quick Overview](#quick-overview)
2. [Entry & Creation Flow](#entry--creation-flow)
3. [Witness Flow (Token-Based)](#witness-flow-token-based)
4. [Challenge / Dare Flow](#challenge--dare-flow)
5. [Live Tracking & Outcomes](#live-tracking--outcomes)
6. [Authenticated Home & Management](#authenticated-home--management)
7. [Auth & Misc Routes](#auth--misc-routes)
8. [Shared Libraries & Components](#shared-libraries--components)
9. [Middleware & Routing](#middleware--routing)
10. [Design System](#design-system)

---

## Quick Overview

Unbreakable Vow is an accountability app where users create vows, assign witnesses (or judge dares on friends), optionally stake money, and track outcomes. The web app has two main flows:

1. **Creation flow** (unauthenticated landing → refine → stake → witness → seal → sent)
2. **Witness flow** (token-based, no auth required: `/w/[token]` accept/decline → verdict)

Authentication happens at the **seal** step via phone OTP. The app uses Supabase for auth + DB, Stripe for payments (manual capture), and Twilio for SMS.

---

## Entry & Creation Flow

### **Route: `/` (Home / Landing)**

**Purpose:** Entry point for first-time and returning unauthenticated users.

**Visual & UX:**
- Large serif headline: "Make a vow. _Mean it._"
- Input field prompts "I vow to..." with placeholder text
- Three starter chips: "Gym 3x this week," "No alcohol, 2 weeks," "Delete TikTok for a week"
- Progress indicator: "1 / 5"
- Sign-in button in top-right (SmallCaps uppercase)
- Optional one-time "Ceremony Overlay": 3-line oath with staggered fade-in (respects prefers-reduced-motion)

**Data Collected:**
- `rawInput` (user's vow text, stored to VowFlowProvider)
- `deadlineIso` (auto-inferred from text or defaults to +7 days)

**Smart Deadline Logic:**
- Parses vow text for implicit deadlines ("tomorrow," "2 weeks," "by Friday," etc.)
- Falls back to parseDuration() for explicit patterns ("2 weeks," "30 days")
- Default: 7 days from now at 23:59:59 local time

**Action:**
- Click "Next →" button OR press Enter → checks if vow is vague with `analyzeVow()`
  - **Vague** (e.g., "be better," "get fit") → `/refine`
  - **Specific enough** (e.g., "gym 3x this week") → `/stake`

**Auth Redirect Logic (Authenticated users):**
- Checks for in-progress vow → redirect to `/seal`
- Checks for `uv-post-seal-target` (recently sealed) → redirect to `/vow/[id]?sealed=1` or `/sent`
- Checks for return paths (cookie / localStorage / sessionStorage) → redirect there
- Otherwise → `/dashboard`

**Ceremony Overlay:**
- Shows once per browser (localStorage flag: `uv_ceremony_seen`)
- ~2.7s staggered text fade-in with optional skip via "I swear it →" button

---

### **Route: `/refine` (Nudge to Tighten Vow)**

**Purpose:** Bottom-sheet overlay (styled as full page) suggesting a tighter version of vague vows.

**Visual & UX:**
- Faux-dimmed home content behind (opacity 0.18, blur 2px)
- Dark overlay backdrop
- Bottom card with input field + suggestions
- Back button (top-left) to return to `/`
- Headline: "Is this specific enough?"

**Data Flow:**
- Reads `vow.rawInput` from provider
- Calls `generateSuggestion()` to auto-populate refined version
- Calls `getContextualSuggestions()` to provide 3 alternative refinements

**Action:**
- "Tighten it" button → sets `refinedText`, pushes `/stake`
- "Keep as is" button → sets `refinedText = rawInput`, pushes `/stake`

---

### **Route: `/stake` (Set Terms: Money, Consequence, Deadline)**

**Purpose:** Multi-card interface to choose stakes, consequence destination, and confirm deadline.

**Visual & UX:**
- Topbar: back button + "3 / 5" progress
- Page header: "Set the _terms_."
- Vow card: shows refined text + daily deadline with end-date display
- Stake card: 3 preset buttons ($20, $50, $100) + "Other" for custom amount
  - Dynamically shows hint text: "Enough to sting," "Now your word has teeth," etc.
- Consequence card: radio-style buttons for "Cause you believe in" (charity) vs "Cause you hate" (anti)
- Destination picker: dropdown showing list of charities or anti-causes
- Deadline card: preset buttons ("This Friday," "End of week," "In 7 days," "Pick date") + date input if custom
- Sticky bottom: CTA button to continue

**Data Writes:**
- `setStake({ amount, ... })` (updates amount in cents)
- `updateConsequence(consequence, destination)`
- `setDeadline(pickedEndDate.toISOString())`

**Action:**
- "Continue →" / "Next →" button → pushes `/witness`

---

### **Route: `/witness` (Witness Selection: Share or Solo)**

**Purpose:** Device-aware two-option layout for assigning a witness.

**Visual & UX:**
- Two primary card options (selected via device capability):
  - **Mobile** (navigator.share available): "Text a friend" card with Users icon
  - **Desktop** (no share API): "Copy invite link" card with Link2 icon
  - **Both:** Secondary "No witness — just my word" card
- Device detection happens client-side (SSR default = mobile to avoid hydration mismatch)

**Data Writes:**
- Mobile share: calls `prepareWitness()` to generate invite URL + share text, then `navigator.share()`
- Desktop copy: calls `prepareWitness()`, copies text to clipboard, shows "Link copied ✓" feedback
- Solo: calls `switchToSolo()` → sets witness to "Just me"

**Before proceeding:**
- If authenticated: calls `ensureDraftForWitness(token)` to create draft vow row in DB
- If not authenticated: stores flag `uv-share-witness-after-auth` in localStorage, redirects to `/seal` for auth first

**Action:**
- Mobile: share sheet opens, then auto-pushes `/seal`
- Desktop: after 1.5s feedback delay, auto-pushes `/seal`
- Solo: immediately pushes `/seal`

---

### **Route: `/seal` (Final Review + Auth + Payment + Activation)**

**Purpose:** Last mile before vow locks in: auth gate, optional payment capture, then seal the vow (mark active).

**Visual & UX:**
- Multi-step UI depending on user state:
  1. **Review step:** Shows vow card + summary of witness + stake + deadline
  2. **Auth step:** Phone number + OTP + name collection (only if unauthenticated)
  3. **Payment step:** Stripe payment modal (if stake > 0)
  4. **Sealing step:** Animated seal reveal + confirmation
  5. **Done step:** Certificate or post-seal summary

**Auth Flow (if not authenticated):**
- Phone input → SMS OTP (6-digit code) → Name input
- Calls Supabase auth functions: `signUpWithOTP()` → `verifyOTP()`
- On success, sets flag `authCompletedRef` to prevent race condition with auth state propagation
- Creates public user row in `public.users` (for foreign key)

**Payment Flow (if stake > 0):**
- Calls `create-payment-intent` edge function (returns Stripe client secret)
- Shows Stripe payment modal with iframe
- On success: captures payment (manual capture mode)
- Stores Stripe PI ID in vow row for later refund processing

**Vow Activation:**
- Calls `seal-vow` edge function:
  - Updates vow status: `draft` → `sealed` → `active`
  - If staked: captures Stripe payment
  - Sends SMS to witness (if phone provided)
  - Logs audit event
- On success: stores post-seal target, clears vow flow state, redirects

**Seal Animation:**
- Multi-phase animation with staggered timers:
  - Phase 0: seal starts, "Sealing your vow..."
  - Phase 1 → 3: wax seal visual animation
  - Final: reveals certificate or post-seal screen

**Dev Bypass & Quick Seal:**
- `?quick=1` → skips most UI, auto-seals (for testing)
- Localhost → dev bypass for Stripe (skip payment)

**Action:**
- After sealing: redirects to `/sent` (witness share page) or `/vow/[id]?sealed=1` (self-witness)

---

### **Route: `/sent` (Post-Seal Witness Share & Receipt)**

**Purpose:** Show-case sealed vow for sharing & acknowledgment.

**Visual & UX:**
- **State A (mobile, S8):** Certificate-style display with wax seal, vow text, witness name, stake amount
  - Two action buttons: "Share with witness" + "Done, go to my vows"
  - SMS body pre-filled: "I just made a vow... [link]"
- **State B (returned from Messages/share, S9):** Same display but shows "Sent!" confirmation + "Back to my vows"
  - Triggered by `visibilitychange` event (app re-opens after share sheet closes)
- **Desktop variant (S-WEB3):** Receipt view with share link card instead of share button

**Witness URL Generation:**
- Uses `vow.witnessInviteToken` (UUID generated during witness prep)
- Format: `https://unbreakablevow.app/w/[token]`

**Share Format:**
```
I just made a vow to [vow text] and put $[amount] on it — hold me to it!
[witness URL]
```

**Share Methods:**
- **Mobile:** navigator.share() → SMS/iMessage/email/etc.
- **Desktop (S-WEB3):** Copy link to clipboard with inline feedback

**Auto-Persistence:**
- Stores sent timestamp in localStorage: `uv-sent-[vowId]` for state B trigger
- Stores post-seal target (`uv-post-seal-target`) for recovery if user refreshes

**Action:**
- "Done, go to my vows" button → `/dashboard`
- Share sheet close (State A → B) → visual feedback, auto-advance

---

### **Route: `/create` (Power-User Single-Page Creation)**

**Purpose:** Advanced creation flow in one screen with all fields visible (not yet in V6 primary flow).

**Status:** Exists but currently redirects to `/refine` for V6 backward compatibility. Contains sub-components for witness selection and consequence picking.

---

### **Route: `/quick-vow` (Returning-User Fast Path)**

**Purpose:** One-screen creation for authenticated returning users.

**Visual & UX:**
- Expandable "pills" for each section: Promise, Verdict (deadline), Stake, Witness, Destination
- Textarea input for vow text
- Deadline pills: "Sunday night," "Tomorrow," "1 week," "30 days," "Pick date"
- Stake options: $10, $50, $100 (with motivational text)
- Witness mode: "Share judge link" (default) or "Judge it myself"
- Destination picker (charity or anti-cause)
- Single CTA: "Seal this vow"
- If broken vow: "If Broken?" button → `<IfBrokenSheet>` overlay for consequence details

**Smart Behaviors:**
- Auto-detects deadline from vow text (e.g., "by Friday" → inferred deadline)
- Shares judge link (with optional SMS text) if witness mode is "share"
- Calls `shareOrCopyJudgeLink()` based on browser capabilities

**Action:**
- Click "Seal this vow" → `/seal?quick=1` (skips many steps)

---

### **Route: `/guided` (Placeholder)**

**Purpose:** Future flow for guided vow creation. Currently minimal implementation.

---

## Witness Flow (Token-Based)

### **Route: `/w/[token]` (Witness Invite Page)**

**Purpose:** Witness receives vow invite link; accepts/declines without authentication.

**SSR + Metadata:**
- Server-side rendering fetches vow data via service role (RLS witness policies removed for security)
- Generates dynamic metadata: "Someone picked you as judge" with vow preview, stake amount
- Handles four possible outcomes: witness accepted, witness declined, vow voided, or verdict resolved

**Status-Aware Router (S19 §3.2):**
The page determines what to show based on vow state, priority order:
1. **witness_declined = true** → "You declined this challenge" (terminal)
2. **verdict != null** → "Verdict resolved" outcome page (terminal)
3. **status = voided** → "Vow was voided by maker" (terminal)
4. **status in [draft, sealed, active, awaiting_verdict]** → Interactive accept/decline UI
5. **else** → "Expired" fallback

**Interactive States (Accept/Decline):**
- **Maker display name:** Fetched from `public.users` table
- **Vow text:** Refined text displayed prominently
- **Stake details:** Dollar amount + destination (charity or cause)
- **Action buttons:**
  - "Accept & judge it" → slides to verdict input (next step)
  - "Decline" → submits `accept-witness` edge function with `declined=true`, shows terminal state

**Client Components:**
- `WitnessInviteClient`: Interactive accept UI (accept/decline buttons)
- `WitnessTerminalClient`: Terminal states (accepted, declined, outcome, voided, expired)

---

### **Route: `/w/[token]/verdict` (Witness Submits Verdict)**

**Purpose:** After accepting, witness submits final verdict (kept/broken) via this page.

**Flow:**
- Radio buttons: "They kept it" vs "They broke it"
- Optional notes/reasoning textarea (not persisted, for UX only)
- Submit button → calls `submit-verdict` edge function (service role) with verdict value
- On success: shows confirmation, updates vow status → `kept` or `broken`, processes refund if kept

**Refund Logic:**
- **Vow kept:** Full refund issued (Stripe full refund with idempotency key `refund-{vowId}`)
- **Vow broken:** Money stays captured (no refund)

---

## Challenge / Dare Flow

### **Route: `/cast` (Darer Creates Challenge)**

**Purpose:** Authenticated user creates a vow challenge targeting a friend (dare).

**Visual & UX:**
- Form inputs: target name, dare text, deadline, optional taunt
- Consequence radio buttons (charity or anti-cause)
- After submit: shows dare link, allows share sheet or copy-to-clipboard

**Data Structure:**
- Single vow row with `vow_type = 'challenge'`
- `user_id` = darer (witness role)
- `target_user_id` (or `target_phone`) = person being dared
- `challenge_status` = pending → accepted/declined
- One unique token: `challenge_invite_token`

**Share & Polling:**
- Generates dare URL: `https://unbreakablevow.app/c/[challenge_invite_token]`
- Shows share button (mobile) or copy-to-clipboard (desktop)
- Polls `/vows` table for `challenge_status = 'accepted'`
- On acceptance: shows "Challenge accepted!" + displays target's stake/destination choices

---

### **Route: `/c/[token]` (Challenge Target Accept/Decline)**

**Purpose:** Friend receives dare link, sees the vow challenge, decides to accept or decline.

**SSR + Metadata:**
- Server-side fetch of challenge vow via service role
- Dynamic metadata: "[Name] dared you" + vow text preview + stake hint
- Status-aware router:
  - If `challenge_status = 'accepted'` → Show "You accepted this dare"
  - If `challenge_status = 'declined'` → Show "You declined"
  - Else → Interactive accept/decline UI

**Interactive UI (Decline or Accept):**
- **Decline:** Submits via `accept-challenge` edge function with `declined=true` → vow status becomes `voided`
- **Accept:** Target sets their own stakes (amount, consequence, destination) → calls `accept-challenge` to update challenge vow with target's choices → darer's `/cast` page receives poll update

---

## Live Tracking & Outcomes

### **Route: `/live` (Single-Vow Live Tracking)**

**Purpose:** Maker watches a single active vow in real-time.

**Status:** Frozen (CLAUDE.md marked immutable). Shows:
- Vow text
- Witness info
- Stake details
- Countdown to deadline
- Verdict submission UI (for self-judge vows)
- Optional "Undo: void this vow" button

**Behavior:**
- Polls Supabase for status changes
- If witness submits verdict → shows outcome immediately
- On 72-hour deadline: auto-resolves as "kept" (cron job)

---

### **Route: `/self-resolve` (Self-Judge Verdict Submission)**

**Purpose:** When vow has no external witness (self-witness), maker submits their own verdict.

**Status:** Frozen. Simple UI:
- Radio buttons: "I kept it" vs "I broke it"
- Submit button → `submit-verdict` edge function with maker's verdict
- Automatic refund processing per verdict

---

### **Route: `/vow-kept` (Outcome: Vow Kept)**

**Purpose:** Display when verdict is "kept" for single-vow page view.

**Status:** Modifiable per V6 spec. Shows:
- Celebratory message
- Vow text in highlight box
- Witness acknowledgment: "Witnessed by [name]"
- Stake protection: "$X protected" (if staked)
- Share certificate button → `/certificate/[vowId]`

---

### **Route: `/vow-broken` (Outcome: Vow Broken)**

**Purpose:** Display when verdict is "broken" for single-vow page view.

**Status:** Modifiable per V6 spec. Shows:
- Serious/honest message about breaking vow
- Vow text
- Witness judgment: "Judged broken by [name]"
- Donation confirmation: "$X donated to [destination]"
- Optional: encouragement to make another vow

---

### **Route: `/outcome/[vowId]` (Public Outcome Page)**

**Purpose:** Shareable public page showing final verdict for a vow.

**Visual & UX:**
- SSR-fetched vow data: text, verdict, stake, destination, witness name
- Metadata tags for social sharing (OG image, Twitter card)
- Terminal display: "Vow Kept" or "Vow Broken" with details
- For kept vows: "View certificate" link → `/certificate/[vowId]`

**Verdict Logic:**
- Shows outcome regardless of who views (public page)
- No edit/change capability (outcome is final)

---

### **Route: `/certificate/[vowId]` (Shareable Certificate)**

**Purpose:** Beautiful certificate-style page for keeping a vow.

**Visual & UX:**
- Ornate design with wax seal graphic
- Vow text centered
- Witness signature line: "Witnessed by [name]"
- Date ranges: sealed date → verdict date
- Stake protection note (if applicable)
- Share button (mobile) / copy link (desktop)
- Social card metadata for embedding

**Redirect:**
- If verdict != 'kept' → redirects to `/outcome/[vowId]` (certificates only for kept)

---

### **Route: `/vow/[id]` (Vow Detail Page)**

**Purpose:** In-app vow detail view for authenticated makers/witnesses.

**Visual & UX:**
- Timeline view: created → sealed → active → awaiting_verdict → verdict
- Vow card with all metadata
- Witness info + accept/decline status (if not accepted)
- Verdict input (if awaiting verdict and user is witness)
- Share options
- Optional: "Make another vow" CTA

---

## Authenticated Home & Management

### **Route: `/dashboard` (Authenticated Home)**

**Purpose:** Central hub for authenticated users showing all active vows across roles.

**Visual & UX:**
- Header: "My Vows" title
- Hamburger menu (top-right) → `/quick-vow`, `/cast`, `/dashboard`, `/history`, `/settings`
- In-progress banner (if user has unfished draft): "You have an unfinished vow" → tap to continue
- Sections:
  - **My Vows:** Vows user created (ordered by create date)
  - **Witnessing:** Vows where user is witness (ordered by deadline urgency)
  - **Challenges:** Incoming dares targeted at user
  - **Accepted Challenges:** Dares user accepted
  - **Outbound Dares:** Dares user sent (waiting for target to accept)

**Vow Cards:**
- Vow text snippet
- Status badge: Active, Awaiting Verdict, Kept, Broken, Voided
- Witness name + accept/decline status indicator
- Stake amount + destination (if applicable)
- Deadline countdown
- Action buttons:
  - Active/Awaiting: "Verdict" (if user is witness)
  - Active: "Undo: Void" (if user is maker)
  - Draft: "Continue creation"

**Data Fetching:**
- Query `vows` table filtered by:
  - `user_id` (my vows)
  - `witness_user_id` (witnessing)
  - `target_user_id` (incoming challenges)
  - `vow_type = 'challenge'` + `challenge_status = 'accepted'` (accepted dares)

**Polling:**
- Auto-refreshes every 15–30 seconds (via interval)
- Real-time status transitions (e.g., verdict submitted, challenge accepted)

---

### **Route: `/history` (Past Vows & Outcomes)**

**Purpose:** View all completed vows (kept/broken/voided).

**Status:** Modifiable per V6 spec.

**Visual & UX:**
- Filter/sort options: by date, outcome type, stake amount
- Timeline or list view of past vows
- Outcome summary: "Kept," "Broken," "Voided"
- Donation summary (total donated if broken vows)
- Archive/search functionality

**Vow Cards:**
- Outcome badge (color-coded)
- Vow text
- Verdict date + time-since display
- Verdict by witness name
- Stake + destination confirmation
- Optional: "View certificate" / "View outcome" links

---

### **Route: `/settings` (Account & Preferences)**

**Purpose:** Manage user account, authentication, and app preferences.

**Status:** Modifiable per V6 spec.

**Likely Features:**
- Display name + phone number edit
- Sign out button
- Delete account option
- Privacy/terms links
- Push notification toggle
- Timezone/locale settings

---

## Auth & Misc Routes

### **Route: `/auth/callback` (OAuth Redirect Handler)**

**Purpose:** Supabase auth redirect after magic link / phone OTP verification.

**Status:** Frozen (immutable per CLAUDE.md).

**Flow:**
- Verifies OAuth token/code from URL params
- Exchanges for session
- Stores return path (from cookie/localStorage)
- Redirects to that return path or `/dashboard`

---

### **Route: `/privacy` (Privacy Policy)**

**Purpose:** Legal disclosure.

---

### **Route: `/terms` (Terms of Service)**

**Purpose:** Legal T&C.

---

### **Route: `/api/og/[token]` (OG Image Generation)**

**Purpose:** Dynamic OpenGraph image for witness invite links.

**Method:**
- Server-side image generation (Vercel OG or similar)
- Reads witness URL token from params
- Queries vow data via service role
- Generates image: vow text, stake, witness call-to-action
- Serves as `og:image` in witness page metadata

**Variants:**
- `/w/[token]/og` (witness invite)
- `/c/[token]/og` (challenge invite)
- `/certificate/[vowId]/og` (certificate)
- `/outcome/[vowId]/og` (outcome)
- `/og` (home page fallback)

---

### **Route: `/_dev/primitives` (Component Storybook)**

**Purpose:** Dev-only UI primitives showcase.

**Status:** Dev-only route (not in production).

**Components Showcased:**
- RitualScreen, RitualCard
- FrauncesH1, FrauncesSub
- GoldCTA, OutlinedGoldCTA
- WaxSeal, Certificate components
- Form inputs, buttons, chips
- Badges, modals, cards

---

## Shared Libraries & Components

### **`/lib/supabase.ts`**

**Purpose:** Supabase client initialization.

**Exports:**
- `supabase` singleton (initialized with public key + URL)
- Used throughout app for auth + DB queries

**Status:** Frozen (immutable).

---

### **`/lib/vow-logic.ts`**

**Purpose:** Core vow-creation and analysis logic.

**Key Exports:**
- `formalizeVow(text)` — capitalizes + adds period
- `analyzeVow(text)` → `{ type: 'vague' | 'already_good', suggestions?: string[] }` — determines if vow needs refinement
- `generateSuggestion(text)` — auto-suggests tighter version of vow
- `getContextualSuggestions(text)` — provides 3 alternative phrasings based on activity type
- `inferDeadline(text)` → `Date | null` — extracts deadline from vow text ("by Friday," "next week," etc.)
- `extractDeadlineDate(text)` → `string | null` — returns human-readable deadline
- `getVowVerdictDate(text, deadlineIso)` — formats verdict display with date range
- `charities`, `antiCauses` arrays — consequence destinations
- `stakeAmounts` array — preset stake options

**Status:** Frozen (immutable).

---

### **`/lib/judge-link.ts`**

**Purpose:** Generate and share judge links (witness invite URLs).

**Key Functions:**
- `prepareJudgeLink(terms)` — prepares shareable link with SMS body
- `shareOrCopyJudgeLink()` — device-aware share sheet or clipboard copy
- `hashJudgeTerms(terms)` — creates hash of vow terms for change detection

---

### **`/lib/dashboard-sort.ts`**

**Purpose:** Sort/categorize vows for dashboard display.

**Interface:**
- `DashboardVow` — type for vows in dashboard context
- Sort by deadline urgency, status, creation date

---

### **`/providers/vow-flow.tsx`**

**Purpose:** Client-side React Context for managing vow creation state across pages.

**State:**
```typescript
{
  rawInput: string;
  refinedText: string;
  witnessType: 'self' | 'friend';
  witnessName: string;
  witnessPhone: string;
  stake: { amount: number; consequence: 'charity' | 'anti'; destination: string };
  vowId: string | null;
  witnessInviteToken: string | null;
  vowType: 'self' | 'challenge';
  targetName: string;
  targetPhone: string;
  deadlineIso: string | null;
}
```

**Persistence:** Saved to `localStorage` key `unbreakable-vow-flow` after every state change (survives OAuth redirects).

**Methods:**
- `setRawInput(text)` — resets state + sets raw input
- `setRefinedText(text)` — updates refined version
- `setWitnessType(type)` — 'self' or 'friend'
- `setWitnessName(name)` — witness display name
- `setStake(stake)` — stake amount + consequence + destination
- `switchToSolo()` — converts to self-witness (witness_type = 'self')
- `setDeadline(iso)` — stores ISO deadline string
- `resetVow()` — clears flow state + localStorage

---

### **`/providers/auth-provider.tsx`**

**Purpose:** Global auth state management.

**State:**
```typescript
{
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  displayName: string | null;
  signOut: () => Promise<void>;
}
```

**Behavior:**
- Calls `supabase.auth.getSession()` on mount
- Subscribes to `onAuthStateChange` for real-time auth state
- Extracts display name from user metadata or email domain

**Status:** Frozen (immutable).

---

### **`/components/primitives/` (UI Components)**

**Purpose:** Reusable building blocks with consistent styling.

**Key Primitives:**
- `RitualScreen` — full-screen container with max-width + padding
- `RitualCard` — elevated card with border + shadow
- `FrauncesH1(size)` — serif headline ("hero," "large," "medium," "small")
- `FrauncesSub` — serif subtitle text
- `GoldCTA` — primary action button (gold gradient)
- `OutlinedGoldCTA` — secondary button (outlined gold)
- `WaxSeal` — animated wax seal graphic
- `EyebrowTag` — small label pill
- `WitnessChip` — witness badge
- `NeedsNowCard` — urgent action card
- `AvatarMenuTrigger` — hamburger menu button
- `ChoicePill` — clickable option pill
- `RadioCard` — radio button option
- Form inputs, checkboxes, modals

**Status:** May add/update per V6 spec; do NOT remove existing exports.

---

### **`/components/auth-modal.tsx`**

**Purpose:** Modal UI for phone-based authentication.

**Behavior:**
- Phone input field
- OTP input (6 digits)
- Name input
- Calls Supabase auth functions
- Shows error messages
- Calls `onSuccess` callback on successful auth

**Status:** Frozen (immutable).

---

### **`/components/payment-form.tsx`**

**Purpose:** Stripe payment UI modal.

**Behavior:**
- Embeds Stripe Elements iframe
- Handles card input + billing
- Calls Stripe API to confirm payment intent
- Returns success/error to parent

---

### **`/components/share-button.tsx`**

**Purpose:** Reusable share button with device detection.

**Behavior:**
- On mobile: `navigator.share()` (SMS/iMessage/etc.)
- On desktop: copy-to-clipboard with feedback
- Customizable text/title

**Status:** Frozen (immutable).

---

### **`/components/hamburger-menu.tsx`**

**Purpose:** Navigation menu for dashboard + authenticated routes.

**Contents:**
- Seal a Vow (quick-vow)
- Dare a friend (cast)
- My Vows (dashboard)
- History
- Settings

---

## Middleware & Routing

### **`/middleware.ts`**

**Purpose:** Route-level request handling.

**Current Logic:**
- Redirects `/witness?token=X` → `/w/X` (legacy route migration)

**Matcher:** Only applies to `/witness` path.

---

## Design System

### **Color Palette (CSS Custom Properties)**

Located in `/app/globals.css` (`:root` layer):

**Backgrounds:**
- `--uv-bg: #0F0D0A` — main background (very dark brown)
- `--uv-bg-card: #181512` — elevated card surfaces
- `--uv-bg-elevated: #1F1B16` — higher elevation cards
- `--uv-bg-input: #1A1612` — input field background
- `--uv-bg-overlay: rgba(5, 4, 4, 0.72)` — modal overlay

**Text:**
- `--uv-text: #F0E9DB` — primary text (cream)
- `--uv-text-muted: #A49A85` — secondary text
- `--uv-text-dim: #726A5A` — tertiary text
- `--uv-text-faint: #5A5346` — disabled/hint text
- `--uv-text-on-gold: #1A1205` — text on gold backgrounds

**Gold Accent:**
- `--uv-gold: #C89B3C` — primary accent
- `--uv-gold-bright: #E8B656` — highlighted gold
- `--uv-gold-deep: #8B6820` — darkened gold
- `--uv-gold-bg: #2A2015` — gold background tint
- `--uv-gold-glow: rgba(200, 155, 60, 0.28)` — glow effect
- `--uv-gold-line: rgba(200, 155, 60, 0.22)` — border outline

**Signals:**
- `--uv-success: #4ADE80` — success/kept state (green)
- `--uv-danger: #F87171` — danger/broken state (red)
- `--uv-warn: #FB923C` — warning (orange)
- `--uv-info: #60A5FA` — info (blue)

**Borders:**
- `--uv-border: #322D24` — standard border
- `--uv-border-strong: #4A4036` — emphasized border
- `--uv-border-soft: rgba(240, 233, 219, 0.08)` — subtle border

**Typography:**
- `--uv-font-serif: Georgia, 'Times New Roman', serif` — headlines
- `--uv-font-sans: -apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, 'Segoe UI', sans-serif` — body
- `--uv-font-mono: ui-monospace, 'SF Mono', Menlo, monospace` — code

**Spacing (8px grid):**
- `--uv-space-1: 4px` through `--uv-space-10: 80px`

**Radius:**
- `--uv-radius-xs: 4px` through `--uv-radius-pill: 9999px`

**Shadows:**
- `--uv-shadow-sm`, `--uv-shadow-md`, `--uv-shadow-lg`, `--uv-shadow-xl`
- `--uv-shadow-sheet` (for bottom sheets)
- `--uv-shadow-gold-glow` (gold accent glow)

---

### **Layout & Responsive**

- **Max-width:** Most screens capped at 440px (mobile-first, tablet-optimized)
- **Safe area:** Respects notched phones via `env(safe-area-inset-*)`
- **Safe-area classes:** `.safe-top`, `.safe-bottom` apply padding
- **Reduced motion:** Respects `prefers-reduced-motion` with instant transitions
- **Scrolling:** Smooth scroll behavior by default

---

## Summary Table of Routes

| Route | Purpose | Auth Required? | Key Flow |
|-------|---------|----------------|----------|
| `/` | Landing + vow input | No | rawInput → analyzeVow → refine or stake |
| `/refine` | Tighten vague vows | No | generateSuggestion → stake |
| `/stake` | Set terms (money, deadline) | No | setStake, updateConsequence → witness |
| `/witness` | Choose witness or solo | No | prepareWitness → seal |
| `/seal` | Auth gate + payment + activate | Partial (auth here) | getValidSession → seal-vow → sent |
| `/sent` | Post-seal share receipt | No | State A/B based on visibility, then dashboard |
| `/create` | Advanced creation (V6 deprecated) | No | Redirects to /refine |
| `/quick-vow` | Fast 1-screen creation | Yes | All fields in pills → seal?quick=1 |
| `/cast` | Challenge/dare creation | Yes | targetName, dareText → share → poll |
| `/c/[token]` | Challenge accept/decline | No | accept-challenge → vow status updated |
| `/w/[token]` | Witness invite accept/decline | No | accept-witness OR → verdict |
| `/w/[token]/verdict` | Witness submits verdict | No | kept/broken → submit-verdict |
| `/live` | Single-vow live tracking | Yes (maker) | Watch countdown + submit verdict |
| `/self-resolve` | Self-judge verdict | Yes (maker) | kept/broken → submit-verdict |
| `/vow-kept` | Outcome display (kept) | No | Show certificate link |
| `/vow-broken` | Outcome display (broken) | No | Show donation info |
| `/outcome/[vowId]` | Public outcome (any verdict) | No | SSR rendered, shareable |
| `/certificate/[vowId]` | Beautiful kept-vow cert | No | SSR rendered, shareable |
| `/vow/[id]` | Detail + timeline | Yes (maker or witness) | Edit/verdict submission |
| `/dashboard` | Authed home (all vows) | Yes | Multi-section vow browser |
| `/history` | Past vows (kept/broken/void) | Yes | Archive + filter by outcome |
| `/settings` | Account + preferences | Yes | Edit name, phone, sign out |
| `/witnessing` | Vows you're witnessing | Yes | Overflow from dashboard |
| `/auth/callback` | OAuth redirect | Implicit | Handle auth token → redirect |
| `/privacy` | Privacy policy | No | Legal text |
| `/terms` | Terms of service | No | Legal text |
| `/api/og/[token]` | Dynamic OG image | No | Generated image for share cards |
| `/_dev/primitives` | UI component showcase | Dev only | Storybook-style component browser |

---

## Key State & Flow Facts

1. **Vow Flow Context:** Persisted to `localStorage` as `unbreakable-vow-flow` JSON, survives OAuth redirects
2. **Auth Flow:** Phone-based (SMS OTP), no password; stored in Supabase auth + session
3. **Draft Vows:** Created in `seal` step if witness mode active; stored as `status='draft'` until sealed
4. **Witness Invite:** One unique token per vow; token-based access (no RLS witness access, service role only)
5. **Challenge:** Single vow row with `vow_type='challenge'` and `challenge_invite_token` for target
6. **Payment:** Stripe manual capture mode; captured on seal, refunded on kept verdict
7. **Refund:** Idempotency key `refund-{vowId}` prevents duplicate refunds
8. **SMS:** Sent on seal (to witness) and on verdict submission (to maker), logged in `sms_log` table
9. **Audit:** All state changes logged to `audit_events` table via `_shared/audit.ts` helper
10. **Auto-Resolve:** 72-hour deadline trigger → `cron-runner` edge function marks vow as kept

---

## Critical Architecture Notes

- **No raw RLS on witnesses/targets:** Service role used for token-based operations to bypass row-level security
- **Token-first design:** Witnesses and challenge targets access via unique tokens, never user IDs
- **Client-side state:** VowFlowProvider manages creation flow state; Auth provider manages session
- **SSR metadata:** Witness + challenge + outcome pages use server-side data fetching for OG metadata
- **Device detection:** Client-side feature detection (navigator.share) avoids UA sniffing; SSR defaults to mobile
- **Hydration safety:** Checks for client-side availability in `useEffect` to avoid hydration mismatches
- **localStorage + sessionStorage:** Used for flow recovery, return paths, and persistence across OAuth redirects

---

## Modifiable Routes (V6 Unlock)

Per CLAUDE.md, these routes are now unlocked for modifications per the V6 spec:

- `/w/[token]/page.tsx` — Status-aware router (§3.2)
- `/vow-kept/page.tsx` — Outcome flow (§5.1-5.2)
- `/vow-broken/page.tsx` — Broken variants (§5.3-5.4)
- `/settings/page.tsx` — Settings design (§6.1)
- `/history/page.tsx` — History design (§6.2)
- `/outcome/[vowId]/page.tsx` — Public outcome (§5.6)
- `globals.css` — Token reconciliation (§1.5)
- `layout.tsx` — Font loading (§2.2)
- `middleware.ts` — Auth route changes
- `components/ui.tsx` — Add new primitives (do NOT remove existing)

---

## End-to-End Example: Making & Judging a Vow

### User A (Maker) Flow:

1. **`/`** → Enters "Go to gym 3x this week"
2. **Page detects:** Specific enough (has time window + frequency)
3. **→ `/stake`** → Sets $50 stake, "ALS Association," deadline inferred to Friday end-of-day
4. **→ `/witness`** → Mobile: shares via SMS; Desktop: copies link
5. **→ `/seal`** → Phone OTP auth, name input, Stripe payment capture
6. **→ `/sent`** → Shows sealed vow, share confirmation, "Done" button
7. **→ `/dashboard`** → Shows vow as "Active," countdown to Friday

### User B (Witness) Flow:

1. **Receives SMS:** "I just made a vow to go to gym 3x this week and put $50 on it — hold me to it! https://unbreakablevow.app/w/[token]"
2. **`/w/[token]`** → Sees vow details, User A's name, $50 stake, "ALS Association"
3. **Taps "Accept & judge it"**
4. **`/w/[token]/verdict`** → On Friday, submits verdict: "They kept it"
5. **submit-verdict edge function:**
   - Marks vow `verdict='kept'`
   - Refunds $50 to User A's Stripe account
   - Logs audit event
6. **User A's vow → `/outcome/[vowId]`** → "Vow Kept," $50 protected, witnessed by User B
7. **User A can share `/certificate/[vowId]`** → Beautiful certificate for social media

---

**END OF GUIDE**
