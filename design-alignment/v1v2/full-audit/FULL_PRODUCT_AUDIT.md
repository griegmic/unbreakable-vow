# Full Product Audit - Unbreakable Vow

Date: 2026-04-25  
Viewport priority: mobile web, 393 x 852  
Desktop priority: public invite/share surfaces

## Executive Read

Unbreakable Vow is much closer to a strong consumer product than it was earlier in the week. The core loop now reads clearly: make a vow, put money/social pressure on it, assign a witness, get judged. The main remaining issue is not brand direction. It is information discipline. Some screens still show too much secondary detail before the user has completed the one job on that screen.

The highest leverage work is:

1. Make every first-time public invite page feel instantly legible and exciting.
2. Make dashboard and live vow pages scan-first, not receipt-first.
3. Keep auth/payment surfaces brutally readable.
4. Make post-seal and post-accept moments feel solemn, satisfying, and socially actionable.
5. Tighten Twilio/share copy so every text creates movement.

## Evidence Captured

Screenshots live in `design-alignment/v1v2/full-audit/screenshots/`.

Representative current-state captures:

- `dashboard.png`
- `quick-vow.png`
- `vow-detail-active.png`
- `vow-detail-awaiting.png`
- `vow-detail-kept.png`
- `vow-detail-broken.png`
- `witness-landing-pending.png`
- `witness-landing-accepted.png`
- `mobile-witness-verdict.png`
- `desktop-witness-acceptance.png`
- `desktop-witness-accepted.png`
- `mobile-cast-unauth.png`
- `mobile-cast-auth-fixed.png`
- `vow-kept.png`
- `vow-broken.png`
- `outcome-kept.png`
- `outcome-broken.png`

New mocks live in `design-alignment/v1v2/full-audit/mocks/`.

- `01-witness-acceptance-focus.html`
- `02-dashboard-clean-scan.html`
- `03-vow-live-focus.html`
- `04-dare-acceptance-focus.html`
- `05-post-seal-solemn.html`

Follow-up implementation note: after this audit, a second pass implemented the witness framing, dashboard CTA cleanup, dare accepter flow/copy, optional taunt collapse, and premium share-artifact pass. See `FIX_LOG.md`.

## Priority Framework

Score is based on:

- Leverage: how many users hit it and how close it is to conversion.
- Severity: how much it blocks understanding or action.
- Confidence: how sure the change improves the product.
- Effort: lower effort raises priority.

Buckets:

- P0: broken, unreadable, or blocks action.
- P1: obvious high-leverage design or UX improvement.
- P2: likely better but should be approved before implementation.
- P3: experiment or A/B-test candidate.

Confidence:

- 95-100: clear as day; safe to implement.
- 75-94: recommended, mock first.
- 50-74: plausible experiment.

## Clear-As-Day Changes Already Made

### P0 - Legacy design tokens made auth/menu screens unreadable

Evidence: `mobile-cast-unauth.png` showed the auth sheet visually merging with the underlying page. The cause was clear in code: many older surfaces still used `--surface`, `--text`, `--gold`, `--border`, etc., while the active V6 system uses `--uv-*`.

Change made:

- Added legacy token aliases in `web/src/app/globals.css`.
- Raised auth modal z-index and gave the sheet max height, border, shadow, and scroll containment in `web/src/components/auth-modal.tsx`.

Result:

- `mobile-cast-auth-fixed.png` shows the auth sheet as an actual sheet again.

Confidence: 100  
Why acted: functional readability bug, low risk, fixes multiple surfaces at once.

## Journey Audit

### 1. Maker: Home / First Vow

Current feeling:

- The home page is now close to the right philosophy: direct, not over-explained, brand-forward without being a landing page.
- Copy is strong: "Make a vow. Mean it." and "Flake and lose it all..." gets the product premise across quickly.

3-second clarity:

- Strong if the user already gets "vow."
- Slight risk that first-time cold users need one more concrete sentence before typing.

Findings:

- P1, 90 confidence: Keep one clear input and one CTA. Do not re-add multiple marketing blocks or live-feed clutter.
- P2, 80 confidence: Add subtle "friend judges" language near the input only if tests show confusion. Current restraint is probably better.
- P3, 60 confidence: Test "Break your word. Pay the price." as a sharper acquisition variant.

Recommendation:

- Keep current copy as the default.
- For future A/B: compare current vow-first page against a version with a tiny proof/premise line under the input.

### 2. Maker: Quick Vow

Current feeling:

- The current quick vow screen has the right single-screen ambition.
- The input is correctly promoted as the hero action.
- Stake is emotionally visible.
- The cheeky amount copy is back and useful.

