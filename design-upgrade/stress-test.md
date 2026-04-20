# Unbreakable Vow — Stress Test Addendum v1.0

**Purpose:** Pre-flight check of the planning artifacts. I walked through `build-plan.md` as if I were Claude Code executing it, and captured every ambiguity, contradiction, or missing detail I would have had to stop and ask about.

**Status:** Each item below includes a **FIX** (to be applied to one of the 5 artifacts) or a **FLAG** (decision needed from Joey before the build starts).

---

## Critical gaps — must fix before build starts

### 1. Vague detector specification

**Gap:** `screen-specs.md` §5.1 and `copy-spec.md` §5.1 reference a "vague detector" for vow input but never define what counts as vague.

**Fix to apply to `web/src/lib/vow-validators.ts` spec** (add to `build-plan.md` Phase 2 step 3):

```typescript
// Heuristic: a vow is "vague" if any of:
// - Fewer than 5 words
// - Contains only a stem verb with no object ("I will try", "I will do better")
// - Contains any of: "more", "less", "better", "worse", "try", "something", "things"
//   without a specific object
// - No deadline detected AND no numeric quantifier (count, time, amount)

export const VAGUE_VERBS = ['try', 'hope', 'want', 'attempt', 'work on', 'think about'];
export const VAGUE_ADJECTIVES = ['better', 'more', 'less', 'healthier', 'productive'];
export const VAGUE_NOUNS = ['things', 'stuff', 'something'];

export function isVague(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (lower.split(/\s+/).length < 5) return true;
  if (VAGUE_VERBS.some(v => lower.startsWith(`i will ${v}`) || lower.startsWith(`i'll ${v}`))) return true;
  if (VAGUE_ADJECTIVES.some(a => lower.includes(a)) && !hasNumericQuantifier(lower)) return true;
  if (VAGUE_NOUNS.some(n => lower.includes(n))) return true;
  return false;
}

