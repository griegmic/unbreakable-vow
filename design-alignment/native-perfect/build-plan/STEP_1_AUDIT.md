# STEP 1 Audit — Mock Decomposition Review

**Date:** 2026-04-30  
**Scope:** Audit of STEP_1_MOCK_DECOMP.md against mocks, schema, product principles, and reference standards  
**Standards:** FINAL_RAVE_WORTHY_AUDIT.md, NATIVE_SCREEN_SCORECARD.md, COPY_PARITY_AND_3_SCORE_RULES.md, WEB_TO_NATIVE_COPY_MATRIX.md

---

## Executive Read

The Step 1 decomposition is **strong at the screen level but has critical gaps at the flow level.** The individual mock specifications are well-detailed, interaction patterns are mostly clear, and the visual hierarchy is sound. However, the document has **systemic ambiguities around state transitions, data persistence, decision trees, and failure modes** that will cause implementation friction. 

**Key systemic gaps:**

1. **Data flow is vague.** The document doesn't clearly specify when form state is persisted (DB vs. memory), what happens on back, whether draft vows get created eagerly, and when witness phone is fetched vs. shown. This is critical for screens 01–03.

2. **Decision trees are gestured at, not drawn.** The logic for when to show 07 vs. 07B vs. 08 vs. 08B vs. 08C is buried in textual description rather than a clear decision matrix. Screen 04/04b/04c step numbering is also unclear.

3. **Failure modes are named but not specced.** The doc lists "SMS won't deliver," "payment declined," "witness already declined," "witness link expired," but rarely specifies what the screen does when these occur.

4. **Cross-screen narrative is incomplete.** The maker outcome flow (kept/broken) is explicitly missing. The dare flow lacks end-to-end specification. The witness-side happy path is solid, but error cases are sparse.

5. **Interaction details are inconsistent.** Some screens have full haptic maps and animation choreography (06); others list "uncovered" without clarity on whether that's a design debt or a Step 2/3 deferral.

**Grade: 7/10 as input to implementation.** The mocks are excellent. The spec is usable but will require clarifying conversations during build.

---

## Per-Screen Findings

### Screen 01 — Vow Only, Quiet Start Chips

**Overall:** Solid foundation. One key issue with data model.

**Issues:**

1. **Data persistence is unclear.** Spec says "local form state — `rawInput`. Nothing persisted yet." But what if the user goes back and forth from 01 → 02 → 01? Does the input still live in Redux/Context, or does backing out from 02 reset 01? This matters for UX. Currently read as "local memory during the flow," which is fine, but needs confirmation.

2. **SIGN IN link destination is uncovered.** The decomp defers to Step 3, but this is a key decision: is it "I'm a returning user, take me to my dashboard" or "I'm signed out, show me a sign-in form"? A returning user who hasn't authed yet should probably go `/dashboard` or `/quick-vow`, not a sign-in page. Current UX reads like the former, but needs explicit spec.

3. **Chip scroll edge affordance.** The decomp mentions "Right edge has a fade gradient overlay and a chevron arrow indicator." This is good, but the chevron arrow is unusual for a scroll affordance — usually it's just the gradient. Is this a visual affordance or a tap target? If tap target, where does it go? Clarify.

4. **"Next →" disabled state.** Spec says "CTA disabled when input empty" but doesn't spec the disabled styling. The Bottom CTA description says `.cta` is always a gold gradient, but what does disabled `.cta` look like? Check the mocks for the disabled appearance.

5. **Native primitive `SuggestionChipScroll`** — the spec calls for this, but doesn't specify behavior if the viewport is full (all chips visible). Does the gradient fade still appear? Does the chevron hide?

**Missing:**

- Keyboard behavior when input is focused (does it push content up, or does the screen scroll?).
- "Paste" behavior if user has a vow copied to clipboard.
- Placeholder text should stay dim or fade fully when typing — spec says "fades out" but doesn't show the visual transition.

**Verdict:** Acceptable. Defer SIGN IN destination and disabled state styling to Step 3, but confirm data persistence model now.

---

### Screen 02 — Stake First, Selectable Verdict

**Overall:** Strong. Interactions are clear. Data model is explicit.

**Issues:**

1. **"Other" tile uncovered.** Spec says "Tap 'Other' → opens custom-stake input (uncovered — Step 3)." This is a critical UX moment. Is it an iOS native number picker, an inline text field, a sheet? The decision affects the flow significantly. Estimate the design in Step 1; don't defer.

2. **Cheeky note adapts to amount.** The spec says the italic line "adapts to amount" based on stake selection. What are the exact note variants for $20, $50, $100, and custom amounts? The current mock shows only $50. Without variants, this feels incomplete.

3. **Consequence row "Change" link design.** The spec mentions a gold "Change" link that opens 02c. But where exactly in the row? The meta says "Right: 'Change' link gold." But the mock layout shows a consequence statement. Clarify the exact row structure and whether the row is tappable or only the "Change" link is.

4. **Verdict date pill defaults.** Screen 02b calls "Sunday night" the default `.on` pill, but 02 doesn't say whether the verdict row pre-populates with "Sunday night" or starts empty. Spec that relationship.

5. **`vowDateCard` design unclear.** The two-row card showing Vow (read-only) and Verdict (tappable) is a pattern, but the visual relationship isn't specified: do they have a shared border, separate borders, dividers? The mock should clarify.

**Missing:**

- Minimum and maximum stake amounts (business rules).
- Whether custom stake has a max (Stripe limit?) and how it's enforced (client-side validation).
- Error state if custom amount is invalid.

**Verdict:** Good spec. The "Other" tile design and cheeky-note variants should be estimated in Step 1 so Step 2 doesn't start from zero.

---

### Screen 02b — Verdict Date Sheet

**Overall:** Clear. One interaction ambiguity.

**Issues:**

1. **Sheet dismissal on pill tap.** The spec says "Tap pill → selects, updates underlying form state, dismisses sheet (or stays — TBD: probably dismiss after selection per iOS pattern)." This is a real question, not a TBD. If the sheet dismisses, the user loses the context of where they are. If it stays, they can multi-select (bad UX). Decide: **tap a pill → auto-dismiss, or require explicit close?** Current iOS pattern is auto-dismiss for radio-button sheets.

2. **"Pick date" behavior.** When the user taps "Pick date," does it open a native iOS date picker modal on top of the sheet, or does it replace the sheet content? And what's the date range? Can the user pick a date in the past, or only the future? Can they pick past midnight tonight?

**Verdict:** Minor ambiguity. Decide on dismiss-on-select and date range rules; otherwise solid.

---

### Screen 02c — Change Destination Sheet

**Overall:** Solid. Copy parity is good. One layout question.

**Issues:**

1. **Cause-type card toggle.** The spec says "Tap a causeTypeCard → toggles which list is shown (cause-you-believe-in vs cause-you-hate)." But which card is `.on` by default? Is "Cause you believe in" pre-selected, or does the user start with both lists shown? The mock should clarify the default state.

2. **Destination chips persistence.** The spec implies the selected destination persists from 02 (where it shows "ALS Association" with `(on)` styling). When the user opens 02c, is "ALS Association" still visually marked as `.on`? If so, the interaction is "toggle type, destination carries over." If not, the user has to re-select. Clarify.

3. **"Done" button behavior.** The spec says "Tap 'Done' → applies, dismisses, updates underlying screen." But what if the user tapped neither cause type nor destination? Is the CTA disabled, or does it apply the current state even if nothing is new? If user toggled the type but didn't change the destination, does "Done" apply?

