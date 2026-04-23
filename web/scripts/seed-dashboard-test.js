#!/usr/bin/env node
/**
 * Seed script for PR #3C+D dashboard pixel diff testing.
 * Inserts fixture vows across multiple states to populate S20 dashboard.
 * Run: node web/scripts/seed-dashboard-test.js
 * Cleanup: node web/scripts/seed-dashboard-test.js --cleanup
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOKEN_PREFIX = 'pr3cd-dash-';

async function seed() {
  console.log('Seeding dashboard test fixtures...\n');

  const { data: users } = await supabase.from('users').select('id, display_name').limit(1);
  const userId = users?.[0]?.id;
  if (!userId) { console.error('No users in DB.'); process.exit(1); }
  console.log('Maker: ' + users[0].display_name + ' (' + userId + ')');

  const now = new Date();
  const dayMs = 86400000;

  const fixtures = [
    // YOUR VOWS section
    {
      token: TOKEN_PREFIX + 'active-1',
      refined_text: "Go to the gym 4x this week.",
      status: 'active',
      stake_amount: 5000,
      destination: 'ALS Association',
      witness_name: 'Nick',
      witness_accepted_at: new Date(now.getTime() - 2 * dayMs).toISOString(),
      starts_at: new Date(now.getTime() - 2 * dayMs).toISOString(),
      ends_at: new Date(now.getTime() + 5 * dayMs).toISOString(),
      desc: 'Active vow — Day 3 of 7',
    },
    {
      token: TOKEN_PREFIX + 'awaiting-witness',
      refined_text: "No alcohol for two weeks.",
      status: 'sealed',
      stake_amount: 2500,
      destination: 'Red Cross',
      witness_name: 'Sarah',
      witness_accepted_at: null,
      starts_at: null,
      ends_at: new Date(now.getTime() + 14 * dayMs).toISOString(),
      desc: 'Awaiting witness acceptance',
    },
    {
      token: TOKEN_PREFIX + 'awaiting-verdict',
      refined_text: "Finish the side project by Friday.",
      status: 'awaiting_verdict',
      stake_amount: 10000,
      destination: 'NRA',
      witness_name: 'Mike',
      witness_accepted_at: new Date(now.getTime() - 7 * dayMs).toISOString(),
      starts_at: new Date(now.getTime() - 7 * dayMs).toISOString(),
      ends_at: new Date(now.getTime() - 2 * 3600000).toISOString(), // ended 2h ago
      desc: 'Awaiting verdict',
    },
    // WITNESSING section (these vows belong to OTHER users, but witness_user_id = our user)
    // We can't easily create other users, so we'll set witness_user_id on our own vows
    // This is a fixture hack — in production these would be other people's vows
    {
      token: TOKEN_PREFIX + 'witnessing-1',
      refined_text: "Read 30 pages every day.",
      status: 'active',
      stake_amount: 2500,
      destination: 'Feeding America',
      witness_name: users[0].display_name || 'You',
      witness_user_id: userId,
      witness_accepted_at: new Date(now.getTime() - 3 * dayMs).toISOString(),
      starts_at: new Date(now.getTime() - 3 * dayMs).toISOString(),
      ends_at: new Date(now.getTime() + 4 * dayMs).toISOString(),
      desc: 'Witnessing — active',
    },
    {
      token: TOKEN_PREFIX + 'witnessing-urgent',
      refined_text: "No social media during work hours.",
      status: 'awaiting_verdict',
      stake_amount: 5000,
      destination: 'PETA',
      witness_name: users[0].display_name || 'You',
      witness_user_id: userId,
      witness_accepted_at: new Date(now.getTime() - 7 * dayMs).toISOString(),
      starts_at: new Date(now.getTime() - 7 * dayMs).toISOString(),
      ends_at: new Date(now.getTime() - 6 * 3600000).toISOString(), // ended 6h ago → urgent, <24h
      desc: 'Witnessing — URGENT (promotes to Needs You Now)',
    },
  ];

  for (const fix of fixtures) {
    const { data: existing } = await supabase.from('vows').select('id').eq('witness_invite_token', fix.token).single();
    if (existing) { console.log('  EXISTS: ' + fix.token); continue; }

    const row = {
      user_id: userId,
      raw_input: fix.refined_text,
      refined_text: fix.refined_text,
      status: fix.status,
      vow_type: 'self',
      witness_name: fix.witness_name,
      witness_phone: '+14155551234',
      witness_invite_token: fix.token,
      witness_accepted_at: fix.witness_accepted_at,
      witness_user_id: fix.witness_user_id || null,
      witness_declined: false,
      stake_amount: fix.stake_amount,
      consequence: 'charity',
      destination: fix.destination,
      starts_at: fix.starts_at,
      ends_at: fix.ends_at,
      sealed_at: new Date(now.getTime() - 7 * dayMs).toISOString(),
    };

    const { error } = await supabase.from('vows').insert(row);
    console.log(error ? '  FAILED: ' + fix.token + ' — ' + error.message : '  SEEDED: ' + fix.token + ' (' + fix.desc + ')');
  }

  console.log('\nDone. Dashboard should show 3 Your Vows + 1 Needs You Now + 1 Witnessing.');
}

async function cleanup() {
  console.log('Cleaning up dashboard fixtures...');
  const { error } = await supabase.from('vows').delete().like('witness_invite_token', TOKEN_PREFIX + '%');
  console.log(error ? 'Failed: ' + error.message : 'Cleaned up all ' + TOKEN_PREFIX + '* fixtures.');
}

if (process.argv.includes('--cleanup')) { cleanup(); } else { seed(); }
