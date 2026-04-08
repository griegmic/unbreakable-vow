# Unbreakable Vow: Expert UX Audit — Final Synthesis

## Panel: Nikita Bier (Virality) · Julie Zhuo (Cognitive Load) · Nir Eyal (Behavioral Design) · Rahul Vohra (Speed/Delight) · Rory Sutherland (Behavioral Economics)

---

## EXECUTIVE SUMMARY

Five experts audited every screen in the app. They agreed on far more than they disagreed. The consensus: **the seal ceremony is genuinely world-class, but the path to get there is too long, too cluttered, and optimizes for ceremony over conversion.** The app has 13-15 taps and 7+ screens between "I opened the app" and "my vow is sealed." It should be 8-10 taps and 5-6 screens.

---

## UNANIMOUS RECOMMENDATIONS (All 5 experts agree)

These are the changes every expert independently flagged. Ship these without debate.

### 1. DELETE OR MERGE THE SENT SCREEN

**Who flagged it:** All 5
**Current:** Seal → Certificate → Sent → Live (3 post-seal screens)
**Problem:** Sent repeats information already shown on Seal (vow, witness, stake, verdict date). Its "Got it" button is a dead tap. The "what happens next" steps card explains mechanics the user already understands.
**Fix:** Seal → Certificate → Live. Kill sent.tsx entirely. If you want the success checkmark animation, add it as a 2-second overlay on the certificate screen or the live screen.
**Impact:** Removes 1 screen, 1 tap, and ~4 redundant information displays.

### 2. SIMPLIFY THE WITNESS SCREEN

**Who flagged it:** All 5
**Current:** 4 modes (choose → contacts → manual → invite), plus a collapsible crew section with its own sub-flows. 5-7 decisions on one screen.
**Problem:** Julie Zhuo: "This screen violates the ONE JOB rule catastrophically." Rahul Vohra: "Complexity nightmare." Nikita Bier: "Crew section is killing conversion."
**Fix:** Split into focused screens:
- Screen 1: Pick witness (3 clear options: contacts, type a name, Vowkeeper). One decision.
- Screen 2: Invite method (SMS vs link) — only if not Vowkeeper. One decision.
- Crew: Move to post-seal. On the live screen, offer "Add others to hold you accountable."
**Impact:** Reduces witness-step decisions from 5-7 to 1-2. Removes crew from the critical path.

### 3. BUILD THE CERTIFICATE SCREEN

**Who flagged it:** All 5
**Current:** No shareable artifact exists.
**Problem:** The viral share moment doesn't exist. Users seal a vow and have nothing to show for it.
**Fix:** Already designed (see v1-build/prompts/02-vow-certificate.md). Dark-and-gold image, vow text in serif, stake amount, seal date. Share button.
**Impact:** Nikita Bier estimates 3-5x increase in organic sharing. This is the #1 viral mechanic.

### 4. STOP REPEATING THE VOW TEXT

**Who flagged it:** Julie Zhuo, Rahul Vohra, Nikita Bier
**Current:** Vow text appears on 6+ screens: home, refine, witness (preview), stake (compact), seal (summary), sent, live, verdict, outcome.
**Problem:** After refine, the vow is locked. Showing it on every subsequent screen is redundant noise.
**Fix:** Show the vow on: home (input), refine (editing), seal (final confirmation), certificate (shareable), live (hero), verdict (judgment context), outcome (resolution). Remove VowPreview from witness and stake screens.
**Impact:** Reduces visual clutter on 2-3 screens. Users stop scrolling past text they've already read.

### 5. REMOVE THE VERDICT CONFIRMATION MODAL

**Who flagged it:** Julie Zhuo, Rahul Vohra, Nir Eyal
**Current:** User taps "Kept" or "Broke it" → modal asks "Are you sure?" → confirm.
**Problem:** The user already made a deliberate choice (tapping a card). The modal adds a tap for no value.
**Fix:** Card tap → haptic feedback → navigate directly to outcome. If you want safety, add a 3-second "Undo" toast instead.
**Impact:** Removes 1 unnecessary tap from the most emotionally charged moment.

