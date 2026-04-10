-- Challenge/Dare V1: Add suggested_stake_amount and expand challenge_status enum
-- This supports the new flow where challengers suggest a stake (anchor)
-- and recipients choose their actual stake amount on acceptance.

-- Add suggested_stake_amount column (challenger's anchor, display only, never charged)
ALTER TABLE public.vows
  ADD COLUMN IF NOT EXISTS suggested_stake_amount integer DEFAULT 0;

-- Expand challenge_status to include 'expired' for 48h timeout
ALTER TABLE public.vows
  DROP CONSTRAINT IF EXISTS vows_challenge_status_check;

ALTER TABLE public.vows
  ADD CONSTRAINT vows_challenge_status_check
    CHECK (challenge_status IN ('pending', 'accepted', 'declined', 'expired'));
