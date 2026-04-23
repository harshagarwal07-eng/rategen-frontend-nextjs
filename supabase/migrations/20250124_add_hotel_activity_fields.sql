-- Add missing hotel activity fields for comprehensive DMC editing
-- =====================================================

-- Hotel contact info (copied from hotels table when activity is created)
ALTER TABLE itinerary_activities ADD COLUMN IF NOT EXISTS hotel_phone TEXT;
ALTER TABLE itinerary_activities ADD COLUMN IF NOT EXISTS hotel_email TEXT;
ALTER TABLE itinerary_activities ADD COLUMN IF NOT EXISTS hotel_website TEXT;

-- Check-in/out options
ALTER TABLE itinerary_activities ADD COLUMN IF NOT EXISTS early_checkin BOOLEAN DEFAULT FALSE;
ALTER TABLE itinerary_activities ADD COLUMN IF NOT EXISTS late_checkout BOOLEAN DEFAULT FALSE;

-- Meal plan options
ALTER TABLE itinerary_activities ADD COLUMN IF NOT EXISTS meal_complimentary BOOLEAN DEFAULT FALSE;

-- Hotel offers and remarks
ALTER TABLE itinerary_activities ADD COLUMN IF NOT EXISTS offers TEXT;
ALTER TABLE itinerary_activities ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Max occupancy per room
ALTER TABLE itinerary_activities ADD COLUMN IF NOT EXISTS max_occupancy TEXT;

-- Pax distribution per room (JSONB: [{room_number: 1, adults: 2, children: 1, children_ages: [4]}])
ALTER TABLE itinerary_activities ADD COLUMN IF NOT EXISTS room_pax_distribution JSONB DEFAULT '[]';

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN itinerary_activities.early_checkin IS
'Whether early check-in is requested (before standard 3pm)';

COMMENT ON COLUMN itinerary_activities.late_checkout IS
'Whether late checkout is requested (after standard 11am)';

COMMENT ON COLUMN itinerary_activities.meal_complimentary IS
'Whether meal plan is complimentary (no charge)';

COMMENT ON COLUMN itinerary_activities.room_pax_distribution IS
'Distribution of pax across rooms: [{room_number: 1, adults: 2, children: 1, children_ages: [4]}]';