**Verdict:** Good sheet spec. Clarify default cause-type state and the "Done" behavior for no-change cases.

---

### Screen 03 — Choose Witness

**Overall:** Strong narrative. One critical missing interaction pattern.

**Issues:**

1. **"Share link" without a draft vow.** The spec says "Tap 'Share link' → triggers iOS share sheet with witness invite URL (this requires the vow to exist as a draft first; uncovered nuance — Step 2 backend mapping)." This is a **real problem.** The vow doesn't exist yet — the user is still in the creation flow. How does a draft vow get created? When does it get created? Before the user hits "Next" on screen 03, or on screen 05 when they seal? If it's created early, does backing out from 03 delete the draft? This **must** be clarified before Step 2 architecture.

2. **"Go solo" → skip 04 if authed.** The spec says "Flips `witness_name = 'Just me'`, advances to 05 Add Payment (skips 04 if already authed... uncovered)." This is a **branching condition** that isn't drawn. Under what conditions does the user skip auth? If they're already signed in from the web app? If they previously signed in via the app? Or only if they completed a previous vow and thus have a session? Specify the exact condition.

3. **No bottom CTA on this screen.** The spec says "NO bottom CTA on this screen — must add witness or share link to advance." But the mock image (shot 5 in the HTML) — does it actually have no CTA, or is it unclear in the spec? If it's truly locked, the user needs a way to proceed if they change their mind about witnessing. Can they tap "Go solo" to advance, or is that a state flip that doesn't advance? Clarify the interaction.

4. **"Add a witness" card tappability.** The spec says "Tappable → opens 03b sheet." But the empty-state avatar, title, sub, and chevron — are all parts tappable, or only the card? Standard is the whole card + the chevron is a visual hint, but clarify.

**Missing:**

- What does the "Share link" sheet contain? Standard iOS share sheet, or a custom Unbreakable Vow sheet?
- Error state if contact picker is denied by the user.

**Verdict:** **This screen has a gate-keeper issue.** The vow creation timing (when does it transition from pure client-side form to a sealed/draft DB row?) must be locked down before implementation starts. The "Go solo" skip-auth logic also needs a decision tree. The spec is good otherwise.

---

### Screen 03b — Pick Witness Sheet

**Overall:** Solid. One permission-handling gap.

**Issues:**

1. **Contact picker failure.** The spec says "Tap 'Choose contact' → triggers iOS contact picker (`expo-contacts`)." But what if the user denies the permission? The spec doesn't mention a fallback or retry. Should the sheet dismiss and show a permission error, or should there be a graceful "Permission required" state within the sheet?

2. **"Pick" link on recent-contact rows.** The spec says rows have a "Pick" gold link on the right. But does tapping the row also select, or only the "Pick" link? Standard is row tap selects, and the link is redundant. Clarify the intended interaction.

**Verdict:** Minor. Handle contact permission denial explicitly.

---

### Screen 03c — Witness Selected

**Overall:** Good state variant. One interaction detail.

**Issues:**

1. **"Change" link behavior.** The spec says "Tap 'Change' → re-opens 03b sheet." But does it preserve the previous selection, or does it start fresh? If fresh, the user has to re-type the contact name or scroll through their contacts again. If preserved, it should show the current contact highlighted. Typical pattern: preserve.

**Verdict:** Minor. Clarify "Change" interaction.

---

### Screen 04 — Phone First

**Overall:** Strong. Copy is crisp. One styling uncertainty.

**Issues:**

1. **Country flag / code display.** The spec says "Country flag + +1 separator (1px right border)." But how does the flag display change when the user changes the country? Is there a picker that opens on tap of the flag, or is the country code static? The "Tap country code → country picker (uncovered)" note is deferred to Step 3, but the picker should be spec'd in Step 1 so the button placement is right.

2. **Phone input mask.** The placeholder shows "(555) 867-5309" but doesn't specify if this is a formatted display (with auto-insert of parens and dashes) or just a hint. Clarify the input behavior: does it auto-format as the user types, or do they type raw digits and the display handles it?

3. **"stateSpec" card.** The spec says the mock has a "stateSpec" card listing alternate states: "States: invalid number, sending, SMS failed, rate limited, change country." But this card is designer reference, not user-facing, right? The note color is dim and small. Confirm this is a mockup label, not rendered UI.

**Missing:**

- Country picker design / sheet.
- SMS rate-limiting error message.
- Network timeout error message.

**Verdict:** Good screen. Defer country picker to Step 3 but make a placeholder for the button. The stateSpec card should be clarified as designer reference.

---

### Screen 04b — Enter Code

**Overall:** Excellent. Haptic and animation details are specified. One UX question.

**Issues:**

1. **Auto-verify vs. tap-to-verify.** The spec says "After 6 digits, auto-verify (or wait for tap)." This is a **design decision.** Auto-verify is faster but can feel jarring if the last digit is mistyped. Tap-to-verify is safer but requires a second action. What's the Unbreakable Vow philosophy? Recommend: **wait for tap.** The CTA becomes active at 6 digits; user confidence is higher. But decide now.

2. **Resend countdown edge case.** The spec says "Resend countdown 38s → 0 → tappable 'Resend code'." But what if the countdown hits 0 and the user hasn't checked in? Does the countdown quietly become tappable, or is there a visual state change? Standard is subtle: text color changes from muted to active. Confirm.

**Verdict:** Excellent spec. Decide auto-verify vs. tap-to-verify.

---

### Screen 04c — Name If Missing

**Overall:** Clear and minimal. One data model question.

**Issues:**

1. **"Only if user doesn't have a display_name."** The spec correctly notes this screen is conditional. But the decision logic should be explicit in the flowchart: if the user is returning and has a display_name, skip this screen entirely. If new, show it. If the user declines to enter a name, what happens? Is the CTA disabled until they type, or is there a default fallback (first phone digits, or "you")?

**Verdict:** Minor. Clarify what happens if the user submits an empty name.

---

### Screen 05 — Add Payment

**Overall:** Excellent. The two-tile payment method selection is clear. One spec precision gap.

**Issues:**

1. **Apple Pay tile design — " Pay" glyph.** The spec says "Top: payMark white pill ' Pay' 800/15. (The space before 'Pay' is intentional for Apple logo glyph.)" This is great detail, but is the Apple logo an actual glyph (U+F8FF or similar), or is it a rendered image/SVG? React Native doesn't natively support the Apple system glyph. Clarify whether this is "Apple Pay" text with a space placeholder for a logo asset, or literal glyph rendering.

2. **Card tile appears to be second choice.** The spec shows payTile.on for Apple Pay, payTile (off) for Card. This implies Card is the default fallback, but the copy says "Card" not "Card (fallback)." Given the audience (iOS), is this the right order, or should Card only appear if Apple Pay is unavailable?

**Verdict:** Minor. Clarify Apple logo rendering and Card tile visibility rules.

---

### Screen 05b — Stripe / Apple Pay Confirm

**Overall:** Designer reference, not a real spec. Well-documented.

**Issues:**

1. **"systemNote" is a designer note.** The spec explicitly says "This is a designer note for our team — DO NOT render in production." Good. The mock's note explains the surrounding context is controlled by the app, but Stripe renders the sheet. Confirm that Step 2 will configure the SetupIntent with the right merchant name and context.

**Verdict:** Solid understanding. No issues.

---

### Screen 06 — Sealed Moment

**Overall:** Beautiful spec. Animation choreography is detailed. **One critical decision deferred.**

**Issues:**

