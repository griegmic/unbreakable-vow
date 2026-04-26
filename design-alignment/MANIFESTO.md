# UNBREAKABLE VOW — DESIGN & BRAND MANIFESTO

*A vow, made binding.*

---

## I. WHAT WE STAND FOR

We exist for the things you keep not doing.

The half-finished side project. The gym membership you stopped using. The friend you said you'd call. The vow you made to yourself last January that you still haven't kept.

Every broken promise has one thing in common: **nothing was on the line.**

Unbreakable Vow is the simplest fix to the oldest problem in self-improvement. You make a promise. You put real money on it. You name a friend who'll call it kept or broken. That's it. No habit tracking, no streaks, no productivity apps. Just a vow with weight.

We are not a wellness app. We are not a productivity app. We are a **commitment device** — the way handshake deals used to work, with a credit card hold instead of a witness's signature.

---

## II. PRINCIPLES (NON-NEGOTIABLE)

### 1. Gravity, not gamification
Every interaction should feel like signing a contract — not earning a badge. We don't celebrate streaks. We don't award points. We don't congratulate. We acknowledge. The product is a witness, not a coach.

### 2. The vow is the document
The vow is treated as a legal-feeling artifact. It has a label, a date, a stake, and a judge. It can be screenshotted and shared. It is not a "todo." It is not a "habit." It is a **vow** — a word with religious, legal, and matrimonial weight.

### 3. Skin in the game is the feature
Free vows would be insulting. The product begins when money is on hold. We never apologize for the stake. We never soft-pedal it. We say "$100 on the line" — not "challenge yourself."

### 4. The witness is a person, not a system
Witnesses are real friends with real phone numbers. We never run automated verdicts. We never use "AI judges." A vow without a human witness is just a calendar reminder.

### 5. Honest copy, always
We don't say "your money goes to charity" if it might go to NRA. We don't say "guaranteed" if it isn't. We don't promise "transformation." We tell you what we actually do. If we have to choose between sharp and honest, we find a third option.

### 6. Conversion is sacred but never bought with friction theater
We don't add steps to feel important. We don't add progress bars to feel like work. Every screen earns its place. If a step can be killed without losing the vow's weight, kill it.

### 7. Mobile-first, full stop
The web exists for first-time users and witnesses. Everyone who's made a vow before lives on the phone. Quick Vow is the default experience for returning users. Web flows **mirror** mobile in tone and visual system, but **diverge** when platform constraints demand it (e.g., no contacts API on mobile web → witness picked via share sheet, after pay).

When web and native diverge, the maker should not feel they got the lesser product. The web flow has its own internal coherence — share-as-witness-pick is a legitimate ceremony, not a workaround. We do not apologize for the difference; we own it.

---

## III. VOICE & TONE

### Voice
Warm, slightly serious, never preachy. Think: a thoughtful older friend who tells you the truth because they actually care. Never a coach. Never a guru. Never a chatbot.

### Tone matrix

| Situation | Tone |
|---|---|
| Making a vow | Quietly confident |
| Sealing a vow | Ceremonial, brief |
| Vow active | Calm support |
| Witness asked | Honest, no pressure |
| Witness deciding | Solemn-with-warmth |
| Vow kept | Quiet pride |
| Vow broken | Honest, never punishing |

### Words we use
**vow, word, on the line, judge, verdict, kept, broken, sealed, hold (your word, money on hold), witness (technical only), call it (verdict)**

### Words we never use
- "Goal" — vows are not goals
- "Challenge" — too gym-bro
- "Habit" — too clinical
- "Track" / "tracker" — we're not Strava
- "Accountability partner" — corporate; "judge" or "Nick" instead
- "Streak" (the word — the *concept* is fine for daily vows; we say "in a row")
- "Earn / earned" — we don't reward
- "Crush it" / "smash it" / "level up" — never
- "Smart" / "AI" — we don't lead with the tech
- "Easy" — vows aren't easy. That's the point.

### Sentence shapes we love
- **Two short ones, then payoff:** "Tell a friend. Put money on it. Keep it, you win it back."
- **Italics on the verb:** "*Mean* it." "*Kept* it." "*Lock* it in."
- **A name as the subject:** "Joey put $100 on a vow."
- **Direct address, lowercase comfort:** "How's it going?" not "How is your vow progressing?"

