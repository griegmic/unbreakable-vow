'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Server action: look up a vow by witness_invite_token.
 * Uses service role key to bypass RLS — safe because the token itself is the auth.
 * Only returns fields needed by the client; never exposes stripe_payment_intent_id.
 */
export async function getVowByWitnessToken(token: string) {
  // Basic UUID format validation to prevent enumeration
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return null;
  }

  const { data: vow } = await supabase
    .from('vows')
    .select('id, refined_text, stake_amount, destination, witness_name, witness_accepted_at, witness_declined, starts_at, ends_at, status, user_id')
    .eq('witness_invite_token', token)
    .single();

  if (!vow) return null;

  // Get maker info
  let makerName = 'Your friend';
  let makerPhone: string | null = null;
  if (vow.user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('display_name, phone')
      .eq('id', vow.user_id)
      .single();
    if (user?.display_name) makerName = user.display_name;
    if (user?.phone) makerPhone = user.phone;
  }

  return { vow, makerName, makerPhone };
}