1. **Auto-advance vs. user-tap timing.** The spec says "No bottom CTA — auto-advances to 07 after a beat (or user-tap-to-continue; Step 4 will lock)." This is a **major product decision.** Auto-advance is elegant and can feel celebratory, but it risks losing the moment if the user is distracted. User-tap lets the emotional climax breathe but adds friction. The decomp defers to Step 4, but this should be **locked now** because it affects whether 06 has a CTA. Recommendation: **Hold the screen until user taps.** Sealing is solemn; the user should feel the moment, not be pushed through it. But this is Joey's call.

2. **"sealMoment" variant detail.** The spec specifies `.sealMoment` variant with padding `66 24 0` plus extra `padding-top: 150`. This is weird math — why add padding-top to a padding value? Clarify: is the total top padding `66 + 150 = 216`? Or is it `padding: 150 24 0`, overriding the `66`?

3. **Quote source.** The spec says the sealQuote shows "The vow text in quotes: `"Run every morning this week."`" This is the refined vow text, not the raw input, right? Confirm that the vow shown matches `refined_text` from the DB.

**Missing:**

- What happens if the vow text is very long? Does it truncate, wrap, or scroll?
- Haptic timing: does `hapticSealComplete` fire at the apex of the seal-mark scale animation, or after?

**Verdict:** Strong spec. **Defer the auto-advance decision to Joey now, not Step 4.** Clarify padding math.

---

### Screen 07 — Send Witness Invite

**Overall:** Excellent. Copy is crisp. Flow is clear.

**Issues:**

1. **SMS deep link vs. `expo-sms`.** The spec says "CTA → `Linking.openURL('sms:+15551234567&body=' + encodeURI(message))` or `expo-sms` `composeAsync`." This is a **technical implementation choice.** Which does the app use? The `sms://` URI is simpler, but `expo-sms` gives more control. Recommend `expo-sms` for better UX (can confirm send, handle permission, fallback if Messages app is unavailable). Decide in Step 2.

2. **URL formatting in messageCard.** The spec shows "unbreakablevow.app/w/abc123" with "ellipsis" handling. But the full URL could be much longer (with multiple query params or a token). How does the truncation work? Standard is ellipsis in the middle (...) or end (...). The spec shows it as a single line with "ellipsis" but doesn't specify the truncation strategy.

3. **"I'll do it later" behavior.** Spec says this advances to 08. But should the app persist that the user **didn't** send the SMS, or should 08 still have the "Text Joe" CTA as if they just sealed? The logic for 08 vs. 08B depends on whether the user sent the SMS. Clarify the state tracking.

**Verdict:** Good. Decide on `expo-sms` vs. URI and URL truncation strategy.

---

### Screen 08, 08B, 08C — The Witness State Branching

**Overall:** This is the **most complex part of the spec.** The three screens represent different witness-preparation states, but the decision tree is only textually described, not drawn.

**Critical Gap — Decision Tree:**

The spec says:

- **08** "when status=sealed and witness not yet accepted, witness has phone."
- **08B** "when user has confirmed they sent SMS or returns from share sheet."
- **08C** "when witness has no name (anonymous share-link flow), pre-acceptance."

But the **actual decision variables** are:

- `witness_phone` present? (yes/no)
- `witness_name` present? (yes/no, distinct from phone)
- `witness_accepted_at` null? (yes/no)
- User tapped "Text Joe" button? (yes/no) — local state only

**Issues:**

1. **State tracking is client-side or server-side?** The spec says 08 vs. 08B detection uses "local state OR by detecting that the SMS app was opened (more reliable: a flag set when SMS deep-link was tapped, persisted in AsyncStorage scoped to vow_id)." So the source of truth is client-side `AsyncStorage`, not the server. This is brittle if the app crashes or the user returns after 24 hours. Better approach: the server should have a `sms_sent_at` or `witness_invited_at` field on the vow. Recommend **locking this decision now: should the app rely on client-side AsyncStorage flags, or should the DB track state?** Currently, there's no `sms_sent_at` in the CLAUDE.md schema, so this needs backend work.

2. **Anonymous share-link (08C) — when does it occur?** The spec says 08C is when "witness has no name (anonymous share-link flow), pre-acceptance." But the spec earlier (screen 03) says the user can tap "Share link instead" to skip adding a witness. So when does the app create a vow with `witness_phone IS NULL` and `witness_name IS NULL`? Is that the 08C state? The spec should clarify: "If user tapped 'Share link' on 03 without adding a witness, they advance to 08C."

3. **08B → "Done" CTA.**  The spec says 08B has a "Done" button instead of "Text Joe." But what if the user is on 08B and they want to send the SMS again? The spec says the linkRow shows "'Text again' (re-opens SMS deep link)." So the user can send multiple times, which is good. But the flow is confusing: "Done" on the main CTA, but "Text again" as a secondary link. Recommend clarity: show the flow as either "Done" + "Need to resend? Text again" or "Text again" + "Skip for now."

4. **Witness acceptance updates 08 to 08B or stays on 08?** The spec doesn't address what happens if the user is viewing 08 and the witness accepts in real-time (via a push notification or realtime subscription). Should the screen update to show the witness has been accepted, or should it stay on 08 and require a refresh? This matters for the real-time UX.

**Missing Screens:**

- **08D — Witness Accepted (awaiting next state):** If the user is on 08/08B and the witness accepts, what screen do they see? The spec jumps from 08B to 09 (Joe Accepted), but 09 is a **transition celebration screen.** Does it only show on first acceptance, or every time the user opens the app after acceptance? This is a key distinction: 09 feels like a "Joe accepted your invite" moment, not a permanent vow state.

**Verdict:** **This section needs a decision-tree rewrite.** The three screens are well-designed individually, but the transitions are ambiguous. Draw a decision matrix in Step 1:

| Input State | Variable | Value | Output Screen |
|---|---|---|---|
| Post-seal | witness_phone | null | 07B |
| Post-seal | witness_phone | !null | 07 |
| User sent SMS | has_sent_sms_flag | true | 08B |
| User didn't send SMS | has_sent_sms_flag | false | 08 |
| Witness accepted | witness_accepted_at | !null | 09 |
| Anonymous share | witness_name, witness_phone | both null | 08C |

---

### Screen 09 — Joe Accepted

**Overall:** Beautiful transition screen. **Two timing questions.**

**Issues:**

1. **First-time-only vs. re-entry.** The spec says "Transition screen when witness has just accepted (push-triggered or polling)." But does "just accepted" mean the first time, or every time? If the user leaves the app and comes back 30 minutes later after the witness accepted, do they see 09 again, or are they taken directly to 10 (mid-vow active)? Recommendation: **09 is only shown the first time the user encounters the accepted state.** On subsequent opens, they go to 10. The spec should clarify this.

2. **Push notification trigger.** The spec says this can be "push-triggered or polling." If it's push-triggered, does the app receive the push, open to this screen, and then the user taps "See my vow" to go to 10? Or does the push just alert the user, and they manually return to the app? Clarify the push handling.

**Verdict:** Excellent screen. Clarify the first-time-only behavior and push-trigger flow.

---

### Screen 10 — Mid-Vow Active

**Overall:** Strong. **One missing detail.**

**Issues:**

1. **"Text Joe a check-in" interaction.** The spec says this is an SMS deep link. But what's the pre-filled message? The spec should show the SMS template for check-in messages.

