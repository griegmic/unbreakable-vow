#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const WIDTH = 393;
const HEIGHT = 852;
const DPR = 3;
const OUT_DIR = path.join(__dirname, '../renders/pr3p');

const IDS = {
  activeWitnessed:  'a0003e00-0001-4000-8000-000000000001',
  activeSolo:       'a0003e00-0002-4000-8000-000000000002',
  witnessPending:   'a0003e00-0003-4000-8000-000000000003',
  witnessDeclined:  'a0003e00-0004-4000-8000-000000000004',
  awaitingVerdict:  'a0003e00-0005-4000-8000-000000000005',
  kept:             'a0003e00-0006-4000-8000-000000000006',
  broken:           'a0003e00-0007-4000-8000-000000000007',
  voided:           'a0003e00-0008-4000-8000-000000000008',
  challengePending: 'a0003e00-0009-4000-8000-000000000009',
};

// Auth injection using Supabase admin API
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function getAuthSession() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  // Get the maker user
  const { data: users } = await supabase.from('users').select('id').limit(1);
  if (!users?.length) throw new Error('No users');
  const userId = users[0].id;

  // Generate a magic link and extract the session
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: 'test-screenshot@unbreakablevow.app',
  });

  // Instead, use the admin to create a session directly
  // We'll inject via localStorage with the service role approach
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1 });
  const user = authUsers?.find(u => u.id === userId);
  if (!user) throw new Error('User not found in auth');

  return { userId, email: user.email };
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: DPR,
  });

  // The /vow/[id] page requires auth. Since we can't easily inject
  // Supabase auth in headless Playwright, we'll capture what we can.
  // Unauthenticated visits will redirect to / — so we need to use
  // the dev server with an existing session.

  // Approach: Visit the dashboard first (which also requires auth),
  // then navigate to each vow. If auth isn't available, we'll get
  // the loading/redirect states which are also useful screenshots.

  const screenshots = Object.entries(IDS);

  for (const [name, id] of screenshots) {
    console.log(`Capturing ${name}...`);
    const page = await context.newPage();
    await page.goto(`http://localhost:3000/vow/${id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(OUT_DIR, `impl-${name}.png`) });
    console.log(`  → impl-${name}.png`);
    await page.close();
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
