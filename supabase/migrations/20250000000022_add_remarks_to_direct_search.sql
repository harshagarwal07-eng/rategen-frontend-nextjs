-- Migration: Add remarks to direct package search functions
-- Purpose: Include package-level remarks for better LLM selection decisions
-- Fields added: package_remarks (what the package includes/excludes)

-- ============================================================================
-- TOUR PACKAGES - Add remarks field
-- ============================================================================

CREATE OR REPLACE FUNCTION search_tour_packages_vector(
  query_embedding vector(1536),
  p_dmc_id uuid,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  package_id uuid,
  package_name text,
  tour_id uuid,
  tour_name text,
  description text,
  package_remarks text,
  includes_transfer boolean,
  preferred boolean,
  iscombo boolean,
  duration jsonb,
  city text,
  country text,
  currency text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    tp.id as package_id,
    tp.name as package_name,
    t.id as tour_id,
    t.tour_name,
    tp.description,
    tp.remarks as package_remarks,
    tp.includes_transfer,
    tp.preferred,
    tp.iscombo,
    tp.duration,
    c.city_name as city,
    co.country_name as country,
    t.currency,
    1 - (tp.embedding <=> query_embedding) as similarity
  FROM tour_packages tp
  JOIN tours t ON tp.tour_id = t.id
  LEFT JOIN cities c ON t.city = c.id
  LEFT JOIN countries co ON t.country = co.id
  WHERE t.dmc_id = p_dmc_id
    AND tp.embedding IS NOT NULL
    AND 1 - (tp.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

COMMENT ON FUNCTION search_tour_packages_vector IS 'Direct package search by embedding with remarks. No grouping by tour - finds exact package matches.';

-- ============================================================================
-- TRANSFER PACKAGES - Add remarks field
-- ============================================================================

CREATE OR REPLACE FUNCTION search_transfer_packages_vector(
  query_embedding vector(1536),
  p_dmc_id uuid,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  package_id uuid,
  package_name text,
  transfer_id uuid,
  transfer_name text,
  description text,
  package_remarks text,
  route text,
  origin text,
  destination text,
  mode text,
  preferred boolean,
  iscombo boolean,
  duration jsonb,
  city text,
  country text,
  currency text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    tp.id as package_id,
    tp.name as package_name,
    t.id as transfer_id,
    t.transfer_name,
    tp.description,
    tp.remarks as package_remarks,
    t.route,
    tp.origin,
    tp.destination,
    t.mode,
    tp.preferred,
    tp.iscombo,
    tp.duration,
    c.city_name as city,
    co.country_name as country,
    t.currency,
    1 - (tp.embedding <=> query_embedding) as similarity
  FROM transfer_packages tp
  JOIN transfers t ON tp.transfer_id = t.id
  LEFT JOIN cities c ON t.city = c.id
  LEFT JOIN countries co ON t.country = co.id
  WHERE t.dmc_id = p_dmc_id
    AND tp.embedding IS NOT NULL
    AND 1 - (tp.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

COMMENT ON FUNCTION search_transfer_packages_vector IS 'Direct transfer package search by embedding with remarks. No grouping by transfer - finds exact package matches.';
