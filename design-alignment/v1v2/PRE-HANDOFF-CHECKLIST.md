# PRE-HANDOFF CHECKLIST

**Goal:** make the IMPLEMENTATION-V6.md handoff so robust that Claude Code one-shots the entire V6 build with zero blocking ambiguity. This file is what we (Joe + Claude in Cowork) finish *before* opening Claude Code.

Status legend: ✅ done · 🟡 needs Joe input · 🔴 must do before handoff · ⏸ optional but high-leverage

---

## 1. Doc completeness — what's in IMPLEMENTATION-V6.md as of this moment

✅ Part 1.6 Brand decision log (locked cold-open, voice rules, posture)
✅ Part 2.7 Cross-screen behavior defaults (loading, transitions, errors, sheets, accessibility)
✅ Part 3.0 Cinematic moments (cold-open, initiation oath, seal echo, clock starts)
✅ Part 3.4 Dashboard with 3-cap witnessing rule + S20-WITNESSING-ALL
✅ Part 3.6 IfBrokenSheet with ALS + NRA/PETA pinning
✅ Part 3.10 Cast/Dare full flow (C1–C6 + target side)
✅ Part 4.4 PushPayload — all 14 types (witness, maker, cast, refund retry, self-resolve)
✅ Part 4.4.1 Channel-dedup helper (notifyMaker — push OR SMS, never both)
✅ Part 4.10 A2P 10DLC + SMS retry queue + phone normalization
✅ Part 5 Outcome flows (M11/M11B specced)
✅ Part 6.1.1 Account deletion · 6.1.2 Self-resolve · 6.4 Error states (extended)
✅ Part 9.1 PR sequencing with parallel A2P track
✅ Part 10 QA audit + acceptance criteria + pre-launch readiness gate

---

## 2. What still needs Joe to decide / produce before handoff

### 2.1 🟡 Mock production for under-specced screens

The spec says "no mock — side-by-side merge gate per §2.5A" for many screens. That's fine for *most* screens, but the four most consequential ones should have a mock before code starts. Option: ask Claude (in Cowork) to draft HTML mocks before opening Claude Code.

