# Maker + Witness Flow Design Audit

Date: 2026-04-25
Auditor: Codex
Build checked: `npm run build`

## Scope

- Live vow detail reviewed: `https://www.unbreakablevow.app/vow/73e09496-471a-4b02-809c-03078b04f829`
- Captured witness invite link: `https://www.unbreakablevow.app/w/c98008f7-53f7-43cb-a48a-aa839bec2742`
- Local pages checked after fixes:
  - `/`
  - `/refine`
  - `/stake`
  - `/witness`
  - `/seal`
  - `/w/c98008f7-53f7-43cb-a48a-aa839bec2742`
  - `/w/c98008f7-53f7-43cb-a48a-aa839bec2742/verdict`

## Design Standard Used

The page should pass a three-second comprehension test:

- Who is this for?
- What is being asked of me?
- What happens if I tap the primary CTA?
- What is at stake?
- Can I move backward or escape without feeling trapped?

The product direction I used: less information, more conviction; premium consumer app controls; one obvious primary action; serif only where it creates drama, sans where the user needs clarity or trust.

## High-Confidence Fixes Implemented

These were 85%+ confidence improvements and are already applied locally.

### Maker Flow

1. `/stake`: New vows now reset stale flow state.
   - Problem: starting a new vow could inherit old stake/witness/deadline state from the previous vow.
   - Fix: `setRawInput` now resets to `initialState` with the new vow text.
   - Confidence: 95%.

2. `/stake`: Default stake now matches the visible selected option.
   - Problem: initial state used `$25`, but UI options are `$20`, `$50`, `$100`, and `Other`; this could make the screen feel unselected or broken.
   - Fix: default stake changed to `$20`.
   - Confidence: 95%.

3. `/seal`: Added a visible back affordance to phone auth.
   - Problem: seal/auth felt like a dead end; user could not confidently go back.
   - Fix: added `← Back` before the hero.
   - Confidence: 90%.

4. `/seal`: Removed confusing payment reassurance copy.
   - Problem: "Keep your word, get every cent back" conflicts with the actual mental model that no charge happens unless the vow is broken.
   - Fix: kept one simple line: "No charge unless you break your vow."
   - Confidence: 90%.

5. `/vow/[id]`: Fixed weak waiting-state copy.
   - Problem: "Waiting on Your witness." felt grammatically off and robotic.
   - Fix: "Waiting for your witness."
   - Confidence: 95%.

6. `/vow/[id]`: Made self-judging copy explicit.
   - Problem: "or go solo" is charming but unclear in a high-consequence flow.
   - Fix: "Judge it myself."
   - Confidence: 90%.

7. Shared UI tokens: fixed `--uv-bg-elev` typo.
   - Problem: several components referenced a non-existent CSS variable, risking flat/transparent panels.
   - Fix: changed references to `--uv-bg-elevated`.
   - Confidence: 95%.

### Witness Flow

1. `/w/[token]`: Protected against phone numbers showing as names.
   - Problem: witness page exposed the maker as `+18607519907`, which feels broken and too personal.
   - Fix: phone-like display names now fall back to "Your friend."
   - Confidence: 95%.

2. `/w/[token]/verdict`: Protected against phone numbers and gendered pronouns.
   - Problem: verdict page said things like `+18607519907's vow is up` and `keep his word?`
   - Fix: fallback copy now says "Your friend's vow is up" and "Did your friend keep their word?"
   - Confidence: 95%.

3. `/w/[token]`: Removed dead "How this works" link.
   - Problem: dead links destroy trust, especially on an invite screen.
   - Fix: removed the footer link entirely.
   - Confidence: 95%.

4. `/w/[token]`: Made the outgoing message preview truthful.
   - Problem: preview copy did not match the actual acceptance message.
   - Fix: preview now says: "Just accepted your vow. I'm watching."
   - Confidence: 90%.

