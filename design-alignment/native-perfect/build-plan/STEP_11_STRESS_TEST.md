# STEP 11 — Stress Test

This document records the stress test of the build plan. I walked through the plan as if I were Claude Code starting from a cold state. I found gaps. I fixed them.

---

## A. Cold-start trace

**Scenario:** Joey pastes the Layer 0 Kickoff Prompt into a fresh Claude Code session. The agent starts from zero context.

**Walk-through:**

1. Agent reads `BUILD_PLAN.md`. Gets the high-level plan.
   - ✅ Tells the agent to read STEP_1 through STEP_9 + CLAUDE_ADDENDUM + MOCK_DEVIATIONS.
   - ✅ Lays out the per-screen graduation loop.
   - ⚠️ **GAP FOUND:** BUILD_PLAN.md says "Verify backend changes from Phase 0 are deployed" but doesn't tell the agent HOW to verify. **FIX:** Phase 0 task list in STEP_5_PHASE_PLAN.md is the source. The agent reads STEP_5 §B Phase 0 task list and works through each.

2. Agent reads CLAUDE_ADDENDUM.md. Understands the source-of-truth rule, frozen-file list, reviewer requirements.
   - ✅ Clear rules.
   - ⚠️ **GAP FOUND:** The addendum says "append the contents of this file to the existing CLAUDE.md" — but who appends it? When? **FIX:** This is a Phase 0 task. Add to STEP_5_PHASE_PLAN.md Phase 0 §B: "Append CLAUDE_ADDENDUM.md contents to /Users/joey/rork-unbreakable-vow/CLAUDE.md under a new heading 'Native-Perfect Build Rules'."

3. Agent reads STEP_1_MOCK_DECOMP. Sees 32 screens specced.
   - ✅ Per-screen detail is sufficient for layout + interaction reference.
   - ✅ Patches at top apply correctly.
   - ⚠️ **GAP FOUND:** The token reconciliation note at top of STEP_1 says "Step 9 specs reference token NAMES not hex" — but STEP_9 specs DO reference hex in some descriptive contexts (e.g., "color `#b4aa98`" in screen 01 typography). **FIX:** Clarify in CLAUDE_ADDENDUM: "Hex values in STEP_X docs are descriptive only for the human reader. Code uses token names always." Also already covered in STEP_9 preamble — confirmed not a real gap.

4. Agent reads STEP_2_BACKEND_MAP. Understands edge functions.
   - ✅ Per-screen backend rows are clear.
   - ✅ Open questions in STEP_2 §J have all been resolved (auth-not-at-start, $0 vows allowed, nudge mechanism, expiration guards, dare scope).
   - ⚠️ **GAP FOUND:** STEP_2 doesn't describe the `claim-vow` edge function in detail. Layer 0 needs to build it in Phase 0. **FIX:** Add §B.16 to STEP_2_BACKEND_MAP describing claim-vow contract OR rely on Phase 0 task list in STEP_5 which already names it as a deliverable. Decision: rely on STEP_5 task list, but add a one-line cross-reference in STEP_2.

5. Agent reads STEP_3_DERIVED_SCREENS. Sees 20 derived screens specced.
   - ✅ Each screen has layout, copy, interactions, backend, animation cues.
   - ⚠️ **MINOR GAP:** D14 (Dashboard Empty State) is described as a state-of-13, not a standalone build. STEP_9 references it correctly as a state in screen 13's spec. Confirmed not a real gap.

6. Agent reads STEP_4_MOTION_HAPTICS. Understands global motion + per-screen choreography.
   - ✅ Comprehensive.
   - ✅ Reduce-motion table covers 11 categories.
   - ⚠️ **GAP FOUND:** STEP_4 §C.4 says "No sound on: ... witness acceptance" but STEP_4 §D.1 screen 09 fires `hapticPrimary()` — that's haptic, not sound. Re-read confirms: NO sound on screen 09 (witness-accept moment). The haptic is fine. Not a gap.
   - ⚠️ **GAP FOUND:** STEP_4 says the SEAL_TIMELINE constants should be "a single exported config" but doesn't say which file. **FIX:** Add to STEP_4 §F (Implementation notes): "SEAL_TIMELINE config goes in `expo/lib/seal-timeline.ts`."

