-- =====================================================
-- COMBO VECTOR STORE & VIEWS
-- =====================================================
-- This file creates the vector embeddings table and views
-- needed for combo search functionality.
--
-- Search Flow:
-- 1. Vector search on combo_embeddings (title + description)
-- 2. If match found → use combo (skip individual tour/transfer)
-- 3. If no match → fall back to individual services
-- =====================================================

-- =====================================================
-- 1. COMBO EMBEDDINGS TABLE (Vector Store)
-- =====================================================
-- Stores embeddings for semantic search on combos
-- Content = title + " - " + description (description is auto-generated from package names)

CREATE TABLE IF NOT EXISTS public.combo_embeddings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  combo_id uuid NOT NULL,
  content text NOT NULL, -- Searchable text: title + description
  embedding vector(1536), -- OpenAI embedding dimension
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  CONSTRAINT combo_embeddings_pkey PRIMARY KEY (id),
  CONSTRAINT combo_embeddings_combo_id_fkey FOREIGN KEY (combo_id)
    REFERENCES combos(id) ON DELETE CASCADE,
  CONSTRAINT combo_embeddings_combo_id_key UNIQUE (combo_id)
) TABLESPACE pg_default;

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_combo_embeddings_embedding
  ON public.combo_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for combo lookup
CREATE INDEX IF NOT EXISTS idx_combo_embeddings_combo_id
  ON public.combo_embeddings
  USING btree (combo_id);

-- =====================================================
-- 2. VIEW: vw_combos_full
-- =====================================================
-- Complete combo view with items and seasons for AI matching & rate fetching

CREATE OR REPLACE VIEW public.vw_combos_full AS
SELECT
  c.id AS combo_id,
  c.title,
  c.description,
  c.remarks,
  c.age_policy,
  c.currency,
  c.dmc_id,
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

-- =====================================================
-- 3. VIEW: vw_combos_search
-- =====================================================
-- Lightweight view for Stage 1 search (name matching)

CREATE OR REPLACE VIEW public.vw_combos_search AS
SELECT
  c.id AS combo_id,
  c.title,
  c.description,
  c.remarks,
  c.dmc_id,
  co.country_code AS country_code,
  (SELECT COUNT(*) FROM combo_items ci WHERE ci.combo_id = c.id) AS item_count,
  (
    SELECT STRING_AGG(ci2.package_name, ' + ' ORDER BY ci2."order")
    FROM combo_items ci2
    WHERE ci2.combo_id = c.id
  ) AS package_names
FROM combos c
LEFT JOIN countries co ON c.country = co.id;

-- =====================================================
-- 4. FUNCTION: search_combos_by_text
-- =====================================================
-- Stage 1: Text-based search for combos (exact/fuzzy match)

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
  similarity_score real
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
    ) AS similarity_score
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

-- =====================================================
-- 5. FUNCTION: search_combos_by_vector
-- =====================================================
-- Vector-based semantic search for combos
-- NOTE: Returns same fields as search_combos_by_text for consistency
--       (including remarks for validation purposes)

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
  similarity_score float
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
    (1 - (ce.embedding <=> p_query_embedding))::float AS similarity_score
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

-- =====================================================
-- 6. FUNCTION: get_combo_full_details
-- =====================================================
-- Fetch complete combo details for rate calculation

CREATE OR REPLACE FUNCTION public.get_combo_full_details(
  p_combo_id uuid
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT row_to_json(combo_data) INTO v_result
  FROM (
    SELECT * FROM vw_combos_full WHERE combo_id = p_combo_id
  ) combo_data;

  RETURN v_result;
END;
$$;

-- =====================================================
-- 7. TRIGGER: Auto-generate combo embeddings
-- =====================================================
-- Automatically create/update embeddings when combo is created/updated
-- Uses the same generate_embedding() function as tours/hotels/transfers

CREATE OR REPLACE FUNCTION public.sync_combo_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_search_text TEXT;
  v_embedding vector(1536);
BEGIN
  -- Build search text from title and description
  v_search_text := NEW.title || ' | ' || COALESCE(NEW.description, '');

  -- Generate embedding using the existing function
  BEGIN
    v_embedding := generate_embedding(v_search_text);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to generate embedding for combo %: %', NEW.id, SQLERRM;
    v_embedding := NULL;
  END;

  -- Insert or update embedding record with generated embedding
  INSERT INTO combo_embeddings (combo_id, content, embedding)
  VALUES (
    NEW.id,
    v_search_text,
    v_embedding
  )
  ON CONFLICT (combo_id)
  DO UPDATE SET
    content = v_search_text,
    embedding = v_embedding,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Create trigger on combos table
DROP TRIGGER IF EXISTS trigger_sync_combo_embedding ON combos;
CREATE TRIGGER trigger_sync_combo_embedding
AFTER INSERT OR UPDATE OF title, description ON combos
FOR EACH ROW
EXECUTE FUNCTION sync_combo_embedding();

-- =====================================================
-- 8. FUNCTION: Regenerate combo embeddings
-- =====================================================
-- Backfill embeddings for existing combos that have NULL embeddings
-- Usage: SELECT * FROM regenerate_combo_embeddings();

CREATE OR REPLACE FUNCTION public.regenerate_combo_embeddings()
RETURNS TABLE (
  processed INT,
  errors INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  combo_record RECORD;
  v_search_text TEXT;
  v_embedding vector(1536);
  v_processed INT := 0;
  v_errors INT := 0;
BEGIN
  RAISE NOTICE '🚀 Regenerating combo embeddings...';

  -- First, ensure all combos have an entry in combo_embeddings
  INSERT INTO combo_embeddings (combo_id, content)
  SELECT
    c.id,
    c.title || ' | ' || COALESCE(c.description, '')
  FROM combos c
  WHERE NOT EXISTS (
    SELECT 1 FROM combo_embeddings ce WHERE ce.combo_id = c.id
  );

  -- Now generate embeddings for all records with NULL embedding
  FOR combo_record IN
    SELECT
      ce.id,
      ce.combo_id,
      c.title,
      c.description
    FROM combo_embeddings ce
    JOIN combos c ON ce.combo_id = c.id
    WHERE ce.embedding IS NULL
  LOOP
    BEGIN
      -- Build search text
      v_search_text := combo_record.title || ' | ' || COALESCE(combo_record.description, '');

      -- Generate embedding
      v_embedding := generate_embedding(v_search_text);

      -- Update record
      UPDATE combo_embeddings
      SET
        content = v_search_text,
        embedding = v_embedding,
        updated_at = now()
      WHERE id = combo_record.id;

      v_processed := v_processed + 1;

      IF v_processed % 10 = 0 THEN
        RAISE NOTICE 'Combo progress: %', v_processed;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING 'Error generating embedding for combo %: %', combo_record.combo_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '✅ Combo embeddings regenerated: % processed, % errors', v_processed, v_errors;

  RETURN QUERY SELECT v_processed, v_errors;
END;
$$;

COMMENT ON FUNCTION regenerate_combo_embeddings() IS
'Generates embeddings for all combos that don''t have one. Safe to run multiple times.
Usage: SELECT * FROM regenerate_combo_embeddings();';

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON vw_combos_full TO authenticated;
GRANT SELECT ON vw_combos_search TO authenticated;
GRANT EXECUTE ON FUNCTION search_combos_by_text TO authenticated;
GRANT EXECUTE ON FUNCTION search_combos_by_vector TO authenticated;
GRANT EXECUTE ON FUNCTION get_combo_full_details TO authenticated;
GRANT EXECUTE ON FUNCTION regenerate_combo_embeddings TO authenticated;
