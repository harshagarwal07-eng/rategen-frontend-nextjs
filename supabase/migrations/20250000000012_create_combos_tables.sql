-- Combos Feature Migration
-- Create tables for combo packages (combining tour and transfer packages)

-- ========================================
-- Combos Table (Main table)
-- ========================================
CREATE TABLE IF NOT EXISTS combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT, -- auto-generated from package names
  remarks TEXT,
  age_policy JSONB DEFAULT '{}', -- same structure as tours: {adult: {min_age, max_age}, child: {...}, ...}
  currency TEXT DEFAULT 'USD',
  created_by UUID REFERENCES auth.users(id),
  dmc_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE combos IS 'Combo packages combining multiple tour/transfer packages';
COMMENT ON COLUMN combos.title IS 'Title of the combo';
COMMENT ON COLUMN combos.description IS 'Auto-generated description from package names joined with +';
COMMENT ON COLUMN combos.remarks IS 'AI-specific remarks for AI reference when generating responses';
COMMENT ON COLUMN combos.age_policy IS 'Age policy with brackets: {adult: {min_age: 18, max_age: 100}, child: {min_age: 6, max_age: 17}, ...}';
COMMENT ON COLUMN combos.currency IS 'Currency for pricing (e.g., USD, EUR)';

-- ========================================
-- Combo Items Table (Junction for packages)
-- ========================================
CREATE TABLE IF NOT EXISTS combo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('tour', 'transfer')),
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  transfer_id UUID REFERENCES transfers(id) ON DELETE SET NULL,
  tour_package_id UUID REFERENCES tour_packages(id) ON DELETE SET NULL,
  transfer_package_id UUID REFERENCES transfer_packages(id) ON DELETE SET NULL,
  package_name TEXT, -- denormalized for display
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE combo_items IS 'Junction table linking combos to tour/transfer packages';
COMMENT ON COLUMN combo_items.item_type IS 'Type of item: tour or transfer';
COMMENT ON COLUMN combo_items.package_name IS 'Denormalized package name for display purposes';
COMMENT ON COLUMN combo_items."order" IS 'Display order of items in the combo';

-- ========================================
-- Combo Seasons Table
-- ========================================
CREATE TABLE IF NOT EXISTS combo_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  dates TEXT,
  blackout_dates TEXT,
  exception_rules TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,

  -- Per-pax rates (same as tours)
  ticket_only_rate_adult NUMERIC(10,2),
  ticket_only_rate_child NUMERIC(10,2),
  ticket_only_rate_teenager NUMERIC(10,2),
  ticket_only_rate_infant NUMERIC(10,2),
  sic_rate_adult NUMERIC(10,2),
  sic_rate_child NUMERIC(10,2),
  sic_rate_teenager NUMERIC(10,2),
  sic_rate_infant NUMERIC(10,2),

  -- Per-vehicle rates
  pvt_rate JSONB DEFAULT '{}',
  per_vehicle_rate JSONB DEFAULT '[]',

  total_rate NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE combo_seasons IS 'Pricing seasons for combos';
COMMENT ON COLUMN combo_seasons.dates IS 'Date range for the season (e.g., Nov 1 - Dec 31)';
COMMENT ON COLUMN combo_seasons.blackout_dates IS 'Dates when rates do not apply';
COMMENT ON COLUMN combo_seasons.exception_rules IS 'Special rules or exceptions for this season';
COMMENT ON COLUMN combo_seasons.pvt_rate IS 'Private vehicle rates: {"4-seater": 400, "6-seater": 500}';
COMMENT ON COLUMN combo_seasons.per_vehicle_rate IS 'Per vehicle rates array: [{vehicle_type, brand, capacity, rate}]';
COMMENT ON COLUMN combo_seasons.total_rate IS 'Flat total rate (if applicable)';

-- ========================================
-- Trigger to cleanup orphaned combo_items
-- ========================================
CREATE OR REPLACE FUNCTION cleanup_orphaned_combo_items()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete combo_items where package reference is now null
  DELETE FROM combo_items
  WHERE (item_type = 'tour' AND tour_package_id IS NULL)
     OR (item_type = 'transfer' AND transfer_package_id IS NULL);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger on combo_items after update (when SET NULL happens)
CREATE TRIGGER cleanup_combo_items_after_update
AFTER UPDATE ON combo_items
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_orphaned_combo_items();

-- ========================================
-- Indexes
-- ========================================
CREATE INDEX IF NOT EXISTS idx_combos_dmc_id ON combos(dmc_id);
CREATE INDEX IF NOT EXISTS idx_combos_created_by ON combos(created_by);
CREATE INDEX IF NOT EXISTS idx_combo_items_combo_id ON combo_items(combo_id);
CREATE INDEX IF NOT EXISTS idx_combo_items_tour_package_id ON combo_items(tour_package_id);
CREATE INDEX IF NOT EXISTS idx_combo_items_transfer_package_id ON combo_items(transfer_package_id);
CREATE INDEX IF NOT EXISTS idx_combo_seasons_combo_id ON combo_seasons(combo_id);

-- ========================================
-- RLS Policies
-- ========================================
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_seasons ENABLE ROW LEVEL SECURITY;

-- Policy for combos
CREATE POLICY "Allow all operations on combos"
ON "public"."combos"
AS PERMISSIVE
FOR ALL
TO public
USING (true);

-- Policy for combo_items
CREATE POLICY "Allow all operations on combo_items"
ON "public"."combo_items"
AS PERMISSIVE
FOR ALL
TO public
USING (true);

-- Policy for combo_seasons
CREATE POLICY "Allow all operations on combo_seasons"
ON "public"."combo_seasons"
AS PERMISSIVE
FOR ALL
TO public
USING (true);
