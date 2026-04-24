# Brand Decisions Log

Design decisions made during V6 implementation that normalize or override pre-V6 values. Each entry should be revisited post-V6-ship for final sign-off.

---

## ChoicePill (PR #3J)

**ChoicePill canonical border: 1px** — was 1.5px on pre-#3J StakeChip in /c/[token]. Normalized during #3J consolidation. Logged for revisit.

**ChoicePill canonical fontSize: 14px default / 15px flex** — Deadline pills in /quick-vow bumped +1px from pre-#3J 13px. Normalized during #3J consolidation. Logged for revisit.

---

## /stake selected-state tints (PR #3M)

**Selected-state tints normalized.** Three alpha values (0.08, 0.12, 0.15) and one gold base (212,162,79) collapsed into two tokens (`--uv-gold-selected-bg` at `rgba(200,155,60,0.12)`, `--uv-gold-selected-shadow` at `rgba(200,155,60,0.15)`). Two out of five usages were normalized (0.08→0.12 on consequence card bg, 0.15→0.12 on consequence icon bg). Base color shifted from 212,162,79 to V6 canonical 200,155,60 across all five. Revisit post-V6-ship if any specific selected state looks wrong in design audit.

**RitualCard visual:** V6 canonical borderRadius 18 and boxShadow `0 8px 24px rgba(0,0,0,0.2)` applied. Pre-V6 values (borderRadius 22, heavier shadow) superseded. V6 primitive is source of truth for card styling across the app.

---

## New tokens (PR #3P)

**--uv-danger-border: rgba(248, 113, 113, 0.25)** — Mirrors --uv-success-border naming. Used for danger-state borders (dev test verdict "broken" button). Distinct from --uv-danger-bg (0.10 alpha) which is for backgrounds.

**--uv-info: #60A5FA** — Blue semantic token for neutral "waiting/pending" states distinct from success (green), warn (amber), danger (red). Used for challenge-pending status pill and verdict-waiting state.

**--uv-info-bg: rgba(96, 165, 250, 0.15)** — Background tint for info states. Used for challenge-pending icon background and verdict status pill.