**Done in pre-handoff sprint (Apr 22, 2026) — all 11 high+medium-risk mocks shipped, plus audit-driven revisions:**
- [x] M11 (Vow Kept charity) — `flow/html/m11-vow-kept-charity.html` ✱ **revised Apr 22**: Bier-audit CTA pass — gold primary **"Share your win →"** (was "Make another vow"), single text-link secondary "Dare a friend 🔥", killed 3 other CTAs + ALS-donate footer
- [x] M11B (Vow Kept cause-you-hate) — `flow/html/m11b-vow-kept-cause-you-hate.html` ✱ **revised Apr 22**: Bier-audit CTA pass — **"Tell everyone you saved $25 from Trump →"** promoted to gold primary (two-line wrap, 64px min-height), the brag IS the moment; single secondary "Make another vow →"; killed outlined brag CTA + "Dare a friend" + "View your record"
- [x] Vow Broken · charity — `flow/html/vow-broken-charity.html` ✱ **revised Apr 22**: one gold CTA only ("Make a new vow →"), killed "View your record" secondary
- [x] Vow Broken · cause-you-hate — `flow/html/vow-broken-cause-you-hate.html` ✱ **revised Apr 22**: one gold CTA only ("Make a new vow — let's make this back →"), killed "View your record" secondary
- [x] Certificate page — `flow/html/certificate.html` ✱ **revised Apr 22**: typography rework — vow-action line switched to bold Inter Tight 26px (was Fraunces italic, unreadable at thumbnail); single clean gold frame (killed 1987-diploma corner brackets + double border); new maker-name + "pledged his word, on stake, to" prefix rows; KEPT stamp rewritten as filled gold gradient (Inter Tight 700, 28px, rotated -2.5°)
- [x] Multi-vow dashboard (S20) — **canonical: `flow/html/s20-dashboard-A-revised-v2.html`** ✱ **revised Apr 22 (second pass)**: new AWAITING-WITNESS card variant (gold-deep border, muted vow text, "Awaiting [Maker]" amber pill); 2px gold left border on YOUR VOWS cards (ownership signal); witness chip with name + status dot replaces witness column (green=accepted, amber-tinted+text=pending); vow line-height 1.18→1.28; meta-label color raised to `--text-mute` for WCAG. **NEW Section "NEEDS YOU NOW"** with pulsing amber dot — promotion zone receives any witnessing item with verdict <24h (promoted out of witnessing list, not duplicated) + pending-dare card. "All N you're witnessing →" overflow card. **No segmented-control toggle** — see `S20-TOGGLE-DEBATE.md`. Hamburger menu owns History / Settings / Account / Sign out. Earlier mocks (`s20-dashboard-multi.html`, `s20-dashboard-A-tighten.html`, `s20-dashboard-B-split.html`, `s20-dashboard-A-revised.html`) retained for design-history reference. Full panel audit: `S20-PANEL-AUDIT.md`.
- [x] S20-WITNESSING-ALL — `flow/html/s20-witnessing-all.html` (Active/Recent tabs, sectioned by Verdict-day vs Active)
- [x] S6.5 name capture — `flow/html/s6-5-name-capture.html` (gold-rim italic input, "That's me →" CTA, skip)
- [x] ~~S14.5 first-time witness~~ ✱ **KILLED Apr 22** (second pass): full-screen interstitial didn't pay for the attention it took. Witness's job is one line — no didactic explanation needed. Replacement: reassurance line moved to S14 footer ("Zero cost to you. No account needed. Joey's your only connection."), cadence communicated diegetically on S16 timeline dots. Witnessing is now a clean 2-screen web flow (S14 → S16 + optional S15 phone capture). HTML mock `flow/html/s14-5-first-time-witness.html` deleted.
- [x] S19-OUTCOME-RESOLVED — `flow/html/s19-outcome-resolved.html` ✱ **NEW Apr 22**: primary S19 variant. Witness who arrives after verdict is set sees "His word held." + vow recap card + gold CTA "See the full record →" (routes to outcome / certificate). Full-opacity wax seal with ✓ overlay.
- [x] S19-DECLINED — `flow/html/s19-declined.html` ✱ **NEW Apr 22**: witness who previously declined. Faded seal (55% opacity), "You sat this one out.", outlined-gold secondary "Change of heart? Text [Maker] →" (SMS pre-fill), tertiary "Make one of your own?"
- [x] S19-EXPIRED — `flow/html/s19-expired.html` ✱ **rewritten Apr 22** as true edge case only (vow ended without cron-runner recording verdict — rare data inconsistency). "That vow ended quietly." + tertiary link only. If it renders for a non-edge-case user, analytics should alert.

**S19 model — design decision (Apr 22, 2026):** replaced the single "expired" page with status-aware variants that branch on `vows.status`, `vows.verdict`, and `vows.witness_declined`. Rationale: a calendar-based "expired" contradicts the "Unbreakable Vow" brand promise. `vows.witness_token_expires_at` is **deprecated as a behavioral driver** (token never expires by TTL). See `IMPLEMENTATION-V6.md` §3.2 for the full router logic and all four variants (S19-OUTCOME-RESOLVED, S19-DECLINED, S19-VOIDED [no mock yet — side-by-side gate], S19-EXPIRED).

**Mock Manifest (§2.5A) updated** — every screen above is now marked **V6** with the canonical file path and revision notes. The only remaining "no mock" screens are low-risk utility surfaces (S10.4, S10.7, S15, S20-EMPTY, S22, destination picker, settings, history, error states, modals catalogue, Cast `/cast` + `/c/[token]`, S7-WEB, **S19-VOIDED**). Those are covered by the §2.5A side-by-side merge gate plus the new §A rule 9 in `CLAUDE-CODE-PROMPT.md` which forces Claude Code to draft and post a mock in the PR thread for explicit Joe sign-off before writing the screen file.

### 2.2 🟡 Brand assets that don't exist yet

- [ ] **Wordmark SVG** — does a final "UNBREAKABLE VOW" wordmark file exist? Needed in PR #1 for the home/dashboard header.
- [ ] **Wax seal SVG** — referenced as a primitive everywhere. Confirm the SVG (sizes sm/md/lg) exists and matches §2.4 halo animation spec.
- [ ] **Trophy SVG** (M11)
- [ ] **Shield SVG** with red+gold heraldic styling (M11B) — Joe's described it; needs to exist
- [ ] **Heraldic ban glyph** (M11B receipt row)
- [ ] **Broken seal SVG** (vow-broken outcome screens)
- [ ] **Broken-seal-with-shield-overlay** (vow-broken cause-you-hate variant)
- [ ] **Gold flame SVG** (replacing 🔥 emoji on streak rows)
- [ ] **Gavel glyph** (S18 verdict-broken guard modal)

