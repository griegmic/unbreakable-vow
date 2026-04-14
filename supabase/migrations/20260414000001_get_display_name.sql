-- SECURITY DEFINER function to resolve display_name for any user.
-- Used by witnessing vow queries so the dashboard can show "By {maker_name}"
-- instead of "By someone". Read-only, non-sensitive field.
CREATE OR REPLACE FUNCTION public.get_display_name(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT display_name FROM public.users WHERE id = user_uuid;
$$;

-- Grant execute to authenticated users (needed for client-side .rpc() calls)
GRANT EXECUTE ON FUNCTION public.get_display_name(uuid) TO authenticated;
