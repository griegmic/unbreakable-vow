# Unbreakable Vow — Design Upgrade Build Prompt

**For:** Claude Code (or any coding agent executing this build).
**From:** Joey, with planning by the PM/design agent.
**Goal:** Upgrade the Unbreakable Vow web app to the new visual system and full-screen map, without breaking the existing mobile app or backend.

---

## Who you are

You are a world-class senior full-stack engineer. You've shipped production Next.js apps at scale. You know Stripe, Supabase, and Twilio cold. You understand that shipping something that breaks existing users is worse than shipping nothing.

You do not improvise. You follow specs. When a spec is ambiguous, you stop and ask.

---

## What you're building

A comprehensive design upgrade to the Unbreakable Vow web app at `/web/` that:

1. Applies a new **warm ceremonial** aesthetic (dark + gold, Playfair Display + Inter, "friend who calls you out gently" voice) to
2. A **comprehensive 35-screen flow** (up from the current ~20) that fills gaps in the user journey.

While preserving:

- The mobile Expo app's existing creation flow, untouched.
- All Supabase Edge Function API contracts.
- All Row Level Security policies.
- The Stripe manual-capture-then-refund flow.
- Every file in the "DO NOT BREAK" list (see `CLAUDE.md` and `build-plan.md`).

---

## The 5 authoritative artifacts

These five files in `/design-upgrade/` are your instruction set. Read all five before writing a single line of code.

1. **`design-system.md`** — visual design tokens, typography, components, motion. Authority for colors, fonts, spacing, radius, shadows, animations, and 24 primitive components.
2. **`screen-specs.md`** — every route, every state, every interaction. Authority for what each screen contains.
3. **`copy-spec.md`** — every user-facing string, SMS template, share template, error message. Authority for tone and wording.
4. **`qa-checklist.md`** — the test plan. Authority for when a phase is "done."
5. **`build-plan.md`** — the phased execution sequence. Authority for order of operations.

**Rule:** If two artifacts conflict, the hierarchy is: `build-plan` > `screen-specs` > `design-system` > `copy-spec` > `qa-checklist`. If a conflict exists, stop and ask Joey before proceeding.

---

## Execution protocol

1. **Read** all 5 artifacts, in full, before starting.
2. **Start on `design-upgrade` branch.** Never commit to `main`. Never force-push.
3. **Work strictly phase-by-phase** per `build-plan.md`. Do not start Phase N+1 until Phase N verification passes.
4. **Commit after each phase** using the exact commit message format in `build-plan.md`. Include the `Co-Authored-By` line.
5. **Verify each phase** by walking the phase-specific section of `qa-checklist.md`. If any checkbox fails, fix and re-verify before committing.
6. **Ask, don't improvise.** If a spec is ambiguous or missing, stop and ask Joey. Do not "make it up."

---

## Hard constraints (non-negotiable)

### Do not modify these files:

- `/expo/components/vow-ui.tsx` — the single most important file not to touch.
- All other files listed under "Files That Must Not Be Modified" in `/CLAUDE.md`.

### Do not modify these contracts:

- `seal-vow`, `submit-verdict`, `accept-witness`, `accept-challenge`, `void-vow`, `send-sms`, `create-payment-intent`, `verdict-page`, `cron-runner` request/response shapes.
- RLS policies on `users` and `vows` tables.
- Stripe manual-capture flow semantics (create → capture on activate → refund on kept).

### Do not introduce these:

- Bold font weights above 600.
- Emojis in UI chrome.
- Light-mode styles. Dark mode only.
- External CSS frameworks beyond Tailwind + the UV tokens.
- Any forbidden word from `copy-spec.md` §28.
- Any exclamation points (narrow exceptions per copy-spec).
- Named political parties, people, or identifiable orgs in anti-cause copy.

---

## Git safety

- **Branch:** `design-upgrade` only.
- **No force-push.** Ever.
- **No amend** unless Joey explicitly says so. If a pre-commit hook fails, fix the issue and create a NEW commit.
- **No `--no-verify`** skipping of hooks.
- **No git config changes.**
- **No destructive operations** (reset --hard, clean -f, checkout --) without Joey's explicit instruction.

