-- Add hotel_address and property_type to search_hotels_names_vector function
-- This allows the hotel matcher LLM to see property type and address when selecting hotels

DROP FUNCTION IF EXISTS search_hotels_names_vector(vector(1536), uuid, float, int);

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
  hotel_address text,
  hotel_city text,
  hotel_country text,
  star_rating text,
  property_type text,
  preferred boolean,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT DISTINCT ON (h.id)
    h.id as hotel_id,
    h.hotel_name,
    h.hotel_code,
    h.hotel_address,
    c.city_name as hotel_city,
    co.country_name as hotel_country,
    h.star_rating,
    h.property_type,
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

COMMENT ON FUNCTION search_hotels_names_vector IS 'Stage 1: Returns hotel names, property type, and address for initial matching. Used by hotel matcher LLM to intelligently select hotels based on user query.';
