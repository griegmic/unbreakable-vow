# CLAUDE.md Addendum — Native-Perfect Build Rules

This addendum extends the rules in `/Users/joey/rork-unbreakable-vow/CLAUDE.md` for the duration of the native-perfect rebuild. Append the contents of this file to the existing CLAUDE.md (under a new section "## Native-Perfect Build Rules") before Layer 0 begins.

These rules are in force for every Phase 1+ build. Violating any is an automatic graduation hold.

---

## Source of Truth

The HTML mocks at `design-alignment/native-perfect/project-perfect-final-build-mocks.html` are the absolute source of truth for the 32 mocked screens. Default to the mock in every case. Unauthorized deviation is automatic graduation hold.

For the 20 derived screens (D1-D20), `design-alignment/native-perfect/build-plan/STEP_3_DERIVED_SCREENS.md` is the source of truth.

For motion, haptics, and sound: `design-alignment/native-perfect/build-plan/STEP_4_MOTION_HAPTICS.md` is canonical. Spring profiles, durations, and timings are part of the contract.

For backend wiring: `design-alignment/native-perfect/build-plan/STEP_2_BACKEND_MAP.md` is canonical for which functions to call, which responses to expect, which AsyncStorage keys to set.

## Mock Deviation Process

If during build you encounter anything you would want to change about a mock or derived spec, STOP. Open a Mock Deviation Proposal in `design-alignment/native-perfect/build-plan/MOCK_DEVIATIONS.md` per `STEP_8_MOCK_DEVIATIONS.md`. Do not proceed until Joey's decision is logged. The bar to file a Proposal is "I would stake my reputation that this is better than the mock."

Default action when uncertain: match the mock.

## Reviewer Subagent Invocation

Both reviewer subagents (`.claude/agents/design-reviewer.md` and `.claude/agents/cto-reviewer.md`) MUST be invoked before any graduation PR is opened. Both must PASS before the screen graduates. The reports must be attached to the PR.

If either reviewer holds, fix the issues and re-run both reviewers.

## Graduation Loop

Per `STEP_5_PHASE_PLAN.md` and `STEP_6_REVIEWER_AGENTS.md` §D, the per-screen build loop is:

```
1. Build screen
2. Render mock cell (Phase 0 already produced these PNGs)
3. Capture built screen from booted iOS Simulator
4. Compute visual diff
5. Invoke design reviewer
6. Invoke CTO reviewer (in parallel with design)
7. If both PASS → present to Joey for sign-off
8. If either HOLDS → fix → re-run from step 3
9. Joey signs off → flip USE_NATIVE_PERFECT_X flag → commit
10. Move to next screen
```

The flag flip is the LAST commit of any screen graduation PR. Never first.

## Screen Pairing & Singleton Rule

Per `STEP_5_PHASE_PLAN.md` §A.4: 2 screens per checkpoint by default. Singletons for: 05, 05b, 06, all phase openers (the first screen of each phase), and the explicit singleton-marked screens in §B.

A pair graduates as a unit — both screens must pass before either flips its flag.

## Phase Boundary Gates

Phase N+1 cannot begin until Phase N's exit checklist passes (see each phase's "graduation gate" subsection in STEP_5_PHASE_PLAN.md).

Exception: Phase 6.5 (settings/history mini-phase) blocks Phase 7 (power user). Phase 7 blocks Phase 8 (witness side + outcomes).

The hard gate: Phase 3 (auth + payment + seal) MUST complete fully before Phase 4 begins. End-to-end seal-flow correctness is foundational.

## Frozen Files (Augmented for Native-Perfect)

The frozen files list from CLAUDE.md remains frozen. Additionally, during the native-perfect build:

- `design-alignment/native-perfect/project-perfect-final-build-mocks.html` — frozen. The agent does not modify mocks.
- `design-alignment/native-perfect/build-plan/STEP_*.md` — frozen during build (these are contracts, not living docs). Update only if Joey explicitly approves a contract change.
- `design-alignment/native-perfect/build-plan/MOCK_DEVIATIONS.md` — append-only via approved Proposals.

## File Structure for Native-Perfect Code

All new screens go under `expo/app/native-perfect/` per `STEP_9_SCREEN_SPECS.md` final §. New primitives go under `expo/components/primitives/`. New scripts under `scripts/`. New subagents under `.claude/agents/`.

