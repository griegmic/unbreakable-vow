-- Add SetupIntent columns for card-on-file flow
ALTER TABLE public.vows ADD COLUMN IF NOT EXISTS stripe_setup_intent_id text;
ALTER TABLE public.vows ADD COLUMN IF NOT EXISTS stripe_payment_method_id text;