---

## MAJORITY RECOMMENDATIONS (3-4 experts agree)

These have strong support but include one or two dissenting views. Review the arguments.

### 6. MOVE AUTH EARLIER OR MAKE IT INVISIBLE

**Agree:** Nikita Bier, Nir Eyal, Rahul Vohra (3/5)
**Disagree:** Julie Zhuo (auth placement is fine), Rory Sutherland (auth friction can increase commitment)

**Current:** Home → Refine → Witness → Stake → **Auth** → Seal
**Problem (majority):** Auth interrupts momentum after the user has already invested effort. Nikita: "Auth should happen before stake or be handled by Stripe at payment time." Nir Eyal: "Stake is peak motivation; auth kills it right before the climax."
**Counterargument (Sutherland):** "Friction at the right moment increases perceived value. Auth after stake signals 'this is real.' Removing it may cheapen the commitment."

**Decision point for you:**
- **Option A:** Move auth to after witness, before stake. Flow: Home → Refine → Witness → Auth → Stake → Seal. Auth becomes "verify your identity to lock in the terms."
- **Option B:** Remove auth screen entirely. Handle identity during Stripe payment (Apple Pay / Google Pay includes authentication). No separate auth step.
- **Option C:** Keep current position but add vow summary to the auth screen so users see the full commitment before signing in.

**Recommendation:** Option B is cleanest (Stripe handles it). Option A is safest. Option C is the minimum fix.

### 7. REFRAME THE OATH TEXT — MAKE IT VISIBLE BEFORE SEALING

**Agree:** Nir Eyal, Rory Sutherland, Rahul Vohra (3/5)
**Neutral:** Nikita Bier, Julie Zhuo

