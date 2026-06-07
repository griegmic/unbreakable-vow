# Instant Market — Product Strategy & Launch Plan

> **Status:** Draft v0.1 · **Owners:** Mike (product, growth) + Joe (fundraising, ops, eng)
> **Last updated:** June 7, 2026
> **Working name:** Instant Market *(open — see Key Decisions)*
> This doc is built to paste cleanly into a Google Doc. Keep one source of truth and mirror edits to the other.

---

## 0. TL;DR (the one-paragraph pitch)

Instant Market lets a friend group spin up a real bet in seconds — *"Will Eric show up tonight?"*, *"Will I hit the gym 3x this week?"* — stake on it, share it into the group chat, and have it resolved automatically by an AI that checks the evidence (a GitHub commit, a Strava run, a photo, a vote of the people involved) or by a trusted admin. It starts as the most fun way to hold your friends accountable and grows into a living prediction market for your social graph. Unbreakable Vow (solo accountability staking) becomes one mode inside it.

---

## 1. Vision

**A prediction market for your friends — as easy to start as a text.**

Today, betting with friends happens informally ("$20 says you bail") and dies in the group chat: no one tracks it, no one pays, no one remembers who was right. Polymarket-style markets are powerful but cold, anonymous, and about world events — not *your people*. Instant Market makes the bet real: easy to create, impossible to weasel out of, automatically resolved, and fun to watch live. The same primitive — *stake something on a future outcome, resolve it fairly* — powers solo accountability vows, friend-group dares, and eventually public markets anyone can join.

---

## 2. Key Truths (the beliefs this is built on)

1. **Friends already bet — they just have no rails.** Every group chat has a dozen dead "I bet you won't" moments. We're not creating a behavior; we're capturing one.
2. **Accountability needs stakes + witnesses.** Joe's core insight stands: a promise with money and an audience on it gets kept. We extend "witness" into "the whole group can bet."
3. **Resolution is the hard part and the moat.** Anyone can build a "make a bet" form. The defensible asset is a resolver people *trust* — one that fairly decides "did Eric actually show up" without a human refereeing every bet. The AI resolver, trained on real admin decisions, compounds over time.
4. **It has to live where friends already are.** The loop is: create → drop into the chat → friends pile in → resolves itself → payout + bragging rights. iMessage / group chat is the distribution channel, not a feature.
5. **Simplicity beats sophistication at the start.** No order books, no odds math, no crypto jargon. Parimutuel pools (everyone bets, winners split the pot) are simple enough for anyone and need no liquidity to function.
6. **The wedge is narrow on purpose.** Fitness accountability + private friend bets first. "Public prediction market for everything" is the destination, not the launch.

---

## 3. Why now

- **Pooled "social betting" is having a moment** but the products are either crypto-native (high friction) or pure-play-money (no stakes). There's a gap for *real, frictionless, social*.
- **AI resolution is newly viable.** LLMs + tool use can now read a GitHub repo, a Strava activity, a tweet, or a photo and make a defensible call with an evidence trail. That wasn't true two years ago.
- **Infra exists to stand on.** `sdk.markets` provides parimutuel markets, AI/admin resolution, dispute windows, embedded wallets, and settlement out of the box — we can buy the rails and focus our energy on the wedge, the social loop, and the resolver UX.
- **We have a running head start.** Joe's Unbreakable Vow MVP already ships vow creation, staking via Stripe, witnesses, SMS, and a verdict/refund state machine. ~60–70% of the "set up and settle a stake" plumbing exists (see `EXISTING_BUILD.md`).

---

## 4. What we're building (the product in one breath)

A bet/vow has three parts. Joe's app already nails #1. The launch is mostly #2 and #3.

| Part | What it is | Status |
|---|---|---|
| **1. Setup** | Create a vow or bet: the claim, the stake, who's involved, the deadline. | **Mostly built** — repurpose Joe's create→refine→stake→witness→seal UI. |
| **2. Resolution** | Decide the outcome fairly. Auto-select **admin** or **AI**; AI checks evidence (GitHub, Strava, photo, vote), with a dispute/challenge window. | **The build.** This is the crown jewel and our moat. |
| **3. Public market** | Other people can *see* live and popular bets and *bet on them* — a parimutuel market sitting on top of each public bet. | **The build.** Drives virality and the "prediction market" identity. |

---

## 5. Launch wedges

We launch on **two related wedges** that share the same engine:

### Wedge A — Unbreakable Accountability Vows (solo, fitness-leaning)
*"I vow to go to the gym 3x this week or I lose $25."* One person, real stake, a witness, AI/admin verdict. This is Joe's existing product, sharpened around fitness. It's the **single-player on-ramp** that teaches the resolution mechanic.

### Wedge B — Private Friend-Group Bets
*"Will Eric make it to dinner on time?"* The maker spins it up, drops it in the group chat, friends stake on YES/NO, AI or an admin resolves, the pot pays out. This is the **multiplayer viral loop**.

**Beachhead communities:** (1) **fitness / gym friend groups** — vows and "will they show up" bets are the same muscle; (2) **college / young social** — dense social graphs, heavy group-chat usage, native to low-stakes social betting.

---

## 6. Core features to ship for launch (MVP scope)

**Must-have for v1:**

1. **Fast create flow** — vow *or* bet, from a single screen. Reuse Joe's refine step (turn a rough claim into a crisp, resolvable statement). Resolvability check up front: *"How will we know this is true?"*
2. **Stake + pool** — put money in. Solo vow = self-stake; group bet = parimutuel pool (everyone's stake goes in, winners split). Money model is an open decision (§8) — Stripe-leaning at first.
3. **Share into the chat** — a rich, tappable link/card that opens the live bet. iMessage/group-chat first. This is the growth surface, not an afterthought.
4. **The AI Resolver (v1)** — see §7. Auto-pick admin vs AI, evidence hints, maker/council confirmation, dispute window, evidence artifact.
5. **Live bet view** — current pool, who's in, YES/NO split, countdown to deadline. Works on web (no install) and in-app.
6. **Outcome + payout** — resolve, show the evidence, pay out (or refund on void), and a shareable "I was right" / "vow kept/broken" certificate (Joe already has certificate UI).
7. **Auth + identity** — phone/email sign-in; witnesses/targets can participate via token without a full account (Joe's token model already does this).

**Fast-follow (post-launch):**
- **Public feed** — discover trending/popular bets and join them.
- **Profiles & track record** — your win rate, vows kept, "most accountable friend."
- **Leaderboards / streaks** for the fitness wedge.
- **Processing fee / take rate** (monetization — free at launch).
- **Notifications** that pull people back: "bet resolves in 1h," "Eric just bailed."

**Explicitly out of scope for v1:** order books / dynamic odds, public market for world events, fully open market creation, anything requiring users to understand crypto.

---

## 7. The AI Market Resolver (the moat)

This is the piece we must get an MVP of and improve forever. The vision:

- **An extremely simple UI.** The maker writes the claim; the system *automatically* proposes how it'll be resolved — no config burden on the user.
- **Auto-select the path:**
  - **Admin** — a named human (the maker, a witness, or a trusted third party) resolves. Best for fuzzy, private bets.
  - **AI (default)** — a powerful resolver researches and verifies against evidence, then decides.
- **AI checks real evidence.** Examples: *"I vow to upload my new code this weekend"* → AI inspects the GitHub repo for a weekend commit. *"3 gym sessions this week"* → Strava/Apple Health. *"Eric showed up"* → a photo, a check-in, or a vote of the people present.
- **The AI knows when it can't.** If a resolution path isn't valid/verifiable, it **consults the bet maker** ("how should I verify this?") or **polls a council / sample of the people involved** to reach a verdict. Graceful fallback, never a dead end.
- **Evidence artifact + dispute window.** Every resolution produces an inspectable evidence trail. A challenge window lets participants dispute; majority dispute voids and refunds (this mirrors how `sdk.markets` does it).
- **It learns.** Admin decisions become training data. Over time the AI handles more cases unaided, raising trust and lowering cost. **This compounding loop is the defensible asset.**

> **Build vs. buy:** `sdk.markets` ships exactly this shape — admin-or-AI resolution with evidence hints (tweet, Strava, API endpoint, news article), a challenge window, embedded wallets, and USDC-on-Base settlement. **Investigation point:** can we use its AI resolver and market mechanics while settling money through Stripe (fiat), or does using the SDK mean adopting its USDC rails? This coupling is the central technical question for v1 (see §8).

---

## 8. Key Decisions (table — with trade-offs & investigation points)

> This is the live decisions log. Each row: the call, the lean, why it's hard, and what to investigate before locking.

| # | Decision | Current lean | Trade-offs | Investigation points |
|---|---|---|---|---|
| D1 | **Money model** | Stripe (fiat) unless it triggers violations | **Stripe:** familiar, already wired by Joe, "feels like dollars." **Risk:** pooled peer-to-peer betting on real money can implicate US state gambling laws, money-transmitter licensing, federal UIGEA, and **Stripe's own ToS** (which restricts gambling). **USDC via sdk.markets:** sidesteps some payment-processor ToS issues and ships resolution+wallets, but adds crypto/regulatory complexity. **Play-money:** zero legal risk, weaker pull. | Get a real read on: (a) skill-vs-chance framing (accountability vows lean "skill," which is treated more leniently in many states); (b) which states are hard-nos; (c) Stripe ToS for "contests/wagering"; (d) whether a "no-rake at launch" posture lowers risk; (e) money-transmitter exposure when we hold/route a pot. **Get a lawyer read before real-money launch.** |
| D2 | **Resolution stack: build vs. buy** | Buy resolution rails from `sdk.markets`, own the UX + training loop | Buying = faster to a trustworthy resolver + dispute window + wallets. Building = full control, no dependency, but slow and we re-invent settlement. | Can sdk.markets' AI resolver/markets run while money settles via Stripe? Is there an API to use resolution **without** USDC settlement? Pricing/fees? Self-host vs hosted? Read their docs + repo + the resolution example on their site. |
| D3 | **Where it lives** | iOS app **+** web experience | Native app = best live-market UX, notifications, wallet. Web = zero-install, shareable links that open anywhere (critical for the group-chat loop). True iMessage extension = native to chat but Apple's sandbox makes wallets/markets very hard. | Confirm: app for creators/heavy users, web link for "tap to join from the chat." Decide if a Messages extension is worth it later. |
| D4 | **Brand & relationship to Unbreakable Vow** | New name (working: **Instant Market**); Unbreakable Vow becomes a **mode/feature** inside it | New brand = room to be bigger than "vows." Folding UV in = reuse equity + code. | Lock a name + domain. Decide whether UV keeps its own identity for the fitness wedge or is fully absorbed. |
| D5 | **Default resolution behavior** | Auto-pick admin vs AI; **AI is the default**; consult maker/council on ambiguity | AI-first scales but risks bad calls on fuzzy bets. Admin-first is trustworthy but doesn't scale to public markets. | Define the decision tree for when AI auto-resolves vs. escalates. Build the dispute/council fallback. |
| D6 | **Monetization** | **Free at launch**; small processing fee later | Free maximizes the viral loop. A rake aligns revenue with usage but adds the regulatory weight of "operating a betting market." | Model a take-rate later; decide rake vs. subscription vs. stake-margin once volume exists. |

---

## 9. Open questions / things to investigate

- **Legal/regulatory (highest priority):** real-money social betting by state; skill-vs-chance; money transmission; Stripe ToS; whether starting fitness-vow-only (clearly "skill") de-risks launch. *Get counsel before charging real money.*
- **sdk.markets integration:** API surface, can resolution decouple from USDC settlement, fees, self-host option, rate limits, how their AI oracle handles disputes. (Their site is the best reference for the resolution UX — review it directly.)
- **Evidence-source ToS:** e.g., **Strava's API agreement reportedly restricts AI inference on its data** — confirm before relying on it as an evidence source. Same diligence for any API we read (GitHub, calendars, etc.).
- **Cold-start for public markets:** how do public bets get enough participants to feel alive? (Likely: seed from active private bets that opt in.)
- **Abuse & trust:** collusion, fake evidence, admin bias, people refusing to pay. The dispute window + AI evidence trail are the first defenses.
- **iMessage mechanics:** rich link previews, what actually renders in the chat, web fallback.

---

## 10. Example marketing tweets (voice test)

> Tone: confident, funny, a little chaotic. The product sells itself when the bet is relatable.

- "your group chat has said 'i bet you $20 you won't' nine times this month and collected $0. we fixed that. 🤝"
- "Will Eric show up tonight? 14 friends have $340 riding on NO. Eric, the whole table is against you."
- "I vowed to hit the gym 3x this week or I lose $50. My AI referee checks my Strava. There is no lying to the machine."
- "Polymarket but it's about whether your roommate will actually do the dishes."
- "We built an AI that reads your GitHub to settle the bet on whether you'd ship this weekend. You did not ship this weekend."
- "Make a bet → drop it in the chat → it resolves itself → someone gets paid. The entire app. ⚡"
- "Accountability used to mean a friend nagging you. Now it means 6 friends with money on you failing. Wildly more effective."
- "the most-bet-on market this week: 'will Jake text his ex back' — YES is up to 71%. stay strong jake."
- "started as 'will I go to the gym.' became a prediction market for my entire friend group. send help (and your stake)."

---

## 11. Roles & responsibilities

| Area | Owner | Notes |
|---|---|---|
| **Product, design, roadmap** | **Mike** | Vision, spec, the resolver UX, prioritization. |
| **Growth / GTM** | **Mike** | Launch motion, community seeding (fitness + college), viral loops, content/tweets. |
| **Fundraising** | **Joe** | Deck, investor conversations, financial model. Combo effort, Joe leads. |
| **Ops** | **Joe** | Legal/regulatory coordination, payments setup, vendor (sdk.markets/Stripe) relationships, company ops. |
| **Engineering** | **Both / TBD** | Joe built the MVP; decide who carries the resolver build and whether to add help. |

*This is a combo on most fronts — Joe's strengths are fundraising + ops, Mike's are product + growth.*

---

## 12. Action plan (phased)

**Phase 0 — Decide & de-risk (now → 2 weeks)**
- [ ] Lock the name + domain (D4).
- [ ] Legal gut-check on real-money model; pick the launch money posture (D1).
- [ ] Spike sdk.markets: read docs + repo + resolution example; confirm whether resolution can decouple from USDC; document the integration path (D2).
- [ ] Write the resolver decision tree (when AI auto-resolves vs. escalates to maker/council) (D5).
- [ ] Finalize this strategy doc → Google Doc.

**Phase 1 — Sharpen the single-player wedge (weeks 2–5)**
- [ ] Reskin Joe's vow flow into the fitness accountability vow.
- [ ] Ship AI resolver v1 on one evidence source (e.g., GitHub commit or Strava run) end-to-end.
- [ ] Dispute window + evidence artifact.
- [ ] Shareable outcome certificate.

**Phase 2 — The multiplayer loop (weeks 5–9)**
- [ ] Parimutuel group bet: create → share into chat → friends stake → pool.
- [ ] Live bet view on web (zero-install) + in-app.
- [ ] Admin-resolution path + council/vote fallback.
- [ ] Notifications that pull people back.
- [ ] Closed beta with 3–5 fitness/college friend groups.

**Phase 3 — Public & growth (weeks 9+)**
- [ ] Public feed of trending/popular bets you can join.
- [ ] Profiles + track records + leaderboards.
- [ ] Introduce a small processing fee.
- [ ] Broader launch + the tweet engine.

---

## 13. Risks

- **Regulatory** — real-money betting is the existential risk; mitigate with the skill-leaning fitness wedge first and counsel before charging.
- **Resolver trust** — if the AI makes bad calls, the whole promise breaks. Mitigate with evidence artifacts, dispute windows, and human fallback while the model learns.
- **Cold-start / retention** — a bet that no friends join is dead. Mitigate by launching into existing tight groups, not a public void.
- **Platform dependency** — leaning on sdk.markets means inheriting its constraints/pricing. Mitigate by keeping our setup + resolver UX layer portable.
- **Payment-processor risk** — Stripe could shut us down if we look like gambling. Mitigate via money posture in D1.

---

## 14. What success looks like (early signal metrics)

- **Activation:** % of created bets that get ≥2 other people staking.
- **Loop:** bets shared into a chat → new users who join → who then create their own.
- **Resolution trust:** % of bets resolved with no dispute; AI auto-resolve rate over time (should climb as it learns).
- **Retention:** groups running ≥1 bet/week, 4 weeks in.
- **The north star:** weekly active *betting groups*.

---

## Appendix — Glossary

- **Parimutuel market:** everyone's stakes go into one pool; when the outcome is known, winners split the pool (like horse racing). No odds-matching or liquidity needed — ideal for friend groups.
- **AI oracle / resolver:** the system that researches evidence and decides a market's outcome autonomously, producing an inspectable evidence trail.
- **Evidence hint:** a source the maker attaches so the resolver knows where to look (a GitHub repo, Strava profile, tweet, calendar, photo, API endpoint).
- **Challenge / dispute window:** a period after a proposed resolution where participants can contest it; a majority dispute voids the market and refunds stakes.
- **Admin resolution:** a named human decides the outcome — used when AI can't verify or for private/fuzzy bets.
- **sdk.markets:** a TypeScript SDK providing parimutuel markets, AI/admin resolution with evidence + dispute windows, embedded (email) wallets, and USDC-on-Base settlement — a candidate to provide our resolution + settlement rails.
