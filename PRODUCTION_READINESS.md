# Unbreakable Vow — Production Readiness Audit

## Current State

The app is a **complete UI prototype** — every screen is built, the flow is polished, animations are smooth, and the UX is excellent. But zero backend services are connected. No real money moves, no real texts send, no real auth happens. Every "functional" action just updates local React state.

---

## What's Real vs What's Mocked

| Feature | Status | What exists | What's missing |
|---|---|---|---|
| Vow creation flow | **Real** | Full input → refine → preview UI | Nothing — works as designed |
| Vow sharpening | **Real** | Regex-based analysis, frequency/duration chips | No AI/LLM sharpening (fine for v1) |
| Auth (Apple/Google/email) | **UI only** | Buttons that call `setAuthenticated(true)` | Real auth provider, tokens, sessions |
| Stripe payments | **UI only** | Amount selection, "Secure via Stripe" copy | Stripe SDK, payment intents, card collection |
| SMS / witness invites | **UI only** | Opens native Share sheet | Twilio, actual SMS delivery, delivery tracking |
| Group chat / Vowkeeper texts | **UI only** | Copy says "group text starts" | Twilio Conversations or similar, message storage |
| Vowkeeper AI check-ins | **UI only** | Proof mode selection UI | OpenAI integration, scheduled messages, photo handling |
| Witness verdict | **UI only** | Kept/broken tap → outcome screen | Backend verdict storage, payment trigger, notifications |
| Payment execution on "broken" | **UI only** | Shows "Payment processed" text | Stripe charge capture, receipt email |
| Contact picker | **Partial** | Hardcoded 5 contacts + manual name entry | Real device contacts via `expo-contacts` |
| Push notifications | **Not built** | Not referenced in code | `expo-notifications`, push service, device tokens |
| Data persistence | **Local only** | AsyncStorage for app state; React state for vow | Database, user accounts, vow records |
| History / past vows | **Hardcoded** | 3 mock entries in `unbreakable.ts` | Real query from database |
| Challenges | **Hardcoded** | 7 mock challenges, all disabled | Backend, participant tracking |
| Deep linking | **Configured** | Scheme `rork-app` set in app.json | Real invite URLs, universal links, AASA file |
| Settings | **UI only** | Toggle switches, menu items | Real preference storage, account management |

---

## Everything You Need To Do

### Phase 1: Backend & Database (do this first)

#### 1.1 Choose and set up backend

**Recommended: Supabase** (Postgres + Auth + Realtime + Edge Functions — one platform)

- [ ] Create Supabase project at supabase.com
- [ ] Get project URL + anon key + service role key
- [ ] Install `@supabase/supabase-js` in the Expo project

**Alternative: Custom backend** (Node.js/Express or Next.js API routes) — more control but more work.

#### 1.2 Database schema

You need these tables:

```sql
-- Users (handled by Supabase Auth, but you need a profile)
users (
  id uuid PRIMARY KEY references auth.users,
  name text,
  phone text,
  email text,
  created_at timestamp,
  stripe_customer_id text
)

-- Vows
vows (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users,
  text text NOT NULL,
  raw_input text,
  status text DEFAULT 'active', -- active, kept, broken, expired
  witness_name text,
  witness_phone text,
  witness_user_id uuid REFERENCES users, -- if witness is also a user
  witness_invite_method text, -- sms, link
  witness_accepted boolean DEFAULT false,
  stake_amount integer NOT NULL, -- cents
  consequence text, -- charity, witness, anti
  destination text, -- "ALS Association", etc.
  proof_mode text, -- word, screenshot
  verdict text, -- kept, broken, null (pending)
  verdict_at timestamp,
  starts_at timestamp DEFAULT now(),
  ends_at timestamp NOT NULL,
  sealed_at timestamp,
  created_at timestamp DEFAULT now()
)

-- Crew members (multiplayer)
vow_crew (
  id uuid PRIMARY KEY,
  vow_id uuid REFERENCES vows,
  name text,
  phone text,
  invite_method text,
  invited_at timestamp,
  accepted boolean DEFAULT false
)

-- Payments
payments (
  id uuid PRIMARY KEY,
  vow_id uuid REFERENCES vows,
  user_id uuid REFERENCES users,
  stripe_payment_intent_id text,
  amount integer, -- cents
  status text, -- hold, captured, released, failed
  destination text,
  created_at timestamp
)

-- Messages (for the group chat)
messages (
  id uuid PRIMARY KEY,
  vow_id uuid REFERENCES vows,
  sender_type text, -- user, witness, crew, vowkeeper
  sender_name text,
  content text,
  channel text, -- sms, in_app
  twilio_sid text,
  created_at timestamp
)
```

