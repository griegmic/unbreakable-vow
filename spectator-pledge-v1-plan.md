# Spectator Pledge — V1 Product Plan

## Expert Panel Evaluation for Unbreakable Vow

---

## Current App Summary (What Exists Today)

Before designing anything new, here's what the app does today:

**The core loop:** A user (the "maker") types a commitment — "I'll do my taxes by Sunday." The app refines it into something specific and measurable. The maker picks a witness (usually a friend), optionally stakes $10–$100 to charity, and seals the vow. The witness gets an SMS with a link. They accept, watch the clock tick, and when the deadline passes, they deliver a verdict: kept or broken. If kept, the money is refunded. If broken, it goes to charity.

**Key mechanics already built:**
- Linear creation flow: input → refine → witness → stake → seal → sent
- Stripe manual-capture payment (authorized on seal, refunded on kept, captured on broken)
- SMS-based witness flow — no app install required for witnesses
- Token-based access for witnesses and challenge targets (no account needed)
- Dashboard with active/witnessing/history sections
- Challenge/dare system (maker challenges someone else to do something)
- Certificate and outcome pages with OG meta tags for sharing
- ShareButton component using native share API / clipboard fallback
- Cron-based notifications: reminders, warmup SMS, verdict requests, auto-resolve at 72h
- Audit event trail for all state changes

**The two-actor model:** Every vow has exactly two people — a maker and a witness. The witness is the sole judge. There's no audience. No spectators. No social proof beyond the one-to-one relationship.

This is the gap Spectator Pledge fills.

---

## Phase 1: Shreyas Doshi — Strategic Analysis & Deep Customer Empathy

### LNO Classification: **Leverage (L)**

This is unambiguously a Leverage task. Here's why:

The app's current architecture is a closed two-person system. Every vow creates exactly one notification to one person. The viral coefficient is structurally capped at ~1. No matter how good the product is, growth can only happen linearly — one maker invites one witness, that witness might eventually make their own vow and invite one person.

Spectator Pledge breaks the structural ceiling. It turns every vow from a private contract into a potential social event. One vow could reach 3-8 new people, each of whom enters the app's ecosystem. This isn't a feature — it's a change in the product's growth physics.

**Opportunity cost check:** What else could you build instead? More creation options, better analytics, social feeds? None of those change the fundamental growth equation. This does.

### Jobs to Be Done — By User Type

#### The Vow-Maker

**Underlying human need:** To be held accountable not just by one person, but by their community. The real motivation isn't "I want people to pledge" — it's "I want to feel like failing isn't private." The difference between telling one friend you'll go to the gym and announcing it to eight is enormous. The maker wants the weight of social expectation to make it impossible to quietly bail.

**Emotional journey:**
- **Creation:** Same as today. Nothing changes. They don't think about spectators.
- **Post-seal discovery:** They learn people are watching. "$45 pledged by 6 friends if you succeed." This is the magic moment — it transforms a private commitment into something that has social gravity.
- **During the vow:** Every check-in or update now has an audience. The maker feels *watched* in a productive way. Not surveillance — support with stakes.
- **Verdict moment:** If they succeed, the emotional payoff is amplified. Not just "$25 refunded" but "$85 going to charity BECAUSE you followed through." Their success has real-world impact beyond themselves.
- **Post-verdict:** The certificate becomes worth sharing. "I kept my vow and my friends donated $85 to St. Jude's because of it." This is an identity statement.

**What creates pull:** The maker doesn't need to DO anything. The value arrives without effort — the witness shares, spectators appear, and suddenly the maker's commitment matters to more people.

**What creates friction:** If the maker feels performing for an audience rather than keeping a commitment. If the pledges feel like surveillance or pressure rather than support.

**What brings them back:** The post-verdict high of "my success caused real good in the world." This is a stronger dopamine hit than "I got my money back."

#### The Witness

**Underlying human need:** Social capital. The witness accepted a role — judge — and spectator pledge gives them a second role: curator. They're the person who says "look at what my friend is doing, put your money where your mouth is." This is the friend who organizes the group chat, who coordinates the birthday surprise, who brings people together. Sharing the vow is an expression of their social identity.

