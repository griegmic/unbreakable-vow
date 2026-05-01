# Final Rave-Worthy Audit

Date: 2026-04-27  
Scope: mobile web, Expo/TestFlight shell, and the native-perfect rebuild path  
Goal: make the app feel like the approved mobile web product, then exceed it where native can genuinely be better.

## Executive Read

The mobile web product is now the accepted product baseline. It is direct, legible, and emotionally much closer to the Unbreakable Vow idea: make a promise, put real consequence behind it, get someone to hold you to it.

The current Expo/TestFlight state is intentionally demo-safe, not final-native. Build 9 wraps live mobile web routes through `expo/components/live-web-shell.tsx` so the stale native screens do not leak into a demo. That is the right emergency move, but it is not the final app. The native app now needs a deliberate screen-by-screen rebuild behind safe routes, then graduation into the default app only after each screen is clearly better than the shell.

The final-rave-worthy bar is:

- A new user understands the product in three seconds.
- Every screen has exactly one obvious job.
- Every CTA feels like the natural next move, not a generic button.
- Typography is readable before it is theatrical.
- The product feels solemn, social, slightly dangerous, and fun, without becoming cluttered.
- Native surfaces earn their difference: contacts, haptics, push, Apple Pay, app transitions, saved state.

## Current Architecture Truth

### Mobile Web

Primary implementation lives under:

- `web/src/app/page.tsx`
- `web/src/app/quick-vow/page.tsx`
- `web/src/app/create/page.tsx`
- `web/src/app/seal/page.tsx`
- `web/src/app/dashboard/page.tsx`
- `web/src/app/vow/[id]/page.tsx`
- `web/src/app/w/[token]/client.tsx`
- `web/src/app/w/[token]/verdict/client.tsx`
- `web/src/app/cast/page.tsx`
- `web/src/app/c/[token]/client.tsx`

This is the visual and copy baseline.

### Expo/TestFlight Today

Primary implementation is currently a live web shell:

- `expo/components/live-web-shell.tsx`
- `expo/app/index.tsx`
- `expo/app/quick-vow.tsx`
- `expo/app/guided.tsx`
- `expo/app/dashboard.tsx`
- `expo/app/seal.tsx`
- `expo/app/vow-detail.tsx`
- `expo/app/cast.tsx`

This is demo-safe and should remain the default until native screens pass QA.

### Native Design Lab

The first native-perfect prototype exists at:

- `expo/app/native-quick-vow.tsx`

It proves the direction, but it is not ready to replace the shell. It needs flow wiring, contact selection, saved-card logic, haptics QA, and visual tightening.

## Product Principles

1. **One job per screen.** If a screen asks for a vow, do not make stake, witness, and cause feel equal unless it is explicitly the quick-returning-user surface.
2. **Serif is ceremony, sans is operation.** Fraunces/serif should be reserved for display moments and vow text. Dense UI, inputs, status, payment, and dashboard should be sans.
3. **The CTA owns the bottom.** Sticky bottom CTAs should be strong, high contrast, safe-area aware, and never overlap card content.
4. **Consequences must be visible.** "If broken, $50 goes to ALS Association" is not microcopy. It is the product premise.
5. **Witness is a person, not a feature.** The witness flow should feel like "your friend needs you," not "join this app."
6. **No surprise sheets.** Share sheets, contact sheets, payment sheets, and push permission prompts should appear after a clear user action.
7. **Native should feel tactile.** Haptics should mark decisions and commitments, not every tap.
8. **Do not celebrate too early.** Sealing is solemn. Keeping a vow is satisfying. Breaking one is consequential. Confetti is off-brand.

## Screen-By-Screen Audit

### 1. Home / First-Time Entry

Current web read: strong. The product premise is direct and not over-explained. The opening ceremony has a memorable brand beat, but it should never slow down a returning user.

Rave-worthy target:

- First viewport: brand, promise input, concise premise, one CTA.
- Copy should stay in the family of "Make a vow. Mean it." or "Flake and lose it all..." because it is simple and high-conviction.
- Native first-time users should get the guided flow, not the power-user Quick Vow surface.