#### 1.3 Environment variables

Create a `.env` file (add to `.gitignore`):

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
OPENAI_API_KEY=sk-...  (only if using AI sharpening)
```

For Expo, use `expo-constants` + `app.config.js` (not `app.json`) to inject env vars at build time.

---

### Phase 2: Authentication

#### 2.1 Sign up for services

- [ ] **Apple Developer Program** ($99/year) — required for Apple Sign-In AND App Store submission
- [ ] **Google Cloud Console** — create OAuth 2.0 credentials for Google Sign-In (free)
- [ ] **Supabase Auth** — enable Apple + Google + Email providers in dashboard (free tier available)

#### 2.2 Implementation

- [ ] Install `expo-apple-authentication` + `expo-auth-session`
- [ ] Configure Apple Sign-In in Apple Developer portal (create App ID, Service ID, configure domains)
- [ ] Configure Google Sign-In in Google Cloud Console (OAuth consent screen, credentials)
- [ ] Connect both to Supabase Auth
- [ ] Replace the stubbed `auth.tsx` with real auth flows
- [ ] Store auth tokens securely (Supabase handles session refresh)
- [ ] Add session persistence so users stay logged in

**Requires custom development build** — Apple Sign-In and Google Sign-In don't work in Expo Go. You'll need:
```bash
eas build --profile development --platform ios
```

#### 2.3 Approvals needed

- [ ] **Apple:** App ID with Sign In with Apple capability enabled
- [ ] **Google:** OAuth consent screen approved (starts in "Testing" mode, needs verification for 100+ users)

---

### Phase 3: Payments (Stripe)

#### 3.1 Sign up

- [ ] Create Stripe account at stripe.com
- [ ] Complete business verification (SSN, bank account for payouts)
- [ ] Get publishable key + secret key
- [ ] Enable Stripe Connect if you want to pay out to witnesses directly

#### 3.2 Payment flow design

The payment model is: **authorize on seal, capture on broken verdict, release on kept verdict.**

```
User seals vow
  → Stripe creates PaymentIntent with `capture_method: 'manual'`
  → Card is authorized (hold placed), NOT charged
  → PaymentIntent ID stored in `payments` table

Verdict: KEPT
  → Cancel the PaymentIntent (releases the hold)
  → No charge

Verdict: BROKEN
  → Capture the PaymentIntent (charges the card)
  → Transfer to charity / witness / anti-charity
