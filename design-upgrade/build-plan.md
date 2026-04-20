# Unbreakable Vow — Build Plan v1.0

**Scope:** Phased execution plan for Claude Code. Each phase has a goal, exact files to create/modify, dependencies, and a verification subset from `qa-checklist.md`. Work strictly sequentially. Do not start Phase N+1 until Phase N verification passes.

**Critical rule:** Commit after every phase on the `design-upgrade` branch with the exact message format specified. If a verification step fails, fix in place and re-verify before committing.

**Branch rule:** All work on `design-upgrade` branch. Never commit to `main`. Never force-push. Never modify git config.

---

## Phase 0 — Safety & setup

### 0.1 Goal

Set up the branch, verify preservation baseline, and scaffold the `design-upgrade` directory. No feature work.

### 0.2 Steps

1. `git checkout -b design-upgrade` from `main`.
2. Verify tree clean: `git status` → nothing to commit.
3. Create directory `/design-upgrade/` at repo root. Confirm all 5 artifacts present:
   - `design-system.md`
   - `screen-specs.md`
   - `copy-spec.md`
   - `qa-checklist.md`
   - `build-plan.md`
4. Create `/web/src/lib/design-tokens.ts` as a **placeholder** file (empty export) so downstream phases can import from a consistent path.
5. Snapshot preservation baseline: run the `P.1` + `P.2` + `P.3` checklists from `qa-checklist.md` against `main` to verify the "must not break" files are currently passing. Record the file hashes of every `P.3` file in a scratch note for comparison later.

### 0.3 Files created

- `/design-upgrade/` — directory with 5 artifacts (these were created by the planning phase, verify only).
- `/web/src/lib/design-tokens.ts` — placeholder.

### 0.4 Files modified

- None.

### 0.5 Dependencies

- None.

### 0.6 Verification

- [ ] `git branch --show-current` returns `design-upgrade`.
- [ ] All 5 artifacts readable in `/design-upgrade/`.
- [ ] `design-tokens.ts` importable with empty export.
- [ ] `P.1`, `P.2`, `P.3` checklists pass (baseline).

### 0.7 Commit

```
chore(design-upgrade): scaffold branch and placeholder tokens

Creates design-upgrade branch with 5 planning artifacts.
Placeholder design-tokens.ts ready for phase 1.
```

---

## Phase 1 — Design system foundation

### 1.1 Goal

Install fonts, install design tokens as CSS variables + TypeScript mirror, and build the 24 core components from `design-system.md` section on components. No screen changes yet. All components exportable and visually testable via a scratch route.

### 1.2 Steps

1. **Fonts:** In `web/src/app/layout.tsx`, add `next/font/google` imports for Playfair Display (weights 400, 500, 600, 400-italic) and Inter (400, 500, 600). Assign to CSS variables `--font-serif` and `--font-sans` via `variable: '--font-serif'` option. Do NOT change existing providers or reorder anything.

2. **Tokens:** In `web/src/app/globals.css`, append (do not replace) a new `@layer base` block with all design tokens per `design-system.md` — colors, typography scale, spacing, radius, shadows, durations, easings. Use `--uv-*` prefix on every var to avoid collisions with existing globals.

3. **Typescript mirror:** Populate `/web/src/lib/design-tokens.ts` with a typed object mirroring the CSS vars (for Stripe Elements iframe theming). Export `designTokens` with identical keys + values as the CSS.

4. **Component library:** Create `/web/src/components/uv/` directory. Inside, create one file per component from `design-system.md` §Components:
   - `PrimaryButton.tsx`
   - `SecondaryButton.tsx`
   - `TextButton.tsx`
   - `IconButton.tsx`
   - `Input.tsx`
   - `Textarea.tsx`
   - `RadioCard.tsx`
   - `CheckboxRow.tsx`
   - `OathCheckbox.tsx`
   - `AmountPill.tsx`
   - `StatusPill.tsx`
   - `VowDisplay.tsx`
   - `GoldSealBadge.tsx`
   - `BrokenSealBadge.tsx`
   - `VoidedSealBadge.tsx`
   - `Countdown.tsx`
   - `Chip.tsx`
   - `Card.tsx`
   - `Section.tsx`
   - `BottomSheet.tsx`
   - `Modal.tsx`
   - `Toast.tsx`
   - `SkeletonRow.tsx`
   - `RitualScreen.tsx`
   Each file: functional component, typed props, aria labels per copy-spec §27, no business logic.

