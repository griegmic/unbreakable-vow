# Unbreakable Vow — QA Checklist v1.0

**Scope:** Full-product QA pass. Every checkbox is a test the build must pass before launch. Claude Code must walk this entire list phase-by-phase and again at the end as a final gate.

**Rule:** If a checkbox fails, fix before moving on. If a checkbox is ambiguous, stop and flag to Joey.

**Scoring:** Grouped by P (preservation), F (functional), C (copy), V (visual), S (state), A (accessibility), X (cross-platform), E (edge case), T (trust & safety), R (regression), M (metrics).

---

## P — Preservation (nothing in "DO NOT BREAK" is broken)

### P.1 Expo app

- [ ] `expo/components/vow-ui.tsx` — bit-for-bit unchanged. Diff is empty.
- [ ] Existing mobile creation flow still works end-to-end: input → refine → witness → stake → seal → certificate → live.
- [ ] Existing mobile screens render without errors.
- [ ] Mobile app's deep linking to `/live` and `/history` still resolves.
- [ ] `expo/lib/supabase.ts` unchanged.

### P.2 Web — legacy routes still work

- [ ] `/refine` renders and submits when entered via `VowFlowProvider`.
- [ ] `/stake` renders and completes.
- [ ] `/witness` renders and completes.
- [ ] `/seal` (existing legacy path) completes Stripe PaymentIntent flow.
- [ ] `/live` renders and shows most-urgent active vow.
- [ ] `/self-resolve` exists and functions.
- [ ] `/vow-kept` and `/vow-broken` render for direct navigation.
- [ ] `/history` loads with filter pills.
- [ ] `/settings` loads and shows all sections.
- [ ] `/auth/callback` correctly routes post-OAuth sessions.
- [ ] `/w/[token]` server component still resolves tokens and gates access.
- [ ] `/w/[token]/verdict` resolves tokens and records verdicts.
- [ ] `/outcome/[vowId]` public page renders without auth.

### P.3 Web — forbidden-modify files

- [ ] `web/src/components/ui.tsx` — unchanged.
- [ ] `web/src/components/auth-modal.tsx` — unchanged.
- [ ] `web/src/components/share-button.tsx` — unchanged.
- [ ] `web/src/providers/auth-provider.tsx` — unchanged.
- [ ] `web/src/lib/supabase.ts` — unchanged.
- [ ] `web/src/lib/vow-logic.ts` — unchanged.
- [ ] `web/src/middleware.ts` — only adds new route matchers; no existing matcher changed.
- [ ] `web/src/app/layout.tsx` — only adds font imports + global token wiring; no existing provider reordered.
- [ ] `web/src/app/globals.css` — only adds new CSS vars; no existing class removed or renamed.

### P.4 Supabase

- [ ] Existing migrations untouched.
- [ ] New migrations append-only (no down-edits of existing tables).
- [ ] `create-payment-intent/index.ts` — unchanged.
- [ ] `send-sms/index.ts` — unchanged.
- [ ] `verdict-page/index.ts` — unchanged.
- [ ] RLS policies on `users` and `vows` tables verified identical to pre-change state (diff policies in SQL).

### P.5 API contracts

- [ ] `seal-vow` Edge Function request/response shape unchanged for existing callers.
- [ ] `submit-verdict` Edge Function contract unchanged.
- [ ] `accept-witness` contract unchanged.
- [ ] `accept-challenge` contract unchanged.
- [ ] `void-vow` contract unchanged.
- [ ] `cron-runner` scheduled job signatures unchanged.

### P.6 Stripe flow

- [ ] Manual-capture PaymentIntent still created on create-payment-intent call.
- [ ] seal-vow captures the PI on activation.
- [ ] submit-verdict with kept → full refund via `refund-{vow_id}` idempotency key.
- [ ] submit-verdict with broken → no refund, money stays captured.
- [ ] void-vow → refund issued (if captured) or PI canceled (if uncaptured).
- [ ] `stripe_payment_intent_id` nullability preserved — $0 vows (legacy rows) skip all Stripe calls.

---

## F — Functional (every flow completes successfully)

### F.1 Ceremony