function hasNumericQuantifier(text: string): boolean {
  return /\b\d+\b/.test(text) || /\b(once|twice|thrice|daily|weekly)\b/.test(text);
}
```

### 2. Suggestion chip theme taxonomy

**Gap:** Suggestion chips in `/create` step 1 are supposed to adapt to user "theme" but no taxonomy exists.

**Fix to apply to `screen-specs.md` §5.1:** v1.0 ships with three generic chips regardless of input. Theme adaptation deferred to v2.0. Replace the "pick 3 relevant to theme" language with:

> Always show these three chips when vague detector triggers:
> 1. "I will finish the draft by Tuesday 9pm"
> 2. "I will work out three times this week"
> 3. "I will not check email before 10am"

### 3. Countdown server-time implementation

**Gap:** `qa-checklist.md` §E.11 and §S.4 require countdown to use server time, not client time. No spec for how.

**Fix to apply to `screen-specs.md` §9.3 — ActivePhase.tsx:**

Countdown implementation uses `vow.ends_at` (authoritative server timestamp from Postgres) and a derived `serverNow` value:

1. On mount, fetch server time via a cheap Edge Function call (`supabase.rpc('now')` or a lightweight `GET /api/time` route).
2. Compute `offset = serverNow - clientNow` once.
3. Tick locally every second but display `(ends_at - (clientNow + offset))`.
4. On tab regain focus (`visibilitychange`), refetch offset.

Add a new Edge Function `get-server-time` returning `{ now: Date.toISOString() }` to Phase 3 of `build-plan.md`.

### 4. `refined_text` for `/create` drafts

**Gap:** `vows.refined_text` is NOT NULL in the schema. The `/create` flow in `build-plan.md` Phase 2 step 4 "skips refine Edge Function entirely." What goes into `refined_text` at draft insert?

**Fix to apply to `build-plan.md` Phase 2 step 5:**

On draft insert from `/create`, set `refined_text = raw_input`. The refine function is purely a polish pass; the raw text is valid as-is. The legacy `/refine` page continues to use the Edge Function for users who take that path.

### 5. Witness re-invitation after decline

**Gap:** `screen-specs.md` §9.2 says "Pick a different judge →" reopens the witness step. Does this generate a new `witness_invite_token`? Reuse the old one?

**Fix to apply to `screen-specs.md` §9.2:**

When maker picks a new witness:

1. Edge Function `reassign-witness` (NEW — add to Phase 5 of build-plan) regenerates `witness_invite_token`, clears `witness_user_id`, `witness_accepted_at`, `witness_declined`, updates `witness_name` + `witness_phone`.
2. Old SMS link is invalidated (token rotation).
3. New witness gets fresh invite SMS.
4. `audit_events` logs `witness_reassigned` (NEW event type — add to schema).

This new Edge Function MUST preserve existing contracts of accept-witness by matching on token only. The schema addition requires a new migration file.

### 6. Anti-cause money-routing in v1 — RESOLVED

**Decision (Joey):** Keep anti-cause in v1. Two named destinations only: **The NRA** and **PETA.** One on each ideological pole, pick the one you'd hate most to fund. No free-text / "Write your own" — T&S liability on open fields is too high.

**Routing:** Money goes via Stripe to each org's public donation endpoint using their 501(c)(3) or equivalent. Configure destinations per-org in `supabase/functions/_shared/destinations.ts`. Retry 3× on failure, fall back to escrow + manual delivery with maker notification.

**Legal posture:** We route user-initiated donations on their behalf. We are not affiliated with, endorsed by, or partnered with either org. Disclose this in Terms.

**Applied to:**
- `copy-spec.md` §5.5 — rewrote right column with NRA + PETA as the two radio cards.
- `screen-specs.md` Step 3.5 — matched to two-option, removed Write-your-own.
- `qa-checklist.md` §T.2 — rewrote with named-org verification items + legal sign-off gate.

**Pre-launch gate:** Legal sign-off on the routing posture before Phase 8 merges.

### 7. Timezone for `by_when`

**Gap:** Date formatting in `copy-spec.md` §1.3 does not specify timezone. "Tuesday 9pm" in which zone?

**Fix to apply to `copy-spec.md` §1.3:**

- All times render in the **maker's local timezone** (detected via `Intl.DateTimeFormat().resolvedOptions().timeZone`).
- `ends_at` is stored as UTC in Postgres; rendering converts on display.
- SMS to witness/target renders in the **recipient's assumed local timezone** if the recipient's phone country code implies one; otherwise falls back to the maker's timezone. (Imperfect but acceptable for v1.)
- Certificate/outcome public pages render in the maker's timezone to keep ceremony consistent with what the maker saw at seal.
- When ambiguous, show the IANA zone short name: "9pm EST" on SMS only.

### 8. Web push vs Expo push

**Gap:** `copy-spec.md` §21 spec push notifications generically. The codebase has `push_token` column and Expo push integration. Web push is separate (requires service worker + VAPID).

**Fix to apply to `build-plan.md`:**

v1.0 ships **Expo push only.** Web push is out of scope. All §21 templates apply to Expo push. Web users get SMS as their push channel; they do not receive web push notifications in v1.

Remove "mobile web Chrome/Safari + app" from `copy-spec.md` §21 preamble. Replace with "Expo mobile app only."

### 9. Apple Pay domain verification

**Gap:** `build-prompt.md` mentions Apple Pay requires domain verification but doesn't add it as a prerequisite step.

**Fix to apply to `build-plan.md` Phase 3:**

Add Step 3.3.5 (between Stripe integration and the rest):
> **Pre-flight:** Verify `apple-developer-merchantid-domain-association` file is served from `/.well-known/` at the production domain. If not, coordinate with Joey to register in Stripe Dashboard → Payment methods → Apple Pay → Add domain. Staging and production both need registration.

If the file is missing, Apple Pay silently hides — which would silently degrade the seal experience. Don't let it hit production without verification.

### 10. Challenge invite link generation

**Gap:** `screen-specs.md` §13.5 and §14 reference `/c/[token]` but don't specify where `challenge_invite_token` is generated or stored in the maker's side.

**Fix to apply to `screen-specs.md` §13.5:**

When a dare is sealed via `/cast`:
1. `seal-vow` (or a new `seal-challenge` wrapper) generates `challenge_invite_token` using `gen_random_uuid()`.
2. The token is stored on the same `vows` row (already has `challenge_invite_token` column).
3. Share link is `${origin}/c/${challenge_invite_token}`.
4. Target accesses via token; `accept-challenge` Edge Function resolves token → vow → sets `challenge_status`.

This uses existing contracts. Nothing new in the schema.

---

## Minor gaps — nice to fix, not blocking

### 11. Live feed seeding source

**Gap:** `copy-spec.md` §4.2 says "cycle weekly, never show real user data" but doesn't say where the 5 rows come from.

**Fix:** Hardcode in `web/src/app/landing-feed.ts` as a constant array. v1 stays static. Real feed from anonymized real data deferred to v2.

### 12. History pagination

**Gap:** `/history` doesn't specify pagination for users with 50+ past vows.

**Fix to apply to `screen-specs.md` §12:** Paginate via "Load more" button at 25 rows. Initial fetch 25, subsequent batches 25 each.

### 13. Nudge SMS cadence

**Gap:** `qa-checklist.md` §E.6 says nudge is available "> 48h" but doesn't say if maker can send multiple or just one.

**Fix to apply to `screen-specs.md` §9.2:** Nudge button is re-armable every 24h after first use (prevents spam). Track `last_nudged_at` on vows — **requires new nullable column + migration.**

### 14. Delete account data retention

**Gap:** `copy-spec.md` §18.1 says past vows get "anonymized." What does that mean?

**Fix to apply to `screen-specs.md` §18 and build-plan Phase 6:**

On delete account:
1. `users.display_name` → "Anonymous"
2. `users.phone` → NULL (or randomized placeholder to preserve unique constraints)
3. `users.push_token` → NULL
4. `vows.user_id` → retained (for witness/target relational integrity)
5. `audit_events` retained (legally required for dispute resolution)
6. Witness/target references to this user → anonymized via the `users.display_name` join.

### 15. Localization

**Gap:** No mention of language. All copy is English.

**Fix to apply to `build-prompt.md` constraints:** v1 is English-only. No i18n scaffolding required. Document as future work.

### 16. Stripe Elements color mapping

**Gap:** `build-prompt.md` says "pass theme from design-tokens.ts" but doesn't specify the exact Stripe Appearance API mapping.

**Fix to apply to `build-plan.md` Phase 3:**

Add to Step 3.3:
```typescript
// /web/src/lib/stripe-theme.ts
import { designTokens } from './design-tokens';
export const stripeAppearance = {
  theme: 'night' as const,
  variables: {
    colorPrimary: designTokens.gold,
    colorBackground: designTokens.bgElevated,
    colorText: designTokens.text,
    colorDanger: designTokens.danger,
    fontFamily: `${designTokens.fontSans}, -apple-system, sans-serif`,
    spacingUnit: '4px',
    borderRadius: '8px',
  },
};
```

### 17. "Continue on your honor" wording consistency

**Gap:** This phrase appears in `screen-specs.md` §9.2 but not in `copy-spec.md`.

**Fix:** Add to `copy-spec.md` §9.2 as an explicit string with the phrasing:
- Link: "Continue on your honor →"
- Modal title: "Switch to solo?"
- Modal body: "You'll judge yourself when the time comes. That's on you."
- Modal CTAs: "I'm sure" / "Nope"

### 18. `/cast` vs `/create` UX distinction

**Gap:** `/cast` is essentially `/create` in second person. Should `/create` have a toggle "Make a vow / Dare a friend"?

**Decision to apply to `screen-specs.md` §13:** No toggle. They are two distinct routes because the mental mode is different. `/create` = promise yourself. `/cast` = challenge someone else. Keep separate routes; keep two flows. Hamburger menu adds `/cast` entry ("+ Dare a friend").

**Apply to `copy-spec.md` §2.3:** Insert "Dare a friend" as menu item 3 (between "New vow" and "Past vows"):

1. "Dashboard"
2. "+ New vow"
3. "Dare a friend"
4. "Past vows"
5. — divider —
6. "Group Challenges" — COMING SOON
7. — divider —
8. "Settings"
9. "Sign out"

### 19. Refund ETA accuracy

**Gap:** "5-10 business days" is Stripe's standard refund ETA but varies by card network. Some refunds land in 1-2 days.

**Fix to apply to `copy-spec.md` §29 item 6:** Keep "5-10 business days" — it's the safe max. If Stripe returns a faster ETA in metadata, we still say 5-10 to manage expectations. Never promise faster.

### 20. `witness_reassigned` audit event

**Gap:** Introduced in fix #5 but not documented elsewhere.

**Fix to apply:**
- Add `witness_reassigned` to `CLAUDE.md` audit events list (via migration + schema update).
- Add to `copy-spec.md` §9.10 timeline labels: `witness_reassigned` → "You picked a new judge: {new_witness_first}."
- Add to `qa-checklist.md` §F.12 witness_pending as a verification item.

---

## Identified contradictions (resolved)

### C1. Challenge `solo` option

- **Planning summary stated:** Removed solo from primary creation flow; kept `/self-resolve` as emergency backstop.
- **`screen-specs.md` §9.2** reintroduces "Continue on your honor →" as a link after 48h witness timeout.
- **Resolution:** Both are consistent. Primary flow has no solo option; 48h+ witness timeout gets a deliberately de-emphasized escape hatch. The backstop is emergency, not promoted. Both artifacts already agree — just confirming no conflict.

### C2. Ceremony on authenticated users

- **Copy-spec §3** implies ceremony is shown once per browser.
- **Screen-specs §1.1** scopes to unauthenticated + no-token.
- **Resolution:** Authenticated users should not see ceremony. Update `copy-spec.md` §3 preamble: "First-time only. Shown only on `/` for unauthenticated users. Authenticated users bypass to `/dashboard`."

### C3. `/seal` as one screen vs two routes

- **Build-prompt key context** and **screen-specs** say `/seal` and `/sent` are separate routes.
- **copy-spec.md §6** labels `/seal` as "Auth + Pay" (one screen).
- **Resolution:** Consistent. `/seal` itself is one route with review + auth + payment in sequential sections; `/sent` is a distinct post-seal route. Copy-spec language is fine.

### C4. Status color for `sealed`

- **copy-spec.md §1.5 status table** lists two rows for `sealed` (challenge pending = blue; witness pending = amber).
- **design-system.md** doesn't explicitly define "blue" as a semantic token.
- **Resolution:** Add `--status-info: #6ba4d8` (muted blue) to `design-system.md` colors. Update copy-spec §1.5 to reference the token name.