5. **Scratch testbed route:** Create `/web/src/app/(design-test)/design-test/page.tsx` (uses route group so it's easily excluded later). Renders every component in every state for visual regression. This route is dev-only and gets removed before merge.

6. **Do not modify:** `ui.tsx`, `auth-modal.tsx`, `share-button.tsx`, `auth-provider.tsx`, `supabase.ts`, `vow-logic.ts`, `middleware.ts`. The new components live in `/uv/` namespace to coexist with existing `ui.tsx`.

### 1.3 Files created

- `/web/src/components/uv/*.tsx` (24 files)
- `/web/src/app/(design-test)/design-test/page.tsx`
- `/web/src/lib/design-tokens.ts` (populated)

### 1.4 Files modified

- `/web/src/app/layout.tsx` — append font imports and CSS var wiring on `<body>`.
- `/web/src/app/globals.css` — append new `@layer base` with tokens.

### 1.5 Dependencies

- Phase 0 passed.

### 1.6 Verification

- [ ] Visit `/design-test` — all components render in all states.
- [ ] V.1 (colors), V.2 (typography), V.4 (radius), V.5 (shadows), V.6 (animations) pass on testbed.
- [ ] P.3 file hashes unchanged from baseline (no existing file modified except layout.tsx + globals.css, which are allowed to add).
- [ ] Existing routes (`/`, `/refine`, `/history`, etc.) still render — no visual regressions from font or token additions.

### 1.7 Commit

```
feat(design-upgrade): add UV design system foundation

Adds Playfair Display + Inter fonts via next/font.
Adds --uv-* CSS token layer in globals.css.
Adds /components/uv/* with 24 primitive components.
Adds design-tokens.ts mirror for Stripe theming.
Adds /design-test route for visual QA.

No existing components modified. No existing routes affected.
```

---

## Phase 2 — Core creation flow (`/create`)

### 2.1 Goal

Ship the new single-page `/create` flow (steps 1, 1.5, 2, 3, 3.5) that composes only UV components. Uses the existing `VowFlowProvider` state shape so legacy `/refine → /stake → /witness → /seal` path continues to work in parallel.

### 2.2 Key decision

`/create` and legacy `/refine`+`/stake`+`/witness` coexist. `/create` is the new primary entry point; legacy stays for backward-compat until Phase 8 sunset decision. Both write to the same `vows` row shape.

### 2.3 Steps

1. Create `/web/src/app/create/page.tsx`. Single file owning the multi-step state machine. State: `{ step: 1 | 1.5 | 2 | 3 | 3.5, vowText, endsAt, witnessName, witnessPhone, stakeAmount, destination, destinationKind }`.
2. Create `/web/src/app/create/components/` subdirectory:
   - `VowInput.tsx` — step 1
   - `ByWhenSheet.tsx` — step 1.5
   - `WitnessStep.tsx` — step 2
   - `StakesStep.tsx` — step 3
   - `IfBrokenSheet.tsx` — step 3.5
3. Vague detector: create `/web/src/lib/vow-validators.ts` with `isVague(text)`, `extractDeadline(text)`, `suggestionsForTheme(text)`.
4. Reuse existing refine Edge Function if the user signals refinement intent. Otherwise bypass. Decision: v1.0 skips refine Edge Function entirely for `/create` flow to keep it snappy; refinement is inline chip-based only.
5. On step 3.5 "Lock it in →", persist draft via direct Supabase insert to `vows` with `status='draft'` (existing contract). Then route to `/seal?id=<vowId>`.
6. Do NOT modify `VowFlowProvider` — `/create` uses local state only. Legacy flow continues using provider.

### 2.4 Files created

- `/web/src/app/create/page.tsx`
- `/web/src/app/create/components/VowInput.tsx`
- `/web/src/app/create/components/ByWhenSheet.tsx`
- `/web/src/app/create/components/WitnessStep.tsx`
- `/web/src/app/create/components/StakesStep.tsx`
- `/web/src/app/create/components/IfBrokenSheet.tsx`
- `/web/src/lib/vow-validators.ts`

### 2.5 Files modified

- None of the "must not break" files.
- `web/src/middleware.ts` — add `/create` to authenticated route matcher (if missing).

### 2.6 Dependencies

- Phase 1 passed.

### 2.7 Verification

- [ ] F.3, F.4, F.5, F.6, F.7 pass.
- [ ] C.4 (copy) passes.
- [ ] V.1, V.2 pass on `/create`.
- [ ] A.1, A.2, A.5, A.6 pass on `/create`.
- [ ] Legacy `/refine` flow still works end-to-end (P.2 regression).
- [ ] Draft row correctly written to `vows` table.

### 2.8 Commit

```
feat(design-upgrade): add /create single-page flow

New primary entry point for vow creation.
Steps 1 (input), 1.5 (by-when), 2 (witness), 3 (stakes), 3.5 (if-broken).
Composes only /components/uv/ primitives.
Writes draft vow row with status='draft' on completion.

Legacy /refine → /stake → /witness path unchanged.
```

---

## Phase 3 — Seal + sent

### 3.1 Goal

Redesign `/seal` and `/sent` to the new visual spec. `/seal` is one screen containing review + auth + payment. `/sent` is the share cliffhanger.

### 3.2 Key decision

`/seal` and `/sent` remain two separate routes (as discussed in the planning summary — decision locked). Transition is seamless UX-wise but code-wise they're distinct for Stripe isolation and recovery.

### 3.3 Steps

1. Rewrite `/web/src/app/seal/page.tsx` using UV components. Preserve existing seal-vow Edge Function call contract exactly.
2. Phone-first OTP: wire Supabase phone auth (`signInWithOtp({ phone })`) + OAuth fallback (`signInWithOAuth({ provider: 'google' })`).
3. Apple Pay integration via Stripe PaymentRequest Button. Card form via Stripe Elements with tokens from `design-tokens.ts` for theming.
4. Rewrite `/web/src/app/sent/page.tsx` using UV components + Web Share API. Detect `navigator.share` availability for primary CTA; fallback to clipboard.
5. After successful seal, router.replace(`/sent?id=<vowId>`) so the back button cannot reach the uncaptured-payment state.

### 3.4 Files created

- None new — only modifications.

### 3.5 Files modified

- `/web/src/app/seal/page.tsx` — full rewrite.
- `/web/src/app/sent/page.tsx` — full rewrite.

### 3.6 Constraint reminder

- `/web/src/lib/vow-logic.ts` — must not be modified. If seal logic needs changes, add helpers to a new file.
- `create-payment-intent/index.ts` Edge Function — must not be modified.
- `seal-vow` Edge Function request/response contract preserved.

### 3.7 Dependencies

- Phase 2 passed.

### 3.8 Verification

- [ ] F.8, F.9, F.10 pass.
- [ ] C.5, C.6 pass.
- [ ] V.1, V.2 pass on both routes.
- [ ] A.1, A.2 pass.
- [ ] Stripe test-mode end-to-end: PaymentIntent created → captured on seal.
- [ ] Apple Pay renders and completes on Safari.
- [ ] Web Share API works on mobile; clipboard fallback on desktop.
- [ ] Back button from `/sent` does NOT reach `/seal` in uncaptured state.
- [ ] P.5 API contract unchanged.

### 3.9 Commit

```
feat(design-upgrade): redesign /seal and /sent

/seal: phone-first OTP + Google OAuth fallback + Apple Pay + card.
/sent: Web Share API cliffhanger with clipboard fallback.

Preserves seal-vow Edge Function contract.
Preserves Stripe manual capture flow.
```

---

## Phase 4 — External flows

### 4.1 Goal

Redesign external no-auth pages: `/w/[token]`, `/w/[token]/verdict`, `/c/[token]`, `/outcome/[vowId]`, `/certificate/[vowId]`.

### 4.2 Key constraint

- `/w/[token]/page.tsx` is a **server component** per codebase rule. Must stay that way. Any client interactivity goes into a separate client component imported into the server component.
- Existing accept-witness, accept-challenge Edge Function contracts preserved.

### 4.3 Steps

1. `/web/src/app/w/[token]/page.tsx` — server component with token resolution. Renders client component `WitnessInvite.tsx` with resolved props.
2. Create `/web/src/app/w/[token]/WitnessInvite.tsx` — client component with all edge states from screen-specs §15.7.
3. Rewrite `/web/src/app/w/[token]/verdict/page.tsx` client component — UV components, OathCheckbox required, confirmation modal on broken.
4. Create `/web/src/app/c/[token]/page.tsx` — server component + `ChallengeInvite.tsx` client component. Handles all states from screen-specs §14.4.
5. Rewrite `/web/src/app/outcome/[vowId]/page.tsx` — public kept/broken variants.
6. Create `/web/src/app/certificate/[vowId]/page.tsx` — new route per screen-specs §17.1. Includes `html-to-image` for PNG export.

### 4.4 Files created

- `/web/src/app/w/[token]/WitnessInvite.tsx`
- `/web/src/app/c/[token]/page.tsx`
- `/web/src/app/c/[token]/ChallengeInvite.tsx`
- `/web/src/app/certificate/[vowId]/page.tsx`

### 4.5 Files modified

- `/web/src/app/w/[token]/page.tsx` — rewrite (server component).
- `/web/src/app/w/[token]/verdict/page.tsx` — rewrite.
- `/web/src/app/outcome/[vowId]/page.tsx` — rewrite.
- `/web/src/middleware.ts` — add `/c/*` and `/certificate/*` as public routes.

### 4.6 Dependencies

- Phase 3 passed.

### 4.7 Verification

- [ ] F.18, F.19, F.20, F.21 pass.
- [ ] E.1 (all token edge cases) pass.
- [ ] C.7, C.8, C.9, C.10 pass for these routes.
- [ ] V.1, V.2 pass.
- [ ] A.1, A.2 pass.
- [ ] T.3 (PII) pass — public pages show first name + last initial only.
- [ ] Certificate PNG export works in Chrome, Safari, Firefox.
- [ ] P.5 accept-witness, accept-challenge contracts unchanged.

### 4.8 Commit

```
feat(design-upgrade): redesign witness, challenge, outcome, certificate

/w/[token]: new UV design, all edge states handled.
/w/[token]/verdict: oath-required one-tap.
/c/[token]: new challenge accept page (replaces inline).
/outcome/[vowId]: public kept/broken share target.
/certificate/[vowId]: new shareable certificate with PNG export.

Edge function contracts preserved.
```

---

## Phase 5 — Dashboard + vow detail

### 5.1 Goal

Ship `/dashboard` as authenticated home + `/vow/[id]` as per-vow detail with all 9 phases.

### 5.2 Key decision

`/dashboard` becomes the authenticated default via middleware. `/live` route preserved but redirects to `/dashboard?focus=most-urgent` for legacy callers.

### 5.3 Steps

1. Create `/web/src/app/dashboard/page.tsx` — urgency-sorted sections. Fetches vows via existing `supabase.from('vows')` patterns.
2. Create `/web/src/app/dashboard/sections/` subdirectory with one component per section:
   - `VerdictNeededSection.tsx`
   - `WatchingSection.tsx`
   - `PendingSection.tsx`
   - `ActiveSection.tsx`
   - `ChallengeSentSection.tsx`
   - `PastSection.tsx`
3. Create `/web/src/app/dashboard/VowCard.tsx` — row component for all sections.
4. Create `/web/src/app/vow/[id]/page.tsx` — client component with phase detector + phase-specific views.
5. Create `/web/src/app/vow/[id]/phases/` subdirectory:
   - `WitnessPending.tsx`
   - `ActivePhase.tsx`
   - `AwaitingVerdict.tsx`
   - `KeptPhase.tsx`
   - `BrokenPhase.tsx`
   - `VoidedPhase.tsx`
   - `TimelineSection.tsx`
6. Create `/web/src/app/vow/[id]/VoidModal.tsx` — matches copy-spec §9.9.
7. Update middleware so authenticated `/` redirects to `/dashboard` (client-side `router.replace` after mount).
8. Update `/live` to redirect to `/dashboard` if authenticated. (Legacy single-vow view still shows if no vows or legacy state.)

### 5.4 Files created

- `/web/src/app/dashboard/page.tsx`
- `/web/src/app/dashboard/VowCard.tsx`
- `/web/src/app/dashboard/sections/*.tsx` (6 files)
- `/web/src/app/vow/[id]/page.tsx`
- `/web/src/app/vow/[id]/phases/*.tsx` (7 files)
- `/web/src/app/vow/[id]/VoidModal.tsx`

### 5.5 Files modified

- `/web/src/middleware.ts` — add `/dashboard`, `/vow/*` matchers.
- `/web/src/app/page.tsx` — add authenticated-user client-side redirect to `/dashboard` (but preserve marketing landing for guests).
- `/web/src/app/live/page.tsx` — if authenticated, redirect to `/dashboard`. Otherwise preserve existing behavior.

### 5.6 Constraint

- `/self-resolve`, `/vow-kept`, `/vow-broken` deferred to Phase 6 (polish pass) for their visual redesign. They remain functional in their current form during Phase 5.

### 5.7 Dependencies

- Phase 4 passed.

### 5.8 Verification

- [ ] F.11, F.12 (all phases) pass.
- [ ] C.7, C.8 pass.
- [ ] V.1, V.2, V.6 pass.
- [ ] A.1, A.2 pass.
- [ ] S.1, S.2, S.3, S.4 pass.
- [ ] E.5, E.6, E.7 pass.
- [ ] `/live` still works for legacy users without dashboard access.
- [ ] Dashboard handles 0, 1, 10+ vows without layout break.

### 5.9 Commit

```
feat(design-upgrade): add /dashboard and /vow/[id]

/dashboard: urgency-sorted sections, authenticated home.
/vow/[id]: 9 phase-specific views with timeline.

/ redirects authenticated users to /dashboard (after mount).
/live redirects authenticated users to /dashboard.

Middleware updated for new routes.
```

---

## Phase 6 — Polish pass (legacy screen redesigns + animations)

### 6.1 Goal

Redesign `/self-resolve`, `/vow-kept`, `/vow-broken`, `/history`, `/settings`, `/cast`, plus the ceremony + landing page. Wire up all motion. Final visual consistency sweep.

### 6.2 Steps

1. **Ceremony:** Create `/web/src/app/CeremonyOverlay.tsx` — full-viewport overlay component rendered on `/` when `localStorage.uv_ceremony_seen !== '1'`. Handles two screens, auto-advance, skip.
2. **Landing `/`:** Rewrite `/web/src/app/page.tsx` with new hero, static feed, 3-card explainer, footer CTA. Preserve marketing content for guests; authenticated users see dashboard redirect logic.
3. Rewrite `/web/src/app/self-resolve/page.tsx` per screen-specs §10. Uses OathCheckbox + confirmation modals.
4. Rewrite `/web/src/app/vow-kept/page.tsx` per screen-specs §11.1.
5. Rewrite `/web/src/app/vow-broken/page.tsx` per screen-specs §11.2 + §11.3 (charity + anti-cause variants).
6. Rewrite `/web/src/app/history/page.tsx` per screen-specs §12.
7. Rewrite `/web/src/app/settings/page.tsx` per screen-specs §18.
8. Create `/web/src/app/cast/page.tsx` — new dare flow per screen-specs §13.
9. **Hamburger menu:** Create `/web/src/components/uv/AppMenu.tsx` per copy-spec §2.3. Wire into layout.
10. **Animations:** Verify ceremonyFadeIn, sealSweep, verdictFlipKept, goldDotPulse, all keyframes from design-system.md wired up. Reduced-motion respect verified.

### 6.3 Files created

- `/web/src/app/CeremonyOverlay.tsx`
- `/web/src/app/cast/page.tsx`
- `/web/src/components/uv/AppMenu.tsx`

### 6.4 Files modified

- `/web/src/app/page.tsx` — full rewrite (landing).
- `/web/src/app/self-resolve/page.tsx` — full rewrite.
- `/web/src/app/vow-kept/page.tsx` — full rewrite.
- `/web/src/app/vow-broken/page.tsx` — full rewrite.
- `/web/src/app/history/page.tsx` — full rewrite.
- `/web/src/app/settings/page.tsx` — full rewrite.

### 6.5 Dependencies

- Phase 5 passed.

### 6.6 Verification

- [ ] F.1, F.2, F.13, F.14, F.15, F.16, F.17, F.22 pass.
- [ ] C.2, C.3, C.7, C.8, C.11 pass.
- [ ] V.1–V.9 all pass.
- [ ] A.1–A.6 pass.
- [ ] S.1–S.5 pass.
- [ ] Reduced-motion disables all animations correctly.
- [ ] Ceremony only shows first visit; second visit skips.

### 6.7 Commit

```
feat(design-upgrade): polish pass — ceremony, landing, legacy screens

Adds first-time ceremony overlay.
Rewrites landing, self-resolve, vow-kept, vow-broken, history, settings.
Adds /cast dare flow.
Adds hamburger menu with Group Challenges COMING SOON.
Wires all motion with reduced-motion support.
```

---

## Phase 7 — Expo dashboard (mobile parity)

### 7.1 Goal

Add `/dashboard` equivalent screen to the Expo app without touching `vow-ui.tsx` or any other existing Expo file.

### 7.2 Key constraint

`expo/components/vow-ui.tsx` is **untouchable.** All new Expo work goes in new files only.

### 7.3 Steps

1. Create `/expo/app/dashboard.tsx` — new Expo Router screen matching web `/dashboard` structure.
2. Create `/expo/components/dashboard/` subdirectory mirroring web sections with React Native equivalents.
3. Create `/expo/lib/uv-tokens.ts` — constants mirroring `design-tokens.ts` for React Native style objects.
4. Wire navigation so dashboard is reachable from existing Expo home button, but does not replace the existing home screen.

### 7.4 Files created

- `/expo/app/dashboard.tsx`
- `/expo/components/dashboard/*.tsx`
- `/expo/lib/uv-tokens.ts`

### 7.5 Files modified

- `/expo/app/_layout.tsx` — add dashboard to tab/stack if applicable (minimal change).

### 7.6 Must not modify

- `expo/components/vow-ui.tsx`
- Any existing Expo screen file.
- Any existing Expo provider.
- `expo/lib/supabase.ts`

### 7.7 Dependencies

- Phase 6 passed.

### 7.8 Verification

- [ ] Expo dashboard renders without errors.
- [ ] Existing Expo creation flow (P.1) unchanged.
- [ ] `vow-ui.tsx` byte-identical to pre-upgrade.
- [ ] X.7 passes.

### 7.9 Commit

```
feat(design-upgrade): add Expo dashboard screen

New /dashboard in Expo app with urgency-sorted sections.
Reaches parity with web dashboard.

vow-ui.tsx and all existing Expo screens unchanged.
```

---

## Phase 8 — Final QA + cleanup

### 8.1 Goal

Full sweep of the QA checklist, fix anything found, remove scratch artifacts, and prepare for merge.

### 8.2 Steps

1. Remove `/web/src/app/(design-test)/` scratch route.
2. Run full QA checklist end-to-end. Every section.
3. Run axe-core accessibility audit on every new/redesigned page. Fix any errors.
4. Run Lighthouse on `/`, `/dashboard`, `/create`, `/seal`. Verify M.3 performance targets.
5. Stripe test-mode end-to-end: $50 vow → seal → kept → refund. Verify webhook.
6. Stripe test-mode end-to-end: $50 vow → seal → broken → no refund.
7. Stripe test-mode end-to-end: $50 vow → seal → voided → refund.
8. Twilio test-mode end-to-end: witness invite → accept → verdict.
9. Auto-resolve test: manually advance clock 72h (or use test cron) to verify auto-resolve.
10. Regression: run full R.1, R.2, R.3, R.4 checklists.
11. Verify no console errors on any route.
12. Verify all `P.3` file hashes match baseline (they should only differ in `layout.tsx` and `globals.css` additions; diff these explicitly).

### 8.3 Files created

- None.

### 8.4 Files modified

- Any files requiring QA fixes.
- Remove: `/web/src/app/(design-test)/` scratch.

### 8.5 Dependencies

- Phase 7 passed.

### 8.6 Verification

- [ ] Every checkbox in `qa-checklist.md` passes.
- [ ] Final gate checklist passes.
- [ ] No console errors on any route.
- [ ] Lighthouse score: Performance ≥ 90, Accessibility = 100.
- [ ] Axe-core: 0 errors.

### 8.7 Commit

```
chore(design-upgrade): final QA sweep, remove scratch

Removes /design-test scratch route.
Fixes issues found in final QA pass.

All checklists pass. Ready to merge.
```

---

## Merge protocol

1. `git checkout main && git pull origin main`
2. `git checkout design-upgrade && git rebase main` (resolve any conflicts — flag to Joey if substantial)
3. Open PR with title `Design upgrade: warm ceremonial + full flow coverage`
4. PR body links all 5 artifacts in `/design-upgrade/`.
5. PR body includes a full diff summary by phase.
6. No force-push. No squash unless Joey approves.
7. Do NOT merge without Joey's explicit sign-off.

---

## Phase dependency graph

```
0 (safety)
  └── 1 (design system)
        └── 2 (/create)
              └── 3 (/seal + /sent)
                    └── 4 (external flows)
                          └── 5 (dashboard + detail)
                                └── 6 (polish + legacy)
                                      └── 7 (expo dashboard)
                                            └── 8 (final QA)
```

Strictly sequential. No parallelization in v1.0. If Claude Code tries to start Phase N+1 before Phase N verification passes, abort and report to Joey.

---

## Total scope estimate (files touched)

- **Created:** ~55 files (24 UV primitives + ~30 route/section components + 1 scratch testbed)
- **Modified:** ~15 files (layout, globals, middleware, seal, sent, w/, c/, outcome, page, self-resolve, vow-kept, vow-broken, history, settings, expo layout)
- **Must not modify:** ~20 files in the preservation list

---

*End of build plan v1.0.*