### Headlines we own
- *"Make a vow. Mean it."* (home)
- *"Yesterday, you said tomorrow."* (eyebrow)
- *"Put your card where your word is."* (auth)
- *"Joey needs you to hold him to this."* (witness landing)
- *"Did Joey keep his word?"* (verdict ask)
- *"It's done."* (sealed)

### Headlines we'd never write
- "Achieve your goals."
- "Unlock your potential."
- "The smart way to build habits."
- "Let's get started!"
- "You've got this!"

---

## IV. VISUAL SYSTEM

### Color tokens

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0F0D0A` | Background. Oxblood-black, never pure black. |
| `--surface` | `#181512` | Cards, secondary surfaces. |
| `--surface-2` | `#1F1B16` | Tertiary, inputs, slight elevation. |
| `--text` | `#F0E9DB` | Primary text. Warm parchment. |
| `--text-mute` | `#A49A85` | Body text, secondary. |
| `--text-dim` | `#726A5A` | Captions, labels, footnotes. |
| `--gold` | `#C89B3C` | Brand accent, italic emphasis. |
| `--gold-bright` | `#E8B656` | CTAs, highlights, hover. |
| `--gold-soft` | `rgba(200,155,60,0.10)` | Pill backgrounds, fill states. |
| `--gold-line` | `rgba(200,155,60,0.22)` | Subtle gold borders. |
| `--rule` | `rgba(240,233,219,0.08)` | Hairlines, dividers. |
| `--green` | `#4ade80` | Live status, witness accepted, kept. |
| `--crimson` | `#C84A4A` | Broken verdict, destructive actions. |
| `--amber` | `#E8B656` | Pending states, nudges (NOT errors). |

### Background treatment
Always a subtle gold radial gradient at top, sometimes mirrored at bottom. Never flat black. The gradient is where the warmth lives.

```css
background-image:
  radial-gradient(ellipse at top, rgba(200,155,60,0.05), transparent 60%),
  radial-gradient(ellipse at 50% 100%, rgba(200,155,60,0.04), transparent 70%);
```

### Typography

**Display & headlines: Fraunces** (variable, opsz 144 for hero)
- Weight 400 default, 500 for emphasis
- Italic in Fraunces is a feature, not punctuation — use it on every accent word
- Hero h1: 32-56px, line-height 0.98-1.05, letter-spacing -0.018em
- Card h: 22-30px

**Body & UI: Inter Tight** (400, 500, 600)
- 13-15px body, line-height 1.45-1.55
- Labels: 9.5-11px, letter-spacing 0.22-0.32em, uppercase, weight 500

**Numbers: Fraunces with `font-feature-settings: "tnum"`**
- Stake amounts always tabular
- Dates always tabular
- Hero stake: 60-92px, gold-bright, with shadow `0 0 30px rgba(200,155,60,0.35)`

### Spacing & density

**Tight (audit-coherent default):**
- 22-28px side padding
- 14-16px between elements
- Card padding 18-22px
- Bottom safe area 28-36px

**Type-pairing rule:** serif for h1 / quotes / values; sans for labels / UI / body.

### Components

#### Verdict pill (date selector)
The vow's date lives in this pill, always. Never a separate step.
```
◆ Verdict by Sun, Apr 26 · change
```
- Gold-line outline, gold-soft fill, content-width
- 6px gold dot prefix
- Font: Fraunces 13px
- "Verdict by" italic muted, date weight-500 text, "change" small italic dim

#### CTA (primary)
- Height 58-60px, border-radius 14px (card) or 999px (pill)
- Gradient: `linear-gradient(180deg, #D4A94A, #B88930)`
- Text color: `#1A1205` (deep oxblood, never pure black)
- Font: Fraunces 500, 16-17px
- Inset highlight + ambient gold shadow

#### CTA with arrow pill (Quick Vow / pitch)
A 999-radius pill with an embedded dark arrow pill on the right. The amount appears in the center, dimmed, like a Venmo button.

#### Vow card (the document)
- Surface bg, 1px gold-line border, 14-18px border-radius
- Top accent: `linear-gradient(90deg, transparent, gold, transparent)` 1px
- Header: tiny "— THE VOW —" label
- Body: Fraunces 19-27px, italic accent on the actor verb (`I'll`, `I'`)
- Footer meta: 2-3 columns, 9px labels + 13-16px values

#### Apple Pay button
Always white, native iOS treatment. Dominant when present. Google Pay is a quieter sibling below it. "Pay with card" is a small text link, never a button.