3-second clarity:

- Good. User knows: write vow, stake, send.

Findings:

- P1, 95 confidence: Keep the current $10/$25/$50/$100 tile set. It is understandable and matches the decision scope doc.
- P1, 95 confidence: Keep dynamic stake copy below tiles. It gives the screen personality without clutter.
- P2, 82 confidence: Judge selection is now less burdensome by defaulting to share-after-seal. This is likely the right mobile web strategy.
- P3, 60 confidence: Saved/recent judges would improve returning-user speed but need product infrastructure.

Recommendation:

- Do not add a required witness name/number field here.
- Treat "share judge link after sealing" as the default path.
- Longer term, add recent judges once there is enough repeat use data.

### 3. Maker: Auth / Name / Phone / Payment

Current feeling:

- The custom seal auth path is directionally right: name first, phone second, code third.
- The generic `AuthModal` was materially broken on cast/dare due legacy token aliases.

3-second clarity:

- Seal auth is good.
- Generic modal is now acceptable after the token fix, but still less elegant than the seal-specific auth flow.

Findings:

- P0, fixed: Legacy CSS variables made modal visuals fail.
- P1, 95 confidence: Phone should remain the primary auth option. Google/email are secondary.
- P1, 95 confidence: Stripe/Payment Element colors should always use explicit hex values, not CSS vars. Existing challenge client already does this correctly.
- P2, 85 confidence: Generic `AuthModal` should eventually be restyled to match the seal auth sequence more closely.

Recommendation:

- Keep phone primary.
- Never let auth ask the user to understand accounts before they understand the promise.

### 4. Maker: Post-Seal Moment

Current feeling:

- The app now redirects toward the specific vow after seal, which is the right behavior.
- The missing piece is emotional closure. The product needs a solemn "sealed" beat before it becomes a checklist.

3-second clarity:

- "Now get your witness in" is correct.
- The user must know: money is authorized, vow is not fully socially live until witness accepts, next action is sharing.

Findings:

- P1, 92 confidence: Add a stronger sealed moment, but do not use party confetti. This is not "you won"; it is "the lock clicked."
- P1, 90 confidence: Primary CTA should be "Text [witness] the invite" or "Send the invite"; secondary "Copy link."
- P2, 80 confidence: If no witness name is known, use "Send the invite" rather than "Tell your witness."

Mock:

- `05-post-seal-solemn.html`

Recommendation:

- Implement this after approval. The concept is right; exact copy can still be tuned.

### 5. Maker: Dashboard / My Vows

Current feeling:

- Current dashboard works functionally but feels heavy. The giant "Make a vow" CTA above the list steals attention from the user's actual job: scan vows and act on urgent states.
- Card typography is now more readable than earlier Fraunces-heavy versions, but cards still carry too much data at equal volume.

3-second clarity:

- Medium. User sees they have vows, but the hierarchy is: greeting -> giant CTA -> section -> cards. For a returning user, this is backwards.

Findings:

- P1, 92 confidence: Non-empty dashboard should demote "Make a vow" to a compact action, not a huge hero CTA.
- P1, 90 confidence: Urgent vows should sort first and use plain "Needs verdict" / "Waiting on Sarah" language.
- P1, 90 confidence: Each card should answer only four things: status, vow, time/next action, stake/witness.
- P2, 82 confidence: Remove or heavily reduce decorative wordmark prominence on dense dashboard screens.
- P2, 78 confidence: Add tabs/filter chips only if active vow counts regularly exceed 5.

Mock:

- `02-dashboard-clean-scan.html`

Recommendation:

- Implement a dashboard cleanup as the next high-value patch, but do it as a contained design pass because it touches many states.

### 6. Maker: Vow Detail / Live Vow

Current feeling:

- The live vow page has the right components but too much equal-weight ceremony: vow card, countdown card, action tiles, activity, withdraw, dev/testing surfaces.
- The page should feel like "here is the thing you promised, here is the time left, here is what to do now."

3-second clarity:

- Medium. The current page is understandable but slower than it should be.

Findings:

- P1, 90 confidence: Live vow pages need one primary next action based on state.
- P1, 88 confidence: "I did it early" should be present but not dominate over the normal accountability action unless the user is near completion/deadline.
- P1, 88 confidence: Pending witness state should feel energizing, not depressing. The job is "get them in."
- P2, 84 confidence: Countdown can be more compact unless deadline pressure is the whole current job.
- P2, 80 confidence: Activity/timeline should be collapsible below the fold by default.

Mock:

- `03-vow-live-focus.html`

