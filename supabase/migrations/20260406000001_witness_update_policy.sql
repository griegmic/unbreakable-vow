-- Allow anonymous users to update witness acceptance fields by witness_invite_token
-- This is needed for the witness web page to accept/decline
create policy "vows_update_by_witness_token" on public.vows
  for update using (witness_invite_token is not null)
  with check (witness_invite_token is not null);