- [ ] First-time user on `/` sees ceremony screen 1 automatically.
- [ ] Ceremony screen 2 auto-advances 3.2s after screen 1 settles.
- [ ] Tap-anywhere advances screen 1 → 2.
- [ ] Skip button only clickable after 600ms.
- [ ] "Begin →" CTA on screen 2 sets `uv_ceremony_seen=1` and reveals landing.
- [ ] Second visit (localStorage flag set) skips ceremony entirely, lands on `/` marketing.
- [ ] Incognito session shows ceremony again.
- [ ] User arriving via `/w/[token]` never sees ceremony.
- [ ] User arriving via `/c/[token]` never sees ceremony.

### F.2 Landing

- [ ] "UNBREAKABLE VOW" logo wordmark renders top-left with gold diamond mark.
- [ ] Hero L1 "You say a lot." renders in `--text` regular serif.
- [ ] Hero L2 "*This time vow it.*" renders in `--gold` italic serif, same display size.
- [ ] Subhead "Put $$ on a goal. A friend decides if you pulled it off." renders — `$$` literal glyphs, not substituted.
- [ ] "THIS WEEK" label renders uppercase tracking in `--text-faint` caption style.
- [ ] Green `--success` dot + "Live" label render on right of feed header; dot pulses (unless reduced-motion).
- [ ] Static live feed renders 5 rows with vow text left + gold amount right, hairline dividers between.
- [ ] Feed rows are non-tappable (no hover state, no click handler, no cursor:pointer).
- [ ] Feed row texts match exactly: "Gym 3x this week / $50", "Out of bed by 8am, 7 days / $10", "No alcohol, 2 weeks / $25", "No texting my ex, 30 days / $75", "Delete TikTok for a week / $25".
- [ ] Primary CTA "Make your vow →" routes to `/create`.
- [ ] Secondary CTA "Dare a friend →" routes to `/cast` (auth-gated — unauth triggers sign-in first).
- [ ] No "I'm here to judge someone" link exists anywhere on the page.
- [ ] No 3-card desktop explainer renders (removed).
- [ ] No footer CTA band (removed).
- [ ] Desktop scales up hero + feed in single column, max-width 480px; does not split into two columns.
- [ ] Authenticated user with any non-void vow hitting `/` redirects to `/dashboard` after mount (no marketing flash).

### F.3 `/create` step 1 — vow input

- [ ] Placeholder "I will…" shows on empty.
- [ ] Typing clears placeholder.
- [ ] Vague detector triggers on < 4 words or matches vague terms.
- [ ] Suggestion chips populate input when tapped.
- [ ] "Continue →" disabled when empty or < 10 chars.
- [ ] "Continue →" enables when valid.
- [ ] "Continue →" routes to step 2 (by-when sheet may intercept first).

### F.4 `/create` step 1.5 — by-when sheet

- [ ] Sheet opens on "Set deadline →" chip.
- [ ] Sheet opens on deadline-detector trigger.
- [ ] 5 radio options render.
- [ ] "Pick a date…" opens native date+time picker.
- [ ] Custom date < 1h away shows error.
- [ ] Custom date > 90d shows error.
- [ ] "Set deadline" saves selection, sheet dismisses, input updates.
- [ ] Swipe-down dismisses without saving.

### F.5 `/create` step 2 — witness

- [ ] Name input accepts text; blocks < 2 chars on Continue.
- [ ] Recent witnesses section renders for users with prior vows; hidden for new users.
- [ ] Chip tap prefills input.
- [ ] Phone disclosure link expands; expand is instant (no jump).
- [ ] Phone validator accepts international format.
- [ ] Phone equal to maker's own number shows error.
- [ ] "Continue →" routes to step 3.

### F.6 `/create` step 3 — stakes

- [ ] $10/$25/$50/$100 pills select one at a time.
- [ ] Default selected is $50.
- [ ] "Other amount →" expands custom input.
- [ ] Custom < $10 shows error.
- [ ] Custom > $500 shows error.
- [ ] "If broken" row tappable → opens step 3.5 sheet.

### F.7 `/create` step 3.5 — if-broken expanded

- [ ] Two columns render side-by-side on desktop, stacked on mobile.
- [ ] Charity radio cards select one at a time.
- [ ] Anti-cause radio cards select one at a time.
- [ ] Cross-column selection toggles correctly (only one selected total).
- [ ] Anti-cause selection shows amber warning row.
- [ ] "Lock it in →" saves and dismisses.
- [ ] Back chevron preserves previous selection.

### F.8 `/seal` — auth