#### Wax seal (sealed state)
A radial-gradient gold disc with the "UV" rune in italic Fraunces. Surrounded by a glow halo. Used once, on the sealed confirmation. Sacred — not a logo.

#### Stamps (verdict, sealed, status)
Tiny uppercase labels with em-dash bookends: `— Sealed —` `— Verdict day —`. Always centered. Always 0.32em letter-spacing.

#### Activity row
A timeline pattern: 6px dot · uppercase tiny when · sentence. Used on active vow, witness accepted, witness pending. The dot color carries semantic weight (gold = action, green = positive, amber = waiting, dim = past).

---

## V. INTERACTION PATTERNS

### Friction philosophy
- **Add friction only at the moment of weight.** Sealing the vow. Submitting a verdict. Confirming a "broken" call.
- **Remove friction everywhere else.** Never confirm "are you sure?" on a forward-progress action. Never add "loading…" without a reason.

### Date selection
Date is a property of the vow, never a step. Always rendered as the verdict pill below the input. Tap pill → bottom sheet with: Sunday / Friday / 2 weeks / 30 days / Pick a date.

### Refine (the soft nudge)
**Triggers:** vow is <4 words OR has no verb OR has no time anchor.
**Behavior:** modal sheet appears with the user's vow quoted, two options ("Tighten it" / "Keep it as-is"). Never blocks. Never required.

### Witness picker (native)
On native, the witness is picked **before** auth and pay. The judge has a name before any money moves. This makes the auth screen heavier ("Hold for Nick") and the share moment specific, not abstract.

Big native iOS contacts picker as the dominant element. Recents shown below — and recents that have judged you before get a tiny qualifier ("judged your last vow · kept it"). Manual phone entry is a 12px text link at the bottom — escape hatch only.

The reassurance line on this screen matters: **"Nothing's been sent yet — picking just sets who."** Picking is not committing. The send happens on a later screen, by the maker.

### Witness picker (mobile web — diverges)
On mobile web, the contacts API isn't available, and typing in a name from memory is a worse experience than the native picker. So the sequence flips:

**Native:** vow → stake → witness → auth+pay → SMS handoff → sealed
**Mobile web:** vow → stake → auth+pay → share → sealed-pending

On web, the user pays first, then the share sheet **is** the witness pick. Whoever they tap into Messages becomes the judge — first to tap the link wins judge status. The sealed state shows "Sent · waiting on tap" and offers "Resend the link · Send to someone else."

This matters because the alternative ("type a phone number from memory") is brittle and produces wrong numbers; the share-sheet path uses the user's existing social graph in their existing texting app.

### SMS handoff (compliance)
Twilio doesn't allow auto-send to non-customers. **The maker always sends.** The handoff screen previews the iMessage bubble, names the recipient (on native) or stays generic (on web), and offers one big button: "Open Messages." WhatsApp / Copy link / Other live below as quieter alternates.

### Auth & identity
Identity comes from a phone number. The number ties the vow to the human, becomes the channel for verdict-day reminders, and is the only credential used for re-auth.

**Mobile (native or mobile web):** phone-first. Country code + number, OTP via Twilio, single screen. We never ask for email on the maker flow. Apple Pay sits on the same screen as the phone field — auth and stake collected in one motion.

**Desktop:** phone is harder (you have to pick up your other device for the OTP). On desktop we offer **"Use Gmail instead"** as an alternate path on the same screen — Google one-tap, no email confirmation. Phone is still primary; Gmail is an escape hatch for keyboard-bound users.

The auth field never says "log in." On a fresh vow, this is signup. On a returning user, it's recognition. The screen is identical either way — we recognize you silently and skip the OTP if your number is already on file.

### Stake (Stripe manual capture)
Apple Pay is the dominant button. We frame the transaction as **a hold, not a payment** — "$50 on hold" / "Nothing charges unless you break it." The technical reality (manual capture, capture-on-broken, refund-on-kept) maps cleanly to this language. Never use the words "deposit," "stake," or "pay" in the auth screen — only "hold." Stripe is named once, in the smallest legal text at the bottom.

### Active vow page (jobs to be done)
1. **Restate the vow** (small card at top)
2. **Show time** (countdown for one-shot, streak grid for daily)
3. **Text the judge** (deep-link to iMessage — primary tile, labeled "Check in with [Name]")
4. **Brag a little** (share tile — secondary, for the K-factor moments the user is genuinely proud of)
5. **Activity log** (witness messages, status changes, send-events)

