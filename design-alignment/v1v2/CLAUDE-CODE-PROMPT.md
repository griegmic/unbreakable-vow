# THE ONE-SHOT PROMPT FOR CLAUDE CODE

This is the exact message to paste into Claude Code as your **first** message in the project. After that, use the follow-up prompts in §B per PR.

---

## A. THE OPENING PROMPT (paste this exactly)

```
You are shipping V6 of Unbreakable Vow — a commitment app where users make
vows, stake money, and have a friend judge them. The full spec is in
design-alignment/v1v2/IMPLEMENTATION-V6.md (~2,800 lines). It is the
single source of truth.

GROUND RULES (these override anything you'd otherwise default to):

1. READ FIRST, CODE SECOND. Before touching ANY file, read in this order:
   a. design-alignment/v1v2/IMPLEMENTATION-V6.md (end-to-end, all 9 parts)
   b. design-alignment/v1v2/WITNESS-IDENTITY-DECISION.md
   c. CLAUDE.md (repo root) — the do-not-modify list is strict
   d. design-alignment/v1v2/MANIFESTO.md if present

   When you've finished reading, summarize back to me in one paragraph what
   you understand the V6 build to be, and list any spots where the spec is
   ambiguous or contradicts itself. We'll resolve those before code starts.

2. WORK ONE PR AT A TIME, IN STRICT ORDER from §9.1:
   PR #1 (Foundation) → PR #1.5 (Primitives) → PR #2 (Backend)
   → PR #3 batches A→B→C→D→E→F → PR #4 (Wiring) → PR #5 (Polish)

   At the end of every PR you MUST:
   - Open a draft PR with a title prefixed `V6 PR #X — <name>`
   - Run the §10.1 self-audit checklist; paste pass/fail results in the PR
     description with specific evidence (file paths, line numbers, command
     output) for every item
   - Tag me to review before you start the next PR
   - Do NOT merge. I merge.

3. PIXEL FIDELITY IS A RELEASE GATE (§1.4). For every screen you build:
   - Open the HTML mock at the path given in the spec
   - Render the live build at 393×852 devicePixelRatio=3
   - Side-by-side diff visually
   - If they don't match, you have two options: (a) fix the build, or
     (b) flag a design-revise issue. Never (c) ship a degraded version.

4. DO NOT MODIFY anything in CLAUDE.md's do-not-modify list. The hardest
   rule: expo/components/vow-ui.tsx is permanently frozen. If a fix
   appears to require editing it, escalate to me — don't silently edit.