**Emotional journey:**
- **Post-acceptance:** They've just accepted as witness. They feel invested. The app now says: "Want to make this bigger? Share Joey's vow and let friends pledge to charity if he succeeds." This hits at the peak of their engagement.
- **Sharing:** They're not selling the app. They're sharing a story about their friend. "Joey vowed to do his taxes by Sunday and put $50 on it. Pledge to charity if you think he'll do it." This is gossip with stakes.
- **Watching pledges arrive:** Every new pledge validates their role as connector. "4 people pledged because I shared this." Social proof of their social influence.
- **Verdict delivery:** The stakes are now higher. They're not just judging one friend — their judgment triggers charitable donations from multiple people. This makes the verdict feel important and considered.

**What creates pull:** The share moment has to feel like sharing a good story, not promoting an app. The witness must feel like a participant, not a marketing channel.

**What creates friction:** If sharing feels salesy or spammy. If friends react with "why are you sending me this." If the share requires explanation.

**What brings them back:** Seeing the impact — "$85 donated because you shared Joey's vow."

#### The Spectator

**Underlying human need:** Low-cost generosity with social bonding. The spectator wants to (a) support a friend's goal, (b) do something good for charity, and (c) participate in a social moment — all for $5. This is the price of a coffee spent on saying "I believe in you" in a way that actually means something.

**Emotional journey:**
- **Link tap (0-3 seconds):** "What is this?" They see a clean page: Joey vowed to do his taxes by Sunday. $50 on the line. 4 friends have pledged $35 to charity. "Pledge $5–$20 to charity if Joey succeeds." Instant comprehension. One concept.
- **Decision (3-15 seconds):** The social proof ("4 friends pledged") plus the low cost ($5) plus the charity framing makes this a near-automatic yes. This isn't a financial decision — it's a social one.
- **Pledge (15-30 seconds):** Apple Pay / Google Pay. Card saved. Done. The confirmation says: "You pledged $10. If Joey keeps his vow, $10 goes to St. Jude's. You'll only be charged if he succeeds."
- **Waiting period:** They get a text or push when the verdict lands. Otherwise, they can forget about it. No engagement required. The low maintenance is a feature, not a bug.
- **Verdict notification:** "Joey kept his vow! Your $10 is going to St. Jude's." OR "Joey didn't make it. Your pledge is released — you won't be charged." Both outcomes feel resolved and fair.
- **Post-verdict:** The conversion moment. "Make your own vow" or "Challenge a friend." They've now experienced the app's core mechanic without creating an account, and the emotional residue (generosity + social bonding) primes them to try it.

**What creates pull:** It's cheap, it's for charity, it supports a friend, and it takes 30 seconds. There's almost no reason NOT to do it.

**What creates friction:** Payment. Even Apple Pay is a speed bump. Any confusion about "wait, do I get charged now or later?" kills momentum. Any sense that this is betting or gambling creates moral hesitation.

**What brings them back:** The verdict notification. This is the re-engagement hook — a guaranteed reason to return.

### Pre-Mortem: Top 5 Failure Modes

**1. TIGER — Spectators don't understand the payment model**
"Wait, I only get charged if they succeed? So if they fail, I don't pay? That sounds like betting." If spectators perceive this as a prediction market or gambling, the feature is dead on arrival. People won't share it, won't pledge, and it'll attract the wrong kind of attention.

*Mitigation:* The word "pledge" and the word "charity" must appear in every single touchpoint. The framing is always "conditional charitable donation" never "bet" or "wager." The pledge page must say explicitly: "This is a donation to charity. You're not betting. You're supporting Joey AND [charity name]." The copy does the heavy lifting here — this is a copywriting problem more than a product problem.

**2. TIGER — Witnesses don't share**
The entire viral loop depends on witnesses choosing to share. If the share prompt feels like spam, if it interrupts the witness flow, or if the witness doesn't understand WHY they should share, the feature generates zero spectators.

*Mitigation:* Share must be opt-out, not opt-in. After accepting as witness, the default next screen is "Share Joey's vow." The witness has to actively dismiss it. The share text must be pre-written, compelling, and feel like sharing a story, not promoting an app. Test this copy relentlessly.

**3. TIGER — Payment friction kills conversion**
Every additional tap between "I want to pledge" and "pledged" loses spectators exponentially. If spectators have to enter a credit card manually on mobile, conversion will be single digits.

*Mitigation:* Apple Pay and Google Pay must be the primary payment methods. Card entry is a fallback. The pledge amount should be pre-selected (default $5) with one-tap alternatives ($10, $20). Stripe Payment Request API handles this — it's one tap on mobile.

