-- Add tracking fields for client departure and heartbeat monitoring
ALTER TABLE public.telehealth_waiting_rooms
ADD COLUMN IF NOT EXISTS left_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE;

-- Update status constraint to include 'Left'
ALTER TABLE public.telehealth_waiting_rooms
DROP CONSTRAINT IF EXISTS telehealth_waiting_rooms_status_check;

ALTER TABLE public.telehealth_waiting_rooms
ADD CONSTRAINT telehealth_waiting_rooms_status_check
CHECK (status IN ('Waiting', 'Admitted', 'Timed Out', 'Left'));

-- Add index for performance on status and arrival time queries
CREATE INDEX IF NOT EXISTS idx_waiting_rooms_status_arrived 
ON public.telehealth_waiting_rooms(status, client_arrived_time)
WHERE status IN ('Waiting', 'Left');

-- Add notification settings to practice_settings telehealth_settings jsonb
COMMENT ON COLUMN public.telehealth_waiting_rooms.left_time IS 'Timestamp when client left the waiting room by closing browser';
COMMENT ON COLUMN public.telehealth_waiting_rooms.last_heartbeat IS 'Last heartbeat timestamp from client for connection monitoring';