# Build Order — Unbreakable Vow UX Overhaul

## How to Use This File

Each prompt is a standalone markdown file in `v1-build/prompts/`. Feed them to Rork (or Claude Code) one at a time, in the order below. Wait for each to complete before starting the next unless marked as "parallelizable."

**Important:** Your live Rork project may have diverged from the code snapshot these prompts were written against. Each prompt references **string patterns** (not hardcoded line numbers) so they should work against your current codebase. If Rork can't find a pattern to match, it means that code has already been changed — read the prompt's intent and apply it to whatever the current state is.

---

## Sprint 1 — Ship This Week

Goal: Remove friction, add viral mechanic, tighten the seal experience.

### Phase 1A (execute in order — these have dependencies)

| Order | Prompt | What It Does | Files Touched | Depends On |
|-------|--------|-------------|---------------|------------|
| 1 | `01-sharpening-fix.md` | Simplifies vow analysis from 3 paths → 2. Rewrites refine.tsx. | `constants/unbreakable.ts`, `app/refine.tsx`, `providers/vow-flow.tsx` | Nothing |
| 2 | `02-vow-certificate.md` | Creates shareable certificate screen. Changes seal → certificate navigation. | NEW `components/vow-certificate.tsx`, NEW `app/certificate.tsx`, `app/seal.tsx`, `app/_layout.tsx` | Nothing |
| 3 | `03-delete-sent-and-auth.md` | Removes sent + auth screens from flow. Stake → seal directly. | `app/stake.tsx`, `app/_layout.tsx`, verify `app/certificate.tsx` | **02** (certificate must exist) |

### Phase 1B (parallelizable — no dependencies on each other, but run after 1A)

| Order | Prompt | What It Does | Files Touched | Depends On |
|-------|--------|-------------|---------------|------------|
| 4 | `04-simplify-home.md` | Collapses "How it works" + speeds up animations. | `app/index.tsx` | Nothing (skip if already done) |
| 5 | `05-seal-oath-text.md` | Moves oath text before checkbox + adds optional "why" field. | `app/seal.tsx` | **02** (seal.tsx modified by 02, run after) |
| 6 | `06-remove-verdict-modal.md` | Removes confirmation modal from verdict screen. | `app/witness-verdict.tsx` | Nothing |
| 7 | `07-remove-vow-repeats.md` | Removes VowPreview from witness + stake screens. | `app/witness.tsx`, `app/stake.tsx` | Nothing |

### Sprint 1 Verification

After all Sprint 1 prompts are executed, verify this flow works end-to-end:

```
Home → type vow → [Refine if vague, skip if sharp] → Witness → Stake → Seal → Certificate → Live → Verdict → Outcome
```

Check:
- [ ] Sharp vow ("No takeout all week") skips refine, goes to witness
- [ ] Vague vow ("be healthier") shows single-screen refine
- [ ] Witness screen no longer shows VowPreview
- [ ] Stake screen navigates to /seal (not /auth)
- [ ] Stake screen no longer shows VowPreview
- [ ] Seal shows oath text BEFORE checkbox
- [ ] Seal has optional "why" field
- [ ] Seal navigates to /certificate (not /sent)
- [ ] Certificate has share + continue buttons
- [ ] Certificate "Continue" navigates to /live
- [ ] Verdict screen has no confirmation modal
- [ ] Home "How it works" is collapsed (or already removed)

---

## Sprint 2 — Next Week

Goal: Split the witness screen, move crew, polish stake, clean up fake data.

### Phase 2A (execute in order)

| Order | Prompt | What It Does | Files Touched | Depends On |
|-------|--------|-------------|---------------|------------|
| 8 | `08-witness-split.md` | Splits witness.tsx into picker + invite method. Removes crew from witness flow. | NEW `app/witness-picker.tsx`, NEW `app/witness-invite-method.tsx`, `app/_layout.tsx`, `app/index.tsx`, `app/refine.tsx` | **07** (VowPreview already removed) |
| 9 | `10-live-screen-crew.md` | Adds crew prompt to live screen. | `app/live.tsx` | **08** (crew removed from witness) |