**4. ELEPHANT — The feature adds complexity for users who don't want it**
The prompt says "zero new screens, zero new prompts" for users who don't use spectators. But every new feature creates cognitive overhead. If makers start seeing pledge counts and spectator activity in their vow detail view, it changes the emotional character of the app from "private accountability" to "public performance."

*Mitigation:* Spectator activity is INVISIBLE to the maker until someone pledges. No empty states like "$0 pledged by 0 friends." The pledge section appears only when pledges exist. For vows with no spectators, the experience is byte-for-byte identical to today.

**5. PAPER TIGER — "Nobody will pay $5 for someone else's vow"**
This sounds plausible but isn't. People pay $5 for birthday card apps, coffee gifts, GoFundMe donations to strangers, Twitch bits for streamers. $5 for a conditional charity donation that supports a friend? This is cheaper and more meaningful than most micro-transactions people make daily. The social proof from early pledges (even 1-2) will drive the rest.

### The Shreyas Summary

Build this. It's Leverage. The opportunity cost of NOT building it is staying permanently stuck in a two-person-per-vow growth model. The primary risks are copywriting failures (gambling perception) and share friction (witnesses not sharing) — both are solvable. The structural upside — turning every vow into a potential social event that touches 3-8 new users — justifies the investment.

---

## Phase 2: Nikita Bier — Growth & Viral Mechanics

### The Viral Loop (Node by Node)

```
Maker creates vow
    → Witness receives SMS invite (EXISTING)
    → Witness accepts (EXISTING)
    → Witness sees share prompt (NEW — opt-out)
    → Witness shares link to group chat / social (NEW)
    → 3-8 friends tap link (NEW)
    → Spectators see pledge page (NEW — web, no app)
    → Spectators pledge $5-20 (NEW — Apple Pay)
    → Spectators get verdict notification (NEW)
    → Notification includes CTA: "Make your own vow" or "Challenge a friend" (NEW)
    → Converted spectator becomes maker (LOOP CLOSES)
```

**Key insight:** The loop has TWO viral injection points, not one. The witness shares (creating spectators), AND the post-verdict notification converts spectators into makers (creating new witnesses). This is a compounding loop, not a linear chain.

### Viral coefficient math

Current app: 1 vow → 1 witness → maybe 0.1 new vows = viral coefficient ~0.1.

With Spectator Pledge: 1 vow → 1 witness → 5 spectators → if 15% convert → 0.75 new vows → each with their own witnesses → each potentially generating spectators.

This doesn't need to hit k>1 to be transformative. Even k=0.5 doubles organic growth.

### Sharing: Opt-Out, Not Opt-In

**Nikita's position: Opt-out. No debate.**

The witness just accepted a social role. They're engaged. They have social capital with the maker. The share screen should appear automatically after acceptance with the copy pre-loaded. The witness taps one button to share, or dismisses to skip.

If you make sharing opt-in (a hidden share button somewhere), fewer than 5% of witnesses will find and use it. If it's the default next step, 30-40% will share. That's an 6-8x difference in the feature's entire value.

### Share Text & Link Preview

**Share text (for iMessage, WhatsApp, group chats):**
> Joey put $50 on the line — he WILL do his taxes by Sunday, or the money goes to charity. 👀 Pledge a few bucks to charity if you think he'll pull it off → [link]

**Why this works:**
- Leads with the person, not the app
- The stakes ($50, charity) create intrigue
- "Pledge a few bucks" frames it as trivially small
- The 👀 emoji adds playfulness without explaining the app
- No app name in the share text — it's about Joey, not Unbreakable Vow

**Link preview (OG tags):**
- Title: "Joey's Vow: Do my taxes by Sunday"
- Description: "$50 on the line. 4 friends have pledged $35 to charity."
- Image: A branded card showing the vow text, stake amount, and a progress indicator

### Spectator → Maker Conversion

**The moment:** The verdict notification lands. The spectator is re-engaged. They just experienced the core emotional mechanic of the app — accountability with stakes — without creating anything themselves.

**Post-verdict CTA (kept):**
> "Joey did it. Your $10 is going to St. Jude's 🎉 Want to make YOUR friends put their money where their mouth is? Make a vow →"

