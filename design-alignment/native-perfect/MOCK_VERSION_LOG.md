# Native Perfect Mock Version Log

## v1 — Current Approved Baseline

- File: `project-perfect-final-build-mocks.html`
- Status: rollback baseline
- Flow order: `Vow -> Stake -> Witness -> Auth -> Payment -> Sealed`
- Notes: Do not overwrite this file while exploring witness-option changes.

## v2 — Witness Options Experiment

- File: `project-perfect-final-build-mocks-v2-witness-options.html`
- Status: draft for review
- Flow order remains: `Vow -> Stake -> Witness -> Auth -> Payment -> Sealed`
- Adds:
  - `Decide later` as a witness-deferral state separate from solo.
  - `Share link` as a secondary manual-share/copy path on the witness screen.
  - Decide-later confirmation sheet; no `Go solo` language on the witness step.
  - First-time contact permission sequence: trust-forward `Sync contacts` sheet, native iOS Contacts permission alert, then `Contacts synced` picker with search and suggested contacts. `Recent witnesses` appears only when the user has real Unbreakable Vow history.
  - Selected witness quiet early ask: `Ask Joe now ->`.
  - Early witness invite and accepted states based on current mobile web witness explanation; do not expose `draft` to recipients.
  - Witnessless checkpoint before payment for users who deferred witness choice: `Add a witness` / `Seal vow`.
  - Payment CTA changed to `Lock it in` so the button feels more ceremonial and less generic.
  - Sealed moment subcopy changed to `Now Joe needs to know.` with branch-specific continuation affordances: `Tell Joe ->` for named witness, `Share the link ->` for no named witness.
  - Post-seal deferral copy changed from `I'll do it later` to `Send it later`.
  - No-witness share CTA changed from `Share witness invite` to `Share the invite`.
  - Returned-after-Messages state uses `Got it` instead of vague `Done`; resend remains secondary.
  - Waiting-witness detail now treats invite handoff as progress: `Invite sent`, `Remind Joe`, and helper text for texting/copying again.
  - Active-vow CTAs clarified: `View live vow`, `Back to dashboard`, and secondary `I finished early` request path.
  - Quick Vow now defaults to the last witness in a faded prefilled row with `Change`; no `Decide later` path on this returning-user-only surface.
  - Quick Vow paid happy path skips 16B when a saved payment method exists: `Stake $X ->` opens Apple Pay / Stripe PaymentSheet directly, then routes to the sealed moment.
  - 16B is preserved as fallback-only for no saved payment method, lost Stripe state, or prior $0-only users.
- Promotion rule: only replace or merge into v1 after explicit approval.
