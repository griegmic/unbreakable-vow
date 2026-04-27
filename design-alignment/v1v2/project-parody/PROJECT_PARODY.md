# Project Parody — Expo / TestFlight Product Parity Initiative

## Definition

Project Parody is the initiative to make the installed app surface in Rork, Expo Go, and TestFlight match the approved mobile web product experience everywhere it should match, while intentionally upgrading the few places where native app behavior should be better than web.

The name is intentionally kept as requested, but the operating goal is parity: same product promise, same copy, same visual hierarchy, same core flows, and the same emotional arc across web and native.

## Source Of Truth

- Product/design acceptance: mobile web screens in `web/src/app` and the mocks under `design-alignment/v1v2/flow/html`.
- Native implementation target: `expo/app`, `expo/components`, `expo/lib`, and `expo/constants`.
- Rork acceptance surface: `rork.json` points to `expo`, so every native change must compile in Rork preview and scan correctly into Expo Go.
- TestFlight acceptance surface: same Expo code, with native-only capabilities enabled and verified on-device.

## Rork Visibility Rule

There are two Rork surfaces that can be confused:

- Rork chat/file inspection may read the web app under `web/src/app`.
- Rork QR / Expo Go preview should read the Expo app because `rork.json` points at `expo`.

Project Parody work must therefore label every visible change as one of:

- **Web acceptance change:** patch `web/src/...` so the Rork web/design inspection sees it.
- **Expo QR change:** patch `expo/...` so the QR code and Expo Go show it.
- **Dual parity change:** patch both web and Expo when the same user-facing copy/layout should match.

No screen should be called complete until the relevant Rork surface is named and verified. If Rork says it is reading `web/src/app/guided/page.tsx`, then an Expo-only patch will not be visible in that Rork inspection thread even though it is correct for Expo Go/TestFlight.

## Native Exceptions Where App Should Differ From Web

- Judge/witness selection: native should use contact permission + contact picker/recent contacts. Web should use share/link/SMS fallback.
- Sharing: native should prefer explicit contact-driven SMS/share actions, not surprise auto-share sheets.
- Haptics: native should use selection, impact, warning, and success haptics at meaningful moments.
- Push permissions: native may ask after a successful seal/acceptance moment, not before value is proven.
- Payments: Expo Go can only use a clear testing bypass. TestFlight/dev builds must use Stripe PaymentSheet with Apple Pay first.
- Deep links: witness and dare acceptance remain mobile web for now. Installed app routes `/w/...` and `/c/...` to web unless a later native witness plan is approved.

## Screen-By-Screen Target Matrix

| Journey | Web Source | Expo Surface | Target |
|---|---|---|---|
| Cold entry | `web/src/app/create` / `/quick-vow` | `expo/app/index.tsx`, `quick-vow.tsx` | Same copy and hierarchy; native can use haptics and contacts. |
| Quick vow | `web/src/app/quick-vow/page.tsx` | `expo/app/quick-vow.tsx` | One-screen power flow, no redundant review, strong CTA, judge/contact slot. |
| Guided vow | `/`, `/refine`, `/stake`, `/witness`, `/seal` | `index`, `refine`, `stake`, `witness`, `seal` | Same copy/order; native transitions/haptics; no stale alternate flow. |
| Auth | `web/src/app/seal/page.tsx` | `expo/components/auth-sheet.tsx` | Phone primary; Google/email secondary; no weird name-before-number friction. |
| Payment | `web/src/components/payment-form.tsx` | `expo/lib/stripe.native.ts`, seal/quick vow | Apple Pay primary in TestFlight; Expo Go explicit bypass; copy says no charge unless broken. |
| Post seal | `web/src/app/vow/[id]/page.tsx?sealed=1` | `expo/app/vow-detail.tsx` | Success beat, then witness CTA. No auto-share surprise. |
| Dashboard | `web/src/app/dashboard/page.tsx` | `expo/app/dashboard.tsx` | Same jobs-to-be-done, simpler native density, every card opens reliably. |
| Vow detail active | `web/src/app/vow/[id]` | `expo/app/vow-detail.tsx`, `live.tsx` | Same phase model, same CTA hierarchy, native haptics. |
| Kept/broken | `web/src/app/vow-kept`, `/vow-broken`, `/outcome` | `expo/app/vow-kept.tsx`, `vow-broken.tsx`, `certificate.tsx` | Same emotional language and consequence clarity. |
| Witness invite | `web/src/app/w/[token]` | mobile web via `external-web.tsx` | Native app should hand off cleanly. |
| Dare accept | `web/src/app/c/[token]` | mobile web via `external-web.tsx` | Native app should hand off cleanly. |