**Post-verdict CTA (broken):**
> "Joey didn't make it. Your pledge is released. Want to hold someone accountable? Challenge a friend →"

The "challenge a friend" CTA on broken verdicts is key — the spectator just watched someone fail. The emotional state is "I could do better" or "I dare you to do it." Channel that into a dare.

### Re-engagement moments for spectators:
1. **Pledge confirmation** — "You'll hear from us when the verdict is in."
2. **24h before deadline** — "Joey's vow ends tomorrow. He has $85 of charity pledges riding on him."
3. **Verdict notification** — The big moment. Charge or release.
4. **Post-verdict conversion CTA** — The loop-closer.

That's 4 touchpoints from a single pledge — each one pulling the spectator deeper.

---

## Phase 3: Julie Zhuo — UX & Emotional Design

### Where Spectator Pledge Lives in the Existing App

**Principle: Nothing changes for the maker or witness who doesn't use it.**

The spectator system integrates at three existing touchpoints — it doesn't create new navigation:

**1. Witness acceptance flow (new screen after accept)**
After the witness taps "I'm in," instead of going directly to the accepted state, they see an interstitial: the share prompt. This is ONE screen. It shows the pre-written share text and a "Share" button (native share sheet) plus a "Skip" text link. After sharing or skipping, they land on the accepted state page (unchanged).

**2. Vow detail page (/vow/[id]) — new section, conditional**
Below the existing timeline, IF any pledges exist, a new section appears: "Friends pledging for you" with the total amount, the count, and a scrollable list of names + amounts. If zero pledges exist, this section doesn't render. The maker's experience is identical to today for vows with no spectators.

**3. Verdict notification and outcome pages — expanded**
The certificate and outcome pages gain a line: "8 friends pledged $85 to St. Jude's." The share button on these pages becomes more powerful because the outcome is now a social story, not just a personal one.

### The Spectator's Journey (Screen by Screen)

**Screen 1: The Pledge Page (web — /p/[token])**

The spectator taps a link from a group chat. They see:

```
[Eye icon / Unbreakable Vow brand mark]

Joey vowed to
"Do my taxes by Sunday"
$50 on the line → St. Jude's

[Progress bar: Day 3 of 5]

6 friends have pledged $45

—————————————

Pledge to charity if Joey succeeds

[$5]  [$10]  [$20]  [Custom]

[Apple Pay button — primary, full width]
or pay with card

By pledging, you're making a conditional donation
to St. Jude's. You're only charged if Joey keeps
his vow. If he doesn't, you pay nothing.
```

**Why this works:**
- ONE concept: pledge to charity if friend succeeds
- Social proof above the fold (6 friends, $45)
- Pre-selected amount ($5 default) minimizes decisions
- Apple Pay = one tap to complete
- The charity name is prominent — this is a donation, not a bet
- The disclaimer is present but not anxious — it's informational, not defensive
- No app download required. No account creation. No sign-up.

**Screen 2: Pledge Confirmed**

```
✓ You pledged $10

If Joey keeps his vow, your $10 goes to St. Jude's.
If he doesn't make it, you won't be charged.

We'll text you when the verdict is in.

[Phone number field — pre-filled if known]

    ——— or ———

Get the app to follow along
[App Store]  [Play Store]
```

**Why this works:**
- Clear confirmation of what happens next
- Phone capture for verdict notification (lightweight — just a number, not an account)
- App install is suggested, not required — positioned as a "follow along" enhancement

**Screen 3: Verdict Notification (SMS or Push)**

Kept: "Joey kept his vow! Your $10 is going to St. Jude's. 🎉 See the results → [link]"
Broken: "Joey didn't make it. Your $10 pledge is released — you won't be charged. See what happened → [link]"

**Screen 4: Post-Verdict Page (web)**

```
[Certificate-style card]

Joey KEPT his vow ✓
"Do my taxes by Sunday"

$50 refunded to Joey
$85 donated to St. Jude's by 8 friends

Your $10 → St. Jude's ✓

—————————————

[Share this result]

—————————————

Your turn. Make a vow →
or Challenge a friend →
```

### The Vow-Maker's View (Changes to /vow/[id])

Only visible when pledges exist:

```
[Existing vow detail content...]

——— Friends pledging for you ———

$85 pledged by 8 friends → St. Jude's

Mikey (witness) shared your vow
  Sarah — $10
  Alex — $5
  Jordan — $20
  + 5 more

If you keep this vow, $85 goes to
St. Jude's because of you.
```

