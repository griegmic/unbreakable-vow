# Assumptions Log

Assumptions the build plan depends on. If any are wrong, the plan needs revision.

| # | Assumption | Status |
|---|---|---|
| 1 | The 32 mocks at `project-perfect-final-build-mocks.html` are final and won't be re-designed mid-build. | LOCKED |
| 2 | The 20 derived screens (STEP_3) are correctly identified — i.e., we haven't missed a critical user-flow screen. | LOCKED based on full audit. |
| 3 | `prepare-judge-link` can be modified to accept anonymous drafts (it's NOT on the frozen list). | VERIFIED via CLAUDE.md frozen list. |
| 4 | Adding `vows.anonymous_owner_token` column is safe. Existing vows have NULL for this column; no behavior changes for them. | LOCKED. |
| 5 | `claim-vow` edge function is acceptable to add. | LOCKED — Joey approved. |
| 6 | Token reconciliation between mocks and `uv-tokens.ts` (warmer golds, etc.) won't break web visuals significantly. Web QA at end is acceptable per Joey's #14 decision. | LOCKED. |
| 7 | Per-screen `USE_NATIVE_PERFECT_X` flag granularity can be added (need eas.json or runtime flag system). | TO VERIFY in Phase 0. |
| 8 | TestFlight users will tolerate hybrid (native + LiveWebShell) experience for ~28-41 days during build. | LOCKED — Joey said no public marketing. |
| 9 | Stripe SetupIntent + off-session charge flow works correctly in production. The audit confirmed the existing seal-vow + submit-verdict flow handles this. | LOCKED unless Phase 3 testing surfaces issues. |
| 10 | iOS Apple Pay PaymentSheet via Stripe React Native works in TestFlight. | TO VERIFY in Phase 3. |
| 11 | `cron-runner` includes 24h orphan-draft cleanup, OR the Phase 0 task to add it succeeds. | TO VERIFY in Phase 0. |
| 12 | Reduce-motion handling per STEP_4 §A.3 produces an accessibility-compliant experience. | LOCKED based on Apple HIG patterns. |
| 13 | `expo-av` audio session category `Ambient` properly mixes with system audio (Spotify) and respects silent mode. | INDUSTRY STANDARD; verify in Phase 0. |
| 14 | The 3 custom sounds can be sourced (custom-recorded or licensed from Splice) before Phase 8 graduation. | OPEN — depends on Joey's sound resourcing. Acceptable fallback: ship Phase 8 with placeholder, replace later. |
| 15 | `xcrun simctl io booted screenshot` produces 1179×2556 PNGs from iPhone 15 Pro simulator. | INDUSTRY STANDARD; verify in Phase 0. |
| 16 | Playwright + Chromium headless can render the mock HTML at acceptable fidelity for mock-cell PNGs. | TO VERIFY in Phase 0 (`scripts/render-mocks.mjs`). |
| 17 | Pixelmatch diff tolerance of 0.05 sensitivity + 1.5% changed pixels is the right threshold for graduation. May need tuning. | TUNABLE; start here, adjust if false positives. |
| 18 | Witness-side native screens (17–20, D3-D8, D18) are polish-not-critical because 90%+ of witnesses use the web. If web team isn't aligned with native witness specs, web should still serve correctly without disruption. | LOCKED — Joey confirmed 90%+ web. |
| 19 | The reviewer subagent format (`.claude/agents/<name>.md` with frontmatter) is supported by the Claude Code in use. | INDUSTRY STANDARD for Claude Code. |
| 20 | Joey is available to review at the cadence the per-screen-graduation flow requires (~30 checkpoints ≈ 8-13 hrs over project lifetime). | LOCKED based on Joey's stated availability. |

## Open assumptions to verify in Phase 0

Items #7, #11, #13, #15, #16. Layer 0 verifies these before proceeding to Phase 1.

## Items that may need to revisit

- **#14 (sound sourcing)**: depends on Joey's sound designer or Splice license. If blocked, Phase 8 can ship with placeholder.
- **#17 (diff tolerance)**: may need tuning after first 5-10 screens. Tighten if false positives, loosen if real differences slip through.

## How to invalidate an assumption

If during build you discover one of these is wrong:
1. STOP. Don't continue building on a broken assumption.
2. Document the invalidation here with date and reason.
3. Propose the smallest plan revision to Joey.
4. Wait for approval.
5. Update the relevant STEP_X file accordingly.
6. Resume.

---

End of ASSUMPTIONS.
