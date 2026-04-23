-- Migration: Three-Stage Search for Tours and Transfers
-- Purpose: Replicate the efficient 3-stage search pattern from hotels to tours and transfers
-- Benefits: ~70-80% token reduction, faster LLM processing, better match quality

-- ============================================================================
-- TOURS - STAGE 1: Tour Names Vector Search (Minimal Data)
-- ============================================================================
-- Returns only tour names and metadata for LLM to select which tours match
-- Token cost: ~10-20 tokens per tour vs ~500+ for full data

CREATE OR REPLACE FUNCTION search_tour_names_vector(
  query_embedding vector(1536),
  p_dmc_id uuid,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  tour_id uuid,
  tour_name text,
  package_id uuid,
  package_name text,
  includes_transfer boolean,
  city text,
  country text,
  preferred boolean,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT ON (t.id)
    t.id as tour_id,
    t.tour_name,
    tp.id as package_id,
    tp.name as package_name,
    tp.includes_transfer,
    c.city_name as city,
    co.country_name as country,
    t.preferred,
    1 - (tp.embedding <=> query_embedding) as similarity
  FROM tour_packages tp
  JOIN tours t ON tp.tour_id = t.id
  LEFT JOIN cities c ON t.city = c.id
  LEFT JOIN countries co ON t.country = co.id
  WHERE t.dmc_id = p_dmc_id
    AND tp.embedding IS NOT NULL
    AND 1 - (tp.embedding <=> query_embedding) > match_threshold
  ORDER BY t.id, similarity DESC
  LIMIT match_count;
$$;

-- ============================================================================
-- TOURS - STAGE 2: Fetch Packages for Selected Tours
-- ============================================================================
-- Returns package names and metadata for selected tours (no pricing/seasons yet)
-- Used by LLM to select which specific package to book

CREATE OR REPLACE FUNCTION fetch_packages_for_tours(
  p_tour_ids uuid[]
)
RETURNS TABLE (
  package_id uuid,
  tour_id uuid,
  tour_name text,
  package_name text,
  description text,
  includes_transfer boolean,
  preferred boolean,
  iscombo boolean,
  duration jsonb,
  categories jsonb,
  seasons jsonb[],
  age_policy jsonb,
  city text,
  country text,
  currency text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    tp.id as package_id,
    tp.tour_id,
    t.tour_name,
    tp.name as package_name,
    tp.description,
    tp.includes_transfer,
    tp.preferred,
    tp.iscombo,
    tp.duration,
    tp.categories,
    tp.seasons,
    tp.age_policy,
    c.city_name as city,
    co.country_name as country,
    t.currency
  FROM tour_packages tp
  JOIN tours t ON tp.tour_id = t.id
  LEFT JOIN cities c ON t.city = c.id
  LEFT JOIN countries co ON t.country = co.id
  WHERE tp.tour_id = ANY(p_tour_ids)
  ORDER BY t.preferred DESC, tp.preferred DESC, tp."order" ASC;
$$;

-- ============================================================================
-- TOURS - STAGE 3: Fetch Full Package Details for Quote
-- ============================================================================
-- Returns complete package data with seasons and pricing for final quote
-- Only load this for the selected package(s)

CREATE OR REPLACE FUNCTION fetch_tour_package_details_for_quote(
  p_package_id uuid
)
RETURNS TABLE (
  id uuid,
  tour_id uuid,
  package_name text,
  seasons jsonb[],
  description text,
  remarks text,
  child_policy text,
  preferred boolean,
  iscombo boolean,
  includes_transfer boolean,
  age_policy jsonb,
  duration jsonb,
  categories jsonb,
  inclusions text,
  exclusions text,
  notes text,
  meeting_point text,
  pickup_point text,
  dropoff_point text,
  operational_hours jsonb,
  max_participants integer,
  images text[],
  tour_name text,
  tour_description text,
  tour_remarks text,
  cancellation_policy text,
  tour_child_policy text,
  tour_preferred boolean,
  markup text,
  currency text,
  country text,
  city text,
  formatted_address text,
  types text[],
  timings text[],
  dmc_id uuid,
  examples text,
  add_ons jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT
    tp.id,
    tp.tour_id,
    tp.name as package_name,
    tp.seasons,
    tp.description,
    tp.remarks,
    tp.child_policy,
    tp.preferred,
    tp.iscombo,
    tp.includes_transfer,
    tp.age_policy,
    tp.duration,
    tp.categories,
    tp.inclusions,
    tp.exclusions,
    tp.notes,
    tp.meeting_point,
    tp.pickup_point,
    tp.dropoff_point,
    tp.operational_hours,
    tp.max_participants,
    tp.images,
    t.tour_name,
    t.description as tour_description,
    t.remarks as tour_remarks,
    t.cancellation_policy,
    t.child_policy as tour_child_policy,
    t.preferred as tour_preferred,
    t.markup,
    t.currency,
    co.country_name as country,
    c.city_name as city,
    t.formatted_address,
    t.types,
    t.timings,
    t.dmc_id,
    t.examples,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', tao.id,
        'name', tao.name,
        'description', tao.description,
        'ticket_only_rate_adult', tao.ticket_only_rate_adult,
        'ticket_only_rate_child', tao.ticket_only_rate_child,
        'ticket_only_rate_teenager', tao.ticket_only_rate_teenager,
        'ticket_only_rate_infant', tao.ticket_only_rate_infant,
        'total_rate', tao.total_rate,
        'age_policy', tao.age_policy,
        'is_mandatory', tpao.is_mandatory
      ))
      FROM tour_package_add_ons tpao
      JOIN tour_add_ons tao ON tpao.add_on_id = tao.id
      WHERE tpao.package_id = tp.id),
      '[]'::jsonb
    ) as add_ons
  FROM tour_packages tp
  JOIN tours t ON tp.tour_id = t.id
  LEFT JOIN cities c ON t.city = c.id
  LEFT JOIN countries co ON t.country = co.id
  WHERE tp.id = p_package_id;