## Audit Framework

Each screen must pass:

1. Three-second clarity: user knows what happened and what to do.
2. CTA hierarchy: one obvious primary action, secondary actions quiet.
3. Copy parity: native and web use the same product language unless native capability changes the task.
4. Readability: body copy sans, display serif only for earned display moments.
5. Navigation: every screen has an escape hatch that works in Rork web preview, Expo Go, and native.
6. Haptics: meaningful feedback, not noise.
7. Payment trust: clear no-charge-now copy, Apple Pay smoothness, no duplicate wallet/card confusion.
8. Share conversion: witness/dare sharing is explicit, urgent, and not surprising.
9. Rork compatibility: `npx expo export --platform web` must pass before calling anything done.

## Execution Phases

### Phase 0 — Stabilize Rork Acceptance

- Remove or avoid Expo Router history calls that break Rork web preview.
- Keep `expo/lib/stripe.ts` web-safe and `expo/lib/stripe.native.ts` native-only.
- Run Expo typecheck, lint, and web export for every patch.

### Phase 1 — Maker Flow Parity

- Start every screen with a web-vs-Expo source mapping so Rork inspection and Expo QR do not drift.
- Align `expo/app/quick-vow.tsx` with the approved web quick-vow structure.
- Align guided/native route order with web: create/refine/stake/witness/seal.
- Remove stale native-only screens or make them redirect shims.
- Ensure post-seal always lands on the specific vow detail.

### Phase 2 — Native Upgrades

- Contact picker + recent contacts for judge slot.
- Haptics across selections, CTA, payment success/cancel/error, witness share, verdict.
- Push permission after seal or after a user accepts to be a witness.
- Native SMS/share actions from the post-seal witness CTA.

### Phase 3 — Payment QA

- Expo Go: explicit test bypass only.
- TestFlight: Apple Pay first, card fallback, no charge unless broken.
- Validate quick vow, guided seal, dare accept web, and broken-verdict charge path.

### Phase 4 — Visual QA

- Capture mobile web screenshots and Expo Go screenshots at 393x852.
- Compare screen-by-screen for copy, CTA hierarchy, spacing, and readability.
- Document intentional native differences.

## Immediate Findings

- Rork screenshot shows a `canGoBack` crash. The current repo has no `canGoBack` call, but it did still have shared `router.back()` calls. Those are risky in Rork web preview, so they should be replaced with explicit `router.replace(...)` fallbacks.
- The installed app still has several legacy maker routes. They should either match web or become compatibility redirects.
- Expo auth is already phone-primary; it should be audited against the web phone-first/name-after-code model.
- Apple Pay native cannot be fully validated in Expo Go. Rork/Expo Go can validate layout and flow; TestFlight validates PaymentSheet.

## Done Criteria

- Rork preview has zero runtime errors.
- Scanning the Rork QR into Expo Go shows the intended app screens.
- Expo Go maker flow can be completed using the test bypass without visual or routing surprises.
- TestFlight maker flow can be completed with Apple Pay/card setup.
- Web witness and dare links open correctly from the app.
- Dashboard/vow detail/card navigation works with no hidden dead ends.
- A designer can compare web and native and see one coherent product, not two branches.
