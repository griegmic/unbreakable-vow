#!/usr/bin/env node
/**
 * Seed script for PR #3B pixel diff testing.
 * Inserts fixture vows at deterministic tokens for each S19 router state.
 * Run: node web/scripts/seed-witness-test.js
 * Cleanup: node web/scripts/seed-witness-test.js --cleanup
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MAKER_ID = null; // We'll create a fake user
const TOKEN_PREFIX = 'pr3b-test-';
const FIXTURES = [
  {
    token: TOKEN_PREFIX + 's14-pending',
    status: 'sealed',
    witness_accepted_at: null,
    witness_declined: false,
    verdict: null,
    desc: 'S14 — pending witness accept',
  },
  {
    token: TOKEN_PREFIX + 's16-accepted',
    status: 'active',
    witness_accepted_at: new Date().toISOString(),
    witness_declined: false,
    verdict: null,
    desc: 'S16 — witness accepted, active vow',
  },
  {
    token: TOKEN_PREFIX + 's17-verdict',
    status: 'awaiting_verdict',
    witness_accepted_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    witness_declined: false,
    verdict: null,
    desc: 'S17 — awaiting verdict',
  },
  {
    token: TOKEN_PREFIX + 's19-kept',
    status: 'kept',
    witness_accepted_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    witness_declined: false,
    verdict: 'kept',
    verdict_at: '2026-04-22T00:00:00Z',
    desc: 'S19-OUTCOME — verdict kept',
    // Fixture values match mock exactly for pixel diff:
    overrides: {
      refined_text: 'Walk 10,000 steps every day for one week.',
      stake_amount: 5000, // $50 in cents
      witness_name: 'Maya',
      destination: 'charity',
    },
  },
  {
    token: TOKEN_PREFIX + 's19-declined',
    status: 'sealed',
    witness_accepted_at: null,
    witness_declined: true,
    verdict: null,
    desc: 'S19-DECLINED — witness passed',
  },
  {
    token: TOKEN_PREFIX + 's19-voided',
    status: 'voided',
    witness_accepted_at: null,
    witness_declined: false,
    verdict: null,
    desc: 'S19-VOIDED — maker cancelled',
  },
  {
    token: TOKEN_PREFIX + 's19-expired',
    status: 'broken', // unusual status that falls through router
    witness_accepted_at: null,
    witness_declined: false,
    verdict: null, // no verdict despite terminal status → expired branch
    desc: 'S19-EXPIRED — data inconsistency edge case',
  },
];

async function seed() {
  console.log('Seeding witness test fixtures...\n');

  // First, find or create a test user
  const { data: users } = await supabase.from('users').select('id, display_name').limit(1);
  const userId = users?.[0]?.id;
  if (!userId) {
    console.error('No users in DB. Create at least one user first.');
    process.exit(1);
  }
  console.log('Using maker: ' + (users[0].display_name || userId));

  for (const fix of FIXTURES) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('vows')
      .select('id')
      .eq('witness_invite_token', fix.token)
      .single();

    if (existing) {
      console.log('  EXISTS: ' + fix.token + ' (' + fix.desc + ')');
      continue;
    }

    const overrides = fix.overrides || {};
    const row = {
      user_id: userId,
      raw_input: overrides.refined_text || 'I will run 3x this week.',
      refined_text: overrides.refined_text || 'I will run 3x this week.',
      status: fix.status,
      vow_type: 'self',
      witness_name: overrides.witness_name || 'Joey',
      witness_phone: '+14155551234',
      witness_invite_token: fix.token,
      witness_accepted_at: fix.witness_accepted_at,
      witness_declined: fix.witness_declined,
      stake_amount: overrides.stake_amount || 2500,
      consequence: 'charity',
      destination: overrides.destination || 'Red Cross',
      starts_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      ends_at: new Date(Date.now() + 4 * 86400000).toISOString(),
      verdict: fix.verdict || null,
      verdict_at: fix.verdict_at || null,
      sealed_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    };

    const { error } = await supabase.from('vows').insert(row);
    if (error) {
      console.error('  FAILED: ' + fix.token + ' — ' + error.message);
    } else {
      console.log('  SEEDED: ' + fix.token + ' (' + fix.desc + ')');
    }
  }

  console.log('\nDone. Test URLs:');
  for (const fix of FIXTURES) {
    console.log('  /w/' + fix.token + '  — ' + fix.desc);
  }
}

async function cleanup() {
  console.log('Cleaning up test fixtures...');
  const { error } = await supabase
    .from('vows')
    .delete()
    .like('witness_invite_token', TOKEN_PREFIX + '%');
  if (error) {
    console.error('Cleanup failed:', error.message);
  } else {
    console.log('Cleaned up all pr3b-test-* fixtures.');
  }
}

if (process.argv.includes('--cleanup')) {
  cleanup();
} else {
  seed();
}