Issues to watch:

- Too much display type can make the screen feel like a poster instead of an app.
- Decorative live-money proof can distract on small screens.

Native decision:

- Keep web hierarchy.
- Add subtle haptic on first CTA.
- Do not show push permission, contacts, or payment yet.

Confidence: 95

### 2. Opening Ceremony

Current web read: good brand moment, but timing must be gentle. It should feel like crossing a threshold, not waiting through a splash screen.

Rave-worthy target:

- One short oath beat for first-time users only.
- "I do solemnly swear / to keep my word this week / or else" is strong enough.
- CTA: "I swear it" or "I swear it ->".
- Skip automatically only for returning users or reduced-motion users.

Native decision:

- Use one success/commitment haptic when the user taps "I swear it."
- No haptic on passive animation.
- Store a local seen flag.

Confidence: 90

### 3. Guided Vow / Vow Input

Current web read: strong. The input is the job. The user should not be reading much else.

Rave-worthy target:

- Title: "What's your vow?" works.
- Subtitle: "You know the one." is good because it nudges specificity without explaining.
- Input should look like a real input, not display copy.
- Deadline presets must be visible but secondary.
- Suggestions are a rescue path, not the main layout.

Native concerns:

- The current native lab prototype uses a more branded headline ("One promise. Real consequence."). That may be good for Quick Vow but is not as clear as "What's your vow?" for guided.
- Native should avoid the old Rork-looking screen with heavy top progress bars and over-dark contrast.

High-confidence native target:

- Guided step 1 should closely match web create.
- Use hapticSelection on suggestion chips and deadline presets.
- Back should go to the previous in-flow screen or dashboard, never browser history.

Confidence: 95

### 4. Refine / Sharpen

Current web status: this has been de-emphasized in favor of direct create -> stake. That is mostly correct.

Rave-worthy target:

- Only show sharpening when the vow is vague or obviously incomplete.
- The screen should be a helpful nudge, not a mandatory "AI edit" step.
- Always provide a clear back/escape.

Native decision:

- Do not build a full native refine screen in the first native-perfect milestone unless the flow requires it.
- If included, make it a bottom sheet with two options: "Use this" and "Keep mine."

Confidence: 82

### 5. Stake / Cause

Current web read: one of the strongest product moments. Stake selection gives the vow weight. The cheeky copy is useful because it adds personality without adding a paragraph.

Rave-worthy target:

- The stake amount should be the single display-scale emotional moment.
- Stake tiles should be `$10`, `$25`, `$50`, `$100`.
- Each amount should have one tight line of cheeky copy.
- The consequence sentence should be readable and tappable.
- Good-cause and hate-cause choices should not overtake the screen.

Native target:

- Use a subtle pulse animation when stake changes.
- hapticSelection on stake tiles.
- hapticWarning only if choosing a high-risk/destructive consequence or broken verdict, not normal stake selection.
- Native picker for cause can be a sheet after tapping consequence line.

Confidence: 96

### 6. Judge / Witness Selection

Current web read: mobile web correctly leans toward share link after sealing. Asking for name plus phone too early is too much friction.

Rave-worthy target:

- On web: share link is enough.
- In native: contact selection is the upgrade. "Add a judge" opens contacts/recent contacts, not a text field-first screen.
- If contacts are denied, fallback to share link.
- User should understand that the witness does not need the app.

Native target:

- Judge slot is a real decision card, not a tiny utility row.
- Empty: "Add a judge" / "Contacts first. Share link still works."
- Filled: avatar initial + "Judged by Nick."
- hapticSelection on opening contacts and selecting a contact.

Confidence: 94

### 7. Auth / Phone / Name

Current web read: phone-first is right. The line-strike visual bug in the phone input is a high-confidence bug to eliminate in native and keep monitoring on web.

Rave-worthy target:

