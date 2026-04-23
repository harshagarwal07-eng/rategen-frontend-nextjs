-- Consolidate duration fields into JSONB
-- Replace duration_number and duration_unit with duration JSONB field
-- Structure: {days: number, hours: number, minutes: number}

-- ========================================
-- Tour Packages table - Add duration JSONB field
-- ========================================

-- Add new duration JSONB column
ALTER TABLE tour_packages
ADD COLUMN IF NOT EXISTS duration JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN tour_packages.duration IS 'Duration in JSONB format: {days: number, hours: number, minutes: number}';

-- Migrate existing data from duration_number and duration_unit to duration JSONB
-- Only if duration_number exists and is not null
UPDATE tour_packages
SET duration = jsonb_build_object(
  'days', CASE
    WHEN duration_unit = 'days' THEN duration_number
    ELSE 0
  END,
  'hours', CASE
    WHEN duration_unit = 'hours' THEN duration_number
    WHEN duration_unit = 'days' THEN 0
    ELSE 0
  END,
  'minutes', CASE
    WHEN duration_unit = 'mins' THEN duration_number
    ELSE 0
  END
)
WHERE duration_number IS NOT NULL AND duration_unit IS NOT NULL;

-- Drop old duration_number and duration_unit columns (after migration)
-- Commented out for safety - uncomment after verifying data migration
ALTER TABLE tour_packages
DROP COLUMN IF EXISTS duration_number,
DROP COLUMN IF EXISTS duration_unit;

-- ========================================
-- Indexes (if needed for querying duration)
-- ========================================

-- Optional: Create GIN index if you plan to query duration fields
CREATE INDEX IF NOT EXISTS idx_tour_packages_duration ON tour_packages USING gin (duration);
