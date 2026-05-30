# Unbreakable Vow — Michael's Fork

**Upstream:** [joeyr0/rork-unbreakable-vow](https://github.com/joeyr0/rork-unbreakable-vow)  
**This repo:** [griegmic/unbreakable-vow](https://github.com/griegmic/unbreakable-vow) — Michael's workspace  
**App:** [unbreakablevow.app](https://unbreakablevow.app)

---

## What This Is

Unbreakable Vow is a commitment and accountability app. Make a vow, name a witness, stake real money. Keep it → money back. Break it → goes to charity or a cause you hate.

Full product context: [`UNBREAKABLE_VOW_BIBLE.md`](UNBREAKABLE_VOW_BIBLE.md)  
Technical context for Claude: [`CLAUDE.md`](CLAUDE.md)

---

## Collaboration Model

**Joe ([@joeyr0](https://github.com/joeyr0))** — Core builder. GTM, ops, architecture, the full product as it exists today.  
**Michael ([@griegmic](https://github.com/griegmic))** — Growth, prediction market layer, strategy docs and one-pagers.

**Workflow:** Michael works in this fork. When features are ready and stable, they merge back to Joe's upstream repo. Eventually both contributors work out of Joe's repo directly.

**Rule:** Nothing Michael commits should break Joe's code. See [Safety Rules](#safety-rules) below.

---

## Michael's Scope

### Growth
- Viral mechanics, referral flows, sharing optimization
- Onboarding improvements
- Community challenge layer

### Prediction Market (Coming Later)
- Users bet on whether someone will keep their vow
- Spectators stake money on outcomes
- Odds, payouts, leaderboards
- This is additive — it wraps the existing vow model, doesn't change it

### Strategy & Docs
- One-pagers, pitch decks, go-to-market docs
- Product strategy writeups
- Stored in `/docs/michael/` — never in the main app code

---

## Safety Rules

Joe has a detailed frozen files list in [`CLAUDE.md`](CLAUDE.md). The short version:

**Never touch:**
- `expo/components/vow-ui.tsx` — permanently frozen
- `expo/lib/supabase.ts`, `web/src/lib/supabase.ts`, `web/src/lib/vow-logic.ts`
- `web/src/app/live/page.tsx`, `self-resolve/page.tsx`
- `web/src/components/auth-modal.tsx`, `share-button.tsx`
- `providers/auth-provider.tsx`
- All existing Supabase migration files
- Edge functions: `create-payment-intent`, `send-sms`, `verdict-page`

**Before every commit:**
- Run `cd expo && npm run lint`
- Run `cd web && npm run lint`  
- Run `cd expo && npx tsc --noEmit`
- Run `cd web && npx tsc --noEmit`

---

## Test Strategy

No automated tests exist yet. Goal: build a safety net so Michael's changes can never silently break core flows.

**Priority test coverage (to be built):**
1. **Vow state machine** — draft → sealed → active → verdict → kept/broken transitions
2. **Stripe flow** — $0 path skips Stripe, staked path charges correctly, refund on kept
3. **Witness flow** — token generation, accept/decline, verdict submission
4. **Frozen file contracts** — snapshot tests on frozen component outputs so regressions surface immediately

**Test stack (proposed):**
- Web: Vitest + React Testing Library
- Expo: Jest + `@testing-library/react-native`
- Supabase edge functions: Deno test runner

Tests live in `__tests__/` alongside each module. CI runs on every push before any merge to main.

---

## Dev Setup

```bash
# Web
cd web && npm install && npm run dev

# Expo
cd expo && npm install && npx expo start

# Supabase (local)
supabase start
```

Env vars needed: see Joe's setup docs. Do not commit `.env` or credentials.

---

## Repo Structure

```
/web          Next.js 16 web app
/expo         React Native / Expo mobile app
/supabase     Edge functions + migrations
/landing      Landing page (don't touch)
/docs/michael Michael's strategy docs and one-pagers
/scripts      Build + verification scripts
```

---

## Merging Back to Upstream

Before opening a PR to Joe's repo:
- All lint and typecheck must pass
- No frozen files modified
- Tests pass (once test suite exists)
- Feature is self-contained — doesn't require Michael's other WIP to function
- Coordinate with Joe on timing
