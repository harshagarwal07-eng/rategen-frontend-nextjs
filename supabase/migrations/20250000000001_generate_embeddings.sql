-- Generate embeddings for all existing data
-- Run this AFTER adding the embedding columns

DO $$
DECLARE
  room_record RECORD;
  tour_record RECORD;
  transfer_record RECORD;
  search_text TEXT;
  embedding_result vector(1536);
  hotel_count INT := 0;
  tour_count INT := 0;
  transfer_count INT := 0;
BEGIN
  RAISE NOTICE '🚀 Starting embedding generation...';
  RAISE NOTICE '';

  -- ============================================
  -- Generate Hotel Room Embeddings
  -- ============================================
  RAISE NOTICE '📍 Generating hotel embeddings...';

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
  LOOP
    -- Build search text
    search_text := CONCAT_WS(' | ',
      room_record.hotel_name,
      room_record.room_category,
      room_record.hotel_city,
      room_record.hotel_country
    );

    IF room_record.meal_plan IS NOT NULL THEN
      search_text := search_text || ' | ' || room_record.meal_plan;
    END IF;

    IF room_record.star_rating IS NOT NULL THEN
      search_text := search_text || ' | ' || room_record.star_rating || ' star hotel';
    END IF;

    -- Generate embedding
    BEGIN
      embedding_result := generate_embedding(search_text);

      -- Update room
      UPDATE hotel_rooms
      SET embedding = embedding_result
      WHERE id = room_record.id;

      hotel_count := hotel_count + 1;

      IF hotel_count % 10 = 0 THEN
        RAISE NOTICE 'Hotel progress: %', hotel_count;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error generating embedding for hotel room %: %', room_record.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '✅ Hotel embeddings generated: % rooms', hotel_count;
  RAISE NOTICE '';

  -- ============================================
  -- Generate Tour Package Embeddings
  -- ============================================
  RAISE NOTICE '🎯 Generating tour embeddings...';

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
  LOOP
    -- Build search text
    search_text := CONCAT_WS(' | ',
      tour_record.tour_name,
      tour_record.package_name,
      tour_record.city_name,
      tour_record.country_name
    );

    -- Generate embedding
    BEGIN
      embedding_result := generate_embedding(search_text);

      -- Update tour package
      UPDATE tour_packages
      SET embedding = embedding_result
      WHERE id = tour_record.id;

      tour_count := tour_count + 1;

      IF tour_count % 10 = 0 THEN
        RAISE NOTICE 'Tour progress: %', tour_count;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error generating embedding for tour package %: %', tour_record.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '✅ Tour embeddings generated: % packages', tour_count;
  RAISE NOTICE '';

  -- ============================================
  -- Generate Transfer Package Embeddings
  -- ============================================
  RAISE NOTICE '🚐 Generating transfer embeddings...';

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
  LOOP
    -- Build search text
    search_text := CONCAT_WS(' | ',
      transfer_record.transfer_name,
      transfer_record.package_name,
      transfer_record.city_name,
      transfer_record.country_name
    );

    IF transfer_record.route IS NOT NULL THEN
      search_text := search_text || ' | Route: ' || transfer_record.route;
    END IF;

    IF transfer_record.mode IS NOT NULL THEN
      search_text := search_text || ' | Mode: ' || transfer_record.mode;
    END IF;

    -- Generate embedding
    BEGIN
      embedding_result := generate_embedding(search_text);

      -- Update transfer package
      UPDATE transfer_packages
      SET embedding = embedding_result
      WHERE id = transfer_record.id;

      transfer_count := transfer_count + 1;

      IF transfer_count % 10 = 0 THEN
        RAISE NOTICE 'Transfer progress: %', transfer_count;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error generating embedding for transfer package %: %', transfer_record.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '✅ Transfer embeddings generated: % packages', transfer_count;
  RAISE NOTICE '';

  RAISE NOTICE '✨ All embeddings generated successfully!';
  RAISE NOTICE 'Total: % hotels, % tours, % transfers', hotel_count, tour_count, transfer_count;
END $$;
