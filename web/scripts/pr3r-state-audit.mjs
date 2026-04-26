#!/usr/bin/env node
/**
 * PR #3R — State-aware screenshot audit
 *
 * 1. Creates a test user via Supabase admin API
 * 2. Seeds vows in all key states
 * 3. Gets a valid JWT via signInWithPassword
 * 4. Injects session into Playwright
 * 5. Screenshots all auth-gated routes
 * 6. Screenshots HTML mocks for comparison
 *
 * Usage: node scripts/pr3r-state-audit.mjs [--cleanup]
 */
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env.local') });

const BASE = 'http://localhost:3000';
const OUT = join(__dirname, '../../renders/pr3r-state-audit');
mkdirSync(OUT, { recursive: true });

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPA_URL || !SUPA_ANON || !SUPA_SERVICE) {
  console.error('Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(SUPA_URL, SUPA_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
const anon = createClient(SUPA_URL, SUPA_ANON, { auth: { autoRefreshToken: false, persistSession: false } });

const TEST_EMAIL = 'pr3r-screenshot-test@example.com';
const TEST_PASS = 'pr3r-test-' + Date.now();
const PREFIX = 'b0003e00-';
const dayMs = 86400000;
const now = new Date();

const ID = {
  draft:            'b0003e00-0001-4000-8000-000000000001',
  sealed:           'b0003e00-0002-4000-8000-000000000002',
  active:           'b0003e00-0003-4000-8000-000000000003',
  awaitingVerdict:  'b0003e00-0004-4000-8000-000000000004',
  kept:             'b0003e00-0005-4000-8000-000000000005',
  broken:           'b0003e00-0006-4000-8000-000000000006',
};

const WITNESS_TOKENS = {
  pending:   'pr3r-wit-pending',
  accepted:  'pr3r-wit-accepted',
  declined:  'pr3r-wit-declined',
};

// ── Step 1: Create test user ──────────────────────────────────────────────

async function createTestUser() {
  // Delete existing test user if present
  const { data: existing } = await admin.auth.admin.listUsers();
  const old = existing?.users?.find(u => u.email === TEST_EMAIL);
  if (old) {
    await admin.auth.admin.deleteUser(old.id);
    // Clean up their vows and user row
    await admin.from('vows').delete().eq('user_id', old.id);
    await admin.from('users').delete().eq('id', old.id);
    console.log('  Cleaned up old test user');
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASS,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser failed: ${error.message}`);

  const userId = data.user.id;
  console.log(`  ✓ Test user created: ${userId}`);

  // Insert into public.users
  await admin.from('users').upsert({
    id: userId,
    display_name: 'Screenshot Bot',
    phone: '+15550000000',
  });

  return userId;
}

// ── Step 2: Seed vows ─────────────────────────────────────────────────────

async function seedVows(userId) {
  // Clean up old fixtures
  const { data: old } = await admin.from('vows').select('id').like('id', `${PREFIX}%`);
  for (const v of (old || [])) {
    await admin.from('vows').delete().eq('id', v.id);
  }

  const fixtures = [
    {
      id: ID.draft,
      refined_text: 'Ship the landing page by Friday.',
      status: 'draft',
      stake_amount: 5000,
      destination: 'NRA',
      witness_name: 'Nick',
      witness_phone: '+15551234567',
      witness_invite_token: WITNESS_TOKENS.pending,
      starts_at: now.toISOString(),
      ends_at: new Date(now.getTime() + 7 * dayMs).toISOString(),
    },
    {
      id: ID.sealed,
      refined_text: 'Go to the gym Mon, Wed & Fri this week.',
      status: 'sealed',
      stake_amount: 5000,
      destination: 'NRA',
      witness_name: 'Sarah',
      witness_phone: '+15551234568',
      witness_invite_token: WITNESS_TOKENS.accepted,
      sealed_at: new Date(now.getTime() - 1 * dayMs).toISOString(),
      starts_at: now.toISOString(),
      ends_at: new Date(now.getTime() + 7 * dayMs).toISOString(),
    },
    {
      id: ID.active,
      refined_text: 'No alcohol for two weeks.',
      status: 'active',
      stake_amount: 2500,
      destination: 'ALS Association',
      witness_name: 'Maya',
      witness_accepted_at: new Date(now.getTime() - 2 * dayMs).toISOString(),
      witness_invite_token: 'pr3r-wit-active',
      starts_at: new Date(now.getTime() - 2 * dayMs).toISOString(),
      ends_at: new Date(now.getTime() + 12 * dayMs).toISOString(),
    },
    {
      id: ID.awaitingVerdict,
      refined_text: 'Run a 5K this week.',
      status: 'awaiting_verdict',
      stake_amount: 5000,
      destination: 'NRA',
      witness_name: 'Maya',
      witness_accepted_at: new Date(now.getTime() - 7 * dayMs).toISOString(),
      witness_invite_token: 'pr3r-wit-verdict',
      starts_at: new Date(now.getTime() - 7 * dayMs).toISOString(),
      ends_at: new Date(now.getTime() - 1 * dayMs).toISOString(),
    },
    {
      id: ID.kept,
      refined_text: 'Meditate every morning for a week.',
      status: 'kept',
      verdict: 'kept',
      verdict_at: new Date(now.getTime() - 2 * dayMs).toISOString(),
      stake_amount: 2500,
      destination: 'ALS Association',
      witness_name: 'Maya',
      witness_accepted_at: new Date(now.getTime() - 10 * dayMs).toISOString(),
      witness_invite_token: 'pr3r-wit-kept',
      starts_at: new Date(now.getTime() - 10 * dayMs).toISOString(),
      ends_at: new Date(now.getTime() - 3 * dayMs).toISOString(),
    },
    {
      id: ID.broken,
      refined_text: 'No fast food for a month.',
      status: 'broken',
      verdict: 'broken',
      verdict_at: new Date(now.getTime() - 1 * dayMs).toISOString(),
      stake_amount: 5000,
      destination: 'NRA',
      witness_name: 'Nick',
      witness_accepted_at: new Date(now.getTime() - 14 * dayMs).toISOString(),
      witness_invite_token: 'pr3r-wit-broken',
      starts_at: new Date(now.getTime() - 14 * dayMs).toISOString(),
      ends_at: new Date(now.getTime() - 2 * dayMs).toISOString(),
    },
  ];

  // Also create a witness-declined fixture using the pending token
  // (The pending one stays as-is — no witness_accepted_at)

  for (const f of fixtures) {
    const row = {
      id: f.id,
      user_id: userId,
      raw_input: f.refined_text,
      refined_text: f.refined_text,
      status: f.status,
      vow_type: 'self',
      witness_name: f.witness_name,
      witness_phone: f.witness_phone || null,
      witness_invite_token: f.witness_invite_token,
      witness_accepted_at: f.witness_accepted_at || null,
      witness_declined: f.witness_declined || false,
      stake_amount: f.stake_amount,
      consequence: 'charity',
      destination: f.destination,
      starts_at: f.starts_at,
      ends_at: f.ends_at,
      verdict: f.verdict || null,
      verdict_at: f.verdict_at || null,
      sealed_at: f.sealed_at || null,
    };
    const { error } = await admin.from('vows').insert(row);
    if (error) console.error(`  ✗ ${f.id}: ${error.message}`);
    else console.log(`  ✓ ${f.status}: ${f.id}`);
  }
}

// ── Step 3: Get auth session ──────────────────────────────────────────────

async function getSession() {
  const { data, error } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASS,
  });
  if (error) throw new Error(`signIn failed: ${error.message}`);
  console.log(`  ✓ Session obtained (expires: ${new Date(data.session.expires_at * 1000).toISOString()})`);
  return data.session;
}

// ── Step 4: Playwright with injected auth ─────────────────────────────────

async function screenshotRoute(browser, session, { path, name, waitFor }) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();

  // Navigate to base first to set localStorage
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });

  // Inject Supabase auth session into localStorage
  const projectRef = new URL(SUPA_URL).hostname.split('.')[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  await page.evaluate(({ key, sess }) => {
    localStorage.setItem(key, JSON.stringify(sess));
    localStorage.setItem('uv_ceremony_seen', '1');
  }, { key: storageKey, sess: session });

  // Navigate to target route
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(waitFor || 2000);

  const finalUrl = page.url();
  const redirected = !finalUrl.endsWith(path) && !finalUrl.includes(path.split('?')[0]);

  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });

  const status = redirected ? `REDIRECTED → ${finalUrl}` : 'OK';
  console.log(`  ${redirected ? '⚠' : '✓'} ${name}: ${status}`);

  await context.close();
  return !redirected;
}

async function screenshotMock(browser, filename) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  const mockPath = join(__dirname, `../../design-alignment/v1v2/flow/html/${filename}`);
  await page.goto(`file://${mockPath}`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/mock-${filename.replace('.html', '')}.png`, fullPage: false });
  console.log(`  ✓ mock: ${filename}`);
  await context.close();
}

// ── Step 5: Cleanup ───────────────────────────────────────────────────────

async function cleanup() {
  const { data: existing } = await admin.auth.admin.listUsers();
  const old = existing?.users?.find(u => u.email === TEST_EMAIL);
  if (old) {
    await admin.from('vows').delete().eq('user_id', old.id);
    await admin.from('users').delete().eq('id', old.id);
    await admin.auth.admin.deleteUser(old.id);
    console.log('Cleaned up test user and fixtures.');
  } else {
    console.log('No test user found.');
  }
  // Also clean vow fixtures by prefix
  const { data: vows } = await admin.from('vows').select('id').like('id', `${PREFIX}%`);
  for (const v of (vows || [])) {
    await admin.from('vows').delete().eq('id', v.id);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (process.argv.includes('--cleanup')) {
    await cleanup();
    return;
  }

  console.log('\n── PR #3R: State-Aware Screenshot Audit ──\n');

  console.log('1. Creating test user...');
  const userId = await createTestUser();

  console.log('2. Seeding vow fixtures...');
  await seedVows(userId);

  console.log('3. Obtaining auth session...');
  const session = await getSession();

  console.log('4. Taking screenshots...\n');
  const browser = await chromium.launch();

  // ── Auth-gated app routes ──
  const routes = [
    // Flow screens (require vow in localStorage — may still redirect)
    // These use VowFlowProvider, not DB queries, so they need localStorage state too
    // We'll flag if they redirect

    // Dashboard / home for auth'd user
    { path: '/dashboard', name: 'dashboard' },

    // Vow detail — various states
    { path: `/vow/${ID.active}`, name: 'vow-detail-active' },
    { path: `/vow/${ID.awaitingVerdict}`, name: 'vow-detail-awaiting' },
    { path: `/vow/${ID.kept}`, name: 'vow-detail-kept' },
    { path: `/vow/${ID.broken}`, name: 'vow-detail-broken' },

    // History
    { path: '/history', name: 'history' },

    // Settings
    { path: '/settings', name: 'settings' },

    // Quick vow
    { path: '/quick-vow', name: 'quick-vow' },

    // Witness routes (public, token-based — no auth needed)
    { path: `/w/${WITNESS_TOKENS.pending}`, name: 'witness-landing-pending' },
    { path: `/w/${WITNESS_TOKENS.accepted}`, name: 'witness-landing-accepted' },

    // Outcome (public)
    { path: `/outcome/${ID.kept}`, name: 'outcome-kept' },
    { path: `/outcome/${ID.broken}`, name: 'outcome-broken' },

    // Vow-kept and vow-broken (query param routes)
    { path: '/vow-kept?amount=50&consequence=charity&destination=NRA', name: 'vow-kept' },
    { path: '/vow-broken?amount=50&consequence=charity&destination=NRA', name: 'vow-broken' },

    // Home (for comparison with auth)
    { path: '/', name: 'home-authed' },
  ];

  console.log('  App routes:');
  for (const r of routes) {
    await screenshotRoute(browser, session, r);
  }

  // ── HTML mocks for comparison ──
  console.log('\n  HTML mocks:');
  const mocks = [
    '01-home.html',
    '02-refine-nudge.html',
    '03-pitch.html',
    '05-witness-pick.html',
    '05g-sealed-sent.html',
    '08-quick-vow.html',
    '09-witness-landing.html',
    '10-witness-accepted.html',
    '11-verdict-prompt.html',
    'm11-vow-kept-charity.html',
    'vow-broken-charity.html',
    's19-outcome-resolved.html',
    's20-dashboard-multi.html',
    's20-dashboard-A-revised-v2.html',
    's20-witnessing-all.html',
    '14-active-countdown.html',
    '16-witness-pending.html',
  ];
  for (const m of mocks) {
    await screenshotMock(browser, m);
  }

  await browser.close();

  console.log('\n5. Cleaning up test user...');
  await cleanup();

  console.log(`\n✓ Screenshots saved to renders/pr3r-state-audit/`);
  console.log('  Compare app screenshots to mock- prefixed files.');
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  cleanup().then(() => process.exit(1));
});
