-- Phase 0: Add anonymous_owner_token for pre-auth vow drafts.
-- Allows anonymous users to create drafts via prepare-judge-link,
-- then claim ownership after authenticating via claim-vow.

ALTER TABLE public.vows
  ADD COLUMN IF NOT EXISTS anonymous_owner_token text;

CREATE INDEX IF NOT EXISTS idx_vows_anonymous_owner_token
  ON public.vows (anonymous_owner_token)
  WHERE anonymous_owner_token IS NOT NULL;

COMMENT ON COLUMN public.vows.anonymous_owner_token IS
  'Token for anonymous draft ownership. Set by prepare-judge-link when no JWT. Cleared by claim-vow on auth.';