5. ASK BEFORE GUESSING. If something is ambiguous (the spec says "no mock
   yet — side-by-side merge gate"), do not invent. Stop, propose two
   options with tradeoffs, and wait. The default behavior is ASK, not
   GUESS.

6. NO BUNDLING. Each PR in §9.1 is its own scope. PR #1.5 (Primitives)
   especially must land in isolation before any screen PR. If you find
   yourself wanting to bundle, that's a signal to stop and write me a
   note about why.

7. RUN THE QA AUDIT (§10) AT EVERY MERGE GATE. PR #5 must satisfy §10.4
   (pre-launch readiness gate) before you call the work done.

8. PARALLEL TRACK: A2P 10DLC registration (§4.10.1) is Joe-owned, not
   yours. You don't do this. But check in with me at the end of PR #2
   to confirm Joe has it submitted, because PR #5 cannot ship to public
   without approval.

9. NO-MOCK SCREENS REQUIRE MY EXPLICIT SIGN-OFF. For any screen still
   marked "no mock" in §2.5A (S10.4, S10.7, S15, S20-EMPTY, S22,
   destination picker, settings, history, error states, modals
   catalogue, Cast `/cast` + `/c/[token]`, S7-WEB, **S19-VOIDED**):
   draft your HTML mock FIRST, render it to PNG, post the PNG inline in
   the PR thread, and WAIT for my explicit "approved" reply before
   writing the screen file. Do not proceed if I haven't replied. This
   rule protects against the "Claude Code's mock looks 95% right and I
   approve it because nothing's obviously broken, then it ships
   slightly wrong" failure mode. The 10 most-consequential no-mock
   screens already have HTML mocks (see §2.5A entries marked V6 with
   `flow/html/...` paths added/revised Apr 22, 2026 — includes the new
   S19-OUTCOME-RESOLVED and S19-DECLINED variants, and audit-revised
   M11 / M11B / vow-broken-charity / vow-broken-cause-you-hate /
   certificate / s20-dashboard-multi). Use those exactly. Do not
   redraw what's already drawn.

10. S19 IS STATUS-AWARE NOW, NOT CALENDAR-AWARE. The `/w/[token]/page.tsx`
    router branches on `vows.status`, `vows.verdict`, and
    `vows.witness_declined` — NOT on a calendar TTL. The column
    `vows.witness_token_expires_at` is DEPRECATED as a behavioral
    driver; do not read it for routing decisions. See
    IMPLEMENTATION-V6.md §3.2 "S19 · Witness-link terminal states" for
    the router pseudocode and the 4 variants (OUTCOME-RESOLVED,
    DECLINED, VOIDED, EXPIRED-as-edge-case). If you find yourself
    rendering the "expired" copy for a user whose vow has a verdict,
    you've branched wrong — re-read the router logic.

11. S14.5 IS KILLED. Do NOT build a first-time-witness onboarding
    interstitial. The witness flow is S14 → (S15 if needed) → S16,
    with no S14.5 step in between. Do not write or read a
    `witnessOnboardingSeen` localStorage flag — it doesn't exist.
    The reassurance copy that was on S14.5 ("Zero cost to you. No
    account needed. Joey's your only connection.") now lives as a
    single-line muted footer on S14 below the "Pass — I can't" link.
    Cadence is communicated diegetically on S16's timeline dots.
    See IMPLEMENTATION-V6.md §3.2 S14 (updated copy) and §3.2 S14.5
    (kill note). The file `flow/html/s14-5-first-time-witness.html`
    has been deleted — do not restore or reference it.

WHAT I CARE ABOUT MOST (priority order if anything has to be cut):
1. Pixel fidelity on the V6 sealed loop (S8/S9 + iMessage OG card)
2. Outcome flows (M11/M11B kept, vow-broken variants)
3. Witness identity language consistency across every surface
4. Haptics on every Expo interaction
5. Push notification cadence (the "Heckle him" promise)

WHEN YOU'RE READY: respond with the one-paragraph summary from rule 1
plus your list of ambiguities. Then wait for me to greenlight PR #1.

Don't start writing code in this first turn.
```

---

## B. FOLLOW-UP PROMPTS PER PR

### After PR #1 (Foundation)

```
PR #1 looks good. Before you start PR #1.5:

- Confirm the §10.1 visual fidelity items pass (specifically the
  off-spec hex grep returns zero hits)
- Confirm phone normalization helpers exist at both /web/src/lib/phone.ts
  and /expo/lib/phone.ts with IDENTICAL implementations
- Confirm the migration ran on a staging branch and sms_retry_queue
  table exists with the right columns
- Show me the OG card rendering at /api/og/test with sample data

Then proceed to PR #1.5. Same rules — read first, code second, audit
at the end.
```

### After PR #1.5 (Primitives)

```
For PR #1.5: I want to actually see every primitive at /_dev/primitives
before merging. Send me a screenshot grid of every primitive in every
variant. If any primitive doesn't look right, we fix here — once
screens start consuming them in PR #3, drift gets expensive.

Specifically I want to see: WaxSeal (all sizes, with/without halo,
showCheck variant), GoldCTA (all variants including filled-imsg-green),
RitualCard (compact + default), VowDocCard, EyebrowTag (all tones),
FrauncesH1 (italic + non-italic), Stamp (KEPT gold, BROKEN muted-red,
auto-resolved variant), DatePickerSheet, ChangeStakeSheet,
DismissDraftSheet, ContactPicker, OutlinedGoldCTA.

After visual sign-off, run §10.1 and we move to PR #2.
```

### After PR #2 (Backend)

```
PR #2 — three things I want verified before merge:

1. Channel-dedup audit per §10.1 → grep every send site, confirm 100%
   maker notifications go through notifyMaker(). Paste the grep output.

2. Run the §10.2 acceptance test items 6-9 (push delivery, refund
   retry, SMS retry) on a real Supabase project. Show me the audit_events
   rows for one full vow lifecycle.

3. Confirm A2P 10DLC is submitted (parallel track per §9.1) — I'll
   check Twilio console; you don't need to do anything, just remind me.

Then we start PR #3 batch 3A (sealed loop).
```

### Before each PR #3 batch

```
Starting PR #3 Batch 3X — [batch name].

Before code: list every screen in this batch, the mock path, and the
target file path (web + Expo). For any screen marked "no mock"
(side-by-side merge gate per §2.5A), draft your HTML mock first and
send me a screenshot for sign-off BEFORE touching the actual screen
file.

After every screen: pixel-diff loop per §2.5.4. Paste the diff
percentage in the PR description per screen.
```

### After PR #5 (Launch readiness)

```
PR #5 final gate. Walk through §10.4 item by item with evidence:
   1-10. [each item: pass/fail + how you verified]

Then run the full §10.2 manual QA on a physical iPhone (you can't —
I'll do this; you produce the test plan and I'll execute). Send me
the test plan with checkboxes.

When all 10 items in §10.4 are green AND all 14 items in §10.2 pass,
we ship.
```

---

## C. ESCALATION TRIGGERS (when Claude Code should STOP and ask, not proceed)

Tell Claude Code in advance that these scenarios always require stopping:

1. The spec contradicts itself (one section says X, another says Y)
2. A required file in the do-not-modify list appears to need editing
3. A migration would require a NOT NULL backfill on an existing column
4. Stripe behavior differs from spec in test mode (could indicate spec gap)
5. A primitive's API in the spec can't actually express what the screen needs
6. Visual diff > 5% and not a clear bug fix
7. Any change to RLS policies that wasn't explicitly listed in §4.7
8. Any new external dependency (npm package, Supabase extension)

For each: STOP, document what you found, propose 2 options with tradeoffs,
wait for me.

---

## D. THE TWO-LINE OPENING IF YOU DON'T WANT TO PASTE THE WHOLE THING

If you want a quick start instead of the full prompt above:

```
Read design-alignment/v1v2/IMPLEMENTATION-V6.md end-to-end then read
design-alignment/v1v2/CLAUDE-CODE-PROMPT.md and follow it exactly.
Don't write code in your first response — give me the summary and
ambiguity list per rule 1, then wait for greenlight.
```

That's it. Everything else is in the spec.
