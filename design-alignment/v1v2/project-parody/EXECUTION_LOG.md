# Project Parody Execution Log

## 2026-04-26

### Completed

- Created the Project Parody operating plan and screen-by-screen parity matrix.
- Stabilized the Expo/Rork back-navigation layer by replacing shared `router.back()` behavior with explicit route fallbacks.
- Added explicit native fallbacks on seal, stake, witness, refine, auth, settings, challenges, history, and self-resolve screens.
- Verified the native project with:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npx expo export --platform web --output-dir /tmp/unbreakable-expo-export`

### Current High-Confidence Batch

- Keep Rork/Expo Go as the first acceptance surface.
- Treat Rork visibility as two lanes:
  - `web/src/...` for Rork chat/design inspection.
  - `expo/...` for Rork QR, Expo Go, and TestFlight.
- Redirect the native root route to `quick-vow` so Rork QR / Expo Go stops landing on the old bespoke guided home screen.
- Remove the app-menu route that sent users back into the stale native guided flow.
- Preserve native-only improvements where they are clearly better than web:
  - contact picker for judges
  - recent witnesses
  - haptics
  - explicit Expo Go payment bypass
  - TestFlight-only Apple Pay verification
- Tighten quick-vow judge copy so it explains the native contact/share behavior without adding clutter.
- Add a quiet guided-flow escape hatch to quick-vow for users who need more structure.

### Not Done Yet

- Full screen-by-screen visual parity for dashboard, vow detail, post-seal celebration, kept/broken outcomes, and native auth/payment.
- Real-device Apple Pay QA in TestFlight.
- Screenshot comparison between mobile web and Expo Go at 393x852.

### Next Phase

Phase 1 remains maker-flow parity:

1. Compare accepted mobile web create/seal/vow-detail/dashboard screenshots against Expo.
2. Patch `web/src/...` when the change must show in the Rork web/design inspection thread.
3. Patch `expo/...` when the change must show through the Rork QR code and Expo Go.
4. Patch both when the same copy/layout must be shared.
5. Keep native contact/haptic/push/payment upgrades.
6. Run Rork preview and Expo Go QR testing before calling any pass complete.
