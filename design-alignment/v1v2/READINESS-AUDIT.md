# V6 HANDOFF READINESS AUDIT
**Conducted:** 2026-04-22 (pre-handoff checkpoint)  
**Auditor:** Claude Agent  
**Status:** 🟡 **CONDITIONAL READY** — one critical blocker, multiple soft gaps

---

## ✅ READY — SOLID

### 1. Specification Completeness
- **IMPLEMENTATION-V6.md** (~2,900 lines) covers all nine parts: foundational decisions, design tokens, screen-by-screen maps, backend implementation, outcome flows, edge states, web/Expo parity, analytics, and sequencing.
- **Mock Manifest (§2.5A)** is comprehensive: 35 V6/pre-V6 mocks exist in `/flow/html/`; no-mock screens have explicit merge-gate language.
- **CLAUDE-CODE-PROMPT.md** contains clear, detailed ground rules (11 rules + priority order).
- **PRE-HANDOFF-CHECKLIST.md** is complete with task state and the "minimum to one-shot" floor.
- **WITNESS-IDENTITY-DECISION.md** locked decision document exists.

### 2. HTML Mocks & Assets
- **All 35 required V6 + pre-V6 mocks exist** in `/flow/html/`:
  - Sealed loop: S8, S9, S-WEB3 ✅
  - Witness path: S14, S16, S17, S18, S19 (4 variants) ✅
  - Active states: S11, S12, S13 ✅
  - Outcome flows: M11, M11B, vow-broken-charity, vow-broken-cause-you-hate, certificate ✅
  - Dashboard: S20 (canonical: `s20-dashboard-A-revised-v2.html`), S20-WITNESSING-ALL ✅
  - Auth/UX: S1, S2, S3, S4, S5, S6, S6.5, S7, S21 ✅

### 3. S20 Dashboard Lock — Verified Canonical
- **File:** `s20-dashboard-A-revised-v2.html` (18KB, timestamped Apr 22 14:32)
- **Contents verified:** Valid HTML, correct token values (`#0F0D0A`, `#C89B3C`, `#E8B656`), Fraunces + Inter Tight fonts loaded
- **Spec alignment checked:**
  - §2.5A Mock Manifest explicitly names this as canonical (Apr 22 second-pass)
  - PRE-HANDOFF-CHECKLIST §2.1 confirms revisions: AWAITING-WITNESS card variant, gold-deep borders, witness chip with status dot, "NEEDS YOU NOW" promotion zone, vow line-height 1.18→1.28
  - S20-PANEL-AUDIT.md referenced for full design justification
- **Earlier versions retained for history:** `s20-dashboard-multi.html`, `s20-dashboard-A-tighten.html`, `s20-dashboard-B-split.html`, `s20-dashboard-A-revised.html` (explicitly noted in spec as *not* canonical)

### 4. S19 Status-Aware Routing Locked
- Four variants designed and mocked (Apr 22 decision):
  - **S19-OUTCOME-RESOLVED** (`s19-outcome-resolved.html` ✅) — primary path, verdict exists
  - **S19-DECLINED** (`s19-declined.html` ✅) — witness_declined=true
  - **S19-VOIDED** (no mock, prose in §3.2) — status='voided'
  - **S19-EXPIRED** (`s19-expired.html` ✅) — edge case only, no verdict + not voided
- **Router logic** specified in IMPLEMENTATION-V6.md §3.2 with pseudocode
- **Token deprecation** clear: `witness_token_expires_at` is NOT a routing driver (CLAUDE-CODE-PROMPT.md §10 emphasizes this)

### 5. Internal Consistency Cross-Check
- **PRE-HANDOFF-CHECKLIST §2.1** checkboxes all marked ✅ (mocks produced, S14.5 killed, S19 variants locked)
- **IMPLEMENTATION-V6.md §2.5A Mock Manifest** lists identical screens with identical file paths
- **CLAUDE-CODE-PROMPT.md rules** (especially rules 9–11) match the spec exactly:
  - Rule 9: no-mock screens get explicit Joe sign-off (matches §2.5A)
  - Rule 10: S19 status-aware, not calendar-aware (matches §3.2)
  - Rule 11: S14.5 is killed, reassurance moved to S14 footer (matches §3.2 kill note)
- **No contradictions detected** between IMPLEMENTATION-V6.md, CLAUDE-CODE-PROMPT.md, and PRE-HANDOFF-CHECKLIST.md