2. **Countdown logic edge case.** If only a few hours remain and the user opens the app, the countCard shows a fresh countdown (e.g., "2h 14m left"). But when does the app transition to 11 (Almost Verdict Time)? Is it based on a fixed threshold ("when <= 24h remain") or a real-time check? If the user is viewing 10 and the countdown ticks below 24h, does the screen update to 11, or does it require a page refresh?

**Verdict:** Minor. Show check-in SMS template.

---

### Screen 11 — Almost Verdict Time

**Overall:** Good state variant. **Confirm the background color transition.**

**Issues:**

1. **`.gold` phone background.** The spec says "Phone background `.gold`" but earlier screens use `.green` for active states. Is this a new color variant, or a mistake in the notation? The design principles say "almost-time states (11/19): `.gold` background," so it's intentional. Confirm the CSS variable exists or will be added.

**Verdict:** Minor clarification only.

---

### Screen 12 — Verdict Due, Waiting

**Overall:** Good. **Critical backend gap.**

**Issues:**

1. **"Nudge Joe to decide" endpoint.** The spec says "Nudge Joe to decide" → triggers `send-sms` with `message_type: 'verdict_request'` (or a custom nudge endpoint — Step 2 Backend Map will resolve)." This is **not yet designed.** The CLAUDE.md schema doesn't have a `message_type: 'verdict_request'` enum. The `sms_log` table has `message_type text`, but the allowed values aren't specified. The backend must support:
   - Sending a nudge SMS template.
   - Rate-limiting nudges (don't let the maker spam the witness with nudges).
   - Logging the nudge in sms_log.

   Recommend: add a field `nudge_sent_at` to the vows table and rate-limit to 1 nudge per 4 hours or similar.

2. **"WHAT HAPPENS NEXT" timeline.** The spec shows a timeline with "Now: Joe can deliver the verdict (active dot)" and "If kept: Nothing charges (dim dot)." But this is the **maker's view**. The witness has their own timeline (screen 20). Clarify whether the shared timeline makes sense here or if it's maker-specific copy.

**Verdict:** Acceptable. Backend must support nudge SMS and rate-limiting.

---

### Screen 13 — Dashboard Command Center

**Overall:** Excellent. The greeting, role pills, cards, and urgent-alert pattern are all strong. **One missing state.**

**Issues:**

1. **Empty state missing.** The spec doesn't include a "no vows yet" state for the dashboard, but the WEB_TO_NATIVE_COPY_MATRIX says the web copy is "No vows on the line. / Sealed commitments will show up here. / Make your first vow →". Should 13 have a variant for the first-time user, or is that out of scope for Step 1? Recommendation: **include an empty-state variant.** It's simple (greeting, empty message, CTA) and important for onboarding UX.

2. **Role pill filtering.** The spec lists pills: "All", "My vows" (on), "● Judging · 1" (orange dot indicating something to do), "Dares · 2". But what does each pill actually filter? The spec says "Tap rolePill → filter cards" but doesn't specify the filter logic:
   - "All" = all vows + all judging + all dares?
   - "My vows" = only vows where `user_id = me` and status != completed?
   - "Judging" = only vows where `witness_user_id = me` and `verdict_at IS NULL`?
   - "Dares" = only challenge vows where `user_id = me`?

   Clarify the filter rules.

3. **"Urgent calls first" sorting.** The spec says "open loops first. Quiet vows after." But what's the exact sort order? The scorecard hints at urgency: `verdict_deadline_distance ASC, then status`. But what if two vows have the same deadline distance? Specify the full sort key.

4. **needCard orange dot pulse.** The spec says "Pulsing alert card on 13, 13B. Orange left-border 3px, orange gradient bg, 14 padding, has pulse dot, label, title, body, mini CTA." What's the pulse animation? Is it a CSS animation loop, or a one-time pulse? If loop, what's the cadence? Recommend: subtle 1.5s pulse (opacity 0.5 → 1.0 → 0.5).

5. **Card truncation.** The vowCard shows italic serif vow text 16px. But if the vow is very long ("I solemnly swear to avoid all caffeine, sugar, processed foods, red meat, and dairy for the entire year of 2026"), does it wrap or truncate? Recommend truncation with ellipsis after 1 line of text.

**Missing:**

- Empty state design for first-time users.
- Filter rules for role pills.

**Verdict:** Strong screen. Add an empty-state variant and clarify role pill filter logic.

---

### Screen 13B — Project Perfect Menu

**Overall:** Excellent menu design. One routing question.

**Issues:**

1. **"＋ Make a vow" hero item.** The spec calls this a "hero" menuItem and says it has "Put money on your word" subtitle. When tapped, does it go to:
   - 01 (Guided vow creation) for first-time users?
   - 16 (Quick vow) for returning users?
   - A router that decides based on user history?

   The decomp doesn't specify. Clarify the routing logic.

2. **"People I'm judging" badge.** The spec shows "◐ 'People I'm judging' + badge '1'". Is the ◐ symbol an actual Unicode character, or a custom SVG? If custom, the spec should note that. If Unicode, it should be tested for rendering on iOS.

**Verdict:** Minor routing clarification needed.

---

### Screen 14 — Judging Dashboard

**Overall:** Excellent. **One sorting question.**

**Issues:**

1. **"Urgent calls first. Quiet vows after."** The spec repeats the sorting rule but doesn't give the explicit sort key. Is it:
   - `verdict_deadline - now ASC` (soonest deadlines first)?
   - `verdict_deadline - now ASC, then status` (deadlines first, then sub-sort by status)?
   - `verdict_at IS NULL ASC, verdict_deadline - now ASC` (pending verdicts first, then soonest deadlines)?

   Clarify the sort order.

2. **"Reply in 6 hrs" vs. "X days left."** The spec shows meta text "Reply in 6 hrs" (orange urgent), "Reply in 18 hrs" (orange), "X days left" (gold/green). What's the logic for when to show "Reply in" vs. "X days left"? Recommend: show "Reply in" when deadline is < 24h away, then switch to "X days left" format when >= 24h. But the spec should define it.

**Verdict:** Clarify sort order and "Reply in" vs. "X days left" logic.

---

### Screen 15 — Dares You Sent

**Overall:** Good dare-side dashboard. **Missing dare detail screen.**

**Issues:**

1. **Dare detail screen missing.** The spec says "Tap vowCard → dare detail (uncovered nuance)." But a dare detail screen (showing the challenged person, the dare text, the deadline, the stake, etc.) is essential. This should be in Step 1 as a companion to 10/11/12 (vow detail). The dare detail would show the dare maker's perspective: is the target still deciding, have they accepted, have they completed, etc.

2. **Tab bar interaction.** The spec lists 3 tabs: "Open", "Accepted", "Done". But when a dare moves from "Open" to "Accepted" (the target accepts), do the cards stay in place, or does the tab auto-switch? Recommend: stay on current tab and show a toast/notification "Dare accepted" so the user can manually check the "Accepted" tab if they want.

3. **"Resend invite →" behavior.** This is shown on "Open" dares. But what if the maker taps it multiple times? Is there rate-limiting? Should the SMS content be different on resend ("Just a reminder..." vs. first send)? Clarify.

**Missing:**

- Dare detail screen design.
- Resend rate-limiting rules.

**Verdict:** Critical missing: dare detail screen. Add it to Step 1 or explicitly defer to Step 3.

---

### Screen 16 — Quick Vow Main

**Overall:** Excellent compressed design. **Two interaction questions.**

**Issues:**

1. **"Need help? Guided setup" link.** The spec says this link "opens 01 (multi-step)." But this is a **user loss point.** If the user taps this link from a fully-filled Quick Vow form, do they lose their inputs? Or should the app pre-fill the guided form with what they entered? Recommendation: **remember the qv inputs in AsyncStorage and pre-fill 01 with them.** The spec should clarify.

2. **"Stake $50 →" CTA wording.** The spec says the CTA is "Stake $50 →" but the stake amount is dynamic. Should the CTA update to "Stake $25 →" or "Stake $100 →" based on the selected tile? The spec doesn't say. Recommend: the CTA always says "Stake $X →" where X is the currently selected amount.

3. **QvCard layout truncation.** The spec shows "qvCard" with kicker "I VOW TO", input, rule divider, and "qvDate (inline)". If the vow input is very long, does the date line wrap, or does it push down and out of the card? The layout is tight (802px tall total), so long vows could break it. Recommend truncation of vow input or wrapping of the date line.

**Missing:**

- Interaction pattern for switching from Quick Vow to Guided (do inputs carry over?).
- Dynamic CTA amount update rule.

**Verdict:** Good. Clarify "Guided setup" input preservation and CTA amount update.

---

### Screen 16B — Quick Vow Add Payment

**Overall:** Solid. Same as 05 but compressed. **One navigation question.**

**Issues:**

1. **"← Back" destination.** The spec says "Head row 3-col: ← Back / qvBrand center / 44px spacer right." But does "Back" go to 16 (Quick Vow Main), or does it exit the Quick Vow flow entirely? If the user backs out, they should return to 16, not to the dashboard. Clarify the back routing.

**Verdict:** Minor. Clarify back routing.

---

### Screen 17 — Witness Accepted

**Overall:** Beautiful witness-side celebration. **One timing question.**

**Issues:**

1. **First-time-only vs. re-entry (parallel to 09).** Same question as 09: is this a one-time celebration screen, or do returning users see it again after they've already accepted? Recommend: **one-time only, then route to 14 (judging dashboard).**

**Verdict:** Minor. Clarify first-time-only behavior.

---

### Screens 18, 19, 20 — Witness Mid-Vow & Verdict

**Overall:** Excellent witness flow. Mostly complete.

**Issues:**

1. **Screen 20 verdict submission.** The spec says "Tap Yes → confirmation sheet (uncovered) → submit verdict 'kept' → success screen." But:
   - What does the confirmation sheet say? Something like "Are you sure Joe kept it?" or a more elaborate explanation?
   - Is there a success screen after verdict submission, or does the app return to the judging dashboard (14)?
   - What's the haptic for each outcome (kept vs. broken)?

   The spec mentions `hapticVerdictKept` and `hapticVerdictBroken` but doesn't say when they fire relative to the confirmation sheet.

2. **"I'll decide later" behavior.** The spec shows a quietLink "Need to check? Text Joe first" centered (no primary CTA). But if the witness taps "I'll decide later," what happens? Do they get routed back to the judging dashboard (14)? This should be explicit.

3. **Witness outcome screen missing.** After the witness submits a verdict (kept or broken), what screen do they see? A success message? Or are they sent back to 14? The spec doesn't include a witness-side outcome screen. This is **likely intentional** (witnesses don't get celebration), but it should be explicit.

