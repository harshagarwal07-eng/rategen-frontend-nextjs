-- Fix type mismatches in vector search functions
-- Cast varchar fields to TEXT to match function signatures

-- Drop and recreate search_hotels_vector with explicit casts
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
  seasons JSONB[],
  payment_policy TEXT,
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

-- Drop and recreate search_tours_vector with explicit casts
DROP FUNCTION IF EXISTS search_tours_vector(vector, UUID, FLOAT, INT);

CREATE OR REPLACE FUNCTION search_tours_vector(
  query_embedding vector(1536),
  p_dmc_id UUID,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  tour_id UUID,
  tour_name TEXT,
  package_name TEXT,
  city TEXT,
  country TEXT,
  currency TEXT,
  seasons JSONB[],
  add_ons JSONB,
  package_preferred BOOLEAN,
  package_child_policy TEXT,
  tour_child_policy TEXT,
  dmc_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vtp.id,
    vtp.tour_id,
    vtp.tour_name::TEXT,
    vtp.package_name::TEXT,
    vtp.city::TEXT,
    vtp.country::TEXT,
    vtp.currency::TEXT,
    vtp.seasons,
    vtp.add_ons,
    vtp.package_preferred,
    vtp.package_child_policy::TEXT,
    vtp.tour_child_policy::TEXT,
    vtp.dmc_id,
    (1 - (tp.embedding <=> query_embedding))::FLOAT AS similarity
  FROM tour_packages tp
  JOIN tours t ON tp.tour_id = t.id
  JOIN vw_tours_packages vtp ON tp.id = vtp.id
  WHERE
    t.dmc_id = p_dmc_id
    AND tp.embedding IS NOT NULL
    AND 1 - (tp.embedding <=> query_embedding) > match_threshold
  ORDER BY tp.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Drop and recreate search_transfers_vector with explicit casts
DROP FUNCTION IF EXISTS search_transfers_vector(vector, UUID, FLOAT, INT);

CREATE OR REPLACE FUNCTION search_transfers_vector(
  query_embedding vector(1536),
  p_dmc_id UUID,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  transfer_id UUID,
  transfer_name TEXT,
  package_name TEXT,
  route TEXT,
  mode TEXT,
  city TEXT,
  country TEXT,
  currency TEXT,
  seasons JSONB[],
  package_preferred BOOLEAN,
  package_child_policy TEXT,
  transfer_child_policy TEXT,
  dmc_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vtp.id,
    vtp.transfer_id,
    vtp.transfer_name::TEXT,
    vtp.package_name::TEXT,
    vtp.route::TEXT,
    vtp.mode::TEXT,
    vtp.city::TEXT,
    vtp.country::TEXT,
    vtp.currency::TEXT,
    vtp.seasons,
    vtp.package_preferred,
    vtp.package_child_policy::TEXT,
    vtp.transfer_child_policy::TEXT,
    vtp.dmc_id,
    (1 - (tfp.embedding <=> query_embedding))::FLOAT AS similarity
  FROM transfer_packages tfp
  JOIN transfers tf ON tfp.transfer_id = tf.id
  JOIN vw_transfers_packages vtp ON tfp.id = vtp.id
  WHERE
    tf.dmc_id = p_dmc_id
    AND tfp.embedding IS NOT NULL
    AND 1 - (tfp.embedding <=> query_embedding) > match_threshold
  ORDER BY tfp.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_hotels_vector IS 'Fixed type casting: All varchar fields explicitly cast to TEXT to match function signature';
COMMENT ON FUNCTION search_tours_vector IS 'Fixed type casting: All varchar fields explicitly cast to TEXT to match function signature';
COMMENT ON FUNCTION search_transfers_vector IS 'Fixed type casting: All varchar fields explicitly cast to TEXT to match function signature';
