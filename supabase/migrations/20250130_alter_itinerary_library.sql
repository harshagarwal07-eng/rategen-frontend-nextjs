-- Alter itinerary_library table to support both DMC and TA entries
-- and add public visibility option

-- Make dmc_id nullable (can be null for TA-only entries)
ALTER TABLE itinerary_library
ALTER COLUMN dmc_id DROP NOT NULL;

-- Add ta_id column (references tas table)
ALTER TABLE itinerary_library
ADD COLUMN IF NOT EXISTS ta_id UUID REFERENCES tas(id) ON DELETE CASCADE;

-- Add is_public column (default false)
ALTER TABLE itinerary_library
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Create index for ta_id lookups
CREATE INDEX IF NOT EXISTS idx_itinerary_library_ta_id ON itinerary_library(ta_id);

-- Create index for public items
CREATE INDEX IF NOT EXISTS idx_itinerary_library_is_public ON itinerary_library(is_public) WHERE is_public = TRUE;

-- Update RLS policies to handle both DMC and TA access

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can manage their own library items" ON itinerary_library;
DROP POLICY IF EXISTS "DMC members can view library items" ON itinerary_library;

-- Policy: Users can manage their own items
CREATE POLICY "Users can manage their own library items"
  ON itinerary_library
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: DMC members can view items from their DMC
CREATE POLICY "DMC members can view library items"
  ON itinerary_library
  FOR SELECT
  USING (
    dmc_id IS NOT NULL AND
    dmc_id IN (
      SELECT dmc_id FROM dmc_users WHERE user_id = auth.uid()
    )
  );

-- Policy: TA members can view items from their TA
CREATE POLICY "TA members can view library items"
  ON itinerary_library
  FOR SELECT
  USING (
    ta_id IS NOT NULL AND
    ta_id IN (
      SELECT ta_id FROM ta_users WHERE user_id = auth.uid()
    )
  );

-- Policy: Anyone can view public items
CREATE POLICY "Anyone can view public library items"
  ON itinerary_library
  FOR SELECT
  USING (is_public = TRUE);

-- Add constraint: Either dmc_id or ta_id must be set
ALTER TABLE itinerary_library
ADD CONSTRAINT itinerary_library_owner_check
CHECK (dmc_id IS NOT NULL OR ta_id IS NOT NULL);

COMMENT ON COLUMN itinerary_library.ta_id IS 'Travel Agent ID - owner of the library item (if TA-created)';
COMMENT ON COLUMN itinerary_library.is_public IS 'If true, item is visible to all users';
