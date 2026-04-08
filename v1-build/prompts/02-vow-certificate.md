# Prompt: Shareable Vow Certificate

## What to build

Add a shareable "vow certificate" — a dark-and-gold image users can share to Instagram/Twitter after sealing a vow. This is our primary viral mechanic.

## Current flow

`seal.tsx` → user swears + seals → gold glow animation → after 1600ms, `router.push('/sent')` → `sent.tsx` shows confirmation with vow details.

## Changes

### 1. Create `components/vow-certificate.tsx`

A pure, stateless View designed to be captured as a share image via `react-native-view-shot`.

**Props:** `vowText: string`, `stakeAmount: number`, `sealDate: string`

**Design (must look premium — like a luxury wax-seal document, not an app screenshot):**

- Fixed 9:16 aspect ratio (Instagram Stories optimized)
- Background: `palette.bg` (#05070B)
- Centered gold radial glow behind the vow text: a View ~300x300, borderRadius 300, backgroundColor `rgba(212,162,79,0.15)`, position absolute, ~40% from top
- Top center: "Unbreakable Vow" in `palette.goldBright`, 11px, letter-spaced, subtle
- Center: vow text in `serifFont` (Georgia), `palette.goldBright`, 22-26px, centered, generous line-height — this is the hero
- Below vow: thin gold rule (1px, ~40% width, centered, `rgba(212,162,79,0.3)`)
- Below rule: "$50 at stake" in bold gold, 18px
- Below that: "Sealed April 5, 2026" in `palette.textMuted`, 13px
- Bottom: "unbreakablevow.app" in `palette.textMuted` at ~60% opacity, 10px
- **NO** witness name, **NO** QR code, **NO** "download the app" CTA, **NO** app store badges

### 2. Create `app/certificate.tsx`

New screen showing the certificate full-screen with two buttons:

- **"Share your vow"** (PrimaryButton) — uses `captureRef` from `react-native-view-shot` to capture ONLY the certificate View as PNG (`{ format: 'png', quality: 1, result: 'tmpfile' }`), then `Share.share({ url: imageUri })`. Wrap the certificate View in a ref for this.
- **"Continue"** (SecondaryButton) — navigates to `/live`

Register this route in `_layout.tsx`.

### 3. Update seal.tsx navigation

Find the `router.push('/sent')` call inside the `setTimeout` in `handleSeal` and change it to `router.push('/certificate')`.

That's it — one line change. Flow becomes: seal → certificate (share moment) → live.

## Install dependency

```
npx expo install react-native-view-shot
```

## Design tokens

All values already exist in `constants/unbreakable.ts` — use `palette.bg`, `palette.goldBright`, `palette.gold`, `palette.goldGlow`, `palette.textMuted`, and `serifFont`. Do not introduce new colors.

## What NOT to change

- Do not modify `sent.tsx` (a separate prompt handles that)
- Do not modify any other screens
- Do not add witness name, QR codes, or app store badges to the certificate
