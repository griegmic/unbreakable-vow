# Prompt: Fix Live Screen — State-Aware Layout + Remove Redundant CTAs

## What this app is

Unbreakable Vow is a stakes-based accountability app. Dark-and-gold luxury aesthetic. React Native + Expo. Design tokens in `constants/unbreakable.ts` (`palette`, `serifFont`). Shared components in `components/vow-ui.tsx`.

## What to fix

The live screen (`app/live.tsx`) currently shows everything at once — witness nudge, share buttons, verdict preview, info cards — regardless of what state the vow is in. It needs to be state-aware: show different content depending on whether the witness has accepted, the vow is active, or the window has ended.

## Current problems

1. **Two redundant share/nudge CTAs.** If there's both a "Share with [witness]" button in a banner AND a "Nudge [witness]" button below, that's two buttons doing the same thing. Pick one.
2. **"Preview the witness verdict" is the gold primary CTA.** This is wrong. The vow was just sealed — verdict is a week away. The primary action should be getting the witness to accept (if they haven't) or nothing prominent (if they have). The verdict button should only become primary when the vow window ends.
3. **Static layout.** The screen looks the same whether the witness just got invited, accepted 3 days ago, or the deadline has passed.

## Target: Three states, one screen

The live screen should render differently based on the vow's current state. Since there's no backend yet, use a simple local state or time-based logic to determine the state.

### State 1: WITNESS PENDING (witness hasn't accepted yet)

This is the state right after sealing. The #1 job is getting the witness on board.

**Layout:**
```
VOW ACTIVE badge (existing pulse animation — keep as-is)

Vow text as hero (large, serif — existing TitleBlock)
"$25 at stake · Goes to ALS Association if broken" (existing subtitle)

Vow window card    |    Verdict date card
(Apr 5 – Apr 12)   |    (Sun, Apr 12)
(existing StatPill pair — keep as-is)

┌─────────────────────────────────────────┐
│  ⏳ Waiting for {witnessName} to accept  │
│                                          │
│  We sent them an invite. Share the link  │
│  below to nudge them personally.         │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │    🔗 Share with {witnessName}    │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘

View history (text link)
```

**Key changes:**
- Merge the banner and nudge button into ONE card. One "Share with {witnessName}" button inside it. That's the only action.
- **NO gold "Preview the witness verdict" button.** Remove it entirely in this state. Verdict is irrelevant right now.
- **NO "Dismiss" on the witness card.** The user needs to get their witness on board — don't let them dismiss the only actionable thing on screen. If you want a dismiss, make it a small "×" in the corner, not a text link.
- "View history" stays as a subtle text link at the bottom.

### State 2: VOW ACTIVE (witness accepted, vow window is open)

The witness is on board. Now the screen is a motivational dashboard.

**Layout:**
```
VOW ACTIVE badge (existing)

Vow text as hero
"$25 at stake · Goes to ALS Association if broken"

Day X of 7 card    |    Verdict date card
(existing StatPill pair)

┌─────────────────────────────────────────┐
│  ✓ {witnessName} is watching.            │
│                                          │
│  💬 "{witnessName} will deliver the      │
│      verdict on {endLabel}."             │
└─────────────────────────────────────────┘

View history (text link)
```

**Key changes:**
- Replace the nudge card with a simple status confirmation: "{witnessName} is watching." with a check icon in green.
- The info about when the verdict happens stays.
- **Still NO gold verdict button.** The verdict isn't due yet.
- Remove the "Open SMS thread" button that just opens a blank SMS app — it does nothing useful.

### State 3: VERDICT DUE (vow window has ended)

Time's up. NOW the verdict is the primary action.

**Layout:**
```
VERDICT DUE badge (change from green "VOW ACTIVE" to gold "VERDICT DUE")
(Change badge colors: backgroundColor to palette.goldGlow, dot to palette.goldBright, text to palette.goldBright)

Vow text as hero
"$25 at stake · Goes to ALS Association if broken"

┌──────────────────────────────────────────┐
│   Time's up.                              │
│   {witnessName}, it's your call.          │
│   (or "Time's up. How did it go?" for     │
│    Vowkeeper)                             │
└──────────────────────────────────────────┘

[ Deliver your verdict ]  ← Gold PrimaryButton, NOW this is appropriate

View history (text link)
```

**Key changes:**
- Badge changes to "VERDICT DUE" in gold
- The gold primary button appears for the first time: "Deliver your verdict" (Vowkeeper) or "Nudge {witnessName} to decide" (human witness)
- All the "waiting" and "active" messaging is gone

## How to determine the state

Since there's no backend, use simple logic:

```javascript
// Add to the component
const now = new Date();
const endDate = new Date(dates.endDate); // or however the verdict date is calculated

// Witness acceptance: for now, use a local state that defaults to false
// In a future sprint we'll wire this to real witness acceptance
const [witnessAccepted, setWitnessAccepted] = useState(false);

// Determine state
const isVerdictDue = now >= endDate;
const isWitnessPending = !isVowkeeper && !witnessAccepted && !isVerdictDue;
const isVowActive = !isWitnessPending && !isVerdictDue;
```

For the Vowkeeper flow: skip State 1 entirely (no witness to invite), start at State 2.

## The "Share with {witness}" button behavior

When tapped, use `Share.share()` from react-native with a message like:
```
"I just made an Unbreakable Vow and named you as my witness. Accept here: https://unbreakablevow.app/invite/..."
```

Import `Share` from `react-native`. This opens the native share sheet (iMessage, WhatsApp, etc.).

## Styles for new elements

**Witness pending card:**
- backgroundColor: `palette.surface`
- borderRadius: 20
- borderWidth: 1
- borderColor: `palette.borderStrong` (gold border to draw attention)
- padding: 20
- gap: 14

**Pending icon row:**
- Clock icon from lucide-react-native (`Clock` or `Timer`)
- "Waiting for {name} to accept." in `palette.text`, 16px, fontWeight 700

**Pending description:**
- palette.textSecondary, 14px, lineHeight 21

**Share button inside card:**
- Full width, minHeight 48, borderRadius 14
- backgroundColor: `palette.goldBright`
- Text: '#0B0D11' (dark on gold), 15px, fontWeight 700
- Share icon from lucide-react-native (`Share2`), color '#0B0D11', size 16

**Witness accepted confirmation:**
- Same card style but with `rgba(82,214,154,0.08)` background and `rgba(82,214,154,0.22)` border (green = confirmed)
- Check icon in `palette.success`
- "{witnessName} is watching." in `palette.text`

**Verdict due badge:**
- Same shape as VOW ACTIVE badge
- backgroundColor: `rgba(212,162,79,0.12)`
- borderColor: `palette.borderStrong`
- Dot: `palette.goldBright`
- Text: "VERDICT DUE" in `palette.goldBright`

## Design tokens

Use existing `palette` values from `constants/unbreakable.ts`. No new colors or fonts.

## What NOT to change

- Do NOT modify the VOW ACTIVE pulse animation (just conditionally show it vs the VERDICT DUE badge)
- Do NOT modify the vow text display or subtitle
- Do NOT modify the StatPill date cards
- Do NOT modify `providers/vow-flow.tsx` or `constants/unbreakable.ts`
- Do NOT modify any other screens
- Keep all existing `testID` props where applicable
- Keep all haptic feedback patterns
