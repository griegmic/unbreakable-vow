# Phase 8: Cron Hardening + Web QA

## Context
Phases 1-7 built all web features. This phase hardens the cron job configuration and runs comprehensive QA.

## Objective
Fix cron URL issue, verify retry logic, run full regression + new feature test suite, fix any bugs.

## Tasks

### 1. Fix cron configuration
Read `supabase/migrations/20260404000002_cron_setup.sql`.

The migration has a hardcoded Supabase URL and `PLACEHOLDER_SERVICE_ROLE_KEY`. Options:
- **Option A (preferred):** Document that the cron must be configured via Supabase Dashboard (SQL Editor or Cron UI). Provide the SQL command to run manually:
  ```sql
  SELECT cron.schedule(
    'process-vow-events',
    '*/15 * * * *',
    $$
    SELECT net.http_post(
      url := 'https://faufcfppnkwrxabgvknt.supabase.co/functions/v1/cron-runner',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) AS request_id;
    $$
  );
  ```
- **Option B:** Create a new migration that drops and recreates the cron job with vault reference.

Choose the approach that works with the current Supabase setup. If vault secrets are configured, use Option B. If not, use Option A with documentation.

### 2. Verify SMS retry
Test the cron SMS retry task:
1. Create a test vow with `sms_failed = true` and `sealed_at` within last 48h
2. Invoke cron-runner: `curl -X POST .../functions/v1/cron-runner -H "Authorization: Bearer {service_role_key}"`
3. Verify: SMS retry attempted (check sms_log for new entry)
4. On success: `sms_failed` flag cleared
5. Test failure limit: create vow with 3+ existing sms_log entries for `message_type='seal'` → verify cron gives up and sends push notification

### 3. Verify refund retry
Test the cron refund retry task:
1. Create a test vow with `refund_failed = true` and a valid `stripe_payment_intent_id`
2. Invoke cron-runner
3. Verify: refund retry attempted
4. On success: `refund_failed` flag cleared, audit event logged
5. Test with invalid PI: verify graceful failure

### 4. Full regression test
Run through every existing flow and verify nothing broke:

**First-time web flow:**
- [ ] `/` shows input (unauthenticated)
- [ ] Enter vow → refine → witness → stake → seal
- [ ] Auth modal works (Google OAuth + Email OTP)
- [ ] Stripe payment works with test card
- [ ] Seal completes → certificate page
- [ ] Witness receives SMS (or check sms_log)

**Existing witness flow:**
- [ ] `/w/[token]` shows vow details
- [ ] Accept → witness_accepted_at set
- [ ] Decline → witness_declined set
- [ ] `/w/[token]/verdict` shows verdict page
- [ ] Submit verdict → vow resolved

**Self-resolve:**
- [ ] `/self-resolve` works for solo vows

**Outcomes:**
- [ ] `/vow-kept` renders with stats
- [ ] `/vow-broken` renders
- [ ] `/outcome/[vowId]` renders (public)

**Settings/history:**
- [ ] `/settings` shows user info
- [ ] `/history` shows vow list

### 5. Full new feature test
Run through every new feature:

**Dashboard:**
- [ ] Authenticated redirect from `/` to `/dashboard`
- [ ] All four sections render correctly
- [ ] Multiple concurrent vows display
- [ ] Witnessing section shows correct vows
- [ ] Incoming challenges show with buttons
- [ ] Accept/decline challenge works from dashboard
- [ ] Stats accurate
- [ ] Empty state works

**Power-user creation:**
- [ ] `/create` form renders all fields
- [ ] "Me" / "Someone else" toggle works
- [ ] Recent witnesses populate
- [ ] $0 vow creation end-to-end
- [ ] Staked vow creation end-to-end
- [ ] Challenge creation end-to-end

**Challenge flow:**
- [ ] `/c/[token]` renders challenge details
- [ ] Accept → challenge active
- [ ] Decline → vow voided
- [ ] Verdict flow works for challenges

**Timeline + check-ins:**
- [ ] Timeline shows on vow detail
- [ ] Check-in buttons work
- [ ] 4-hour cooldown enforced
- [ ] Timeline visible on witness page
- [ ] Timeline visible on challenge page

**Certificate:**
- [ ] Renders with correct data
- [ ] Share works
- [ ] OG metadata correct

**Verdict improvements:**
- [ ] Undo toast works (3 seconds)
- [ ] Challenge-back CTA visible

**Void:**
- [ ] Void active vow works
- [ ] Refund on staked void
- [ ] Dashboard shows voided vow

### 6. Mobile web responsive test
Test ALL pages at 375px width (iPhone SE):
- [ ] Dashboard
- [ ] Create page
- [ ] Vow detail
- [ ] Certificate
- [ ] Challenge accept page
- [ ] All text readable, no horizontal overflow
- [ ] Touch targets ≥ 44px
- [ ] No elements cut off by safe areas

### 7. Bug fixes
Fix any issues found in steps 2-6. Document each fix.

## Verification
- [ ] Cron runs on schedule (or documented for manual setup)
- [ ] SMS retry works and respects 3-attempt limit
- [ ] Refund retry works
- [ ] ALL regression tests pass
- [ ] ALL new feature tests pass
- [ ] Mobile responsive on all pages
- [ ] No console errors in browser DevTools
- [ ] No TypeScript compilation errors

## Do Not Touch
- Feature code (only bug fixes in this phase)
- Schema/migrations (unless fixing cron)
- Edge function logic (unless fixing a bug found in QA)
- Expo files
