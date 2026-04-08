# Unbreakable Vow: Feature Prioritization & Strategy Analysis

## Expert Panel Synthesis — April 2026

---

## PRIORITIZATION MATRIX

| # | Feature | Viral Impact | User Value | Revenue | Complexity | Priority |
|---|---------|-------------|-----------|---------|-----------|----------|
| 1 | Shareable Vow Certificates | ★★★★★ | ★★★☆☆ | ☆☆☆☆☆ | ★☆☆☆☆ | **NOW** |
| 2 | Streak Mechanics + Milestones | ★★★★☆ | ★★★★★ | ☆☆☆☆☆ | ★★☆☆☆ | **NOW** |
| 3 | Active Vow Timeline + Check-ins | ★★☆☆☆ | ★★★★★ | ☆☆☆☆☆ | ★★☆☆☆ | **NOW** |
| 4 | Ghost Witness Escalation | ★☆☆☆☆ | ★★★★★ | ☆☆☆☆☆ | ★★☆☆☆ | **NOW** |
| 5 | Push a Vow (Challenge Someone) | ★★★☆☆ | ★★★★☆ | ☆☆☆☆☆ | ★★★☆☆ | **NEXT** |
| 6 | Group Vows (2-5 people) | ★★★★☆ | ★★★★☆ | ★★☆☆☆ | ★★★★☆ | **NEXT** |
| 7 | Keeper Identity / Profiles | ★★★☆☆ | ★★★★★ | ★☆☆☆☆ | ★★☆☆☆ | **NEXT** |
| 8 | AI Proof Verification | ★★☆☆☆ | ★★★★☆ | ☆☆☆☆☆ | ★★★☆☆ | **NEXT** |
| 9 | Premium Subscription | ☆☆☆☆☆ | ★★★☆☆ | ★★★★★ | ★★☆☆☆ | **NEXT** |
| 10 | Broken Vow Recovery Flow | ☆☆☆☆☆ | ★★★★★ | ☆☆☆☆☆ | ★☆☆☆☆ | **NOW** |
| 11 | Vow Withdrawal / Escape Hatch | ☆☆☆☆☆ | ★★★★☆ | ☆☆☆☆☆ | ★☆☆☆☆ | **NOW** |
| 12 | Vowkeeper AI Bot (SMS) | ☆☆☆☆☆ | ★★★☆☆ | ☆☆☆☆☆ | ★★★☆☆ | **LATER** |
| 13 | Affiliate Commerce | ☆☆☆☆☆ | ★☆☆☆☆ | ★★★☆☆ | ★★★☆☆ | **LATER** |
| 14 | Sponsored Challenges | ☆☆☆☆☆ | ★★☆☆☆ | ★★★★★ | ★★★★★ | **YEAR 2+** |
| 15 | Enterprise B2B | ☆☆☆☆☆ | ☆☆☆☆☆ | ★★★★★ | ★★★★★ | **YEAR 2+** |

---

## DETAILED FEATURE ANALYSIS

### 1. SHAREABLE VOW CERTIFICATES

**What:** When a user seals a vow, generate a beautiful dark-and-gold certificate graphic they can screenshot and share to social media.

**Why it matters (Virality):**
- Wordle's emoji grid proved that simple, distinctive shareable artifacts drive massive organic growth
- Your dark + gold aesthetic is already Instagram-worthy and visually distinctive
- Users share commitments (aspirational) more readily than results (privacy concerns)
- Every share is a free ad with built-in curiosity hook ("What is this app?")
- K-factor estimate: 0.5–0.8

**Viral loop:**
User seals vow → gets certificate graphic → screenshots to Instagram/Twitter → followers see distinctive dark+gold aesthetic → curiosity → download

**UX execution:**
- Auto-generate after seal ceremony
- Include: vow text (in serif), stake amount, witness name, date
- "Share" button with native share sheet
- Optional: include QR code or deep link to app

**Complexity:** Low (1-2 days). Template generation + share sheet integration.

---

### 2. STREAK MECHANICS + MILESTONE SHARING

**What:** Track consecutive kept vows. Unlock titles and shareable milestone cards at 3/7/14/30/60/100 days.

**Why it matters (Retention + Virality):**
- Duolingo data: users with 7-day streak are 3.6x more likely to remain engaged long-term
- 10M+ Duolingo users maintain streaks >365 days
- Snapchat streaks drove massive teenage engagement
- Sunk-cost psychology: the longer your streak, the more painful to break it
- Milestones create natural "sharing moments" (brag-worthy)