### Phase 2B (parallelizable — run after 2A or independently)

| Order | Prompt | What It Does | Files Touched | Depends On |
|-------|--------|-------------|---------------|------------|
| 10 | `09-stake-updates.md` | Reorders consequences + social proof hint on $50. | `app/stake.tsx`, `constants/unbreakable.ts` | Nothing |
| 11 | `11-cleanup-fake-data.md` | Removes fake streak, "SOON" labels, fake invite URLs, "Payment processed." | `app/vow-kept.tsx`, `app/vow-broken.tsx`, `app/challenges.tsx`, `components/app-menu.tsx` | Nothing |

**Note on numbering:** The "Order" column shows execution sequence (8, 9, 10, 11). The prompt filenames use their own numbering (08, 09, 10, 11). Prompt 10 runs as step 9 because it depends on prompt 08.

### Sprint 2 Verification

After all Sprint 2 prompts are executed, verify:

```
Home → [Refine] → Witness Picker → [Witness Invite Method] → Stake → Seal → Certificate → Live → Verdict → Outcome
```

Check:
- [ ] Home/refine navigate to /witness-picker (not /witness)
- [ ] Witness picker shows 3 options (contacts, type name, Vowkeeper)
- [ ] Selecting a human witness goes to /witness-invite-method
- [ ] Selecting Vowkeeper skips invite method, goes to /stake
- [ ] Invite method screen shows SMS vs link options
- [ ] No crew section in witness flow
- [ ] Live screen has "Add crew members" card
- [ ] Stake consequence order: charity → anti-cause → witness
- [ ] $50 hint says "Most popular"
- [ ] Vow-kept screen has no fake streak
- [ ] Challenges not visible (or no "SOON" labels)

---

## Sprint 3 — Following Week (Lower Priority)

These prompts haven't been written yet. Produce them after Sprints 1-2 ship.

| Feature | Files | Notes |
|---------|-------|-------|
| Broken vow redemption flow | `app/vow-broken.tsx` | "What went wrong?" checkboxes + re-vow at lower stakes |
| Remove intro ceremony for repeat users | `components/intro-ceremony.tsx` | Brief affirmation instead of full ceremony |
| History as persistent nav | `components/app-menu.tsx`, `app/_layout.tsx` | Tab bar or persistent bottom nav |
| Consequence coupling to stake amount | `app/stake.tsx`, `constants/unbreakable.ts` | Anti-cause default at higher amounts |

---

## Dependency Graph (Visual)

```
01-sharpening-fix ─────────────────────────────────────────┐
                                                            │ (independent)
02-vow-certificate ──► 03-delete-sent-auth ──► 05-seal-oath │
                                                            │
04-simplify-home ──────────────────────────────────────────┤ (independent)
                                                            │
06-remove-verdict-modal ───────────────────────────────────┤ (independent)
                                                            │
07-remove-vow-repeats ──► 08-witness-split ──► 10-crew ────┤
                                                            │
09-stake-updates ──────────────────────────────────────────┤ (independent)
                                                            │
11-cleanup-fake-data ──────────────────────────────────────┘ (independent)
```

---

## Notes for Joey

- **If Rork breaks something:** Check the prompt's "What NOT to change" section. If Rork modified something it shouldn't have, revert that file and re-run with an explicit "do NOT modify {file}" instruction.
- **If a prompt is already done:** Your live code may have already implemented some of these changes (e.g., "How it works" may already be removed). If Rork says "I can't find that code," it's fine — move to the next prompt.
- **Prompt 01 vs 02:** These are independent. You can run them in either order or in parallel if your agent supports it.
- **The auth question:** Prompt 03 removes the fake auth screen. When you're ready for real auth (Stripe integration), you'll build a proper auth flow from scratch — it'll look nothing like the current mocked screen.
