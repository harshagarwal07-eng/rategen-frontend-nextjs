-- Migration: Add duration JSONB column to tour_packages and transfer_packages
-- Purpose: The three-stage search functions expect a 'duration' JSONB column
--          but the original migration only added duration_number and duration_unit
-- This migration adds a computed/generated column that combines them

-- ============================================================================
-- TOUR PACKAGES - Add duration JSONB column
-- ============================================================================

-- First, add the duration JSONB column
ALTER TABLE tour_packages
ADD COLUMN IF NOT EXISTS duration JSONB;

-- Comment explaining the structure
COMMENT ON COLUMN tour_packages.duration IS 'Duration in JSONB format: { "days": 0, "hours": 8, "minutes": 0 }. Auto-computed from duration_number/duration_unit if not set directly.';

-- Update existing rows: convert duration_number/duration_unit to duration JSONB
UPDATE tour_packages
SET duration = CASE
    WHEN duration_unit = 'days' THEN jsonb_build_object('days', COALESCE(duration_number, 0), 'hours', 0, 'minutes', 0)
    WHEN duration_unit = 'hours' THEN jsonb_build_object('days', 0, 'hours', COALESCE(duration_number, 0), 'minutes', 0)
    WHEN duration_unit = 'mins' THEN jsonb_build_object('days', 0, 'hours', 0, 'minutes', COALESCE(duration_number, 0))
    ELSE jsonb_build_object('days', 0, 'hours', 0, 'minutes', 0)
END
WHERE duration IS NULL AND duration_number IS NOT NULL;

-- ============================================================================
-- TRANSFER PACKAGES - Add duration JSONB column (if not exists)
-- ============================================================================

ALTER TABLE transfer_packages
ADD COLUMN IF NOT EXISTS duration JSONB;

COMMENT ON COLUMN transfer_packages.duration IS 'Duration in JSONB format: { "days": 0, "hours": 1, "minutes": 30 }';

-- Update existing transfer packages
UPDATE transfer_packages
SET duration = CASE
    WHEN duration_unit = 'days' THEN jsonb_build_object('days', COALESCE(duration_number, 0), 'hours', 0, 'minutes', 0)
    WHEN duration_unit = 'hours' THEN jsonb_build_object('days', 0, 'hours', COALESCE(duration_number, 0), 'minutes', 0)
    WHEN duration_unit = 'mins' THEN jsonb_build_object('days', 0, 'hours', 0, 'minutes', COALESCE(duration_number, 0))
    ELSE jsonb_build_object('days', 0, 'hours', 0, 'minutes', 0)
END
WHERE duration IS NULL AND duration_number IS NOT NULL;

-- ============================================================================
-- CREATE TRIGGER to auto-update duration when duration_number/duration_unit change
-- ============================================================================

-- Function to compute duration JSONB from number/unit
CREATE OR REPLACE FUNCTION compute_duration_jsonb()
RETURNS TRIGGER AS $$
BEGIN
    -- Only compute if duration is not explicitly set
    IF NEW.duration IS NULL AND NEW.duration_number IS NOT NULL THEN
        NEW.duration := CASE
            WHEN NEW.duration_unit = 'days' THEN jsonb_build_object('days', NEW.duration_number, 'hours', 0, 'minutes', 0)
            WHEN NEW.duration_unit = 'hours' THEN jsonb_build_object('days', 0, 'hours', NEW.duration_number, 'minutes', 0)
            WHEN NEW.duration_unit = 'mins' THEN jsonb_build_object('days', 0, 'hours', 0, 'minutes', NEW.duration_number)
            ELSE jsonb_build_object('days', 0, 'hours', 0, 'minutes', 0)
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tour_packages
DROP TRIGGER IF EXISTS trigger_compute_tour_duration ON tour_packages;
CREATE TRIGGER trigger_compute_tour_duration
    BEFORE INSERT OR UPDATE OF duration_number, duration_unit ON tour_packages
    FOR EACH ROW
    EXECUTE FUNCTION compute_duration_jsonb();

-- Trigger for transfer_packages
DROP TRIGGER IF EXISTS trigger_compute_transfer_duration ON transfer_packages;
CREATE TRIGGER trigger_compute_transfer_duration
    BEFORE INSERT OR UPDATE OF duration_number, duration_unit ON transfer_packages
    FOR EACH ROW
    EXECUTE FUNCTION compute_duration_jsonb();

-- ============================================================================
-- IMPORTANT: Run this to populate existing tours with estimated duration
-- ============================================================================

-- For tours that have "Full Day" in the name but no duration, estimate 8 hours
UPDATE tour_packages tp
SET duration = jsonb_build_object('days', 0, 'hours', 8, 'minutes', 0)
FROM tours t
WHERE tp.tour_id = t.id
  AND tp.duration IS NULL
  AND (LOWER(t.tour_name) LIKE '%full day%' OR LOWER(tp.name) LIKE '%full day%');

-- For tours that have "Half Day" in the name but no duration, estimate 4 hours
UPDATE tour_packages tp
SET duration = jsonb_build_object('days', 0, 'hours', 4, 'minutes', 0)
FROM tours t
WHERE tp.tour_id = t.id
  AND tp.duration IS NULL
  AND (LOWER(t.tour_name) LIKE '%half day%' OR LOWER(tp.name) LIKE '%half day%');

-- Log how many tours were updated
DO $$
DECLARE
    tour_count INTEGER;
    full_day_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tour_count FROM tour_packages WHERE duration IS NOT NULL;
    SELECT COUNT(*) INTO full_day_count FROM tour_packages tp
        JOIN tours t ON tp.tour_id = t.id
        WHERE (LOWER(t.tour_name) LIKE '%full day%' OR LOWER(tp.name) LIKE '%full day%');

    RAISE NOTICE 'Duration Migration Complete:';
    RAISE NOTICE '  - Total packages with duration set: %', tour_count;
    RAISE NOTICE '  - Full day tours identified: %', full_day_count;
END $$;