```

#### 3.3 Implementation

- [ ] Install `@stripe/stripe-react-native`
- [ ] Add Stripe plugin to `app.json`
- [ ] Build a server-side endpoint (Supabase Edge Function or separate API) that creates PaymentIntents — **Stripe secret key must NEVER be in the mobile app**
- [ ] Add payment sheet to `seal.tsx` — user enters card before sealing
- [ ] Store PaymentIntent ID in database
- [ ] Build verdict webhook: on verdict submission, capture or cancel the PaymentIntent
- [ ] Handle edge cases: expired holds (Stripe holds expire after 7 days for most cards — this is tight), declined cards, insufficient funds

#### 3.4 Charity payouts

- [ ] For "charity" consequence: you receive the money, then donate manually (simplest v1) OR use Stripe Connect to route directly
- [ ] For "witness gets it": use Stripe Connect — witness needs to onboard as a connected account, or you pay out manually (simpler for v1: collect witness Venmo/PayPal and transfer)
- [ ] For "anti-charity": same as charity, different recipient

#### 3.5 Approvals needed

- [ ] **Stripe:** Business verification (1-3 days)
- [ ] **Apple:** In-app purchases are NOT needed here since you're charging for a service/donation, not digital content. But Apple may scrutinize this — frame it as "accountability service" not gambling.

#### 3.6 Critical risk: Stripe hold expiration

Stripe authorization holds expire after **7 days** on most cards. Your default vow duration is 7 days. This means:
- If verdict is delayed even slightly, the hold may expire
- **Mitigation:** Create the hold on seal, but if hold is about to expire (day 6), re-authorize. OR charge immediately on seal and refund on "kept" verdict. The refund model is simpler but means the user sees a charge immediately.

---

### Phase 4: SMS & Messaging (Twilio)

#### 4.1 Sign up

- [ ] Create Twilio account at twilio.com
- [ ] Buy a phone number ($1/month) — this is the "Vowkeeper" number
- [ ] Upgrade from trial (trial only sends to verified numbers)
- [ ] Register for A2P 10DLC (required for US SMS — takes 1-2 weeks for approval)

#### 4.2 A2P 10DLC Registration (CRITICAL — don't skip)

Twilio requires business registration for sending SMS in the US:
- [ ] Register your brand (business name, EIN or sole proprietor SSN, website)
- [ ] Register a campaign (describe what messages you're sending)
- [ ] Wait for approval (3-15 business days)
- [ ] Without this, your messages will be filtered/blocked by carriers

#### 4.3 Implementation

- [ ] Build server-side SMS endpoints (Supabase Edge Functions):
  - `POST /api/sms/invite` — send witness invite on vow seal
  - `POST /api/sms/crew-invite` — send crew invites
  - `POST /api/sms/checkin` — Vowkeeper check-in messages (scheduled)
  - `POST /api/sms/verdict-prompt` — nudge witness on verdict day
  - `POST /api/sms/outcome` — notify all parties of outcome
- [ ] Build incoming SMS webhook — Twilio posts to your server when someone replies
- [ ] Build the group thread: use Twilio Conversations API (not just individual SMS) for proper group messaging
- [ ] Schedule check-ins: use a cron job or Supabase pg_cron to trigger mid-week check-ins

#### 4.4 Vowkeeper AI (the bot personality)

- [ ] Write a system prompt for Vowkeeper's personality (motivating, brief, witty, not annoying)
- [ ] Decide: is Vowkeeper powered by OpenAI or is it templated messages?
  - **v1 recommendation:** templated messages (simpler, cheaper, more predictable)
  - Day 1: "Your vow is live. [Witness] is watching. Let's go."
  - Day 3-4: "Halfway check — how's [vow text] going?"
  - Day 6: "[Witness], verdict day is tomorrow. Be ready."
  - Day 7: "[Witness], time to call it. Tap here: [verdict link]"
- [ ] If using OpenAI: install `openai` SDK server-side, build response generation endpoint

#### 4.5 Costs

- SMS: ~$0.0079/segment sent + $0.0079/segment received (US)
- Phone number: $1.15/month
- Estimate per vow: ~15-20 messages × $0.008 = ~$0.12-0.16 per vow in SMS costs

---

### Phase 5: Notifications

#### 5.1 Implementation

- [ ] Install `expo-notifications`
- [ ] Set up push notification credentials (APNs for iOS, FCM for Android)
- [ ] Add push token registration on auth
- [ ] Trigger push notifications server-side for:
  - Witness invite received
  - Witness accepted
  - Vowkeeper check-in (supplement to SMS)
  - Verdict day reminder
  - Outcome notification
- [ ] Handle notification tap → deep link to correct screen

#### 5.2 Approvals needed

- [ ] **Apple:** Push notification capability in App ID (automatic with EAS)
- [ ] **Firebase:** Create Firebase project for FCM (Android push)

---

### Phase 6: Real Contact Picker

- [ ] Install `expo-contacts`
- [ ] Replace hardcoded witness list with native contact picker
- [ ] On iOS: uses `CNContactPickerViewController` (no permissions prompt needed — system picker)
- [ ] Extract name + phone number from selected contact
- [ ] Keep manual name entry as fallback

---

### Phase 7: Deep Linking & Invite URLs

#### 7.1 Setup

- [ ] Buy domain: `unbreakablevow.app` (or similar)
- [ ] Set up universal links (iOS) / app links (Android):
  - Host `.well-known/apple-app-site-association` file on your domain
  - Host `.well-known/assetlinks.json` for Android
- [ ] Configure `expo-linking` with your domain
- [ ] Update `app.json` scheme and origin

#### 7.2 Invite link flow

- [ ] Generate unique invite URLs: `unbreakablevow.app/invite/{vow_id}`
- [ ] Build a web landing page for the invite URL (for users who don't have the app):
  - Shows the vow details
  - "Accept as witness" button
  - App Store / Play Store download links
- [ ] If app is installed: deep link opens `witness-invite.tsx` with vow data loaded from API
- [ ] If app is NOT installed: web page shows info + download prompt

---

### Phase 8: App Store Submission

#### 8.1 Pre-submission

- [ ] Update `app.json`:
  - Change `bundleIdentifier` from `app.rork.vkqbtdzg60w057segl0gr` to your own (e.g., `com.unbreakablevow.app`)
  - Change `slug` to something readable
  - Change `scheme` from `rork-app` to `unbreakablevow`
  - Set splash background color to `#05070B` (matches app theme)