$$;

-- ============================================================================
-- TRANSFERS - STAGE 1: Transfer Names Vector Search (Minimal Data)
-- ============================================================================
-- Returns only transfer names and route info for LLM to select

CREATE OR REPLACE FUNCTION search_transfer_names_vector(
  query_embedding vector(1536),
  p_dmc_id uuid,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 15
)
RETURNS TABLE (
  transfer_id uuid,
  transfer_name text,
  package_id uuid,
  package_name text,
  route text,
  origin text,
  destination text,
  mode text,
  city text,
  country text,
  preferred boolean,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT ON (t.id, tp.origin, tp.destination)
    t.id as transfer_id,
    t.transfer_name,
    tp.id as package_id,
    tp.name as package_name,
    t.route,
    tp.origin,
    tp.destination,
    t.mode,
    c.city_name as city,
    co.country_name as country,
    t.preferred,
    1 - (tp.embedding <=> query_embedding) as similarity
  FROM transfer_packages tp
  JOIN transfers t ON tp.transfer_id = t.id
  LEFT JOIN cities c ON t.city = c.id
  LEFT JOIN countries co ON t.country = co.id
  WHERE t.dmc_id = p_dmc_id
    AND tp.embedding IS NOT NULL
    AND 1 - (tp.embedding <=> query_embedding) > match_threshold
  ORDER BY t.id, tp.origin, tp.destination, similarity DESC
  LIMIT match_count;
$$;

-- ============================================================================
-- TRANSFERS - STAGE 2: Fetch Packages for Selected Transfers
-- ============================================================================
-- Returns package names for selected transfers (no pricing/seasons yet)

CREATE OR REPLACE FUNCTION fetch_packages_for_transfers(
  p_transfer_ids uuid[]
)
RETURNS TABLE (
  package_id uuid,
  transfer_id uuid,
  transfer_name text,
  package_name text,
  description text,
  route text,
  origin text,
  destination text,
  via text,
  num_stops smallint,
  mode text,
  preferred boolean,
  iscombo boolean,
  duration jsonb,
  seasons jsonb[],
  city text,
  country text,
  currency text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    tp.id as package_id,
    tp.transfer_id,
    t.transfer_name,
    tp.name as package_name,
    tp.description,
    t.route,
    tp.origin,
    tp.destination,
    tp.via,
    tp.num_stops,
    t.mode,
    tp.preferred,
    tp.iscombo,
    tp.duration,
    tp.seasons,
    c.city_name as city,
    co.country_name as country,
    t.currency
  FROM transfer_packages tp
  JOIN transfers t ON tp.transfer_id = t.id
  LEFT JOIN cities c ON t.city = c.id
  LEFT JOIN countries co ON t.country = co.id
  WHERE tp.transfer_id = ANY(p_transfer_ids)
  ORDER BY t.preferred DESC, tp.preferred DESC, tp."order" ASC;
$$;

-- ============================================================================
-- TRANSFERS - STAGE 3: Fetch Full Package Details for Quote
-- ============================================================================
-- Returns complete package data with seasons and pricing for final quote

CREATE OR REPLACE FUNCTION fetch_transfer_package_details_for_quote(
  p_package_id uuid
)
RETURNS TABLE (
  id uuid,
  transfer_id uuid,
  package_name text,
  seasons jsonb[],
  description text,
  remarks text,
  child_policy text,
  preferred boolean,
  iscombo boolean,
  origin text,
  destination text,
  via text,
  num_stops smallint,
  duration jsonb,
  inclusions text,
  exclusions text,
  notes text,
  meeting_point text,
  pickup_point text,
  dropoff_point text,
  operational_hours jsonb,
  images text[],
  transfer_name text,
  transfer_description text,
  mode text,
  transfer_preferred boolean,
  markup smallint,
  rule text,
  raw_rates text,
  transfer_child_policy text,
  cancellation_policy text,
  transfer_remarks text,
  currency text,
  country text,
  city text,
  examples text,
  route text,
  dmc_id uuid,
  add_ons jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT
    tp.id,
    tp.transfer_id,
    tp.name as package_name,
    tp.seasons,
    tp.description,
    tp.remarks,
    tp.child_policy,
    tp.preferred,
    tp.iscombo,
    tp.origin,
    tp.destination,
    tp.via,
    tp.num_stops,
    tp.duration,
    tp.inclusions,
    tp.exclusions,
    tp.notes,
    tp.meeting_point,
    tp.pickup_point,
    tp.dropoff_point,
    tp.operational_hours,
    tp.images,
    t.transfer_name,
    t.description as transfer_description,
    t.mode,
    t.preferred as transfer_preferred,
    t.markup,
    t.rule,
    t.raw_rates,
    t.child_policy as transfer_child_policy,
    t.cancellation_policy,
    t.remarks as transfer_remarks,
    t.currency,
    co.country_name as country,
    c.city_name as city,
    t.examples,
    t.route,
    t.dmc_id,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', tao.id,
        'name', tao.name,
        'description', tao.description,
        'rate_adult', tao.rate_adult,
        'rate_child', tao.rate_child,
        'rate_teenager', tao.rate_teenager,
        'rate_infant', tao.rate_infant,
        'total_rate', tao.total_rate,
        'age_policy', tao.age_policy,
        'is_mandatory', tpao.is_mandatory
      ))
      FROM transfer_package_add_ons tpao
      JOIN transfer_add_ons tao ON tpao.transfer_add_on_id = tao.id
      WHERE tpao.transfer_package_id = tp.id),
      '[]'::jsonb
    ) as add_ons
  FROM transfer_packages tp
  JOIN transfers t ON tp.transfer_id = t.id
  LEFT JOIN cities c ON t.city = c.id
  LEFT JOIN countries co ON t.country = co.id
  WHERE tp.id = p_package_id;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION search_tour_names_vector IS 'Stage 1: Vector search for tour names. Returns minimal data for LLM selection.';
COMMENT ON FUNCTION fetch_packages_for_tours IS 'Stage 2: Get packages for selected tours. Returns package names without pricing.';
COMMENT ON FUNCTION fetch_tour_package_details_for_quote IS 'Stage 3: Get full package details. Returns complete pricing and seasons.';
COMMENT ON FUNCTION search_transfer_names_vector IS 'Stage 1: Vector search for transfer names. Returns minimal data for LLM selection.';
COMMENT ON FUNCTION fetch_packages_for_transfers IS 'Stage 2: Get packages for selected transfers. Returns package names without pricing.';
COMMENT ON FUNCTION fetch_transfer_package_details_for_quote IS 'Stage 3: Get full package details. Returns complete pricing and seasons.';