5. `/w/[token]`: Replaced native checkbox styling.
   - Problem: default white browser checkbox looked unfinished against the premium dark UI.
   - Fix: custom dark/gold check control.
   - Confidence: 90%.

6. Shared `ShareButton`: restored visible CTA styling.
   - Problem: old token names made "Send the invite" look inactive or nearly invisible.
   - Fix: moved to current `--uv-*` tokens, added gold gradient, dark text, pointer affordance.
   - Confidence: 95%.

7. Internal links in witness completion screens now use Next `Link`.
   - Problem: framework lint errors on internal `<a href="/">` links.
   - Fix: swapped to `Link`.
   - Confidence: 90%.

## Page-by-Page Audit Log

### `/` Home

Three-second read: strong. A new user understands that they make a vow, stake money, and a friend judges.

Strengths:
- "Make a vow. Mean it." is memorable and clear.
- Primary CTA is obvious and disabled until text exists.
- The example chips reduce thinking effort.

Hold for approval:
- "No mercy" is on-brand but slightly harsh. I would A/B test softer copy like "No wiggle room." before changing it.
- The placeholder/example area is moody and premium, but a little low contrast. This is a taste call, not a clear bug.

### `/refine`

Three-second read: clear enough. The user sees the app is checking whether the vow is specific.

Strengths:
- The good/bad examples are useful.
- "Tighten it" and "Keep it as-is" are understandable.

Hold for approval:
- This page has more explanatory copy than the rest of the flow. It may be worth making the examples smaller or collapsible later, but I would not cut them without seeing conversion data.

### `/stake`

Three-second read: strong after the previous ALS change fix and this state reset fix.

Strengths:
- Clear step indicator.
- Stake options scan quickly.
- "Nothing charges unless you break it" is the right reassurance.

Fixed:
- Default `$20` now matches visible UI.
- New vows no longer inherit stale state.

Hold for approval:
- "A vow without weight is a wish" is poetic and slightly heavy. It fits the brand, so I left it.

### `/witness`

Three-second read: good. The user understands they need to choose who judges.

Strengths:
- Primary card is clear.
- Back is visible.
- Copy is short enough.

Hold for approval:
- "No witness — just my word" is clear, but it may be too easy to choose for a product built around accountability. Could be visually softer or moved lower after analytics.

### `/seal`

Three-second read: much better now. User sees the final review, phone auth, and one payment reassurance line.

Fixed:
- Back affordance added.
- Reassurance copy simplified.
- Review card token fixed.

Hold for approval:
- "Almost done." is clear but generic. A more branded line like "Seal it." may feel stronger, but "Almost done" is safer for conversion.

### `/vow/[id]`

Three-second read: good on the live vow page. The user sees current status, vow text, stake, and witness state.

Fixed:
- Share/send CTA styling restored through `ShareButton`.
- "Waiting for your witness" copy is cleaner.
- "Judge it myself" is clearer than "or go solo."

Hold for approval:
- "Withdraw vow" is visible fairly early. It is useful, but visually it competes with the main waiting/share task. I would consider moving it behind a secondary menu.
- Hamburger is present on the live vow detail page, which is correct.

### `/dashboard`

Three-second read: good. The completed vow card gives status, stake, deadline, and pending witness state.

Previously fixed:
- Bottom CTA no longer collides with the in-app browser chrome.

Hold for approval:
- The dashboard H1 "Hey,." when no display name exists still feels unfinished. This is likely data/account-state dependent and should become "Hey." or "Your vows" as a fallback.

### `/w/[token]` Witness Invite

Three-second read: strong after fixes. A witness understands: a friend made a vow, there is `$20` at stake, and their job is to judge kept/broken.

Fixed:
- Phone number no longer appears as maker name.
- Removed dead "How this works" link.
- Replaced default checkbox styling.
- Message preview now matches product intent.

Hold for approval:
- The primary CTA is disabled until the oath is checked. This adds ritual and intentionality; if conversion suffers, make the checkbox optional and treat the CTA tap as the oath.

