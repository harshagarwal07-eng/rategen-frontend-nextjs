-- Migration: Direct Tour Package Search
-- Purpose: Search tour_packages directly by embedding without grouping by tour
-- Benefits: Find exact package matches (e.g., "Undersea Walk" finds that specific package)

-- ============================================================================
-- TOUR PACKAGES - Direct Vector Search
-- ============================================================================
-- Returns packages directly, not grouped by tour
-- When user asks for "undersea walk", finds packages with that name
-- Token cost: ~20-30 tokens per package

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

COMMENT ON FUNCTION search_tour_packages_vector IS 'Direct package search by embedding. No grouping by tour - finds exact package matches.';
