-- Fix 1: Drop overly permissive witness RLS policies
-- These checked only that witness_invite_token IS NOT NULL, not that it matched.
-- Server components now use service role key to bypass RLS for witness pages.
DROP POLICY IF EXISTS "vows_select_by_witness_token" ON public.vows;
DROP POLICY IF EXISTS "vows_update_by_witness_token" ON public.vows;

-- Fix 2: Add refund_failed column (submit-verdict and cron-runner reference it)
ALTER TABLE public.vows
  ADD COLUMN IF NOT EXISTS refund_failed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vows_refund_failed
  ON public.vows(id)
  WHERE refund_failed = true;

-- Fix 8: Add sms_failed column for seal-vow SMS retry tracking
ALTER TABLE public.vows
  ADD COLUMN IF NOT EXISTS sms_failed boolean NOT NULL DEFAULT false;
