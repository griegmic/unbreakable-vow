# QA Test Plan

## Suite A: Regression (Existing Flows Must Not Break)

### A1: First-Time Web Creation
- [ ] Unauthenticated user sees home input at `/`
- [ ] Vow text → analyze → refine (if vague) or skip
- [ ] Refine: suggestions work, edit or keep original
- [ ] Witness: enter name + phone, or solo
- [ ] Stake: select amount, consequence, destination
- [ ] Seal: oath checkbox, auth modal, Stripe payment (test card 4242...)
- [ ] Seal completes → certificate page (was /sent, now /certificate)
- [ ] Witness SMS in sms_log
- [ ] Vow status = active in DB

### A2: Witness Flow
- [ ] `/w/[token]` renders vow details + maker name
- [ ] Accept → witness_accepted_at set, audit event logged
- [ ] Decline → witness_declined set, audit event logged
- [ ] `/w/[token]/verdict` renders after deadline
- [ ] Verdict "kept" → refund, status=kept, audit events
- [ ] Verdict "broken" → status=broken, audit events
- [ ] `/outcome/[vowId]` public page renders

### A3: Self-Resolve
- [ ] Solo vow reaches deadline → `/self-resolve` accessible
- [ ] Submit kept → refund, status=kept
- [ ] Submit broken → status=broken

### A4: Cron (Existing Tasks)
- [ ] Witness reminder at 24h (check sms_log)
- [ ] Warmup SMS 12-36h before deadline
- [ ] Verdict request at deadline → status=awaiting_verdict
- [ ] Auto-resolve at 72h → status=kept, refund
- [ ] Push queue processes

### A5: Expo App (Existing Screens)
- [ ] App launches, no crash
- [ ] Home input works
- [ ] Refine, witness, stake, seal flows work
- [ ] Certificate renders
- [ ] Live screen shows vow
- [ ] Settings, history accessible

## Suite B: New Web Features

### B1: Dashboard
- [ ] Auth redirect: `/` → `/dashboard` when logged in
- [ ] Unauth: `/` shows original home
- [ ] Stats: active count, kept count, streak
- [ ] Needs Attention: verdict-due vows + incoming challenges
- [ ] Active: running vows sorted by deadline
- [ ] Witnessing: vows where user is witness
- [ ] Recent: last 5 completed
- [ ] Empty state for new users
- [ ] Sections collapse when empty
- [ ] Cards: text, status dot, progress bar, countdown, stake
- [ ] Progress colors: gold→amber→red
- [ ] Countdown updates every 60s
- [ ] Tap card → /vow/[id]
- [ ] Responsive at 375px

### B2: Power-User Creation
- [ ] `/create` renders single-page form
- [ ] "Me"/"Someone else" toggle
- [ ] Recent witnesses from DB (deduplicated)
- [ ] New person: inline name + phone
- [ ] $0 chip hides consequence
- [ ] Deadline presets correct
- [ ] Inline suggestion for vague vows
- [ ] Preview updates real-time
- [ ] Oath required
- [ ] $0 seal: no Stripe, redirect to dashboard
- [ ] Staked seal: Stripe sheet, redirect to certificate
- [ ] Challenge: correct vow_type + target fields

### B3: $0 Vows End-to-End
- [ ] Create $0 + witness → seal without Stripe
- [ ] stripe_payment_intent_id is null
- [ ] SMS says "accountability only"
- [ ] Witness accepts, submits verdict
- [ ] Kept: no refund, "Word honored"
- [ ] Broken: no capture, "Record stands"
- [ ] Auto-resolve: no refund
- [ ] Void: no refund, status=voided
- [ ] Certificate shows "no stake"

