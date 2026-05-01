# V1 To V2 Agentic Builder Handoff

## Purpose

This file summarizes every meaningful change between the original native-perfect mock file and the v2 witness-options mock file.

Use this when an agentic builder is already implementing v1 and needs to migrate cleanly to v2 without restarting the whole build.

## Source Files

- V1 rollback baseline:
  - `design-alignment/native-perfect/project-perfect-final-build-mocks.html`
- V2 current working mock:
  - `design-alignment/native-perfect/project-perfect-final-build-mocks-v2-witness-options.html`

V2 is the current design direction for implementation unless Joey explicitly says to revert to v1.

Do not overwrite the v1 file. It remains the rollback baseline.

## High-Level Summary

V2 keeps the same overall maker flow order:

`Vow -> Stake -> Witness -> Auth -> Payment -> Sealed`

The biggest changes are all around witness selection, contact syncing, post-seal sharing, and quick-vow optimization.

V2 does **not** reorder witness before stake. That was explored and rejected. The witness remains step 3.

The purpose of V2 is to make the witness path clearer and more conversion-friendly while preserving the approved v1 visual language.

## What Stayed The Same

These v1 screens remain structurally the same and should not be redesigned:

- `Approved 01. Vow Only, Quiet Start Chips`
- `Approved 02. Stake First, Selectable Verdict`
- `Approved 02b. Verdict Date Sheet`
- `Approved 02c. Change Destination Sheet`
- `Approved 04. Phone First`
- `Approved 04b. Enter Code`
- `Approved 04c. Name If Missing`
- `Approved 05b. Stripe / Apple Pay Confirm`
- `Approved 13. Dashboard Command Center`
- `Approved 13B. Project Perfect Menu`
- `Approved 14. Judging Dashboard`
- `Approved 15. Dares You Sent`
- `Approved 17. Witness Accepted`
- `Approved 18. Witness Mid-Vow`
- `Approved 19. Witness Almost Up`
- `Approved 20. Witness Time’s Up`

Some of these screens may have small adjacent routing or copy implications from v2, but their layouts should not be reworked.

## Screen Inventory Diff

### V1 Screens

V1 has 32 labeled phone mocks:

1. `Approved 01. Vow Only, Quiet Start Chips`
2. `Approved 02. Stake First, Selectable Verdict`
3. `Approved 02b. Verdict Date Sheet`
4. `Approved 02c. Change Destination Sheet`
5. `Approved 03. Choose Witness`
6. `Approved 03b. Pick Witness Sheet`
7. `Approved 03c. Witness Selected`
8. `Approved 04. Phone First`
9. `Approved 04b. Enter Code`
10. `Approved 04c. Name If Missing`
11. `Approved 05. Add Payment`
12. `Approved 05b. Stripe / Apple Pay Confirm`
13. `Approved 06. Sealed Moment`
14. `Approved 07. Send Witness Invite`
15. `Approved 08. Waiting Witness Detail`
16. `Approved 07B. No Witness Picked`
17. `Approved 08B. Returned After Messages`
18. `Approved 08C. Shared Link, No Name`
19. `Approved 09. Joe Accepted`
20. `Approved 10. Mid-Vow Active`
21. `Approved 11. Almost Verdict Time`
22. `Approved 12. Verdict Due, Waiting`
23. `Approved 13. Dashboard Command Center`
24. `Approved 13B. Project Perfect Menu`
25. `Approved 14. Judging Dashboard`
26. `Approved 15. Dares You Sent`
27. `Approved 16. Make A Vow Fast Path`
28. `Approved 16B. Quick Vow Add Payment`
29. `Approved 17. Witness Accepted`
30. `Approved 18. Witness Mid-Vow`
31. `Approved 19. Witness Almost Up`
32. `Approved 20. Witness Time’s Up`

### V2 Screens

V2 has 39 labeled phone mocks:

1. `Approved 01. Vow Only, Quiet Start Chips`
2. `Approved 02. Stake First, Selectable Verdict`
3. `Approved 02b. Verdict Date Sheet`
4. `Approved 02c. Change Destination Sheet`
5. `V2 03. Choose Witness / Decide Later`
6. `V2 03a. Decide Later Confirmation`
7. `Approved 03b. Pick Witness Sheet`
8. `V2 03b1. iOS Contacts Permission`
9. `V2 03b+. First-Time Contacts Synced`
10. `V2 03c. Witness Selected / Draft Ask`
11. `V2 W1. Witness Invite`
12. `V2 03e. Draft Witness Accepted`
13. `Approved 04. Phone First`
14. `Approved 04b. Enter Code`
15. `Approved 04c. Name If Missing`
16. `V2 04d. Witnessless Checkpoint`
17. `Approved 05. Add Payment`
18. `Approved 05b. Stripe / Apple Pay Confirm`
19. `Approved 06. Sealed Moment`
20. `Approved 07. Send Witness Invite`
21. `Approved 08. Waiting Witness Detail`
22. `Approved 07B. No Witness Picked`
23. `Approved 08B. Returned After Messages`
24. `Approved 08C. Shared Link, No Name`
25. `Approved 09. Joe Accepted`
26. `Approved 10. Mid-Vow Active`
27. `Approved 11. Almost Verdict Time`
28. `Approved 12. Verdict Due, Waiting`
29. `Approved 13. Dashboard Command Center`
30. `Approved 13B. Project Perfect Menu`
31. `Approved 14. Judging Dashboard`
32. `Approved 15. Dares You Sent`
33. `Approved 16. Make A Vow Fast Path`
34. `Approved 16B. Quick Vow Add Payment Fallback`
35. `Approved 17. Witness Accepted`
36. `Approved 18. Witness Mid-Vow`
37. `Approved 19. Witness Almost Up`
38. `Approved 20. Witness Time’s Up`

The count appears as 38 in the list above because `Approved 05b` is a Stripe reference modal and not a separate route. Treat it as a payment-system visual reference, not a fully custom-rendered native screen.

## Core V2 Product Decisions

### 1. Witness Remains Step 3

The explored witness-first ordering is not adopted.

Implementation should keep:

`01 Vow -> 02 Stake -> 03 Witness -> 04 Auth -> 05 Payment -> 06 Sealed`

### 2. Add `Decide Later`

V1 had a visible `Go solo`-like escape route on the witness screen.

V2 replaces that with a clearer distinction:

- `Add a witness` = primary action.
- `Share link` = secondary manual-share/copy path.
- `Decide later` = defers witness choice without declaring the vow solo.

Important: `Decide later` is not the same as `Go solo`.

### 3. Remove Casual `Go Solo`

Do not show casual `Go solo` language on the main witness step.

If solo behavior is needed later, it should happen behind a confirmation or checkpoint, not as an easy default action.

### 4. Add Witnessless Checkpoint Before Payment

If the user tapped `Decide later`, show a checkpoint before payment:

Title:

`Want someone holding you to this?`

Body:

`You can pick one now or pick after you seal.`

Primary:

`Add a witness`

Secondary:

`Seal vow`

Behavior:

- `Add a witness` returns to witness selection.
- `Seal vow` continues to auth/payment.
- Post-seal state must use generic witness/share-link copy, not named-witness copy.

### 5. Optional Pre-Seal Witness Ask

When a witness has been selected, V2 adds a quiet early ask:

`Ask Joe now ->`

This is not the default path. It is a quiet affordance for high-intent users who want to invite the witness before sealing.

Important witness-facing language:

- Do not call this a `draft` to the recipient.
- The witness should understand the product:
  - someone made a vow
  - money is on the line
  - they will keep the maker honest
  - they later decide kept or broken

### 6. First-Time Contact Sync Is Explicitly Designed

Most users at this point are first-time users.

V2 adds a first-time contact permission sequence:

1. In-app bottom sheet:
   - `Sync contacts`
   - `Find your witness faster. We only use the person you choose.`
   - CTA: `Choose contact`
   - Hint: `iPhone will ask for permission next. We never message anyone until you send the invite.`

2. Native iOS permission alert:
   - Title: `"Unbreakable Vow" Would Like to Access Your Contacts`
   - Body: `Find your witness faster. We only use the person you choose.`
   - Buttons: `Don't Allow` / `Allow`

3. Post-permission picker:
   - `Contacts synced`
   - Search field
   - `Suggested contacts`
   - Full-row contact choices
   - Manual fallback: `Invite by phone or email`

Rules:

- Do not show `Recent witnesses` for first-time users.
- `Recent witnesses` means recent Unbreakable Vow witnesses only.
- Do not infer recent people from the phone’s recents list and call them witnesses.
- Do not say contacts were uploaded.
- Do not message anyone automatically.

### 7. Quick Vow Is Returning-User-Only

V2 treats Quick Vow as a returning-user surface.

This means:

- First-time users use the guided flow.
- Quick Vow users likely already have a saved payment method and a prior witness.
- Quick Vow should be fast, not another full guided checkout.

### 8. Quick Vow Defaults To Last Witness

V2 changes screen 16 to show a prefilled witness row:

- Avatar initial: `J`
- Name: `Joe`
- Subcopy: `Joe’s been your witness before.`
- Right affordance: `Change`

The row appears slightly faded/defaulted until the user interacts with it. If the user taps `Stake $X ->` without changing it, the default witness sticks.

No `Decide later` path on Quick Vow.

### 9. Quick Vow Skips 16B On Happy Path

In v1, Quick Vow used:

`16 -> 16B -> payment`

In v2, the happy path is:

`16 -> Apple Pay / Stripe PaymentSheet -> 06 Sealed Moment`

Screen `16B` remains only as a fallback for:

- no saved payment method
- lost Stripe state
- prior $0-only user
- any other edge case where payment setup is not already available

Do not remove 16B from the design system. Just do not put it on the primary path.

## Detailed Screen Changes

### Screen 03: Choose Witness

V1 label:

`Approved 03. Choose Witness`

V2 label:

`V2 03. Choose Witness / Decide Later`

Changes:

- Primary card remains `Add a witness`.
- Copy remains witness-centered.
- Adds quiet options:
  - `Share link`
  - `Decide later`
- No visible `Go solo` language.

Implementation:

- `Add a witness` opens 03b.
- `Share link` creates or prepares a shareable witness invite.
- `Decide later` opens 03a confirmation sheet.

### Screen 03a: Decide Later Confirmation

New in V2.

Purpose:

This prevents witness deferral from being too casual while avoiding heavy `go solo` framing.

Copy:

`Pick one now, or after you seal.`

Body:

`Vows work better with a witness. You can still keep moving and choose later.`

Primary:

`Add a witness`

Secondary:

`Decide later`

Behavior:

- Primary returns to 03b.
- Secondary marks `witness_decision = deferred` and continues toward auth/payment.

### Screen 03b: Pick Witness Sheet

V1 behavior assumed possible recent witnesses.

V2 first-time default:

- No recent witness rows.
- Trust-forward contact sync card.
- Manual share fallback.

New copy:

`Choose a close friend, roommate, or anyone who won’t let you slide.`

Permission card:

`Sync contacts`

`Find your witness faster. We only use the person you choose.`

CTA:

`Choose contact`

Hint:

`iPhone will ask for permission next. We never message anyone until you send the invite.`

### Screen 03b1: iOS Contacts Permission

New in V2.

This represents the native iOS system permission alert.

Do not fully custom-render this in the actual app. The mock exists so the builder understands the sequence.

Trigger:

Only after the user taps `Choose contact`.

Never show the system permission prompt cold on screen arrival.

### Screen 03b+: First-Time Contacts Synced

New in V2.

Purpose:

Shows what happens after the user grants contacts permission.

Content:

- `Contacts synced`
- `Choose witness.`
- `Pick someone you trust to witness this vow.`
- Search field
- `Suggested contacts`
- Contact rows
- Hint:
  - `Tap a person to choose them. If they have multiple numbers, we’ll ask which one.`
- Manual fallback:
  - `Invite by phone or email`

Implementation:

- Contact row is a full-row tap target.
- If one primary mobile number exists, select directly and route to 03c.
- If multiple phone/email methods exist, show a resolver sheet.
- Do not upload or sync contacts to backend unless explicitly designed later.

### Screen 03c: Witness Selected / Draft Ask

V1 label:

`Approved 03c. Witness Selected`

V2 label:

`V2 03c. Witness Selected / Draft Ask`

Changes:

- Adds quiet link:
  - `Ask Joe now ->`
- Selected witness row says:
  - `Joe is your witness`
  - `After you seal, we’ll help you text Joe.`

Behavior:

- `Change` reopens witness picker.
- `Ask Joe now ->` prepares a witness invite link and opens SMS/share.
- Continue proceeds to auth or payment based on auth state.

Important:

If the witness receives the early invite, do not tell them this is a draft. Use normal witness explanation language.

### V2 W1: Witness Invite

New in V2.

Purpose:

Recipient-facing witness explanation for early or normal invite.

This should be close to the current mobile web witness experience, with v2 styling.

Key copy:

`Your friend needs you.`

`They put $50 on a promise. Keep them honest, then call it kept or broken.`

Job module:

`Your job`

`Accept, keep them accountable, and we’ll text you Sunday to call it.`

CTA:

`Accept as witness`

Quiet:

`Not this one`

Do not assume the maker’s name is always known. If unknown, use generic friend language.

### V2 03e: Draft Witness Accepted

New in V2.

Purpose:

Confirmation for witness after they accept before the maker has sealed.

Key copy:

`You’re in`

`Joseph still needs to seal the vow.`

`We’ll tell him you accepted.`

If maker name is unknown, use generic copy:

`They still need to seal the vow.`

### Screen 04d: Witnessless Checkpoint

New in V2.

Trigger:

Only for users who tapped `Decide later` and reach the pre-payment point with no witness selected.

Copy:

`Want someone holding you to this?`

`You can pick one now or pick after you seal.`

Primary:

`Add a witness`

Secondary:

`Seal vow`

Implementation:

- `Add a witness` returns to 03/03b.
- `Seal vow` continues to 04/05.
- If no witness exists after seal, route to the no-witness share path, not named-witness pages.

### Screen 05: Add Payment

V1 CTA:

`Seal this vow`

V2 CTA:

`Lock it in`

Rationale:

More ceremonial, less generic. It better matches the emotional tone of the commitment.

Payment behavior remains the same for guided first-time flow:

- Create/save SetupIntent.
- Present Stripe React Native PaymentSheet / Apple Pay.
- No charge today.
- Charge only if vow is broken.

### Screen 06: Sealed Moment

V1 subcopy:

`Next: send the witness link.`

V2 subcopy:

`Now Joe needs to know.`

If no named witness:

`Now tell your witness.`

Post-animation continuation affordance:

- Named witness: `Tell Joe ->`
- No named witness: `Share the link ->`

This screen does not auto-advance. User taps after the emotional beat.

### Screen 07: Send Witness Invite

Quiet deferral copy changed.

V1:

`I'll do it later`

V2:

`Send it later`

Rationale:

`Send it later` feels like a deferred commitment, not a personal dodge.

### Screen 07B: No Witness Picked

CTA changed.

V1:

`Share witness invite`

V2:

`Share the invite`

Quiet deferral:

`Send it later`

Rationale:

The screen context already implies witness invite. Dropping `witness` makes the CTA cleaner.

### Screen 08: Waiting Witness Detail

V1 framed this as one tap away / send the invite.

V2 frames it as progress after the invite has been sent.