The chat affordance is the whole game. We dropped the standalone check-in modal because the social job — "the witness sees I'm trying" — happens in iMessage, not in our log. We don't need a check-in feature; we need the maker to text the judge. The tile labels carry that intent ("Check in with him" not "Add a check-in"). Any nudge text the user sends through Messages can be referenced in the activity feed by the maker manually, but we don't store, mediate, or analyze those messages.

The chat affordance is critical. We are nudging real conversation between maker and witness. Most "kept" verdicts come because the maker felt the social pressure of the witness watching, not because of in-app reminders.

### Witness pending state
A distinct visual treatment: amber pulse, subdued vow card, dominant nudge card with "Nudge Nick →" CTA. The vow is technically live but functionally on hold. The page makes that clear without being alarmist.

### Verdict day
- **24h before:** SMS to maker ("Tomorrow's the day") and witness ("Joey's vow comes due tomorrow")
- **1h before:** SMS to maker only
- **At verdict time:** SMS to witness with link
- **Verdict prompt screen:** restates the vow, asks "Did Joey keep his word?", two big buttons (kept / broken)
- **Submit confirm:** modal with weight, names the consequence ("$100 will go to NRA"), requires explicit confirm

### Quick Vow (returning user)
One screen does everything the maker flow does in 7. Hero card with vow input + 3 inline meta pills (verdict / amount / judge). Five chips below with editable amounts. **Two CTAs in one row: "Make my vow — $50 →" (primary, gold gradient, flex 2.2) and "Dare a friend → them" (secondary, ghost with gold-line border, flex 1).**

The Dare slot exists for K-factor — making a friend feel the same heat is more shareable than making a vow yourself. Both flows reuse the same pipeline (`vow_type: 'self'` vs `'challenge'`); only the destination of the SMS handoff changes. Tapping Make goes to share-sheet (witness already picked from chip default or last-used). Tapping Dare opens contacts, then routes the SMS to the dared friend with "you've been dared" framing.

---

## VI. WHAT MAKES UV ITSELF

