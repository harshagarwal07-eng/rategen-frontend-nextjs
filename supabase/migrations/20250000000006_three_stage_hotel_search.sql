-- Three-Stage Hotel Search Optimization
-- This migration creates 3 specialized functions to support a token-efficient hotel search workflow
--
-- Stage 1: search_hotels_names_vector() - Returns only hotel names for initial matching
-- Stage 2: fetch_rooms_for_hotels() - Returns only room categories (no pricing/seasons)
-- Stage 3: fetch_room_details_for_quote() - Returns full details for the selected room only
--
-- Expected token reduction: 70-80% (from ~70k to ~15k tokens per query)

-- =====================================================
-- STAGE 1: Vector Search for Hotel Names Only
-- =====================================================
-- Returns minimal hotel data (no rooms, no pricing, no policies)
-- Used by AI agent to match user query to hotel(s)

CREATE OR REPLACE FUNCTION search_hotels_names_vector(
  query_embedding vector(1536),
  p_dmc_id uuid,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  hotel_id uuid,
  hotel_name text,
  hotel_code text,
  hotel_city text,
  hotel_country text,
  star_rating text,
  preferred boolean,
  similarity float,
)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT ON (h.id)
    h.id as hotel_id,
    h.hotel_name,
    h.hotel_code,
    c.city_name as hotel_city,
    co.country_name as hotel_country,
    h.star_rating,
    h.preferred,
    1 - (hr.embedding <=> query_embedding) as similarity
  FROM hotel_rooms hr
  JOIN hotels h ON hr.hotel_id = h.id
  LEFT JOIN cities c ON h.hotel_city = c.id
  LEFT JOIN countries co ON h.hotel_country = co.id
  WHERE h.dmc_id = p_dmc_id
    AND 1 - (hr.embedding <=> query_embedding) > match_threshold
  ORDER BY h.id, similarity DESC
  LIMIT match_count;
$$;

COMMENT ON FUNCTION search_hotels_names_vector IS 'Stage 1: Returns only hotel names and metadata for initial matching. Used to reduce token consumption by ~60k tokens per query.';

-- =====================================================
-- STAGE 2: Fetch Rooms for Specific Hotels
-- =====================================================
-- Returns minimal room data (no seasons, no pricing, no policies)
-- Used by AI agent to select best room(s) based on user query

CREATE OR REPLACE FUNCTION fetch_rooms_for_hotels(
  p_hotel_ids uuid[]
)
RETURNS TABLE (
  room_id uuid,
  hotel_id uuid,
  hotel_name text,
  room_category text,
  meal_plan text,
  max_occupancy text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    hr.id as room_id,
    hr.hotel_id,
    h.hotel_name,
    hr.room_category,
    hr.meal_plan,
    hr.max_occupancy
  FROM hotel_rooms hr
  JOIN hotels h ON hr.hotel_id = h.id
  WHERE hr.hotel_id = ANY(p_hotel_ids)
  ORDER BY h.preferred DESC, hr.sort_order ASC, hr.room_category;
$$;

COMMENT ON FUNCTION fetch_rooms_for_hotels IS 'Stage 2: Returns only room categories for matched hotels. Used to select best room without loading full pricing data.';

-- =====================================================
-- STAGE 3: Fetch Full Room Details for Quote Generation
-- =====================================================
-- Returns ALL data for a SINGLE room (seasons, pricing, policies)
-- This is the only stage that loads the full data payload

CREATE OR REPLACE FUNCTION fetch_room_details_for_quote(
  p_room_id uuid
)
RETURNS TABLE (
  id uuid,
  hotel_id uuid,
  room_category text,
  meal_plan text,
  max_occupancy text,
  other_details text,
  extra_bed_policy text,
  stop_sale text,
  seasons jsonb,
  hotel_name text,
  hotel_code text,
  hotel_address text,
  hotel_country text,
  hotel_city text,
  hotel_phone text,
  hotel_email text,
  hotel_description text,
  hotel_currency text,
  examples text,
  remarks text,
  cancellation_policy text,
  payment_policy text,
  group_policy text,
  property_type text,
  star_rating text,
  preferred boolean,
  markup smallint,
  offers text,
  dmc_id uuid,
  meal_plan_rates jsonb,
  age_policy jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT
    hr.id,
    hr.hotel_id,
    hr.room_category,
    hr.meal_plan,
    hr.max_occupancy,
    hr.other_details,
    hr.extra_bed_policy,
    hr.stop_sale,
    hr.seasons,
    h.hotel_name,
    h.hotel_code,
    h.hotel_address,
    co.country_name as hotel_country,
    c.city_name as hotel_city,
    h.hotel_phone,
    h.hotel_email,
    h.hotel_description,
    h.hotel_currency,
    h.examples,
    h.remarks,
    h.cancellation_policy,
    h.payment_policy,
    h.group_policy,
    h.property_type,
    h.star_rating,
    h.preferred,
    h.markup,
    h.offers,
    h.dmc_id,
    h.meal_plan_rates,
    h.age_policy
  FROM hotel_rooms hr
  JOIN hotels h ON hr.hotel_id = h.id
  LEFT JOIN cities c ON h.hotel_city = c.id
  LEFT JOIN countries co ON h.hotel_country = co.id
  WHERE hr.id = p_room_id;
$$;

COMMENT ON FUNCTION fetch_room_details_for_quote IS 'Stage 3: Returns full room details including seasons and pricing for the final quote generation. Only called for the single selected room.';

-- =====================================================
-- Performance Notes
-- =====================================================
-- These functions leverage existing indexes:
-- - hotel_rooms.embedding (for vector similarity search)
-- - hotel_rooms.hotel_id (for JOIN performance)
-- - hotels.dmc_id (for tenant isolation)
-- - hotels.preferred (for sorting)
--
-- No additional indexes needed at this time.