### `/w/[token]/verdict`

Three-second read: good. The witness sees the vow is up and the choice is yes/no.

Fixed:
- Phone number fallback.
- Gender-neutral copy.
- "Open Messages with your friend" fallback.

Hold for approval:
- On shorter mobile viewports, the yes/no cards begin near the bottom. It is still understandable, but a tighter verdict layout may improve action visibility.
- The top "UNBREAKABLE VOW" pill is a little heavy compared with the invite page logo treatment. I left it because it creates strong mode separation.

## Remaining Verification Notes

- Production build passes.
- Targeted lint still reports pre-existing debt in `seal/page.tsx` and `vow/[id]/page.tsx` (`any` types, unused imports/state, `Date.now()` purity). The current design fixes do not introduce new build failures.
- Local screenshots were checked for witness invite, witness verdict, and seal auth.
- The red Next.js issue bubble visible in local screenshots is dev-only and not a production UI issue.

## Recommended Next Batch

Clearly worth considering, but held pending approval:

1. Make `/dashboard` empty-name fallback read cleanly.
2. Reduce the vertical height of `/w/[token]/verdict` so Yes/No fit fully above common mobile browser chrome.
3. Decide whether "Withdraw vow" should move into the menu on vow detail.
4. Revisit home copy intensity: "No mercy" vs a slightly cleaner accountability line.
5. Clean existing lint debt in `seal` and `vow/[id]` after this design batch, ideally as a separate maintenance commit.

## Follow-Up Seal/Auth Revision

Added after reviewing the phone-number screen:

1. `/seal` unauthenticated flow is now a focused three-step path:
   - Name: "What should we call you?"
   - Phone: "What’s your number?"
   - Code: "Enter the code."
2. The vow review card was removed from the phone capture screen. The user already reviewed the vow; this moment should be pure conversion.
3. Maker name is saved to auth metadata and `public.users.display_name` after OTP verification, so witness surfaces do not have to fall back to a phone number.
4. Stripe setup success now seals the exact draft vow ID created before opening Payment Element, which protects Apple Pay/card completion from React state timing.
5. The payment modal now uses current `--uv-*` design tokens and clearer copy: "Add payment method" / "No charge now. Only if you break it."
6. The post-seal witness-pending page now leads with "Now get your witness in." The primary job after payment is unmistakable: share or nudge the witness so they can accept and judge.

## Follow-Up Vow Detail Revision

Added after reviewing the newly sealed vow page:

1. Every successful seal path now routes to the exact vow that was just created instead of falling back to `/dashboard`.
   - Fixed zero-stake seals.
   - Fixed development bypass.
   - Fixed post-OTP zero-stake seals.
   - Payment/Apple Pay setup already tracks the draft vow ID and now uses that same ID after Stripe succeeds.
2. The pending-witness page hierarchy was simplified:
   - Hero: "Your vow is sealed."
   - Subcopy: "Send the witness invite now. Your vow starts when they accept."
   - One dominant CTA: "Send the invite."
3. Removed the raw URL field from the first viewport. It looked technical and pulled attention away from the primary send action.
4. Kept "Copy link," but demoted it to a small secondary control.
5. Removed the large "My Vows" CTA from this state because it competed with the witness invite job; the back-to-dashboard nav is still available.
6. Demoted "Judge it yourself" and "Withdraw vow" to quiet text actions so they remain available without feeling like the intended next step.

## Follow-Up Celebration Revision

Added before deployment:

1. Added a real post-seal celebration state:
   - "Sealed"
   - "It's official."
   - "Your vow is live. Now send the witness invite."
   - A brief vow card appears before redirect.
2. Centralized the post-seal redirect so every successful path gets the same celebration:
   - Phone OTP + payment
   - Apple Pay/card setup through Payment Element
   - Zero-stake vows
   - Development bypass
3. The celebration routes to the exact newly created vow after the beat completes, never to the generic dashboard.