**Current:** The dramatic oath ("I solemnly swear to keep my word this week") only appears as a flash AFTER sealing. Before sealing, the oath checkbox has smaller, less dramatic text.
**Problem:** The psychologically weighty moment (reading the oath) happens after the commitment, not before. Users should feel the weight, then commit.
**Fix:** Move the large serif oath text into the swear card, visible before the checkbox. When sealed, the oath text animates to fill the screen (the current flash effect), then transitions to the next screen.
**Impact:** Increases the psychological weight of the seal moment by ~20% (Nir Eyal's estimate).

### 8. COLLAPSE "HOW IT WORKS" ON HOME SCREEN

**Agree:** Nikita Bier, Julie Zhuo, Rahul Vohra (3/5)
**Disagree:** Nir Eyal (education reduces anxiety for first-time users)

**Current:** Three explanation cards at the bottom of the home screen explaining the flow.
**Problem (majority):** Home screen's one job is "write a vow." The explainer competes for attention and pushes the CTA down on small phones.
**Fix:** Remove or collapse into a "How does it work?" link that opens a modal. Let users discover the flow by doing it.
**Counterargument (Eyal):** "For a product asking people to risk real money, some upfront education reduces anxiety and increases trust."

**Recommendation:** Collapse it. Users who need it can expand it. Users who don't aren't slowed down.

### 9. DEFAULT STAKE AMOUNT SHOULD BE $50, NOT $25

**Agree:** Rory Sutherland, Nir Eyal, Nikita Bier (3/5)
**Disagree:** Rahul Vohra (lower default reduces first-vow friction), Julie Zhuo (neutral)

**Current:** Default stake is $25 ("Enough to sting").
**Problem (majority):** $25 doesn't create enough loss aversion. Sutherland: "The default anchors expectations. $25 signals 'this isn't that serious.'" Eyal: "$50 paired with anti-cause creates 3x more motivation than $25 to charity."
**Counterargument (Vohra):** "For a first-time user who doesn't trust the app yet, $50 is scary. $25 gets them in the door. They'll increase on vow #2."

**Decision point for you:**
- **Option A:** Default to $50. Trust that people who download an accountability app are serious.
- **Option B:** Keep $25 default but change the hint to "Most people choose $50" (social proof nudge without forcing).
- **Option C:** No default. Force selection. (Nikita Bier opposes this — "always have a default.")

**Recommendation:** Option B. Social proof nudge without scaring first-timers.

---

## SPLIT DECISIONS (2-3 experts, with strong counter-arguments)

These are genuinely debatable. The right answer depends on your product philosophy.

### 10. FLOW ORDER: SHOULD STAKE COME BEFORE WITNESS?

**For reordering (Stake → Witness):** Rory Sutherland, Nir Eyal
**Against reordering (keep Witness → Stake):** Nikita Bier, Julie Zhuo, Rahul Vohra

**Argument for:** Sutherland: "Choose the stake first. Once you've committed $50, you NEED a witness — the witness becomes essential, not optional. Commitment escalation is more powerful when financial commitment precedes social commitment."

**Argument against:** Nikita Bier: "The witness is a lighter ask than money. You go light → heavy. Asking for money first, before they've even picked someone to hold them accountable, feels premature. The witness gives the vow social reality; the money makes it binding. That order matters."

**Recommendation:** Keep Witness → Stake. The majority view is correct — social commitment first, financial commitment second feels more natural for a first-time user. Sutherland's reorder is interesting but risks scaring people with money before they understand the social contract.

### 11. SHOULD THE REFINE SCREEN EXIST AT ALL?

**Kill it:** Rahul Vohra ("pure waste for 50% of users")
**Keep it but optimize:** Nikita Bier, Julie Zhuo, Nir Eyal
**Neutral:** Rory Sutherland

**Argument to kill:** "If shouldSkipRefine works correctly, sharp vows skip it. But for users who type 'get fit' — do they really need a separate screen to make it specific? Just show an inline suggestion on the home screen."

**Argument to keep:** "The refine screen is where vague intentions become concrete commitments. The sharpening process is the product's intelligence. Killing it means more broken vows (vague vows are harder to judge)."

**Recommendation:** Keep refine but make the skip logic bulletproof. If analyzeVow says "already_good," the user should NEVER see the refine screen. Currently the skip logic exists but may not trigger consistently. Verify this in testing.

### 12. ADD A "WHY DOES THIS MATTER?" SCREEN (FRICTION AS FEATURE)

**For:** Rory Sutherland (strongly), Nir Eyal (mildly)
**Against:** Nikita Bier (strongly), Julie Zhuo, Rahul Vohra

**Argument for:** Sutherland: "Adding a mandatory 'why does this matter to you?' step after refine increases commitment by 40%. People who articulate their reasons follow through at dramatically higher rates. This is the highest-ROI behavioral intervention."

**Argument against:** Nikita Bier: "You're adding a screen to a flow that's already too long. Every screen you add costs 15-25% of your remaining users. The users who would benefit from journaling about their 'why' are already motivated enough to complete the vow. The users who'd drop off at a 'why' screen are the ones you need to convert."

**Recommendation:** Don't add it for v1. Sutherland is right about the psychology, but Nikita is right about the conversion math. Consider adding it as an OPTIONAL prompt on the seal screen: "Why does this matter? (optional)" with a small text field. Users who want to elaborate can. Users who don't, skip it.

### 13. RENAME "WITNESS" TO "GUARDIAN"

**For:** Rory Sutherland (strongly)
**Against:** Nikita Bier, Rahul Vohra
**Neutral:** Julie Zhuo, Nir Eyal

**Argument for:** "A 'witness' is passive — they observe. A 'guardian' is active — they protect. The frame changes the witness's behavior. Guardians feel responsible; witnesses feel optional."

**Argument against:** "'Witness' fits the legal/oath metaphor perfectly. 'Guardian' sounds like a fantasy game. The whole brand is built on vow/oath/witness/seal language. Changing one word breaks the metaphor."

**Recommendation:** Keep "witness." The brand language is cohesive and changing it would require updating copy across every screen. But consider Sutherland's insight for the WITNESS'S experience — on the witness-invite page, frame their role as guardianship, not judgment: "You're not just watching. You're protecting their commitment."

---

## ADDITIONAL INSIGHTS (Not consensus, but worth noting)

**From Rory Sutherland:**
- Consider coupling stake amount to consequence type (anti-cause stakes should be higher by default — the emotional charge justifies it)
- The proof mode (word vs. screenshot) should scale with stake amount: $10-25 = word, $50 = check-in, $100 = screenshot
- Make vows truly irreversible after sealing (currently users can navigate back)

**From Nir Eyal:**
- The broken vow screen needs a redemption flow: "What went wrong?" with checkboxes + immediate re-vow at lower stakes
- The intro ceremony should be removed for repeat users (swearing twice dilutes both moments)
- Vowkeeper check-ins during the active period are critical for the Hook Model's variable reward

**From Nikita Bier:**
- The sent screen's CTA should be "Share invite" not "Got it" (even if sent screen is merged into live)
- History should be a persistent tab, not buried behind "View your record" links
- Don't tease locked features ("SOON" on challenges) — either ship or hide

**From Rahul Vohra:**
- Home entrance animations (2.35s total) should be cut to <700ms
- The vow-kept screen hardcodes "3 wk streak" which is fake data — remove
- Auth screen needs personality (currently generic and breaks the brand)
- Consider a demo mode for new users (pre-filled vow that walks through the seal experience)

---

## FINAL PRIORITY RANKING

Based on consensus strength × estimated impact × implementation effort:

| Priority | Change | Consensus | Impact | Effort |
|----------|--------|-----------|--------|--------|
| **P0** | Build certificate screen | 5/5 | Viral unlock | Medium |
| **P0** | Delete/merge sent screen | 5/5 | -1 screen, -1 tap | Low |
| **P0** | Simplify witness screen (split + remove crew) | 5/5 | -4 decisions | Medium |
| **P1** | Remove verdict confirmation modal | 4/5 | -1 tap, faster | Low |
| **P1** | Stop repeating vow text on every screen | 4/5 | Less clutter | Low |
| **P1** | Collapse "How it works" on home | 3/5 | Cleaner home | Low |
| **P1** | Move oath text before checkbox on seal | 3/5 | Stronger ceremony | Low |
| **P2** | Fix/optimize auth placement | 3/5 | Better conversion | Medium |
| **P2** | Change default stake hint to "$50 (most popular)" | 3/5 | Higher stakes | Low |
| **P2** | Add broken vow redemption flow | 2/5 | Better retention | Medium |
| **P3** | Reorder consequence options (anti-cause second) | 2/5 | Slightly more commitment | Low |
| **P3** | Speed up home entrance animations | 2/5 | Feels faster | Low |
| **P3** | Remove intro ceremony for repeat users | 2/5 | Less friction on return | Low |

---

## RECOMMENDED BUILD ORDER

**Sprint 1 (ship this week):**
- Certificate screen (already spec'd in prompts/)
- Delete sent screen (redirect seal → certificate → live)
- Remove verdict confirmation modal
- Collapse "How it works" on home
- Move oath text into swear card (before checkbox)
- Stop showing VowPreview on witness/stake screens

**Sprint 2 (next week):**
- Split witness screen into 2 screens (picker + invite method)
- Move crew to post-seal (live screen prompt)
- Fix auth screen (add vow summary OR move before stake)
- Change stake default hint to social proof ("Most people choose $50")
- Remove hardcoded fake streak data from vow-kept

**Sprint 3 (following week):**
- Broken vow redemption flow (what went wrong + re-vow)
- Remove intro ceremony for repeat users (or make it brief affirmation)
- Speed up home entrance animations
- Reorder consequence options
- History as persistent navigation item