**Progression system:**
- 3 vows: "Committed"
- 7 vows: "Keeper"
- 14 vows: "Steadfast"
- 30 vows: "Unbreakable"
- 100 vows: "Legendary"

**UX execution:**
- Streak counter always visible on home screen
- Milestone unlock = celebration animation + shareable card
- "Streak freeze" option (1 per month, earned or purchased)

---

### 3. ACTIVE VOW TIMELINE + CHECK-INS

**What:** During the active vow period (between seal and verdict), show a live timeline with optional user check-ins that notify the witness.

**Why it matters (UX):**
- Currently the app has a ceremony at the start and verdict at the end, with nothing in between
- This "boring middle" is where users forget about the app and disengage
- Studies show even passive visibility increases follow-through by 20-30%

**UX execution:**
- Timeline view: "Day 3 of 7" with progress dots
- Tap to add check-in: "I'm on track" / "I'm struggling" / "Done for today"
- Each check-in notifies witness (one line: "Jordan checked in on Day 3")
- Witness can send ONE encouragement message per check-in (not a conversation)
- Daily in-app prompt: "Day 3 of 7. How are you feeling?" (journaling-style, optional)

**Magic moment:** On completion, show the arc — what you said Day 1, what you said Day 7. Narrative completion is psychologically powerful.

---

### 4. GHOST WITNESS ESCALATION + AUTO-VERDICT

**What:** Automatic escalation when witness doesn't deliver verdict on time.

**Why it matters (Trust + Reliability):**
- stickK is dying because of technical reliability issues
- Pact was shut down by FTC because verification broke
- Lesson from competitive landscape: broken accountability mechanisms destroy trust permanently
- Vows MUST always resolve — purgatory kills the app

**Escalation flow:**
- End date + 24 hours: gentle reminder to witness
- End date + 48 hours: escalation ("This is overdue")
- End date + 72 hours: witness loses "trusted" badge temporarily
- End date + 96 hours: auto-verdict triggers (user chooses default at seal time)

**UX execution:**
- At seal time, add: "If your witness doesn't respond within 4 days, default to: [I kept it / I broke it]"
- Witness sees warning on their dashboard
- User sees escalation status on live vow timeline

---

### 5. PUSH A VOW (CHALLENGE SOMEONE)

**What:** Create a vow for someone else. Stake your own money as their reward if they succeed.

**Viral loop:**
User A creates vow for User B → sends challenge link → User B receives "Sarah challenged you to X and put $50 on it" → User B downloads app → accepts → completes → wins money → tells friends

**Why it works:**
- Pull viral: non-users get direct, compelling invitations
- Money on the line creates emotional hook ("someone bet $50 I can do this")
- Creates stories people tell: "My friend challenged me to..."

**Friction risks:**
- Download friction: User B must install app + enter payment info to accept
- Social awkwardness: can feel like peer pressure or condescension
- Only works with pre-existing relationships

**UX execution:**
- New flow: "Challenge a friend" → select contact → draft vow → set YOUR stake → send link
- Recipient sees: "[Name] challenged you to [vow]. They put $[X] on it. Do you accept?"
- Accept = seal ceremony. Decline = graceful exit ("Not this time" — no shame)
- If recipient succeeds: they get the challenger's money
- If recipient fails: money goes to charity (not back to challenger — avoids perverse incentives)

**Key design decision:** Make declining feel honorable, not weak. Consider: "I respect the challenge, but not this time."

---

### 6. GROUP VOWS (2-5 PEOPLE)

**What:** Multiple people commit to the same vow, with shared accountability and a group witness.

**Why it matters:**
- K-factor 0.8–1.2 (approaching viral threshold)
- Peer pressure (healthy kind) is the strongest accountability mechanism
- Group completion → celebration → screenshot → organic sharing
- Fantasy football comparison: the ritual creates bonding, the stakes create conversation

**Magic moment:** 5 people seal a group vow. On completion, notification: "The crew kept the vow. $50 from each of you moved into a shared pool. You earned $250 together. Time for a group dinner?"

**Complexity risks:**
- Coordination overhead: getting 5 people aligned on same vow/stakes/timeline
- Fairness: if 3/5 keep it and 2 break it, what happens?
- Social dynamics: one failure creates group tension