- Phone before name after witness selection is the better flow when the job is authentication.
- Name capture should happen only when needed for witness comprehension.
- OTP screen should be calm, large, and impossible to misread.
- Copy should be direct: "We'll text the code that seals your vow. No password."

Native target:

- Phone-first.
- Use system SMS autofill where available.
- hapticOtpDigit on digit entry, hapticOtpError on invalid OTP.
- Do not show Google as co-primary.

Confidence: 96

### 8. Payment / Apple Pay

Current web read: improved, but this remains the highest-risk conversion surface. Apple Pay should feel primary where available, with card as backup.

Rave-worthy target:

- Copy: "Nothing charges unless you break it."
- Do not say "held" unless Stripe is actually placing a hold.
- Apple Pay should appear first/default when available.
- Card fallback should be visually quiet, not intimidating.
- Error states should be specific and recoverable.

Native target:

- Apple Pay first in TestFlight.
- Expo Go should have a clearly marked test bypass; never pretend Apple Pay can be fully validated in Expo Go.
- Saved payment method should be reused for returning users if the backend supports it.
- hapticPrimary on "Seal", hapticSuccess on card saved, hapticError on failure.

Confidence: 98

### 9. Post-Seal Celebration / Witness Share

Current web read: much better than before, but the timing is still the most delicate emotional moment. The user needs one satisfying "sealed" beat, then a persistent social job: get your witness in.

Rave-worthy target:

- First beat: "Your vow is bound." with the vow visible.
- Second state should not yank away too quickly.
- The next job should be unmistakable: "Now send the witness link."
- Primary CTA: "Text Nick" or "Send the invite."
- Secondary: "Copy link" / "I'll do it later."

Native target:

- One tactile success haptic when sealed.
- No rapid multi-screen carousel.
- Use native share sheet only when user taps the CTA.
- If contact exists, direct Messages compose is excellent; if not, native share sheet.

Confidence: 95

### 10. Dashboard

Current web read: functional and much improved from older versions, but this is still where density can creep back. Dashboard should be the scan surface.

Rave-worthy target:

- Greeting small, action compact.
- Cards answer: what, status, time, witness/stake.
- Urgent items first.
- No huge floating "Make a vow" between cards.
- The primary action for non-empty dashboard should not overpower the vow list.

Native target:

- App-native list with large tap targets and no web chrome.
- Pull-to-refresh with hapticPullRefresh.
- Cards open vow detail reliably.
- Empty state should be inspiring; non-empty state should be utilitarian.

Confidence: 94

### 11. Vow Detail: Waiting For Witness

Current web read: product job is right: get the witness in. It must not feel depressing or like the vow failed to start.

Rave-worthy target:

- Headline: "Get Nick in." or "Send the invite."
- Vow summary compact.
- Primary CTA: "Text Nick the invite" / "Share witness invite."
- Secondary: "Go solo instead" should exist, but not compete.
- Explain: "They accept, then your vow is fully live."

Native target:

- Native share/contact flows.
- hapticPrimary on sending invite.
- hapticSuccess after shared/copied state.

Confidence: 92

### 12. Vow Detail: Active

Current web read: the current active page has useful elements but can become receipt-like. The primary job is either keep going, nudge/share, or mark done early.

Rave-worthy target:

- Vow at top.
- Time left clear but not oversized unless deadline is soon.
- One primary state action:
  - witness not accepted: send invite
  - active with witness: share/check in/mark done early
  - solo: deliver own verdict when done
- Activity/timeline below the fold or collapsed.

Native target:

- Countdown feels native and restrained.
- Early completion flow should be available but not dominate.
- Push reminders should complement this page.

Confidence: 90

### 13. Early Completion

Current product need: important. Some vows are completed before deadline, and the app should not force the user to wait.

Rave-worthy target:

- Maker taps "I did it early."
- If self-judged: deliver kept verdict immediately.
- If witnessed: witness gets a release/confirm link.
- The maker sees "Waiting for Nick to confirm."

Native target:

- CTA on active detail, not dashboard.
- hapticPrimary on request.
- Push/SMS to witness: "Joe says they did it. Confirm?"

