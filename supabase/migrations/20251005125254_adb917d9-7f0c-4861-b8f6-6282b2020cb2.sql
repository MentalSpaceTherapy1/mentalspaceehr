-- Remove cosign_timeframe column from supervision_relationships table
ALTER TABLE supervision_relationships 
DROP COLUMN IF EXISTS cosign_timeframe;