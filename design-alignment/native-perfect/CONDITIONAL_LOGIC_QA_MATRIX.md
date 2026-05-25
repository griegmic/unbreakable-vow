# Conditional Logic QA Matrix

This is the native-perfect state-truth checklist. Donald reviews polish and production feel; Ptolemy reviews whether every branch says and does the right thing.

## Highest-Risk Rules

- If the maker already has a Supabase session, skip phone, OTP, and name. Existing users should never be asked for their number or first name during vow creation.
- Quick Vow is returning-user-only. If no session exists, route to guided create instead of letting the user hit a payment/auth dead end.
- If a witness already accepted, do not show "Tell Joe," "Text Joe," or "Waiting for Joe" as the primary state. Show the live/accepted state.
- If the maker opened Messages/share, route to the returned-after-share waiting state, not the first-send state.
- If no named witness exists, never say `Joe`.
- If a draft was created before auth, `claim-vow` must succeed before Stripe setup or sealing.
- Paid QA must not rely on implicit `__DEV__` payment bypass. Any bypass must be explicit.
- No production path may use a placeholder token such as `abc123`.
- Token witness routes must work without auth.
- Broken verdicts must not show success/check iconography.

## Creation Flow Scenarios

| Scenario | Expected State |
|---|---|
| New user types vow, paid stake, adds contact, does not ask now | Auth -> name -> payment -> sealed -> send named invite |
| New user types vow, paid stake, adds contact, asks now | Draft link created -> Messages/share opens -> auth -> claim draft -> payment -> if witness accepted, live; otherwise invite-sent waiting |
| New user shares generic link, no contact | Auth -> claim draft -> payment -> generic post-seal share/waiting copy |
| New user taps Decide later | Auth/payment path continues; witnessless checkpoint appears before payment; no named witness copy |
| New user chooses `$0` stake | No Stripe; still seal; witness states still apply |
| Returning user with saved payment uses Quick Vow | Stake CTA opens native payment confirmation path directly; 16B only if no saved method |

## Post-Seal / Witness States

| Condition | Primary Screen | Primary CTA |
|---|---|---|
| Named witness, invite not opened | Send witness invite | `Text Joe the invite` |
| Named witness, Messages/share opened | Waiting for Joe | `Remind Joe` |
| Named witness already accepted | Live vow | `Done` / active detail actions |
| Generic share link, not opened | Share the invite | `Share the invite` |
| Generic share link opened | Waiting for your witness | `Share again` or `Remind them` |
| Witness declined | Add a new witness or judge myself | `Add a witness` |
| No witness chosen | Witnessless prompt/detail | `Add a witness` |

## Auth / Payment

| Condition | Expected |
|---|---|
| Existing session in guided flow | Witness -> payment. Never phone, OTP, or name. |
| Existing session lands directly on `/native-perfect/create/auth` | Immediate replace to payment with params preserved. |
| Existing session lands directly on `/native-perfect/create/name` | Immediate replace to payment with params preserved. |
| Existing session taps `SIGN IN` on guided screen 01 | Immediate replace to dashboard. Do not show phone, OTP, name, or payment. |
| Logged-out user taps `SIGN IN` on guided screen 01 | Phone -> OTP -> dashboard. Do not create or seal a vow. |
| Existing session lands on Quick Vow | Stay in Quick Vow; CTA may proceed directly to payment/Stripe. |
| Existing session taps `Use guided flow` from Quick Vow | Replace to `/native-perfect/create/vow` screen 01 with no Quick Vow state carried over. |
| No session in guided flow | Phone -> OTP -> first-name -> payment. |
| No session lands directly on payment | Immediate replace to phone auth with params preserved. |
| No session lands on Quick Vow | Immediate replace to guided create. |
| Newly phone-authed user | Ask first name once after OTP, because phone auth does not provide a human display name. |
| Dev-only OTP code `000000` | May continue without a real Supabase session; must not loop from name/payment back to phone auth. |
| OTP invalid | Clear code boxes, show error, no passive haptics |
| Paid stake | SetupIntent / PaymentSheet, no charge now |
| `$0` stake | Skip Stripe, seal with `skip_payment` backend behavior |
| Anonymous draft | `claim-vow` before `save-card` or `seal-vow` |
| Stripe cancel | Stay on payment screen with calm retry path |
| Stripe failure | Error haptic + clear error box |

## Routing / Old Screen Audit

| Route | Native-perfect behavior |
|---|---|
| `/` | `/native-perfect/create/vow` |
| `/quick-vow` | `/native-perfect/quick-vow` |
| `/native-quick-vow` | `/native-perfect/quick-vow`; old native lab Quick Vow must not render. |
| Quick Vow `Use guided flow` | `/native-perfect/create/vow` |
| `/dashboard` | `/native-perfect/dashboard` |
| `/refine` | `/native-perfect/create/vow` |
| `/stake` | `/native-perfect/create/stake` |
| `/witness` | `/native-perfect/create/witness` |
| `/seal` | `/native-perfect/create/payment` |
| `/live?vowId=` | `/native-perfect/vow-detail?vowId=` |
| `/w/:token` | `/native-perfect/w/:token`, no auth required |
| `/c/:token` | Web handoff for now |

## Verdict / Outcome

| Condition | Expected |
|---|---|
| Witness is judging active vow | Countdown + clear "verdict due" moment |
| Verdict due | Yes/No CTAs; destructive/broken path must confirm |
| Kept submitted | Success haptic after server success; kept copy/iconography |
| Broken submitted | Warning haptic after server success; broken copy/iconography |
| Duplicate verdict | Terminal already-submitted state |
| Broken charge fails | Honest failed-charge/outstanding state |

## TestFlight Gate

Before TestFlight, Ptolemy must produce a PASS/HOLD report for:

1. Full first-time guided paid path with contact witness.
2. First-time draft share before auth, witness accepts before seal.
3. First-time Decide Later path.
4. `$0` path.
5. Returning Quick Vow saved-payment path.
6. Logged-out `/w/:token` path.
7. Verdict due -> kept.
8. Verdict due -> broken.
9. Push notification deep-link path.
10. Old-route regression path.
