# TODO: Mock Refresh Items

Mocks that need updating to match V6 canonical tokens/specs.
These are cases where the mock predates the V6 token reconciliation
or uses values that differ from the shipped primitives.

## S-WEB3 (`flow/html/web-06-sealed.html`)

1. **CTA gradient**: mock uses `#D4A94A → #B88930`, V6 GoldCTA uses `#E8B656 → #C89B3C → #8B6820`. V6 tokens are canonical per §1.5.

2. **CTA height**: mock uses 56px, V6 GoldCTA primitive uses 62px per §2.3 ("62px primary CTA on hero screens"). S-WEB3 is the desktop variant of the same post-seal moment — consistency with S8 mobile wins.

3. **MOBILE WEB label**: dev annotation at top-right. Not product copy. Should be removed from mock or excluded from pixel-diff baseline.

4. **Seal size**: mock uses 110px, V6 WaxSeal `lg` is 112px per §2.5B. Mock should be updated to 112px.

5. **Secondary links line-height**: mock's secondary row renders at 15px, needs `lineHeight: 1.2` treatment to match V6 button rendering.

6. **"judge" → "witness"**: mock says "becomes your judge", V6 per ambiguity #4 uses "witness". Mock should be updated.

7. **WaxSeal height mismatch**: primitive renders `lg`=112px, mock uses 110px. 2px delta cascades into stamp/H1 position (+5px at H1). Decision deferred from PR #3A: either the `lg` variant drops to 110 (primitive wins) or the mock updates to 112 (fidelity win).

8. **Em-dash stamp height**: impl renders 15px, mock 12px. Plain-text "— Sealed —" reads taller in our rendering. 3px delta. Review whether the stamp span needs explicit `lineHeight: 1` to match. Deferred from PR #3A.

## S14 (`flow/html/09-witness-landing.html`)

9. **Oath checkbox**: impl includes "I swear to keep [name] accountable" checkbox + "they picked you for a reason" hint. These are code-carried additions from the existing build, not in the pre-V6 mock. Accepted as keepers — update mock to include them.

10. **Reassurance footer**: impl includes "Zero cost to you. No account needed." footer from killed S14.5. Not in mock. Accepted per §3.2 S14 — update mock.

11. **"First time? How this works →" link**: removed per §3.2 S14.5 kill note. Mock still shows it. Update mock to remove.

12. **S14 "I'm in →" CTA contrast**: GoldCTA default variant appears lower-contrast over the dark S14 background compared to the iMessage-green CTAs on S16/S17. Audit visual weight — may be an opacity or gold-tone rendering issue. Fix in polish pass.

13. **S15 subcopy missing space**: "Wed, Apr 29when it's time..." — date concatenation is missing a space separator before "when". Fix in polish PR.

14. **S19-VOIDED maker name**: renders as full "Joseph Rosenfield" because the fixture patch that normalized S14/S16/S17 maker name to "Joey" didn't update the voided fixture. Fix when re-running seed script.

16. **S20 sticky CTA overlaps content**: "Make a vow →" footer CTA overlays the NEEDS YOU NOW section header and first card. Scrollable content needs padding-bottom equal to CTA height + margin so content scrolls clear. Fix in polish PR.

17. **M11 confetti effect**: Spec §5.1 calls for "subtle gold particles on initial render, respects reduced-motion." Deferred from PR #3E. Bundle with certificate-page polish pass.

18. **Broken seal glyph missing crack treatment**: M11 trophy and M11B shield are bespoke. Both broken screens reuse default UV wax seal — no crack/split treatment per spec. BROKEN stamp carries the state OK. Deferred from PR #3E.

19. **Cast (/cast) SMS gap**: §3.10.3 C6 specifies Twilio SMS sent to target on dare creation. Current /cast page creates the vow row client-side but does NOT trigger SMS — relies on share sheet / link copy. Needs a `create-challenge` edge function that writes the vow + sends SMS atomically. Post-V6.

20. **/cast waiting screen dead-ends on declined dare**: When the target declines, polling detects `'declined'` and clears the interval, but the darer stays on the waiting screen with no state transition. Acceptable for V6 ship, but a follow-up should surface a "dare declined" state on /cast rather than requiring the darer to navigate to dashboard to see the void. See state machine walk in PR #3H-1.

25. **/witness contacts-picker divergence**: V6 mock (04-witness-pick.html) specifies a full contact-picker with recent contacts (Nick, Maya, Dad), "Pick from contacts" native API card, and "Or send a link instead" fallback. Current web implementation is a simpler 2-option binary choice (Text a friend / No witness). The native Browser Contact Picker API is not widely supported and the recent-contacts feature requires backend tracking. Deferred post-V6-ship.

26. **Witness send-confirmation detection**: Current flow trusts the user to actually send the invite after clicking "Text a friend" (mobile) or "Copy invite link" (desktop). If they abandon after the share sheet / clipboard copy, the vow gets sealed but the witness never receives the link. Detecting actual send is hard on both platforms (share sheet is a black box on iOS; clipboard paste happens outside the app on desktop). Could be mitigated by witness-pending polling on /seal or a "did you send it? [Yes / Resend]" confirmation on the dashboard. Deferred post-V6-ship for product discussion.

24. **/refine bottom-sheet conversion**: V6 mock (02-refine-nudge.html) specifies a bottom-sheet overlay rendered on top of the dimmed home screen. Current implementation is a standalone full-page route at /refine. Architectural conversion would move refine from a route to a component mounted on /, update vow-flow provider to manage sheet open/close state, and change URL/back-button behavior. Deferred post-V6-ship. Low priority — refine is a conditional screen seen only when input is vague.

23. **/refine H1 copy**: V6 spec §3.3 proposes "Will {witnessName} know if you did it?" which is strictly better copy but depends on witness-before-refine flow ordering. Current flow is refine-before-witness so witnessName isn't available. Revisit only if creation flow is ever reordered. Low priority — refine is not a high-leverage screen.

22. **ChoicePill style audit**: PR #3J normalized 3 screen-local pill components (StakeChip, FilterChip, SelectionPill) into ChoicePill primitive. Two properties were silently normalized at merge (StakeChip border 1.5px → 1px; SelectionPill deadline fontSize 13 → 14). Revisit post-V6-ship: side-by-side screenshots of /c/[token], /history, /quick-vow against pre-#3J baseline; decide whether to restore originals via variant props or accept as new canonical.

21. **/c/[token] Stripe retry bug after edge function 500**: If `accept-challenge` returns 500 AFTER `stripe.confirmPayment` succeeds (PI at `requires_capture`), the user retries on the same page. `prepare_payment` returns the same PI via idempotency key. `stripe.confirmPayment` is called against a PI already at `requires_capture` → Stripe returns `payment_intent_unexpected_state` error. User is stuck. **Recovery:** page refresh (restarts the flow) or wait 24h (idempotency key expires, new PI created). **Fix (post-V6):** check PI status before calling `confirmPayment` — if already `requires_capture`, skip directly to the `accept` call with the existing PI.
