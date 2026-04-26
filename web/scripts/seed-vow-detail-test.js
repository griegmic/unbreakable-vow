#!/usr/bin/env node
/**
 * Seed script for PR #3P vow detail phase screenshots.
 * Creates fixture vows in various states to exercise all 9+ phases.
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// UUIDs with pr3p prefix baked in for identification
const ID = {
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
const PREFIX = 'a0003e00-';
const dayMs = 86400000;
const now = new Date();

async function seed() {
  console.log('Seeding vow detail test fixtures...\n');

  const { data: users } = await supabase.from('users').select('id, display_name').limit(1);
  const userId = users?.[0]?.id;
  if (!userId) { console.error('No users in DB.'); process.exit(1); }
  console.log('Maker:', users[0].display_name, '(' + userId + ')');

  // Different user for witness role
  const witnessUserId = '00000000-0000-0000-0000-000000000099';

  const fixtures = [
    // 1. Active — witness accepted
    {
      id: ID.activeWitnessed,
      refined_text: 'Go to the gym 4 times this week.',
      status: 'active',
      stake_amount: 5000,
      destination: 'ALS Association',
      witness_name: 'Maya',
      witness_accepted_at: new Date(now.getTime() - 2 * dayMs).toISOString(),
      witness_invite_token: 'pr3p-wit-active',
      starts_at: new Date(now.getTime() - 2 * dayMs).toISOString(),
      ends_at: new Date(now.getTime() + 5 * dayMs).toISOString(),
    },
    // 2. Active — solo
    {
      id: ID.activeSolo,
      refined_text: 'Read for 30 minutes every day.',
      status: 'active',
      stake_amount: 0,
      destination: '',
      witness_name: 'Just me',
      witness_invite_token: 'pr3p-wit-solo',
      starts_at: new Date(now.getTime() - 3 * dayMs).toISOString(),
      ends_at: new Date(now.getTime() + 4 * dayMs).toISOString(),
    },
    // 3. Active — witness pending
    {
      id: ID.witnessPending,
      refined_text: 'No sugar for two weeks.',
      status: 'active',
      stake_amount: 2500,
      destination: 'St. Jude',
      witness_name: 'Nick',
      witness_phone: '+15551234567',
      witness_invite_token: 'pr3p-wit-pending',
      starts_at: new Date(now.getTime() - 1 * dayMs).toISOString(),
      ends_at: new Date(now.getTime() + 13 * dayMs).toISOString(),
    },
    // 4. Active — witness declined
    {
      id: ID.witnessDeclined,
      refined_text: 'Wake up at 6am every day.',
      status: 'active',
      stake_amount: 5000,
      destination: 'ALS Association',
      witness_name: 'Sarah',
      witness_declined: true,
      witness_invite_token: 'pr3p-wit-declined',
      starts_at: new Date(now.getTime() - 1 * dayMs).toISOString(),
      ends_at: new Date(now.getTime() + 6 * dayMs).toISOString(),
    },
    // 5. Awaiting verdict — maker
    {
      id: ID.awaitingVerdict,
      refined_text: 'Run a 5K this week.',
      status: 'awaiting_verdict',
      stake_amount: 5000,
      destination: 'ALS Association',
      witness_name: 'Maya',
      witness_accepted_at: new Date(now.getTime() - 7 * dayMs).toISOString(),
      witness_invite_token: 'pr3p-wit-verdict',
      starts_at: new Date(now.getTime() - 7 * dayMs).toISOString(),
      ends_at: new Date(now.getTime() - 1 * dayMs).toISOString(),
    },
    // 6. Kept
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
      witness_invite_token: 'pr3p-wit-kept',
      starts_at: new Date(now.getTime() - 10 * dayMs).toISOString(),
      ends_at: new Date(now.getTime() - 3 * dayMs).toISOString(),
    },
    // 7. Broken
    {
      id: ID.broken,
      refined_text: 'No fast food for a month.',
      status: 'broken',
      verdict: 'broken',
      verdict_at: new Date(now.getTime() - 1 * dayMs).toISOString(),
      stake_amount: 5000,
      destination: 'Donald Trump campaign',
      witness_name: 'Nick',
      witness_accepted_at: new Date(now.getTime() - 14 * dayMs).toISOString(),
      witness_invite_token: 'pr3p-wit-broken',
      starts_at: new Date(now.getTime() - 14 * dayMs).toISOString(),
      ends_at: new Date(now.getTime() - 2 * dayMs).toISOString(),
    },
    // 8. Voided
    {
      id: ID.voided,
      refined_text: 'Learn to cook three new recipes.',
      status: 'voided',
      stake_amount: 1000,
      destination: 'Feeding America',
      witness_name: 'Dad',
      witness_invite_token: 'pr3p-wit-voided',
      starts_at: new Date(now.getTime() - 5 * dayMs).toISOString(),
      ends_at: new Date(now.getTime() + 2 * dayMs).toISOString(),
    },
    // 9. Challenge pending
    {
      id: ID.challengePending,
      refined_text: 'Delete TikTok for a week.',
      status: 'draft',
      vow_type: 'challenge',
      challenge_status: 'pending',
      challenge_invite_token: 'pr3p-challenge-tok',
      stake_amount: 0,
      destination: '',
      witness_name: users[0].display_name || 'Joey',
      witness_user_id: userId,
      target_phone: '+15559876543',
      witness_invite_token: 'pr3p-wit-challenge',
      starts_at: now.toISOString(),
      ends_at: new Date(now.getTime() + 7 * dayMs).toISOString(),
    },
  ];

  // Cleanup
  for (const f of fixtures) {
    await supabase.from('vows').delete().eq('id', f.id);
  }

  // Insert
  for (const f of fixtures) {
    const row = {
      id: f.id,
      user_id: userId,
      raw_input: f.refined_text,
      refined_text: f.refined_text,
      status: f.status,
      vow_type: f.vow_type || 'self',
      witness_name: f.witness_name,
      witness_phone: f.witness_phone || null,
      witness_invite_token: f.witness_invite_token,
      witness_user_id: f.witness_user_id || null,
      witness_accepted_at: f.witness_accepted_at || null,
      witness_declined: f.witness_declined || false,
      stake_amount: f.stake_amount,
      consequence: f.stake_amount > 0 ? 'charity' : 'charity',
      destination: f.destination,
      starts_at: f.starts_at,
      ends_at: f.ends_at,
      verdict: f.verdict || null,
      verdict_at: f.verdict_at || null,
      challenge_status: f.challenge_status || null,
      challenge_invite_token: f.challenge_invite_token || null,
      target_phone: f.target_phone || null,
    };
    const { error } = await supabase.from('vows').insert(row);
    if (error) {
      console.error(`Failed to insert ${f.id}:`, error.message);
    } else {
      console.log(`  ✓ ${f.id} (${f.status})`);
    }
  }

  console.log('\nFixture IDs for screenshots:');
  fixtures.forEach(f => console.log(`  /vow/${f.id}`));
}

async function cleanup() {
  const { data } = await supabase.from('vows').select('id').like('id', `${PREFIX}%`);
  for (const v of (data || [])) {
    await supabase.from('vows').delete().eq('id', v.id);
  }
  console.log('Cleaned up', (data || []).length, 'fixtures.');
}

if (process.argv.includes('--cleanup')) {
  cleanup().catch(console.error);
} else {
  seed().catch(console.error);
}