### B4: Challenge Flow
- [ ] Create with "Someone else" toggle
- [ ] vow_type='challenge', challenge_invite_token set
- [ ] Challenge SMS sent (check sms_log)
- [ ] `/c/[token]` renders details
- [ ] Accept → challenge_status=accepted, audit event
- [ ] Decline → voided, refund if staked
- [ ] Maker dashboard reflects status
- [ ] Target dashboard shows (if logged in)
- [ ] At deadline: maker submits verdict
- [ ] Resolution works normally
- [ ] $0 challenge works
- [ ] Staked challenge: refund on decline
- [ ] OG metadata correct

### B5: Audit Trail + Timeline
- [ ] Seal → audit: vow_sealed + witness_invited
- [ ] Accept witness → audit: witness_accepted
- [ ] Challenge accept → audit: challenge_accepted
- [ ] Check-in → audit: check_in with metadata
- [ ] Verdict → audit: verdict_submitted
- [ ] Void → audit: vow_voided
- [ ] Auto-resolve → audit: auto_resolved
- [ ] Refund → audit: refund_issued or refund_failed
- [ ] Timeline renders chronologically on vow detail
- [ ] Timeline visible on witness page
- [ ] Timeline visible on challenge page
- [ ] Future verdict day marker shown

### B6: Check-Ins
- [ ] 3 buttons on active vow detail (maker only)
- [ ] Tap → audit event inserted
- [ ] 4-hour cooldown enforced
- [ ] Dashboard card shows last check-in
- [ ] Witness sees check-in on timeline

### B7: Certificate
- [ ] `/certificate/[vowId]` renders dark-and-gold
- [ ] Shows vow, witness, stake, seal date
- [ ] Resolved: verdict badge
- [ ] Share works (Web Share + clipboard)
- [ ] OG metadata for link previews
- [ ] Staked seal → certificate redirect
- [ ] $0 seal → dashboard redirect

### B8: Verdict UX
- [ ] Tap verdict → 3s undo toast
- [ ] Undo within 3s → not submitted
- [ ] Toast expires → submitted normally
- [ ] Challenge-back CTA after verdict

### B9: Void/Cancel
- [ ] Button on active vow detail (maker only)
- [ ] Hidden for kept/broken/voided
- [ ] Hidden for non-makers
- [ ] Confirm → voided, refund if staked
- [ ] Dashboard shows voided in Recent

### B10: Cron Hardening
- [ ] SMS retry works, flag cleared
- [ ] SMS retry stops after 3 attempts
- [ ] Refund retry works, flag cleared
- [ ] Existing cron tasks still work

## Suite C: Cross-Platform

### C1: Data Consistency
- [ ] Create on web → Expo dashboard shows it
- [ ] Create on Expo → web dashboard shows it
- [ ] Accept witness on web → Expo reflects
- [ ] Check in on Expo → web timeline shows it
- [ ] Verdict on web → Expo shows resolution
- [ ] Void on Expo → web shows voided

### C2: Concurrent Vows
- [ ] 3+ vows display simultaneously
- [ ] Independent countdowns
- [ ] Independent witness statuses
- [ ] Resolving one doesn't affect others
- [ ] 10 vows render without performance issues

### C3: Edge Cases
- [ ] User is maker AND witness on different vows
- [ ] Challenge received while having active vows
- [ ] Two challenges to same person
- [ ] Past deadline → immediately awaiting_verdict
- [ ] User signs up after witness SMS → witness_user_id backfilled
- [ ] User signs up after challenge SMS → target_user_id backfilled

### C4: Mobile Responsive
- [ ] Dashboard at 375px, 390px, 428px
- [ ] Create page at 375px
- [ ] Vow detail at 375px
- [ ] Certificate at 375px
- [ ] Challenge accept at 375px
- [ ] Touch targets ≥ 44px
- [ ] No horizontal overflow

### C5: Error States
- [ ] Network failure during seal → error, no orphan
- [ ] Card declined → error, retry possible
- [ ] Invalid witness token → 404
- [ ] Invalid challenge token → 404
- [ ] Expired session → auth modal
- [ ] Double-tap seal → idempotent
- [ ] Double-tap verdict → idempotent
- [ ] Double-tap accept → idempotent
