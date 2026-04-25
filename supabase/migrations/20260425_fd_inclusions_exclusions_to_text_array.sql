-- Convert fd_packages inclusion/exclusion columns to native text[] and drop visa columns.
--
-- Pre-migration state (verified): 12 of 14 kept columns are typed BOOLEAN (legacy
-- toggle design that was never wired up); inc_other/exc_other are TEXT. All 4
-- existing rows have NULL across every inc_*/exc_* column, so no data preservation
-- needed — drop and recreate cleanly. Visa is now derived from Tab 6 (fd_visa
-- table) so inc_visa/exc_visa are dropped outright.
--
-- Final shape: 14 columns (7 categories × 2), all text[] NOT NULL DEFAULT '{}'.
-- Canonical category order: hotels, tours, transfers, meals, guide, taxes, other.

ALTER TABLE fd_packages
  DROP COLUMN IF EXISTS inc_hotels,
  DROP COLUMN IF EXISTS inc_tours,
  DROP COLUMN IF EXISTS inc_transfers,
  DROP COLUMN IF EXISTS inc_meals,
  DROP COLUMN IF EXISTS inc_guide,
  DROP COLUMN IF EXISTS inc_taxes,
  DROP COLUMN IF EXISTS inc_other,
  DROP COLUMN IF EXISTS inc_visa,
  DROP COLUMN IF EXISTS exc_hotels,
  DROP COLUMN IF EXISTS exc_tours,
  DROP COLUMN IF EXISTS exc_transfers,
  DROP COLUMN IF EXISTS exc_meals,
  DROP COLUMN IF EXISTS exc_guide,
  DROP COLUMN IF EXISTS exc_taxes,
  DROP COLUMN IF EXISTS exc_other,
  DROP COLUMN IF EXISTS exc_visa,
  ADD COLUMN inc_hotels    text[] NOT NULL DEFAULT '{}',
  ADD COLUMN inc_tours     text[] NOT NULL DEFAULT '{}',
  ADD COLUMN inc_transfers text[] NOT NULL DEFAULT '{}',
  ADD COLUMN inc_meals     text[] NOT NULL DEFAULT '{}',
  ADD COLUMN inc_guide     text[] NOT NULL DEFAULT '{}',
  ADD COLUMN inc_taxes     text[] NOT NULL DEFAULT '{}',
  ADD COLUMN inc_other     text[] NOT NULL DEFAULT '{}',
  ADD COLUMN exc_hotels    text[] NOT NULL DEFAULT '{}',
  ADD COLUMN exc_tours     text[] NOT NULL DEFAULT '{}',
  ADD COLUMN exc_transfers text[] NOT NULL DEFAULT '{}',
  ADD COLUMN exc_meals     text[] NOT NULL DEFAULT '{}',
  ADD COLUMN exc_guide     text[] NOT NULL DEFAULT '{}',
  ADD COLUMN exc_taxes     text[] NOT NULL DEFAULT '{}',
  ADD COLUMN exc_other     text[] NOT NULL DEFAULT '{}';
