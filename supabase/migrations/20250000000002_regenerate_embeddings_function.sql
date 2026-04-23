-- ============================================================================
-- Separate embedding regeneration functions to avoid timeouts
-- Each function handles one service type with batch processing support
-- ============================================================================

-- Drop the old combined function if it exists
DROP FUNCTION IF EXISTS regenerate_all_embeddings();

-- ============================================================================
-- HOTELS: Regenerate hotel room embeddings
-- Usage: SELECT * FROM regenerate_hotel_embeddings();
-- Usage with batch: SELECT * FROM regenerate_hotel_embeddings(100); -- Process 100 at a time
-- ============================================================================
CREATE OR REPLACE FUNCTION regenerate_hotel_embeddings(
  p_batch_size INT DEFAULT NULL  -- NULL = process all, or specify batch size
)
RETURNS TABLE (
  processed INT,
  errors INT,
  remaining INT
) AS $$
DECLARE
  room_record RECORD;
  search_text TEXT;
  embedding_result vector(1536);
  v_processed INT := 0;
  v_errors INT := 0;
  v_remaining INT := 0;
  v_query TEXT;
BEGIN
  RAISE NOTICE '🏨 Regenerating hotel embeddings...';

  -- Count remaining before processing
  SELECT COUNT(*) INTO v_remaining
  FROM hotel_rooms WHERE embedding IS NULL;

  RAISE NOTICE '📊 Hotels without embeddings: %', v_remaining;

  FOR room_record IN
    SELECT
      hr.id,
      h.hotel_name,
      hr.room_category,
      c.city_name as hotel_city,
      co.country_name as hotel_country,
      hr.meal_plan,
      h.star_rating
    FROM hotel_rooms hr
    JOIN hotels h ON hr.hotel_id = h.id
    LEFT JOIN cities c ON h.hotel_city = c.id
    LEFT JOIN countries co ON h.hotel_country = co.id
    WHERE hr.embedding IS NULL
    LIMIT p_batch_size  -- NULL means no limit
  LOOP
    BEGIN
      search_text := CONCAT_WS(' | ',
        room_record.hotel_name,
        room_record.room_category,
        room_record.hotel_city,
        room_record.hotel_country,
        room_record.meal_plan,
        CASE WHEN room_record.star_rating IS NOT NULL
          THEN room_record.star_rating || ' star hotel'
          ELSE NULL END
      );

      embedding_result := generate_embedding(search_text);
      UPDATE hotel_rooms SET embedding = embedding_result WHERE id = room_record.id;
      v_processed := v_processed + 1;

      -- Progress logging every 10 records
      IF v_processed % 10 = 0 THEN
        RAISE NOTICE '  Processed % hotels...', v_processed;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING '❌ Hotel room % error: %', room_record.id, SQLERRM;
    END;
  END LOOP;

  -- Count remaining after processing
  SELECT COUNT(*) INTO v_remaining
  FROM hotel_rooms WHERE embedding IS NULL;

  RAISE NOTICE '✅ Hotels complete: processed=%, errors=%, remaining=%', v_processed, v_errors, v_remaining;

  RETURN QUERY SELECT v_processed, v_errors, v_remaining;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION regenerate_hotel_embeddings(INT) IS
'Generates embeddings for hotel rooms without one.
Usage: SELECT * FROM regenerate_hotel_embeddings();        -- Process all
       SELECT * FROM regenerate_hotel_embeddings(50);      -- Process 50 at a time';


-- ============================================================================
-- TOURS: Regenerate tour package embeddings
-- Usage: SELECT * FROM regenerate_tour_embeddings();
-- Usage with batch: SELECT * FROM regenerate_tour_embeddings(100);
-- ============================================================================
CREATE OR REPLACE FUNCTION regenerate_tour_embeddings(
  p_batch_size INT DEFAULT NULL
)
RETURNS TABLE (
  processed INT,
  errors INT,
  remaining INT
) AS $$
DECLARE
  tour_record RECORD;
  search_text TEXT;
  embedding_result vector(1536);
  v_processed INT := 0;
  v_errors INT := 0;
  v_remaining INT := 0;