**Missing:**

- Verdict confirmation sheet design/copy.
- Post-verdict routing for witnesses.

**Verdict:** Strong. Clarify confirmation-sheet design and post-verdict routing.

---

## Cross-Screen Flow Gaps

### 1. **Creation Flow Data Persistence (Screens 01–03)**

**Gap:** The document doesn't clearly specify when form state is persisted vs. held in memory.

**Current understanding (from reading between lines):**
- Screens 01–03: form state is client-side memory (Redux, Context, or AsyncStorage).
- Screen 03 (Share link tap): **vow must be created as a draft in DB** to generate an invite URL. But the spec doesn't say how/when this happens.
- Screen 05 (Seal): the app calls `seal-vow` edge function, which presumably updates the draft vow to `status = 'active'` and captures payment.

**Question:** Should the draft vow be created on screen 01 (as soon as the user enters a vow), screen 03 (when they choose a witness or choose share link), or screen 05 (when they seal)? This affects error recovery:
- If created on 01: user can refresh the page and their vow is still there.
- If created on 05: if the user closes the app during screens 02–04, the vow is lost.

**Recommendation:** Defer to Step 2 backend mapping, but **the spec should name this as a critical decision.**

### 2. **Returning-User Path (Screen 01 "SIGN IN" link)**

**Gap:** Where does "SIGN IN" go?

**Current understanding:**
- If a returning user is not authed, they should probably go to `/dashboard` directly, not a "sign in" form.
- But the spec calls it "SIGN IN link" which implies authentication UI.

**Recommendation:** Clarify whether this is:
- "Sign in here" → Auth flow starting at 04 (phone OTP), OR
- "I already have an account" → Dashboard if already authed, OR
- Hidden entirely if the user is authed.

### 3. **"Go Solo" Branch (Screen 03)**

**Gap:** When the user chooses "Go solo," does the app:
- Immediately advance to 05 (payment)?
- Or advance to 04 (auth) if not authed?

**Current spec:** "advances to 05 Add Payment (skips 04 if already authed... uncovered)."

**Missing decision tree:**
- Condition: Is user authed?
  - If yes: 03 → 05
  - If no: 03 → 04 → 05

### 4. **Maker-Side Outcome Screens (MISSING)**

**Gap:** The spec has no screens for the maker's perspective when a vow is kept or broken.

**Current understanding (from WEB_TO_NATIVE_COPY_MATRIX):**
- Kept: "KEPT", "You actually did it.", "Crisis averted."
- Broken: "BROKEN", "You broke it.", "Brutal. You broke it."

**Missing details:**
- After the witness submits a verdict, does the maker get a push notification?
- If they tap the notification, what screen do they see?
- On the outcome screen, what CTAs are available? "Make another vow," "Share certificate," etc.?
- Is the payment status visible (e.g., "$50 refunded" for kept, "$50 charged to ALS Association" for broken)?

**Recommendation:** **This is a critical missing flow.** Add maker-side outcome screens (two variants: kept and broken) to Step 1, or explicitly note that they are Step 3 work.

### 5. **Post-Seal Witness Share Flow (Screens 07/07B → 08/08B/08C)**

**Gap:** The decision tree for which screen shows is buried in text.

**Clarified logic:**
- If `witness_phone` is present → 07 (Send Joe the invite)
- If `witness_phone` is absent and `witness_name` is present → 07B (Share the invite)
- If both are absent → 08C (Waiting for a witness)

But the spec also mentions:
- 08 (Waiting Witness Detail) "when status=sealed and witness not yet accepted, witness has phone."
- 08B (Returned After Messages) "when user has confirmed they sent SMS."

**Missing clarity:** Are 07 and 08 the **same flow** (send SMS), or different? The spec suggests 07 is the immediate post-seal modal, 08 is the persistent detail page. But they both have the same CTA "Text Joe the invite." So what's the difference?

**Recommendation:** Clarify the screen progression:
- 06 (Sealed Moment) → **auto or tap?**
- Next: 07 (Send invite — modal or persistent page?)
- User taps "I'll do it later" → 08 (Waiting detail — persistent page showing same CTA)
- User taps "Text Joe" on 07 or 08 → SMS opens
- User returns from SMS → stay on 08 or auto-update 08B?

### 6. **Dashboard → Vow Detail Routing**

**Gap:** When a user taps a vowCard on the dashboard, which detail screen do they see? 08, 10, 11, or 12?

