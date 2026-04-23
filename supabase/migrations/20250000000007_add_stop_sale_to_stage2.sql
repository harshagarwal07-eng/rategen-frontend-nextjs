-- Add stop_sale to Stage 2: fetch_rooms_for_hotels()
-- This allows stop sale checking before fetching full room details

CREATE OR REPLACE FUNCTION fetch_rooms_for_hotels(
  p_hotel_ids uuid[]
)
RETURNS TABLE (
  room_id uuid,
  hotel_id uuid,
  hotel_name text,
  room_category text,
  meal_plan text,
  max_occupancy text,
  stop_sale text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    hr.id as room_id,
    hr.hotel_id,
    h.hotel_name,
    hr.room_category,
    hr.meal_plan,
    hr.max_occupancy,
    hr.stop_sale
  FROM hotel_rooms hr
  JOIN hotels h ON hr.hotel_id = h.id
  WHERE hr.hotel_id = ANY(p_hotel_ids)
  ORDER BY h.preferred DESC, hr.sort_order ASC, hr.room_category;
$$;

COMMENT ON FUNCTION fetch_rooms_for_hotels IS 'Stage 2: Returns room categories for matched hotels including stop_sale dates. Used to select best room and check availability without loading full pricing data.';