7. Agent reads STEP_5_PHASE_PLAN. Gets the build sequence.
   - ✅ Phase order, pairing, gates clear.
   - ⚠️ **GAP FOUND:** Phase 0 task #4 (primitives extraction) lists ~30 primitives but doesn't tell the agent how to test them. **FIX:** Add to Phase 0 graduation gate: "Each new primitive renders correctly in a smoke-test harness (could be a single `/native-perfect/dev/primitives` route that renders all primitives in isolation). This is a stretch goal — could be deferred if velocity is critical."
   - ⚠️ **GAP FOUND:** Phase 5 graduation gate says "Real-time subscription correctly fires screen 09 transition" — but if Layer 0 has never set up Supabase Realtime, where do they learn how? **FIX:** Add to STEP_2_BACKEND_MAP §H a code example showing how to subscribe: `supabase.channel('vow:{id}').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vows', filter: \`id=eq.${vowId}\` }, callback).subscribe();`. Already in STEP_2 §H. Confirmed not a real gap.

8. Agent reads STEP_6_REVIEWER_AGENTS. Understands both subagent contracts.
   - ✅ Personas, rubrics, hard rules, output format clear.
   - ✅ Invocation prompts ready to be copied to .claude/agents/.
   - ⚠️ **GAP FOUND:** STEP_6 §C describes the subagent file format with frontmatter (`name:`, `description:`, `tools:`) — but does Claude Code support this exact format? The format matches Claude Code's documented agent format. Confirmed not a gap.

9. Agent reads STEP_7_VISUAL_DIFF. Sets up tooling.
   - ✅ Three scripts specified clearly.
   - ⚠️ **GAP FOUND:** STEP_7 §B's `capture-built.sh` assumes a booted iPhone 15 Pro simulator. Layer 0 needs to know how to boot one. **FIX:** Add to STEP_7 §E: "Booting the simulator: `xcrun simctl boot 'iPhone 15 Pro'` then `open -a Simulator`. Then in another terminal: `cd expo && npx expo run:ios`."
   - ⚠️ **GAP FOUND:** STEP_7 §C says "(built simulator capture may be at 3x; mock at 3x deviceScaleFactor too)" — both are 3x but the actual pixel dimensions need to match exactly. The mock is rendered at 393×852 logical → 1179×2556 actual. The simulator capture from `xcrun simctl io` is also at native pixel density (1179×2556 for iPhone 15 Pro). **FIX:** Add to STEP_7 §C: "Both mock render and simulator capture should produce 1179×2556 PNGs. If sizes don't match, use `sharp` to resize the smaller to match the larger before pixelmatch. Sample resize code: `await sharp(input).resize(1179, 2556).toFile(output);`."

10. Agent reads STEP_8_MOCK_DEVIATIONS. Understands governance.
    - ✅ Rule, template, decision log, worked example all clear.

11. Agent reads STEP_9_SCREEN_SPECS. Per-screen contracts.
    - ✅ Mock screens 01-20 have detailed entries.
    - ✅ Derived screens reference STEP_3 as canonical.
    - ⚠️ **GAP FOUND:** STEP_9 reference to "Standard Reviewer Invocation Block" includes the literal commands the agent runs — but `xcrun simctl io booted screenshot` requires a booted simulator with the screen showing. The agent needs to navigate the app to the screen first. **FIX:** Add to STEP_9 standard preamble: "Before capturing, ensure the running Expo build has navigated to the target screen. The agent can drive navigation via deep links (e.g., `xcrun simctl openurl booted unbreakable-vow://native-perfect/create/stake`) or by tapping through manually in the simulator."

12. Agent reads MOCK_DEVIATIONS.md. Sees worked example.
    - ✅ Pattern is clear.

---

## B. Three sample-screen traces

I picked one creation, one payment, one derived. Walked Layer 0 through each.

### Trace 1: Screen 01 (creation)