**Current understanding:** depends on vow state:
- If `witness_accepted_at IS NULL` → 08
- If active (deadline not reached) → 10 (or 11 if ≤ 24h)
- If `verdict_at IS NULL AND deadline passed` → 12
- If `verdict_at IS NOT NULL` → outcome screen

**Recommendation:** The spec should draw this decision tree.

### 7. **Push Notification Handling**

**Gap:** When a push notification arrives (e.g., "Joe accepted your vow"), how does the app handle it?

**Current understanding (from FINAL_RAVE_WORTHY_AUDIT.md):**
- Push should begin after value is proven, not on first launch.
- Permission asking timing: after seal, witness accepted, or vow kept.
- Maker pushes: witness accepted, mid-vow check-in, 24h before, verdict submitted, payment issue.

**Missing from Step 1:**
- How does the app deep-link to the right screen after a push tap?
- If the user taps "Joe accepted" push while viewing the dashboard, does it navigate to 09 (celebration) or 10 (active detail)?
- What if the user is in the middle of creating a new vow when a push arrives? Is it queued?

**Recommendation:** Defer detailed push deep-link handling to Step 2, but note it in Step 1 as a "must-handle" item.

---

## Missing Screens & States Not in Step 1 Decomp

### 1. **Maker Outcome Screens (Kept / Broken)**

**Status:** Missing entirely.

**Spec gap:** The witness-side flow (screens 17–20) ends with verdict submission, but there's no maker outcome screen. Based on the web copy matrix and rave-worthy audit, there should be:

- **Screen X: Vow Kept** — "KEPT", vow text, "$50 refunded" or "Nothing charged", CTA "Make another vow"
- **Screen Y: Vow Broken** — "BROKEN", vow text, "$50 charged to ALS Association", CTA "Claim your stake" or "Make a new vow"

**Recommendation:** Add these to Step 1 mock decomposition, or explicitly note that they are Step 3 work with a rough copy baseline.

### 2. **Voided Vow (Maker-Initiated Cancel)**

**Status:** Missing.

**Spec gap:** The CLAUDE.md schema has `status = 'voided'` as a valid vow state. The `void-vow` edge function exists. But there's no step in Step 1 where the user can void a vow. Where is the entry point? Is it:
- A button on the vow detail page (08, 10, 11, 12)?
- A menu option (13B)?
- A long-press gesture?

**Recommendation:** Clarify whether void is in scope for Step 1, and if so, add the flow.

### 3. **Dare Detail Screen**

**Status:** Missing.

**Spec gap:** Screen 15 (Dares You Sent) lets the user tap a dare card ("Tap vowCard → dare detail (uncovered nuance)"). But there's no spec for the dare detail screen. Is it:
- Similar to the vow detail (10–12) but showing the dare target's acceptance status?
- A simple modal or sheet?

**Recommendation:** Add a dare detail screen to Step 1 or defer to Step 3 with a note.

### 4. **Dare Acceptance / Target Interaction (C-Token Flow)**

**Status:** Mentioned but not fully spec'd.

**Spec gap:** The schema mentions `challenge_accept` edge function and challenge vows. But there's no native screen for a dare target to accept a dare. The web has `/c/[token]` (challenge accept route), but the native spec doesn't show it. Is it:
- Mobile web only (user taps SMS link → web accept flow)?
- Also native (user receives SMS, taps link → native app opens to dare-accept screen)?

**Recommendation:** Clarify whether dare-target acceptance is in scope for Step 1.

### 5. **Error / Recovery Screens (Payment Failed, SMS Failed, etc.)**

**Status:** Mentioned in spec but no dedicated screens.

**Spec gap:** The spec mentions "SMS failed" and "payment declined" in state notes (e.g., "stateSpec: States: invalid number, sending, SMS failed, rate limited, change country"). But there are no full-screen error UI specs. For example:
- Payment declined: what does the user see on 05? Does 05 show an error banner and disable the CTA?
- SMS failed: what does the user see if the SMS delivery fails? Is there a retry button?

**Recommendation:** Add error-state variants for critical screens (04, 05, 07) or defer to Step 2 UX specs.

### 6. **Network Error / Offline Handling**

**Status:** Not mentioned.

**Spec gap:** What happens if the user loses network connectivity mid-flow? For example:
- On screen 02, the user hits "Next" but network is down. Does the app show a toast, disable the CTA, or navigate to an offline screen?

**Recommendation:** Not critical for Step 1, but note as a future consideration.

### 7. **Custom Stake Amount (Screen 02 "Other" Tile)**

**Status:** Mentioned as uncovered ("Step 3").

**Spec gap:** When the user taps "Other" on screen 02, what happens? 
- Native number picker?
- Text field in a sheet?
- Alert dialog?

And what's the min/max range for custom stakes?

**Recommendation:** This is a small but important interaction. Estimate it in Step 1 (e.g., "iOS native alert with number input, min $1, max $1000").

### 8. **Empty State on Dashboard (Screen 13)**

**Status:** Not included.

**Spec gap:** The spec for 13 doesn't include a "no vows yet" state for the first-time user or a user who has completed all their vows. The WEB_TO_NATIVE_COPY_MATRIX references this copy: "No vows on the line. / Sealed commitments will show up here. / Make your first vow →"

**Recommendation:** Add a 13-Empty-State variant.

### 9. **Expired or Revoked Witness Links**

**Status:** Not addressed.

**Spec gap:** What happens if:
- A witness link (token) has expired (e.g., the vow was voided and the token is no longer valid)?
- The witness tries to accept a vow that's already been kept or broken?

**Recommendation:** Not critical for Step 1, but worth noting for Step 2 backend specs.

### 10. **Account Settings / Preferences**

**Status:** Not in Step 1 decomp.

**Spec gap:** The menu (13B) mentions "⚙ Settings", but there's no screen spec. What settings exist? Name, phone, payment method, push preferences, etc.?

**Recommendation:** Defer to Step 3 or note as out-of-scope for native-perfect v1.

---

## Critique of Step 1's 10 Open Questions

### Q1: Custom stake amount input (mock 02 "Other" tile) — Step 3 must design.

**Assessment:** Reasonable deferral, but **should be estimated in Step 1.** This is a small enough UI decision that it can be locked now. Recommend: "Tapping 'Other' opens an iOS native NumberAlert with min $1, max $999, step $1."

**Framing:** Good. Clear scope.

### Q2: Country code picker in 04 — Step 3.

**Assessment:** Reasonable deferral. Country picker is moderately complex (need to handle flag rendering, search, etc.), so Step 3 is appropriate. But **the button placement should be spec'd now** so the phone input layout is locked.

**Framing:** Good. Could be more specific: "Country picker design (flag display, search, selection interaction) deferred to Step 3. Phone input layout spec'd now with placeholder for country code selector."

### Q3: Returning-user sign-in path (mock 01 has "SIGN IN" link) — Step 3.

**Assessment:** This is **either a Step 1 decision or a Step 0 product decision,** not a Step 3 implementation detail. If the link goes to auth (04), then it's a simple router. If it goes to the dashboard, it's even simpler. The question should be answered now.

**Framing:** Poorly framed. Reframe as: "Does 'SIGN IN' link route to phone auth (04), or to dashboard if authed? Decide now."

### Q4: Verdict confirmation sheets for 20 (Yes/No tap → confirm) — Step 3.

**Assessment:** Reasonable deferral. The copy for the confirmation sheet is a Step 3 writing task, but **the interaction pattern should be spec'd now:** "Tap Yes → iOS actionSheet with question + warning (if broken, money is charged) + confirm button."

