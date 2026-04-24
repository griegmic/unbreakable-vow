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
