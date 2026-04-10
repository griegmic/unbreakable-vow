# Challenge/Dare V1 — Build Spec

## Context

Unbreakable Vow's current growth is pull-based (K-factor ~0.3–0.5). Challenges flip this to push: a logged-in user dares a friend into a vow via a share link. The dare lands in their existing message thread (iMessage, WhatsApp, etc.), carrying social pressure to accept. Every dare is an involuntary acquisition event.

V1 is share-based (no Twilio). The challenger shares a link through native share sheet. The recipient accepts on a mobile web page — no app install required. When accepted, it becomes a normal vow with the challenger as witness.

### V1 Scope
**In:** Dare creation (web + Expo), share link with pre-composed text, web accept page (accept/back down/stakes/payment/seal), dynamic OG image, push notifications to challenger, 48h expiration.

**Out:** Oathkeeper chat, 12h re-engagement nudge, re-dare, SMS delivery, app install prompts before seal, challenger-funded pledges, double stakes, anti-charity.

## Key Decisions

### Naming & Branding
- **"Dare"** is the action verb on the sender side — casual, punchy, universally understood
- **"Vow"** is the language on the recipient side — heavy, binding, branded
- The product transforms a dare into a vow. The copy mirrors this escalation.
- **"Challenge a friend"** stays on outcome screens (existing copy, contextually perfect post-vow)

### Entry Points (Hybrid Approach)
- **Separate `/cast` page** for dare creation — gets its own energy and design
- **`/create` page** stays personal-vow-only, with a subtle "or **dare a friend →**" link
- **Dashboard** has a "Dare a friend" card (returning users only)
- **Outcome screens** have "Challenge a friend" button (routes to `/cast`)
- **First-time users** do NOT see dare options until they have ≥1 sealed vow

### Payment Inversion
- **Current flow:** Challenger pays → seals → SMS to target → target accepts
- **V1 flow:** Challenger creates free dare → shares link → recipient accepts → recipient pays → vow seals
- The RECIPIENT pays, not the challenger. Sending dares is free.

