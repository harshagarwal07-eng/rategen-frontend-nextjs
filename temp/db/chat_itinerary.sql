-- =====================================================
-- CHAT ITINERARY TABLE
-- =====================================================
-- Stores ONE itinerary per chat that evolves with modifications
-- When user confirms or modifies, this record is updated
--
-- Benefits:
-- 1. Fast lookup - no need to regenerate for same chat
-- 2. Track changes - version history
-- 3. Direct rate lookup - all IDs stored for pricing
-- =====================================================

-- Main itinerary table (one per chat)
CREATE TABLE IF NOT EXISTS public.chat_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES travel_agent_chats(id) ON DELETE CASCADE,

  -- Trip details
  destination TEXT NOT NULL,
  destination_code VARCHAR(10),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INT NOT NULL,
  party_size TEXT, -- "2A + 1C(4yrs)"
  adults INT DEFAULT 2, 
  children INT DEFAULT 0,
  children_ages INT[], -- [4, 11]

  -- Selected services (IDs for rate lookup)
  hotel_id UUID,
  room_id UUID,

  -- Tour selections with all details needed for rates
  tour_selections JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{
  --   tour_id, package_id, package_name, assigned_day,
  --   duration: {days, hours, minutes},
  --   operational_hours: [{day, time_start, time_end}],
  --   includes_transfer
  -- }]

  -- Transfer selections
  transfer_selections JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{transfer_id, package_id, package_name, route, assigned_day}]

  -- Combo selections
  combo_selections JSONB DEFAULT '[]'::jsonb,
  -- Structure: [{combo_id, title, description, package_names, assigned_day}]

  -- Full itinerary structure (day-by-day)
  itinerary_data JSONB NOT NULL,
  -- Structure: {
  --   destination, total_days, total_nights, check_in, check_out,
  --   days: [{day, date, title, activities: [{time, activity, package_name, service_type, ...}]}]
  -- }

  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'quoted', 'booked')),
  -- draft: Initial generation
  -- confirmed: User said "looks good" / confirmed
  -- quoted: Rates have been calculated
  -- booked: Actually booked (future use)

  -- Version tracking for modifications
  version INT DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: one itinerary per chat
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_itineraries_chat_id
  ON chat_itineraries(chat_id);

-- Index for lookup by destination/dates (for potential future caching across chats)
CREATE INDEX IF NOT EXISTS idx_chat_itineraries_lookup
  ON chat_itineraries(destination, check_in, check_out, nights);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_chat_itineraries_status
  ON chat_itineraries(status);

-- =====================================================
-- ITINERARY HISTORY TABLE (Optional - for tracking changes)
-- =====================================================
-- Stores previous versions when itinerary is modified

CREATE TABLE IF NOT EXISTS public.chat_itinerary_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES chat_itineraries(id) ON DELETE CASCADE,
  version INT NOT NULL,

  -- Snapshot of the itinerary at this version
  itinerary_data JSONB NOT NULL,
  tour_selections JSONB,
  transfer_selections JSONB,
  combo_selections JSONB,

  -- What changed
  change_type TEXT, -- 'created', 'hotel_changed', 'tour_added', 'tour_removed', 'dates_changed', etc.
  change_description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_itinerary_history_itinerary_id
  ON chat_itinerary_history(itinerary_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get or create itinerary for a chat
CREATE OR REPLACE FUNCTION get_or_create_chat_itinerary(
  p_chat_id UUID,
  p_destination TEXT DEFAULT NULL,
  p_check_in DATE DEFAULT NULL,
  p_check_out DATE DEFAULT NULL,
  p_nights INT DEFAULT NULL
)
RETURNS chat_itineraries
LANGUAGE plpgsql
AS $$
DECLARE
  v_itinerary chat_itineraries;
BEGIN
  -- Try to get existing itinerary
  SELECT * INTO v_itinerary
  FROM chat_itineraries
  WHERE chat_id = p_chat_id;

  -- If found, return it
  IF FOUND THEN
    RETURN v_itinerary;
  END IF;

  -- If not found and we have details, create new one
  IF p_destination IS NOT NULL AND p_check_in IS NOT NULL THEN
    INSERT INTO chat_itineraries (
      chat_id, destination, check_in, check_out, nights, itinerary_data
    ) VALUES (
      p_chat_id, p_destination, p_check_in, p_check_out, p_nights,
      '{}'::jsonb -- Empty until generated
    )
    RETURNING * INTO v_itinerary;

    RETURN v_itinerary;
  END IF;

  -- Return null if no existing and no details provided
  RETURN NULL;
END;
$$;

-- Function to update itinerary and save history
CREATE OR REPLACE FUNCTION update_chat_itinerary(
  p_chat_id UUID,
  p_itinerary_data JSONB,
  p_tour_selections JSONB DEFAULT NULL,
  p_transfer_selections JSONB DEFAULT NULL,
  p_combo_selections JSONB DEFAULT NULL,
  p_hotel_id UUID DEFAULT NULL,
  p_room_id UUID DEFAULT NULL,
  p_change_type TEXT DEFAULT 'updated',
  p_change_description TEXT DEFAULT NULL
)
RETURNS chat_itineraries
LANGUAGE plpgsql
AS $$
DECLARE
  v_current chat_itineraries;
  v_new chat_itineraries;
BEGIN
  -- Get current itinerary
  SELECT * INTO v_current
  FROM chat_itineraries
  WHERE chat_id = p_chat_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No itinerary found for chat %', p_chat_id;
  END IF;

  -- Save current version to history
  INSERT INTO chat_itinerary_history (
    itinerary_id, version, itinerary_data,
    tour_selections, transfer_selections, combo_selections,
    change_type, change_description
  ) VALUES (
    v_current.id, v_current.version, v_current.itinerary_data,
    v_current.tour_selections, v_current.transfer_selections, v_current.combo_selections,
    p_change_type, p_change_description
  );

  -- Update the itinerary
  UPDATE chat_itineraries
  SET
    itinerary_data = p_itinerary_data,
    tour_selections = COALESCE(p_tour_selections, tour_selections),
    transfer_selections = COALESCE(p_transfer_selections, transfer_selections),
    combo_selections = COALESCE(p_combo_selections, combo_selections),
    hotel_id = COALESCE(p_hotel_id, hotel_id),
    room_id = COALESCE(p_room_id, room_id),
    version = version + 1,
    updated_at = now()
  WHERE chat_id = p_chat_id
  RETURNING * INTO v_new;

  RETURN v_new;
END;
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE chat_itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_itinerary_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on chat_itineraries"
ON "public"."chat_itineraries"
AS PERMISSIVE
FOR ALL
TO public
USING (true);

CREATE POLICY "Allow all operations on chat_itinerary_history"
ON "public"."chat_itinerary_history"
AS PERMISSIVE
FOR ALL
TO public
USING (true);

-- =====================================================
-- GRANTS
-- =====================================================

GRANT ALL ON chat_itineraries TO authenticated;
GRANT ALL ON chat_itinerary_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_chat_itinerary TO authenticated;
GRANT EXECUTE ON FUNCTION update_chat_itinerary TO authenticated;