Confidence: 88

### 14. Verdict Prompt

Current web read: should be clean and high-stakes. The witness needs the vow, the amount, deadline context, and two clear calls.

Rave-worthy target:

- "Did Joe keep it?"
- Vow quote prominent.
- Stake/destination visible.
- Kept and broken buttons should feel serious and differentiated.
- A confirmation step for "broken" may be appropriate because it triggers money.

Native stance:

- Witness verdict stays mobile web for v1, but native maker should deep-link to it if self-judging.

Confidence: 93

### 15. Kept Outcome

Current web read: directionally good. This should feel proud but not goofy.

Rave-worthy target:

- Strong result: "Kept."
- Vow text.
- Stake returned/no charge language.
- Share artifact optional.
- CTA: "Make another vow."

Native target:

- hapticSuccess.
- Optional share certificate.
- Do not over-celebrate if the user only sealed, not completed.

Confidence: 92

### 16. Broken Outcome

Current web read: needs restraint. It should sting, not shame.

Rave-worthy target:

- Clear result: "Broken."
- Money destination visible.
- Payment status visible if charge failed.
- CTA: "Make a new vow" / "Win it back" only when appropriate.
- For cause-you-hate, the emotional sting can be sharper.

Native target:

- hapticWarning.
- If payment fails, clear recovery: "Fix payment."

Confidence: 92

### 17. Witness Invite

Current web read: improved and mostly correct. The witness first-page job is not "join." It is "your friend needs you to hold them accountable."

Rave-worthy target:

- "Joe needs you." or "Joe needs you to keep them honest."
- Vow, amount, destination, deadline.
- "Your job" card: accept, nudge, verdict.
- Primary CTA: "Accept as judge."
- Secondary acquisition: "Make your own vow" after acceptance, not before the job is understood.

Native stance:

- Witness remains mobile web.
- Native app may later support installed-user witness mode, but not this pass.

Confidence: 94

### 18. Witness Accepted / Watching

Current web read: strong direction. The green CTA to text the maker is good because it creates immediate social energy.

Rave-worthy target:

- "Joe knows you're watching."
- Vow and amount remain visible.
- "What happens next" is useful but should not be too ornate.
- Primary CTA should encourage a text/nudge.
- Secondary CTA: make your own vow.

Potential issue:

- Serif-heavy "Joe knows you've got them" can be beautiful but slightly harder to scan. Favor readable sans for the main action and keep serif for the emotional headline only.

Confidence: 88

### 19. Dare Creator

Current web read: good product line. Dare is a different emotional mode: playful challenge, still serious consequence.

Rave-worthy target:

- "Dare someone to do the thing."
- Target, vow, deadline.
- Taunt optional and collapsed.
- Share link explicit.
- Maker understands they become the judge.

Native target:

- Later native creator should use contacts-first target selection.
- hapticPrimary when sending.

Confidence: 88

### 20. Dare Accepter

Current web read: one of the strongest public acquisition surfaces after recent work. It still must clearly answer "do what, by when, what happens if I fail?"

Rave-worthy target:

- "Joseph dared you."
- Vow text.
- Due date visible.
- Stake selection or default stake visible.
- Copy: "Accept it, stake your word. Follow through and lose nothing. Fail and you pay."
- Phone auth and Apple Pay should be smooth and non-intimidating.

Native stance:

- Dare accepter remains mobile web v1.

Confidence: 91

## Haptics Map

Use haptics only when user intent is clear.

- `hapticSelection`: stake tile, suggestion chip, deadline preset, cause selection, contact selection, dashboard filter.
- `hapticPrimary`: continue, seal, send invite, accept witness, accept dare, submit verdict.
- `hapticSealComplete`: card saved and vow sealed.
- `hapticVerdictKept`: kept verdict, completion confirmed.
- `hapticVerdictBroken`: broken verdict confirmation.
- `hapticOtpDigit`: OTP digit entry.
- `hapticOtpError`: invalid OTP, invalid phone, payment error.
- `hapticPullRefresh`: dashboard refresh threshold.
- No haptics on passive redirect, render, page load, or disabled taps.

