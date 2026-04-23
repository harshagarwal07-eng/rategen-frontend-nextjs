-- Add images column to itinerary_activities table
-- This column stores S3 URLs for activity images (works for all service types)

ALTER TABLE itinerary_activities
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

COMMENT ON COLUMN itinerary_activities.images IS
'Array of S3 URLs for activity images. Can be used for hotels, tours, transfers, etc.';