BEGIN
  RAISE NOTICE '🎯 Regenerating tour embeddings...';

  -- Count remaining before processing
  SELECT COUNT(*) INTO v_remaining
  FROM tour_packages WHERE embedding IS NULL;

  RAISE NOTICE '📊 Tours without embeddings: %', v_remaining;

  FOR tour_record IN
    SELECT
      tp.id,
      t.tour_name,
      tp.name as package_name,
      c.city_name,
      co.country_name
    FROM tour_packages tp
    JOIN tours t ON tp.tour_id = t.id
    LEFT JOIN cities c ON t.city = c.id
    LEFT JOIN countries co ON t.country = co.id
    WHERE tp.embedding IS NULL
    LIMIT p_batch_size
  LOOP
    BEGIN
      search_text := CONCAT_WS(' | ',
        tour_record.tour_name,
        tour_record.package_name,
        tour_record.city_name,
        tour_record.country_name
      );

      embedding_result := generate_embedding(search_text);
      UPDATE tour_packages SET embedding = embedding_result WHERE id = tour_record.id;
      v_processed := v_processed + 1;

      IF v_processed % 10 = 0 THEN
        RAISE NOTICE '  Processed % tours...', v_processed;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING '❌ Tour package % error: %', tour_record.id, SQLERRM;
    END;
  END LOOP;

  -- Count remaining after processing
  SELECT COUNT(*) INTO v_remaining
  FROM tour_packages WHERE embedding IS NULL;

  RAISE NOTICE '✅ Tours complete: processed=%, errors=%, remaining=%', v_processed, v_errors, v_remaining;

  RETURN QUERY SELECT v_processed, v_errors, v_remaining;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION regenerate_tour_embeddings(INT) IS
'Generates embeddings for tour packages without one.
Usage: SELECT * FROM regenerate_tour_embeddings();         -- Process all
       SELECT * FROM regenerate_tour_embeddings(50);       -- Process 50 at a time';


-- ============================================================================
-- TRANSFERS: Regenerate transfer package embeddings
-- Usage: SELECT * FROM regenerate_transfer_embeddings();
-- Usage with batch: SELECT * FROM regenerate_transfer_embeddings(100);
-- ============================================================================
CREATE OR REPLACE FUNCTION regenerate_transfer_embeddings(
  p_batch_size INT DEFAULT NULL
)
RETURNS TABLE (
  processed INT,
  errors INT,
  remaining INT
) AS $$
DECLARE
  transfer_record RECORD;
  search_text TEXT;
  embedding_result vector(1536);
  v_processed INT := 0;
  v_errors INT := 0;
  v_remaining INT := 0;
BEGIN
  RAISE NOTICE '🚗 Regenerating transfer embeddings...';

  -- Count remaining before processing
  SELECT COUNT(*) INTO v_remaining
  FROM transfer_packages WHERE embedding IS NULL;

  RAISE NOTICE '📊 Transfers without embeddings: %', v_remaining;

  FOR transfer_record IN
    SELECT
      tfp.id,
      tf.transfer_name,
      tfp.name as package_name,
      tf.route,
      tf.mode,
      c.city_name,
      co.country_name
    FROM transfer_packages tfp
    JOIN transfers tf ON tfp.transfer_id = tf.id
    LEFT JOIN cities c ON tf.city = c.id
    LEFT JOIN countries co ON tf.country = co.id
    WHERE tfp.embedding IS NULL
    LIMIT p_batch_size
  LOOP
    BEGIN
      search_text := CONCAT_WS(' | ',
        transfer_record.transfer_name,
        transfer_record.package_name,
        transfer_record.city_name,
        transfer_record.country_name,
        CASE WHEN transfer_record.route IS NOT NULL
          THEN 'Route: ' || transfer_record.route
          ELSE NULL END,
        CASE WHEN transfer_record.mode IS NOT NULL
          THEN 'Mode: ' || transfer_record.mode
          ELSE NULL END
      );

      embedding_result := generate_embedding(search_text);
      UPDATE transfer_packages SET embedding = embedding_result WHERE id = transfer_record.id;
      v_processed := v_processed + 1;

      IF v_processed % 10 = 0 THEN
        RAISE NOTICE '  Processed % transfers...', v_processed;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING '❌ Transfer package % error: %', transfer_record.id, SQLERRM;
    END;
  END LOOP;

  -- Count remaining after processing
  SELECT COUNT(*) INTO v_remaining
  FROM transfer_packages WHERE embedding IS NULL;

  RAISE NOTICE '✅ Transfers complete: processed=%, errors=%, remaining=%', v_processed, v_errors, v_remaining;

  RETURN QUERY SELECT v_processed, v_errors, v_remaining;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION regenerate_transfer_embeddings(INT) IS