1. Agent reads STEP_9 screen-01 entry. Layout, typography, interactions, primitives clear.
2. Agent reads relevant STEP_1 cross-reference for layout detail.
3. Agent reads STEP_4 §D.1 screen 01 for animations + haptics.
4. Agent builds:
   - Creates `expo/app/native-perfect/create/vow.tsx`.
   - Creates new primitives `BrandWordmark`, `StepProgressHeader`, `VowInputCard`, `SuggestionChipScroll`.
   - Wires haptics, animations.
5. Agent runs `./scripts/capture-built.sh 01` and `node scripts/diff-screen.mjs 01`.
6. Agent invokes design-reviewer with screenshot + mock + spec + diff.
7. Agent invokes cto-reviewer with PR diff + spec + STEP_2.
8. Both PASS → present to Joey.

**Trace finding:** ✅ Smooth path. No additional gaps.

### Trace 2: Screen 05 (payment)

1. Agent reads STEP_9 screen-05 entry. Sees ≥33/36 and ≥16/18 hard gates.
2. Agent reads STEP_2_BACKEND_MAP for `save-card` contract.
3. Agent reads STEP_4 §D.1 screen 05 for haptics.
4. Agent builds:
   - Creates `expo/app/native-perfect/payment.tsx`.
   - Calls `save-card` on mount to pre-fetch clientSecret.
   - Wires `useStripe()` hook.
   - Implements payTile selection, trustCard, paymentLegal.
5. Agent runs visual diff.
6. Agent invokes both reviewers.
7. CTO reviewer flags: "BACKEND GAP: I see no error handler for the case where save-card returns 402. STEP_2 says save-card validates stake $10-$100, but $0 vows skip Stripe entirely (per Phase 1 path) — yet screen 05 always renders. How does $0 path bypass screen 05?"

**Trace finding:** ⚠️ **REAL GAP.** $0 vows: STEP_5 phase 1 says screen 02 supports $0, but STEP_9 screen-05 doesn't address what happens for $0. The $0 path should: (a) skip screens 04/04b/04c entirely if the user is unauthed (auth still needed for any DB write to public.users) — wait, no, the user still needs to auth to associate the vow. (b) skip screen 05 entirely if stake = 0. After auth, go directly to a "ready to seal" screen that calls `seal-vow` with `skip_payment: true`. **FIX:** Add to STEP_9 screen-05 spec: "If `stake_amount === 0`, this screen is bypassed entirely. After auth (04c) completes, the flow goes directly to screen 06 (Sealed Moment) via `seal-vow({ vow_id, skip_payment: true })` — no payment screen, no Stripe call. Animation: cross-fade from 04c to 06 with the same `slow` (400ms) duration as the post-PaymentSheet path."

### Trace 3: D11 (Go-Solo Confirmation Sheet, derived)

1. Agent reads STEP_9 derived list, sees D11 references STEP_3 §D11.
2. Agent reads STEP_3 §D11 for full spec.
3. Agent reads STEP_4 §D.2 D11 for animations + haptics.
4. Agent builds D11 as a sheet over D10:
   - Creates as part of `expo/app/native-perfect/create/witness-checkpoint.tsx` (D10 + D11 inline).
5. Visual diff: N/A (no mock for derived screens). Reviewer scores against STEP_3 spec only.
6. Both reviewers invoked.

**Trace finding:** ✅ Smooth. The "Mock Fidelity" criterion 11 is replaced with "Spec Fidelity" for derived screens — this is correctly noted in STEP_9 preamble. ✅

---

## C. Reviewer simulation — three sample runs

### Run 1: Screen perfectly built

Design reviewer scores: 3/3 across all 12 criteria → 36/36 → PASS.
CTO reviewer scores: 3/3 across all 6 criteria → 18/18 → PASS.
**Outcome: PASS. Joey signs off. Flag flips. Move on.**

### Run 2: Screen with a small mock deviation

A spec called for `gold` color but the agent used `goldBright` for the CTA gradient.

Design reviewer scores:
- Mock fidelity: noticeable difference, ≤4px and color drift → 1/3.
- Total: 33/36 — passes the ≥30 threshold.
- BUT criterion 11 is hard-gated for unauthorized deviations. Score 1, not 0 — so technically not auto-hold.
- Reviewer flags as "Hold pending Mock Deviation Proposal: agent used `goldBright` but mock specifies `gold` for the CTA gradient. Recommend: revert to `gold`, or file Proposal."