If any of these don't exist, **ship a placeholder during PR #3 with a TODO comment**, and have a designer (or you in Cowork with image-gen) produce them in parallel. Don't let SVG production block screen code.

### 2.3 🟡 Domain & infrastructure

- [ ] **`unbroken.vow`** — domain registered? Zone configured? SSL?
- [ ] **`hello@unbroken.vow`** — support inbox monitored?
- [ ] **Twilio account** with A2P 10DLC kit accessible? (Need this Day 1 of PR #1.)
- [ ] **Stripe live mode** keys + webhook endpoints
- [ ] **Apple Push Notification certificates** (APNs) renewed and Expo-configured
- [ ] **Supabase project** has `pg_cron` extension enabled
- [ ] **Sentry** project created, DSN ready for both `/web` and `/expo`
- [ ] **PostHog** (or chosen analytics) project created, write key ready

### 2.4 🟡 Legal copy

- [ ] **Terms of Service** drafted and live at `/terms`
- [ ] **Privacy Policy** drafted and live at `/privacy`
- [ ] **Stripe disclosure copy** at seal time — exact wording for §9.2 dispute mitigation
- [ ] **A2P 10DLC sample messages** — the §4.3 templates verbatim, ready to paste into Twilio Trust Hub form

### 2.5 🟡 The four-moment cinematic — engineering spike

**Recommendation: BEFORE handoff to Claude Code, do a 1-day spike** where Claude (in Cowork) builds a working prototype of the cold-open in a CodeSandbox or local Expo project. The two-screen sequence with a 1.2s black gap, Fraunces italic, skip behavior — this is the brand-defining moment of the app and you want to *see it work* before relying on Claude Code to nail it from spec.

Same for the Initiation Oath (interactive seal placement). The spec describes it but you've never seen it move.

If the prototype reveals the spec needs tightening (timing curves, gesture thresholds, haptic timing), patch the spec before handoff. If it works on first try, great — the spec is good enough.

---

## 3. What Claude Code might still get wrong even with the spec

These are the failure modes that even a great spec doesn't fully prevent. Mitigations are inline.

### 3.1 The "almost right" trap on hero copy

**Risk:** Claude Code reads the Fraunces italic spec and uses Times italic instead. Or sets line-height 1.2 instead of 1.0 on the H1. The screen will look 95% right and 5% wrong, and that 5% is exactly where the brand lives.

**Mitigation:** the §10.1 visual fidelity gate. Plus: in PR #1 we ship a `/_dev/typography` page that renders every type-scale entry from §2.2 against a mock of itself, so any drift is caught immediately, not after 30 screens.

### 3.2 The notify-direct trap

**Risk:** Claude Code is implementing a new screen, needs to send a push, doesn't notice the `notifyMaker()` helper, calls `sendPush` directly. Six months from now, users get push + SMS dupes for that one event, and we don't know why.

**Mitigation:** the §10.1 audit + PR #5 grep gate. Also: ESLint rule that bans direct imports of `sendPush` and `sendSms` from anywhere except `_shared/notify.ts`. Add this to PR #2.

### 3.3 The migration partial-rollback trap

**Risk:** the §4.1 migration is large. If it half-runs, the schema is corrupt. Claude Code might not write it as a single transaction.

**Mitigation:** add to the prompt that the migration MUST be `BEGIN; ... COMMIT;` wrapped, AND must have a corresponding `down.sql` that fully reverses it. PR #1 doesn't merge until both are present and tested.

### 3.4 The Cast vs self-vow refund logic confusion

**Risk:** Cast vows have the same refund logic as self-vows (kept = refund, broken = destination), but the *recipient* of the refund is different (maker, who is also the witness, in Cast). Easy to get wrong.

**Mitigation:** §3.10.3 C4 explicitly calls this out, but worth adding an integration test in PR #2 that exercises: Cast → kept → refund to maker; Cast → broken → destination receives. Same test suite must cover both refund flows.

### 3.5 The witness identity language drift

**Risk:** Claude Code, generating new copy for an error state or empty state, writes "your judge" instead of "your witness" or vice versa. The §1.1 decision is "witness for identity, judge for the verdict verb only."

**Mitigation:** add a CI lint rule to PR #1 that grep-checks for the wrong word in the wrong context. Cheap to write, catches drift.

### 3.6 The "I'll just add a flag" drift

**Risk:** Claude Code hits a tricky behavior fork ("should this fire now or later?") and adds a feature flag instead of asking. Six flags later, the codebase has unmaintainable conditional logic.

**Mitigation:** in the prompt, add a rule: "feature flags are not a default solution. If you want to add one, propose it to me first." Catches the drift at the source.

---

## 4. The exact handoff sequence

Once everything in §2 is green, hand to Claude Code in this order:

1. Open Claude Code in `/sessions/elegant-blissful-fermi/mnt/rork-unbreakable-vow`
2. Paste **§A** of `CLAUDE-CODE-PROMPT.md` as the first message
3. Wait for Claude Code's summary + ambiguity list
4. **Resolve every ambiguity in chat** before greenlighting PR #1. If three ambiguities turn into eight, that's a signal to patch the spec first, not to power through.
5. Greenlight PR #1. Use the §B follow-up prompts at each gate.
6. At PR #2 end, confirm A2P submitted.
7. At PR #5 end, run §10.4 + §10.2 manual QA.

Total wall-clock: ~4 weeks per the §9.1 sequencing, assuming Claude Code is the only engineer and runs the PRs serially. Could parallelize PR #2 and PR #3A if you have a second hand on deck.

---

## 5. Recommended additional Cowork sessions before handoff (in priority order)

These are the highest-leverage things we can do *here* before opening Claude Code:

### Priority 1 — Mock production sprint (2–4 hours)
Draft HTML mocks for M11, M11B, vow-broken (×2), certificate, multi-vow dashboard. Render PNGs. You approve. Now Claude Code has a real spec to match for the most consequential screens.

### Priority 2 — Cold-open + Initiation Oath prototype (4 hours)
Build a working two-screen cold-open in a sandbox. Verify timing, verify the 1.2s gap *feels* right at the actual frame rate, verify the skip target is discoverable. Same for the seal-placement oath. Patch §3.0 spec with anything you learn.

### Priority 3 — Brand asset production (2 hours)
Generate / commission the missing SVGs from §2.2. Wax seal, trophy, shield, broken seal, gavel, flame. Even AI-generated draft assets are better than placeholders for Claude Code to work against.

### Priority 4 — Legal copy + Stripe disclosure pass (1 hour)
Draft ToS, privacy policy, seal-time disclosure. Doesn't have to be production-final, but should exist as draft text in `/web/src/app/terms/page.tsx` and `/privacy/page.tsx` so Claude Code doesn't have to write legal copy.

### Priority 5 — Twilio + Stripe + Sentry account setup (2 hours)
You do this. Get keys, register Brand for A2P, configure webhooks, create projects. Document in a `.env.example` that Claude Code reads.

### Priority 6 — A "first-look video" of the V6 ideal experience
Optional but powerful: record a 60-second screen recording of yourself walking through the V6 flow in Figma/HTML mocks, narrating what should feel right. Drop the video in the repo. This is the kind of context Claude Code can't get from text alone.

---

## 6. The minimum to one-shot

If you want to ship the absolute minimum pre-work and still get a clean one-shot:

- ✅ Doc patches (done above)
- 🔴 Mocks for M11 + M11B + dashboard (3 screens; ~2 hours in Cowork)
- 🔴 Domain + Twilio + Stripe accounts ready
- 🔴 SVG assets for wax seal + trophy + shield + broken seal (placeholders fine for the rest)
- 🔴 ToS / Privacy / Stripe disclosure drafted

That's the floor. With those done, the one-shot has a real chance.

---

## 7. The ceiling

If you do everything in §5, the one-shot becomes uncannily likely. Most plans don't fail because of code quality — they fail because the spec was vague at the moment of decision. Every hour you spend tightening the spec saves three hours of Claude-Code-asks-then-waits.

**The spec is now ~2,900 lines and covers every screen, every flow, every notification, every backend job, every QA gate, and the brand-voice rules that govern all the copy. The remaining gaps are visual (mocks for the most-consequential outcome screens) and operational (accounts, domain, legal). Both are 1-hour tasks.**

You're closer to the one-shot than the doc length suggests.
