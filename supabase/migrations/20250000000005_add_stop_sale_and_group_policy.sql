-- Add stop_sale and group_policy fields
-- stop_sale: Room-level field for date ranges when room is unavailable for booking
-- group_policy: Hotel-level field for group booking policies

-- Add stop_sale to hotel_rooms table
ALTER TABLE hotel_rooms
ADD COLUMN IF NOT EXISTS stop_sale TEXT;

-- Add group_policy to hotels table
ALTER TABLE hotels
ADD COLUMN IF NOT EXISTS group_policy TEXT;

COMMENT ON COLUMN hotel_rooms.stop_sale IS 'Date ranges when room is unavailable for booking (e.g., "01 Dec 24 - 15 Dec 24")';
COMMENT ON COLUMN hotels.group_policy IS 'Policy details for group bookings';
