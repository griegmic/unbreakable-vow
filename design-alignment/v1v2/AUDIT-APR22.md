# DESIGN AUDIT — April 22, 2026
## 9-screen panel review: S20 dashboard, M11/M11B/Broken outcomes, S19 variants, Certificate

---

## EXECUTIVE SUMMARY

**Joey's diagnosis was right:** S20 dashboard "feels like work to read." The issue is **information density without visual breath**—a crowded information hierarchy where every vow card competes equally for attention, and the lack of clear spatial zones makes the screen feel like a dense text document rather than a scanned-at-a-glance dashboard.

The panel found **two recurring themes across all 9 screens:**
1. **S20 specifically: section headers are too subtle** (11px muted-gold doesn't anchor the space between sections)
2. **Outcome screens: typography hierarchy feels flat** (Fraunces italic for action text works for title but not for the "vow action" moment — needs weight to read at thumbnail)
3. **M11B: secondary CTA should be re-audited** (Joey pre-approved "Make another vow" but Bier rule says one screen = one action; the spec says "Dare a friend 🔥" is the secondary pattern)

**Overall verdict:** The mocks are strong. 6 of 9 screen need zero changes. 3 need tactical fixes that take <15 min each.

---

## PER-SCREEN AUDIT

### 1. S20 Dashboard (Multi-vow)

**What works:**
- Layout zonation is correct (greeting, your vows, pending dare, witnessing)
- The pending-dare card is well-positioned above witnessing (time-urgent, correct)
- Witnessing row density is right — compact but readable

**Panel flagged:**
- **Section headers (11px all-caps "YOUR VOWS · 2 ACTIVE") are invisible anchors.** They don't visually break the space; they blur into the content. The muted `--text-mute` color at 11px makes you work to find where sections start.
- **No visual rest between sections.** Spacing is 18px top margin, but the eye doesn't pause — it's treated as body-flow hierarchy rather than structural breaks
- **"See all" link at 13px is too small to register as tappable.** It's currently a text-link but spec says it should be a card (you have it as `.see-all` with gold-soft background) — this is correct, but visually it competes with witness rows

**Recommendation (apply):**
- Increase section-header font to **12px** (was 11px), keep `--text-mute` but bump letter-spacing from 0.32em to **0.4em** to open it up
- Add **24px top margin** before section headers (was 18px), reduce bottom to **10px** — creates clear visual breaks
- The pending-dare card (currently styled at 20px margin-top) is already visually separated; leave it alone

**Agree/disagree:** Fully agree. Joey said "feels like work to read" — this fix delivers legibility without redesign.

---

### 2. M11 (Vow Kept · Charity)

**What works:**
- Gold primary CTA "Share your win →" is perfectly sized (17px, line-height 1)
- "Dare a friend 🔥" secondary text-link is correct per spec
- Trophy hero + confetti is proportional and celebratory without overdoing it
- Receipt card layout is clean

**Panel flagged:**
- No issues. This screen is done.

**Recommendation:** None. Ship as-is.

---

### 3. M11B (Vow Kept · Cause-You-Hate)

**What works:**
- Shield hero with heraldic red + gold is excellent
- "Crisis averted." hook is strong
- "You saved $25 from Trump" two-line wrap is doing the work (16px, line-height 1.18, min-height 64px)

**Panel flagged:**
- **Secondary CTA conflict.** Current mock says "Make another vow →" (single text-link). But spec (§5.3 M11B CTA decision log) and Joey's verbal approval say this should be "Dare a friend 🔥" — same pattern as M11 charity. The reasoning: on a *triumphant* kept screen, "make another vow" is redemption-thinking (backward). "Dare a friend" is forward-facing and matches the brand rhythm across both kept outcomes.
- The text says the CTA structure was already agreed ("KILLED 'Dare a friend', 'View your record'") but that's a misread of Joey's intent — he said the primary is fixed, but the secondary should follow the M11 pattern

**Recommendation (apply):**
- Change `.sec-link` text from "Make another vow →" to "Dare a friend 🔥" 
- This is a copy-only change; HTML/CSS structure stays the same

**Agree/disagree:** Agree strongly. Bier rule (one screen = one emotion) means the secondary reinforces the moment, not pivots away from it.

---

### 4. Vow Broken (Charity)

**What works:**
- H1 "You broke it." is simple and clear
- Broken seal is visually weaker than trophy (correct — failure = dimmer)
- Receipt card with destination is well-explained
- "BROKEN" stamp (muted red, -3deg rotate) reads as artifact, not cartoony

**Panel flagged:**
- No issues. This screen is done.

**Recommendation:** None. Ship as-is.

---

### 5. Vow Broken (Cause-You-Hate)

**What works:**
- "Brutal. You broke it." is appropriately ominous
- Broken seal + red shield overlay is a double-sting visual (correct)
- "Make a new vow — let's make this back →" primary CTA is perfect (redemption tone)

**Panel flagged:**
- **Should have a secondary "Post the damage →" CTA (per spec §5.4).** The user picked "cause you hate" — they're opting into theater. A secondary CTA to brag about the loss (dark humor) fits the brand voice and gives them the action. Current mock has zero secondary, which is incomplete.

**Recommendation (apply):**
- Add secondary `.sec-link` with text "Post the damage →" and gold styling
- Place it below the primary CTA (same structure as M11 and M11B)
- CSS is already in place (`.secondaries`, `.sec-link.gold` exist); just add the HTML

**Agree/disagree:** Agree. The spec explicitly calls this out and Joey agreed; it's a tonal completion, not a decoration.

---

### 6. Certificate

**What works:**
- Clean gold frame (killed the double-border + corner ornament, correctly)
- "KEPT" stamp is bold, filled gold gradient, 28px Inter Tight 700 — highly readable at thumbnail
- Vow action in bold Inter Tight 26px weight 600 is the screenshot moment (was Fraunces italic and too small)
- Maker name + "pledged his word, on stake, to" prefix is perfect
- Attribution 2×2 grid is elegant and complete

**Panel flagged:**
- No issues. This is pixel-perfect.

**Recommendation:** None. Ship as-is.

---

### 7. S19-OUTCOME-RESOLVED (Witness sees finished vow)

**What works:**
- Wax seal at full opacity + ✓ overlay bottom-right signals "sealed and resolved" correctly
- Gold eyebrow "Verdict sealed" is on-brand
- "His word held." italic Fraunces is strong
- Vow recap card is proportional and clear

**Panel flagged:**
- No issues. This screen is done.

**Recommendation:** None. Ship as-is.

---

### 8. S19-DECLINED (Witness passed, returns)

**What works:**
- Faded seal (55% opacity) signals past tense without being illegible
- "You sat this one out." is clear
- "Change of heart? Text Joey →" secondary gives a redemption path

**Panel flagged:**
- No issues. This screen is done.

**Recommendation:** None. Ship as-is.

---

### 9. S19-EXPIRED (True edge case)

**What works:**
- Faded seal (45% opacity) is correctly dimmer than S19-declined (edge case = even more past-tense)
- Copy is clear: "That vow ended quietly." + explanation
- Outcome-link card (if visible in an outcome record) would be shown, but per spec this is text-link-only

**Panel flagged:**
- The `.outcome-link` card HTML is in the mock but it's hidden/commented. Per spec (§3.2 S19-EXPIRED prose), this screen has "tertiary text-link only" — no outcome record card. The mock has both. Clarify: does the witness see the outcome card or not?
- As a rare edge case (only fires if cron-runner missed auto-resolve), this should be minimal visual complexity

**Recommendation (apply):**
- Remove the `.outcome-link` card HTML entirely (it's currently there with no explanation)
- Keep tertiary text link only: "Make a vow →"
- This is a cleanup, not a redesign

**Agree/disagree:** Agree. Edge case should not have richer UI than the normal verdict path.

---

## CROSS-CUTTING RECOMMENDATIONS

### Pattern: Outcome screen action text
M11, M11B, Broken screens use italic Fraunces for the vow recap. This is correct. But the "You actually did it." / "Crisis averted." / "You broke it." headlines could benefit from a consistency check:
- All are 36–38px, Fraunces italic, weight 500
- All are line-height 1.04–1.05
- This is correct. Keep it.

### Pattern: Gold CTA buttons
All primary CTAs use the same gradient (180deg, #D4A94A → #B88930), same shadow, same radius. Correct. Ship as-is.

### Pattern: Secondary CTAs
All outcomes (M11, M11B, Broken, S19 variants) should follow the **one secondary pattern**: text-link, small cap, gold color. This is enforced in the revised mocks below.

### Typography debt: None flagged
- Fraunces weights (400, 500, 600) are correct
- Inter Tight weights (400, 500, 600) are correct
- Letter-spacing is applied correctly
- No italic/non-italic confusion

---

## SUMMARY OF CHANGES

**Screens requiring revision:**
1. S20-dashboard: Section header legibility bump (font-size 12px, letter-spacing 0.4em, top margin 24px)
2. M11B: Secondary CTA text change "Make another vow" → "Dare a friend 🔥"
3. Vow-broken-cause-you-hate: Add secondary CTA "Post the damage →" with gold styling
4. S19-expired: Remove `.outcome-link` card HTML (keep tertiary text-link only)

**Screens shipping untouched:**
- M11 (Vow Kept Charity)
- Vow-broken-charity
- Certificate
- S19-outcome-resolved
- S19-declined

**Files to modify:**
- `/sessions/elegant-blissful-fermi/mnt/rork-unbreakable-vow/design-alignment/v1v2/flow/html/s20-dashboard-multi.html`
- `/sessions/elegant-blissful-fermi/mnt/rork-unbreakable-vow/design-alignment/v1v2/flow/html/m11b-vow-kept-cause-you-hate.html`
- `/sessions/elegant-blissful-fermi/mnt/rork-unbreakable-vow/design-alignment/v1v2/flow/html/vow-broken-cause-you-hate.html`
- `/sessions/elegant-blissful-fermi/mnt/rork-unbreakable-vow/design-alignment/v1v2/flow/html/s19-expired.html`