'Generates embeddings for transfer packages without one.
Usage: SELECT * FROM regenerate_transfer_embeddings();     -- Process all
       SELECT * FROM regenerate_transfer_embeddings(50);   -- Process 50 at a time';


-- ============================================================================
-- HELPER: Check embedding status across all services
-- Usage: SELECT * FROM check_embedding_status();
-- ============================================================================
CREATE OR REPLACE FUNCTION check_embedding_status()
RETURNS TABLE (
  service_type TEXT,
  total_records BIGINT,
  with_embeddings BIGINT,
  without_embeddings BIGINT,
  percentage_complete NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'hotels'::TEXT as service_type,
    COUNT(*)::BIGINT as total_records,
    COUNT(embedding)::BIGINT as with_embeddings,
    (COUNT(*) - COUNT(embedding))::BIGINT as without_embeddings,
    ROUND(COUNT(embedding)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) as percentage_complete
  FROM hotel_rooms
  UNION ALL
  SELECT
    'tours'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(embedding)::BIGINT,
    (COUNT(*) - COUNT(embedding))::BIGINT,
    ROUND(COUNT(embedding)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1)
  FROM tour_packages
  UNION ALL
  SELECT
    'transfers'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(embedding)::BIGINT,
    (COUNT(*) - COUNT(embedding))::BIGINT,
    ROUND(COUNT(embedding)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1)
  FROM transfer_packages;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_embedding_status() IS
'Shows embedding generation status for all service types.
Usage: SELECT * FROM check_embedding_status();';


-- ============================================================================
-- CONVENIENCE: Run all in sequence (wrapper function)
-- Usage: SELECT * FROM regenerate_all_embeddings_sequential();
-- ============================================================================
CREATE OR REPLACE FUNCTION regenerate_all_embeddings_sequential()
RETURNS TABLE (
  service_type TEXT,
  processed INT,
  errors INT,
  remaining INT
) AS $$
DECLARE
  hotel_result RECORD;
  tour_result RECORD;
  transfer_result RECORD;
BEGIN
  -- Hotels
  SELECT * INTO hotel_result FROM regenerate_hotel_embeddings();

  -- Tours
  SELECT * INTO tour_result FROM regenerate_tour_embeddings();

  -- Transfers
  SELECT * INTO transfer_result FROM regenerate_transfer_embeddings();

  -- Return combined results
  RETURN QUERY
  SELECT 'hotels'::TEXT, hotel_result.processed, hotel_result.errors, hotel_result.remaining
  UNION ALL
  SELECT 'tours'::TEXT, tour_result.processed, tour_result.errors, tour_result.remaining
  UNION ALL
  SELECT 'transfers'::TEXT, transfer_result.processed, transfer_result.errors, transfer_result.remaining;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION regenerate_all_embeddings_sequential() IS
'Runs all embedding regeneration functions in sequence.
For large datasets, prefer running individual functions with batch sizes.
Usage: SELECT * FROM regenerate_all_embeddings_sequential();';
