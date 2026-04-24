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
