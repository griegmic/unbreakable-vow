# STEP 2 — Pre-Payment Share Link Audit

## Executive Summary

The pre-payment share link flow (**path B** from the user journey) is **feasible and partially built**. The backend function `prepare-judge-link` exists, is unfrozen, and already handles draft vow creation with deduplication and supersession logic. The Expo wrapper `prepareJudgeLink()` exists. The web app already uses this exact flow successfully on `/witness/page.tsx`.

**What's built:**
- Backend: `prepare-judge-link` edge function (lines 75–217 in `supabase/functions/prepare-judge-link/index.ts`) creates drafts, handles `terms_hash` deduplication, and manages `superseded_by_vow_id` for term changes post-share.
- Backend: `accept-witness` explicitly accepts `'draft'` status (line 81), enabling witnesses to accept before the maker seals.
- Backend: witness-side HTML routing (`/w/[token]/page.tsx:140`) treats draft vows as valid states and routes them to the witness invite client.
- Expo: `prepareJudgeLink()` wrapper function exists at `expo/lib/prepare-judge-link.ts` with full type safety.
- DB: `terms_hash`, `witness_share_locked_at`, `witness_share_method`, `superseded_by_vow_id` columns added in migration 20260427000001.

**What's missing or underspecified:**
1. **Auth requirement for `prepare-judge-link`** — The function has an `Authorization` header check (line 80–81) and requires a valid JWT. Per STEP_2_BACKEND_MAP §D, this creates a sequencing decision: does the native app authenticate first, or does it allow anonymous draft creation? Currently it requires auth.
2. **Witness UX for draft vows** — The web app's witness pages treat draft vows as active (line 140–141 in `/w/[token]/page.tsx`), but the visual design for a draft (unsealed) vow from the witness's perspective is not in the 32 mocks. Specifically: what does the witness see if the vow has no `ends_at` terms locked yet, or if the maker abandons mid-flow?
3. **Orphan cleanup** — The STEP_2_BACKEND_MAP notes that drafts should be garbage-collected after 24h by `cron-runner`, but no explicit mention of this in the code reviewed. Needs verification.
4. **Notifications during pre-seal acceptance** — When a witness accepts a draft, they get SMS + push notifications (lines 209–262 in `accept-witness`). The maker also gets notified (line 210–216). But the maker experience if they're still in the creation flow (haven't reached payment yet) is not specified.
5. **Post-seal ownership transfer** — If the vow is created as a draft before auth, and the maker later authenticates, there's no explicit "reclaim" logic visible in `prepare-judge-link`. The function requires an existing JWT, so the user must auth first. This sidesteps the problem but isn't explicitly called out as a product decision.

**Overall confidence: 8/10.** The infrastructure is solid and tested (web uses it). The risk is UX clarity around the unfinished vow state—the witness and maker both need to know what's pending, and there's ambiguity about whether the flow forces auth before share or allows anonymous sharing.

**Recommendation:** This audit surfaces that the native build should follow the web app's sequencing (auth → share → continue to seal) rather than trying to allow pre-auth draft creation. The `prepare-judge-link` function is correctly designed for an authed user who wants to lock in a share URL before they've paid. Moving auth earlier (screen 01 or integrated into screen 03) resolves most ambiguity.

---

## Backend Audit

### `prepare-judge-link` Function (source: `supabase/functions/prepare-judge-link/index.ts`)

**What it does (verbatim from source reading):**

1. **Auth check (lines 80–85):** Requires an `Authorization` Bearer token. Extracts the JWT and calls `supabase.auth.getUser(authHeader)`. Returns 401 if missing or invalid. **Auth is mandatory.**

2. **Input validation (lines 87–98):** Accepts a payload with optional `vow_id`, required `raw_input`, `refined_text`, `ends_at`, and optional `witness_name`, `witness_phone`, `stake_amount_cents`, `consequence`, `destination`, `share_method`. Validates that at minimum `rawInput`, `refinedText`, and valid ISO `endsAt` are present. Returns 400 if invalid.

3. **Stable terms hash (lines 46–108):** Computes a SHA-256 hash of the normalized vow terms (`raw_input`, `refined_text`, `stake_amount_cents`, `consequence`, `destination`, `ends_at`). This hash is stable across invocations with identical terms.

4. **Supersession logic (lines 113–191):**
   - If `body.vow_id` is provided, look up the existing draft by ID and user.
   - If it exists and is in `'draft'` status, check if the new terms hash differs from the stored `terms_hash`.
   - If `witness_share_locked_at IS NOT NULL` and terms hash differs, set `shouldSupersede = true`.
   - If superseding, create a new draft vow and void the old one, linking them via `superseded_by_vow_id`.
   - If not superseding (same terms or fresh draft), update or insert a single draft.

5. **Token generation (lines 140–142):** Uses the existing `witness_invite_token` if the draft exists and isn't being superseded. Otherwise generates a new UUID v4.