## Push Notification Strategy

Push should begin after value is proven, not on first launch.

### Permission Timing

Ask for push after:

1. The user seals their first vow, or
2. A witness accepts, or
3. A user completes/keeps a vow and has felt the loop.

Do not ask on app open.

### Maker Pushes

- Witness accepted: "Nick accepted. Your vow is fully live."
- Mid-vow check-in for vows longer than 3 days: "Still on track? Nick will call it Sunday."
- 24h before deadline: "24 hours left. Keep it clean."
- 1h before deadline: only for short/high-stake vows; use sparingly.
- Witness verdict submitted: "Verdict is in."
- Payment issue: "Your vow was marked broken, but payment needs attention."

### Witness Pushes

Witnesses are mobile web v1, so push only applies if they later install the app. For now use SMS.

Future installed-witness push:

- Accepted confirmation: "You're watching Joe's vow."
- 24h before deadline: "Joe's vow is almost up."
- Verdict now: "Did Joe keep it?"
- Early completion request: "Joe says they did it. Confirm?"

### SMS vs Push

- SMS: external witness, auth, verdict link, critical accountability.
- Push: installed maker reminders, lower-friction engagement, app-native state changes.

## Implementation Priority

### P0: Do Not Break Demo

- Keep live web shell as TestFlight default until native screen parity is verified.
- Do not reconnect stale Rork as source of truth.
- Do not replace the shell with partial native routes.

### P1: Native Quick Vow

Build from `expo/app/native-quick-vow.tsx`, but tighten before wiring:

- Guided users should not start here.
- Returning users can start here.
- Contact judge slot opens native contacts.
- CTA goes to native seal/payment, not back to shell.
- Add "Use guided instead" as subtle secondary only if user hesitates or screen is empty.

### P1: Native Seal / Payment

- Phone-first auth.
- Apple Pay-first in TestFlight.
- Saved payment reuse where supported.
- Clear Expo Go test behavior.
- No duplicate card/wallet confusion.

### P1: Native Post-Seal

- One persistent celebration/share screen.
- No rapid auto-replacement.
- Contact-aware text/share CTA.

### P1: Native Dashboard / Vow Detail

- Native list and state pages.
- One action per state.
- No card/CTA overlap.
- Pull refresh and navigation haptics.

### P2: Native Dare Creator

- Native dare creation can come after maker vow loop.
- Public dare acceptance remains web.

### P2: Installed-Witness Mode

- Later. Current witness flow should remain mobile web and excellent.

## What I Would Change Now vs Hold

### Change Now

- Keep TestFlight on web shell for tomorrow demos.
- Continue native-perfect behind separate routes.
- Tighten native Quick Vow visual density before wiring.
- Build a native screen scorecard before replacing defaults.

### Hold

- Full installed-witness native experience.
- Aggressive final-hour push cadence.
- Complex dashboard filters.
- Making Quick Vow the first-time default.
- Surprise share sheet after seal.

## Acceptance Checklist

Before any native screen replaces the shell:

- It matches web copy and hierarchy unless a native difference is intentional.
- It works on iPhone 393x852 with no content/CTA overlap.
- It has a clear escape hatch.
- It has haptics mapped and manually tested.
- It handles loading, error, disabled, success, and empty states.
- It has a screenshot saved in `design-alignment/native-perfect/screenshots/`.
- `cd expo && npm run lint` passes.
- `cd expo && npx tsc --noEmit` passes.
- `cd expo && npx expo export --platform web --output-dir /tmp/unbreakable-native-perfect-export` passes.
- Apple Pay is tested in TestFlight, not Expo Go.

## Bottom Line

The right path is not to keep prompting Rork into reshaping stale screens. The right path is to preserve the loved mobile web flow as the demo-safe app shell, then rebuild native in a controlled design lab. The native app should graduate only when it is more beautiful, more tactile, and more trustworthy than the shell.