### Expiration
- 48 hours from vow creation (not from share time — we can't track that)
- Challenger notified on expiration

## Architecture

### Schema Changes

```sql
-- New column: challenger's suggested stake (display/anchor only, never charged)
ALTER TABLE public.vows
  ADD COLUMN suggested_stake_amount integer DEFAULT 0;

-- Expand challenge_status to include 'expired'
ALTER TABLE public.vows
  DROP CONSTRAINT vows_challenge_status_check,
  ADD CONSTRAINT vows_challenge_status_check
    CHECK (challenge_status IN ('pending', 'accepted', 'declined', 'expired'));
```

### Modified Edge Functions

#### `accept-challenge/index.ts` — Major modification

New API contract:

```typescript
POST /functions/v1/accept-challenge
// Auth: Service role (token-based, no JWT)

// ACCEPT:
{
  token: string,
  action: 'accept',
  stake_amount: number,        // cents, recipient's choice (0 = no stake)
  destination: string,         // charity name (empty if $0)
  email: string,               // creates account via Supabase admin auth
  payment_method_id?: string,  // Stripe PM (required if stake > 0)
  display_name?: string        // recipient's name (optional)
}

// DECLINE:
{
  token: string,
  action: 'decline'
}
```

**Accept path logic:**
1. Fetch vow by `challenge_invite_token`, validate `challenge_status === 'pending'` and `status === 'draft'`
2. Find existing user by email OR create new user via `supabase.auth.admin.createUser({ email })`
3. If `stake_amount > 0`:
   a. Get/create Stripe customer for recipient
   b. Create payment intent with `capture_method: 'manual'` and `payment_method: payment_method_id`
   c. Confirm payment intent server-side
   d. Capture payment intent
4. Update vow atomically:
   - `challenge_status` → `'accepted'`
   - `target_user_id` → recipient's user ID
   - `stake_amount` → recipient's chosen amount
   - `destination` → charity name
   - `stripe_payment_intent_id` → PI ID (if staked)
   - `status` → `'active'`
   - `sealed_at` → `now()`
5. Create audit events: `challenge_accepted`, `vow_sealed`
6. Push notification to challenger: `"{Name} accepted the vow. It's live."`

**Decline path logic:**
1. Validate same as above
2. Update: `challenge_status` → `'declined'`, `status` → `'voided'`
3. NO Stripe refund needed (challenger never paid, vow was draft)
4. Audit event: `challenge_declined`
5. Push to challenger: `"{Name} backed down from your dare."`

**Critical: Payment must succeed BEFORE updating vow status. If payment fails, return error, vow stays pending.**

#### `cron-runner/index.ts` — Add Task 8

```typescript
// TASK 8: Expire unanswered challenge dares after 48h
const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
const { data: expired } = await supabase
  .from('vows')
  .select('id, user_id, refined_text, target_phone')
  .eq('vow_type', 'challenge')
  .eq('challenge_status', 'pending')
  .eq('status', 'draft')
  .lt('created_at', cutoff);

for (const vow of expired ?? []) {
  await supabase.from('vows').update({
    challenge_status: 'expired',
    status: 'voided',
  }).eq('id', vow.id).eq('challenge_status', 'pending'); // atomic check

  await createAuditEvent(supabase, vow.id, 'challenge_expired', 'system');

  // Push to challenger
  await supabase.from('push_queue').insert({
    user_id: vow.user_id,
    title: 'Dare expired',
    body: "They didn't respond to your dare.",
    data: { route: '/dashboard' },
  });
}
```

### New Edge Functions
None required. Everything fits in modified `accept-challenge` + cron task.

### RLS / Access Patterns
**No changes.** Accept page server component uses service role key to fetch vow by token (same pattern as witness invite `/w/[token]`). Recipient gets `target_user_id` set on acceptance, covered by existing `vows_select_as_target` policy.

## UX Copy Doc

### Naming

| Location | Copy |
|---|---|
| Nav / button / sidebar | **Dare a friend** |
| Creation page title | **Dare a friend to an Unbreakable Vow** |
| Vow input label | "What can't they do?" |
| Vow input placeholder | "They can't..." |
| Name input label | "Who are you daring?" |
| Suggested stake label | "Suggest a stake" |
| Submit button | **Send the dare** |
| Post-creation header | **DARE SENT** |
| Post-creation subtext | "Waiting for {name}..." |
| Share CTA | **Share the dare →** |
| Copy link fallback | "Copy link" |
| Post-share subtext | "We'll notify you when they accept or back down." |
| Bottom CTA | "Dare someone else" |
| QuickVow link | "or **dare a friend →**" |
| Outcome screen CTA | **Challenge a friend** |
| URL | `/c/[token]` |

### Share Text
Pre-composed message for native share sheet (no branding):
```
I don't think you can {vowText}. Prove me wrong → {link}
```

### Accept Page Copy

**Screen 1 — The Dare:**
- Header: **AN UNBREAKABLE VOW**
- Subheader: "{Name} doesn't think you can"
- Body: "{vowText}" (quoted)
- Detail: "ends {date}" / "${amount} on the line" (if suggested)
- Primary CTA: **Accept the vow**
- Secondary: "back down" (small, dimmed, no button styling)

**Back Down — Gut Check Modal:**
- Header: "Are you sure?"
- Body: "{Name} will know you backed down."
- Primary CTA: **Go back** (recovery — gold button)
- Secondary: "I'm backing down" (small, dimmed)

**Back Down — Confirmed:**
- Header: "You backed down."
- Subtext: "{Name} has been notified."
- Link: "Make your own vow →"

**Screen 2 — Stakes (after accepting):**
- Header: "You accepted. Now make it real."
- Subtext: "If you fail, your money goes to charity."
- Chips: $10 / $25 / $50 / $100 (pre-select challenger's suggestion)
- Anchor: "{Name} suggested ${amount}" (if applicable)
- Skip: "or just my word"

**Screen 3 — Charity (if staked):**
- Header: "Where should the money go if you fail?"
- Options: St. Jude's / Feeding America / ALS Association / Local food bank
- Footer: "You won't be charged unless you fail."

**Screen 4 — Payment + Account:**
- Staked version:
  - Header: "Almost there."
  - Subtext: "${amount} held until your vow is resolved."
  - Primary: Apple Pay / Google Pay (platform-detected)
  - Secondary: "or pay with card" (expands Stripe Elements)
- $0 version:
  - Header: "Almost there."
  - Subtext: "Enter your email to seal the vow."
- Both versions:
  - Email input (required)
  - Phone input (optional)
  - CTA: **Seal the vow**
  - Footer: "By continuing you agree to the terms."

**Screen 5 — Sealed:**
- Header: **THE VOW IS SEALED**
- Details: vow text, stakes, charity, witness name, end date
- Flavor: "Oathkeeper has entered the chat. You'll hear from Oathkeeper soon."
- Primary CTA: **Track your vow →**
- App install: "Get the app for check-ins and updates" + App Store / Google Play badges
- App install appears ONLY here, AFTER seal. Never before.

### Notification Copy

| Event | Push Title | Push Body |
|---|---|---|
| Dare accepted | Vow accepted | "{Name} accepted the vow. It's live." |
| Backed down | They backed down | "{Name} backed down from your dare." |
| Expired (48h) | Dare expired | "They didn't respond to your dare." |

### OG Metadata

```typescript
openGraph: {
  title: 'AN UNBREAKABLE VOW',
  description: `${makerName} doesn't think you can ${truncate(vowText, 60)}. Accept or back down.`,
  images: [{ url: `/c/${token}/og`, width: 1200, height: 630 }],
  type: 'website',
  siteName: 'Unbreakable Vow',
}
twitter: {
  card: 'summary_large_image',
  // same title, description, image
}
```

**OG Image Design (1200x630px, generated via `@vercel/og`):**
- Background: near-black (#0A0A0F)
- "AN UNBREAKABLE VOW" — gold (#C8A84E), bold, 48px
- "{Name} doesn't think you can" — white, 24px
- "{vowText}" — white, quoted, 32px, max 3 lines, truncated
- "Accept or back down." — gray (#888), 20px
- "unbreakablevow.app" — gray (#666), 14px, bottom edge
- No app icon, no screenshots, no badges

## Build Phases

### Phase 1: Database + Edge Functions
**Size:** M

**Files to create:**
- `supabase/migrations/YYYYMMDD_challenge_v1.sql` — schema changes (suggested_stake_amount column, expired enum)

**Files to modify:**
- `supabase/functions/accept-challenge/index.ts` — full rewrite of accept path (create user, Stripe server-side, seal vow), simplify decline path (no refund)
- `supabase/functions/cron-runner/index.ts` — add Task 8 for 48h expiration
- `supabase/functions/_shared/sms-templates.ts` — update challenge copy if needed

**What to build:**
1. Write and apply migration
2. Rewrite `accept-challenge` accept path: validate → create/find user by email → Stripe PI (if staked) → update vow to active → audit events → push notification
3. Simplify `accept-challenge` decline path: validate → void vow → audit → push (no Stripe refund needed)
4. Add cron task: query pending challenges older than 48h → expire → notify
5. Ensure atomicity: update query includes `.eq('challenge_status', 'pending')` to prevent race conditions

**Verification:**
- [ ] Migration applies cleanly, `suggested_stake_amount` column exists
- [ ] `accept-challenge` accept with $0 stake: vow becomes active, no Stripe calls
- [ ] `accept-challenge` accept with $25 stake: PI created + captured, vow becomes active
- [ ] `accept-challenge` decline: vow voided, no Stripe operations
- [ ] `accept-challenge` with already-accepted vow: returns 409
- [ ] Cron expires 48h+ pending dares, pushes notification
- [ ] Existing self-vow `seal-vow` flow works unchanged

---

### Phase 2: Challenger Flow (Web)
**Size:** M

**Files to create:**
- `web/src/app/cast/page.tsx` — Dare creation page with title "Dare a friend to an Unbreakable Vow", vow input, name input, deadline chips, suggested stake chips, "Send the dare" button, post-creation share screen with `navigator.share()`, copy link fallback, "Dare someone else" CTA

**Files to modify:**
- `web/src/app/create/page.tsx` — Remove "Me / Someone else" toggle (delete `vowType` state, `ChoiceChip` toggle, target input section, and challenge branch in insert logic). Add "or **dare a friend →**" link below vow input, hidden for first-time users. To detect returning users: query `supabase.from('vows').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active').or('status.eq.kept,status.eq.broken')` — show the link if count > 0.
- `web/src/app/vow-broken/page.tsx` — Activate "Challenge a friend" button: change label from "Challenge a friend — coming soon" to "Challenge a friend", add `router.push('/cast')` as onPress handler
- `web/src/app/vow-kept/page.tsx` — Add "Challenge a friend" SecondaryButton with `router.push('/cast')`
- `web/src/app/dashboard/page.tsx` — Add "Dare a friend" card/button for returning users, routing to `/cast`

**What to build:**
1. Build `/cast` page following existing create page patterns (RitualScreen, RitualCard, TitleBlock, PrimaryButton, ChoiceChip from `ui.tsx`)
2. Vow insert: `vow_type: 'challenge'`, `status: 'draft'`, `challenge_status: 'pending'`, `challenge_invite_token: crypto.randomUUID()`, `witness_user_id: currentUser.id`, `suggested_stake_amount` in cents, `stake_amount: 0`
3. Share screen: `navigator.share({ text: "I don't think you can {x}. Prove me wrong → {link}" })` with fallback to clipboard copy
4. Clean up `/create` page — remove all challenge-related code, keep personal vow flow clean
5. Activate outcome screen CTAs

**Verification:**
- [ ] `/cast` page renders with all inputs
- [ ] Creating a dare inserts correct vow row (draft, pending, challenge type)
- [ ] Share sheet opens with pre-composed text and correct link
- [ ] Copy link copies correct URL to clipboard
- [ ] "Challenge a friend" on `/vow-broken` and `/vow-kept` routes to `/cast`
- [ ] "or dare a friend →" link appears on `/create` for returning users, hidden for first-time
- [ ] `/create` no longer shows "Me / Someone else" toggle
- [ ] Personal vow creation on `/create` works unchanged end-to-end

---

### Phase 3: Accept Page (Web)
**Size:** L

**Files to modify:**
- `web/src/app/c/[token]/page.tsx` — Update `generateMetadata()`: title "AN UNBREAKABLE VOW", description with maker name + vow text, OG image URL `/c/[token]/og`, twitter card `summary_large_image`. Fetch `suggested_stake_amount` in vow query. Pass to client.
- `web/src/app/c/[token]/client.tsx` — Full rewrite of pending state into multi-step flow:
  - Step 1 (dare): "AN UNBREAKABLE VOW" header, "{Name} doesn't think you can", vow text, "Accept the vow" / "back down"
  - Back down: gut-check modal → confirm → call accept-challenge(decline) → show backed-down state
  - Step 2 (stakes): chips with suggested pre-selected, "or just my word"
  - Step 3 (charity): curated list, one tap (skip if $0)
  - Step 4 (payment + account): email input, Apple Pay / Stripe Elements (skip payment if $0), "Seal the vow"
  - Step 5 (sealed): "THE VOW IS SEALED", details, "Track your vow →", app install badges
  - All steps are client-side state transitions (useState step counter), not page navigations
  - Single call to `accept-challenge` edge function at the end with all collected data
  - Stripe: use `@stripe/stripe-js` + `@stripe/react-stripe-js` for payment method collection (Elements). For Apple Pay, use Payment Request API.
  - Keep existing accepted/declined display states for already-responded dares
- `web/src/app/c/[token]/not-found-client.tsx` — Update copy for expired/invalid states

**What to build:**
1. Multi-step accept flow with smooth transitions (no page reloads)
2. Stripe Elements integration for card payment (existing Stripe config in the app)
3. Apple Pay / Google Pay via Payment Request Button
4. Email + phone collection
5. Loading states during accept-challenge call
6. Error handling: payment failures (show error, stay on payment step), network errors, 409 (already responded)
7. Responsive design: works on mobile Safari, Chrome, desktop
8. Dark theme matching existing app aesthetic

**Verification:**
- [ ] Pending dare shows full accept page with correct copy
- [ ] Accept → $25 stake → charity → email + card → seal: vow is active in DB, PI captured
- [ ] Accept → $0 → email only → seal: vow is active, no Stripe calls
- [ ] Back down → gut check → confirm: vow voided, challenger notified
- [ ] Back down → gut check → "Go back": returns to dare screen
- [ ] Already-accepted dare shows accepted state
- [ ] Already-declined dare shows declined state
- [ ] Expired dare shows expired state
- [ ] Invalid token shows not-found
- [ ] Mobile Safari, Chrome, desktop all render correctly
- [ ] Payment failure shows error, allows retry
- [ ] Double-tap on accept: second call returns 409, handled gracefully

---

### Phase 4: OG Image
**Size:** S

**Files to create:**
- `web/src/app/c/[token]/og/route.tsx` — Dynamic OG image generation using `@vercel/og` (ImageResponse). Edge runtime. Fetches vow + maker name by token. Renders 1200x630 PNG: dark bg (#0A0A0F), "AN UNBREAKABLE VOW" in gold (#C8A84E), "{Name} doesn't think you can" in white, vow text in white (truncated to 3 lines), "Accept or back down." in gray, domain subtle at bottom. Cache-Control: public, max-age=86400. Fallback for expired/invalid tokens (generic branded image).

**What to build:**
1. Route handler that returns `ImageResponse`
2. Supabase service-role query for vow data
3. Font loading (bold weight for headers)
4. Text truncation for long vow text
5. Fallback image for invalid/expired tokens
6. Edge caching headers

**Verification:**
- [ ] GET `/c/[token]/og` returns a PNG image
- [ ] Image shows challenger name and vow text
- [ ] Long vow text is truncated cleanly
- [ ] Invalid token returns fallback image (not an error)
- [ ] Share link in iMessage renders rich preview with image
- [ ] Share link in WhatsApp renders rich preview
- [ ] Share link in Slack renders rich preview

---

### Phase 5: Challenger Flow (Expo)
**Size:** M

**Files to create:**
- `expo/app/cast.tsx` — Dare creation screen. Same flow as web `/cast`: title "Dare a friend to an Unbreakable Vow", vow text input, "Who are you daring?" name input, deadline chips, suggested stake chips, "Send the dare" button. Uses existing components from `vow-ui.tsx` (DO NOT MODIFY `vow-ui.tsx`) and any standard React Native components. Post-creation share screen using `Share.share()` from React Native with pre-composed text. "Dare someone else" / "Dashboard →" CTAs. Supabase insert follows same pattern as web.

**Files to modify:**
- `expo/app/_layout.tsx` — Add `cast` screen to Stack.Screen list
- `expo/app/vow-broken.tsx` — Activate "Challenge a friend" button: remove "coming soon" suffix, add `router.push('/cast')` handler
- `expo/app/vow-kept.tsx` — Add "Challenge a friend" button with `router.push('/cast')` (if not already present)
- `expo/app/dashboard.tsx` — Add "Dare a friend" entry point card for returning users
- `expo/app/quick-vow.tsx` — Add "or **dare a friend →**" link, remove any challenge toggle code if present

**What to build:**
1. `/cast` screen using existing UI patterns from other Expo screens
2. Supabase vow insert (same fields as web)
3. Native share sheet: `Share.share({ message: "I don't think you can {x}. Prove me wrong → {link}" })`
4. Post-share state update
5. Navigation wiring from all entry points

**Rork note:** The `cast.tsx` screen follows existing patterns (text inputs, chips, buttons) already established in quick-vow.tsx and other screens. Build directly in Claude Code rather than Rork scaffolding — the integration with Supabase and share sheet needs to be precise.

**Verification:**
- [ ] `/cast` screen renders with all inputs in Expo
- [ ] Creating a dare inserts correct vow row
- [ ] Native share sheet opens with correct text (test iOS + Android)
- [ ] "Challenge a friend" on outcome screens navigates to `/cast`
- [ ] "Dare a friend →" link on quick-vow routes to `/cast`
- [ ] Dashboard shows dare entry point
- [ ] Existing vow creation flow unchanged

---

### Phase 6: Notifications + Polish
**Size:** S

**Files to modify:**
- `supabase/functions/accept-challenge/index.ts` — Verify push notification copy matches spec exactly
- `supabase/functions/cron-runner/index.ts` — Verify expiration push copy

**What to build:**
1. End-to-end testing of full flow
2. Verify all push notifications arrive with correct copy
3. Test edge cases: expired dares, double-tap, invalid tokens, $0 vs staked paths
4. Cross-platform testing: web → web, Expo → web (accept page is always web)
5. Smoke test all existing flows: personal vow creation, witness invite, seal, verdict, outcome

**Verification:**
- [ ] Full E2E: create dare (web) → share → accept (web) → stakes → pay → seal → notifications
- [ ] Full E2E: create dare (Expo) → share → accept (web) → stakes → pay → seal → notifications
- [ ] $0 path works end-to-end (no Stripe)
- [ ] Back down path works end-to-end
- [ ] Expiration works (create dare, wait or manually set created_at to 49h ago)
- [ ] Push notifications: accepted, backed down, expired — all correct copy
- [ ] Existing flows: personal vow create → seal → live → verdict → outcome — all still work
- [ ] Witness invite flow unchanged
- [ ] No regressions on dashboard, history, settings

## Implementation Notes

### Stripe in Edge Functions
The existing `accept-challenge` uses raw `fetch()` calls to the Stripe API (not a Stripe SDK). The new accept path should follow the same pattern — direct API calls with `STRIPE_SECRET_KEY` from env. See `create-payment-intent/index.ts` for the Stripe customer creation pattern (also raw fetch).

### Stripe on Web Client
`@stripe/react-stripe-js` and `@stripe/stripe-js` are already installed in the web app. `web/src/components/payment-form.tsx` has an existing `Elements` + `PaymentElement` setup. Reference this for the accept page's card payment UI. DO NOT MODIFY `payment-form.tsx` — build a new payment component for the challenge accept flow.

### navigator.share()
Already used across the web app (share-button.tsx, vow-kept, vow-broken, live, outcome pages). Follow the same pattern: check `navigator.share` exists, fallback to clipboard copy.

### Share on Expo
Use React Native's built-in `Share.share()` — already the standard pattern in RN apps.

## Assumptions

1. **`@vercel/og` is available** in the current Next.js setup (included with Next.js 13+, should be fine with 16.2.2)
2. **Supabase admin auth** (`supabase.auth.admin.createUser`) is available from edge functions using service role key
3. **Apple Pay on mobile web** requires the domain to be verified with Apple. If not set up, card payment is the fallback.
4. **Push tokens exist** for challengers — they must have the app installed and push enabled to receive notifications. If not, they see the update when they next open the app.
5. **The existing charity list** used in the stake flow is acceptable for challenges (same charities)
6. **No rate limiting needed** on dare creation for V1 — a user could spam dares, but social dynamics self-regulate this

## Expert Panel Notes

- **CTO:** Architecture is minimal — one new column, one modified function, one cron task. Server-side Stripe in edge function is correct for unauthenticated recipients. OG image should be edge-cached (24h TTL).
- **Nikita Bier:** Share text must stay first-person and unbranded. "Dare someone else" CTA on post-share screen is critical for dare volume from power users. Email collection before seal is a potential conversion killer — monitor and consider deferring to V2 if drop-off is high.
- **Product Manager:** Four screens to a live vow (dare → stakes → charity → payment). Under 60s for $0. Under 90s for staked. Progressive disclosure of dare option (hidden for first-timers) is correct.
- **QA Expert:** Atomicity on accept (`.eq('challenge_status', 'pending')` in update) prevents race conditions. Payment must succeed before vow status update. Test Apple Pay on Safari specifically. Handle 409 (already responded) gracefully in client.
- **Architect:** Blast radius is contained. No changes to: seal-vow, create-payment-intent, submit-verdict, accept-witness, send-sms, ui.tsx, vow-ui.tsx, auth-provider.tsx, supabase.ts, vow-logic.ts, middleware.ts, RLS policies, existing migrations. Highest-risk change (accept-challenge) is an isolated function with no other callers.
- **Designer:** Naming escalation (dare → vow → sealed) mirrors the product experience. OG image: dark on light chat backgrounds = maximum contrast. "AN UNBREAKABLE VOW" as accept page header is the brand moment. Sealed screen should feel like a door closing.

## Files Reference — DO NOT MODIFY

These files must not be changed (per CLAUDE.md):
- `web/src/components/ui.tsx`
- `web/src/components/auth-modal.tsx`
- `web/src/components/share-button.tsx`
- `web/src/providers/auth-provider.tsx`
- `web/src/lib/supabase.ts`
- `web/src/lib/vow-logic.ts`
- `web/src/middleware.ts`
- `web/src/app/layout.tsx`
- `web/src/app/globals.css`
- `expo/components/vow-ui.tsx`
- `expo/lib/supabase.ts`
- All existing migration files
- `supabase/functions/create-payment-intent/index.ts`
- `supabase/functions/send-sms/index.ts`
- `supabase/functions/verdict-page/index.ts`