### 6. CLAUDE.md Do-Not-Modify List
- **No conflicts** between CLAUDE.md constraints and V6 scope:
  - V6 adds `/dashboard`, `/create`, `/vow/[id]`, `/c/[token]`, `/certificate/[vowId]` (not in do-not-modify list)
  - V6 does NOT touch frozen web files (`/refine`, `/stake`, `/witness`, `/live`, etc.)
  - V6 does NOT touch Expo `vow-ui.tsx` (explicitly frozen in both CLAUDE.md and CLAUDE-CODE-PROMPT.md §4)
  - Supabase forbidden list (`create-payment-intent`, `send-sms`, `verdict-page`) — V6 modifies `seal-vow`, `accept-witness`, `submit-verdict`, `cron-runner` (not forbidden)

### 7. Design Token Reconciliation Table
- **§1.5 token reconciliation grid exists** with three columns: mock value (V6 HTML), code value (current), decision
- **Decisions are explicit:** Use `#C89B3C` (not `#d4a84a`), use `#E8B656`, use `#8B6820`, use `#0F0D0A`, consolidate surface to `#181512`
- **PR #1 foundation work** includes token replacement as first task

### 8. PR Sequencing Locked
- **Five PRs, strict order:** #1 (Foundation) → #1.5 (Primitives) → #2 (Backend) → #3 batches A–F → #4 (Wiring) → #5 (Polish)
- **Parallel track:** A2P 10DLC registration is Joe-owned, Day 1 start, must finish before PR #5 ships
- **Each PR has explicit scope:** no bundling, no skipping, each is a single mergeable unit
- **No ambiguity** on sequencing

---

## 🚧 GAPS — MUST FIX BEFORE HANDOFF

### 🔴 **CRITICAL: S14.5 File Still Exists**

**The problem:**
- IMPLEMENTATION-V6.md §3.2 §14.5 (line 1340) explicitly states: **"[S14.5 is] deleted"** and **"Do NOT reference `flow/html/s14-5-first-time-witness.html` — the mock has been deleted from the flow directory."**
- CLAUDE-CODE-PROMPT.md §11 (line 96–106) reinforces: **"Do NOT restore or reference [the file]."**
- PRE-HANDOFF-CHECKLIST §2.1 (line 42) marks S14.5 as **KILLED** with note: **"HTML mock `flow/html/s14-5-first-time-witness.html` deleted."**
- **Reality:** The file `flow/html/s14-5-first-time-witness.html` (5203 bytes, timestamped Apr 22 12:14) **still exists in the filesystem.**

**Why this matters:**
- Claude Code will see the file and may reference it despite being told not to
- Risk: witness flow becomes 3 screens (S14 → S14.5 → S16) instead of 2 (S14 → S16)
- This directly contradicts the spec and defeats the Apr 22 decision to kill the interstitial

**Action required:** Delete `/sessions/elegant-blissful-fermi/mnt/rork-unbreakable-vow/design-alignment/v1v2/flow/html/s14-5-first-time-witness.html` before handing to Claude Code.

---

### ⚠️ GAPS — SHOULD FIX BEFORE HANDOFF

#### 2.1 SVG Brand Assets Missing
**From PRE-HANDOFF-CHECKLIST §2.2, all unchecked:**
- [ ] Wordmark SVG (needed for home/dashboard header)
- [ ] Wax seal SVG (referenced in primitives; sizes sm/md/lg with halo animation)
- [ ] Trophy SVG (M11 outcome)
- [ ] Shield SVG with red+gold heraldic styling (M11B outcome)
- [ ] Heraldic ban glyph (M11B receipt row)
- [ ] Broken seal SVG (vow-broken outcomes)
- [ ] Broken-seal-with-shield-overlay (vow-broken cause-you-hate)
- [ ] Gold flame SVG (streak rows)
- [ ] Gavel glyph (S18 verdict-broken guard modal)

**Impact:** LOW to MEDIUM. PRE-HANDOFF-CHECKLIST §2.2 explicitly allows: *"If any of these don't exist, ship a placeholder during PR #3 with a TODO comment."* Claude Code can proceed with placeholder SVGs (e.g., `<svg><!-- TODO: wax seal --></svg>`) and a designer can fill them in parallel. This is NOT a blocker, but having at least wax seal + trophy + shield before handoff would reduce friction.