Recommendation:

- Implement after dashboard because the same scan-first card language should be shared.

### 7. Maker: Kept / Broken / Outcome / Certificate

Current feeling:

- Kept and broken pages are directionally good and have the right emotional restraint.
- Kept should feel satisfying, not childish.
- Broken should feel consequential, not humiliating.

3-second clarity:

- Good.

Findings:

- P1, 88 confidence: Keep one primary CTA on terminal pages.
- P2, 84 confidence: Kept page can increase share energy slightly when the destination is "cause you hate" because that has a stronger story.
- P2, 78 confidence: Broken page could offer a "make a smaller comeback vow" CTA, but that may soften consequence too much.
- P3, 65 confidence: Certificates could become a stronger social artifact if visual design becomes more premium.

Recommendation:

- No immediate code changes besides keeping CTA discipline.

### 8. Witness: Invite Acceptance

Current feeling:

- The current witness page is now much better than the earlier serif-heavy version.
- It tells the witness what their job is and gives the vow/stake/date.
- Desktop now looks acceptable, not broken.

3-second clarity:

- Good, but can be more emotionally crisp.

Findings:

- P1, 92 confidence: The witness cares about four things: who asked, what they vowed, what is on the line, what they must do.
- P1, 90 confidence: The page should frame the witness as the pressure, not as a passive "judge invite."
- P1, 90 confidence: CTA should be human and role-specific: "I'm in - hold Joseph to it."
- P2, 85 confidence: Timeline should stay, but use simpler verbs: accept, nudge, call it.
- P2, 78 confidence: Add "Dare a friend" as a secondary acquisition link, not equal to "Make your own vow."

Mock:

- `01-witness-acceptance-focus.html`

Recommendation:

- Current implementation is usable. The mock is a sharper next version, worth implementing after dashboard/live vow cleanup.

### 9. Witness: Accepted / Watching / Verdict

Current feeling:

- Accepted state is a strong moment: "you're in" and "text Joe" is the right behavior.
- It correctly includes the vow and amount, which keeps witness memory high.
- Verdict page still needs a final careful pass for kept/broken emotional contrast and early-release context.

3-second clarity:

- Accepted: strong.
- Verdict: likely good, but needs direct device verification after token fixes.

Findings:

- P1, 90 confidence: Accepted state should always include vow + stake + deadline.
- P1, 90 confidence: Witness CTA after accepting should be a text to maker, not app exploration.
- P1, 88 confidence: Early completion should use separate copy: "Joseph says this is done. Release them only if true."
- P2, 82 confidence: Witness verdict should show one big binary decision and move all explanation below.

Recommendation:

- Keep accepted page structure.
- Audit verdict page visually after the next state fixture run.

### 10. Witness: Pending Maker Payment / Draft Vow

Current feeling:

- Correct product decision: witnesses should be able to accept before maker finishes staking. Showing a dead pending page wastes warm intent.

3-second clarity:

- Good if the invite page appears normally.

Findings:

- P1, 95 confidence: Do not show "your friend sent you a vow, wait here" as the main state.
- P1, 92 confidence: Let the witness accept, then show "Joe still needs to stake it" and push a nudge text.

Recommendation:

- Current implementation appears to follow this. Keep it.

### 11. Dare Creator

Current feeling:

- The dare creator is functional but not yet premium.
- Auth overlay was the biggest visual bug and is fixed.
- The form still asks for too much at equal weight: friend name, dare, deadline, taunt.

3-second clarity:

- Medium.

Findings:

- P0, fixed: Auth overlay readability.
- P1, 90 confidence: Dare creation should emphasize the dare text first, then friend/share.
- P1, 88 confidence: "They decide the stakes" is strong and should stay.
- P2, 82 confidence: Optional taunt should be hidden behind "add taunt" until needed.
- P2, 80 confidence: If user is not authenticated, auth should happen before showing the full dare form or after the user writes the dare, not as a modal covering half-completed UI.

Recommendation:

- Next dare pass should simplify hierarchy, but avoid implementing until maker/witness core is fully polished.

### 12. Dare Accepter

Current feeling:

- Dare accepter has a strong premise but is still more utilitarian than viral.
- It should feel like a challenge card from a friend, not a generic payment setup.

3-second clarity:

- Medium to good.

Findings:

- P1, 90 confidence: The accepter needs: who dared me, what is the dare, what do I stake, what happens if I fail.
- P1, 88 confidence: Primary CTA should bind amount and action: "Accept the dare - stake $50."
- P2, 84 confidence: Backing down should be allowed and socially framed.
- P3, 68 confidence: Add a "dare them back" loop immediately after declining.