**UX execution (start simple):**
- Phase 1: Pairs only (you + one friend, same vow, one witness)
- Phase 2: Groups of 3-5 with simple majority rule
- Clear upfront: "If you break your vow, you lose YOUR stake. Others keep theirs."
- Shared group chat for banter and check-ins
- One designated witness for the whole group

---

### 7. KEEPER IDENTITY / PROFILES

**What:** After completing multiple vows, users build a visible identity and reputation.

**Progression:**
- 1 vow: "First Vow" badge
- 5 vows kept: "Keeper" title + profile unlocked
- 10 vows: "Unbreakable" title
- 20 vows: "Legendary" title
- Stats: kept/broken ratio, total stakes risked, longest streak, favorite categories

**Why it matters:**
- Identity formation is the strongest long-term retention mechanism
- The app becomes part of how people see themselves
- Public profiles create social proof (friends see your record)
- Witness reputation system creates a two-sided network effect

**Witness reputation:**
- After witnessing 5+ vows: "Trusted Witness" badge
- Stats: vows witnessed, average response time, fairness rating
- Other users prefer higher-reputation witnesses

---

### 8. AI PROOF VERIFICATION

**What:** Users submit photo/screenshot evidence. AI validates it for objective vows.

**Critical rule: AI assists, never replaces witness.**

**Works for:**
- Gym selfie (location + timestamp verification)
- Code commits (screenshot of GitHub)
- Clean room / organized space (before/after comparison)
- Food diary (photo of meal)

**Doesn't work for:**
- Subjective goals ("be more present")
- Effort-based goals ("give 100% at work")
- Anything requiring interpretation

**UX execution:**
- During active vow: "Submit proof" button
- Upload photo → AI analyzes → provides assessment to witness
- Witness sees: photo + AI assessment + their own judgment call
- AI never overrides witness decision

---

### 9. BROKEN VOW RECOVERY FLOW

**What:** When a vow is broken, reframe it as feedback and offer immediate re-attempt.

**Why it matters:**
- Broken vow = shame → app abandonment → churn
- This is the #1 reason accountability apps die
- Pact's churn after first failure was catastrophic

**UX execution:**
- When verdict = "broken," DON'T show sad screen immediately
- Witness has 48 hours to provide context: "You got 4/7 days. Not a failure — a learning."
- User sees verdict + witness context together
- Then: "Want to try again? Same vow, next week, $5 stake." (Lower stakes for re-attempts)
- Record shows "Broke → Re-attempted" (growth narrative, not shame narrative)

---

### 10. VOW WITHDRAWAL / ESCAPE HATCH

**What:** Users can withdraw from a vow mid-way, with clear consequences.

**Why it matters:**
- People set vows wrong sometimes (too ambitious, bad timing, life happens)
- Without an exit, they abandon the app entirely
- With a clear exit, they feel respected and return

**UX execution:**
- "I need to stop this vow" button on live vow screen
- Consequence: you forfeit your stake (goes to charity)
- Witness notified: "Jordan withdrew their vow 10 days early. They forfeit their $25."
- Record shows: "Withdrew" (distinct from "Broke" — shows self-awareness)
- Option: "Set a new vow" immediately after withdrawal

---

## COMPETITIVE LANDSCAPE SUMMARY

| App | Status | Rating | Key Lesson |
|-----|--------|--------|------------|
| **stickK** | Stagnant | 3.3/5 iOS | Technical reliability kills trust |
| **Beeminder** | Niche | 3.7/5 Android | Works psychologically, zero product momentum |
| **Habitica** | Healthy (15M DLs) | 4.0+/5 | Gamification fades; no real consequences |
| **Pact/GymPact** | DEAD (FTC shutdown) | N/A | Broken verification = legal + trust death |
| **Forfeit** | Growing | 4.9/5 iOS | Closest competitor; keeps forfeited money (user resentment) |
| **Duolingo** | Dominant | 4.7/5 | Streaks + simplicity = retention gold |

**Your differentiator vs. Forfeit:** You let users choose where forfeited money goes (charity, witness, anti-cause). Forfeit keeps it. Lean into this — it's your wedge.

**The Pact lesson (critical):** Pact didn't fail because stakes-based accountability doesn't work. It failed because their verification was broken and they charged users incorrectly. The FTC shut them down. Your verification mechanism MUST be bulletproof. Use human witnesses as the primary judge, AI as support, and build clear dispute resolution.

---

## MONETIZATION ROADMAP