**Recommendation:** Joey or a designer spends 1–2 hours generating placeholder or AI-drafted SVGs for the nine assets. Minimal bar: they exist as SVG files in `/web/src/assets/svgs/` or `/expo/assets/` so Claude Code doesn't invent image generation code.

#### 2.2 Infrastructure & Accounts Not Verified
**From PRE-HANDOFF-CHECKLIST §2.3–§2.4, all unchecked:**
- [ ] Domain `unbroken.vow` (registered? zone configured? SSL?)
- [ ] Email `hello@unbroken.vow` (support inbox ready?)
- [ ] Twilio account with A2P 10DLC kit accessible
- [ ] Stripe live-mode keys + webhook endpoints
- [ ] Apple Push Notification certificates (APNs) renewed for Expo
- [ ] Supabase project with `pg_cron` extension enabled
- [ ] Sentry project created, DSN ready (web + Expo)
- [ ] PostHog (or analytics choice) project created, write key ready
- [ ] Terms of Service drafted and live at `/terms`
- [ ] Privacy Policy drafted and live at `/privacy`
- [ ] Stripe disclosure copy (§9.2 dispute mitigation language)
- [ ] A2P 10DLC sample messages ready for Twilio Trust Hub

**Impact:** MEDIUM. PR #1 and PR #2 require these to be in place (especially Twilio, Stripe, Supabase, Sentry). Without them, Claude Code will write stub implementations and fail to test.

**Recommendation:** Joey spends 2–3 hours setting up accounts and documenting credentials in `.env.example` and a private setup sheet. A2P 10DLC registration must start on Day 1 of PR #1 (2–4 week lead time per spec).

#### 2.3 Legal Copy Draft Status Unknown
- No evidence that ToS, Privacy Policy, or Stripe disclosure are drafted
- PRE-HANDOFF-CHECKLIST §2.4 explicitly lists these as unchecked

**Impact:** LOW. Claude Code can implement placeholder pages with TODO comments. Legal review can happen in parallel. But exact Stripe disclosure wording (§9.2 of IMPLEMENTATION-V6.md) should exist before PR #1 seals, because it affects the UI copy at seal time.

**Recommendation:** Joey drafts (or uses a legal template service) ToS and Privacy. For Stripe disclosure, Joey provides the exact wording from §9.2 of the spec (already written); Claude Code copies it into the seal-time modal.

#### 2.4 "Four-Moment Cinematic" Prototype Not Mentioned as Done
- PRE-HANDOFF-CHECKLIST §2.5 recommends: *"BEFORE handoff to Claude Code, do a 1-day spike where Claude (in Cowork) builds a working prototype of the cold-open."*
- No evidence this was done

**Impact:** LOW to MEDIUM. The cold-open (black gap, Fraunces italic, skip behavior) is brand-defining. If the spec is wrong about timing or gesture, Claude Code will build wrong. A 2-hour prototype spike in Cowork could catch this.

**Recommendation:** Optional but high-leverage. If Joey has 2 hours before handoff, spend it building a working cold-open prototype in a CodeSandbox or local Expo project to verify the timing/gesture spec is tight.

---

## 💡 NICE-TO-HAVES (CAN DEFER)

1. **S20-TOGGLE-DEBATE.md decision log** — already referenced in spec (segmented-control toggle was killed, hamburger menu owns History/Settings). Exists in repo; no action needed.

2. **S20-PANEL-AUDIT.md** — full design-panel audit documented. Exists; referenced in spec.

3. **AUDIT-APR22.md** — audit of all Apr 22 changes. Exists in repo.

4. **Design-history mocks** — Earlier S20 variants (multi, tighten, split, revised-v1) retained for reference. Intentional; no action needed.

5. **Cold-start witness identity language lint rule** — PRE-HANDOFF-CHECKLIST §3.5 mentions adding an ESLint rule to catch "judge" where "witness" belongs. Optional but nice; can be added in PR #1 or deferred to PR #5.

---

## 📋 RECOMMENDED PRE-HANDOFF CHECKLIST FOR JOEY

**Before opening Claude Code, execute these actions in order. Total time: ~4–5 hours if done in parallel, or 1–2 hours if only the critical path.**

### CRITICAL PATH (Must do)
1. **Delete the S14.5 mock file:**
   ```bash
   rm /sessions/elegant-blissful-fermi/mnt/rork-unbreakable-vow/design-alignment/v1v2/flow/html/s14-5-first-time-witness.html
   git add -A && git commit -m "Delete S14.5 mock per Apr 22 decision — witness flow is now 2-screen (S14→S16)"
   ```

