-- Add combo_type and min_packages columns to combos table
-- combo_type: "AND" (all packages required) or "OR" (any package can be selected)
-- min_packages: Minimum number of packages required (default 2, can't be lower than 2)

-- Add combo_type column with default "AND"
ALTER TABLE combos
ADD COLUMN IF NOT EXISTS combo_type TEXT DEFAULT 'AND'
CHECK (combo_type IN ('AND', 'OR'));

-- Add min_packages column with default 2 and minimum constraint
ALTER TABLE combos
ADD COLUMN IF NOT EXISTS min_packages INTEGER DEFAULT 2
CHECK (min_packages >= 2);

-- Add comments for documentation
COMMENT ON COLUMN combos.combo_type IS 'Combo type: AND = all packages required together, OR = any package can be selected';
COMMENT ON COLUMN combos.min_packages IS 'Minimum number of packages required in this combo (cannot be less than 2)';

-- Create index for combo_type for filtering
CREATE INDEX IF NOT EXISTS idx_combos_combo_type ON combos(combo_type);

-- =====================================================
-- UPDATE VIEWS TO INCLUDE combo_type AND min_packages
-- =====================================================

-- Update vw_combos_full to include combo_type and min_packages
CREATE OR REPLACE VIEW public.vw_combos_full AS
SELECT
  c.id AS combo_id,
  c.title,
  c.description,
  c.remarks,
  c.age_policy,
  c.currency,
  c.dmc_id,
  c.combo_type,
  c.min_packages,
  co.country_code AS country_code,
  co.country_name AS country_name,
  ci.city_name AS city_name,

  -- Items as JSON array (tours and transfers included in this combo)
  (
    SELECT COALESCE(json_agg(
      json_build_object(
        'item_id', ci2.id,
        'item_type', ci2.item_type,
        'tour_id', ci2.tour_id,
        'transfer_id', ci2.transfer_id,
        'tour_package_id', ci2.tour_package_id,
        'transfer_package_id', ci2.transfer_package_id,
        'package_name', ci2.package_name,
        'order', ci2."order"
      ) ORDER BY ci2."order"
    ), '[]'::json)
    FROM combo_items ci2
    WHERE ci2.combo_id = c.id
  ) AS items,

  -- Seasons as JSON array (pricing by season)
  (
    SELECT COALESCE(json_agg(
      json_build_object(
        'season_id', cs.id,
        'dates', cs.dates,
        'blackout_dates', cs.blackout_dates,
        'exception_rules', cs.exception_rules,
        'order', cs."order",
        'ticket_only_rate_adult', cs.ticket_only_rate_adult,
        'ticket_only_rate_child', cs.ticket_only_rate_child,
        'ticket_only_rate_teenager', cs.ticket_only_rate_teenager,
        'ticket_only_rate_infant', cs.ticket_only_rate_infant,
        'sic_rate_adult', cs.sic_rate_adult,
        'sic_rate_child', cs.sic_rate_child,
        'sic_rate_teenager', cs.sic_rate_teenager,
        'sic_rate_infant', cs.sic_rate_infant,
        'pvt_rate', cs.pvt_rate,
        'per_vehicle_rate', cs.per_vehicle_rate,
        'total_rate', cs.total_rate
      ) ORDER BY cs."order"
    ), '[]'::json)
    FROM combo_seasons cs
    WHERE cs.combo_id = c.id
  ) AS seasons,

  -- Item count for quick filtering
  (SELECT COUNT(*) FROM combo_items ci3 WHERE ci3.combo_id = c.id) AS item_count,

  -- Package names concatenated for display
  (
    SELECT STRING_AGG(ci4.package_name, ' + ' ORDER BY ci4."order")
    FROM combo_items ci4
    WHERE ci4.combo_id = c.id
  ) AS package_names_display,

  c.created_at,
  c.updated_at

FROM combos c
LEFT JOIN countries co ON c.country = co.id
LEFT JOIN cities ci ON c.city = ci.id;

-- Update vw_combos_search to include combo_type and min_packages
CREATE OR REPLACE VIEW public.vw_combos_search AS
SELECT
  c.id AS combo_id,
  c.title,
  c.description,
  c.remarks,
  c.dmc_id,
  c.combo_type,
  c.min_packages,
  co.country_code AS country_code,
  (SELECT COUNT(*) FROM combo_items ci WHERE ci.combo_id = c.id) AS item_count,
  (
    SELECT STRING_AGG(ci2.package_name, ' + ' ORDER BY ci2."order")
    FROM combo_items ci2
    WHERE ci2.combo_id = c.id
  ) AS package_names
FROM combos c
LEFT JOIN countries co ON c.country = co.id;

-- Update search_combos_by_text to include combo_type and min_packages
CREATE OR REPLACE FUNCTION public.search_combos_by_text(
  p_search_query text,
  p_dmc_id uuid,
  p_country_code text DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  combo_id uuid,
  title text,
  description text,
  remarks text,
  country_code text,
  item_count bigint,
  package_names text,
  similarity_score real,
  combo_type text,
  min_packages integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.combo_id,
    cs.title::text,
    cs.description::text,
    cs.remarks::text,
    cs.country_code::text,
    cs.item_count,
    cs.package_names::text,
    -- Calculate similarity score
    GREATEST(
      similarity(LOWER(cs.title), LOWER(p_search_query)),
      similarity(LOWER(COALESCE(cs.description, '')), LOWER(p_search_query)),
      similarity(LOWER(COALESCE(cs.package_names, '')), LOWER(p_search_query))
    ) AS similarity_score,
    cs.combo_type::text,
    cs.min_packages
  FROM vw_combos_search cs
  WHERE cs.dmc_id = p_dmc_id
    AND (p_country_code IS NULL OR cs.country_code::text = p_country_code)
    AND (
      -- Match on title
      cs.title ILIKE '%' || p_search_query || '%'
      OR cs.description ILIKE '%' || p_search_query || '%'
      OR cs.package_names ILIKE '%' || p_search_query || '%'
      -- Or fuzzy match
      OR similarity(LOWER(cs.title), LOWER(p_search_query)) > 0.3
      OR similarity(LOWER(COALESCE(cs.description, '')), LOWER(p_search_query)) > 0.3
      OR similarity(LOWER(COALESCE(cs.package_names, '')), LOWER(p_search_query)) > 0.3
    )
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$;

-- Update search_combos_by_vector to include combo_type and min_packages
CREATE OR REPLACE FUNCTION public.search_combos_by_vector(
  p_query_embedding vector(1536),
  p_dmc_id uuid,
  p_country_code text DEFAULT NULL,
  p_match_threshold float DEFAULT 0.5,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  combo_id uuid,
  title text,
  description text,
  remarks text,
  country_code text,
  item_count bigint,
  package_names text,
  similarity_score float,
  combo_type text,
  min_packages integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.combo_id,
    c.title::text,
    c.description::text,
    c.remarks::text,
    co.country_code::text,
    (SELECT COUNT(*) FROM combo_items ci WHERE ci.combo_id = c.id) AS item_count,
    (SELECT STRING_AGG(ci2.package_name, ' + ' ORDER BY ci2."order") FROM combo_items ci2 WHERE ci2.combo_id = c.id)::text AS package_names,
    (1 - (ce.embedding <=> p_query_embedding))::float AS similarity_score,
    c.combo_type::text,
    c.min_packages
  FROM combo_embeddings ce
  JOIN combos c ON ce.combo_id = c.id
  LEFT JOIN countries co ON c.country = co.id
  WHERE c.dmc_id = p_dmc_id
    AND (p_country_code IS NULL OR co.country_code = p_country_code)
    AND 1 - (ce.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY ce.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;
