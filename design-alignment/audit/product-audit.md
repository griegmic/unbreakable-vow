# Product Design Audit: Contract vs. Monument

## Executive Summary

**Monument (B) wins on trust and conviction; Contract (A) wins on simplicity.** Monument's cleaner amounts grid and editorial witness landing feel premium and lower friction for first-timers. Contract's witness landing is emotionally warmer ("I'll witness it" reads more intimate than "Accept"). Split the difference: use Monument's stake UX with Contract's witness copy tone.

---

## A — Contract: Product Audit

### Home
- **Cognitive load: 6/10.** Seal graphic + gold italics are atmospheric noise. "I vow to…" input conflicts visually with the example chips below — the eye lands on chips first, reads them as the vow options rather than starting points.
- **Conversion friction:**
  - Input field is readonly; user doesn't know they can interact with it yet
  - Four chips feel like a menu of premade vows, not examples; should be clickable or clearly labeled as "try one of these"
  - No clear next-step affordance — "Continue" button at footer is 100% below the fold
- **Trust:** Wordmark and seal are tasteful. "No account needed yet" is strong. Hero copy is vivid but slightly presumptuous ("Put money on it" before the user understands the mechanism).
- **Defaults:** Chips are good defaults (gym, alcohol, TikTok, ex — relatable). First-timer expects to either input custom or pick a chip. Neither path is obvious.

### Stake
- **Cognitive load: 5/10.** Four amounts in a grid, two destinations in a 2-column grid, selected destination summary box below. Clean. No decoration clutter.
- **Conversion friction:**
  - "$25 is pre-selected" — strong default. But no visual cue why (assumed arbitrary). "Charged on seal. Refunded if kept." is at the footer in small italic; if user skips it, they don't know the refund promise
  - Destination cards ("believe in" vs. "hate") use heavy loss-aversion framing; "maximum motivation" feels slightly predatory for a first-timer who came in just wanting accountability
  - "Selected" box shows St. Jude, but user hasn't picked a destination in the UI I see — it's pre-selected. Not immediately obvious this is changeable
- **Trust:** Italic serif headline "Put weight on your word" is confident without being pushy. Pre-selected charity (vs. "hate" cause) is a humane default that makes the app feel like it's on the user's side.
- **Defaults:** $25 is right (high enough to hurt, low enough to feel safe). Charity default is right. Both strong.

### Witness Landing
- **Cognitive load: 4/10.** Vow quote is the hero. Meta grid (amount, deadline) below. Two CTAs (accept/pass) at footer. Tight, scannable.
- **Conversion friction:**
  - "A vow is asking for you" (italic) is nice but abstract for someone who just got a link from a friend
  - "You job: call it kept or broken. One tap, one Sunday from now." reads as low-friction, but if witness doesn't understand the vow (gym 3x this week = what counts?), they'll click "Pass"
  - Footnote "What is this?" links to learn more — but that's a loop-out, not reassurance inline. First-timer wants to know: will this become a notification spam situation?
- **Trust:** Vow quote in centered serif italic is a document. Stake amount + destination ("to NRA, if broken") is explicit, which builds trust. Secondary button "Pass" is there — user can opt out if unsure.
- **Felt sense:** Honored (the vow is displayed as a formal document) + slightly burdened (one Sunday from now, I have to remember, I have to call it). More honored than burdened. Good balance.

---

## B2 — Monument: Product Audit

### Home
- **Cognitive load: 4/10.** Minimal masthead ("est. 2026") signals this is a serious, editorial product. No logo clutter. Single input field. Examples are a vertical list with numbers + plus buttons — not chips. This feels like you're **shopping** for ideas, not picking a preset.
- **Conversion friction:**
  - "The vow" label + italic helper ("Be specific…") is slightly over-explained; user gets it. Can delete the helper text.
  - Example list shows "+", inviting selection. But what does "+" do? Tapping "Gym three times this week +" doesn't obviously move to the next screen. Button is at the top ("Begin"), but icon-only "+" on each row suggests the list items are clickable.
  - "No account until you're ready" is weaker trust signal than "60 seconds no account" (Contract)
- **Trust:** "For people who mean it" (tagline) and "est. 2026" and the Newsreader serif font feel like a publication, not an app. Legitimacy comes from editorial tone, not graphics. Strong.
- **Defaults:** "Gym three times this week" is the lead example. Solid. "Ship the side project" is good for power users. Mix of fitness + ambition signals this isn't just a habit-tracker.