- [ ] Phone input accepts international format.
- [ ] "Send code" triggers Twilio OTP send.
- [ ] OTP input accepts 6-digit code.
- [ ] Wrong OTP shows error, input stays.
- [ ] Correct OTP creates session, advances to payment.
- [ ] "Continue with Google" OAuth flow completes.
- [ ] "Continue with email" magic link flow completes.
- [ ] Already-authenticated user skips auth section entirely.

### F.9 `/seal` — payment

- [ ] Apple Pay button renders on supporting devices.
- [ ] Apple Pay completes payment.
- [ ] Card form renders via Stripe Elements.
- [ ] Invalid card shows inline error.
- [ ] Valid card completes PaymentIntent.
- [ ] "Seal your vow" disabled until auth + payment ready.
- [ ] Tapping "Seal your vow" captures PI, creates vow record, advances to `/sent`.

### F.10 `/sent` — share

- [ ] Screen renders with maker's vow + witness name.
- [ ] "Send to {witness_first} →" triggers Web Share API on mobile.
- [ ] Desktop (no Web Share) falls back to copy-to-clipboard with toast.
- [ ] "Copy link" copies correct URL.
- [ ] "Text it myself" opens `sms:` URL with pre-filled body.
- [ ] "Not now" routes to `/vow/[id]`.
- [ ] Post-share routes to `/vow/[id]`.

### F.11 `/dashboard`

- [ ] Header greeting uses maker's first name.
- [ ] Subgreeting counts correctly (0/1/n vows).
- [ ] "+ New vow" routes to `/create`.
- [ ] Sections appear in urgency order and hide when empty.
- [ ] Each vow row is tappable → `/vow/[id]`.
- [ ] "See all past vows →" routes to `/history`.
- [ ] Empty state (zero vows ever) shows with CTA.

### F.12 `/vow/[id]` — all phases render

- [ ] witness_pending (< 48h) renders correctly.
- [ ] witness_pending (≥ 48h) shows nudge CTA + different judge link.
- [ ] active (> 24h) renders countdown.
- [ ] active (< 24h) renders amber countdown.
- [ ] active (< 6h) renders red countdown.
- [ ] awaiting_verdict renders "{witness} deciding" state.
- [ ] awaiting_verdict (> 48h waiting) shows "Resolve yourself →" link.
- [ ] kept phase renders KEPT badge + refund note.
- [ ] broken phase renders BROKEN badge + cause destination.
- [ ] voided phase renders VOIDED badge + refund note.
- [ ] Check-in button writes audit event, toast "Logged".
- [ ] Void modal opens, confirms, triggers void-vow Edge Function.
- [ ] Timeline renders all audit events in order with correct labels.

### F.13 `/self-resolve`

- [ ] Oath checkbox required to enable verdict buttons.
- [ ] Kept confirmation modal shows.
- [ ] Broken confirmation modal shows.
- [ ] Confirmation submits verdict via `submit-verdict` Edge Function (with self-resolve marker).
- [ ] Post-submit routes to `/vow-kept` or `/vow-broken`.

### F.14 `/vow-kept`

- [ ] Moment renders with gold "Kept." and sub.
- [ ] "Share this" opens share sheet.
- [ ] "+ New vow" routes to `/create`.
- [ ] "See your certificate →" routes to `/certificate/[vowId]`.

### F.15 `/vow-broken`

- [ ] Charity variant renders correct cause.
- [ ] Anti-cause variant renders anti-cause copy.
- [ ] "+ Try again" routes to `/create`.
- [ ] "Read your vow →" scrolls to original text.

### F.16 `/history`

- [ ] All/Kept/Broken/Voided filters filter correctly.
- [ ] Counts row shows accurate numbers.
- [ ] Each row links to `/vow/[id]`.
- [ ] Empty filtered state shows.
- [ ] Empty no-history state shows with CTA.

### F.17 `/cast` — dare

- [ ] 3-step flow renders with correct copy per §13.
- [ ] Dare share message uses correct template.
- [ ] Challenge target receives SMS with correct body.

### F.18 `/c/[token]`

- [ ] Page loads with correct maker/vow/stake.
- [ ] "I'm in →" routes through signup when unauth.
- [ ] "Accept" records acceptance via `accept-challenge` Edge Function.
- [ ] Post-accept routes to `/vow/[id]`.
- [ ] "Decline" records decline; shows declined state.

### F.19 `/w/[token]`