- [ ] Design app icon (PLAN.md shows this is still TODO)
- [ ] Create App Store screenshots (6.7" and 5.5" iPhones minimum)
- [ ] Write App Store description and keywords
- [ ] Create privacy policy and terms of service (REQUIRED for App Store)
- [ ] Set up App Store Connect listing

#### 8.2 EAS Build

```bash
bun i -g @expo/eas-cli
eas login
eas build:configure
eas build --platform ios --profile production
eas submit --platform ios
```

#### 8.3 Apple Review — potential issues

- [ ] **Gambling classification risk:** Apple may flag stake-based accountability as gambling. Mitigate by:
  - Framing as "charitable donation" and "accountability service"
  - Money goes to registered charities, not back to users (except witness payout)
  - Include in review notes: "This is not gambling. Users pre-commit funds to charity as an accountability mechanism. No randomness is involved — outcomes are determined by human behavior and a human witness."
- [ ] **Financial transactions:** Apple will want to see your Stripe integration works, privacy policy covers financial data, and you handle PCI compliance (Stripe handles this for you)
- [ ] **Anti-charities:** The "causes you dislike" feature (NRA, political figures) may raise content concerns. Consider making these less politically charged for v1, or frame carefully in review notes.

#### 8.4 Approvals needed

- [ ] **Apple Developer Program** membership ($99/year)
- [ ] **Google Play Console** registration ($25 one-time)
- [ ] **Privacy policy** hosted on your domain
- [ ] **Terms of service** hosted on your domain
- [ ] **DUNS number** if publishing as a company (not needed for individual)

---

## Complete Service Signup Checklist

| Service | Cost | What you get | Timeline |
|---|---|---|---|
| Apple Developer Program | $99/year | App Store + Apple Sign-In + push notifications | Instant (after payment) |
| Google Play Console | $25 one-time | Play Store publishing | Instant |
| Supabase | Free tier → $25/month pro | Database + Auth + Edge Functions + Realtime | Instant |
| Stripe | Free (2.9% + $0.30 per transaction) | Payment processing | 1-3 days (verification) |
| Twilio | $1.15/month + per-message | SMS messaging | Instant signup, 3-15 days for A2P registration |
| Domain (e.g., Namecheap) | ~$12/year | unbreakablevow.app | Instant |
| OpenAI (optional for v1) | Pay-per-use | AI-powered Vowkeeper responses | Instant |
| Google Cloud Console | Free | Google Sign-In OAuth | Instant |
| Vercel or similar (optional) | Free tier | Host invite landing page + AASA file | Instant |

**Total fixed costs:** ~$140/year + $25 one-time + per-transaction fees
**Per-vow variable cost:** ~$0.15 (SMS) + 2.9% + $0.30 (Stripe) per broken vow

---

## Biggest Risks

### 1. Stripe hold expiration (HIGH)
Authorization holds expire after 7 days on most card networks. Your default vow is 7 days. If the verdict is even 1 hour late, the hold drops and you can't charge. **Mitigation:** Charge on seal, refund on "kept." Or shorten default to 6 days with verdict on Day 7.