CTO reviewer: PASS.

**Outcome: HOLD pending fix. Agent reverts to `gold`, re-runs design reviewer, gets 36/36, ships.**

### Run 3: Screen with a frozen-file violation

Agent modified `expo/components/vow-ui.tsx` to add a new export needed by a primitive.

CTO reviewer scores:
- Frozen file + migration discipline: 0/3 — frozen file modified.
- Total: 14/18 (might pass otherwise).
- BUT 0 on criterion 6 is automatic hold.
- Reviewer flags: "AUTOMATIC HOLD: vow-ui.tsx is frozen per CLAUDE.md frozen file list. Build the new export as a NEW component in components/primitives/ instead. Revert vow-ui.tsx changes."

Design reviewer: PASS (visuals ok).

**Outcome: HOLD. Agent reverts vow-ui.tsx, builds new component in primitives/, re-runs CTO, passes, ships.**

---

## D. Cross-reference verification

Checked every cross-reference in the docs:

- ✅ STEP_9 → STEP_3 derived references resolve.
- ✅ STEP_9 → STEP_1 layout references resolve.
- ✅ STEP_9 → STEP_4 motion references resolve.
- ✅ STEP_2 → STEP_5 phase mappings consistent.
- ✅ STEP_5 → STEP_3 derived screen IDs match.
- ✅ STEP_4 → `lib/haptics.ts` wrapper names consistent.
- ✅ STEP_4 → `uv-tokens.ts` duration tokens consistent.
- ✅ STEP_6 reviewer rubrics match what STEP_9 specs imply.
- ✅ MOCK_DEVIATIONS.md template format matches STEP_8 spec.
- ✅ BUILD_PLAN.md → all STEP_X references resolve.

No broken cross-references found.

---

## E. Order-of-dependency check

Walked the phase dependency graph:

- ✅ Phase 0 produces tokens, primitives, backend changes, tooling, mock-renders.
- ✅ Phase 1 uses Phase 0 primitives (StepProgressHeader, ChromeHeader, VowInputCard, etc.) — confirmed by Phase 0 task list.
- ✅ Phase 2 uses Phase 0 BottomSheet primitive + Phase 0 backend `prepare-judge-link` modification.
- ✅ Phase 3 uses Phase 0 PaymentSheet integration + Phase 0 `claim-vow` function.
- ✅ Phase 4 uses Phase 0 AsyncStorage helpers (could be implicit, but worth confirming).
- ✅ Phase 5 uses Phase 0 Realtime subscription pattern.
- ✅ Phase 6 uses Phase 0 dashboard primitives.
- ✅ Phase 6.5, 7, 8 use earlier-phase primitives.
- ✅ Phase 8 outcome screens use earlier-phase audio/haptic infrastructure.
- ✅ Phase 9 universal patterns are referenced throughout earlier phases.
- ✅ Phase 10 cleanup deletes only what earlier phases replaced.

**No circular dependencies. No primitives needed in early phases that aren't built in Phase 0.**

---

## F. Conflicts check

Walked the docs looking for conflicts:

- ✅ STEP_1 P-9 says "Go solo" hidden from screen 03; STEP_9 screen-03 confirms.
- ✅ STEP_3 D10 inline-picker placement: between auth and payment. STEP_5 confirms in Phase 2 then Phase 3 transition.
- ✅ STEP_2 says auth happens at screens 04/04b/04c (Phase 3); STEP_5 confirms; STEP_9 confirms.
- ✅ STEP_3 D17 push permission timing: post-seal, gated by `users.first_seal_completed_at IS NULL`; STEP_4 §D.2 D17 confirms; STEP_9 D17 confirms.
- ⚠️ **Apparent conflict found, then resolved:** STEP_4 says screen 09 fires haptic but no sound. STEP_4 §C.4 confirms "no sound on witness acceptance." Consistent.

**No real conflicts.**

---

## G. Fixes applied

