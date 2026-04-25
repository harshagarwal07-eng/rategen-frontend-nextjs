-- Convert FD add-on free-text columns to native text[].
-- fd_addons.inclusions, fd_addons.exclusions: plain TEXT → text[]
-- fd_addon_itinerary_days.meals_included: plain TEXT (CSV/JSON/null) → text[]
--
-- fd_addons and fd_addon_itinerary_days are empty at migration time (verified),
-- so drop-and-recreate keeps this clean. Matches the pattern used for
-- fd_packages inclusions/exclusions and fd_itinerary_days.meals_included.

ALTER TABLE fd_addons
  DROP COLUMN IF EXISTS inclusions,
  DROP COLUMN IF EXISTS exclusions,
  ADD COLUMN inclusions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN exclusions text[] NOT NULL DEFAULT '{}';

ALTER TABLE fd_addon_itinerary_days
  DROP COLUMN IF EXISTS meals_included,
  ADD COLUMN meals_included text[] NOT NULL DEFAULT '{}';