- [ ] Page loads with correct maker/vow/stake/cause.
- [ ] "I'll judge →" records acceptance via `accept-witness` Edge Function.
- [ ] Post-accept shows "You're on it." state.
- [ ] "I can't" opens decline modal; confirm records decline.
- [ ] Post-decline shows "Stepped back." state.

### F.20 `/w/[token]/verdict`

- [ ] Oath checkbox required.
- [ ] "Kept." submits verdict kept, refund triggers.
- [ ] "Broken." confirmation modal shows; confirm submits broken.
- [ ] Post-submit shows correct confirmation copy.

### F.21 `/certificate/[vowId]` and `/outcome/[vowId]`

- [ ] Public page loads without auth.
- [ ] Certificate renders with correct fields.
- [ ] Outcome page shows kept/broken variant correctly.
- [ ] Download as image works (cert only).

### F.22 `/settings`

- [ ] All sections render.
- [ ] Name save works.
- [ ] Notification toggles persist.
- [ ] Add card flow works.
- [ ] Remove card works.
- [ ] Sign out logs user out.
- [ ] Delete account blocked when active vows exist.

### F.23 Navigation chrome

- [ ] Hamburger menu opens with all items.
- [ ] "Group Challenges" is disabled + COMING SOON badge.
- [ ] All menu links route correctly.
- [ ] Sign out clears session and routes to `/`.

---

## C — Copy (every string matches copy-spec.md)

### C.1 Global

- [ ] App name "Unbreakable Vow" rendered everywhere (never "UV", "The Vow App").
- [ ] No forbidden words render anywhere (see §28 of copy-spec): "unleash", "journey", "empower", "oops", etc.
- [ ] No exclamation points except in narrow cases per copy-spec.
- [ ] No em-dashes in rendered strings.
- [ ] No emojis in product chrome.
- [ ] "5-10 business days" phrase consistent everywhere refunds mentioned.

### C.2 Ceremony

- [ ] Screen 1 three lines exact match.
- [ ] Screen 2 italic "*free.*" uses period not exclamation.
- [ ] Subtitle copy exact match.
- [ ] CTA "Begin →".

### C.3 Landing

- [ ] Logo wordmark "UNBREAKABLE VOW" uppercase.
- [ ] Hero L1 "You say a lot." — serif, regular, `--text`.
- [ ] Hero L2 "*This time vow it.*" — serif italic, `--gold`, period inside italic.
- [ ] Subhead "Put $$ on a goal. A friend decides if you pulled it off." — `$$` literal.
- [ ] Feed label "THIS WEEK" uppercase tracking.
- [ ] Live indicator "Live" alongside green dot.
- [ ] Primary CTA "Make your vow →".
- [ ] Secondary CTA "Dare a friend →".

### C.4 `/create`

- [ ] Step 1 title "What are you swearing to?"
- [ ] Step 1 subtitle exact match.
- [ ] Vague helper copy matches.
- [ ] Step 2 title "Who's your judge?"
- [ ] Step 3 title "What's on the line?"
- [ ] Step 3 footer "You keep the money if you keep the vow."
- [ ] "If you break this" row copy exact.

### C.5 `/seal`

- [ ] Fine print "By sealing, you agree to the Terms. Your {amount} is charged now and held until {by_when}." renders with correct token substitution.
- [ ] Seal button reads "Seal your vow" (not "Seal", not "Complete").
- [ ] Pending state reads "Sealing…".

### C.6 `/sent`

- [ ] Eyebrow "SEALED" uppercase.
- [ ] Headline "Now send it."
- [ ] Sub "{witness_first} doesn't know yet." renders with first-name-only token.
- [ ] Primary CTA includes witness first name.
- [ ] Fine print "The vow isn't real until they see it."

### C.7 `/dashboard`

- [ ] Greeting format "{name}." with period, no "Hey" or "Hi".
- [ ] Subgreeting counts correctly per 0/1/n phrasing.
- [ ] Section titles exact match copy-spec.
- [ ] Empty state "No promises yet."

### C.8 `/vow/[id]` phase labels

- [ ] "Awaiting verdict" label renders for `awaiting_verdict` maker view.
- [ ] "Your call" label renders for `awaiting_verdict` witness view.
- [ ] KEPT / BROKEN / VOIDED badge labels all caps.
- [ ] "Check in" button label exact.
- [ ] "Void this vow" link label exact.

### C.9 SMS templates

