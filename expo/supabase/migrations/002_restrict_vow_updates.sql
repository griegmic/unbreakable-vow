-- Restrict client-side vow updates to only safe columns.
-- Sensitive fields (verdict, verdict_at, status, stake_amount, stripe_payment_intent_id)
-- can only be updated by Edge Functions using the service role key.
--
-- Drop the overly-permissive policy and replace with a restricted one.
drop policy if exists "vows_update_own" on public.vows;

-- Users can only update status to 'sealed' or 'voided' (safe client transitions)
create policy "vows_update_own_restricted" on public.vows
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    AND (
      -- Allow voiding a draft
      (status = 'voided')
      -- Allow sealing a draft
      OR (status = 'sealed')
    )
  );