### Stake
- **Cognitive load: 4/10.** Cleaner than Contract. Amounts are a grid with thin separators (no rounded corners, no surface-2 bg). Destinations are flat text blocks with a top border on selection. Selected destination is a simple row ("Selected | St. Jude | Change link").
- **Conversion friction:**
  - Label "Charged on seal · refunded if kept" is in the section header (right-aligned italic), not at the footer. First-timer might miss it because it's not emphatically positioned.
  - Two-column destination layout is tight. "Believe in" and "hate" cards are harder to distinguish at a glance because both use the same hierarchy (glyph + name + desc). Contract uses gold background on "believe in", which is clearer.
  - No pre-selection visual feedback on amounts until you tap. The selected $25 has no visual difference from unselected ($10, $50, $100) on page load — wait, the snapshot shows $25 is selected (light bg). But at initial load, will user see a selection? Unclear.
- **Trust:** "How much is your word worth?" is philosophical, not mercenary. The straight-text destination cards (no colored backgrounds) feel less pushy than Contract's gold-soft / loss-aversion framing. Monument trusts the user to choose. Good.
- **Defaults:** $25 pre-selected, "believe in" pre-selected. Same as Contract. Identical.

### Witness Landing
- **Cognitive load: 5/10.** Masthead with "Witness Edition" label. Dateline ("Summoned to witness — Apr 21, 2026"). Hero headline with maker's name in italics. Vow as a pull-quote (serif italic, centered, quotation marks in brass). Meta table (stake, verdict, your ask) below. Two CTAs.
- **Conversion friction:**
  - "Summoned to witness" is slightly dramatic. Sets tone of formality/obligation, which might feel like a burden.
  - Meta table uses "Your ask" row — awkward label. What does "ask" mean? (Answer: the verb phrase that follows — "One tap. One Sunday." But at a glance, confusing.)
  - "No proof uploads, no debate — just your word that what he says is true" is a transparency callout in the role paragraph. Good. But it adds a semi-complex thought (what proof? what debate?) that first-timer might not expect. Assumption that this needs explaining suggests the UX might be unclear.
  - "Call it kept or broken" is clearer than Contract's "call it kept or broken" (same phrasing), but the role paragraph is slightly dense.
- **Trust:** "Summoned to witness" + "Witness Edition" + pull-quote vow format all signal this is a **formal agreement**, not a casual ask. Trust comes from gravitas, not warmth. Good for repeat users; risky for first-timers who just got a link from a friend.
- **Felt sense:** Summoned → slightly burdened. "Witness Edition" feels a bit cold. Dateline is nice detail but adds ceremony. More burdened than honored. Less balanced than Contract.

---

## Head-to-Head Decisions

### Stake Screen: Monument wins
**Why:** The flat, minimal amount grid (no rounded corners, no surface-2 background) is easier to tap. Destination cards with top-border selection are less visually heavy than Contract's gold-soft cards. Monument's table layout for selected destination ("Selected | Name | Change") is more scannable than Contract's "selected-box" with its 2px gold-left-border. 

**Conversion impact:** Monument users will complete the stake step faster because there's less visual decision-making. The amounts and destination feel more like a form, less like a shopping experience. For money, users want forms, not stores.

**Risk:** Monument's refund language is in the section header (italic, right-aligned). Risky. Contract puts it in the footer CTA label ("Refunded if you keep your word"). Contract's placement wins here — move Monument's refund promise to the same visual weight as Contract's.

### Witness Landing: Contract wins
**Why:** Contract's headline ("Joey named you their witness") is warmer than Monument's ("Summoned to witness — Apr 21, 2026"). The vow quote in Monument is more editorial (pull-quote with quotation marks), which feels formal; Contract's centered italic quote in a doc-like box feels like a contract you're signing, which is the right metaphor.

**Conversion impact:** Contract's witness will feel **honored** ("named you"), while Monument's witness feels **summoned** (obligation). For viral growth, honored is the baseline. A witness who feels chosen will accept and tell the maker they did; a witness who feels burdened will accept reluctantly, and the app loses a potential secondary user.

**The copy difference is critical:** Contract says "I'll witness it" (accepting an honor). Monument says "Accept — I'll Witness" (accepting a duty). Contract is the path to virality.

