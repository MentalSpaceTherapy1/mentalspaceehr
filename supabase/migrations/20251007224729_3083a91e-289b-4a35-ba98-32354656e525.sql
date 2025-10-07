-- ============================================================================
-- PHASE 1 CRITICAL SECURITY FIX: SUPERVISION HOURS SUMMARY
-- Verify security_invoker is enabled (already set in previous migration)
-- This ensures the view enforces RLS policies on underlying tables
-- ============================================================================

-- Re-apply security_invoker to be explicit (idempotent operation)
ALTER VIEW public.supervision_hours_summary SET (security_invoker = true);

-- Add comprehensive comment documenting the security model
COMMENT ON VIEW public.supervision_hours_summary IS 
'Aggregates supervision hours by relationship. Uses security_invoker=true to enforce RLS policies of the querying user. This view is SECURE - it automatically restricts data based on the user''s permissions on the underlying supervision_relationships, supervision_sessions, and note_cosignatures tables. Non-supervisors cannot see data they do not have access to.';

-- Verify RLS is enabled on all underlying tables
-- (These should already be enabled, this is a safety check)
DO $$
BEGIN
  -- Enable RLS on supervision_relationships if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'supervision_relationships' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.supervision_relationships ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Enable RLS on supervision_sessions if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'supervision_sessions' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.supervision_sessions ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Enable RLS on note_cosignatures if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'note_cosignatures' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.note_cosignatures ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;