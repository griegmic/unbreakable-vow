---
name: Design override hierarchy
description: When Joey makes a product decision that contradicts the HTML mock files, Joey's decision wins. Mock files are the default source of truth only when no newer decision exists.
type: feedback
---

Design files (HTML mocks at design-alignment/v1v2/flow/html/*.html) are the baseline source of truth for both visual design and copy. However, when Joey makes a newer decision that contradicts a mock (different copy, different layout, different feature scope), **Joey's decision always overrides the mock.**

**Why:** The mocks were designed as a visual target before implementation revealed product constraints (e.g., witness name not available on /refine, $10 tile needed on /stake). Joey's real-time decisions account for these constraints.

**How to apply:** Document every override in SCREEN-FEATURE-SCOPE.md with the date, the mock value, and Joey's decision. When starting a new screen rebuild, check SCREEN-FEATURE-SCOPE.md first. If no override exists for an element, use the mock value exactly.