- [ ] Witness invite body matches §19.1.
- [ ] Verdict request at deadline matches §19.7.
- [ ] Challenge invite body matches §19.12.
- [ ] Auto-resolve notices match §19.10–11.
- [ ] No SMS template adds "Reply STOP" (Twilio auto-appends).

### C.10 Share templates

- [ ] Web Share API title/text/url match §20.1.
- [ ] Clipboard fallback matches §20.2.
- [ ] Kept share template matches §20.4.
- [ ] Broken share template matches §20.5.

### C.11 Status labels

- [ ] Pill label matches table in §1.5 of copy-spec for each status.
- [ ] Dashboard row labels match compressed format.

### C.12 Legal

- [ ] Footer: "© 2026 Unbreakable Vow" (update year token).
- [ ] "Privacy" and "Terms" link labels (never "Privacy Policy", "Terms of Service").
- [ ] No contact email in footer.

---

## V — Visual (matches design-system.md)

### V.1 Colors

- [ ] `--bg: #0a0907` background everywhere (no white backgrounds except Stripe iframe).
- [ ] `--gold: #d4a84a` used for primary brand moments.
- [ ] `--success: #4ade80` used for kept state.
- [ ] `--danger: #f87171` used for broken state.
- [ ] Status colors (amber, blue, green, red, muted) consistent per §1.5 table.
- [ ] No rogue hex values — everything via tokens.

### V.2 Typography

- [ ] Playfair Display loaded via `next/font/google` with `display: swap`.
- [ ] Inter loaded similarly.
- [ ] No weight above 600 anywhere.
- [ ] Italic used only for emphasis moments (italic gold in ceremony, vow display, etc.).
- [ ] No ALL CAPS except status labels and caption eyebrows.
- [ ] 13-step scale respected — no off-scale sizes.
- [ ] No `font-bold` in JSX — use `font-semibold` max.

### V.3 Spacing

- [ ] 8px grid respected — no `padding: 7px` or similar.
- [ ] Tokens space-1 through space-10 used consistently.

### V.4 Radius

- [ ] Buttons use `--radius-md`.
- [ ] Cards use `--radius-lg`.
- [ ] Pills use `--radius-pill`.
- [ ] Modals use `--radius-xl`.

### V.5 Shadows

- [ ] Gold glow only on primary CTAs and sealed/active states.
- [ ] No `box-shadow: 0 2px 8px rgba(0,0,0,0.1)` generic — always via tokens.

### V.6 Animations

- [ ] Ceremony fadeIn staggers (0, 600, 1200ms).
- [ ] Seal-sweep animation runs on seal button tap.
- [ ] Verdict flip animation runs on verdict submit.
- [ ] Gold-dot-pulse on active status.
- [ ] Reduced-motion media query disables all non-essential motion.

### V.7 Icons

- [ ] Consistent icon library (Lucide).
- [ ] All icons sized via tokens (16, 20, 24).
- [ ] Back chevron, share, copy, close icons all consistent across screens.

### V.8 Components

- [ ] All 24 components from design-system.md render per spec.
- [ ] No ad-hoc button styles outside PrimaryButton / SecondaryButton / TextButton.
- [ ] Gold-seal-badge, vow-display, status-pill, oath-checkbox — unified implementations.

### V.9 Layout

- [ ] Mobile: single column, max 440px content width, 24px horizontal padding.
- [ ] Desktop: hero 3-card explainer, dashboard 3-col grid optional.
- [ ] Safe-area-inset respected on mobile (notch).
- [ ] Scroll behavior smooth, no layout shift on nav.

---

## S — State handling (every state transition renders correctly)

### S.1 Vow state machine

- [ ] draft → sealed transition renders correctly.
- [ ] sealed → active transition (after witness accepts) renders correctly.
- [ ] active → awaiting_verdict (after ends_at) renders correctly.
- [ ] awaiting_verdict → kept renders correctly.
- [ ] awaiting_verdict → broken renders correctly.
- [ ] active → voided renders correctly.
- [ ] awaiting_verdict → voided renders correctly (maker self-voids).
- [ ] awaiting_verdict → kept via auto-resolve (72h) renders correctly.

### S.2 Challenge state machine

- [ ] challenge_status pending → accepted renders.
- [ ] challenge_status pending → declined → vow auto-voided renders.

### S.3 Witness sub-states

