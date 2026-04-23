-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Note: Assumes generate_embedding() function already exists in the database
-- This function should accept input_text and return vector(1536)

-- Add embedding columns to hotel_rooms table
ALTER TABLE hotel_rooms
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add embedding columns to tour_packages table
ALTER TABLE tour_packages
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add embedding columns to transfer_packages table
ALTER TABLE transfer_packages
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create indexes for fast vector search using HNSW (Hierarchical Navigable Small World)
-- HNSW is best for high-dimensional vectors and provides fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS hotel_rooms_embedding_idx
ON hotel_rooms USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS tour_packages_embedding_idx
ON tour_packages USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS transfer_packages_embedding_idx
ON transfer_packages USING hnsw (embedding vector_cosine_ops);

-- Add indexes on dmc_id for filtered vector search
-- Note: dmc_id is on parent tables (hotels, tours, transfers)
-- These indexes help with the JOIN + WHERE dmc_id filter
-- (Indexes likely already exist, but creating IF NOT EXISTS to be safe)

CREATE INDEX IF NOT EXISTS hotels_dmc_id_idx ON hotels(dmc_id);
CREATE INDEX IF NOT EXISTS tours_dmc_id_idx ON tours(dmc_id);
CREATE INDEX IF NOT EXISTS transfers_dmc_id_idx ON transfers(dmc_id);

-- Create function for hybrid search scoring
-- Combines vector similarity with keyword matching
CREATE OR REPLACE FUNCTION calculate_hybrid_score(
  vector_similarity FLOAT,
  keyword_match BOOLEAN,
  is_preferred BOOLEAN
) RETURNS FLOAT AS $$
BEGIN
  RETURN
    (vector_similarity * 0.6) + -- 60% weight for semantic similarity
    (CASE WHEN keyword_match THEN 0.3 ELSE 0 END) + -- 30% boost for keyword match
    (CASE WHEN is_preferred THEN 0.1 ELSE 0 END); -- 10% boost for preferred
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comment: The views (vw_hotel_rooms, vw_tours_packages, vw_transfers_packages)
-- will automatically include the embedding column once it's added to base tables

-- ============================================
-- Vector Search Functions
-- ============================================

-- Search hotels by vector similarity
-- Uses vw_hotel_rooms view which already has all fields resolved
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
    vhr.hotel_name,
    vhr.hotel_city,
    vhr.hotel_country,
    vhr.hotel_currency,
    vhr.room_category,
    vhr.max_occupancy,
    vhr.meal_plan,
    vhr.star_rating,
    vhr.preferred,
    vhr.seasons,
    vhr.payment_policy,
    vhr.dmc_id,
    1 - (hr.embedding <=> query_embedding) AS similarity
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

-- Search tours by vector similarity
-- Uses vw_tours_packages view which already has all fields resolved
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
  seasons JSONB,
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
    vtp.tour_name,
    vtp.package_name,
    vtp.city,
    vtp.country,
    vtp.currency,
    vtp.seasons,
    vtp.add_ons,
    vtp.package_preferred,
    vtp.package_child_policy,
    vtp.tour_child_policy,
    vtp.dmc_id,
    1 - (tp.embedding <=> query_embedding) AS similarity
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

-- Search transfers by vector similarity
-- Uses vw_transfers_packages view which already has all fields resolved
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
  seasons JSONB,
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
    vtp.transfer_name,
    vtp.package_name,
    vtp.route,
    vtp.mode,
    vtp.city,
    vtp.country,
    vtp.currency,
    vtp.seasons,
    vtp.package_preferred,
    vtp.package_child_policy,
    vtp.transfer_child_policy,
    vtp.dmc_id,
    1 - (tfp.embedding <=> query_embedding) AS similarity
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
