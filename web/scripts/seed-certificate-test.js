#!/usr/bin/env node
/**
 * Seed script for PR #3G certificate pixel diff testing.
 * Inserts a single kept vow fixture matching the mock's content.
 * Run: node web/scripts/seed-certificate-test.js
 * Cleanup: node web/scripts/seed-certificate-test.js --cleanup
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VOW_ID = 'a0000000-ce47-4e57-0000-000000000001';

async function seed() {
  console.log('Seeding certificate test fixture...\n');

  const { data: users } = await supabase.from('users').select('id, display_name').limit(1);
  const userId = users?.[0]?.id;
  if (!userId) { console.error('No users in DB.'); process.exit(1); }

  // Update maker display name to match mock
  await supabase.from('users').update({ display_name: 'Joey Schwartz' }).eq('id', userId);
  console.log('Updated maker name to Joey Schwartz');

  const fixture = {
    id: VOW_ID,
    user_id: userId,
    raw_input: 'walk 10000 steps every day for one week',
    refined_text: 'walk 10,000 steps every day for one week.',
    status: 'kept',
    vow_type: 'self',
    witness_name: 'Maya Lin',
    witness_phone: '+15551234567',
    witness_invite_token: 'cert-test-witness',
    stake_amount: 5000,
    consequence: 'charity',
    destination: 'ALS Association',
    sealed_at: '2026-04-15T12:00:00Z',
    verdict: 'kept',
    verdict_at: '2026-04-22T12:00:00Z',
    starts_at: '2026-04-15T12:00:00Z',
    ends_at: '2026-04-22T12:00:00Z',
  };

  // Cleanup first
  await supabase.from('vows').delete().eq('id', VOW_ID);

  const { error } = await supabase.from('vows').insert(fixture);
  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }

  console.log(`Seeded kept vow: ${VOW_ID}`);
  console.log(`URL: http://localhost:3000/certificate/${VOW_ID}`);
}

async function cleanup() {
  await supabase.from('vows').delete().eq('id', VOW_ID);
  console.log('Cleaned up certificate fixture.');
}

if (process.argv.includes('--cleanup')) {
  cleanup().catch(console.error);
} else {
  seed().catch(console.error);
}
