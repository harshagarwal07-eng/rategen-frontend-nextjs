-- ============================================================================
-- Auto-generate embeddings on INSERT/UPDATE for tours and transfers
-- Hotels already have triggers, this adds the missing ones for tours/transfers
-- ============================================================================

-- ============================================================================
-- HOTELS: Auto-generate embedding function (if not exists)
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_generate_hotel_room_embedding()
RETURNS TRIGGER AS $$
DECLARE
  search_text TEXT;
  embedding_result vector(1536);
  v_hotel_name TEXT;
  v_hotel_city TEXT;
  v_hotel_country TEXT;
  v_star_rating TEXT;
BEGIN
  -- Get hotel info
  SELECT
    h.hotel_name,
    c.city_name,
    co.country_name,
    h.star_rating
  INTO v_hotel_name, v_hotel_city, v_hotel_country, v_star_rating
  FROM hotels h
  LEFT JOIN cities c ON h.hotel_city = c.id
  LEFT JOIN countries co ON h.hotel_country = co.id
  WHERE h.id = NEW.hotel_id;

  -- Build search text
  search_text := CONCAT_WS(' | ',
    v_hotel_name,
    NEW.room_category,
    v_hotel_city,
    v_hotel_country,
    NEW.meal_plan,
    CASE WHEN v_star_rating IS NOT NULL
      THEN v_star_rating || ' star hotel'
      ELSE NULL END
  );

  -- Generate embedding
  BEGIN
    embedding_result := generate_embedding(search_text);
    NEW.embedding := embedding_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to generate embedding for hotel room %: %', NEW.id, SQLERRM;
    -- Don't fail the insert/update, just leave embedding NULL
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist (hotels)
DROP TRIGGER IF EXISTS trigger_auto_generate_hotel_room_embedding_insert ON hotel_rooms;
CREATE TRIGGER trigger_auto_generate_hotel_room_embedding_insert
BEFORE INSERT ON hotel_rooms
FOR EACH ROW
EXECUTE FUNCTION auto_generate_hotel_room_embedding();

DROP TRIGGER IF EXISTS trigger_auto_generate_hotel_room_embedding_update ON hotel_rooms;
CREATE TRIGGER trigger_auto_generate_hotel_room_embedding_update
BEFORE UPDATE OF hotel_id, room_category, meal_plan, max_occupancy, other_details
ON hotel_rooms
FOR EACH ROW
WHEN (
  OLD.hotel_id IS DISTINCT FROM NEW.hotel_id
  OR OLD.room_category IS DISTINCT FROM NEW.room_category
  OR OLD.meal_plan IS DISTINCT FROM NEW.meal_plan
  OR OLD.max_occupancy IS DISTINCT FROM NEW.max_occupancy
  OR OLD.other_details IS DISTINCT FROM NEW.other_details
)
EXECUTE FUNCTION auto_generate_hotel_room_embedding();


-- ============================================================================
-- TOURS: Auto-generate embedding function
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_generate_tour_package_embedding()
RETURNS TRIGGER AS $$
DECLARE
  search_text TEXT;
  embedding_result vector(1536);
  v_tour_name TEXT;
  v_city_name TEXT;
  v_country_name TEXT;
BEGIN
  -- Get tour info
  SELECT
    t.tour_name,
    c.city_name,
    co.country_name
  INTO v_tour_name, v_city_name, v_country_name
  FROM tours t
  LEFT JOIN cities c ON t.city = c.id
  LEFT JOIN countries co ON t.country = co.id
  WHERE t.id = NEW.tour_id;

  -- Build search text
  search_text := CONCAT_WS(' | ',
    v_tour_name,
    NEW.name,  -- package name
    v_city_name,
    v_country_name
  );

  -- Generate embedding
  BEGIN
    embedding_result := generate_embedding(search_text);
    NEW.embedding := embedding_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to generate embedding for tour package %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for tour_packages
DROP TRIGGER IF EXISTS trigger_auto_generate_tour_package_embedding_insert ON tour_packages;
CREATE TRIGGER trigger_auto_generate_tour_package_embedding_insert
BEFORE INSERT ON tour_packages
FOR EACH ROW
EXECUTE FUNCTION auto_generate_tour_package_embedding();

DROP TRIGGER IF EXISTS trigger_auto_generate_tour_package_embedding_update ON tour_packages;
CREATE TRIGGER trigger_auto_generate_tour_package_embedding_update
BEFORE UPDATE OF tour_id, name, description
ON tour_packages
FOR EACH ROW
WHEN (
  OLD.tour_id IS DISTINCT FROM NEW.tour_id
  OR OLD.name IS DISTINCT FROM NEW.name
  OR OLD.description IS DISTINCT FROM NEW.description
)
EXECUTE FUNCTION auto_generate_tour_package_embedding();


-- ============================================================================
-- TRANSFERS: Auto-generate embedding function
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_generate_transfer_package_embedding()
RETURNS TRIGGER AS $$
DECLARE
  search_text TEXT;
  embedding_result vector(1536);
  v_transfer_name TEXT;
  v_route TEXT;
  v_mode TEXT;
  v_city_name TEXT;
  v_country_name TEXT;
BEGIN
  -- Get transfer info
  SELECT
    t.transfer_name,
    t.route,
    t.mode,
    c.city_name,
    co.country_name
  INTO v_transfer_name, v_route, v_mode, v_city_name, v_country_name
  FROM transfers t
  LEFT JOIN cities c ON t.city = c.id
  LEFT JOIN countries co ON t.country = co.id
  WHERE t.id = NEW.transfer_id;

  -- Build search text
  search_text := CONCAT_WS(' | ',
    v_transfer_name,
    NEW.name,  -- package name
    v_city_name,
    v_country_name,
    CASE WHEN v_route IS NOT NULL THEN 'Route: ' || v_route ELSE NULL END,
    CASE WHEN v_mode IS NOT NULL THEN 'Mode: ' || v_mode ELSE NULL END
  );

  -- Generate embedding
  BEGIN
    embedding_result := generate_embedding(search_text);
    NEW.embedding := embedding_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to generate embedding for transfer package %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for transfer_packages
DROP TRIGGER IF EXISTS trigger_auto_generate_transfer_package_embedding_insert ON transfer_packages;
CREATE TRIGGER trigger_auto_generate_transfer_package_embedding_insert
BEFORE INSERT ON transfer_packages
FOR EACH ROW
EXECUTE FUNCTION auto_generate_transfer_package_embedding();

DROP TRIGGER IF EXISTS trigger_auto_generate_transfer_package_embedding_update ON transfer_packages;
CREATE TRIGGER trigger_auto_generate_transfer_package_embedding_update
BEFORE UPDATE OF transfer_id, name, description
ON transfer_packages
FOR EACH ROW
WHEN (
  OLD.transfer_id IS DISTINCT FROM NEW.transfer_id
  OR OLD.name IS DISTINCT FROM NEW.name
  OR OLD.description IS DISTINCT FROM NEW.description
)
EXECUTE FUNCTION auto_generate_transfer_package_embedding();


-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION auto_generate_hotel_room_embedding() IS
'Automatically generates embedding for hotel rooms on INSERT/UPDATE';

COMMENT ON FUNCTION auto_generate_tour_package_embedding() IS
'Automatically generates embedding for tour packages on INSERT/UPDATE';

COMMENT ON FUNCTION auto_generate_transfer_package_embedding() IS
'Automatically generates embedding for transfer packages on INSERT/UPDATE';