6. **Vow row creation/update (lines 144–191):**
   - Sets `user_id`, `raw_input`, `refined_text`, `witness_name`, `witness_phone`, `witness_invite_token`, `stake_amount`, `consequence`, `destination`, `status: 'draft'`, `starts_at`, `ends_at`, `witness_share_locked_at: now`, `witness_share_method` (share/copy/contact), `terms_hash`.
   - Inserts or updates atomically.
   - If superseding, also updates the old vow with `status: 'voided', superseded_by_vow_id: newId`.

7. **Audit events (lines 196–203):** Logs `judge_link_prompt_seen`, then `judge_link_shared` or `judge_link_copied` depending on `share_method`.

8. **Return (lines 205–212):** Returns `{ vowId, witnessInviteToken, witnessUrl, shareText, termsHash, supersededVowId }`.

**Does it require auth?** Yes, unconditionally. Line 81 returns 401 if no valid JWT.

**What gets written to DB and with what user_id?** `user_id` is set to the authenticated user's ID (line 145). The vow row is fully owned; RLS policies will enforce that only the user who created it can read/update their own vows.

**What do `terms_hash` and `superseded_by_vow_id` actually do?**

- **`terms_hash`:** Deduplication mechanism. If the maker is on screen 03 (Choose Witness), they tap "Share link," the function creates a draft. They decide to go back, change the stake amount, and tap "Share link" again on the same draft vow. The function compares the new terms hash to the stored one. If identical, it reuses the same `witness_invite_token` (line 142). If different, it creates a new vow and voids the old one. This prevents URL fragmentation: if the terms change, the old share link becomes stale and is superseded.
  
- **`superseded_by_vow_id`:** Links a voided draft to its successor. Purpose: if a witness opens the old token after the maker changed terms, the system knows there's a newer vow. The witness-side router doesn't currently handle this state (no spec in STEP_2_BACKEND_MAP), but the data is there for a future "this vow was updated, use the new link" message.

**What does `accept-witness` do when called against a `draft` vow?**

From lines 78–86 of `supabase/functions/accept-witness/index.ts`:
- Checks vow status is in `['draft', 'active', 'awaiting_verdict', 'sealed']`. Draft is explicitly allowed.
- Sets `witness_accepted_at` to now (idempotent with `.is('witness_accepted_at', null)` guard).
- Fires SMS confirmations to both witness and maker (lines 219–262).
- Queues a push notification to the maker (lines 210–216).
- Comment on line 79: "Allow for draft (witness accepted before maker sealed) + active states."

**Importantly:** The function treats a draft vow as a valid state to accept. There's no check that the vow is sealed or active in a final sense. This is deliberate—it creates social pressure for the maker to complete payment.

**Cleanup for orphaned drafts:**

Searched the codebase for `cron-runner` and draft cleanup. From STEP_2_BACKEND_MAP §E.2 and the note in STEP_1_PATCH_P-2: "Backing out of any post-creation screen does NOT delete the draft. A draft vow that's never sealed gets garbage-collected by `cron-runner` after 24h (existing pattern; verify in Step 2)."

**Verification status:** Not explicitly confirmed in the codebase read. The `cron-runner` function was not fully examined. This should be verified before Step 5, but the note suggests it's already implemented.

### Database Schema Confirmation

Migration `20260427000001_pre_payment_judge_link.sql` adds:
- `witness_share_locked_at` (timestamptz): timestamp of when the share was locked in.
- `witness_share_method` (text check `'share'|'copy'|'contact'`): how the user shared (native iOS share sheet, copy to clipboard, or via contacts picker).
- `terms_hash` (text): SHA-256 hash of stable terms for deduplication.
- `superseded_by_vow_id` (uuid FK → vows.id): link to successor if terms changed.

These columns support the pre-payment share flow fully.

### Backend Gaps

1. **Witness-link expiration (STEP_2_BACKEND_MAP §E.5):** The `witness_token_expires_at` column defaults to `now() + 30 days` on insert. Neither `accept-witness` nor `submit-verdict` explicitly checks this. If a witness opens `/w/{token}` after 30 days, the token lookup succeeds but the system doesn't reject it. **Small addition needed:** guard in `accept-witness` and `submit-verdict` to check `witness_token_expires_at < now()` and return 410 Gone or similar.

2. **Witness view for draft vows:** Backend-wise, `accept-witness` handles draft fine. But what should the witness page *show* when the vow is draft? The terms aren't final yet. The maker could change the stake or deadline. The web app's witness client (`/w/[token]/client.tsx`) isn't in the review, but it likely shows best-effort terms and a "waiting for final confirmation" state. **Native mocks gap:** no screen showing the witness's view of a draft vow.

