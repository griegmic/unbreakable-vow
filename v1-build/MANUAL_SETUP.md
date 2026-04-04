# Manual Setup Guide — Do These Before Running Claude Code Prompts

Everything here requires web portals, account creation, or key generation that Claude Code can't do for you. Complete all steps before starting Prompt 02.

---

## 1. Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. **Project name:** `unbreakable-vow`
3. **Database password:** Generate a strong one, save it in 1Password
4. **Region:** Pick closest to your users (e.g., `us-east-1`)
5. Wait for project to provision (~2 min)

**Collect these values:**
- Project URL: `Settings → API → Project URL` (looks like `https://xxxxx.supabase.co`)
- Anon Key: `Settings → API → anon public` (safe for client)
- Service Role Key: `Settings → API → service_role` (server-only, never in client code)
- DB connection string: `Settings → Database → Connection string → URI` (for migrations)

**Create a `.env` file** (Claude Code will reference this):
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

---

## 2. Apple Developer — Sign-In with Apple

1. Go to [developer.apple.com](https://developer.apple.com) → Certificates, Identifiers & Profiles
2. **Register a new App ID** (if not already done):
   - Platform: iOS
   - Bundle ID: Pick your own (e.g., `com.yourname.unbreakablevow`) — **you must change from the Rork default** `app.rork.vkqbtdzg60w057segl0gr`
   - Enable "Sign In with Apple" capability
3. **Create a Service ID** (for Supabase to verify tokens):
   - Identifiers → Service IDs → Register
   - Identifier: `com.yourname.unbreakablevow.auth`
   - Enable "Sign In with Apple"
   - Configure: Add Supabase callback URL (see step 4)
4. **In Supabase Dashboard:**
   - `Authentication → Providers → Apple`
   - Enable it
   - Add your Service ID
   - Copy the callback URL Supabase gives you → paste it back in Apple's Service ID config
5. **Create a Key** for server-side verification:
   - Keys → Create Key → Enable "Sign In with Apple"
   - Download the `.p8` file
   - Note the Key ID
   - Add Key ID + Team ID + `.p8` contents to Supabase Apple provider config

**Save these values:**
```
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=YYYYYYYYYY
APPLE_BUNDLE_ID=com.yourname.unbreakablevow
```

---

## 3. Stripe Account

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) → Register or sign in
2. **Stay in Test Mode** (toggle at top-right) for all v1 development
3. **Get API keys:**
   - `Developers → API Keys`
   - Publishable key: `pk_test_...`
   - Secret key: `sk_test_...`
4. **Enable payment methods:**
   - `Settings → Payments → Payment methods`
   - Ensure "Cards" is enabled (it is by default)
5. **Set up webhook** (after Edge Functions are deployed):
   - `Developers → Webhooks → Add endpoint`
   - URL: `https://xxxxx.supabase.co/functions/v1/stripe-webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
   - Copy the webhook signing secret

**Save these values:**
```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 4. Twilio — Toll-Free SMS

1. Go to [twilio.com](https://www.twilio.com) → Sign up or sign in
2. **Get a toll-free number:**
   - `Phone Numbers → Manage → Buy a number`
   - Search for toll-free numbers (starting with +1-800, +1-833, +1-844, etc.)
   - Buy one (~$2/month)
   - **Important:** Toll-free verification is required before sending at scale. For beta (10-30 users), unverified is fine but submit verification early.
3. **Get credentials:**
   - `Account → API keys & tokens`
   - Account SID: `ACxxxxxxx`
   - Auth Token: visible on dashboard

**Save these values:**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+18001234567
```

---

## 5. Supabase Edge Function Secrets

After collecting all the above, add them as Supabase secrets. Go to your terminal:

```bash
# Install Supabase CLI if not already
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref xxxxx

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxx...
supabase secrets set TWILIO_AUTH_TOKEN=xxxxxxx...
supabase secrets set TWILIO_PHONE_NUMBER=+18001234567
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

---

## 6. EAS Build Setup

1. **Install EAS CLI:** `npm install -g eas-cli`
2. **Log in:** `eas login` (create Expo account if needed)
3. **Update `app.json`** — change bundle ID from Rork default:
   ```json
   "ios": {
     "bundleIdentifier": "com.yourname.unbreakablevow"
   }
   ```
4. **Initialize EAS:** `cd expo && eas build:configure`
   - This creates `eas.json`
5. **Set up push notifications:**
   - `eas credentials` → iOS → Push Notifications
   - Or upload APNs key in Expo dashboard

---

## 7. Add Secrets to `.env` (Final)

Create `/tmp/rork-unbreakable-vow/expo/.env`:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App
EXPO_PUBLIC_APP_URL=https://unbreakablevow.app
```

**Do NOT put server-side secrets in `.env`** — those go in Supabase secrets (step 5).

---

## Checklist

- [ ] Supabase project created, URL + keys saved
- [ ] Apple Developer: App ID registered with new bundle ID, Sign-In with Apple enabled
- [ ] Apple Developer: Service ID created, linked to Supabase callback
- [ ] Apple Developer: Key created, `.p8` downloaded, uploaded to Supabase
- [ ] Stripe account in test mode, publishable + secret keys saved
- [ ] Twilio account created, toll-free number purchased
- [ ] All secrets added to Supabase Edge Function secrets
- [ ] `.env` file created in `expo/` directory
- [ ] EAS CLI installed, logged in, build configured
- [ ] Bundle ID changed from Rork default in `app.json`

Once all boxes are checked, you're ready for Prompt 02.