---

## Pre-build checklist for Joey

Before green-lighting the build, confirm decisions on:

- [ ] **Item 6 — anti-cause in v1.0.** Option (a) escrow, (b) charity fallback, (c) defer entirely. My rec: (c).
- [ ] **Item 8 — web push.** Confirm: Expo push only in v1; no web push.
- [ ] **Item 15 — localization.** Confirm: English-only.
- [ ] **Item 18 — `/cast` as separate route.** Confirm: yes, separate from `/create`.
- [ ] **Item 20 + 5 — new schema migration.** Adding `last_nudged_at` + `witness_reassigned` event type. Both require migrations. Approve.

Once these 5 are confirmed, apply every "Fix to apply" item to the corresponding artifact and the build-plan is ready for execution.

---

## Overall readiness assessment

**Green-light if:** the 5 flags above are resolved and the 16 fixes are applied.

**Estimated additional artifact editing effort:** ~1 hour to apply every fix.

**Confidence the plan holds without further gaps:** **Medium-high.** The fixes above cover every gap I found in a careful read; a second pass from a fresh reviewer could surface minor items, but nothing structural.

**Risk of Claude Code getting stuck during Phase N:** **Low** once the above is applied. The biggest remaining risk is in Phase 3 (Stripe integration) where environment-specific factors like domain verification and webhook configuration aren't purely spec-able. That phase will likely need one or two Joey-in-the-loop checkpoints regardless.

---

*End of stress test v1.0.*