- [ ] witness_accepted_at null + witness_declined false = pending.
- [ ] witness_accepted_at set = accepted.
- [ ] witness_declined true = declined.
- [ ] Witness state transitions reflected in `/vow/[id]` phase.

### S.4 Countdown states

- [ ] Live countdown updates every second on `/vow/[id]` active phase.
- [ ] Countdown color switches at 24h (gold → amber) and 6h (amber → red).
- [ ] Countdown "0:00:00" triggers status transition to awaiting_verdict.

### S.5 Loading states

- [ ] Dashboard shows skeleton rows during load (not spinner).
- [ ] `/vow/[id]` shows skeleton during load.
- [ ] `/history` shows skeleton rows during load.
- [ ] Button pending states use spinner + label.

---

## A — Accessibility

### A.1 Keyboard navigation

- [ ] Tab order logical on every page.
- [ ] All CTAs reachable by keyboard.
- [ ] Escape closes modals and bottom sheets.
- [ ] Enter submits forms.
- [ ] Space toggles checkboxes.
- [ ] Focus ring visible on all interactive elements (gold outline).

### A.2 Screen reader

- [ ] Every icon without visible text has `aria-label` per copy-spec §27.
- [ ] Decorative images have `aria-hidden="true"`.
- [ ] Live region announcements for countdown updates and toasts.
- [ ] Form fields have associated `<label>` or `aria-labelledby`.
- [ ] Error messages use `aria-describedby`.
- [ ] Status pills announce their state.

### A.3 Contrast

- [ ] All text meets WCAG AA (4.5:1 for normal, 3:1 for large).
- [ ] `--text` on `--bg` = verified ratio.
- [ ] `--text-muted` on `--bg` = verified ratio.
- [ ] `--gold` on `--bg` = verified ratio.
- [ ] Status pill colors meet contrast with their backgrounds.

### A.4 Reduced motion

- [ ] `prefers-reduced-motion: reduce` disables ceremony fade staggers.
- [ ] Disables seal-sweep animation.
- [ ] Disables verdict flip animation.
- [ ] Disables gold-dot-pulse.
- [ ] Countdown updates still function but without smoothing.

### A.5 Touch targets

- [ ] All tap targets ≥ 44×44px on mobile.
- [ ] Recent witness chips ≥ 44px tall.
- [ ] Amount pills ≥ 44px.
- [ ] Skip button on ceremony ≥ 44×44px.

### A.6 Form validation

- [ ] Errors shown inline, not color-only (icon + text).
- [ ] Errors announced to screen reader.
- [ ] Submit button state reflects validity.

---

## X — Cross-platform / cross-device

### X.1 Browsers

- [ ] Chrome desktop.
- [ ] Safari desktop.
- [ ] Firefox desktop.
- [ ] Safari iOS.
- [ ] Chrome Android.
- [ ] Edge desktop (if covered).

### X.2 Viewport sizes

- [ ] 375px width (iPhone SE).
- [ ] 390px width (iPhone 14).
- [ ] 768px width (iPad).
- [ ] 1024px width (laptop).
- [ ] 1440px width (desktop).

### X.3 Dark/light

- [ ] Dark-mode only. `prefers-color-scheme: light` ignored. No light-mode flash.

### X.4 Web Share API

- [ ] Mobile Safari: Web Share API works.
- [ ] Mobile Chrome: Web Share API works.
- [ ] Desktop (no Web Share): clipboard fallback with toast.

### X.5 sms: URL scheme

- [ ] iOS: opens Messages with body.
- [ ] Android Chrome: opens default SMS app.
- [ ] Desktop: either opens macOS Messages or shows no-op gracefully.

### X.6 Apple Pay

- [ ] iOS Safari with saved card: Apple Pay button shows.
- [ ] macOS Safari with paired iPhone: Apple Pay button shows.
- [ ] Other browsers: button hidden, card form primary.

### X.7 Expo dashboard

- [ ] `/dashboard` equivalent exists in Expo.
- [ ] Routes to existing Expo screens correctly from dashboard rows.
- [ ] Does not modify `vow-ui.tsx`.

---

## E — Edge cases

### E.1 Token/link edge cases

