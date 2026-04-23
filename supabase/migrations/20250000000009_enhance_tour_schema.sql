-- Enhanced Tour Schema Migration
-- Adding new fields for tours, packages, add-ons, and seasons
-- Note: remarks field will be used for AI remarks, notes is separate

-- ========================================
-- Tours table updates
-- ========================================

-- Add notes field (remarks already exists for AI usage)
ALTER TABLE tours
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN tours.remarks IS 'AI-specific remarks for AI reference when generating responses';
COMMENT ON COLUMN tours.notes IS 'General notes for frontend display and voucher purposes';

-- ========================================
-- Tour Add-ons table updates (table already exists)
-- ========================================

-- Add new fields to existing tour_add_ons table
ALTER TABLE tour_add_ons
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS age_policy JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ticket_only_rate_infant DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS ticket_only_rate_teenager DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS max_participants INTEGER,
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

COMMENT ON COLUMN tour_add_ons.description IS '1-line description of the add-on';
COMMENT ON COLUMN tour_add_ons.age_policy IS 'Age policy with brackets and rates: {infant: {min_age: 0, max_age: 5, rates: {...}}, child: {...}}';
COMMENT ON COLUMN tour_add_ons.notes IS 'General notes for frontend and vouchers';
COMMENT ON COLUMN tour_add_ons.total_rate IS 'Total rate for the add-on (regardless of age)';
COMMENT ON COLUMN tour_add_ons.max_participants IS 'Maximum number of participants allowed';
COMMENT ON COLUMN tour_add_ons.images IS 'Array of S3 image URLs for the add-on';

-- Note: remarks field already exists in tour_add_ons if needed, otherwise add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tour_add_ons' AND column_name = 'remarks'
    ) THEN
        ALTER TABLE tour_add_ons ADD COLUMN remarks TEXT;
        COMMENT ON COLUMN tour_add_ons.remarks IS 'AI-specific remarks for this add-on';
    END IF;
END $$;

-- ========================================
-- Tour Packages table updates (table already exists)
-- ========================================

-- Add new fields to existing tour_packages table
ALTER TABLE tour_packages
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS inclusions TEXT,
ADD COLUMN IF NOT EXISTS exclusions TEXT,
ADD COLUMN IF NOT EXISTS age_policy JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS max_participants INTEGER,
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS meeting_point TEXT,
ADD COLUMN IF NOT EXISTS pickup_point TEXT,
ADD COLUMN IF NOT EXISTS dropoff_point TEXT,
ADD COLUMN IF NOT EXISTS duration_number INTEGER,
ADD COLUMN IF NOT EXISTS duration_unit TEXT CHECK (duration_unit IN ('mins', 'hours', 'days')),
ADD COLUMN IF NOT EXISTS operational_hours JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tour_packages.remarks IS 'AI-specific remarks for AI reference';
COMMENT ON COLUMN tour_packages.notes IS 'General notes for frontend and vouchers';
COMMENT ON COLUMN tour_packages.inclusions IS 'What is included in the package';
COMMENT ON COLUMN tour_packages.exclusions IS 'What is excluded from the package';
COMMENT ON COLUMN tour_packages.age_policy IS 'Package-level age policy: {adult: {min_age: 18}, child: {min_age: 6, max_age: 17}, infant: {min_age: 0, max_age: 5}}';
COMMENT ON COLUMN tour_packages.max_participants IS 'Maximum number of participants';
COMMENT ON COLUMN tour_packages.images IS 'Array of S3 image URLs for the package';
COMMENT ON COLUMN tour_packages.meeting_point IS 'Meeting point details';
COMMENT ON COLUMN tour_packages.pickup_point IS 'Pick-up point details';
COMMENT ON COLUMN tour_packages.dropoff_point IS 'Drop-off point details';
COMMENT ON COLUMN tour_packages.duration_number IS 'Number value for duration';
COMMENT ON COLUMN tour_packages.duration_unit IS 'Unit for duration: mins, hours, or days';
COMMENT ON COLUMN tour_packages.operational_hours IS 'Array of operating hours: [{day: "Monday", time_start: "09:00", time_end: "17:00"}]';

-- Note: Seasons are stored as jsonb[] in tour_packages.seasons field
-- Season structure includes: blackout_dates and total_rate (handled in application)

-- ========================================
-- Package Add-ons mapping table updates (table already exists as tour_package_add_ons)
-- ========================================

-- Add is_mandatory field to existing tour_package_add_ons table
ALTER TABLE tour_package_add_ons
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false;

COMMENT ON COLUMN tour_package_add_ons.is_mandatory IS 'Whether this add-on is mandatory for the package';

-- ========================================
-- Indexes
-- ========================================

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tour_add_ons_tour_id ON tour_add_ons(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_packages_tour_id ON tour_packages(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_package_add_ons_package_id ON tour_package_add_ons(package_id);
CREATE INDEX IF NOT EXISTS idx_tour_package_add_ons_add_on_id ON tour_package_add_ons(add_on_id);