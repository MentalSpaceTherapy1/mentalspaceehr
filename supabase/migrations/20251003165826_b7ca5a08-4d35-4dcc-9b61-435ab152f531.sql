-- Remove the problematic constraint from practice_settings
-- This constraint was incorrectly preventing any inserts
ALTER TABLE public.practice_settings DROP CONSTRAINT IF EXISTS single_practice_settings;

-- Instead, we'll rely on application logic to maintain a single record
-- Or we could add a simpler check, but for now this is fine
