# Unbreakable Vow

A stakes-based accountability app. Make a weekly commitment, invite a witness, put money on it. If you break the vow, the money goes to charity. Your witness delivers the verdict on Day 7.

## How it works

1. **Write a vow** — one specific commitment for the week ("Go to the gym 3x this week", "No takeout all week")
2. **Choose a witness** — a friend who knows you well enough to call it honestly
3. **Put money on it** — $10–$100, goes to a charity, anti-charity, or your witness if you fail
4. **Live it** — a group SMS thread with your witness and Vowkeeper (the AI) keeps you accountable
5. **Day 7: verdict** — your witness calls it kept or broken. No appeals.

## Tech stack

- **React Native** + **Expo** (Expo Router, file-based routing)
- **TypeScript**
- Built with [Rork](https://rork.com)

## Project structure

```
expo/
├── app/                      # Screens (Expo Router)
│   ├── index.tsx             # Home — vow input
│   ├── refine.tsx            # Vow sharpening (frequency, duration, vague handling)
│   ├── witness.tsx           # Choose & invite a witness
│   ├── stake.tsx             # Set amount & consequence
│   ├── auth.tsx              # Sign in (Apple / Google / email)
│   ├── seal.tsx              # Review & seal the vow (ritual moment)
│   ├── sent.tsx              # Post-seal — waiting for witness acceptance
│   ├── live.tsx              # Active vow with countdown
│   ├── witness-invite.tsx    # What the witness sees (web/deep link)
│   ├── witness-verdict.tsx   # Witness delivers verdict on Day 7
│   ├── vow-kept.tsx          # Outcome: vow kept
│   ├── vow-broken.tsx        # Outcome: vow broken (includes donation receipt)
│   ├── history.tsx           # Past vows, streaks, record
│   ├── challenges.tsx        # Community challenges
│   └── settings.tsx          # App settings
├── constants/
│   └── unbreakable.ts        # Core logic — vow analysis, sharpening, ICP detection, composition
├── providers/
│   └── vow-flow.tsx          # Global state management (vow, witness, stake, auth)
├── components/
│   ├── vow-ui.tsx            # Shared UI components (RitualScreen, RitualCard, buttons, inputs)
│   └── app-menu.tsx          # App menu button
└── package.json
```

## Vow creation flow

```
Home (type or pick a vow)
  │
  ├─ Already sharp → skip refine → Witness
  │   e.g. "No phone in bed all week"
  │
  ├─ Needs frequency/duration → Refine (chips) → Witness
  │   e.g. "Go to the gym" → "How often?" → "How long?"
  │
  ├─ Needs deadline → Refine (deadline picker) → Witness
  │   e.g. "Finish the pitch deck" → "By when?"
  │
  └─ Vague → Refine (text input + contextual suggestions) → re-analyze → Witness
      e.g. "Be more productive" → guidance + suggestions → user sharpens
```

## Sharpening logic

The sharpening engine in `constants/unbreakable.ts` analyzes each vow and classifies it:

- **`already_good`** — has a clear action, a measurable threshold or number, and a time window. Skips refine entirely.
- **`needs_tweak`** — has a clear action but is missing frequency, duration, or a deadline. Shows appropriate chips to fill the gap.
- **`vague`** — too fuzzy to judge ("be better", "walk more"). Shows guidance on what makes a strong vow plus contextual suggestions based on the topic.

## Key concepts

- **Vowkeeper** — the AI witness option for solo vows (no friend needed)
- **Seal ritual** — the moment you lock in the vow with a solemn oath checkbox and animation
- **Two-tap verdict** — the witness must confirm their decision twice, especially for "broken" (irreversible)
- **Proof mode** — for Vowkeeper vows, choose between self-report ("my word is gold") or screenshot evidence

## Consequence options

| Type | What happens if broken |
|---|---|
| Charity | Money goes to a cause you believe in (ALS, St. Jude, Feeding America, etc.) |
| Anti-charity | Money goes to a cause you dislike (maximum motivation) |
| Witness gets it | Your witness profits from your failure |

## Running locally

```bash
cd expo
bun install
bun run start        # then press "i" for iOS Simulator
bun run start-web    # browser preview
```

Requires [Node.js](https://github.com/nvm-sh/nvm) and [Bun](https://bun.sh).

## Deploying

```bash
bun i -g @expo/eas-cli
eas build --platform ios        # App Store
eas build --platform android    # Google Play
```

See [Expo deployment docs](https://docs.expo.dev/submit/introduction/) for full instructions.
