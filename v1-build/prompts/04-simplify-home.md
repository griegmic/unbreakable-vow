# Prompt: Simplify Home Screen

## What to build

Two changes to `index.tsx`: (1) collapse the "How it works" explainer into an expandable link, and (2) speed up entrance animations.

**NOTE:** If the "How it works" section has already been removed from the home screen, skip change #1 entirely. Only apply changes that are relevant to the current state of the code.

## Changes

### 1. Collapse "How it works" into expandable link

**Current:** Three step cards (Write your vow / Choose a witness / Put money on it) are always visible at the bottom of the home screen inside a `stepsCard` View.

**Target:** Replace the always-visible cards with a single tappable text link: "How does this work?" that toggles the steps in/out with a slide animation.

Implementation:
- Add a `const [stepsVisible, setStepsVisible] = useState(false)` state
- Replace the `stepsCard` View with:
  - A `Pressable` showing "How does this work?" text in `palette.textMuted`, 14px, centered, with a small chevron icon (use `ChevronDown` from lucide-react-native, rotating to `ChevronUp` when expanded)
  - When tapped, toggle `stepsVisible` and animate the existing steps content in/out using `Animated.timing` on height/opacity
- The step content itself stays identical — same icons, same text, same styling
- When collapsed (default), only the link text shows. When expanded, the full steps card slides in below.

### 2. Speed up entrance animations

**Current:** The home screen has a staggered animation sequence. Each section fades in one after another with durations of 500ms, 450ms, 400ms, 350ms, 400ms — totaling ~2.1 seconds before everything is visible.

**Target:** Cut total animation time to under 700ms. Change the sequence to:
- Hero + header: fade in together, 250ms
- Input card: fade in 200ms (starts 100ms after hero)
- CTA button: fade in 150ms (starts 50ms after input)
- Steps link: fade in 100ms (starts with CTA)

Use `Animated.stagger` or overlapping `Animated.delay` calls to create a fast cascade effect rather than a strict sequence.

## Design tokens

Use existing `palette` values. No new colors or fonts.

## What NOT to change

- Do not modify the vow input, example chips, or CTA button behavior
- Do not change the hero text or subtitle copy
- Do not modify any other files
- Keep all existing `testID` props