Status pill:

`Invite sent`

Headline:

`Waiting for Joe.`

Body:

`Your vow is sealed. Joe has the invite. Once he accepts, it begins.`

Card title:

`Invite sent.`

Card subcopy:

`You made it this far. Now Joe needs to accept.`

CTA:

`Remind Joe`

Helper:

`You can text him again or copy the link.`

Implementation note:

Use 08 for re-entry from dashboard when the invite is already sent. Use 07 for the immediate post-seal share action.

### Screen 08B: Returned After Messages

V1 CTA:

`Done`

Intermediate explored copy:

`Back to dashboard`

V2 final CTA:

`Got it`

Rationale:

`Got it` is an acknowledgment of an active waiting state. `Done` sounded too final. `Back to dashboard` was clear but too mechanical for the card CTA.

### Screens 09 / 10 / 11 / 12: Active Vow CTAs

V2 keeps the active-vow visual direction but clarifies CTAs.

Important behavior:

- After Joe accepts, show the one-time `Joe is watching` celebration.
- The main CTA should be:
  - `View live vow`
  - not `See my vow`
- Active vow detail should have:
  - `Back to dashboard`
  - secondary `I finished early`
  - optional check-in / share actions
- Almost verdict time should include:
  - final check-in action
  - `I finished early`
- Verdict due keeps:
  - `Nudge Joe to decide`

Implementation note:

There should be an early-completion/request path. The user may have completed a vow before the scheduled verdict date and should be able to ask the witness to call it earlier.

### Screen 16: Quick Vow / Make A Vow Fast Path

V1 label:

`Approved 16. Make A Vow Fast Path`

V2 keeps the label but changes behavior and witness default.

Quick Vow is now returning-user-only.

Changes:

- Witness row defaults to last witness.
- Shows a faded prefilled state:
  - avatar initial
  - witness name
  - prior-witness subcopy
  - `Change`
- No `Decide later`.
- The user can still change witness.

Payment behavior:

- If saved payment method exists, tapping `Stake $X ->` presents Apple Pay / Stripe PaymentSheet directly.
- Do not route to 16B on the happy path.

### Screen 16B: Quick Vow Add Payment Fallback

V1 label:

`Approved 16B. Quick Vow Add Payment`

V2 label:

`Approved 16B. Quick Vow Add Payment Fallback`

16B is preserved for edge cases only.

Use 16B when:

- returning user has no saved payment method
- prior completed vow was $0 and never saved Stripe setup
- saved payment method failed / is unavailable
- Stripe state is missing or stale

Do not use 16B as the normal Quick Vow path.

## Routing / State Matrix Changes

### Named Witness, Not Yet Texted

After sealing:

- Immediate post-seal route: screen 07
- Re-entering from dashboard: screen 08

### Named Witness, Text Attempted

If local flag `sms_open_attempted:{vow_id}` is true:

- Route to screen 08B

CTA should be `Got it`, not `Text Joe the invite`.

### No Named Witness

If no `witness_name` exists:

- Immediate post-seal route: screen 07B
- After share sheet dismissed: screen 08C

Do not say `Joe`.

Use generic invite/share copy.

### Witness Accepted

If `witness_accepted_at` is set:

- First visit / realtime transition: screen 09
- Subsequent visits: screen 10

Use local flag:

`accept_celebration_seen:{vow_id}`

## Backend / Data Implications

### Anonymous / Early Witness Invite

V2 requires supporting `Ask Joe now ->` before payment.

This implies an anonymous or pre-auth draft invite path.

Expected behavior:

- Prepare a witness invite link before final payment.
- Recipient can accept as witness.
- Maker later completes auth/payment/seal.
- If witness already accepted before seal, after payment the app should skip `Send invite` and route to active/live state.

Do not expose the word `draft` to the witness.

### Contact Sync

Contacts remain local/native.

Implementation should:

