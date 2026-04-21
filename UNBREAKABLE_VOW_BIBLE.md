# Unbreakable Vow — The Complete Bible

Everything there is to know about the app: what it is, how it works, how it looks, how it feels, and how to talk about it.

---

## What It Is

Unbreakable Vow is a commitment and accountability app. You make a vow, name a witness, put real money on the line, and face real consequences if you break it. If you keep your word, the money comes back. If you break it, it goes to a charity — or a cause you hate.

It is not a game. It is not gambling. It is a contract with yourself, notarized by a friend.

**Entity:** The Rave Technologies operates the Unbreakable Vow application.
**Domain:** unbreakablevow.app
**Platforms:** iOS (Expo/React Native), Web (Next.js), with shared Supabase backend.

---

## The Core Loop

```
Make a vow → Sharpen it → Pick a witness → Set the stakes → Seal it → Live it → Verdict → Outcome
```

1. **Input:** User types a commitment ("I vow to...")
2. **Sharpen:** If vague, the app helps make it specific and measurable
3. **Witness:** Choose a friend (gets a text invite) or go solo
4. **Stakes:** $0 - $100, choose charity or anti-cause as destination
5. **Seal:** Ceremony moment — oath, confirmation, payment captured
6. **Live:** Countdown, witness is watching, daily nudges
7. **Verdict:** Witness (or maker) calls it kept or broken
8. **Outcome:** Kept = refund + celebration. Broken = money goes to cause + honest acknowledgment.

---

## How Money Works

The payment model is **charge on seal, refund on kept.** Not authorize-and-capture.

| Event | What Happens |
|-------|-------------|
| Seal | Stripe charges the stake amount immediately |
| Kept | Full refund issued automatically (idempotency key: `refund-{vow_id}`) |
| Broken | Charge stands. Money allocated for charitable donation |
| Voided | Full refund. Maker cancelled before verdict |
| Auto-resolve | No verdict within 72 hours = auto-kept, refund issued |

$0 vows skip all Stripe logic entirely. No payment intent created, no card collected.

The app does NOT keep money from broken vows. It goes to the user's chosen charity or anti-cause. This is the key differentiator from competitors like Forfeit (who keep forfeited money for themselves).

---

## The Witness System

The witness is central. A vow without a witness is weaker — the app knows this and designs around it.

**How witness invites work:**
- Maker enters witness name + phone number
- On seal, witness gets an SMS: "[Name] just made an Unbreakable Vow: '[vow text]' — $X on the line and you're the witness."
- SMS includes a magic link: `unbreakablevow.app/w/{token}`
- Witness taps link, sees the vow, accepts or declines. **No account required.**
- On verdict day, witness gets another SMS asking them to call it kept or broken.

**If the witness doesn't respond:**
- Escalating reminders over 72 hours
- After 72 hours with no verdict: auto-resolved as "kept" (benefit of the doubt)
- Maker can also switch to self-resolve at any point

**Self-witness option:**
- "I'll verify myself" — the maker calls their own verdict
- Less accountability, but still real if money is staked
- Available as fallback if witness declines

---

## Challenges (Dares)

A second mode: dare someone else to make a vow.

- Maker creates a challenge and sends it to a target
- Target receives an invite link: `unbreakablevow.app/c/{token}`
- If accepted, the target becomes the maker of that vow
- If declined, the challenge is voided
- The original maker becomes the witness

This is the viral growth mechanic. One person dares another, who dares another.

---

## The Consequence Model

Two types of consequences when you break a vow:

### Charity (Default)
- "A cause you believe in"
- Money goes somewhere good even in failure
- Options shown: ALS Association, St. Jude, Ronald McDonald House, Feeding America
- Psychology: redemptive, easier to accept. Guilt becomes purpose.

### Anti-Cause (Stronger Motivation)
- "A cause you hate"
- "Maximum pain. Maximum motivation."
- Options shown: NRA, Donald Trump, Kamala Harris, Planned Parenthood, Ted Cruz
- Psychology: visceral loss aversion. 3x more motivating per UX research.
- Visually distinct: red accent colors, different border treatment

The anti-cause mechanic is the app's sharpest edge. It's what makes people share screenshots. It's also what Apple reviewers might question — framed carefully in review notes as user choice, not app endorsement.