3. **Already-accepted detection:** If two witnesses somehow click the same token (shouldn't happen in normal flow, but possible if link is shared), the second click returns `{ success: true, already_accepted: true }` (lines 144–147). They see no error, just acknowledgment. **Witness-side UX gap:** what screen does the second witness see? "This vow is already taken"? Not in the mocks.

---

## Per-Path UX Walkthrough

### Path B1: Maker shares link, witness accepts before maker seals

**Maker side (native, screens 01–03c):**
1. Screen 01–03: Fill vow input, stake, witness selection locally.
2. Screen 03 "Choose Witness" → two options:
   a. "Add a witness" → picks from contacts (03b) → screen 03c "Witness Selected" → CTA "Continue →".
   b. "Share link" quietBtn → what happens next?

**When "Share link" is tapped on screen 03:**
- The vow is still in local memory (no DB row yet per STEP_1_PATCH_P-2).
- Current UX spec (STEP_1_MOCK_DECOMP §03): "Tappable → opens 03b sheet" on the judgeCard, OR "Share link" quietBtn (mentioned but no explicit spec for what it does).
- **Gap:** If "Share link" is tapped before a witness is selected (screen 03, not 03c), does it create the vow? Or does it require witness data? The patch says "on 03 'Share link' ... the client calls `createVow()`", but that function requires `witness_name`. If the user hasn't picked anyone, what name is used?

**Expected flow per STEP_2_BACKEND_MAP:**
- User taps "Share link" on screen 03 (or 03c "Continue →" in the share-path variant).
- Client calls `prepareJudgeLink()` with the draft terms.
- Backend creates `vows` row with `status: 'draft'`, generates `witness_invite_token`, returns `witnessUrl`.
- Native iOS share sheet opens with the URL.
- User sends the link to a friend (SMS, iMessage, email, etc.).
- User presses Back or taps outside the share sheet → dismissed.
- **Next step?** The flow continues to screen 04 (auth), then 05 (payment), then 06 (seal). The vow is already draft in DB, so when the maker seals, `seal-vow` updates it to `active`.

**Witness side during this time:**
1. Witness receives the link, e.g., "I just made an Unbreakable Vow: 'Run every morning this week' — $50 on the line for ALS Association. Verdict Sunday night. Will you be my judge? https://www.unbreakablevow.app/w/{token}"
2. Witness clicks the link → native deep link to `/w/{token}` → web witness invite page.
3. Web page (`/w/[token]/page.tsx` line 140–141) checks status is in `['draft', 'sealed', 'active', 'awaiting_verdict']` and renders `WitnessInviteClient`.
4. WitnessInviteClient shows the vow details (refined text, stake, deadline, maker's name) and two CTAs: "Accept" and "Decline".
5. Witness taps "Accept" → calls `accept-witness` with token and `action: 'accept'`.
6. Backend sets `witness_accepted_at`, fires SMS/push to maker and witness, returns success.
7. Witness sees a confirmation screen (not in native mocks, but web has one): "You're locked in."
8. **Maker's experience during witness acceptance:**
   - If maker is still in the creation flow (screens 04–05), they haven't been notified yet by default. The witness's SMS/push goes to the maker's phone, but if they're in the app, they won't see it unless they're listening for real-time updates.
   - If maker has already sealed and is on screen 07/08 (post-seal waiting), the realtime subscription on `witness_accepted_at` should trigger screen 09 celebration.
   - **Gap:** Real-time updates during creation flow (screens 04–05) aren't spec'd. Should the app subscribe to the vow row's `witness_accepted_at` change even before seal?

**Maker resumes creation flow:**
- Maker finishes screen 04 (auth), screen 05 (payment), screen 06 (seal).
- `seal-vow` edge function runs, checks if witness has already accepted (it has—`witness_accepted_at` is not null).
- `seal-vow` updates vow status to `active`, saves payment method, fires SMS to witness (redundant—they already got one from `accept-witness`, but the `seal-vow` SMS is "Sealed, ready to judge").
- Maker reaches screen 07/08—which screen? Per STEP_1_PATCH_P-1, the matrix shows:
  - If witness_phone is set and witness has accepted → use accepted card, skip 07.
  - If witness_phone is set but not accepted → show 07.
  - **But in path B1, the witness HAS accepted.** So the maker should go straight to screen 09 (acceptance celebration).

**Actually-likely flow (corrected):**
1. Witness accepts mid-creation.
2. Maker completes auth/payment/seal.
3. On seal, `seal-vow` sees `witness_accepted_at IS NOT NULL`, so it doesn't send a witness-invite SMS (unnecessary).
4. Maker's screen transitions directly to screen 09 or to screen 10 (mid-vow active detail).

This is ideal—the pre-share creates social pressure, the witness locks in early, and the maker has no post-seal friction.

### Path B2: Maker shares link, witness accepts, maker abandons

**Scenario:** Maker and witness are excited. Witness clicks the link and accepts immediately. Maker gets the SMS saying "Joe accepted!" but then bails—never returns to complete auth/payment.

**Witness state:**
- Has `witness_accepted_at` set.
- Gets a push notification and SMS saying they're locked in.
- Sees the vow detail page showing the maker's vow, stake amount, deadline.
- Every time they return to `/w/{token}`, they see the same page (unless the vow is voided or a verdict is submitted).

**Maker state:**
- Draft vow in DB, status `'draft'`, witness accepted.
- If they never come back, the draft sits in DB until `cron-runner` cleans it up after 24h.
- **Witness gets no notification of this.** After 24h, if they try to open `/w/{token}`, what happens?
  - Token lookup still works (the token isn't deleted, just the vow is soft-voided or hard-deleted).
  - If hard-deleted, `WitnessNotFound` page is shown: "This vow is no longer active."
  - If soft-voided with `status: 'voided'`, the S19 router on `/w/[token]/page.tsx` line 136 shows `WitnessTerminalClient variant="voided"`: "The maker canceled this vow."

**This is acceptable UX**, but depends on `cron-runner` actually cleaning up (unverified).

### Path B3: Maker shares link, abandons, comes back with different terms

**Scenario:** Maker and witness had a plan: "I'll run 10k steps for $50, verdict in 3 days." Maker sends the link. Witness is checking email later. Maker comes back to the app after an hour, changes their mind: "Actually, I'll run a 5k race for $100, verdict in 7 days." Maker taps "Share link" again.

**Backend behavior (per `prepare-judge-link` lines 136–191):**
- Old draft vow exists with terms_hash_1.
- New call with terms_hash_2 (different terms).
- `shouldSupersede = true` because `witness_share_locked_at IS NOT NULL` and hashes differ.
- New draft vow is created with the new terms. Old vow is voided with `superseded_by_vow_id` pointing to new vow.
- New `witness_invite_token` is generated.
- New URL is returned.

**Witness side:**
- Witness is holding the old URL: `unbreakablevow.app/w/{old_token}`.
- This token still points to the old vow, which now has `status: 'voided'`.
- S19 router shows `WitnessTerminalClient variant="voided"`: "The maker canceled this vow."
- **Witness has no way to know there's a new one.** The supersession link is in the DB but not exposed to the witness.
- **UX gap:** Witness should see a message like "This vow was updated. Here's the new version:" with a link to the new URL.

**This is a real gap.** Native mocks don't cover it, and the backend data exists but no UI uses it.

### Path B4: Two friends click the witness link

**Scenario:** Maker posts the witness link on a group chat. Two friends both tap it.

**First click:** Calls `accept-witness`, sets `witness_accepted_at = now`, returns `{ success: true }`. Friend 1 sees acceptance screen.

**Second click (immediately after or seconds later):** Calls `accept-witness`, checks `vow.witness_accepted_at` (now not null), returns `{ success: true, already_accepted: true }` at line 144–147. Friend 2 sees the same acceptance screen (the response is indistinguishable to the client).

**Friend 2's UX:** They think they've accepted, but they're actually a duplicate. The maker only gets one witness.

**Native mocks gap:** No "already taken" screen. The second friend thinks they're the judge but they're not.

**Backend behavior:** The vow only has one `witness_user_id` (the first to accept), so when verdict time comes, only the first friend's verdict counts. The second friend's attempts to submit a verdict will fail or succeed and be ignored (depends on RLS policy).

**This is a product risk.** Needs UX clarification: "This vow already has a judge" screen for the second accepter. STEP_2_BACKEND_MAP §E.6 notes this but says it's Step 3 derived.

### Path B5: Maker shares link without a witness name (anonymous share)

**Scenario:** Maker is on screen 03 "Choose Witness", hasn't selected anyone, taps "Share link" (the quietBtn). What happens?

**Per `prepare-judge-link` lines 110–111:** If no `witness_name` is provided, it defaults to `'Your witness'`.

**Witness receives:** "I just made an Unbreakable Vow: 'Run every morning this week' — $50 on the line for ALS Association. Verdict Sunday night. Will you be my judge? https://..."

**When witness opens the link:** Witness page shows the vow text and the maker's name (looked up from `vows.user_id` → users table, line 99–107 of `/w/[token]/page.tsx`). The witness's own name placeholder is "Your witness" initially, but they can provide their name when accepting or via the "save-reminder" action.

**Native mock coverage:** Screen 08C "Waiting detail, share-link path" shows the case where `witness_phone IS NULL` (anonymous share). The assumption is that the maker's name is shown prominently and the UI clarifies "We're reaching out to see if you'll judge."

**This is mostly covered** but needs the native 08C screen spec to finalize the UX.

### Path B6: Maker comes back, finishes flow, witness has already accepted

**Scenario:** Witness accepts the draft. Maker picks up the app 3 hours later and continues from where they left off.

**Maker's state in flow:**
- If they backed out of screen 04 (auth) and closed the app, they return to screen 04.
- After completing 04/04b/04c/05/05b, they reach screen 06 (seal).
- `seal-vow` runs.
- Vow status flips to `active`, `sealed_at` is set, payment method is saved.
- The function checks if an SMS should be sent to the witness. The comment on line 201 of the seal-vow code (not fully read, but implied) likely skips the SMS if `witness_accepted_at IS NOT NULL`.
- Maker screen transitions per P-1 matrix. Since `witness_accepted_at` is already set, the matrix routes to screen 09 (acceptance celebration) or directly to screen 10 (mid-vow detail).

**The ideal flow:** Maker never sees screens 07/07B (send invite); they jump straight to 09/10. No friction. The witness's early acceptance shortens the maker's post-seal UX.

**Current native spec:** Per P-1 matrix (STEP_1_MOCK_DECOMP lines 21–30), if witness has accepted, route to 09. So this works as intended.

### Path B7: Maker tries to share before completing vow terms

**Scenario:** Maker is on screen 02 (Stake), hasn't selected a deadline yet. Can they tap a "Share link" button?

**Per STEP_1_MOCK_DECOMP screen 02 spec:** No mention of a "Share link" button. The "Share link" option appears only on screen 03 (Choose Witness).

**By the time the user reaches screen 03, they've completed:**
- Screen 01: Vow input (rawInput).
- Screen 02: Stake, consequence, destination, deadline (via sheets 02b/02c).

**So the assumption is: by screen 03, all vow terms are locked.** If the maker taps "Share link" on screen 03, `prepareJudgeLink` receives a complete set of terms and succeeds.

**However:** Per `prepare-judge-link` line 96–98, if `rawInput`, `refinedText`, or `ends_at` are missing, it returns 400 `invalid_terms`. The native client should not allow "Share link" to be tapped if these fields are empty.

**Native UX responsibility:** Disable "Share link" button until vow terms are complete. This is a client-side guard, not a backend one.

---

## Witness-Side Experience for an Unfinished (Draft) Vow

**What the witness sees when they open `/w/{token}` for a draft vow:**

From `/w/[token]/page.tsx` line 140–141: If vow status is `'draft'`, it's routed to `WitnessInviteClient` (the main invite page, not a terminal screen).

**WitnessInviteClient renders (assumed from web patterns):**
- Maker's name (from users table, line 99–107).
- Vow text (refined_text).
- Stake amount and destination.
- Deadline.
- Two main CTAs: "Accept as witness" and "Decline."
- Optional: "Save reminder" to get a text on verdict day.

**The question:** What does the witness see if the vow is still in draft and the maker hasn't sealed yet? The terms are shown (they exist in the draft), so visually it looks like a normal invite. But semantically, the vow isn't "live" yet—the maker could change their mind, adjust the stake, or abandon it.

**Web app UX:** The web app doesn't seem to distinguish the visual appearance of a draft vs. sealed vow on the witness side. The witness sees the same invitation. The comment on line 93–94 of `/w/[token]/page.tsx` says: "Draft vows now show full witness page — witnesses can accept even before the maker finishes sealing. This converts witnesses while warm and creates social pressure for the maker to complete."

**Native mocks coverage:** The mocks don't explicitly show a "witness view of draft vow" screen. Screens 17–20 show witness pages, but they assume the vow is already sealed/active. Screens 08C shows a share-link path, but that's the *maker's* view post-seal.

**Missing:** A native screen (or notation in the spec) showing what the witness sees when they open a draft vow's witness link. It's probably visually identical to a sealed vow's witness page, but the text or a subtle indicator should clarify that the maker hasn't finalized the vow yet.

**Additional pre-seal witness states:**
1. **"Witness view of sealed-but-not-yet-judged vow"** — covered by screens 17/18/19 (witness mid-vow, almost done).
2. **"Witness view of draft vow (maker hasn't sealed yet)"** — not explicitly in mocks. Should look like 17 but with a note like "Waiting for [Maker] to lock this in" or similar.
3. **"Already accepted by someone else"** — not in mocks. Needs a terminal screen: "Someone else accepted this vow as judge. Want to try another?" with a back button.
4. **"This vow was superseded"** — not in mocks. If the maker changed terms after the witness got the link, show "This version is outdated. Here's the new version:" with a link to the new URL.
5. **"Vow was voided/abandoned"** — covered by terminal screens but probably only for the post-seal case. Same applies to draft.

---

## Recommended Architecture

### 1. When does the vow row get created?

**Decision: At the moment "Share link" is tapped OR when the user confirms witness selection and proceeds to auth/payment.**

**Rationale:**
- Per STEP_1_PATCH_P-2, the vow is created at the end of screen 03c OR on tap of "Share link"/"Go solo" from screen 03.
- The `prepareJudgeLink` function requires auth (JWT).
- So the sequence is: User completes screens 01–02 locally. On screen 03, they either:
  - Tap "Continue" after selecting a witness → advances to screen 04 (auth) → after auth, screen 03c creates the draft vow via `prepareJudgeLink` → proceeds to payment.
  - OR tap "Share link" (requires auth already, or routes to auth first) → calls `prepareJudgeLink` → returns share URL → native share sheet → user sends → continues to payment.
  - OR tap "Go solo" → same flow as adding a witness, but with `witness_name: 'Just me'`.

**Simplest product decision:** Require auth before screen 03 (or integrate auth into screen 03's "Continue" CTA). This matches the web app's flow and avoids ambiguity about pre-auth draft creation.

### 2. How is `user_id` handled before auth?

**Decision: Always require auth before draft creation.**

**Current `prepare-judge-link` code:** Requires a valid JWT (line 80–81). If the user isn't authed, the function returns 401.

**Recommended native flow:**
- Screen 01–02: Vow input and stake (local state, no auth needed).
- Screen 03: Choose Witness (local state, no auth needed).
- Screen 03c: "Continue" CTA → Check if user is authed. If not, route to screen 04 (auth). If yes, skip to screen 05 (payment).
- After auth (screen 04b success), proceed to screen 05.
- Screen 05: Create/confirm payment setup intent.
- Screen 06: Call `seal-vow`.

**For "Share link" on screen 03:** Same check—if not authed, route to auth first, then return to screen 03 to complete the share. OR, integrate the auth inline: "Share link" button is disabled until authed, with a note "Sign in to share." Clicking it routes to auth, then back to the share flow.

**Practical:** This avoids anonymous draft creation and keeps RLS simple. The vow always has a clear owner from creation onward.

### 3. How does ownership transfer at auth?

**Decision: No explicit transfer needed.**

Since auth happens before draft creation (per above), there's no dangling unowned vow. The user creates the draft immediately after auth, fully owned from the start.

**If pre-auth draft creation is required (reject above):**
- Draft vow would have `user_id` as some placeholder or NULL (STEP_2_BACKEND_MAP §D notes this as an open question).
- After auth, a "claim draft" operation would set `user_id = authenticated_user.id`.
- This would need a new endpoint or logic in `prepare-judge-link` to detect if the user is claiming an existing draft.
- **Not recommended** due to added complexity and RLS ambiguity.

### 4. How does the witness's view differ between draft and sealed vows?

**Decision: Visually identical on the witness side, but the text clarifies the state.**

**When witness opens `/w/{token}` for a draft:**
- Same layout as sealed witness page (screen 17 equivalent).
- Same vow text, stake, deadline, maker's name.
- Added sub-text or indicator: "Waiting for [Maker] to finalize the vow" or "Almost locked in. [Maker] is confirming the details."
- Same CTAs: Accept / Decline.
- Same "Save reminder" option.

**Why identical visual design:**
- The vow terms are immutable once shared (if they change, `superseded_by_vow_id` logic creates a new one).
- The witness can meaningfully accept or decline based on the vow text and terms shown.
- The "draft" status is a technicality (payment not yet confirmed); the witness's role is clear.

**Native screen addition:** A variant of screen 17 labeled "17-draft" or "17b", identical layout but with a sub-kicker "Waiting for finalization" or similar. Step 9 can fold this into the standard 17 with a conditional text block based on vow status.

### 5. How is the maker notified that their pre-shared witness has accepted?

**Decision: Push notification + SMS + real-time subscription.**

**Current backend behavior (from `accept-witness` lines 210–262):**
- Queues push notification to `vow.user_id` (the maker).
- Sends SMS to maker's phone if available.

**Native app implementation:**
- For in-app notification: Subscribe to `vows` table on the active vow's `witness_accepted_at` column. When it changes from null to non-null, trigger screen 09 celebration (or a toast if the user is on a different screen).
- For cold-start: The push notification wakes the app or shows a banner, and the app navigates to the vow detail showing acceptance.

**Code responsibility:** The native client should set up Supabase Realtime subscription on screen 03c, 04, 05, 06, and maintain it through payment/seal. Once seal succeeds and the vow is `active`, the subscription continues on screens 07/08/10/11/12 (all screens viewing the same vow).

**When to show screen 09:** Per STEP_1_PATCH_P-1, if `witness_accepted_at IS NOT NULL`, jump to 09. The subscription detects this change and triggers the transition.

### 6. What's the orphan cleanup story?

**Assumption:** `cron-runner` soft-deletes draft vows older than 24 hours (status → `'voided'` or hard delete). Witnesses trying to open old tokens see "This vow is no longer active."

**Action items:**
- **Verify** that `cron-runner` has this logic (not confirmed in code review).
- **If not present:** Add a cron job that runs daily and voids any draft vows created more than 24 hours ago without being sealed.
- **Configuration:** 24h is a guess. Should be a configurable value, maybe tied to witness-link expiration. Current default is 30 days (from `witness_token_expires_at` default). Align the cleanup window with this or define separately.

**Native consideration:** No client-side logic needed; server-side cleanup is sufficient. Witnesses and makers will naturally encounter the cleaned-up state.

### 7. What's the maker's flow if they come back and find the witness has accepted?

**Decision: Seamless continuation; no extra friction.**

**If maker returns to screen 03c and the draft vow already has `witness_accepted_at` set:**
- The UI still shows "Joe is your witness" (looked up from the draft vow row).
- The "Continue" CTA routes to screen 04 (auth) or 05 (payment) as normal.
- No acknowledgment needed that Joe accepted early; just proceed.
- When the vow is sealed and the maker reaches screen 07/08, the matrix routes directly to screen 09 (acceptance celebration) if `witness_accepted_at IS NOT NULL`, skipping the "send invite" screens.

**UX polish:** If the maker receives the SMS/push that the witness accepted, they might return to the app already aware. A subtle acknowledgment on the confirmation screen 03c could be nice: "✓ Joe accepted on [time]" below the judgeCard. This is optional; the flow works without it.

---

## Recommended UX Additions (Screens Not in the 32 Mocks)

These screens should be designed in Step 3:

1. **Screen 17b (or 17-draft) — Witness view of draft vow:**
   - Layout: Identical to screen 17 (Witness Accepted) but *before* acceptance.
   - Status indicator: "Waiting for [Maker] to finalize" or subtle "pending" state.
   - Same Accept / Decline CTAs.

2. **Screen 17-already-taken — Second witness tries to accept:**
   - Title: "Someone else accepted."
   - Body: "This vow already has a judge. Want to judge a different vow or make your own?"
   - CTAs: Back / Create a new vow.

3. **Screen 17-superseded — Witness opens stale pre-share link:**
   - Title: "This vow was updated."
   - Body: "The maker changed the terms. Here's the new version:" [link to new token].
   - CTAs: Open new version / Back.

4. **Screen 08C-full-spec — Maker's share-link waiting state (post-seal):**
   - Per STEP_1_PATCH_P-1, if `witness_phone IS NULL` and vow is `active` with no acceptance, show this.
   - Layout: Similar to 08B but emphasize the shareable link, offer copy/share/resend affordances.
   - Include a "Share again" CTA in case the first share was missed.

5. **Screen 09-early-acceptance — Celebration if witness accepted before maker sealed:**
   - Identical to screen 09 (Joe Accepted) visually.
   - Small variation: sub-text could say "Joe accepted before you even sealed. Let's lock it in." to acknowledge the early acceptance.
   - Optional; the standard 09 works fine without this variation.

6. **Draft vow detail state** — In screen 10 (mid-vow active), if the vow was sealed recently (less than ~30 seconds ago) and the witness accepted during the unfinished flow, show a brief "Joe's been waiting" or "Joe locked in early" acknowledgment. Optional aesthetic.

---

## Risks and Edge Cases

### Data Integrity Risks

1. **Multiple simultaneous share attempts:** If the user taps "Share link" twice rapidly before the first request completes, both may hit the backend with the same vow_id and terms_hash. The second might supersede the first unnecessarily, or race conditions could occur. **Mitigation:** Add client-side debounce (disable the button for 2s after tap).

2. **Witness accepts, then maker voids the vow:** The witness has `witness_accepted_at` set but the vow transitions to `voided`. Their view should show "voided" state. **Current backend:** S19 router (line 136) catches this and shows `WitnessTerminalClient variant="voided"`. ✓

3. **Witness accepts a draft, maker seals with payment failure:** The vow is still `draft`, witness is still waiting. Payment retries or fails. **Maker's UX:** Stuck on screen 05 error state. **Witness's UX:** Waiting indefinitely. **Mitigation:** 24h cleanup voids the draft, witness eventually sees "voided" state. Not ideal but recoverable.

4. **Orphaned superseded_by references:** If a superseded vow is referenced and later hard-deleted, the foreign key breaks. **Mitigation:** Soft delete (voided status) rather than hard delete ensures the chain is always resolvable.

### UX Risks

1. **Witness confusion about vow finality:** A witness accepts a draft and waits for verdict day (7 days later). The maker cancels the vow 3 days in. The witness expects to deliver a verdict. Instead, they get a "voided" notification. **Emotional impact:** Feels like wasted trust. **Mitigation:** Add a sub-text to the draft witness page: "The maker can still cancel this vow before finalizing. Once sealed, it's locked."

2. **Duplicate witness acceptance from group-share:** Maker posts the link in a group chat. Two friends accept within seconds. Only the first is the judge. **Mitigation:** Second accepter should see "someone already accepted" screen immediately. Current backend just returns `already_accepted: true` silently. **Native UX gap:** No error screen defined.

3. **Stale superseded links floating around:** Maker shares the original URL. Witness bookmarks it. Days later, the maker changed the terms and the URL is voided. Witness opens the bookmark. **Mitigation:** S19 router shows "voided" and explains "The vow was updated. Ask the maker for the new link" (or include the new token in the redirect if available).

4. **Missing notifications during creation:** If a witness accepts while the maker is on screen 04 (auth) or 05 (payment), the maker's app might not be subscribed to the vow yet (depends on implementation). They won't see the acceptance until they reach screen 06 or 07. **Mitigation:** The vow detail screen should refresh on every mount, catching any changes. Realtime subscription should start as soon as the vow is created, even before payment.

5. **"Share link" button disabled during auth:** If "Share link" requires auth but the user isn't logged in, they hit the button and are routed to auth. After auth, do they return to screen 03 with "Share link" still visible? Or are they advanced to the next screen? **Mitigation:** Explicit UX spec: after auth from screen 03, return the user to screen 03 with "Share link" enabled (not advanced automatically).

### Cleanup and Expiration Risks

1. **Orphaned draft vows accumulate:** If `cron-runner` cleanup isn't implemented or fails, drafts pile up in the DB. **Mitigation:** Verify cleanup exists; add alerting if cleanup falls behind.

2. **Witness token expiration at 30 days:** A user opens a witness link 31 days later. Currently no guard in `accept-witness` or `submit-verdict` to check `witness_token_expires_at < now()`. **Mitigation:** Add the guard (STEP_2_BACKEND_MAP §E.5).

3. **Unwitnessed vows that were shared:** A maker shares the link but the witness never opens it. The vow sits draft for 24h, is cleaned up, and the witness gets no notification of the deletion. **Acceptable trade-off:** The witness never committed (no SMS saying "I'm your judge"), so cleanup is fair. But log it for potential future notifications.

---

## Concrete Recommendations (Prioritized)

### Before Step 5 Backend Lock

1. **Verify `cron-runner` draft cleanup (CRITICAL).**
   - Confirm that draft vows older than 24h are voided or deleted.
   - Add the logic if missing.
   - Test with a sample draft that's older than the threshold.

2. **Add witness-token expiration guard (HIGH).**
   - In `accept-witness` and `submit-verdict`, check `witness_token_expires_at < now()` and return 410 Gone or 400 "Link expired."
   - Native client should gracefully handle this and show a "Link expired" screen (Step 3 design).

3. **Decide: Auth before or after screen 03 (HIGH).**
   - Current `prepare-judge-link` requires auth.
   - Native mocks show auth as screens 04/04b/04c, after witness selection.
   - **Recommendation:** Move auth to happen at screen 01 (or integrate into screen 03's "Continue" CTA) to unblock screen 03 "Share link." This simplifies the pre-payment share flow and matches the web app's pattern.
   - If rejected, modify `prepare-judge-link` to allow anonymous draft creation (unlikely given RLS design).

4. **Clarify witness-view design for draft vows (MEDIUM).**
   - Create a screen spec (or notation in Step 9) for what the witness sees when opening a draft vow's `/w/{token}` link.
   - Likely identical to screen 17 visually, with a sub-text like "Waiting for [Maker] to finalize the vow."

5. **Add screens for edge cases (MEDIUM).**
   - "Already accepted by someone else" screen (for second friend clicking the link).
   - "This vow was superseded" screen (for old link after maker changed terms).
   - Both should be in Step 3 design spec.

6. **Verify Realtime subscription coverage (MEDIUM).**
   - Document which screens subscribe to `witness_accepted_at` changes.
   - Ensure the subscription starts as soon as the vow is created, even before payment.
   - Test that screen 09 celebration fires when a witness accepts while the maker is in-app.

### Step 3 Design Tasks

1. **Screen 17b (Witness view of draft vow):** Layout, copy, state indicator.
2. **Screen 17-already-taken:** Copy and CTA flow.
3. **Screen 17-superseded:** Link to new vow, explanation.
4. **Screen 08C-full-spec:** Share-link post-seal UX, resend affordances.
5. **Auth-on-screen-03 mockup:** If auth is moved earlier, update the mocks to show auth integrated or pre-screen-03.

### Step 5 Native Implementation

1. **Integrate `prepareJudgeLink()` into screen 03:**
   - "Share link" button calls `prepareJudgeLink()` with current vow terms.
   - Returns vow ID and share URL.
   - Opens native iOS share sheet.
   - User dismisses or completes share → continues to next screen.

2. **Set up Realtime subscription on vow creation:**
   - Subscribe to `witness_accepted_at` changes.
   - On change, trigger screen 09 celebration if conditions met.

3. **Handle draft vow witness pages:**
   - Web app already supports them; native just needs to support the deep link `/w/{token}` pointing to the web app (or implement the witness page in native if scope allows).

4. **Client-side debounce on "Share link" button:**
   - Disable button for 2s after tap to prevent double-submission.

---

## Conclusion

The pre-payment share link flow is **well-architected on the backend and partially built**. The core infrastructure (`prepare-judge-link`, `terms_hash`, `superseded_by_vow_id`, draft vow acceptance) is solid and tested in the web app. The main gaps are:

1. **Sequencing ambiguity:** The native build should clarify whether auth happens before or after witness selection. Recommend: auth before, to unblock pre-payment share.
2. **Witness UX for drafts:** Design and spec the witness's view of an unfinished vow.
3. **Verification gaps:** Confirm `cron-runner` cleanup and add witness-token expiration guards.
4. **Edge case screens:** Design "already taken" and "superseded" screens for the witness side.

**Overall confidence: 8/10** (was 8/10, remains 8/10 after full audit). The risk is not technical complexity but UX clarity around the draft/unfinished vow state. Recommend locking the above four items before Step 5 build begins.
