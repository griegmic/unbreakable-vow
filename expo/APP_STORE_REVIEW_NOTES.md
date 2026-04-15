# App Store Review Notes

Paste the following into the "Notes for Review" field in App Store Connect.

---

## What This App Does

Unbreakable Vow is an accountability app. Users create personal commitments (vows), assign a friend as a witness, and optionally stake money ($1–$100) to increase motivation. If the user keeps their vow, the money is refunded. If they break it, the money is donated to a charity of their choice.

## This Is Not Gambling

- There is zero randomness. Outcomes are determined entirely by the user's own behavior and verified by a human witness.
- There is no "house edge" — the app operator does not profit from broken vows.
- Money from broken vows goes to registered charities (e.g., ALS Association, St. Jude Children's Hospital), not back to other users.
- Users choose their own stake amount (including $0 — stakes are optional).
- The user can cancel (void) any vow and receive a full refund at any time before the verdict.
- This model is functionally identical to apps like StickK and Beeminder, which are approved on the App Store.

## Payment Flow

- Payments are processed via Stripe.
- On seal: the user's card is charged the stake amount.
- On "kept" verdict: a full refund is issued automatically.
- On "broken" verdict: the charge stands and funds are allocated for charitable donation.
- On void/cancel: a full refund is issued.

## Test Account

- Email: reviewer@unbreakablevow.app
- Password: [CREATE A TEST ACCOUNT AND ADD CREDENTIALS HERE]

## Test Flow

1. Open the app → enter a vow (e.g., "I will exercise 3 times this week")
2. Optionally refine the vow
3. Choose a witness (select "I'll verify myself" for solo testing)
4. Set a stake amount (or skip with $0)
5. Seal the vow
6. View the active vow on the dashboard
7. Submit a verdict (kept or broken)

For Stripe testing, use card number 4242 4242 4242 4242, any future expiry, any CVC.
