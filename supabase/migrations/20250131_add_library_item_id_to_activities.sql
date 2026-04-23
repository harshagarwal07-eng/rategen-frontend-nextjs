-- Add library_item_id column to itinerary_activities table
-- This allows activities to reference library items (for library hotels, etc.)

ALTER TABLE itinerary_activities
ADD COLUMN IF NOT EXISTS library_item_id UUID REFERENCES itinerary_library(id) ON DELETE SET NULL;

-- Create index for library item lookups
CREATE INDEX IF NOT EXISTS idx_itinerary_activities_library_item_id
ON itinerary_activities(library_item_id) WHERE library_item_id IS NOT NULL;

COMMENT ON COLUMN itinerary_activities.library_item_id IS 'Reference to library item (for library hotels/services)';