---

## When you're stuck

Stop. Do not guess. Do not improvise copy, styles, or behavior.

Instead, write a single message to Joey that includes:

1. The exact phase and step you're on.
2. The ambiguity or missing information.
3. Two or three options you've considered.
4. Your recommendation and why.

Then wait for an answer.

---

## When you're done

After Phase 8 passes and the final gate checklist in `qa-checklist.md` is green:

1. Run `git log --oneline` on the branch and confirm 9 commits (one per phase, phases 0-8).
2. Push the branch: `git push -u origin design-upgrade`.
3. Open a PR (use the format in `build-plan.md` merge protocol).
4. **Do not merge.** Wait for Joey.

---

## Key context that might save you time

### Data model gotchas

- `stake_amount` is integer cents. 5000 = $50. Zero means $0-stake (legacy only).
- `$0` vows skip ALL Stripe operations. Check `stripe_payment_intent_id IS NOT NULL` before ANY Stripe call.
- `witness_accepted_at` + `witness_declined` + `witness_invite_token` govern witness state. Challenge state uses separate `challenge_status` + `challenge_invite_token`.
- `witness_user_id` is nullable — witnesses don't need accounts. Service role bypasses RLS for `/w/[token]` access.
- `audit_events.actor_type` is one of `'maker' | 'witness' | 'target' | 'system'`. New events must pick one.

### Edge function gotchas

- `seal-vow` expects `{ vowId: string }`. Returns `{ success: true }` or error. Uses JWT auth.
- `submit-verdict` is service-role (no JWT). Expects `{ vowId, verdict, token? }`. Refund idempotency key is `refund-{vowId}`.
- `send-sms` checks `sms_log` to dedupe before sending. Use its existing message-type taxonomy.
- `cron-runner` handles auto-resolve, reminders, retries. Runs on a Supabase scheduled job.

### Stripe gotchas

- Apple Pay requires domain verification in Stripe Dashboard. If not verified, the button silently hides.
- Stripe Elements iframes inherit only font-family and colors via the Appearance API. Pass theme from `/lib/design-tokens.ts`.
- `capture_method: 'manual'` on PaymentIntent. Capture happens in `seal-vow`. Refund after capture in `submit-verdict` (kept).

### Supabase auth gotchas

- Phone OTP via `signInWithOtp({ phone })` requires Twilio configured on the Supabase project.
- OAuth callbacks route through existing `/auth/callback/page.tsx` — do NOT modify this file.
- Session persists in cookies. Middleware uses `createServerClient` from `@supabase/ssr`.

### Middleware gotchas

- `middleware.ts` must run on every route matcher touched. Adding new protected routes means adding them to the matcher config.
- Client-side redirect for authenticated `/` → `/dashboard` must happen AFTER mount, NOT in middleware. Otherwise Guests see a flash.

### Web Share API gotchas

- Only available on secure origins (HTTPS, or localhost).
- Returns a Promise that rejects if user cancels. Handle AbortError silently.
- `navigator.share` is falsy on desktop Chrome. Detect and fall back.

---

## Acceptance criteria

The build is done when:

1. Every checkbox in `qa-checklist.md` is checked and truly passes (no handwaving).
2. `git diff main..design-upgrade -- expo/components/vow-ui.tsx` is empty.
3. `git diff main..design-upgrade -- web/src/lib/vow-logic.ts` is empty.
4. `git diff main..design-upgrade -- supabase/functions/create-payment-intent/index.ts` is empty.
5. `git diff main..design-upgrade -- supabase/functions/verdict-page/index.ts` is empty.
6. A full end-to-end Stripe + Twilio test mode run succeeds for: seal → kept → refund, seal → broken → no refund, seal → voided → refund.
7. Lighthouse Performance ≥ 90 and Accessibility = 100 on `/`, `/create`, `/dashboard`, `/seal`.
8. Axe-core reports zero errors on every redesigned route.
9. All 9 commits are clean and present on `design-upgrade` branch.
10. A PR is open and awaiting Joey's review.

---

*Begin with Phase 0. Read the artifacts. Start.*
