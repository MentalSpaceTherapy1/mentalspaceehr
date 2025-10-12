-- Note: release_metrics table already created in migration 20251008120000_post_release_review_tables.sql
-- This migration originally tried to recreate it with a different schema, but we skip it to avoid conflicts

-- Create indexes only if the columns exist (they were created in the previous migration)
DO $$
BEGIN
  -- Only create index if release_id column exists as TEXT (not UUID)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'release_metrics'
    AND column_name = 'release_id'
    AND data_type = 'text'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_release_metrics_release_id ON public.release_metrics(release_id);
    CREATE INDEX IF NOT EXISTS idx_release_metrics_release_date ON public.release_metrics(release_date DESC);
    CREATE INDEX IF NOT EXISTS idx_release_metrics_collected_at ON public.release_metrics(collected_at DESC);
  END IF;
END $$;

-- RLS and policies already configured in migration 20251008120000_post_release_review_tables.sql
-- Skip to avoid conflicts