---

## Branding & Visual Identity

### The Aesthetic

Dark, luxurious, ceremonial. Every screen feels like signing something that matters.

- **Always dark mode.** No light theme. The darkness creates ceremony, focus, and gravity.
- **Gold accents** pop against the dark background — jewelry-like, premium, aspirational.
- **Cards feel like legal documents** — bordered, structured, receipt-like.
- **Animations feel like rituals** — nothing moves casually. Everything has weight.

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | #05070B | Primary background (deep navy-black) |
| `surface` | #10141C | Card/component backgrounds |
| `surface-elevated` | #161B25 | Elevated surfaces for depth |
| `gold` | #D4A24F | Primary accent. The signature color. |
| `gold-bright` | #F0C86E | Brighter gold for emphasis, buttons |
| `gold-deep` | #8C6423 | Darker gold for gradients |
| `gold-glow` | rgba(212,162,79,0.28) | Ambient glow effects |
| `text` | #F6F7FB | Primary text (near-white) |
| `text-secondary` | #A7B0C0 | Secondary text |
| `text-muted` | #667085 | Tertiary text, labels |
| `success` | #52D69A | Kept vows, positive outcomes |
| `danger` | #FF7B7B | Broken vows, warnings |
| `border` | rgba(255,255,255,0.08) | Subtle card borders |

### Typography

**Serif font** (Georgia, Playfair Display) for ceremony: vow text, headers, the oath itself. Dignified, classical, legal-document feel.

**System sans-serif** (-apple-system, Roboto) for function: buttons, labels, metadata. Clean and modern.

| Element | Size | Weight | Font |
|---------|------|--------|------|
| Hero heading | 40px | Bold | Serif |
| Page title | 32px | Bold | Serif |
| Vow text (display) | 22px | Medium | Serif |
| Card header | 15px | Semibold | Sans |
| Body text | 15px | Regular | Sans |
| Labels/captions | 12-13px | Medium | Sans |

### Logo & Icon

- **Gold star** (five-pointed) on dark background
- Used as app icon and in navigation header
- Represents singular focus — one vow, one commitment
- Also appears as the "seal ring" during the ceremony

### Brand Name

- Always "Unbreakable Vow" — capitalized, two words
- Short form: "Vow" (never "UV")
- App references use lowercase "vow" for the object ("your vow", "seal this vow")

---

## Tone of Voice

### The Rules

1. **Formal but not corporate.** Reads like a contract written by someone who believes in you.
2. **Dramatic but not cheesy.** The ceremony is real. The stakes are real. Say it straight.
3. **Honest but not cruel.** Breaking a vow is acknowledged, not punished. "You took the L" — not "You failed."
4. **Aspirational but not toxic.** "You can do hard things" — not "No excuses, grind harder."
5. **Short.** Headlines are 2-5 words. Body copy is 1-2 sentences. Never ramble.

### Key Phrases

| Phrase | Where it appears | Why it works |
|--------|-----------------|-------------|
| "Make a vow. Mean it." | Home hero | Two sentences. The entire app in six words. |
| "No takebacks. No excuses." | Seal screen | Finality. This is real. |
| "I do solemnly swear to honor this vow and accept the consequences." | The oath | Legal weight. Ritual language. Makes it feel binding. |
| "They're watching." | Live screen | Social pressure as feature, not bug. |
| "Unbroken." | Vow-kept screen | One word. Victory. |
| "You took the L." | Vow-broken screen | Honest, not mean. Acknowledges reality. |
| "Double down." | Vow-broken CTA | Reframes failure as opportunity. No shame spiral. |
| "Maximum pain. Maximum motivation." | Anti-cause selection | Bold. Honest about what this mechanic does. |
| "Word honored." | Kept outcome | Dignity in success. |

### Example Copy by Screen

**Home:** "Make a vow to a friend. Put money on it. Break it, it goes to charity."

**Refine:** "Make it stick. Your witness calls it 'kept' or 'broken' — make it clear."

**Witness:** "$25 is on the line. Pick someone who won't let you off the hook."

**Stake:** "Set the stakes. How much skin are you putting in?"

**Seal:** "Your Unbreakable Vow. No takebacks. No excuses."

