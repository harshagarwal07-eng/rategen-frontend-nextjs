-- Add missing pricing fields to vector search
-- These fields exist in vw_hotel_rooms view but weren't exposed through the search function
-- Fields: meal_plan_rates, age_policy, extra_bed_policy

DROP FUNCTION IF EXISTS search_hotels_vector(vector, UUID, FLOAT, INT);

CREATE OR REPLACE FUNCTION search_hotels_vector(
  query_embedding vector(1536),
  p_dmc_id UUID,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  hotel_id UUID,
  hotel_name TEXT,
  hotel_city TEXT,
  hotel_country TEXT,
  hotel_currency TEXT,
  room_category TEXT,
  max_occupancy TEXT,
  meal_plan TEXT,
  star_rating TEXT,
  preferred BOOLEAN,
  seasons JSONB,
  payment_policy TEXT,
  meal_plan_rates JSONB,
  age_policy JSONB,
  extra_bed_policy TEXT,
  offers TEXT,
  remarks TEXT,
  cancellation_policy TEXT,
  other_details TEXT,
  hotel_code TEXT,
  hotel_address TEXT,
  hotel_phone TEXT,
  hotel_email TEXT,
  hotel_description TEXT,
  examples TEXT,
  property_type TEXT,
  markup SMALLINT,
  dmc_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vhr.id,
    vhr.hotel_id,
    vhr.hotel_name::TEXT,
    vhr.hotel_city::TEXT,
    vhr.hotel_country::TEXT,
    vhr.hotel_currency::TEXT,
    vhr.room_category::TEXT,
    vhr.max_occupancy::TEXT,
    vhr.meal_plan::TEXT,
    vhr.star_rating::TEXT,
    vhr.preferred,
    vhr.seasons,
    vhr.payment_policy::TEXT,
    vhr.meal_plan_rates,
    vhr.age_policy,
    vhr.extra_bed_policy::TEXT,
    vhr.offers::TEXT,
    vhr.remarks::TEXT,
    vhr.cancellation_policy::TEXT,
    vhr.other_details::TEXT,
    vhr.hotel_code::TEXT,
    vhr.hotel_address::TEXT,
    vhr.hotel_phone::TEXT,
    vhr.hotel_email::TEXT,
    vhr.hotel_description::TEXT,
    vhr.examples::TEXT,
    vhr.property_type::TEXT,
    vhr.markup,
    vhr.dmc_id,
    (1 - (hr.embedding <=> query_embedding))::FLOAT AS similarity
  FROM hotel_rooms hr
  JOIN hotels h ON hr.hotel_id = h.id
  JOIN vw_hotel_rooms vhr ON hr.id = vhr.id
  WHERE
    h.dmc_id = p_dmc_id
    AND hr.embedding IS NOT NULL
    AND 1 - (hr.embedding <=> query_embedding) > match_threshold
  ORDER BY hr.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_hotels_vector IS 'Vector search for hotels with complete pricing fields including meal_plan_rates, age_policy, and extra_bed_policy';
