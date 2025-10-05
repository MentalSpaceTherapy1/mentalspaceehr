
-- Fix SECURITY DEFINER view issue by setting security_invoker = true
-- This makes the view use the querying user's permissions instead of the owner's
-- Ensures RLS policies on underlying tables are properly enforced

ALTER VIEW public.supervision_hours_summary SET (security_invoker = true);

-- Add comment explaining the security setting
COMMENT ON VIEW public.supervision_hours_summary IS 
'Aggregates supervision hours by relationship. Uses security_invoker=true to enforce RLS policies of the querying user.';
