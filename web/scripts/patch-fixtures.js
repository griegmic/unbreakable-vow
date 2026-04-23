#!/usr/bin/env node
/**
 * Patch PR #3B fixtures to match mock content exactly for pixel diff.
 * Run: node web/scripts/patch-fixtures.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function patch() {
  // 1. Set maker display_name to "Joey"
  const { data: users } = await supabase.from('users').select('id, display_name').limit(1);
  if (!users?.length) { console.error('No users'); process.exit(1); }
  const userId = users[0].id;
  const originalName = users[0].display_name;
  await supabase.from('users').update({ display_name: 'Joey' }).eq('id', userId);
  console.log('Maker: ' + originalName + ' → Joey');

  // Common vow values matching S14/S16/S17 mocks
  const vowText = "I'll go to the gym Mon, Wed & Fri this week.";
  const common = { refined_text: vowText, raw_input: vowText, stake_amount: 10000, destination: 'NRA' };

  // Next Sunday at 9pm
  const now = new Date();
  const daysToSun = (7 - now.getDay()) % 7 || 7;
  const nextSun = new Date(now);
  nextSun.setDate(now.getDate() + daysToSun);
  nextSun.setHours(21, 0, 0, 0);

  // 2h ago for S17 "Vow ended: 2h ago"
  const twoHoursAgo = new Date(now.getTime() - 2 * 3600000);

  // S14
  let r = await supabase.from('vows').update({ ...common, ends_at: nextSun.toISOString() })
    .eq('witness_invite_token', 'pr3b-test-s14-pending');
  console.log('S14: ' + (r.error ? r.error.message : 'OK — $100, NRA, ends ' + nextSun.toDateString()));

  // S16
  r = await supabase.from('vows').update({ ...common, ends_at: nextSun.toISOString() })
    .eq('witness_invite_token', 'pr3b-test-s16-accepted');
  console.log('S16: ' + (r.error ? r.error.message : 'OK — ends ' + nextSun.toDateString()));

  // S17
  r = await supabase.from('vows').update({ ...common, ends_at: twoHoursAgo.toISOString() })
    .eq('witness_invite_token', 'pr3b-test-s17-verdict');
  console.log('S17: ' + (r.error ? r.error.message : 'OK — ended ' + twoHoursAgo.toISOString()));

  console.log('\nDone. Re-render to see updated diffs.');
}

patch();
