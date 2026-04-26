# Expo App Surface Parity Plan

## Product Principle

The Expo app should feel like the mobile web product, but more native: faster, less explanatory, more tactile, and more personal. Mobile web can rely on share links and browser flows. The app should lean on contacts, push, haptics, saved payment methods, and clear in-app routing.

## Native Differences From Mobile Web

### Contacts Over Share Sheet

- Primary judge selection in app should be contact-first.
- The share sheet should never open automatically after a user seals a vow.
- After sealing, the user should land on the specific vow they just created.
- If the app has a witness phone number, Twilio can send the invite automatically.
- If the user chose link-only, the vow detail should make `Text/Share invite` the primary action.
- Witness acceptance and dare acceptance stay on mobile web. Native universal links for `/w/...` and `/c/...` should hand off to `https://unbreakablevow.app/...`, not open a parallel native acceptance UI.

### Haptics

- Stake selection: light selection tick.
- Primary CTA: medium impact.
- Card saved / vow sealed: success notification.
- Witness accepted / verdict submitted: success notification.
- Broken verdict / destructive confirmation: warning notification.
- OTP entry: selection tick per digit; error notification on bad code.

### Push vs Twilio

Push is for app-owned lifecycle moments once the user has the app and a push token. Twilio is for cross-person accountability, external invites, and fallback.

Use push for:
- Maker: vow sealed, witness accepted, witness declined, deadline approaching, verdict available, outcome posted.
- Witness: accepted confirmation, 24h reminder, verdict time, outcome posted.
- Dare recipient: dare accepted, vow live, verdict available.

Use Twilio for:
- Witness invite links.
- Witness verdict requests when they may not have the app installed.
- Maker reminders when no push token exists or a critical payment issue needs fallback.
- Accountability nudges that intentionally cross the app boundary.

### Payment

- App payment should use saved-card SetupIntent / Apple Pay setup where available.
- Copy should say `Nothing charges unless you break it.`
- Avoid language like `held`, `captured`, or `paid` during seal.
- Card entry is the fallback; Apple Pay / Link / saved wallet should feel primary through Stripe PaymentSheet.

### Navigation

- Every app route needs an explicit escape hatch: flow back, dashboard, or app menu.
- Back buttons should go to the product's previous step when that step is known, not rely on arbitrary navigation history.
- Post-seal and post-dare-accept should never dump users into a generic dashboard unless the dashboard is the explicit next job.

## App Screen Audit

### Quick Vow

High-confidence implementation:
- Reworked toward the mobile web power layout.
- Hero vow input is now the screen's purpose.
- Stake is the only display-scale Fraunces moment.
- Stake tiles use cheeky dynamic copy.
- Judge selection is contact-first with link-only and solo fallbacks.
- Consequence sentence is readable and connected to the selected amount and destination.
- CTA is dominant and says `Stake $X`.
- Removed the oath checkbox from quick vow because it was training-wheel friction for a returning/native surface.

Still to audit after simulator QA:
- Keyboard behavior on the smallest iPhone viewport.
- Whether the destination controls should collapse into a bottom sheet once default behavior is proven.

### Guided Seal

High-confidence implementation:
- Removed automatic share-sheet launch after sealing.
- Changed post-seal routing to the specific vow detail.
- Updated saved-card failure copy away from `payment captured`.

Still to audit:
- Whether guided seal should show the same native contact-confirmation pattern as quick vow.
- Whether the sealed celebration should hand off into vow detail or a dedicated native celebration screen first.

### Dashboard

High-confidence implementation:
- Incoming dare cards no longer expose native `Accept/Decline` actions, because acceptance requires the mobile web auth/payment flow.
- Witness verdict and web-origin recipient actions now hand off to `/external-web`.
- Maker cards route into the specific vow detail.
- Make-a-vow actions route to the new quick vow surface.

Still to audit after simulator QA:
- Reduce mixed status colors and small labels.
- Make cards easier to scan with one clear state sentence per card.
- Ensure the Make a Vow CTA never visually lands between cards while scrolling.
- Replace decorative orb treatment with a quieter surface.

### Vow Detail

High-confidence implementation:
- Detect `justSealed=1` and render a calmer celebration/status module at the top.
- Pending witness actions now point to the mobile web witness link through SMS/share.

Recommended next pass:
- For pending witness: primary CTA should be `Text [Name]` or `Share invite`, not generic `Share vow`.
- For active witnessed vow: show `Mark completed early` as a first-class action.
- For awaiting verdict: make the witness/job state impossible to miss.

### Witness Flow

High-confidence implementation:
- Native app no longer routes dashboard witness verdict actions into the native verdict screen.
- Universal links for `/w/...` are handed to the web flow.
- Legacy native witness invite and witness verdict routes are now web-redirect shims.

Recommended next pass:
- Re-architect landing around the witness job: what the maker vowed, how much is at stake, when the verdict happens, and what accepting means.
- Phone capture should be short and direct after acceptance when needed.
- Accepted state should invite a nudge text and keep vow details visible.

### Dare Flow

High-confidence implementation:
- Native app no longer accepts or declines incoming dare cards directly.
- Universal links for `/c/...` are handed to the web flow.
- Dare creation in app now creates the dare, then asks the user to send/text it explicitly.
- Legacy challenge card actions now open the web dare link instead of calling native challenge accept/decline mutations.

Recommended next pass:
- Dare invite should clearly answer: do what, by when, for how much.
- Dare creation in app should use contacts and then show an explicit `Text [Name]`/share step, not launch the share sheet automatically.
- Accepting a dare remains mobile web. It should flow straight into phone auth/payment setup without an intimidating separate card-entry screen.
- Once a dare is accepted on web, native push should deep-link the darer to that specific vow detail.

## Franklin Review Edits Adopted

- Native witness/dare acceptor routes are no longer first-class stack routes.
- Dashboard witness verdict and incoming dare CTAs now open the web flow instead of native accept/judge screens.
- `external-web` uses `expo-web-browser` so associated-domain universal links do not immediately boomerang back into the app.
- Native intent parsing now handles full `https://...` URLs and recognizes core app routes including dashboard, quick vow, cast, and vow detail.
- Seal success now uses `router.replace` to avoid back navigation returning to a completed payment/setup screen.
- Vow detail now consumes `justSealed=1`.
- Legacy native `live`, `witness-invite`, and `witness-verdict` screens are redirect shims so stale app links do not expose old product surfaces.
- The Expo app lint/type pass is green for app code.

## Franklin Review Items Held

- Recent witness auto-preselect remains for now. It is an efficiency win for returning users, but should be watched for accidental repeat-witness selection.
- Push permission timing remains as implemented for now. Best-practice likely becomes value-earned permission after seal or witness acceptance, but that needs a wider auth/push pass.
- Native accountability inbox is a strong retention idea, but it is a new surface and should follow core flow stabilization.

## QA Checklist

- `npx tsc --noEmit` for Expo. Passed on 2026-04-25.
- `npm run lint` for Expo. Passed on 2026-04-25.
- Manual simulator pass at iPhone 15-ish viewport.
- Quick vow: contact picker, recent contact, link-only, solo.
- Quick vow: Apple Pay / PaymentSheet setup creates no charge.
- Guided vow: post-seal routes to `/vow-detail?vowId=...`.
- Witness link: pending maker payment, accept, phone capture, accepted state, verdict state.
- Dare link: accept, auth, saved card, live vow, inviter as witness.
- Dashboard: card tap routes, Make a Vow CTA, menu/back escape hatches.
