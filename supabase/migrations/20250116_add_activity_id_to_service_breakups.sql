-- Add activity_id column to service_breakups table
-- This links breakups to specific activities in the itinerary for sync operations

-- Add the column
ALTER TABLE public.service_breakups
ADD COLUMN activity_id UUID;

-- Create index for fast lookups by activity_id
CREATE INDEX idx_service_breakups_activity_id
ON public.service_breakups(activity_id);

-- Add comment explaining the purpose
COMMENT ON COLUMN public.service_breakups.activity_id IS
'Links to a specific activity instance in chat_itineraries.itinerary_data. Used for sync operations (move day, delete activity).';
