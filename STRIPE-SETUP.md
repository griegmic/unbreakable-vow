# Stripe Payment Setup

## What the payment flow does

1. User sets stake amount ($10-$100)
2. `create-payment-intent` creates a Stripe PaymentIntent with `capture_method: manual` (holds funds, doesn't charge yet)
3. App shows Stripe payment sheet → user enters card
4. `seal-vow` verifies payment is ready, **captures** the funds, activates the vow
5. If vow is **kept** → `submit-verdict` issues a full refund (user gets money back)
6. If vow is **broken** → funds stay captured (goes to destination charity)

## Manual setup steps

### 1. Stripe Dashboard (stripe.com)

- Create account or log in
- For testing: use **test mode** (toggle in top-right)
- Get your keys from Developers → API Keys:
  - **Publishable key**: `pk_test_...`
  - **Secret key**: `sk_test_...`

### 2. Set Stripe publishable key in the app

Edit `expo/app.json` → `extra`:
```json
"stripePublishableKey": "pk_test_YOUR_KEY_HERE"
```

Or set env var:
```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

### 3. Set Stripe secret key in Supabase

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
```

### 4. Deploy edge functions

```bash
cd supabase
supabase functions deploy create-payment-intent
supabase functions deploy seal-vow
supabase functions deploy submit-verdict
supabase functions deploy cron-runner
supabase functions deploy send-sms
supabase functions deploy verdict-page
```

### 5. Test with Stripe test cards

- Success: `4242 4242 4242 4242` (any future exp, any CVC)
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

## Twilio SMS setup (for witness notifications)

```bash
supabase secrets set TWILIO_ACCOUNT_SID=your_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_token
supabase secrets set TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

## Database: add refund_failed column

Run this migration in Supabase SQL editor:
```sql
ALTER TABLE vows ADD COLUMN IF NOT EXISTS refund_failed boolean DEFAULT false;
```

## Environment variables summary

| Variable | Where | Required |
|----------|-------|----------|
| `stripePublishableKey` | app.json extra | Yes (for payments) |
| `STRIPE_SECRET_KEY` | Supabase secrets | Yes |
| `TWILIO_ACCOUNT_SID` | Supabase secrets | Yes (for SMS) |
| `TWILIO_AUTH_TOKEN` | Supabase secrets | Yes (for SMS) |
| `TWILIO_PHONE_NUMBER` | Supabase secrets | Yes (for SMS) |
| `SERVICE_ROLE_KEY` | Supabase (auto) | Auto-set |
| `SUPABASE_URL` | Supabase (auto) | Auto-set |

## Going live

1. Switch Stripe to live mode
2. Replace `pk_test_` → `pk_live_` in app.json
3. Replace `sk_test_` → `sk_live_` in Supabase secrets
4. Redeploy edge functions
5. Rebuild app with EAS or Rork
