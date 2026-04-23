-- Add operational_hours and duration to search_tours_vector function
-- This enables validation of tour operating days against requested dates

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
  operational_hours JSONB,  -- NEW: For validating operating days
  duration JSONB,           -- NEW: For validating tour length
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
    tp.operational_hours,  -- Get from tour_packages table directly
    tp.duration,           -- Get from tour_packages table directly
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

COMMENT ON FUNCTION search_tours_vector IS 'Vector search for tours with operational_hours and duration for scheduling validation';
