# STEP 8 — Mock Deviation Governance

This document defines the governance for any deviation from the canonical mocks. It's the rule, the proposal template, the decision log format, and a worked example.

The actual deviation log (`MOCK_DEVIATIONS.md`) at the root of `build-plan/` is initially empty except for the worked example below.

---

## A. The rule

**The HTML mocks at `design-alignment/native-perfect/project-perfect-final-build-mocks.html` are the source of truth. The coding agent (Layer 0) and reviewer subagents (Step 6) default to the mock in every case.**

**Unauthorized deviation is an automatic graduation fail.** The design reviewer's mock-fidelity criterion 11 hard-gates this — any visible deviation without an approved Mock Deviation Proposal in `MOCK_DEVIATIONS.md` produces a 0, and a 0 on criterion 11 is automatic hold.

**To deviate, the agent must stop, write a Mock Deviation Proposal, and wait for Joey's explicit decision.** No exceptions.

**The conviction bar is "would I bet my reputation that this is better than what Joey approved."** Anything short of that — match the mock exactly. Default action when uncertain: match the mock and leave a comment in the spec for future review.

---

## B. When the agent is allowed to write a Proposal

Only when:

1. The agent has discovered a real implementation problem (a layout impossible to render natively, a copy that conflicts with platform conventions in a way that breaks usability, a flow that creates a security or money-flow risk).
2. The agent has tried to match the mock exactly first and the result genuinely fails on some objective measure (renders broken, fails accessibility minimum, breaks a hard rule from CLAUDE.md).
3. The agent has a specific, defensible alternative — not "I think this might look better."
4. The agent's confidence is "I would stake my reputation that this is better than the mock." Anything less, build to the mock.

**Examples that DO warrant a Proposal:**
- A mock specifies a design that violates iOS Human Interface Guidelines in a way that would cause an App Store rejection.
- A mock's layout literally cannot be expressed in React Native (e.g., backdrop-filter blur on a parent that contains scrollable content has a known iOS rendering bug).
- The mock implies behavior that creates a security vulnerability (e.g., requires showing payment data in plaintext when iOS guidelines require obfuscation).

**Examples that do NOT warrant a Proposal:**
- "I think the gold gradient could be slightly more saturated."
- "The CTA copy could be punchier."
- "I'd put more space between the cards."
- "I think bouncy easing would feel better than spring."
- Anything subjective or aesthetic.

---

## C. Proposal template

Every Mock Deviation Proposal goes in `MOCK_DEVIATIONS.md` as a numbered entry. The template:

```markdown
## Proposal #N — [Screen ID] — [One-line summary]

**Date:** YYYY-MM-DD
**Screen:** [01 / 02b / D5 / etc.]
**Element:** [Specific element from the mock — e.g., "Sealed moment haptic timing" or "Stake card 1px border"]
**Filed by:** [agent name or "design reviewer"]

### What the mock specifies

[Quote or describe verbatim from the mock CSS / Step 1 spec / Step 4 motion spec]

### What I propose to change to

[Specific alternative]

### Why the mock is wrong / suboptimal

[Concrete technical or UX reason. Cite Apple HIG, accessibility guidelines, security concerns, or specific bug if relevant.]

### Why my alternative is better

[Specific reasoning grounded in evidence, not opinion]

### My confidence

[Must be ≥95%. State as a percentage with reasoning.]

### Reputation affirmation

I would stake my reputation that this is better than the mock. [Required statement, exact wording.]

### Screenshots / sketches

[If visual, include before/after PNG paths]

### Decision

- [ ] Approved
- [ ] Rejected
- Decided by Joey on [date]
- Notes: [Joey's reasoning]
```

---

## D. Decision log format

The same `MOCK_DEVIATIONS.md` file maintains a summary table at the top showing all decisions chronologically:

```markdown
# Mock Deviations Log

| # | Date | Screen | Element | Decision | Notes |
|---|---|---|---|---|---|
| 1 | 2026-04-30 | (worked example) | (see below) | APPROVED | (worked example) |
| 2 | ... | ... | ... | ... | ... |

---

## Proposal #1 — [worked example] ...
```