**Live:** "Today's the day." / "3 days left." / "[Witness] is watching."

**Kept:** "Unbroken. Word honored. Another one in the books."

**Broken:** "You took the L. $25 to [Destination]. Honesty noted."

---

## The Ceremony

The seal moment is the emotional peak of the app. It's designed to feel irreversible.

### Mobile Intro Ceremony (First Launch)

```
Phase 1: Three lines spring in, one at a time
  "One vow."
  "One witness."
  "Money on the line."

Phase 2: Lines dissolve away

Phase 3: Oath fades in
  "I solemnly swear to keep my word this week."
  [Tap to accept]

Phase 4: Golden bloom animation expands, screen transitions
```

### Seal Screen Flow

1. Summary card shows vow text, stake amount, verdict date
2. Oath text appears: "I do solemnly swear to honor this vow and accept the consequences."
3. User taps "Seal this vow"
4. Payment processes (if staked)
5. Gold glow animation expands from seal icon
6. Checkmark springs in
7. Witness gets SMS
8. Auto-navigates to live tracking with share sheet

### Haptic Design (Mobile)

- **Selection feedback** on taps and toggles
- **Medium impact** on "Continue" buttons
- **Success notification** on seal completion
- **Light impact** on screen transitions

Every physical sensation reinforces: this matters.

---

## Emotional Design by Outcome

### Vow Kept

- **Color:** Gold + green
- **Icon:** Shield with checkmark, pulsing gold glow
- **Animation:** Confetti falls (gold + white particles, 1.5s)
- **Copy:** "Unbroken." / "Word honored."
- **Certificate:** Gold-bordered card with "VOW KEPT" stamp
- **Streak display:** "3 in a row" with fire emoji
- **CTA:** Share certificate, make another vow

### Vow Broken

- **Color:** Gold fading to red
- **Icon:** Alert triangle in red circle
- **Animation:** Card shakes twice (0.15s each)
- **Background:** "BROKEN" watermark (48px, transparent, rotated -18deg)
- **Copy:** "You took the L." / "$25 to [Destination]. Honesty noted."
- **Certificate:** Gold-to-red gradient border
- **CTA:** "Double down" (pre-filled new vow form)

The broken experience is honest but not punishing. The "double down" CTA reframes failure as a new attempt, not a shame spiral.

---

## The Certificate (Viral Mechanic)

Certificates are the primary share artifact. They look like premium receipts.

**Structure:**
```
[Dark card with gold border]
  
  VOW KEPT (or VOW BROKEN)
  ─────────────────────────
  
  "No phone in bed all week."
  
  ─────────────────────────
  Witness: Sarah
  Stake: $25 saved
  Streak: 3 in a row
  
  unbreakablevow.app
```

- Gold border for kept, gold-to-red gradient for broken
- "BROKEN" watermark overlaid on broken certificates
- Serif font for vow text, sans-serif for metadata
- Shareable via native share sheet
- Footer links back to app (viral loop)

---

## Vow Examples & Sharpening

### Default Examples (Shown as Chips)

- "Workout 3x this week"
- "Delete TikTok for a week"
- "No alcohol 2 weeks"
- "No texting my ex for a month"
- "Finish the side project"

All examples are: specific, time-bound, measurable, action-oriented, relatable to 18-35 demographic.

### Sharpening Logic

The app analyzes vow text for specificity. If it detects vagueness (no time frame, no frequency, no measurable outcome), it suggests sharper versions:

| Vague Input | Sharpened Suggestion |
|-------------|---------------------|
| "Get fit" | "Go to the gym 3 times this week" |
| "Read more" | "Read for 30 minutes every night this week" |
| "No phone" | "No phone in bed all week" |
| "Eat better" | "No takeout all week" |
| "Be productive" | "Finish [specific task] by Friday" |

This is rule-based (regex pattern matching for frequency, duration, specificity markers), not AI/LLM-powered. Fast, predictable, no API costs.

---

## Daily Nudges

Rotating motivational messages shown during live tracking:

1. "Discipline is choosing between what you want now and what you want most."
2. "You don't have to be extreme, just consistent."
3. "The pain of discipline weighs ounces. The pain of regret weighs tons."
4. "Small daily improvements are the key to staggering long-term results."
5. "You're not just doing this for you. Someone's watching."
6. "The best time to start was yesterday. The second best time is now."
7. "A vow isn't a wish. It's a contract with yourself."
8. "Show up today. Tomorrow's you will thank you."
9. "Motivation gets you started. Commitment keeps you going."
10. "Every day you keep your word, you become harder to break."

Tone: honest, aspirational, never corporate. Acknowledges difficulty without toxic positivity.

---

## Streak Titles

Consecutive kept vows earn titles:

| Streak | Title |
|--------|-------|
| 3 | Committed |
| 7 | Keeper |
| 14 | Steadfast |
| 30 | Unbreakable |
| 100 | Legendary |

Displayed on certificates and in history. Creates identity formation — you're not just keeping a vow, you're becoming someone who keeps their word.

---

## Community Challenges (Coming Soon)

Pre-seeded challenge examples shown in the app:

| Challenge | Copy | Participants |
|-----------|------|-------------|
| Dry April | "30 days. No exceptions. No 'just one.' Your wallet remembers even if you don't." | 412 |
| No phone in bed | "Screen Time doesn't lie. Post yours at the end of the week or lose your money." | 289 |
| 10K steps every day | "Your Health app is the witness. Seven days. No rest days. No excuses." | 194 |
| Wake up before 6am | "Set the alarm. Actually get up. Screenshot or it didn't happen." | 156 |
| No takeout all week | "Your bank statement is the proof. Cook like your money depends on it. Because it does." | 127 |
| Cold shower every morning | "You won't die. You'll just wish you did. 7 days. Film it or you're lying." | 84 |
| No social media during work | "9 to 5, no scrolling. Screen Time reports due Friday. The feed will survive without you." | 203 |

Challenge copy is: specific, proof-focused, humorous, high-energy. These are aspirational — showing what the community looks like at scale.

---

## Animation & Motion Design

Every animation has purpose. Nothing moves for decoration.

| Animation | Where | Duration | Purpose |
|-----------|-------|----------|---------|
| Fade-up | Content entering screens | 0.4s ease-out, staggered | Graceful entrance, hierarchy |
| Scale-in | Icons, checkmarks | 0.3s spring | Arrival, celebration |
| Gold glow pulse | Seal ring, trophy icon | Continuous, subtle | Sacred, alive, breathing |
| Confetti | Vow-kept screen | 1.5s | Victory, release |
| Shake | Vow-broken card | 2x 0.15s | Tension release, reality check |
| Bloom | Oath acceptance | 0.6s scale 0 to 8 | Irreversibility, expansion |
| Spring bounce | Intro ceremony lines | Physics-based | Playful weight, gravity |

---

## Competitive Positioning

| Competitor | Their Model | Our Edge |
|------------|------------|----------|
| **Forfeit** | Keeps forfeited money for themselves | User chooses destination (charity or anti-cause) |
| **StickK** | Academic, dry UX | Ceremony, emotion, premium design |
| **Beeminder** | Data-tracking focused, complex | Simple vow model, witness-based |
| **BetterMe** | Subscription fitness app | Not a fitness app — works for any commitment |

**Our wedge:** The anti-cause mechanic. Nobody else lets you bet against something you hate. "If I break my vow, my money goes to [politician I despise]" is inherently shareable, emotionally charged, and 3x more motivating than charity alone.

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Web | Next.js 16, React 19, Tailwind CSS 4 |
| Mobile | Expo 54, React Native, expo-router |
| Backend | Supabase (PostgreSQL 17, Auth, Edge Functions, Realtime) |
| Payments | Stripe (manual capture model) |
| SMS | Twilio |
| Push | Expo Push Notifications |
| State | React Context (VowFlow provider), React Query for dashboard |
| Deploy (web) | Vercel |
| Deploy (mobile) | EAS Build + Submit |

---

## User Flow Diagram