The legacy `expo/app/native-*.tsx` files (native-quick-vow, native-seal, native-dashboard, native-vow-detail, native-guided) are deprecated by the native-perfect build. Delete them in Phase 10 cleanup.

The `LiveWebShell` component remains in use until Phase 10. Then it's deleted (with one exception: `external-web` route may remain for push-notification deep links to web-only routes).

## Continuous Shipping

Per Joey's #15 decision: each graduated screen flips its `USE_NATIVE_PERFECT_X` flag default-on in production EAS profile. TestFlight builds pick up flag changes the next time we build. TestFlight users see a hybrid (native + LiveWebShell) for weeks. This is acceptable.

No public marketing or external user invites until Phase 10 graduates.

## Backend Modifications

Phase 0 introduces specific backend changes:
- Migration: add `vows.anonymous_owner_token text` column.
- Modify `prepare-judge-link` edge function: accept anonymous drafts.
- New edge function: `claim-vow`.
- Add witness-token expiration guards to `accept-witness` and `submit-verdict`.
- Verify or add `cron-runner` orphan-draft cleanup at 24h.

After Phase 0, no further edge function modifications are anticipated. If a screen build reveals a backend gap, the CTO reviewer flags it with "BACKEND GAP: …" — fix it before the screen can graduate.

## No Hardcoded Values

Per existing CLAUDE.md rule, but reinforced for native-perfect: every color comes from `expo/lib/uv-tokens.ts` (post-Phase-0 reconciliation). Every duration comes from `uvDurations`. Every haptic from `lib/haptics.ts`. Every sound from the Phase 0 audio layer. Hardcoded values are an automatic CTO reviewer hold.

## Reduce-Motion Support

Every screen MUST honor `AccessibilityInfo.isReduceMotionEnabled()`. The Phase 0 `useReduceMotion()` hook is the read path. Reduce-motion variants per STEP_4_MOTION_HAPTICS.md §A.3 are part of the contract. Sound and haptic still fire under reduce-motion.

## Testing Discipline

Each phase exit requires:
- Lint passes: `cd expo && npm run lint`.
- Typecheck passes: `cd expo && npx tsc --noEmit`.
- Expo export passes: `cd expo && npx expo export --platform ios --output-dir /tmp/...`.
- Visual diff for each graduated screen (saved in `build-plan/diffs/`).
- Manual TestFlight smoke test for Phases 3, 4, 5, 8, 10 (the high-risk ones).

## Where to Find Things

| What | Where |
|---|---|
| The 32 mocks | `design-alignment/native-perfect/project-perfect-final-build-mocks.html` |
| Mock decomposition | `design-alignment/native-perfect/build-plan/STEP_1_MOCK_DECOMP.md` |
| Backend mapping | `design-alignment/native-perfect/build-plan/STEP_2_BACKEND_MAP.md` |
| Derived screen specs | `design-alignment/native-perfect/build-plan/STEP_3_DERIVED_SCREENS.md` |
| Motion + haptics + sound | `design-alignment/native-perfect/build-plan/STEP_4_MOTION_HAPTICS.md` |
| Phase plan | `design-alignment/native-perfect/build-plan/STEP_5_PHASE_PLAN.md` |
| Reviewer subagents | `design-alignment/native-perfect/build-plan/STEP_6_REVIEWER_AGENTS.md` + `.claude/agents/*.md` |
| Visual diff tools | `design-alignment/native-perfect/build-plan/STEP_7_VISUAL_DIFF.md` + `scripts/*.mjs` |
| Mock deviation governance | `design-alignment/native-perfect/build-plan/STEP_8_MOCK_DEVIATIONS.md` |
| Per-screen specs | `design-alignment/native-perfect/build-plan/STEP_9_SCREEN_SPECS.md` |
| The deviation log | `design-alignment/native-perfect/build-plan/MOCK_DEVIATIONS.md` |
| Master build runbook | `design-alignment/native-perfect/build-plan/BUILD_PLAN.md` |
| Layer 0 kickoff prompt | `design-alignment/native-perfect/build-plan/LAYER_0_KICKOFF_PROMPT.md` |

---

End of CLAUDE_ADDENDUM.
