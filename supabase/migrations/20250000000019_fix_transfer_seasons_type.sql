-- Migration: Fix Transfer Vector Search Seasons Type
-- Purpose: Fix type mismatch in search_transfers_vector function
-- Issue: Function returns `seasons JSONB[]` but view/table has `seasons JSONB`
-- Error: "Returned type jsonb[] does not match expected type jsonb in column 10"

-- Drop and recreate search_transfers_vector with correct seasons type (JSONB, not JSONB[])
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
  seasons JSONB,  -- Changed from JSONB[] to JSONB (single JSONB column containing array)
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
    vtp.seasons,  -- This is JSONB, not JSONB[]
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

COMMENT ON FUNCTION search_transfers_vector IS 'Fixed: seasons type changed from JSONB[] to JSONB to match vw_transfers_packages view';
