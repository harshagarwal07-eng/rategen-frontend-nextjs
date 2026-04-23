-- Migration: Direct Transfer Package Search
-- Purpose: Search transfer_packages directly by embedding without grouping by transfer
-- Benefits: Find exact package matches (e.g., "Airport to Hotel" finds that specific package)

-- ============================================================================
-- TRANSFER PACKAGES - Direct Vector Search
-- ============================================================================
-- Returns packages directly, not grouped by transfer
-- When user asks for "airport transfer", finds packages with that name
-- Token cost: ~20-30 tokens per package

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

COMMENT ON FUNCTION search_transfer_packages_vector IS 'Direct transfer package search by embedding. No grouping by transfer - finds exact package matches.';