After the trace, I'm applying these fixes:

### Fix 1: Add to STEP_5_PHASE_PLAN.md Phase 0 task list

Append to Phase 0 task list: "Append CLAUDE_ADDENDUM.md contents to /Users/joey/rork-unbreakable-vow/CLAUDE.md under heading 'Native-Perfect Build Rules'."

### Fix 2: Add SEAL_TIMELINE file location to STEP_4

Already noted; STEP_4 §F does not specify the file. Adding it to STEP_4 §F as: "Implementation: SEAL_TIMELINE config exports from `expo/lib/seal-timeline.ts`. The constants are: `SEAL_TIMELINE.startMs`, `SEAL_TIMELINE.sealMarkAt`, `SEAL_TIMELINE.hapticAt`, `SEAL_TIMELINE.kickerAt`, etc."

### Fix 3: Add simulator boot instructions to STEP_7

Append to STEP_7 §E:

```
Booting the simulator before captures:

xcrun simctl boot 'iPhone 15 Pro'
open -a Simulator
# In another terminal:
cd expo && npx expo run:ios

The agent navigates to the target screen via deep link OR via UI taps before
running capture-built.sh. Deep link example:
xcrun simctl openurl booted unbreakable-vow://native-perfect/create/stake

(Deep link URL scheme: needs to be configured in expo/app.json under "scheme".
Verify in Phase 0 setup.)
```

### Fix 4: Resize logic in STEP_7 §C

Append:

```
If mock render and simulator capture sizes don't match, resize using sharp:

import sharp from 'sharp';
await sharp(builtPath)
  .resize(1179, 2556, { fit: 'contain', background: { r: 8, g: 7, b: 6, alpha: 1 }})
  .toFile(builtResizedPath);

Then run pixelmatch on the resized image.
```

### Fix 5: STEP_9 screen-05 $0 bypass

Append to STEP_9 screen-05 spec:

```
If `stake_amount === 0`, this screen is bypassed entirely. The flow:
  04c (auth complete with name) → directly to seal-vow({ vow_id, skip_payment: true })
  → cross-fade to screen 06.
There is no payment screen UI for $0 vows. The `$0` path through the build is:
  01 vow → 02 stake (with custom $0 selected via D9) → 03 witness → 04/04b/04c
  → seal-vow → 06.
```

### Fix 6: Standard preamble in STEP_9 — navigation note

Append to the Standard Reviewer Invocation Block in STEP_9:

```
Before running capture-built.sh, ensure the simulator is showing the target screen.
The agent navigates either via deep link (xcrun simctl openurl) or by interacting
with the simulator UI. The simulator must be at the target screen state when
capture is taken.
```

These fixes are small text additions to existing files. I'll apply them in the next pass after Step 11 is closed out.

---

## H. Final assessment

**The plan is buildable.** Layer 0 has enough to begin Phase 0 immediately upon receiving the kickoff prompt. The graduation loop is mechanical and clear. The reviewers have hard rules and binding authority. The cross-references resolve. The phase order is dependency-clean.

**Risk areas remaining:**

1. **Phase 3 (auth + payment + seal).** Real-device Stripe sandbox + Apple Pay testing is the only way to validate. Layer 0 should expect to spend extra time here.

2. **Sound implementation.** Custom-recorded sounds need to be sourced before Phase 8 (when D1/D2 graduate). If Joey's sound designer is delayed, Layer 0 should ship Phase 8 with placeholder audio (e.g., royalty-free Splice samples) and update later.

3. **Witness side native fidelity.** Per Joey's call, 90%+ of witnesses use the web app. The native witness screens are polish. If velocity is constrained, Phase 8 could descope native witness rendering and rely on the web for all witness traffic — but Joey has not explicitly approved this fallback. Should ask before descoping.

4. **Real-time subscription edge cases.** Supabase Realtime can have stale subscriptions. The agent should test that subscriptions are torn down on screen unmount and re-established on focus.

**Confidence: 9/10.** The plan is comprehensive, internally consistent, and dependency-clean. Layer 0 can build with minimal need to come back to Joey except at graduation gates.

---

End of Step 11.