- [ ] `/w/[token]` with invalid token → "This link doesn't work."
- [ ] `/w/[token]` with expired invite → "This invite expired."
- [ ] `/w/[token]` for voided vow → "This vow was called off."
- [ ] `/w/[token]` for already-accepted → "You're already on it."
- [ ] `/w/[token]` for already-declined → "You said no to this one."
- [ ] `/w/[token]` for resolved (kept) → "It's done. They kept it."
- [ ] `/w/[token]` for resolved (broken) → "It's done. They broke it."
- [ ] `/w/[token]` for auto-resolved → "It auto-resolved."
- [ ] `/w/[token]/verdict` before deadline → "Not yet."
- [ ] `/w/[token]/verdict` after already resolved → "Already called."
- [ ] `/c/[token]` with invalid/expired/revoked/already-accepted states render per §14.4.

### E.2 Network/offline

- [ ] Offline banner shows on navigator.onLine=false.
- [ ] Create flow persists draft locally; resumes on reconnect.
- [ ] Seal retry handled gracefully after network blip.

### E.3 Payment failures

- [ ] Stripe declined card → inline error, no vow row created.
- [ ] Stripe 3DS challenge completes end-to-end.
- [ ] Stripe webhook fires post-payment; seal-vow picks up.
- [ ] Refund failure → `refund_failed` flag set, cron retries.
- [ ] User sees "Refund failed" banner with support CTA in `/vow/[id]` if flagged.

### E.4 SMS failures

- [ ] Twilio failure on witness invite → vow still seals, `sms_failed` flagged, maker sees "Couldn't text them" banner with retry.
- [ ] Unsubscribed recipient → specific error per copy-spec §25.4.
- [ ] Cron retry re-sends SMS; audit event logged.

### E.5 Auto-resolve

- [ ] 72h after awaiting_verdict with no verdict → cron auto-resolves kept.
- [ ] Maker receives SMS per §19.10.
- [ ] Witness receives SMS per §19.11.
- [ ] `/vow/[id]` shows kept state with auto-resolve tag.

### E.6 Witness timeout

- [ ] > 48h since witness_invited with no response → `/vow/[id]` shows nudge CTA.
- [ ] Nudge re-sends SMS via `send-sms` with `sms_retried` audit event.
- [ ] "Continue on your honor →" link available for maker.

### E.7 Multiple open vows

- [ ] Dashboard handles 10+ open vows without breaking layout.
- [ ] All sections render correctly with high counts.

### E.8 Very long vow text

- [ ] 280-char vow truncates in dashboard rows.
- [ ] Full vow shows on `/vow/[id]` header.
- [ ] SMS templates handle long vow_text (use `{vow_text_short}` variant).
- [ ] Certificate page wraps long vow text gracefully.

### E.9 Deleted user

- [ ] Witness who deleted their account → vow shows "Pick a new judge" prompt.
- [ ] Maker who deleted their account → not allowed if active vows exist (blocked earlier).

### E.10 Concurrent verdicts

- [ ] Maker calls self-resolve while witness submits verdict → server deduplicates (first-write-wins).
- [ ] UI reconciles on next poll.

### E.11 Clock skew

- [ ] Countdown uses server time, not client time.
- [ ] Auto-resolve timer resilient to user machine time drift.

---

## T — Trust & Safety

### T.1 Content policy

- [ ] Profanity filter blocks extreme slurs on vow creation.
- [ ] Named public figures blocked on anti-cause (no specific names).
- [ ] Self-harm / violence vows blocked with clear rejection copy.
- [ ] Hate-speech target groups blocked.
- [ ] Review flag queue set up for borderline cases (manual review).

### T.2 Anti-cause safety (NRA + PETA named destinations)

- [ ] Anti-cause radio cards show exactly two options: "The NRA" (subline "National Rifle Association") and "PETA" (subline "People for the Ethical Treatment of Animals").
- [ ] No free-text / "Write your own" option in the anti-cause picker.
- [ ] No other named orgs, parties, or people appear as anti-cause destinations.
- [ ] On broken verdict with anti-cause destination, donation routes via Stripe to the org's public donation endpoint using their published 501(c)(3) or equivalent ID (NRA Foundation for NRA; PETA directly). Destination endpoint configured per-org in `supabase/functions/_shared/destinations.ts`.
- [ ] Anti-cause warning modal shows before commit with explicit copy naming the org and the amount.
- [ ] Anti-cause share/SMS/outcome templates name the org verbatim ("$50 went to The NRA") — this is the product's intentional mechanism, not a bug.
- [ ] Legal sign-off confirmed before launch: we route user-initiated donations, we are not affiliated with, endorsed by, or partnered with either org, and we disclose this in Terms.
- [ ] If either org's donation endpoint is unavailable at verdict time, retry 3× and fall back to escrow + manual delivery with maker notification.

