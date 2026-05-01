# BUILD_PLAN — Master Runbook

This is the document Layer 0 (Claude Code) reads first. It tells you what we're building, in what order, and how to graduate each screen.

---

## What we're building

Unbreakable Vow's native (Expo / iOS) app, rebuilt to top-3-app-competition quality, replacing the current `LiveWebShell` wrapper with fully native screens.

The 32 canonical mocks at `design-alignment/native-perfect/project-perfect-final-build-mocks.html` are the visual contract. The 20 derived screens (D1-D20) cover everything the mocks don't.

The product is a commitment app. A user makes a vow, stakes real money via Stripe, picks a friend (witness) who will judge whether they kept it. If broken, the stake goes to charity.

The bar is solemn, slightly dangerous, never gamified, never confetti.

## Why this build plan exists

The native app currently wraps the web app in a `WebView`. It feels like a webpage in a frame, not a native app. There's a parallel set of native screens (`expo/app/native-*.tsx`) gated behind a flag — they're partially built but visually not aligned with the new mocks.

This build plan replaces every screen of the wrapper with a native-perfect implementation that exactly matches the mocks. Then the wrapper is deleted.

## Read these documents in order

1. `STEP_1_MOCK_DECOMP.md` — every mocked screen described layout-by-layout.
2. `STEP_2_BACKEND_MAP.md` — which functions to call, what they return, what gets written.
3. `STEP_3_DERIVED_SCREENS.md` — every uncovered screen specced.
4. `STEP_4_MOTION_HAPTICS.md` — global motion/haptics/sound + per-screen.
5. `STEP_5_PHASE_PLAN.md` — build order, pairing, gates.
6. `STEP_6_REVIEWER_AGENTS.md` — both reviewer subagent contracts.
7. `STEP_7_VISUAL_DIFF.md` — tooling.
8. `STEP_8_MOCK_DEVIATIONS.md` — governance.
9. `STEP_9_SCREEN_SPECS.md` — per-screen build specs.
10. `MOCK_DEVIATIONS.md` — current deviation log (starts with worked example #1).
11. `CLAUDE_ADDENDUM.md` — extended rules.

## How a screen graduates

```
1. Build screen (per STEP_9_SCREEN_SPECS.md spec)
2. Render mock cell (Phase 0 generated PNGs in mock-renders/)
3. Capture built screen via ./scripts/capture-built.sh <id>
4. Compute diff via node scripts/diff-screen.mjs <id>
5. Invoke .claude/agents/design-reviewer.md  (parallel)
6. Invoke .claude/agents/cto-reviewer.md     (parallel)
7. If both PASS → present reports + screenshots to Joey
8. If either HOLDS → fix issues → re-run from step 3
9. Joey signs off → flip USE_NATIVE_PERFECT_<X> flag → commit
10. Move to next screen
```

The flag flip is the LAST commit in the screen's PR.

## Pairing schedule

Per `STEP_5_PHASE_PLAN.md`. 2 screens per checkpoint by default. Singletons for: 05, 05b, 06, every phase opener.

## Phase order

```
Phase 0 → Foundation (no UI ships)
Phase 1 → Maker creation core (01, 02, 02b, 02c, D9)
Phase 2 → Witness selection (03, 03b, 03b+, 03c, D10, D11)
Phase 3 → Auth + payment + seal (04, 04b, 04c, 05, 05b, 06, D12, D13, D17) ← HIGHEST RISK
Phase 4 → Post-seal share (07, 07B, 08, 08B, 08C)
Phase 5 → Active + verdict (09, 10, 11, 12)
Phase 6 → Dashboard (13, 13B + D14 inside 13)
Phase 6.5 → Settings + History (D19, D20)
Phase 7 → Power user (14, 15, 16, 16B)
Phase 8 → Witness side + outcomes (17-20, D1-D8, D18)
Phase 9 → Universal patterns (D15, D16)
Phase 10 → Final integration + LiveWebShell removal
```

## Phase boundary gates

Each phase's exit checklist is in `STEP_5_PHASE_PLAN.md` §B. Phase N+1 cannot start until Phase N's checklist passes AND Joey signs off as a unit.

## Failure modes

**Reviewer holds:** Fix issues, re-run reviewers from step 3. Don't shortcut. Don't argue. The reviewers' authority is binding.

**Joey rejects:** Treat as a hold. Read his notes carefully. Apply changes. Re-submit. If you don't understand his note, ask before fixing.

**Mock deviation needed:** STOP. Open a Mock Deviation Proposal in `MOCK_DEVIATIONS.md`. Wait for Joey's decision. Do not proceed without a logged decision. Default action when uncertain: match the mock.

**Backend gap:** CTO reviewer flags as "BACKEND GAP: …" — fix before the screen can graduate. Most backend gaps were resolved in Phase 0; new ones are rare. If you hit one, file an issue, propose the smallest possible fix, and wait for Joey's approval.

**Test flight breaks:** Roll back the most recent commit. Investigate. Fix. Test on real device before merging.

**Stripe sandbox issue:** Phase 3 has the highest risk. If TestFlight Stripe Apple Pay fails: don't ship Phase 3. Do real-device testing in Stripe sandbox + production mode separately. Verify in Stripe dashboard.

## Operating principles

1. **Concrete over abstract.** Use specific token names, durations, spring profiles.
2. **Verify, don't guess.** When unsure of an API, read the source or web search. Don't fake it.
3. **Match the mock.** Default action.
4. **Don't pad.** If a screen is fast to build, make it fast. Don't over-engineer.
5. **One screen at a time.** Don't pre-build multiple screens. Each gets the full graduation cycle.
6. **Reviewers are binding.** Their hold is a hold.
7. **Joey's note is authoritative.** When he gives feedback, treat it as a contract update.

## Layer 0 startup checklist

Before beginning any phase:

- [ ] Read this BUILD_PLAN.md in full.
- [ ] Read CLAUDE_ADDENDUM.md.
- [ ] Read STEP_1, STEP_2, STEP_3, STEP_4, STEP_5 (overview level).
- [ ] Skim the 32 mocks in the HTML file. Note which screens are in the current phase.
- [ ] Verify `.claude/agents/design-reviewer.md` and `.claude/agents/cto-reviewer.md` exist and are invokable.
- [ ] Verify `scripts/render-mocks.mjs`, `scripts/capture-built.sh`, `scripts/diff-screen.mjs` exist.
- [ ] Verify `mock-renders/` directory has 32 PNGs (Phase 0 produced).
- [ ] Verify backend changes from Phase 0 are deployed (anonymous_owner_token migration, prepare-judge-link mod, claim-vow function, expiration guards, cron cleanup).

## Pairing checklist before opening a graduation PR

For a 2-screen pair:
- [ ] Both screens implemented per their STEP_9 spec.
- [ ] Both screens have screenshot captured + diff report generated.
- [ ] Both reviewers invoked on both screens.
- [ ] Both reviewers report PASS on both screens.
- [ ] No frozen files modified.
- [ ] No raw `Pressable`/`TouchableOpacity` outside primitives.
- [ ] No `expo-haptics` import outside `lib/haptics.ts`.
- [ ] No hardcoded hex outside `uv-tokens.ts` / `globals.css`.
- [ ] PR diff attached, both reports attached, side-by-side images attached.

## What "good" looks like for each phase

**Phase 0:** Clean foundation. All primitives extracted, all helpers built, all backend changes deployed. No UI graduated.

**Phase 1-2:** First-time user can input a vow, set a stake (incl $0), pick a witness, defer, share-link, or trigger the witnessless checkpoint. End-to-end up through screen 03c.

**Phase 3:** Highest risk. Joey personally tests Apple Pay end-to-end on TestFlight before sign-off.

**Phase 4-6:** Post-seal experience polished. Dashboard works with real concurrent vows. Empty state correct.

**Phase 7-8:** Witness side functional. Dares list works. Outcome screens trigger correct sounds + haptics.

**Phase 9-10:** Universal error patterns. LiveWebShell deleted. App is fully native.

## Final exit

Phase 10 is the final exit. After Phase 10:
- TestFlight build is fully native.
- LiveWebShell is deleted (except `external-web` for push deep-links to web-only routes).
- Web QA pass complete (per Joey's #14 — last step).
- Joey signs off as the build exit.

This is the version submitted to the App Store.

## Contact

Joey is the design + product owner. He approves every screen graduation. He is also the only person allowed to approve a Mock Deviation Proposal.

Reviewers (design + CTO) have binding hold authority but no graduation authority — only Joey graduates.

---

End of BUILD_PLAN.