### 2. Apple App Review rejection (MEDIUM)
The stakes/money mechanic could be flagged as gambling. Political anti-charities could be flagged as controversial content. **Mitigation:** Frame carefully in review notes. Consider softening anti-charity options for initial review. Have a clear privacy policy and ToS.

### 3. A2P 10DLC registration delays (MEDIUM)
US carrier SMS filtering is aggressive. Without A2P registration, your messages will be silently dropped. Registration takes 3-15 business days. **Mitigation:** Start this process immediately — it's the longest lead time item.

### 4. SMS costs at scale (LOW for now)
At 1,000 vows/month × 15 messages each = 15,000 messages × $0.008 = $120/month. Manageable but grows linearly. **Mitigation:** Use push notifications as primary channel, SMS as fallback for non-app interactions (witness who doesn't have app).

### 5. Witness doesn't respond (MEDIUM)
If the witness ignores the verdict prompt, the vow is in limbo. Hold may expire. **Mitigation:** Auto-resolve after 48 hours past deadline. Send escalating reminders. Fallback: "If no verdict by [date+2], vow is considered kept" (lenient default).

### 6. Charity payout logistics (LOW)
Actually routing money to ALS Association, St. Jude, etc. requires you to either donate manually or set up Stripe Connect with each charity (unlikely). **Mitigation for v1:** Pool "broken" payments, donate in batches monthly. Show users a "Donation pending" receipt. Be transparent about the process.

---

## Suggested Flow/Setup Changes

### 1. Charge immediately, refund on kept (instead of hold + capture)
Avoids the 7-day hold expiration problem entirely. User sees a charge on seal day, gets a refund if they keep the vow. More reliable. Downside: some users may not like seeing a charge before they've even had a chance to keep the vow.

### 2. Push notifications first, SMS for critical moments only
Don't send every Vowkeeper message via SMS. Use push notifications for daily check-ins (free). Use SMS only for: witness invite, verdict prompt, and outcome notification. Cuts SMS costs by ~70%.

### 3. Default vow to 6 days, verdict on Day 7
Start on Monday, verdict on Sunday. This gives a clean buffer for the Stripe hold and feels natural ("you have this week").

### 4. Soften anti-charity options for v1 launch
Replace named political figures with categories: "A political cause you oppose", "An organization you disagree with" — lets users type their own. Reduces App Store review risk and political controversy.

### 5. Add verdict expiry with auto-resolve
If witness doesn't submit verdict within 48 hours of the deadline, auto-resolve as "kept" (benefit of the doubt). Notify both parties. Releases the payment hold/refunds. Prevents vows from being stuck forever.

### 6. Web-based witness experience
The witness doesn't need to download the app. Build a simple web page at `unbreakablevow.app/verdict/{vow_id}` where they can tap kept/broken. This removes the biggest friction point in the viral loop — the witness just clicks a link in their text.

### 7. Start with email auth, add Apple/Google later
Email auth works in Expo Go (no custom build needed). Apple/Google Sign-In require a custom development build. Start with email for faster iteration, add social auth before App Store submission.

---

## Step-by-Step Execution Plan

### Step 1: Backend setup (Week 1)
1. Create Supabase project
2. Build database schema (tables above)
3. Set up environment variables
4. Install `@supabase/supabase-js` in Expo project
5. Create API helper/client file
6. Connect auth.tsx to Supabase email auth (start with email only)

### Step 2: Core data flow (Week 1-2)
1. On seal: create vow record in Supabase
2. On verdict: update vow record
3. Replace hardcoded history with real Supabase query
4. Persist user session across app restarts
5. Load active vow on app open

### Step 3: Payments (Week 2-3)
1. Create Stripe account, complete verification
2. Install `@stripe/stripe-react-native`
3. Build Supabase Edge Function: `create-payment-intent`
4. Add payment sheet to seal flow
5. Build Edge Function: `capture-payment` (on broken verdict)
6. Build Edge Function: `cancel-payment` (on kept verdict)
7. Test full flow with Stripe test mode

### Step 4: SMS (Week 3-4)
1. Create Twilio account, buy phone number
2. **Start A2P 10DLC registration immediately** (long lead time)
3. Build Supabase Edge Functions for SMS sending
4. Implement: invite SMS on seal, verdict prompt on deadline
5. Build incoming SMS webhook for replies
6. Add Vowkeeper check-in messages (templated, cron-scheduled)

### Step 5: Real contacts + deep links (Week 4)
1. Install `expo-contacts`, replace hardcoded list
2. Buy domain, set up hosting
3. Configure universal links (AASA file)
4. Build web invite/verdict pages
5. Generate unique invite URLs per vow

### Step 6: Push notifications (Week 4-5)
1. Install `expo-notifications`
2. Set up APNs + FCM credentials
3. Register device tokens on auth
4. Send push for: witness accepted, check-ins, verdict reminder, outcome

### Step 7: Polish + custom build (Week 5-6)
1. Add Apple Sign-In + Google Sign-In (requires custom dev build)
2. Build with EAS: `eas build --profile development --platform ios`
3. Test full flow on real device
4. Edge case handling: expired holds, unresponsive witnesses, network errors

### Step 8: App Store prep (Week 6-7)
1. Update bundle ID, slug, scheme in app.json
2. Design app icon
3. Take App Store screenshots
4. Write privacy policy + terms of service
5. Create App Store Connect listing
6. Submit for review

---

## Claude Code Prompt

Use this prompt in Claude Code (from the `expo/` directory of the cloned repo) to start building:

```
I'm building the Unbreakable Vow app — a stakes-based accountability app built with
Expo/React Native. The full UI prototype is complete but has zero backend integration.
I need to make it production-ready.

The repo is at the current directory. Key files:
- app/ — all screens (index, refine, witness, stake, auth, seal, sent, live, verdict, etc.)
- constants/unbreakable.ts — vow analysis logic
- providers/vow-flow.tsx — state management
- providers/oath-state.tsx — local persistence

CURRENT STATE: Everything is UI-only. Auth just sets a boolean. Payments show
amounts but don't charge. SMS shows a Share sheet but doesn't send. History is
hardcoded. No database.

PHASE 1 — Set up Supabase backend:
1. Create a Supabase client file at lib/supabase.ts using @supabase/supabase-js
2. Create the database schema with tables: users, vows, vow_crew, payments, messages
3. Create an app.config.js that reads env vars (SUPABASE_URL, SUPABASE_ANON_KEY)
   from .env via dotenv
4. Replace the stubbed auth.tsx with real Supabase email/password auth
   (email + magic link for v1, Apple/Google later)
5. On seal: insert a vow record into Supabase with all fields
   (text, witness info, stake, dates)
6. On app open: check for active vow, load from Supabase, route to live screen
   if exists
7. Replace hardcoded history in history.tsx with a real Supabase query
   of past vows for the current user
8. Add session persistence so the user stays logged in across app restarts

Don't change the UI design or animations — keep the existing look and feel.
Only wire up the backend connections. Use the existing state management pattern
(React Context in providers/) and extend it to sync with Supabase.

After completing each file, briefly note what you changed and why.
```

---

## Rork vs Claude Code: What to Build Where

Rork is an AI app builder that generates and edits React Native/Expo code via natural language prompts. It's excellent for UI, component-level logic, and integrations it natively supports. But it has limits — anything requiring server-side infrastructure, complex API flows, or systems Rork doesn't have built-in connectors for needs Claude Code (or manual dev work).

### What Rork Can Do

| Capability | Details |
|---|---|
| **UI/UX screens & components** | Full screen generation, animations, styling, layout — its core strength |
| **Supabase integration** | One-click Supabase connect in project settings. Can generate client code, queries, auth flows, and RLS policies |
| **Firebase Auth** | Built-in Firebase auth support (alternative to Supabase Auth) |
| **RevenueCat payments** | Native RevenueCat integration for subscriptions and in-app purchases |
| **expo-* libraries** | Can install and wire up most Expo SDK modules (contacts, notifications, image picker, haptics, etc.) |
| **State management** | Zustand, React Context, AsyncStorage — generates and edits these fluently |
| **Basic API calls** | Can write `fetch` calls to external APIs (OpenAI, REST endpoints) from client code |
| **Navigation & routing** | expo-router screens, tabs, modals, deep link config |
| **App config** | `app.json` / `app.config.js` edits, splash screens, icons, schemes |
| **Deployment** | Can trigger EAS builds and help configure build profiles |

### What Rork Cannot Do (Use Claude Code Instead)

| Limitation | Why | Claude Code approach |
|---|---|---|
| **Supabase Edge Functions** | Rork operates on the Expo project only — it can't write or deploy server-side functions | Claude Code writes Edge Functions in TypeScript, deploys via `supabase functions deploy` |
| **Stripe authorize/capture flow** | Rork supports RevenueCat (subscriptions) but not custom Stripe flows with manual capture | Claude Code builds the Edge Function that creates PaymentIntents with `capture_method: 'manual'`, plus capture/cancel endpoints |
| **Twilio SMS integration** | No built-in Twilio connector. SMS requires server-side credentials, webhooks, and A2P registration | Claude Code builds Edge Functions for send/receive SMS, configures Twilio webhooks |
| **Webhook handlers** | Rork can't expose server endpoints that receive inbound requests (Twilio replies, Stripe events) | Claude Code writes Supabase Edge Functions that handle incoming webhooks |
| **Scheduled jobs / cron** | No cron support — can't schedule Vowkeeper check-in messages | Claude Code sets up `pg_cron` in Supabase or uses an external scheduler |
| **Complex server-side logic** | Verdict resolution, payment capture on verdict, auto-expire logic | Claude Code writes this as Edge Functions or database triggers |
| **Environment variables / secrets** | Rork can read env vars client-side but can't manage server-side secrets | Claude Code configures Supabase secrets via CLI (`supabase secrets set`) |
| **Database migrations** | Rork can generate SQL for Supabase but can't run migrations or manage schema versioning | Claude Code writes and applies migrations via `supabase db push` or migration files |
| **Universal links / AASA hosting** | Rork can configure the client-side deep link scheme but can't host the `.well-known` files | Claude Code sets up the web hosting (Vercel/Cloudflare) with AASA and assetlinks.json |
| **Web landing pages** | Witness verdict page, invite page — these are web, not React Native | Claude Code builds these as standalone pages (Next.js, static HTML, or Supabase Edge Function serving HTML) |

### Phase-by-Phase: Rork vs Claude Code

#### Phase 1: Backend & Database
| Task | Tool | Notes |
|---|---|---|
| Create Supabase project | **Manual** | Done in Supabase dashboard |
| Connect Supabase to Expo | **Rork** | Use Rork's one-click Supabase integration |
| Create database schema (SQL) | **Claude Code** | Write migration files, apply via CLI |
| Create `lib/supabase.ts` client | **Rork** | Rork generates this when connecting Supabase |
| Set up `app.config.js` with env vars | **Rork** | Prompt: "Convert app.json to app.config.js reading env vars from .env" |
| Row-level security policies | **Claude Code** | RLS policies are SQL — write and apply via CLI |

#### Phase 2: Authentication
| Task | Tool | Notes |
|---|---|---|
| Email/magic link auth UI | **Rork** | Prompt: "Replace stubbed auth with real Supabase email auth with magic link" |
| Apple Sign-In config | **Rork + Manual** | Rork wires up `expo-apple-authentication`; you configure Apple Developer portal manually |
| Google Sign-In config | **Rork + Manual** | Rork wires up `expo-auth-session`; you configure Google Cloud Console manually |
| Session persistence | **Rork** | Prompt: "Add Supabase session persistence so users stay logged in across restarts" |

#### Phase 3: Payments (Stripe)
| Task | Tool | Notes |
|---|---|---|
| Install `@stripe/stripe-react-native` | **Rork** | Prompt: "Add Stripe React Native SDK and configure in app.json" |
| Payment sheet UI in seal flow | **Rork** | Prompt: "Add Stripe payment sheet to seal screen, collecting card before sealing" |
| `create-payment-intent` Edge Function | **Claude Code** | Server-side Stripe secret key usage — must be an Edge Function |
| `capture-payment` Edge Function | **Claude Code** | Called on broken verdict |
| `cancel-payment` Edge Function | **Claude Code** | Called on kept verdict |
| Stripe webhook handler | **Claude Code** | Receives Stripe events (payment succeeded, failed, etc.) |

#### Phase 4: SMS & Messaging (Twilio)
| Task | Tool | Notes |
|---|---|---|
| A2P 10DLC registration | **Manual** | Done in Twilio console — start immediately |
| SMS send Edge Functions | **Claude Code** | All server-side: invite, check-in, verdict prompt, outcome |
| Incoming SMS webhook | **Claude Code** | Edge Function that receives Twilio POST requests |
| Vowkeeper check-in scheduler | **Claude Code** | `pg_cron` job or scheduled Edge Function |
| Vowkeeper message templates | **Claude Code** | Server-side logic determining which message to send when |

#### Phase 5: Contacts & Deep Links
| Task | Tool | Notes |
|---|---|---|
| Real contact picker | **Rork** | Prompt: "Replace hardcoded witness list with expo-contacts native picker" |
| Configure deep link scheme | **Rork** | Prompt: "Update app.json scheme to unbreakablevow and configure expo-linking for universal links" |
| Host AASA / assetlinks.json | **Claude Code** | Web hosting config — not React Native |
| Build web invite landing page | **Claude Code** | Standalone web page, not part of the Expo app |
| Build web verdict page | **Claude Code** | Witness taps link in SMS, sees web page to submit verdict |

#### Phase 6: Push Notifications
| Task | Tool | Notes |
|---|---|---|
| Install & configure expo-notifications | **Rork** | Prompt: "Add push notifications with expo-notifications, register device token on auth" |
| APNs + FCM credential setup | **Manual** | Apple Developer portal + Firebase console |
| Server-side push sending | **Claude Code** | Edge Functions that send push via Expo's push API |
| Notification tap → deep link routing | **Rork** | Prompt: "Handle notification taps to deep link to the correct screen based on notification type" |

#### Phase 7: Polish & Custom Build
| Task | Tool | Notes |
|---|---|---|
| Vow sharpening bug fixes | **Rork** | Feed it the sharpening prompt from the audit — contextual suggestions, text input on vague screen, deadline "by when?" |
| Crew/multiplayer UI | **Rork** | Prompt with the crew feature design |
| Error states & loading UI | **Rork** | Prompt: "Add error and loading states to all screens that fetch data" |
| EAS build configuration | **Rork + Manual** | Rork can help generate `eas.json`; you run `eas build` from CLI |
| Edge case handling (expired holds, unresponsive witness) | **Claude Code** | Server-side auto-resolve logic, re-authorization flows |

#### Phase 8: App Store
| Task | Tool | Notes |
|---|---|---|
| Update bundle ID, slug, scheme | **Rork** | Prompt: "Update app.json bundle identifier to com.unbreakablevow.app, slug to unbreakable-vow, scheme to unbreakablevow" |
| App icon design | **Manual** | Design tool (Figma, etc.) |
| App Store screenshots | **Manual** | Run on simulator, take screenshots |
| Privacy policy & ToS | **Claude Code** | Generate legal docs, host on web |
| EAS submit | **Manual** | `eas submit --platform ios` from CLI |

### Summary: The Split

**Rork handles ~40% of the work** — all client-side UI, Supabase client integration, auth flows, Expo SDK modules, state management, navigation, and app config.

**Claude Code handles ~45% of the work** — all server-side logic (Edge Functions), Stripe payment flows, Twilio SMS, webhooks, cron jobs, database migrations, RLS policies, web pages (invite/verdict), universal link hosting, and complex business logic.

**Manual work is ~15%** — service signups (Stripe, Twilio, Apple, Google), A2P registration, APNs/FCM credential setup, app icon design, screenshots, and App Store submission.

### Optimal Workflow

1. **Start in Rork** — build the Supabase connection, auth, and any UI fixes (sharpening bugs, crew feature)
2. **Switch to Claude Code** — clone the repo locally, build all Edge Functions, database migrations, Twilio/Stripe integrations, web pages
3. **Push Claude Code changes** → pull into Rork to see them in the live preview
4. **Iterate in Rork** for any UI polish needed after backend is connected
5. **Final build and submit** from CLI using EAS
