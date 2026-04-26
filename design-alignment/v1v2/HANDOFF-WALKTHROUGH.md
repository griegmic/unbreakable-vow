# V6 Handoff — Step-by-Step Walkthrough

You asked for "baby idiot" mode. Here it is. Follow top to bottom. Don't skip.

---

## STEP 1 — Delete the one file that's still wrong

There is **one critical blocker**. The spec says S14.5 (first-time witness screen) is killed, but the HTML file is still on disk. If Claude Code finds it, it will get confused.

Open your terminal. Paste this exactly:

```bash
rm /Users/joey/rork-unbreakable-vow/design-alignment/v1v2/flow/html/s14-5-first-time-witness.html
```

If your repo lives somewhere other than `/Users/joey/rork-unbreakable-vow/`, swap that prefix for wherever you actually cloned it. (Run `pwd` from inside the repo if you're not sure.)

Verify it's gone:

```bash
ls /Users/joey/rork-unbreakable-vow/design-alignment/v1v2/flow/html/ | grep s14-5
```

That should print **nothing**. If it prints a filename, the delete didn't work — try again.

---

## STEP 2 — Confirm the canonical S20 mock is in place

The dashboard (S20) was rebuilt twice today. The version Claude Code should build from is `s20-dashboard-A-revised-v2.html`. Verify:

```bash
ls /Users/joey/rork-unbreakable-vow/design-alignment/v1v2/flow/html/s20-dashboard-A-revised-v2.html
```

If that file exists, you're good. If it doesn't, stop and ping me.

---

## STEP 3 — Decide whether to set up infrastructure now or later

Three options. Pick one and move on; don't agonize.

**Option A — Defer everything (fastest start, recommended).** Claude Code will scaffold the code with placeholder env vars. You wire up real Twilio/Stripe/Supabase/Sentry credentials later when you're ready to test end-to-end. → **skip to Step 4.**

**Option B — Set up only the must-haves before coding.** That's:
- A new Supabase project (free tier is fine) — grab the URL + anon key + service role key
- A Stripe test-mode account — grab `sk_test_...` and `pk_test_...`

Twilio and Sentry can wait. Once you have those four values, drop them in a note somewhere; Claude Code will ask for them on PR #2. → **then go to Step 4.**

**Option C — Wire up everything.** Only do this if you've already got accounts ready. Otherwise Option A.

---

## STEP 4 — Open Claude Code in the repo

In your terminal:

```bash
cd /Users/joey/rork-unbreakable-vow
claude
```

Wait for the prompt. You should see Claude Code's welcome message.

---

## STEP 5 — Paste the opening prompt

Open this file in another window (or just `cat` it):

```
/Users/joey/rork-unbreakable-vow/design-alignment/v1v2/CLAUDE-CODE-PROMPT.md
```

Copy **everything between the two `---` markers under "A. THE OPENING PROMPT"** (lines 7–121 of that file).

Paste it into Claude Code as your first message. Hit enter.

(If you'd rather not paste 100+ lines, scroll to the bottom of CLAUDE-CODE-PROMPT.md — section **D** has a 2-line opener that points Claude Code to read the spec itself. Less reliable but works.)

---

## STEP 6 — What to expect Claude Code to do FIRST

Claude Code's first response should be:

1. A confirmation it read `IMPLEMENTATION-V6.md` cover to cover
2. A **one-paragraph summary** of what it understood (the build, the constraints, the file lists)
3. A short **"Ambiguities I want to flag before starting"** list — usually 3–6 items

**Do NOT let it start writing code yet.** Read the ambiguities list. Answer each one in chat. When you're satisfied, say:

> Looks good. Proceed with PR #1 (Foundation).

If it tries to skip the summary step and dives into code, stop it:

> Wait — give me the one-paragraph summary and ambiguity list first, per the opening prompt.

---

## STEP 7 — PR #1 (Foundation) lands

Claude Code will create the routes shell, design tokens, and primitives. When it says PR #1 is done:

1. Skim the diff (or just trust it for now)
2. Open the new `/dashboard` and `/create` routes locally — they should render with the V6 tokens (dark bg, gold accents, Fraunces serif on vow text)
3. Open `CLAUDE-CODE-PROMPT.md` and find **§B → "After PR #1 (Foundation)"** — paste that prompt next

---

## STEP 8 — PR #1.5 (Primitives)

This is where `WitnessChip` and `NeedsNowCard` get built. They're new today. Use the §B prompt for "After PR #1.5 (Primitives)" — it tells Claude Code to verify against `s20-dashboard-A-revised-v2.html`.

---

## STEP 9 — PR #2 onwards

From here you're in a rhythm. Each PR has a follow-up prompt in §B of CLAUDE-CODE-PROMPT.md. Paste, review, ship, repeat.

PR #2 is when you'll need the Supabase + Stripe credentials (Option B/C from Step 3). If you deferred (Option A), Claude Code will pause and ask — at that point spin up the accounts.

---

## STEP 10 — Escalation rules (read these once now)

In CLAUDE-CODE-PROMPT.md, **§C lists when Claude Code should STOP and ask you instead of proceeding**. Things like: schema changes, new edge functions not in spec, removing files from the "do not modify" list.

If Claude Code ever silently does one of those, push back:

> You changed [X] which wasn't in the spec — revert and ask first.

---

## TL;DR (if you're skimming)

1. `rm .../s14-5-first-time-witness.html` ← **do this now**
2. `cd` into repo, run `claude`
3. Paste §A from `CLAUDE-CODE-PROMPT.md`
4. Make Claude Code give you the summary + ambiguity list before any code
5. Greenlight PR #1
6. After each PR, paste the matching §B prompt
7. Wire Supabase + Stripe at PR #2

That's it. Go.
