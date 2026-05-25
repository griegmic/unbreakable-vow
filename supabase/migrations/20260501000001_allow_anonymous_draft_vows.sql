-- Allow pre-auth draft vows created from native witness sharing.
-- Drafts are owned by anonymous_owner_token until claim-vow attaches user_id.

ALTER TABLE public.vows
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.vows
  DROP CONSTRAINT IF EXISTS vows_owner_required;

ALTER TABLE public.vows
  ADD CONSTRAINT vows_owner_required
  CHECK (user_id IS NOT NULL OR anonymous_owner_token IS NOT NULL);