**Framing:** Acceptable. Could be clearer: "Design the verdict confirmation sheet (copy, layout, buttons) in Step 3. Interaction pattern: action sheet with confirm."

### Q5: State 08 vs 08B detection — local AsyncStorage flag or backend field.

**Assessment:** This is **a critical architecture decision that must be made in Step 2,** not deferred. The Step 1 spec should flag it as a blocker: "Vow sent-SMS state must be tracked server-side (recommend `sms_sent_at` field on vows table) or client-side (AsyncStorage), to be decided in Step 2 backend mapping."

**Framing:** Correct identification, but undershoots the priority. This is not a minor nuance; it affects data architecture.

### Q6: "Nudge Joe to decide" in 12 — needs a backend endpoint.

**Assessment:** **This should be designed in Step 1.** The endpoint exists implicitly in the schema (send SMS with `message_type: 'verdict_request'`), but the rate-limiting, SMS content, and logging need to be spec'd. At minimum, the Step 1 spec should say: "Nudge SMS template: 'Joe asked you to decide: did they keep it? [link]' Rate limit: 1 nudge per 4h per vow. Log in sms_log."

**Framing:** Undershoots the work. Should be part of Step 2 backend map, but the Step 1 spec should define the feature more completely.

### Q7: Dare detail screen (tap on a card in 15) — Step 3.

**Assessment:** **Should be in Step 1 with at least a wireframe.** A dare detail is as essential as a vow detail (10–12). Rough spec: show dare target, dare text, deadline, status (pending/accepted/completed), CTA based on status (accept/resend/done).

**Framing:** Undershoots scope. This is not a Step 3 nice-to-have; it's a required screen for the dare flow.

### Q8: Native cast/dare creation flow — Step 3.

**Assessment:** Reasonable deferral. The dare creator is a secondary feature and can wait until the core vow flow is stable. But **the web flow should exist as a reference,** and the Step 1 spec should note: "Dare creation mirrors quick-vow (16) but with target selection and taunt (optional). Scope: Step 3."

**Framing:** Good. Appropriate deferral.

### Q9: Maker-side kept/broken outcome screens — Step 3 must derive.

**Assessment:** **This is a critical missing feature, not a deferral.** The witness-side outcomes (17–20) are beautiful, but the maker has no celebration or explanation when they keep or break a vow. This should be spec'd in Step 1 with rough wireframes and copy. The FINAL_RAVE_WORTHY_AUDIT.md hints at it: "Kept: 'KEPT', 'You actually did it.', 'Crisis averted.' Broken: 'BROKEN', 'You broke it.', 'Brutal. You broke it.'"

**Framing:** Incorrect scope assignment. Should be Step 1 design task, not Step 3 derivation.

### Q10: Transition animations between phase backgrounds (default → green → gold → blue) — Step 4.

**Assessment:** Reasonable deferral. Animation choreography is a Step 4 responsibility. But the Step 1 spec should confirm which screens have which backgrounds (already done, well).

**Framing:** Good. Animation is Step 4; design is complete.

---

## Concrete Fixes for the Decomp

**Priority order (P0 blockers first):**

### P0 — Systemic Fixes (Must lock before Step 2 starts)

1. **Add a decision-tree diagram for screens 07/07B/08/08B/08C.** Create a table:
   ```
   | witness_phone | witness_name | witness_accepted_at | sms_sent_flag | user_action | → Screen |
   | NULL | NULL | NULL | — | — | 08C |
   | !NULL | !NULL | NULL | false | (initial) | 07 |
   | !NULL | !NULL | NULL | true | (returned) | 08B |
   | NULL | NULL | NULL | true | (shared) | 08B or 08C |
   | !NULL | !NULL | !NULL | — | — | 09 → 10 |
   ```

2. **Clarify draft vow creation timing.** Add a note: "When does the vow transition from client-side form state to a sealed/draft DB row? Decision: [Step 2 backend mapping]. Impacts: back/exit behavior, error recovery, witness link generation."

3. **Lock the auto-advance decision for screen 06 (Sealed Moment).** The decomp says "Step 4 will lock," but this is a product decision, not an animation detail. Make a call now: **"06 auto-advances OR user must tap to continue?"** Recommend: user taps, to savor the moment.

4. **Add maker-side outcome screens (two variants).** At minimum, add:
   - **Screen X: Kept** — "KEPT", vow text, refund confirmation ($X refunded), CTA "Make another vow"
   - **Screen Y: Broken** — "BROKEN", vow text, charge confirmation ($X to ALS Association), CTA "Make a new vow"

   Or explicitly note: "Maker outcome design is Step 3 work. Copy baseline: Kept = 'KEPT' / 'You actually did it.' / 'Crisis averted.'; Broken = 'BROKEN' / 'You broke it.' / 'Brutal. You broke it.'"

5. **Draw a full creation-flow decision tree**, showing:
   - When/where does draft vow get created?
   - What's the exact path for "Go solo"? (03 → 04 if not authed, else → 05)
   - What's the path for returning users tapping "SIGN IN"?

### P1 — Screen-Specific Fixes

6. **Screen 02:** Add a subsection with stake note variants for $20, $50, $100, and $1000+.

7. **Screen 02b:** Decide: **sheet auto-dismisses on pill selection, or user must manually dismiss?** (Recommend: auto-dismiss)

8. **Screen 02c:** Clarify: is "Cause you believe in" the default `.on` state, or are both options shown initially?

9. **Screen 03:** Clarify: **when is the draft vow created?** Before or after the user adds a witness?

10. **Screen 04:** Clarify: **is country picker a placeholder for Step 3, or is the full picker designed in Step 1?** (Recommend: placeholder, Step 3 detail)

11. **Screen 04b:** Decide: **auto-verify at 6 digits, or wait for user tap?** (Recommend: wait for tap, safer)

12. **Screen 06:** Decide: **auto-advance to 07, or user must tap?** (Recommend: user must tap, solemn moment)