- Request iOS contacts permission only after user taps `Choose contact`.
- Use contacts only to choose a witness.
- Store selected witness name/phone in local flow state.
- Do not upload all contacts to backend.
- Do not auto-message contacts.

### Quick Vow Saved Payment

Quick Vow should check whether the user has a saved payment method.

If yes:

- `Stake $X ->` opens PaymentSheet / Apple Pay directly.

If no:

- route to 16B fallback.

### $0 Vows

V2 planning supports allowing $0 vows, but the current visible guided mocks still show paid examples.

Implementation should preserve a no-stake path where Stripe is skipped:

- no PaymentSheet
- no SetupIntent required
- copy must clearly state no money is on the line
- witness/social flow still works

If this is not already specced in the builder’s current phase, do not invent UI silently. Use the existing build-plan no-stake rules or ask for approval.

## Copy Changes From V1 To V2

Use these exact substitutions:

- `Seal this vow` -> `Lock it in`
- `Next: send the witness link.` -> `Now Joe needs to know.`
- `Continue ->` on sealed moment -> `Tell Joe ->` when named witness exists
- `Continue ->` on sealed moment -> `Share the link ->` when no named witness exists
- `I'll do it later` -> `Send it later`
- `Share witness invite` -> `Share the invite`
- `Done` on 08B -> `Got it`
- `ONE TAP AWAY` on 08 -> `Invite sent`
- `Text Joe the invite` on 08 card -> `Remind Joe`

Do not globally replace every `Done` in the product. Many other screens still legitimately use `Done`.

## Implementation Priority For A Builder Mid-V1

If the builder is already mid-v1, do not throw away the work. Patch in this order:

1. Patch screen 03 witness logic:
   - add `Decide later`
   - remove casual `Go solo`
   - add `Share link`
   - add 03a confirmation

2. Patch contact sheet:
   - update 03b copy
   - add 03b1 iOS permission state
   - add 03b+ first-time contacts synced state

3. Patch 03c:
   - add `Ask Joe now ->`
   - support early witness invite link

4. Add 04d witnessless checkpoint:
   - only for deferred witness choice

5. Patch payment copy:
   - `Lock it in`

6. Patch sealed/post-seal copy:
   - 06 / 07 / 07B / 08 / 08B

7. Patch active-vow CTAs:
   - `View live vow`
   - `I finished early`
   - `Back to dashboard`

8. Patch Quick Vow:
   - returning-user-only
   - default last witness row
   - direct payment sheet happy path
   - 16B fallback-only

## What Not To Do

- Do not reorder the maker flow to witness-before-stake.
- Do not show `Go solo` on the main witness screen.
- Do not show `Recent witnesses` for first-time users.
- Do not custom-render Stripe’s actual Apple Pay sheet beyond the surrounding context.
- Do not expose `draft invite` language to witness recipients.
- Do not ask for contacts permission on screen arrival.
- Do not upload or message all contacts.
- Do not silently change v1-unaffected screens.

## Canonical Build-Plan Files Already Updated

The following files have been updated to reflect V2:

- `design-alignment/native-perfect/MOCK_VERSION_LOG.md`
- `design-alignment/native-perfect/build-plan/STEP_1_MOCK_DECOMP.md`
- `design-alignment/native-perfect/build-plan/STEP_4_MOTION_HAPTICS.md`
- `design-alignment/native-perfect/build-plan/STEP_9_SCREEN_SPECS.md`

The builder should prefer the v2 mock and these updated specs over older v1-only assumptions.

## Final Builder Instruction

You are not rebuilding the product from scratch. You are migrating an in-progress v1 implementation to the v2 witness-options direction.

Keep the approved v1 visual system and all unchanged screens. Patch only the deltas listed here unless the updated v2 mock explicitly shows a different state.

When in doubt:

1. Match `project-perfect-final-build-mocks-v2-witness-options.html`.
2. Preserve v1 where v2 does not differ.
3. Do not invent new copy or flows without logging a mock-deviation proposal.
