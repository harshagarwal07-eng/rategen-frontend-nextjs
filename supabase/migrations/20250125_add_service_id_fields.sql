-- Add service_id and service_parent_id fields to itinerary_activities
-- =====================================================
-- service_id: References the specific package/room (tour_package_id, room_id, transfer_package_id)
-- service_parent_id: References the parent entity (hotel_id, tour_id, transfer_id)
-- =====================================================

-- Add service_id if not exists (links to package/room)
ALTER TABLE itinerary_activities ADD COLUMN IF NOT EXISTS service_id UUID;

-- Add service_parent_id (links to parent entity: hotel_id, tour_id, transfer_id)
ALTER TABLE itinerary_activities ADD COLUMN IF NOT EXISTS service_parent_id UUID;

-- Add day_date for actual calendar date
ALTER TABLE itinerary_activities ADD COLUMN IF NOT EXISTS day_date DATE;

-- Add day_title for custom day titles
ALTER TABLE itinerary_activities ADD COLUMN IF NOT EXISTS day_title TEXT;

-- Add teens column (between children and adults age range)
ALTER TABLE itinerary_activities ADD COLUMN IF NOT EXISTS teens INTEGER DEFAULT 0;

-- =====================================================
-- INDEXES
-- =====================================================

-- Fast lookup by service_id (for aggregating multi-night hotel stays)
CREATE INDEX IF NOT EXISTS idx_itinerary_activities_service_id ON itinerary_activities(service_id);

-- Fast lookup by service_parent_id (for finding all activities for same hotel/tour/transfer)
CREATE INDEX IF NOT EXISTS idx_itinerary_activities_service_parent_id ON itinerary_activities(service_parent_id);

-- Composite index for hotel aggregation queries
CREATE INDEX IF NOT EXISTS idx_itinerary_activities_chat_service ON itinerary_activities(chat_id, service_id, option_number);

-- Composite index for parent entity queries
CREATE INDEX IF NOT EXISTS idx_itinerary_activities_chat_parent ON itinerary_activities(chat_id, service_parent_id, option_number);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN itinerary_activities.service_id IS
'References the specific package/room ID (tour_package_id, room_id, transfer_package_id).
Activities with the same service_id represent the same booking (e.g., multi-night hotel stay).';

COMMENT ON COLUMN itinerary_activities.service_parent_id IS
'References the parent entity ID (hotel_id, tour_id, transfer_id).
Used to look up details from the parent tables (hotels, tours, transfers).';

COMMENT ON COLUMN itinerary_activities.day_date IS
'Actual calendar date for this day (YYYY-MM-DD)';

COMMENT ON COLUMN itinerary_activities.day_title IS
'Custom title for the day (e.g., "Arrival Day", "Beach Day")';

COMMENT ON COLUMN itinerary_activities.teens IS
'Number of teenagers (age range depends on service age_policy)';