13. **Screen 07/08/08B/08C:** Refactor into a clear branching spec with the decision table (from P0 fix #1).

14. **Screen 09:** Clarify: **is this a one-time celebration, or does the user see it every time they re-enter the app after witness acceptance?** (Recommend: one-time only)

15. **Screen 10:** Add SMS template for "check-in" messages.

16. **Screen 12:** Clarify: **what's the nudge SMS template?** (e.g., "Joe asked you to decide: did they keep it? [link]")

17. **Screen 13:** Add an empty-state variant for first-time users.

18. **Screen 13:** Define filter rules for role pills (All, My vows, Judging, Dares).

19. **Screen 13:** Define sort order: `verdict_deadline - now ASC, then status, then name`? (Recommend: this or similar)

20. **Screen 15:** Add a **dare detail screen** spec, or defer explicitly to Step 3 with rough wireframe.

21. **Screen 16:** Clarify: **if user taps "Need help? Guided setup," do their Quick Vow inputs carry over to 01?** (Recommend: yes, via AsyncStorage pre-fill)

22. **Screen 16:** Clarify: **CTA says "Stake $X →" where X is the selected amount?** (Recommend: yes)

23. **Screen 20:** Add verdict confirmation sheet design (copy, layout, buttons).

24. **Screen 20:** Clarify: **after verdict is submitted, does the witness see a success screen, or are they routed to 14 (judging)?** (Recommend: success toast + return to 14)

### P2 — Documentation Fixes

25. **Add a "Failure Modes" section** listing how each critical screen handles errors:
    - 04: Invalid phone number, SMS rate limit, network timeout
    - 05: Payment declined, SetupIntent error, Stripe unavailable
    - 07: SMS delivery failed, contact permission denied
    - 12: Nudge rate-limited, SMS failed to send

26. **Add a "Vow State Machine" diagram** showing the full lifecycle:
    ```
    draft → sealed → active → awaiting_verdict → kept | broken | voided
    Challenge: pending → accepted | declined
    ```

27. **Add a "Session / Auth Model" section** clarifying:
    - Is a user logged in globally after auth on screen 04, or per-vow?
    - What happens if the user logs out? Can they re-enter the app?

28. **Add a "Data Persistence" model** showing what's stored where:
    - Client-side: form state during 01–03, sms_sent_flag for 08 vs 08B
    - Server-side: all vow data, sms_log, audit_events

---

## Things to Escalate to Joey

### Design Decisions

1. **Screen 06 timing:** Auto-advance to 07, or user taps to continue? (Currently: deferred to Step 4, but it's a product call)

2. **Draft vow creation:** When does the vow transition from form state to DB? (Impacts witness link generation, back/exit behavior, error recovery)

3. **Screen 08 vs 08B state tracking:** Use client-side AsyncStorage flag or server-side DB field? (Currently: deferred, but it's a data architecture call)

4. **Returning-user "SIGN IN" link:** Where does it go? (Currently: deferred to Step 3, but should be answered in Step 1)

5. **Maker outcome screens:** Should they be in Step 1 decomp, or is Step 3 appropriate? (Currently: explicitly deferred, but they're essential to the product loop)

6. **Dare detail screen:** In scope for Step 1, or Step 3? (Currently: deferred, but it's a required screen if dares are shipping)

### Implementation Risks

7. **Payment on broken vow:** When exactly does Stripe charge the maker? On `seal-vow` (manual capture), or when the witness submits a "broken" verdict? The spec says "charged only if broken," but the stripe flow says "seal-vow" does manual capture. Clarify the Stripe lifecycle.

8. **SMS delivery reliability:** The spec mentions "SMS won't deliver" as a failure mode but doesn't detail the recovery flow. Should there be an SMS retry mechanism? Rate-limiting on retry?

9. **Witness expiration:** If a witness link is valid for N days and then expires, what does the witness see if they try to accept after expiration? This should be spec'd.

10. **Real-time updates:** When the witness accepts (or the verdict is submitted), does the maker's app update in real-time (via Supabase realtime), or only on app refresh? This affects whether 09 is ever shown or if 08 just transitions to 10 silently.

---

## Missing or Ambiguous Interaction Details

### Haptics

- Screen 05: hapticSelection on payment tile toggle, hapticPrimary on "Seal this vow" — good. But what about haptic on "Done" in 02c? (Likely missing; recommend: hapticPrimary)

- Screen 12 "Nudge Joe": No haptic specified. (Recommend: hapticPrimary on CTA)

- Screens 18–20: haptics are good, but the chart should mention hapticWarning if the witness is about to submit a "broken" verdict (risky, charges money).

### Keyboard Handling

- No mention of how the keyboard affects layout on screens with text inputs (01, 02b, 04, 04c, 16). On short screens (16 is 802px tall), an open keyboard could cover CTAs.

- No mention of keyboard dismissal when advancing screens (e.g., does the keyboard auto-dismiss when the user taps "Next" on screen 01?).

### Gestures

- Swipe-to-dismiss on sheets (02b, 02c, 03b) is mentioned for 13B menu but not for the 02-level sheets. Clarify whether bottom sheets support swipe-to-dismiss.

- Long-press interactions: are there any? (e.g., long-press a vowCard to delete/void)

### Accessibility

- No VoiceOver label specs. Screens with complex layouts (13, 14) should have clear labels for screen readers.

- No mention of dynamic type support. Screens with multiple font sizes (e.g., 06 with display title + quotes) could break at larger text scales.

---

## Visual Hierarchy & Layout Edge Cases

1. **Screen 13 (Dashboard) with long vow text:** If a vow is "I will read the entire Wikipedia history of the Byzantine Empire and take detailed notes every day for the next 3 months," the vowCard would overflow. The spec should clarify: truncate after 1 line with ellipsis? Or wrap to 2 lines?

2. **Screen 01 with very long suggested chip:** If a chip says "Complete a PhD thesis on quantum computing," the chip would wrap or overflow. The spec shows the chip as a single line. Clarify truncation.

3. **Screen 02 "Other" custom stake:** If a user enters a very large number (e.g., $99,999), the "$X" display and the cheeky note might not fit. Clarify: is there a max character width, or does the layout adapt?

4. **Screen 04 phone input with long country name:** If the country picker adds a long country name (e.g., "United Kingdom of Great Britain and Northern Ireland"), the layout could break. Recommend: always show "+44" code, not the full country name.

---

## Copy Parity Issues

The decomp is generally good about matching the WEB_TO_NATIVE_COPY_MATRIX, but one note:

- **Screen 13 greeting:** The spec says "Hey, Joseph." but the web copy matrix says "Hey, FIRSTNAME." or "Your vows." The capitalization and personalization should match exactly. Clarify whether native shows the full name or a shorter version.

---

## Summary of Gaps by Severity

### Critical (must fix before Step 2)
- Add maker outcome screens (kept/broken) or defer with justification.
- Draw decision tree for 07/07B/08/08B/08C.
- Lock draft vow creation timing (when does it move from form to DB?).
- Lock screen 06 auto-advance decision.
- Clarify returning-user "SIGN IN" link destination.

### High (should fix in Step 1)
- Add dare detail screen spec.
- Add empty-state variant for screen 13.
- Define role pill filter logic (screen 13).
- Define sort order for vow lists (screens 13, 14).
- Add error-state specs for critical screens (04, 05, 07).
- Clarify 08 vs 08B state tracking (client vs. server).

### Medium (can defer to Step 2 with clear notes)
- Custom stake input design (screen 02 "Other").
- Country picker design (screen 04).
- Verdict confirmation sheet design (screen 20).
- Dare creation flow.
- Post-verdict routing for witnesses.

### Low (nice-to-have)
- Keyboard behavior on small screens.
- Accessibility labels and dynamic-type support.
- Swipe-to-dismiss gestures.
- SMS retry/rate-limiting logic.

---

## Final Assessment

**The Step 1 decomposition is a strong foundation for implementation.** The mocks are excellent, the interaction patterns are mostly clear, and the visual hierarchy is sound. The spec demonstrates a deep understanding of the product and the native platform.

**However, before Step 2 engineering starts, the following must be clarified:**

1. **Data flow:** When does form state transition to DB? How do we handle back/exit during creation?
2. **Decision trees:** Which screen shows when? (Especially 07–08 branching, returning-user path, go-solo path)
3. **Maker outcomes:** Are they Step 1 or Step 3? Either way, they're essential to the loop.
4. **Failure modes:** How does each screen handle errors? (Payment declined, SMS failed, etc.)
5. **State tracking:** Is 08 vs 08B state stored client-side or server-side?

**With these gaps addressed, Step 1 becomes a solid spec for Step 2 to build from. Estimated work to close gaps: 2–4 hours of design refinement.**

**Recommend:** Schedule a 30-min sync with Joey to lock:
- Screen 06 auto-advance (user tap)
- Draft vow creation timing (exact screen)
- Returning-user "SIGN IN" destination (dashboard)
- Maker outcomes (in Step 1 or Step 3?)

Then proceed to Step 2 backend and architecture mapping.