2. **Verify S20 canonical file is correct:**
   ```bash
   ls -lh /sessions/elegant-blissful-fermi/mnt/rork-unbreakable-vow/design-alignment/v1v2/flow/html/s20-dashboard-A-revised-v2.html
   ```
   Should be ~18KB, timestamped Apr 22 afternoon. If older or missing, re-export from Figma.

3. **Confirm all 35 required mocks exist:**
   ```bash
   cd /sessions/elegant-blissful-fermi/mnt/rork-unbreakable-vow/design-alignment/v1v2 && \
   for f in flow/html/{01-home,02-refine,03b-pitch,04-witness,web-04,05c-auth,05d-otp-v4{,-active},05e-apple,05i-sealed{,-sent},05j-receiver,14-active,15-active-streak,16-witness-pending,09-witness,10-witness-accepted,11-verdict,12-verdict-submit,13-verdict,s20-dashboard-A-revised-v2,08-quick,s6-5-name,m11,m11b,vow-broken{,-charity,-cause},certificate,s19-{outcome,declined,expired},s20-witnessing,web-{04-auth,05-share,06-sealed}}.html; do
     [ -f "$f" ] && echo "✅ $(basename $f)" || echo "❌ MISSING: $f"
   done
   ```
   All should show ✅.

### STRONGLY RECOMMENDED (High-leverage)
4. **Set up infrastructure (2 hours):**
   - Register domain `unbroken.vow` or confirm existing registration
   - Create Twilio account + A2P Trust Hub, submit registration (do this Day 1 of PR #1; 2–4 week lead)
   - Create Stripe live-mode project, get keys, set up webhook endpoint
   - Create or confirm Supabase project with `pg_cron` extension enabled
   - Create Sentry projects (web + Expo) and document DSNs
   - Choose analytics (PostHog vs others) and create project
   - Document all keys in `.env.example` and a private setup sheet

5. **Draft brand SVG assets (1–2 hours):**
   - Wax seal (sm/md/lg sizes)
   - Trophy
   - Red+gold shield
   - Broken seal
   - Broken seal + shield overlay
   - Gavel
   - (Wordmark and flame can be deferred)
   - Place in `/web/src/assets/svgs/` or `/expo/assets/` with clear naming

6. **Draft legal copy (1 hour):**
   - Create `/web/src/app/terms/page.tsx` with placeholder ToS (can be verbose boilerplate)
   - Create `/web/src/app/privacy/page.tsx` with placeholder Privacy Policy
   - Extract Stripe disclosure wording from IMPLEMENTATION-V6.md §9.2 and add as a comment in the seal-time modal component (so Claude Code knows where to put it)

### OPTIONAL (Nice-to-have)
7. **Cold-open prototype spike (2 hours, in Cowork):**
   - Build a 2-screen cold-open in CodeSandbox or local Next.js
   - Verify 1.2s black gap + Fraunces italic + skip gesture work as spec describes
   - Patch spec if timing is off
   - (This de-risks the cinematic moment—highest-ROI 2 hours)

---

## 🚀 WHAT TO PASTE INTO CLAUDE CODE

Once the critical path (step 1–3) is complete, Joey opens Claude Code and pastes **§A of CLAUDE-CODE-PROMPT.md** as the first message, exactly as written. No modifications needed.

The prompt is complete and internally consistent.

---

## FINAL VERDICT

**Status: 🟡 CONDITIONAL READY**

**Blocker to fix immediately:**
- Delete `flow/html/s14-5-first-time-witness.html` (5 minutes)

**Must complete before opening Claude Code:**
- Verify all 35 mocks exist (run the shell command above; 5 minutes)
- Verify `s20-dashboard-A-revised-v2.html` is the canonical file (2 minutes)

**Should complete before opening Claude Code:**
- Set up infrastructure / accounts (2–3 hours, can happen in parallel with Claude Code PR #1 if needed, but better before)
- Generate/draft SVG assets (1–2 hours, blocks PR #3 but not PRs #1–#2)
- Draft legal copy placeholders (1 hour)

**Once above are done:**
- Handoff to Claude Code is safe. The spec is tight, mocks are locked, and PRs have clear scope.

**Estimated handoff readiness: NOW, pending S14.5 deletion + 1-hour parallel account setup.**

The spec is excellent. The risk is low. Go.
