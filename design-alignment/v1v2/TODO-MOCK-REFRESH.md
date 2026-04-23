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