When a Proposal is approved, the build agent can implement the deviation. When rejected, the build agent must match the mock as originally specified.

---

## E. Worked example

This is a fictional but plausible Proposal that goes in `MOCK_DEVIATIONS.md` from day 1 so the agent has a concrete pattern to follow. It does NOT represent an actual approved change.

```markdown
## Proposal #1 — Screen 06 — Replace radial-gradient halo with stacked box-shadows on sealMark

**Date:** 2026-04-30
**Screen:** 06 (Sealed Moment)
**Element:** sealMark halo glow (the `0 0 0 12px rgba(214,168,60,.08), 0 0 0 28px rgba(214,168,60,.035), 0 24px 70px rgba(214,168,60,.24)` box-shadow stack on the seal mark)
**Filed by:** Layer 0 build agent

### What the mock specifies

The mock CSS at line 53 of `project-perfect-final-build-mocks.html` defines the sealMark halo as:
```css
.sealMoment .sealMark {
  width: 94px; height: 94px; border-radius: 26px;
  box-shadow: 0 0 0 12px rgba(214,168,60,.08),
              0 0 0 28px rgba(214,168,60,.035),
              0 24px 70px rgba(214,168,60,.24);
}
```

### What I propose to change to

Use React Native's `boxShadow` with a single shadow + a second View layer providing the gold ring effect via `borderColor + borderWidth + borderRadius` instead of three stacked shadows.

### Why the mock is wrong / suboptimal

React Native does not support multiple box-shadows on a single View on iOS. The `shadowColor + shadowRadius + shadowOffset` API allows only one shadow. Stacking three is impossible with the current React Native version (RN 0.81). To render three concentric halos, we must compose with multiple Views.

This is a rendering capability gap, not a design preference.

### Why my alternative is better

By compositing two View layers (one inner, one outer) plus a single drop-shadow, we can match the mock's visual within 2px tolerance. The structural composition is functionally equivalent and produces the intended effect on real iPhone hardware.

Specifically:
- Inner View: 94×94, gold gradient bg, border-radius 26.
- Wrapper View 1 (outer ring): 118×118, transparent bg, border 12px solid `rgba(214,168,60,.08)`, border-radius 32.
- Wrapper View 2 (outermost): 174×174, transparent bg, border 16px solid `rgba(214,168,60,.035)`, border-radius 38.
- All wrapped in a parent View with `shadowColor: 'rgba(214,168,60,.24)', shadowRadius: 70, shadowOffset: { height: 24 }`.

This produces the same visual layered halo without violating the React Native API.

### My confidence

98%. The technical constraint is documented in React Native source. The visual equivalent has been verified in a prototype at `/tmp/seal-halo-test.tsx`.

### Reputation affirmation

I would stake my reputation that this is better than the mock. [The "better" here is "actually works in React Native rather than rendering as zero halos."]

### Screenshots / sketches

- Mock: `mock-renders/06.png`
- Prototype: `/tmp/seal-halo-test-screenshot.png`

### Decision

- [x] Approved
- [ ] Rejected
- Decided by Joey on 2026-04-30
- Notes: Approved as a technical accommodation. The visual is equivalent. Document the View composition in the Step 9 spec for screen 06.
```

This worked example shows:
- A real technical reason (React Native API limitation), not aesthetic preference.
- A specific, defensible alternative.
- High confidence with reasoning.
- The reputation affirmation.
- The decision logged.

The build agent uses this pattern for any future Proposal.

---

## F. What happens if the agent ignores the rule

The design reviewer subagent's mock-fidelity criterion 11 catches it. Score 0 → automatic hold. The build agent must:

1. Either match the mock (revert the deviation), OR
2. File a retroactive Proposal and wait for decision.

There is no path that lets unauthorized deviations graduate. The reviewer is the gate.

---

## G. Initial state of the deviations log

`MOCK_DEVIATIONS.md` at the root of `build-plan/` starts with the worked example above as Proposal #1, marked APPROVED. All future entries follow the template. The summary table at the top is updated as proposals are filed and decided.

---

End of Step 8.