**The emotional design here matters:** The framing is "because of you" — your success causes good. Not "people are watching" (anxiety) but "your success has impact" (motivation). Julie's key insight: the same information can feel like surveillance or support depending entirely on framing.

### Cognitive Load Analysis

**For the maker:** Zero new decisions. They don't opt into spectators, manage them, or interact with them. Pledges appear passively. The only new information is "X friends pledged $Y" — one number, one concept.

**For the witness:** One new decision: share or skip. That's it. The share text is pre-written. The action is one tap.

**For the spectator:** Two decisions: pledge amount and payment method. With defaults ($5, Apple Pay), it can be zero decisions — just confirm.

---

## Panel Debate: Should the Witness Role Change?

### The question: Should spectators have any say in the verdict? Should there be multiple witnesses?

**Nikita's argument FOR multiple witnesses / spectator voting:**
"More people involved = more engagement = more viral surface area. Let spectators vote on the verdict alongside the witness. It creates a social moment — everyone weighing in — and it gives spectators a reason to check back before the verdict."

**Julie's argument AGAINST:**
"The witness relationship is sacred. It's the reason the app works emotionally. The maker chose ONE person they trust. If you dilute that into a crowd vote, you lose the intimacy that makes a vow feel binding. A verdict from 'your friends voted 6-2 that you failed' feels like a social trial. A verdict from 'Mikey says you kept it' feels like accountability between friends."

**Shreyas's resolution:**
"Julie is right for V1. The witness role is the app's core emotional mechanic — accountability between two people who trust each other. Changing this is a strategy change, not a feature addition. Spectators should have ZERO say in the verdict. They pledge, they wait, they receive the outcome. The witness remains the sole judge. We can always add spectator voting in V2 if the data suggests it — but we can't un-dilute the witness relationship if we get it wrong."

**Panel recommendation: Single witness. Spectators have no verdict power. Unanimous.**

---

## Elad Gil — Business & Revenue

### Revenue model for V1: None.

Spectator Pledge should generate zero direct revenue in V1. The feature's value is entirely in viral acquisition. Charging a platform fee on charitable donations would:
- Reduce conversion (any friction on a $5 pledge is fatal)
- Create legal complexity (charitable donation processing regulations)
- Send the wrong signal ("we're making money off your charity pledge")

### When to monetize (V2+):

Once spectator pledge has proven viral traction (measured by spectators-per-vow and spectator-to-maker conversion rate), revenue options include:
- **Premium vow features** (increased pledge limits, custom charity selection, branded certificates) — subscription or per-vow pricing
- **Charity partnership fees** — charities pay to be listed as pledge destinations (demand-side revenue)
- **"Boost" mechanic** — makers pay a small fee to surface their vow to more potential spectators beyond the witness's network

But for V1: pure growth. Don't tax the engine.

### Does it justify itself on viral acquisition alone?

**Yes.** If the average vow generates even 3 spectators, and 10% of spectators convert to makers, and the average maker creates 2 vows, the compounding effect on CAC alone justifies the engineering investment. This feature could reduce effective CAC to near-zero for a meaningful percentage of new users.

---

## Technical Architecture: CTO Analysis

### New Database Table: `public.pledges`

```sql
CREATE TABLE public.pledges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vow_id uuid NOT NULL REFERENCES vows(id),
  spectator_name text NOT NULL,
  spectator_phone text,
  spectator_email text,
  spectator_user_id uuid REFERENCES users(id),  -- null if no account
  pledge_token text UNIQUE NOT NULL,  -- for spectator's unique link
  amount integer NOT NULL,  -- cents (500, 1000, 2000)
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'authorized', 'charged', 'released', 'failed')),
  charged_at timestamptz,
  released_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_pledges_vow_id ON pledges(vow_id);
CREATE INDEX idx_pledges_status ON pledges(status);
CREATE INDEX idx_pledges_pledge_token ON pledges(pledge_token);
```

### Modified Table: `public.vows`

```sql
ALTER TABLE vows ADD COLUMN share_token text UNIQUE;
-- Used for the public pledge page URL: /p/[share_token]
-- Generated at seal time, separate from witness_invite_token
```

### New Table: `public.pledge_notifications`