### T.3 PII

- [ ] Witness phone never shown in public pages.
- [ ] Maker phone never shown publicly.
- [ ] Outcome/certificate pages show first name + last initial only.
- [ ] No full phone numbers in UI copy.

### T.4 SMS regulatory

- [ ] Twilio STOP reply handled → opt-out recorded.
- [ ] Re-subscribing honored (START keyword).
- [ ] Rate-limit SMS sends per recipient per hour.
- [ ] No SMS to recipients who opted out.

### T.5 Payment safety

- [ ] No trade execution, no automated transfers outside the stake flow.
- [ ] Refunds always via Stripe refund API with idempotency key `refund-{vow_id}`.
- [ ] Donations routed via qualified processor (Stripe Connect / donor-advised fund).

### T.6 Auth

- [ ] OTP rate-limited per phone number.
- [ ] Session tokens expire per Supabase default.
- [ ] Logout clears all cached data.
- [ ] Password-based auth not used (OTP / OAuth only).

---

## R — Regression (existing mobile + web behaviors unchanged)

### R.1 Mobile creation flow end-to-end

- [ ] Open Expo app → home screen shows.
- [ ] Tap "New vow" → existing flow loads (input screen).
- [ ] Refine → complete.
- [ ] Witness → complete.
- [ ] Stake → complete.
- [ ] Seal → PaymentIntent created, captured.
- [ ] Certificate → renders.
- [ ] Live → shows active vow.
- [ ] No visual regressions in `vow-ui.tsx`-rendered screens.

### R.2 Witness flow end-to-end (existing SMS)

- [ ] Witness receives SMS with `/w/[token]` link.
- [ ] Opens link → page renders.
- [ ] Accepts → status updates.
- [ ] Gets verdict request SMS.
- [ ] Verdict submits → status updates.

### R.3 Existing web routes

- [ ] `/refine` → `/stake` → `/witness` → `/seal` → `/sent` path works for legacy users.
- [ ] `/live` renders for existing users.
- [ ] `/history` existing filter works.
- [ ] `/settings` existing fields save.

### R.4 Database

- [ ] All existing rows in `users`, `vows`, `audit_events`, `sms_log`, `push_queue` render correctly post-migration.
- [ ] No RLS policy changes break access for existing users.
- [ ] New columns (if any) default-nullable or have safe defaults.

---

## M — Metrics & observability

### M.1 Analytics events

- [ ] `vow_created` fires on create flow start.
- [ ] `vow_sealed` fires on successful seal.
- [ ] `witness_accepted` fires on accept.
- [ ] `verdict_submitted` fires on verdict.
- [ ] `ceremony_seen` fires once.
- [ ] `dashboard_viewed` fires on dashboard mount.
- [ ] `share_triggered` fires on share button tap.
- [ ] Events include vow_id when applicable (not PII).

### M.2 Error logging

- [ ] Frontend errors captured to Sentry (or equivalent).
- [ ] Edge function errors logged with vow_id.
- [ ] Stripe webhook failures alert.
- [ ] SMS send failures logged.

### M.3 Performance

- [ ] `/` first paint < 1.5s on 4G simulation.
- [ ] `/dashboard` first paint < 2s.
- [ ] Largest Contentful Paint < 2.5s on hero.
- [ ] No layout shift (CLS < 0.1).
- [ ] Playfair/Inter fonts preload to avoid FOUT.

---

## Final gate checklist (before shipping)

- [ ] Every P item passes.
- [ ] Every F item passes.
- [ ] Copy sweep: every string in build matches copy-spec.md.
- [ ] Visual sweep: every token in build matches design-system.md.
- [ ] Accessibility audit: axe-core reports 0 errors.
- [ ] Stripe end-to-end test in Stripe test mode: PI → capture → refund.
- [ ] Twilio end-to-end test: SMS delivered to test number, STOP handled.
- [ ] Load test: dashboard with 50 vows renders in < 3s.
- [ ] Mobile Expo regression: full creation flow unchanged.
- [ ] Git: `design-upgrade` branch only, no commits to `main`.
- [ ] All 5 design-upgrade artifacts reviewed and signed off.

*End of QA checklist v1.0.*