```
┌─────────────┐
│   Home       │  "I vow to..."
│   (Input)    │
└──────┬───────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│   Refine     │────▶│   Already    │  (if vow is specific enough)
│   (Sharpen)  │     │   Good       │
└──────┬───────┘     └──────┬───────┘
       │                    │
       ▼                    ▼
┌─────────────┐
│   Stake      │  $0 - $100, charity or anti-cause
└──────┬───────┘
       │
       ▼
┌─────────────┐
│   Witness    │  Friend (SMS invite) or Self
└──────┬───────┘
       │
       ▼
┌─────────────┐
│   Seal       │  Oath, payment, ceremony
│  (Ceremony)  │
└──────┬───────┘
       │
       ▼
┌─────────────┐
│   Live       │  Countdown, witness status, nudges
│  (Tracking)  │
└──────┬───────┘
       │
       ▼
┌─────────────┐
│   Verdict    │  Witness or maker calls it
└──────┬───────┘
       │
  ┌────┴────┐
  ▼         ▼
┌──────┐  ┌───────┐
│ Kept │  │Broken │
│ 🎉   │  │  💀   │
└──┬───┘  └──┬────┘
   │         │
   ▼         ▼
┌──────────────────┐
│   Certificate     │  Share → Viral loop
│   (Shareable)     │
└──────────────────┘
```

---

## Vow State Machine

```
draft → sealed → active → awaiting_verdict → kept
                                            → broken
                       → voided (maker cancels)
         awaiting_verdict → voided
         awaiting_verdict → kept (72h auto-resolve)

Challenge sub-states:
  pending → accepted (target becomes maker)
          → declined (vow voided)
```

---

## Key Metrics to Watch

1. **Seal rate:** What % of started vows get sealed? (measures ceremony friction)
2. **Stake rate:** What % of sealed vows have money? (measures trust in payment)
3. **Witness accept rate:** What % of invited witnesses accept? (measures viral loop)
4. **Kept rate:** What % of vows are kept? (too high = vows too easy, too low = app too punishing)
5. **Repeat rate:** What % make vow #2? (the real retention metric)
6. **Share rate:** What % share their certificate? (viral coefficient)
7. **Anti-cause selection rate:** What % choose anti-cause over charity? (measures engagement with core differentiator)

---

## App Store Positioning

**Category:** Lifestyle (primary), Productivity (secondary)

**Tagline:** "Accountability with real stakes."

**Description framework:**
> Make a vow. Name a witness. Put money on it.
> 
> Unbreakable Vow turns your commitments into contracts. Choose a friend as your witness, stake real money, and face real consequences. Keep your word and the money comes back. Break it and it goes to charity — or a cause you hate.
> 
> No games. No gimmicks. Just your word, a witness, and something on the line.

**Keywords:** accountability, commitment, habit, vow, stakes, witness, challenge, goals, motivation, discipline

**Not gambling:** The app is not gambling because there is no randomness, no house edge, no odds, and no money flowing between users. Outcomes are determined entirely by human behavior and verified by a human witness. Money goes to registered charities. This model is identical to approved apps StickK and Beeminder.

---

## Marketing Angles

### The Screenshot Moment
When someone breaks a vow and their money goes to a politician they hate — that's the screenshot. That's the tweet. That's the group chat message. The anti-cause mechanic is built for organic sharing.

### The Dare Loop
"I dare you to [vow] — $25 on the line." Person A dares Person B, who dares Person C. Each dare is a new user. Each vow is a new opportunity to share a certificate.

### The Streak Identity
"I'm on a 14-day streak. I'm Steadfast." Titles create identity. People don't break streaks. People share streaks.

### The Witness Story
"My friend made me his witness and now I have to decide if he really worked out 3x this week." The witness role is a conversation starter. It pulls people in without them making a vow.

---

## What's Not Built Yet

| Feature | Status | Notes |
|---------|--------|-------|
| Vowkeeper AI bot | Not built | SMS check-in reminders with personality |
| Proof verification | UI exists, no backend | Photo/screenshot upload, no validation |
| Streaks UI | Data model ready | No frontend display yet |
| Group vows | Schema foundation | No UI |
| Email notifications | Not built | SMS only currently |
| Content moderation | Not built | Vow text filtering |
| Social features | Not built | No leaderboards, profiles, following |
| Premium subscription | Not built | No payment for app features |

---

## The One-Sentence Pitch

**"Make a vow to a friend, put money on it, and if you break it, it goes to a cause you hate."**

That sentence contains: the mechanic (vow + money), the social element (friend), the consequence (cause you hate), and the emotional hook (loss aversion + identity). It's the whole app in one breath.