### Phase 1: Months 1-3
- **Premium subscription** ($4.99-9.99/month): Unlimited vows, analytics, witness management
- Target: 15% free-to-premium conversion
- Revenue at 10K users: ~$900/month

### Phase 2: Months 3-6
- **Platform fee on stakes** (3-5%): Requires legal clarity on money transmission first
- Revenue at 10K users: ~$900/month additional

### Phase 3: Months 6-12
- **Affiliate commerce** (build infrastructure, expect modest returns)
- Revenue at 50K users: ~$500-1,000/month

### Phase 4: Year 2+
- **Enterprise B2B** (white-label for corporate wellness)
- **Sponsored challenges** (brands pay for access to high-intent users)
- Revenue potential at 200K users: $75-105K/month

### Affiliate Commission Rates by Category
- SaaS/Productivity (Opal, AI tools): 25-30% recurring
- Language Learning (Babbel): 35-40%
- Fitness/Apparel: 8-15% average
- Sleep Tech (Hatch, Eight Sleep): 5-10%
- Note: Duolingo has NO cash affiliate program

### Revenue Projections

| Metric | 10K Users | 50K Users | 200K Users |
|--------|-----------|-----------|------------|
| Premium Revenue | $900/mo | $4,500/mo | $25-30K/mo |
| Platform Fee | $900/mo | $4,000/mo | $16K/mo |
| Affiliate | $50/mo | $500/mo | $3-5K/mo |
| Enterprise | $0 | $0 | $15-30K/mo |
| Sponsors | $0 | $0 | $15-25K/mo |
| **Total Monthly** | **$1,850** | **$9,000** | **$74-106K** |

---

## CRITICAL RISKS

### 1. Money Transmitter Licensing (HIGHEST PRIORITY)
Holding user stakes and releasing to third parties likely triggers money transmitter licensing in 47 states. FinCEN's escrow exemption does NOT cover third-party beneficiary situations (charity, witness payouts). Budget $3-5K for legal opinion BEFORE launching real-money features. Full licensing if required: $75-150K first year.

### 2. Stripe Policy Risk
Stripe prohibits "games of chance" and "contests with monetary prizes." Stakes-based accountability could be flagged. Get explicit Stripe approval or explore alternatives.

### 3. Chargeback Risk
Users who lose vows may dispute charges. Build clear terms, mandatory agreement at seal time, and a dispute resolution period (24-48 hours before funds release).

### 4. Ethical Considerations
- Cap maximum stakes ($500-1000) to prevent financial harm
- Mandatory pause between broken vows and re-attempts (48 hours)
- Consider mental health resources on broken-vow screen
- Transparency: share app-wide success/failure rates in settings

---

## VIRAL MECHANICS SUMMARY

**What creates sharing:** Shareable certificates, milestone cards, streak screenshots, group completion celebrations

**What creates pull (non-users → users):** Push-a-vow challenges, group vow invitations, witness invitations via SMS magic link

**What creates retention:** Streaks, identity progression, witness relationships, active vow timeline, broken vow recovery

**What does NOT create growth (common misconceptions):**
- AI bot via SMS (private, zero sharing)
- Affiliate commerce (monetization only)
- Challenges marketplace (internal feature)

---

## PHASED BUILD ROADMAP

### Phase 1: Core Experience (Ship in 1-2 weeks)
- [ ] Shareable vow certificates
- [ ] Active vow timeline with check-ins
- [ ] Ghost witness escalation + auto-verdict
- [ ] Broken vow recovery flow
- [ ] Withdrawal / escape hatch
- [ ] Basic streak counter

### Phase 2: Growth & Identity (Weeks 3-4)
- [ ] Streak milestones + shareable cards
- [ ] Keeper identity / profile system
- [ ] Witness reputation badges
- [ ] Push a vow (challenge someone)

### Phase 3: Social & Monetization (Weeks 5-8)
- [ ] Group vows (start with pairs)
- [ ] AI proof verification
- [ ] Premium subscription tier
- [ ] Platform fee (pending legal)

### Phase 4: Scale (Month 3+)
- [ ] Affiliate commerce infrastructure
- [ ] Leaderboards
- [ ] Enhanced group vows (3-5 people)
- [ ] SMS bot (support only, not witness)

### Phase 5: Business (Year 2+)
- [ ] Enterprise B2B outreach
- [ ] Sponsored challenges
- [ ] Coach/witness marketplace
