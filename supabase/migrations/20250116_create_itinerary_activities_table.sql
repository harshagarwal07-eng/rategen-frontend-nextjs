-- Create itinerary_activities table
-- Stores detailed activity information for each service in an itinerary
-- activity_id is the primary key that links to service_breakups

-- =====================================================
-- MAIN TABLE
-- =====================================================

CREATE TABLE public.itinerary_activities (
  -- Primary key (same as activity_id in service_breakups)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links
  chat_id UUID NOT NULL REFERENCES travel_agent_chats(id) ON DELETE CASCADE,
  itinerary_id UUID NOT NULL REFERENCES chat_itineraries(id) ON DELETE CASCADE,

  -- Service type determines which fields are used
  service_type TEXT NOT NULL CHECK (service_type IN ('hotel', 'tour', 'transfer')),

  -- Day info
  day_number INTEGER NOT NULL,

  -- =====================================================
  -- COMMON FIELDS (all service types)
  -- =====================================================

  -- Passenger details
  adults INTEGER NOT NULL DEFAULT 2,
  children INTEGER NOT NULL DEFAULT 0,
  infants INTEGER NOT NULL DEFAULT 0,
  children_ages INTEGER[] DEFAULT '{}',

  -- Pricing
  cost_price NUMERIC(12, 2) DEFAULT 0,
  sale_price NUMERIC(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',

  -- Notes
  notes TEXT,

  -- =====================================================
  -- HOTEL FIELDS (service_type = 'hotel')
  -- =====================================================

  hotel_name TEXT,
  hotel_address TEXT,
  hotel_city TEXT,
  hotel_country TEXT,
  hotel_star_rating TEXT,
  hotel_property_type TEXT,

  -- Check in/out
  check_in_date DATE,
  check_in_time TIME,
  check_out_date DATE,
  check_out_time TIME,

  -- Rooms (JSONB array: [{room_category, quantity}])
  rooms JSONB DEFAULT '[]',

  -- Meal plan
  meal_plan TEXT,

  -- =====================================================
  -- TOUR FIELDS (service_type = 'tour')
  -- =====================================================

  tour_name TEXT,
  tour_description TEXT,
  tour_address TEXT,
  tour_city TEXT,
  tour_country TEXT,
  tour_type TEXT CHECK (tour_type IS NULL OR tour_type IN ('ticket_only', 'sic_transfers', 'pvt_transfers')),
  tour_category TEXT,

  -- Tour date/time
  tour_date DATE,
  tour_time TIME,

  -- Duration
  duration_days INTEGER DEFAULT 0,
  duration_hours INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,

  -- =====================================================
  -- TRANSFER FIELDS (service_type = 'transfer')
  -- =====================================================

  transfer_name TEXT,
  transfer_description TEXT,
  transfer_mode TEXT CHECK (transfer_mode IS NULL OR transfer_mode IN (
    'vehicle', 'vehicle_on_disposal', 'ferry', 'train', 'bus', 'helicopter'
  )),
  transfer_type TEXT CHECK (transfer_type IS NULL OR transfer_type IN ('SIC', 'PVT')),

  -- =====================================================
  -- SHARED TRANSPORT FIELDS (tour with transfers OR transfer)
  -- =====================================================

  -- Pickup
  pickup_date DATE,
  pickup_time TIME,
  pickup_point TEXT,

  -- Drop
  drop_date DATE,
  drop_time TIME,
  drop_point TEXT,

  -- Vehicle details (for SIC/PVT tours and vehicle transfers)
  vehicle_type TEXT CHECK (vehicle_type IS NULL OR vehicle_type IN (
    'compact', 'sedan', 'suv', 'minivan', 'van', 'coach'
  )),
  no_of_vehicles INTEGER DEFAULT 1,
  vehicle_brand TEXT,
  max_passengers INTEGER,
  max_luggage INTEGER,

  -- =====================================================
  -- INCLUSIONS/EXCLUSIONS (tour and transfer)
  -- =====================================================

  inclusions TEXT[] DEFAULT '{}',
  exclusions TEXT[] DEFAULT '{}',

  -- =====================================================
  -- METADATA
  -- =====================================================

  -- Option number for multi-option quotes
  option_number INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Fast lookup by chat
CREATE INDEX idx_itinerary_activities_chat_id ON itinerary_activities(chat_id);

-- Fast lookup by itinerary
CREATE INDEX idx_itinerary_activities_itinerary_id ON itinerary_activities(itinerary_id);

-- Fast lookup by service type
CREATE INDEX idx_itinerary_activities_service_type ON itinerary_activities(service_type);

-- Fast lookup by day
CREATE INDEX idx_itinerary_activities_day_number ON itinerary_activities(day_number);

-- Composite index for common queries
CREATE INDEX idx_itinerary_activities_chat_day ON itinerary_activities(chat_id, day_number);

-- =====================================================
-- UPDATE TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_itinerary_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_itinerary_activities_updated_at
  BEFORE UPDATE ON itinerary_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_itinerary_activities_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE itinerary_activities IS
'Stores detailed activity information for DMC manual editing.
The id field is the activity_id that links to service_breakups.';

COMMENT ON COLUMN itinerary_activities.id IS
'Activity ID - same value used in service_breakups.activity_id for linking';

COMMENT ON COLUMN itinerary_activities.rooms IS
'JSON array of room selections: [{room_category: "Deluxe", quantity: 2}]';

COMMENT ON COLUMN itinerary_activities.tour_type IS
'ticket_only = entrance only, sic_transfers = shared transport, pvt_transfers = private transport';

COMMENT ON COLUMN itinerary_activities.transfer_mode IS
'Mode of transport: vehicle, vehicle_on_disposal (car on disposal), ferry, train, bus, helicopter';
