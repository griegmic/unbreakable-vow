# Native-Perfect Build Plan

This folder is the complete plan for rebuilding the Unbreakable Vow native (Expo) app to top-3-app-competition quality. It's the contract between Joey, Layer 0 (Claude Code), and the reviewer subagents.

## Start here

**Layer 0 reads `BUILD_PLAN.md` first.** It tells you what to read next and how to proceed.

**Joey's quick reference:** the kickoff prompt is at `LAYER_0_KICKOFF_PROMPT.md`. Paste its contents into a fresh Claude Code session to begin.

## Files in order

| File | Purpose |
|---|---|
| `BUILD_PLAN.md` | Master runbook. Layer 0 reads first. |
| `CLAUDE_ADDENDUM.md` | Rules to append to root CLAUDE.md. |
| `ASSUMPTIONS.md` | Tracked assumptions the plan depends on. |
| `STEP_1_MOCK_DECOMP.md` | The 32 mocks decomposed. Patches at top. |
| `STEP_1_AUDIT.md` | Audit by general-purpose UX agent (~1k lines). Findings folded into Step 1 patches. |
| `STEP_2_BACKEND_MAP.md` | Backend wiring per screen. |
| `STEP_2_PRE_PAYMENT_SHARE_AUDIT.md` | Audit of pre-payment share path. |
| `STEP_2_CONVERSION_AUDIT.md` | Bier-style conversion audit. Findings folded into Step 1 patches. |
| `STEP_3_DERIVED_SCREENS.md` | The 20 uncovered screens designed in mock language. |
| `STEP_4_PRELIM_MOTION_AUDIO.md` | Preliminary motion + audio findings (preserved for reference). |
| `STEP_4_MOTION_HAPTICS.md` | Full motion + haptics + sound master spec. |
| `STEP_5_PHASE_PLAN.md` | Build sequence: 11 phases, pairing schedule, gates. |
| `STEP_6_REVIEWER_AGENTS.md` | Design reviewer + CTO reviewer specs. Includes invocation prompts. |
| `STEP_7_VISUAL_DIFF.md` | Tooling for mock + simulator screenshots + diffs. |
| `STEP_8_MOCK_DEVIATIONS.md` | Governance for any deviation from mocks. |
| `STEP_9_SCREEN_SPECS.md` | Per-screen build contracts. Layer 0 reads per-screen during build. |
| `STEP_11_STRESS_TEST.md` | Stress test of the full plan, gaps found, fixes applied. |
| `MOCK_DEVIATIONS.md` | Live deviation log. Append-only via approved Proposals. |
| `LAYER_0_KICKOFF_PROMPT.md` | The literal first message Joey pastes into Claude Code. |
| `mock-renders/` | 32 PNG renders of each mock cell (generated in Phase 0). |
| `built-renders/` | Screenshots of built screens (generated per graduation). |
| `diffs/` | Visual diff reports (generated per graduation). |
| `screens/` | One per screen: detailed individual specs (generated lazily by Layer 0 from STEP_9). |

## How to use this folder

**For Joey (reviewing/approving):**
- Read `BUILD_PLAN.md` for the high-level plan.
- Skim `STEP_1_MOCK_DECOMP.md` patches to confirm decisions.
- Look at `MOCK_DEVIATIONS.md` whenever a Proposal lands.
- Approve graduation per phase.

**For Layer 0 (building):**
- Start with `LAYER_0_KICKOFF_PROMPT.md`.
- Read `BUILD_PLAN.md` then the listed STEP files.
- Execute Phase 0 first.
- Per screen: build, render mock, capture built, diff, invoke both reviewers, present to Joey.

**For Reviewer subagents:**
- Read `STEP_6_REVIEWER_AGENTS.md` for your rubric and hard rules.
- Read `MOCK_DEVIATIONS.md` for context on what's been approved/rejected.
- Score with conviction. Hold without hesitation.

## Source of truth (in priority order)

1. The HTML mocks: `design-alignment/native-perfect/project-perfect-final-build-mocks.html`. Highest authority for the 32 mocked screens.
2. STEP_3 derived screen specs for the 20 uncovered screens.
3. STEP_4 for motion/haptics/sound.
4. STEP_2 for backend.
5. CLAUDE.md (root, after addendum is appended) for project rules.

When two sources conflict, the higher-priority one wins. Conflicts within the build plan are resolved by Step 11 stress-test fixes — read STEP_11 if confused.

## Status

| Step | Status |
|---|---|
| Step 0 — Read materials | ✅ |
| Step 1 — Mock decomposition | ✅ (with audit + patches) |
| Step 2 — Backend mapping | ✅ |
| Step 3 — Derived screens | ✅ |
| Step 4 — Motion + haptics | ✅ |
| Step 5 — Phase plan | ✅ |
| Step 6 — Reviewer subagents | ✅ |
| Step 7 — Visual diff tools | ✅ |
| Step 8 — Mock deviation governance | ✅ |
| Step 9 — Per-screen specs | ✅ |
| Step 10 — CLAUDE addendum + BUILD_PLAN | ✅ |
| Step 11 — Stress test + fixes | ✅ |
| Step 12 — Delivery | ✅ |

The plan is ready for Layer 0.