```sql
CREATE TABLE public.pledge_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pledge_id uuid NOT NULL REFERENCES pledges(id),
  notification_type text NOT NULL,  -- 'verdict', 'reminder', 'conversion'
  channel text NOT NULL,  -- 'sms', 'push', 'email'
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

### RLS Policies for `pledges`

```sql
-- Maker can view pledges on their own vows
CREATE POLICY pledges_maker_select ON pledges FOR SELECT
  USING (vow_id IN (SELECT id FROM vows WHERE user_id = auth.uid()));

-- Witness can view pledges on vows they witness
CREATE POLICY pledges_witness_select ON pledges FOR SELECT
  USING (vow_id IN (SELECT id FROM vows WHERE witness_user_id = auth.uid()));

-- Public: read own pledge by token (for pledge page)
CREATE POLICY pledges_spectator_select ON pledges FOR SELECT
  USING (pledge_token = current_setting('request.headers')::json->>'x-pledge-token');

-- Insert: via edge function (service role) only
```

### Stripe Flow for N Pledges

**On pledge creation:**
1. Spectator selects amount ($5, $10, $20)
2. Edge function `create-pledge` creates a PaymentIntent with `capture_method: 'manual'`
3. Spectator confirms via Apple Pay / Google Pay / card
4. PaymentIntent moves to `requires_capture` (money authorized, not charged)
5. Pledge status: `authorized`

**On kept verdict:**
1. `submit-verdict` now also processes pledges
2. For each pledge where `status = 'authorized'`:
   - Call `stripe.paymentIntents.capture(pi_id)` to charge the spectator
   - Update pledge status to `charged`
   - Queue verdict notification to spectator
3. Use batch processing with error handling per pledge (one failure doesn't block others)
4. Failed captures: status → `failed`, no notification sent (fail silently — don't burden the spectator)

**On broken verdict:**
1. For each pledge where `status = 'authorized'`:
   - Call `stripe.paymentIntents.cancel(pi_id)` to release the hold
   - Update pledge status to `released`
   - Queue verdict notification to spectator ("you won't be charged")

**On voided vow:**
1. Same as broken — release all pledge holds
2. Notify spectators: "This vow was withdrawn. Your pledge is released."

**Edge cases:**
- **Card declined at capture:** Mark as `failed`. Don't retry. Don't notify the maker about individual failures. The total pledged amount on the maker's view should show "successfully charged" amounts only.
- **Auth expired (>7 days):** Stripe authorizations expire. If the vow runs longer than 7 days, we need to either re-authorize before expiry or limit pledge-eligible vows to 7 days max. **V1 recommendation: limit to vows with deadlines within 7 days.** Simpler, avoids re-auth complexity.
- **Spectator disputes/chargebacks:** Handle case-by-case. At $5-20 amounts, disputes will be extremely rare.

### New Edge Functions

| Function | Auth | Purpose |
|----------|------|---------|
| `create-pledge` | None (public) | Creates pledge + Stripe PI for spectator |
| `process-pledges` | Service role | Batch capture/release pledges on verdict |

### Notification Broadcasting

Current `submit-verdict` notifies 1 witness + 1 maker. With spectators, it needs to notify N spectators as well.

**Approach:** After verdict processing, query all pledges for the vow, batch-insert into `push_queue` and/or `sms_log` for each spectator with a phone number. The existing cron runner can handle delivery if we add pledge notifications to its scope, or `process-pledges` can send inline.

**V1 recommendation:** Inline notification in `process-pledges`. Don't add complexity to cron runner. Keep it simple — process pledges and send notifications in one edge function call triggered by `submit-verdict`.

### The Pledge Page (/p/[share_token])

**Web-first. No app required.**

- Next.js server component fetches vow data by `share_token`
- Client component renders pledge form with Stripe Elements (Payment Request API for Apple/Google Pay)
- On successful payment confirmation, calls `create-pledge` edge function
- Server-side OG meta tags for link previews (vow text, stake, pledge count)

---

## Copywriter: Every Touchpoint

### Witness Share Prompt (after accepting)

**Header:** "Make it count"
**Body:** "Share Joey's vow and let friends pledge to charity if he succeeds. More pledges = more pressure = more charity if he pulls it off."
**Primary CTA:** "Share Joey's vow" [opens native share sheet]
**Secondary:** "Not now" [text link, dismisses]

### Pre-loaded Share Text

> Joey put $50 on the line — he's vowing to do his taxes by Sunday, or the money goes to St. Jude's. Pledge a few bucks to charity if you think he'll pull it off 👀 [link]

### Pledge Page — Header

> **Joey vowed to do his taxes by Sunday**
> $50 on the line → St. Jude's
> Pledge to charity if Joey succeeds

### Pledge Confirmed

> **You pledged $10** ✓
> If Joey keeps his vow, your $10 goes to St. Jude's.
> We'll let you know when the verdict is in.

### Verdict SMS to Spectators

**Kept:**
> Joey kept his vow! Your $10 pledge → St. Jude's 🎉 See the result: [link]

**Broken:**
> Joey didn't make it. Your $10 pledge is released — you won't be charged. See what happened: [link]

### Maker's Pledge Notification (in-app/push)

> 🙌 Sarah just pledged $10 to St. Jude's if you keep your vow. 6 friends are counting on you.

### Post-Verdict Spectator CTA

**Kept:**
> Your turn. What will YOU commit to? [Make a vow →]

**Broken:**
> Think you could do better? [Challenge a friend →]

---

## What We're Building (V1 Scope)

**One sentence:** Friends of a vow-maker can pledge $5–$20 to charity, contingent on the maker succeeding, creating social pressure and pulling new users into the app.

### In scope:
- Pledge page (web, /p/[share_token]) with Apple Pay / Google Pay / card
- Witness share prompt (interstitial after acceptance)
- Pre-written share text with OG meta tags
- Pledge tracking on vow detail page (maker view)
- Batch pledge processing on verdict (capture on kept, release on broken)
- Spectator verdict notifications (SMS)
- Post-verdict conversion CTAs for spectators
- Pledge count on certificate/outcome pages
- `pledges` table, `pledge_notifications` table, `share_token` on vows
- `create-pledge` and `process-pledges` edge functions

### NOT in scope (V1):
- Spectator accounts or profiles
- Spectator voting on verdicts
- Multiple witnesses
- Pledge leaderboards or rankings
- Custom charity selection by spectators (they pledge to the maker's chosen charity)
- Pledge amounts outside $5/$10/$20
- Vows with deadlines beyond 7 days (auth expiry constraint)
- Direct revenue from pledges (no platform fees)
- Email notifications (SMS only for V1)
- Spectator-to-spectator sharing (only witness shares)

---

## Success Metrics

**Primary (growth):**
- **Witness share rate:** % of witnesses who share the vow (target: 30%+)
- **Spectators per shared vow:** average number of pledges per shared vow (target: 3+)
- **Spectator-to-maker conversion:** % of spectators who create a vow within 30 days (target: 10%+)

**Secondary (engagement):**
- **Pledge completion rate:** % of spectators who start the pledge flow and complete payment (target: 60%+)
- **Average pledge amount:** (target: $8-12)
- **Verdict notification open rate:** % of spectators who tap the verdict link (target: 50%+)

**Guardrails (don't break what works):**
- **Existing vow creation completion rate:** must not decrease
- **Witness acceptance rate:** must not decrease
- **Vow kept/broken ratio:** must not meaningfully shift (spectator pressure shouldn't cause dishonest verdicts)

---

## Panel Consensus

All three experts agree: **build this.** It's the highest-leverage feature available to Unbreakable Vow right now.

**Where they aligned:**
- This is a Leverage task that changes the product's growth physics
- Witnesses must share by default (opt-out)
- Spectators must never need the app (web-first)
- The witness remains sole judge (no spectator verdict power)
- The maker's experience must be passively enhanced, not actively complicated
- V1 should generate zero direct revenue
- Copy is the make-or-break factor (charity framing must be crystal clear)

**Where they debated:**
- Nikita wanted spectator voting; Julie and Shreyas vetoed it for V1
- Julie wanted the share prompt to be skippable without feeling pushy; Nikita wanted it more aggressive — compromise: prominent share button with clear "Not now" dismiss, no guilt copy
- Shreyas pushed for the 7-day deadline constraint; Nikita wanted no limits — Shreyas won on engineering simplicity grounds

**The one thing that will kill this feature:** If spectators think they're betting. Every piece of copy, every design decision, every notification must reinforce: this is charity, not gambling. If you get that right, the rest follows.
