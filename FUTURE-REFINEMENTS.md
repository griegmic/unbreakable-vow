# Future Refinements — Expert Panel Deferred Items

Items reviewed by the expert panel (Nikita Bier, Julie Zhuo, CTO, Copywriter, QA Auditor, Regression Guardian, Mobile Consistency Auditor) during the guided flow design session. These had partial consensus or were flagged as future considerations.

---

## High Priority (Nikita or Julie had serious concerns)

### /live Witness Pending Anticlimax (Julie — serious concern)
After the ceremonial seal animation + share, landing on "Waiting for your witness to step forward" is an emotional drop-off. The witness_pending phase of /live needs a more substantial redesign — possibly showing countdown + motivational first-day content instead of leading with the waiting state. A contextual line ("Your vow is active. Share the link to lock in a witness.") was proposed as a minimum fix (6/7 panel vote) but Julie flagged this as deeper than a single line of copy.

### Is 3 Screens Too Many? (Nikita — unresolved)
Nikita raised whether the guided flow could be 2 screens instead of 3 (Vow+Deadline+Stake on one → Seal on the other). Julie and Nir Eyal argued 3 is correct for the escalating commitment pattern. Nikita accepted but wasn't enthusiastic — said "I could live with it." **Action: Instrument S1→S2 and S2→S3 drop-off rates from day one. If S1→S2 drops below 80%, consider merging S1+S2.**

### Auth Modal Subtitle for Guided Flow
Current auth modal subtitle: "Verify your identity before money goes on the line." For the guided flow, panel consensus (7/7) was to show "So we can save your vow." instead. Blocked because `components/auth-modal.tsx` is in the do-not-modify list. **Action: Add an optional `subtitle` prop to AuthModal that defaults to existing text. Guided flow passes the new copy. This preserves existing behavior for all other callers.**

---

## Medium Priority (Panel consensus but deferred for scope)

### QuickVow Post-Seal Copy Sync
The guided flow rewrites "What happens next" steps to:
1. "Share the link with a friend."
2. "They accept and start watching."
3. "On verdict day, they call it: kept or broken."

The QuickVow (/create) still has the old copy ("Your witness taps the link to accept."). Decide whether to sync or accept the divergence between first-timer (guided) and returning user (QuickVow) experiences.

### Web Witness Phone Field Simplification
Current QuickVow web flow shows name + phone inputs for witnesses. Phone is unnecessary for link-based sharing (the web pattern). Panel (5/6) recommended making phone optional/hidden for first-timers. Only affects /create, not the guided flow.

### Mobile "30 Days" Deadline Chip
Add a visible "30 days" preset chip between "7 days" and "Pick" on the Expo quick-vow screen. Currently "in_30_days" is mapped to custom internally but has no visible chip. Panel vote: 5/6 (CTO neutral).

### Mobile Guided Flow Link Cleanup
The "Use guided flow instead" link at the bottom of Expo quick-vow.tsx points to `/?guided=1` which is a web route. Either remove it from mobile or create a mobile-native guided flow. Panel vote: 5/6.

---

## Low Priority (Nice-to-have polish)

### /live Witness Pending Contextual Line
Add "Your vow is active. Share the link to lock in a witness." (text-secondary, 14px, centered) above the witness-pending card in the witness_pending phase of /live. Panel vote: 6/7.

### Google OAuth localStorage Edge Case Testing
The cookie backup mechanism for preserving vow text across Google OAuth redirects exists but hasn't been explicitly tested for the guided flow redirect path (`/guided`). Test matrix: Safari (clears localStorage on cross-origin redirect), Chrome, email OTP (no redirect). Verify the cookie backup → S1 pre-fill path works.

### Stake Screen Animation
When user switches from staked ($25) to $0 or vice versa, the consequence section should collapse/expand with animation rather than a hard jump. Minor polish.

---

## Instrumentation Requirements (Day One)

These analytics events must be in place before launch to validate the guided flow:

- `guided_s1_viewed` — user lands on S1
- `guided_s1_completed` — user taps "Set the stakes"
- `guided_s2_viewed` — user lands on S2
- `guided_s2_completed` — user taps "Seal it"
- `guided_s3_viewed` — user lands on S3
- `guided_s3_sealed` — user taps "Seal this vow" (and completes payment if staked)
- `guided_share_initiated` — user taps share button post-seal
- `guided_auth_shown` — auth modal opened from landing
- `guided_auth_completed` — auth succeeded, routing to /guided

Track S1→S2, S2→S3, and S3→sealed conversion rates. Compare against QuickVow single-page conversion. The guided flow should outperform on first-time users; QuickVow should outperform on returning users.