### The thing competitors don't have
**Real money + real friend.** Stickk has stakes but no human. Beeminder has data but no consequence. Goal apps have streaks but nothing on the line. We are the only product that combines:
1. Skin in the game (real card hold, not points)
2. Human verdict (witnessed, not algorithmic)
3. Asymmetric outcome (you get money back if you keep your word, lose it if you don't)

### The reason people share us
Two-sided virality. Every vow recruits a witness. Every witness becomes a potential maker. The witness landing page is a recruitment surface — when Nick judges Joey's vow, Nick learns the product exists in the most compelling way possible: by being asked to participate.

### The aesthetic argument
Every other commitment app looks like a wellness brand or a productivity dashboard. We look like a 19th-century legal contract — and that's the point. The product is *more serious* than its competitors, not less. The dark oxblood, the wax seal, the Fraunces serif, the word "vow" itself — all of it signals "this matters."

### What we are not
- Not a habit tracker
- Not a wellness app
- Not a productivity tool
- Not gambling (we never reward losses)
- Not a savings app
- Not therapy
- Not a coach

We are a witness. We are the friend who holds you to your word. We are the contract you sign with yourself.

---

## VII. COPY LIBRARY (CANONICAL)

### Eyebrow
- **Yesterday, you said tomorrow.** *(home)*

### Headlines
- **Make a vow. *Mean it.*** *(home)*
- **Put your card where your *word* is.** *(auth+pay, both native and web)*
- **Pick someone who'll *be honest.*** *(witness picker — native)*
- **Send it to someone *honest.*** *(share — mobile web)*
- **Tell Nick he's *on the hook.*** *(SMS handoff — native)*
- **It's *done.*** *(sealed)*
- **Joey needs you to hold him to this.** *(witness landing)*
- **Joey's vow is *up.*** *(verdict day)*
- **Did Joey *keep his word?*** *(verdict ask)*
- **Done. Joey's been *told.*** *(verdict-thanks)*
- **What would *you* put $50 on this week?** *(recruit card on verdict-thanks)*

### Subs
- **Tell a friend. Put money on it. Keep your word, win it back — or lose it somewhere it hurts.** *(home)*
- **We hold $100 — like a hotel hold. If you keep your vow, it's released. If you break it, it's gone.** *(auth)*
- **They'll get a text from you. On Sunday, they decide if you kept it.** *(witness pick)*
- **He put $100 on it. If he breaks his word, you call it.** *(witness landing)*

### Stamps
- **— Sealed —**
- **— You're in —**
- **— Verdict day —**
- **— Verdict in —**
- **— Not live yet —**
- **— Almost sealed —**

### CTAs (primary)
- **Make my vow — $50 →** *(home, quick vow)*
- **Pick your judge — $50 →** *(pitch with stake selected)*
- **Open Messages →** *(SMS handoff, web share)*
- **I'm in →** *(witness accept)*
- **Text Joey: I've got you** *(witness accepted — primary green CTA)*
- **See your vow live →** *(sealed)*
- **Nudge Nick →** *(witness pending)*
- **Check in with him / her** *(active states — opens iMessage with judge)*

### CTAs (secondary / peer)
- **Dare a friend → them** *(quick vow, peer to Make my vow)*
- **Dare Joey back** *(verdict-thanks recruit card)*
- **Pass — I can't** *(witness decline)*
- **Wait, I want to check first** *(verdict reconsider)*
- **Don't have them in contacts? Type a number** *(witness manual)*
- **Resend the link · Send to someone else** *(web sealed-pending)*

### Reassurance lines
- **Nothing charges unless you break it.** *(auth+pay, both platforms)*
- **Held by Stripe · Released Sunday if Nick says you kept it** *(auth+pay micro-line)*
- **Vow is already locked. This just lets Nick know.** *(SMS handoff — native)*
- **Whoever taps the link becomes your judge.** *(web share, web sealed-pending)*
- **Nothing's been sent yet — picking just sets who.** *(witness pick — native)*
- **On web, you'll name your judge after by sending one text.** *(web auth-pay callout)*
- **Be honest. He's counting on it.** *(verdict ask)*
- **You judged honestly. Joey owes you one.** *(verdict-thanks footer)*

### SMS templates

**Witness invite (maker sends):**
> Hey — I made a vow and put $100 on it. You're the one who decides if I kept it. Read it: unbroken.vow/[token]

**24h-before (to witness):**
> Heads up — Joey's vow comes due tomorrow at 9pm. You'll be asked to decide.

**Verdict day (to witness):**
> It's time. Did Joey keep his vow? One tap: unbroken.vow/v/[token]

**Verdict in (to maker, kept):**
> Nick says you kept your word. $100 is being released. Make another?

**Verdict in (to maker, broken):**
> Nick called it broken. $100 is going to NRA. Try again?

---

## VIII. ANTI-PATTERNS (DON'T DO THIS)

- **Don't use emoji** in product copy except where the user generates them (witness messages, check-ins). Never in our voice.
- **Don't use exclamation points.** Vows are quiet. We don't shout.
- **Don't gamify.** No points. No badges. No leaderboards. No streaks-as-status (the streak grid is informational only).
- **Don't anthropomorphize the product.** "We hold $100" is fine. "Your vow is rooting for you" is forbidden.
- **Don't soften the stake.** "$100" not "a small commitment." "If broken" not "in case of failure."
- **Don't add "How it works" links.** The product should explain itself.
- **Don't ask for an account before the vow is made.** Email/auth is post-seal, optional, soft.
- **Don't celebrate.** No confetti. No "🎉 Congrats!" The wax seal is the celebration.

---

## IX. OPERATING PRINCIPLES FOR DESIGN WORK

When making any new screen or flow, ask:

1. **Does this earn its place?** Could the user accomplish this without this screen?
2. **Is the vow visible?** The vow is the document. It should be on screen whenever possible.
3. **Is friction at a moment of weight?** If yes, keep it. If no, remove it.
4. **Does it look like a wellness app?** If yes, push back toward serious — more serif, more oxblood, less white space.
5. **Does the copy sound like a friend or a coach?** It must sound like a friend.
6. **Is the witness named?** If a witness exists, use their first name. Never "your witness."
7. **Is money mentioned in dollars, not abstractions?** "$100" not "your stake."
8. **Would Joey screenshot this?** If not, why not?

---

## X. THE ONE-SENTENCE TEST

> If a stranger sees one screen of Unbreakable Vow, they should think:
> *"This looks like a contract, not an app."*

That's the bar.

---

*Last updated: 2026-04-21 · A-v1.5++ system · Delivery 1.5 (witness-before-pay native, share-as-witness web, Dare peer CTA, Text-Judge replaces check-in)*