### Cross-Pollination: Take Monument's Stake, Contract's Witness Copy
- **From Monument:** Use the flat amounts grid and top-border destination selection.
- **From Contract:** Use "named you their witness" and "I'll witness it" (warmth over ceremony).
- **Keep Monument's refund promise in the section label, but make it bold or brass-colored** (not italic) so it reads as a guarantee, not a design flourish.

---

## V1 (Tight) / V2 (Loose) Recommendations

### A — Contract

**V1 cuts:**
- Delete the "chips-label" ("Or start with") and example chips from home. Replace with the Monument example list (vertical, numbered, low cognitive load). Chips suggest the user will see the input field, pick an example, and then be done — wrong mental model.
- Delete the gold seal icon and italic wordmark on the witness landing. Seal is just decoration. Wordmark is fine; the seal is redundant.
- On the stake screen, delete the italic helper text under "Destination" heading. The destination card descriptions ("Your word, used for good" etc.) already explain the difference.

**V2 keeps/adds:**
- Add a brass or gold accent line above the CTA button on all screens (creates visual "seal" that this is a serious commitment).
- Add a small confidence badge or "Trusted by X" text above the CTA on the home screen (social proof for first-timers).
- Expand the stake screen's selected destination box to show a 1–2 sentence description of the charity (e.g., "St. Jude Children's Hospital — pediatric cancer research and treatment, founded 1962").

**Must stay (trust-critical):**
- The explicit refund promise ("Refunded if you keep your word") — this is the primary trust lever.
- The "Pass" button on the witness landing — psychological safety for recipients.
- The vow quote on the witness landing — proof that the ask is clear and specific, not vague.

### B2 — Monument

**V1 cuts:**
- Delete the italic helper text under "The vow" on the home screen ("Be specific. Your witness should know, on sight, whether you kept it."). Move this into a tooltip or help page, not on the critical path.
- Delete "est. 2026" from the masthead (cute, but cognitive overhead; doesn't reinforce trust).
- On the witness landing, delete "No proof uploads, no debate — just your word that what he says is true." This assumes user is confused; it muddies the job ("Call it kept or broken"). Trust the interface first, explain exceptions later.

**V2 keeps/adds:**
- Add a brass-line separator between the vow and the meta table on the witness landing (reinforces the document metaphor).
- Add a small "Why I chose you:" subheading on the witness landing, followed by 1–2 words the maker typed (e.g., "thoughtful, no BS"). Monument's editorial tone is strong enough to carry this personalization.
- On the stake screen, add a small "Examples" section below the destination grid showing real past vow outcomes (e.g., "Alice's $50 → St. Jude | Called kept on Mar 15"). Social proof, low visual clutter.

**Must stay (trust-critical):**
- The "Witness Edition" label (signals this is a distinct, safe experience).
- The dateline ("Summoned to witness — Apr 21, 2026") — creates urgency and formality (shows verdict deadline context).
- The meta table structure (Stake | Verdict | Your ask) — clarity on the three things a witness needs to know.

---

## First-Timer Worst Moments

- **Contract Home:** User taps a chip, expecting the vow to auto-fill. It doesn't. User bounces because next step isn't obvious.
- **Monument Home:** User taps "Gym three times this week +" expecting the vow to be selected. It doesn't. Same bounce risk.
  - **Fix:** Both need to make the example selectable or link clearly to "Begin" button.
- **Contract Stake:** User doesn't scroll to the footer to read the refund promise. They see "$25 charged on seal" and bounce.
- **Monument Stake:** User doesn't see the refund language in the section header (italic, right-aligned). Same bounce risk.
  - **Fix:** Both need the refund promise at the point of decision (CTA button label or pre-CTA callout).
- **Contract Witness:** User gets the link, opens it, sees the vow is about going to the gym 3x. Thinks: "I don't know if he went to the gym, this is impossible to judge." Clicks "Pass".
  - **Fix:** Add a "How you'll know" line on the witness landing (e.g., "He'll tell you if he made Mon, Wed, Fri. Believe him or not."). Reduce the cognitive load of the judge role.
- **Monument Witness:** "Summoned" language + "Witness Edition" label + formal pull-quote creates a sense of obligation. User accepts but feels burdened, doesn't stay to become a second-time user.
  - **Fix:** Soften "Summoned to witness" to "Joey named you" (Monument + Contract hybrid). Signal that this is an honor, not a duty.