Mock:

- `04-dare-acceptance-focus.html`

Recommendation:

- Worth a later pass after core vow flows.

### 13. Share Thumbnails / OG

Current feeling:

- Witness and dare OG images are much better than generic cards and now use large, clear friend-facing copy.
- They should be treated as acquisition surfaces.

Findings:

- P1, 90 confidence: Witness thumbnail should show "Joseph picked you as judge", vow, stake, deadline, and "Accept the job."
- P1, 90 confidence: Dare thumbnail should show "Joseph dared you", dare text, consequence, and "Accept the dare."
- P2, 82 confidence: Add more brand mark polish, but keep text bigger than decoration.

Recommendation:

- Existing OG routes are directionally good. Next improvement is visual premium, not information structure.

### 14. Twilio / SMS Lifecycle

Current feeling:

- SMS plan is thoughtful but not fully productized across every state.
- The best SMS behavior is sparse, sharp, and social.

Recommended lifecycle:

- Maker seals: witness gets simple invite; maker gets "Now get your witness in."
- Witness no accept after 24h: maker gets a nudge prompt; witness gets one reminder.
- Witness accepts: maker gets "No mercy now"; witness gets expectation-setting.
- Long vows only: midpoint check-in for maker and witness.
- 24h before: maker/witness reminder.
- Deadline: witness verdict link, maker "they have the call."
- Early completion: maker asks for release; witness receives early-release verdict link.
- Outcome: crisp kept/broken closure.

High confidence:

- P1, 90 confidence: No 10-minute-before SMS for every vow.
- P1, 88 confidence: Midpoint SMS only for vows 5+ days.
- P1, 88 confidence: Witness should be encouraged to nudge maker, not just passively wait.

Lower confidence:

- P3, 65 confidence: User-configurable reminder intensity.
- P3, 60 confidence: Reply-based commands like DONE.

## Ranked Recommendations

| Priority | Confidence | Area | Recommendation | Acted? |
|---|---:|---|---|---|
| P0 | 100 | Auth/menu styling | Add legacy token aliases and auth sheet containment | Yes |
| P1 | 95 | Witness draft invites | Let witnesses accept before maker finishes payment | Already present |
| P1 | 92 | Post-seal | Add solemn sealed moment with invite CTA | Mock only |
| P1 | 92 | Dashboard | Demote giant non-empty dashboard CTA | Yes |
| P1 | 90 | Vow live | Make state-specific next action dominate | Mock only |
| P1 | 90 | Witness acceptance | Reframe witness as pressure/accountability | Yes |
| P1 | 90 | Dare accepter | Make stake/action/consequence one clear loop | Yes |
| P1 | 90 | SMS | Sparse lifecycle, midpoint only for long vows | Existing plan |
| P2 | 84 | Verdict pages | Binary decision first, explanation below | Hold |
| P2 | 82 | Dare creator | Hide optional taunt, reduce equal-weight fields | Yes |
| P2 | 80 | Generic auth | Align modal design with seal auth sequence | Hold |
| P3 | 68 | Dare viral loop | Dare back after decline | Hold |
| P3 | 65 | Certificate | More premium share artifact | Yes |

## High-Confidence Fixes To Do Next

These are safe enough for the next implementation pass:

1. Dashboard non-empty cleanup: compact "New vow" action, remove huge CTA from above card list, simplify card hierarchy.
2. Live vow cleanup: single state-specific primary action, lower timeline/activity density.
3. Post-seal sealed moment: solemn confirmation and clear invite CTA.
4. Witness acceptance next version: use the focus mock structure, keep current functional handlers.
5. Dare auth/form polish: keep token fix, then simplify dare creator after core flows.

## Changes Held Back

Held because confidence is below "clear as day" or because they need product approval:

- Replacing dashboard architecture with tabs.
- Changing home headline away from "Make a vow. Mean it."
- Requiring witness name/phone in quick vow.
- Adding frequent final-hour SMS.
- Letting witnesses schedule custom nudges.
- Making certificates more celebratory.
- Adding dare-back loops as a major viral mechanic.

## Acceptance Criteria For Next Patch

- Mobile 393 x 852 screenshots show no overlapped CTA, browser chrome aside.
- Every page has an escape hatch: back, hamburger, dashboard, or clear forward route.
- Every screen has one dominant job.
- Public invite pages work at desktop widths and do not stretch content across the entire viewport.
- Auth surfaces are readable with phone as primary.
- No live Stripe charges during validation.
- SMS/auth testing uses explicit user participation for OTP codes only.
